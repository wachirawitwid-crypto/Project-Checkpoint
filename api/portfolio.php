<?php
require_once 'storage.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $portfolioId = $_GET['id'] ?? '';
    if (!is_valid_portfolio_id($portfolioId)){
        sendJson(['error' => 'Invalid Portfolio ID'], 400);
    }
    $data = readPortfolio($portfolioId);
    if ($data === null) {
        sendJson(['error' => 'Portfolio not found'], 404);
    }
    sendJson($data);
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        sendJson(['error' => 'Invalid JSON'], 400);
    }
    if (
        !isset($data['profile']) ||
        !isset($data['items']) ||
        !isset($data['content']) ||
        !isset($data['counter'])
    ) {
        sendJson(['error' => 'Missing required fields'], 400);
    }
    
    $profile = $data['profile'];
    $portfolioId = $profile['studen_id'] ?? '';

    if (!is_string($portfolioId) ||
        !preg_match('/^[0-9]{10}$/', $portfolioId)) {
        sendJson(['error' => 'Invalid Portfolio ID'], 400);
    }
    if (
        !isset($profile['full-name']) ||
        !is_string($profile['full-name']) ||
        trim($profile['full-name']) === ''
    ) {
        sendJson(['error' => 'Name is required'], 400);
    }
    if (
        !is_array($data['items']) ||
        !is_array($data['content']) ||
        !is_int($data['counter']) ||
        $data['counter'] < 1
    ) {
        sendJson(['error' => 'Invalid data format'], 400);
    }
    if (
        count($data['items']) > 100 ||
        count($data['content']) > 100
    ) {
        sendJson(['error' => 'Too many items'], 400);
    }
    foreach ($data['items'] as $item) {
    if (
        !is_array($item) ||
        !isset($item['id'], $item['title']) ||
        !is_string($item['id']) ||
        !is_string($item['title']) ||
        trim($item['title']) === '' ||
        !is_safe_url($item['link'] ?? '')
    ) {
        sendJson(['error' => 'Invalid item data'], 400);
        }
    }
    if (!writePortfolio($portfolioId, $data)) {
        sendJson(['error' => 'Cannot save data'], 500);
    }
    sendJson([
        'message' => 'Portfolio saved successfully'
    ]);

}

header('Allow: GET, POST');
sendJson(['error' => 'Method not allowed'], 405);

