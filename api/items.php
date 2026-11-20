<?php
require_once 'storage.php';

$method = $_SERVER['REQUEST_METHOD'];
$portfolioId = $_GET['id'] ?? '';

if (!is_valid_portfolio_id($portfolioId)) {
    sendJson(['error' => 'Invalid Portfolio ID'], 400);
}

$file = DATA_DIR . '/' . $portfolioId . '.json';
if (!file_exists($file)) {
    sendJson(['error' => 'Portfolio not found'], 404);
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input) ||
        json_last_error() !== JSON_ERROR_NONE) {
        sendJson(['error' => 'Invalid JSON'], 400);
    }
    $requiredFields = [
        'title',
        'type',
        'date',
        'description',
        'skills',
        'role',
        'what_i_did',
        'what_i_learned',
        'challenge',
        'next_step',
        'link'
    ];

    foreach ($requiredFields as $field) {
        if (
            !isset($input[$field]) ||
            !is_string($input[$field])
        ) {
            sendJson([
                'error' => "Invalid field: $field"
            ], 400);
        }
    }

    if (trim($input['title']) === '') {
        sendJson(['error' => 'Title is required'], 400);
    }

    if (!is_safe_url($input['link'])) {
    sendJson(['error' => 'Link must start with http:// or https://'], 400);
}
    $maxLengths = [
        'title' => 200,
        'type' => 100,
        'date' => 30,
        'description' => 5000,
        'skills' => 1000,
        'role' => 500,
        'what_i_did' => 5000,
        'what_i_learned' => 5000,
        'challenge' => 5000,
        'next_step' => 5000,
        'link' => 2048
    ];

    foreach ($maxLengths as $field => $max) {
        if (str_length($input[$field]) > $max) {
            sendJson([
                'error' => "$field is too long"
            ], 400);
        }
    }

    $fp = fopen($file, 'c+');
    if (!$fp || !flock($fp, LOCK_EX)) {
        sendJson(['error' => 'Cannot access portfolio'], 500);
    }

    $rawData = stream_get_contents($fp);
    $data = json_decode($rawData, true);
    if (
        !is_array($data) ||
        !isset($data['items'], $data['content'], $data['counter']) ||
        !is_array($data['items']) ||
        !is_array($data['content']) ||
        !is_int($data['counter']) ||
        $data['counter'] < 1
    ) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Invalid portfolio data'], 500);
    }

    if (
        count($data['items']) >= 100 ||
        count($data['content']) >= 100
    ) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Item limit reached'], 400);
    }

    $newId = 'Item-' . $data['counter'];
    $data['counter']++;
    $newItem = [
        'id' => $newId,
        'title' => $input['title'],
        'type' => $input['type'],
        'date' => $input['date'],
        'description' => $input['description'],
        'skills' => $input['skills'],
        'role' => $input['role'],
        'link' => $input['link']
    ];

    $newContent = $newItem;
    $newContent['what_i_did'] = $input['what_i_did'];
    $newContent['what_i_learned'] = $input['what_i_learned'];
    $newContent['challenge'] = $input['challenge'];
    $newContent['next_step'] = $input['next_step'];

    $data['items'][] = $newItem;
    $data['content'][] = $newContent;

    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );

    $saved = false;

    if ($json !== false) {
        rewind($fp);
        $saved = ftruncate($fp, 0) &&
                 fwrite($fp, $json) !== false &&
                 fflush($fp);
    }
    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$saved) {
        sendJson(['error' => 'Cannot save Item'], 500);
    }
    sendJson([
        'message' => 'Item added successfully',
        'id' => $newId
    ], 201);
}

if ($method === 'DELETE') {
    $itemId = $_GET['itemId'] ?? '';

    if (
        !is_string($itemId) ||
        !preg_match('/^Item-[1-9][0-9]*$/', $itemId)
    ) {
        sendJson(['error' => 'Invalid Item ID'], 400);
    }
    $fp = fopen($file, 'c+');

    if (!$fp || !flock($fp, LOCK_EX)) {
        sendJson(['error' => 'Cannot access portfolio'], 500);
    }
    $rawData = stream_get_contents($fp);
    $data = json_decode($rawData, true);

    if (
        !is_array($data) ||
        !isset($data['items'], $data['content']) ||
        !is_array($data['items']) ||
        !is_array($data['content'])
    ) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Invalid portfolio data'], 500);
    }

    $oldCount = count($data['items']);
    $data['items'] = array_values(array_filter(
        $data['items'],
        fn($item) => ($item['id'] ?? null) !== $itemId
    ));

    $data['content'] = array_values(array_filter(
        $data['content'],
        fn($item) => ($item['id'] ?? null) !== $itemId
    ));

    if (count($data['items']) === $oldCount) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Item not found'], 404);
    }
    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );

    $saved = false;
    if ($json !== false) {
        rewind($fp);
        $saved = ftruncate($fp, 0) &&
                 fwrite($fp, $json) !== false &&
                 fflush($fp);
    }

    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$saved) {
        sendJson(['error' => 'Cannot delete Item'], 500);
    }
    sendJson([
        'message' => 'Item deleted successfully'
    ]);
}

header('Allow: POST, DELETE');
sendJson(['error' => 'Method not allowed'], 405);
