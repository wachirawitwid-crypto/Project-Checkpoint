<?php
// API เพิ่มและลบ Portfolio Item บน Server พร้อม Server Validation
// รองรับทั้งข้อมูลจากฟอร์มหน้าเว็บ และ Portfolio Item JSON มาตรฐาน CS100 (สำหรับการ Import จากกลุ่มอื่น)
require_once 'storage.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$portfolioId = $_GET['id'] ?? '';

if (!is_valid_portfolio_id($portfolioId)) {
    sendJson(['error' => 'Invalid Portfolio ID'], 400);
}

$file = DATA_DIR . '/' . $portfolioId . '.json';
if (!file_exists($file)) {
    sendJson(['error' => 'Portfolio not found (กรุณาบันทึกหน้า 1 ก่อนเพิ่มผลงาน)'], 404);
}

// แปลง Input ให้รองรับทั้งแบบฟอร์ม (skills เป็นข้อความ, what_i_did, link) และแบบ CS100 JSON (skills[], reflection{}, evidence[])
function normalizeIncomingItem(array $input)
{
    $errors = [];

    $title = isset($input['title']) && is_string($input['title']) ? trim($input['title']) : '';
    $type = isset($input['type']) && is_string($input['type']) ? trim($input['type']) : '';
    $date = isset($input['date']) && is_string($input['date']) ? trim($input['date']) : '';
    $role = isset($input['role']) && is_string($input['role']) ? trim($input['role']) : '';
    $description = isset($input['description']) && is_string($input['description']) ? trim($input['description']) : '';

    if ($title === '' || str_length($title) > 200) {
        $errors[] = 'title: กรุณากรอกชื่อผลงาน (1–200 ตัวอักษร)';
    }
    if ($type === '' || str_length($type) > 100) {
        $errors[] = 'type: กรุณาระบุประเภทผลงาน (1–100 ตัวอักษร)';
    }
    if (!is_valid_date($date)) {
        $errors[] = 'date: รูปแบบวันที่ต้องเป็น YYYY-MM-DD และเป็นวันที่มีอยู่จริง';
    }
    if ($role === '' || str_length($role) > 500) {
        $errors[] = 'role: กรุณากรอกบทบาท (1–500 ตัวอักษร)';
    }
    if ($description === '' || str_length($description) > 5000) {
        $errors[] = 'description: กรุณากรอกรายละเอียดผลงาน (1–5000 ตัวอักษร)';
    }

    // ตรวจ skills (รองรับทั้ง Array จากไฟล์ JSON มาตรฐาน และข้อความคั่นด้วยลูกน้ำจากฟอร์ม)
    $skillsArray = [];
    if (isset($input['skills']) && is_array($input['skills'])) {
        foreach ($input['skills'] as $s) {
            if (is_string($s) && trim($s) !== '') {
                $skillsArray[] = trim($s);
            }
        }
    } elseif (isset($input['skills']) && is_string($input['skills'])) {
        $parts = explode(',', $input['skills']);
        foreach ($parts as $s) {
            if (trim($s) !== '') {
                $skillsArray[] = trim($s);
            }
        }
    }
    $skillsArray = array_values(array_unique($skillsArray));
    $skillsText = implode(', ', $skillsArray);

    if (count($skillsArray) === 0 || str_length($skillsText) > 1000) {
        $errors[] = 'skills: กรุณาระบุทักษะอย่างน้อย 1 รายการ';
    }

    // ตรวจ Reflection 4 ข้อ (รองรับทั้ง reflection: { whatIDid, ... } และคีย์แบบ what_i_did)
    $refObj = isset($input['reflection']) && is_array($input['reflection']) ? $input['reflection'] : [];
    $whatIDid = trim((string) ($refObj['whatIDid'] ?? $input['what_i_did'] ?? ''));
    $whatILearned = trim((string) ($refObj['whatILearned'] ?? $input['what_i_learned'] ?? ''));
    $challenge = trim((string) ($refObj['challenge'] ?? $input['challenge'] ?? ''));
    $nextStep = trim((string) ($refObj['nextStep'] ?? $input['next_step'] ?? ''));

    if ($whatIDid === '' || str_length($whatIDid) > 5000) {
        $errors[] = 'reflection.whatIDid: กรุณากรอก What I Did';
    }
    if ($whatILearned === '' || str_length($whatILearned) > 5000) {
        $errors[] = 'reflection.whatILearned: กรุณากรอก What I Learned';
    }
    if ($challenge === '' || str_length($challenge) > 5000) {
        $errors[] = 'reflection.challenge: กรุณากรอก Challenge';
    }
    if ($nextStep === '' || str_length($nextStep) > 5000) {
        $errors[] = 'reflection.nextStep: กรุณากรอก Next Step';
    }

    // ตรวจลิงก์หลักฐาน (รองรับทั้ง evidence: ["https://..."] และ link: "https://...")
    $evidenceList = [];
    if (isset($input['evidence']) && is_array($input['evidence'])) {
        foreach ($input['evidence'] as $u) {
            if (!is_safe_url($u)) {
                $errors[] = 'evidence: ลิงก์หลักฐานต้องขึ้นต้นด้วย http:// หรือ https://';
            } else {
                $evidenceList[] = trim($u);
            }
        }
    } elseif (isset($input['link']) && is_string($input['link'])) {
        if (!is_safe_url($input['link'])) {
            $errors[] = 'link: ลิงก์หลักฐานต้องขึ้นต้นด้วย http:// หรือ https://';
        } else {
            $evidenceList[] = trim($input['link']);
        }
    }

    if (count($evidenceList) === 0) {
        $errors[] = 'evidence: กรุณาระบุลิงก์หลักฐานอย่างน้อย 1 ลิงก์ (http:// หรือ https://)';
    }

    return [
        'valid' => count($errors) === 0,
        'errors' => $errors,
        'clean' => [
            'title' => $title,
            'type' => $type,
            'date' => $date,
            'description' => $description,
            'skills' => $skillsText,
            'skillsArray' => $skillsArray,
            'role' => $role,
            'what_i_did' => $whatIDid,
            'what_i_learned' => $whatILearned,
            'challenge' => $challenge,
            'next_step' => $nextStep,
            'link' => $evidenceList[0] ?? '',
            'evidence' => $evidenceList
        ]
    ];
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 524288) {
        sendJson(['error' => 'Request body is too large or unreadable'], 400);
    }

    $input = json_decode($raw, true);
    if (!is_array($input) || json_last_error() !== JSON_ERROR_NONE) {
        sendJson(['error' => 'Invalid JSON'], 400);
    }

    $check = normalizeIncomingItem($input);
    if (!$check['valid']) {
        sendJson([
            'error' => $check['errors'][0],
            'errors' => $check['errors']
        ], 400);
    }

    $clean = $check['clean'];

    $fp = @fopen($file, 'c+');
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

    if (count($data['items']) >= 100 || count($data['content']) >= 100) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Item limit reached'], 400);
    }

    $newId = 'Item-' . $data['counter'];
    $data['counter']++;

    $newItem = [
        'id' => $newId,
        'title' => $clean['title'],
        'type' => $clean['type'],
        'date' => $clean['date'],
        'description' => $clean['description'],
        'skills' => $clean['skills'],
        'role' => $clean['role'],
        'link' => $clean['link']
    ];

    $newContent = $newItem;
    $newContent['what_i_did'] = $clean['what_i_did'];
    $newContent['what_i_learned'] = $clean['what_i_learned'];
    $newContent['challenge'] = $clean['challenge'];
    $newContent['next_step'] = $clean['next_step'];
    $newContent['evidence'] = $clean['evidence'];

    $data['items'][] = $newItem;
    $data['content'][] = $newContent;

    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    $saved = false;
    if ($json !== false) {
        rewind($fp);
        $saved = ftruncate($fp, 0) &&
                 fwrite($fp, $json . "\n") !== false &&
                 fflush($fp);
    }
    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$saved) {
        sendJson(['error' => 'Cannot save Item'], 500);
    }

    sendJson([
        'ok' => true,
        'message' => 'Item added successfully',
        'id' => $newId,
        'item' => $newItem,
        'contentItem' => $newContent,
        'portfolio' => $data,
        'portfolios' => listPortfolios()
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

    $fp = @fopen($file, 'c+');
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
        function ($item) use ($itemId) {
            return ($item['id'] ?? null) !== $itemId;
        }
    ));

    $data['content'] = array_values(array_filter(
        $data['content'],
        function ($item) use ($itemId) {
            return ($item['id'] ?? null) !== $itemId;
        }
    ));

    if (count($data['items']) === $oldCount) {
        flock($fp, LOCK_UN);
        fclose($fp);
        sendJson(['error' => 'Item not found'], 404);
    }

    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    $saved = false;
    if ($json !== false) {
        rewind($fp);
        $saved = ftruncate($fp, 0) &&
                 fwrite($fp, $json . "\n") !== false &&
                 fflush($fp);
    }

    flock($fp, LOCK_UN);
    fclose($fp);

    if (!$saved) {
        sendJson(['error' => 'Cannot delete Item'], 500);
    }

    sendJson([
        'ok' => true,
        'message' => 'Item deleted successfully',
        'portfolio' => $data,
        'portfolios' => listPortfolios()
    ]);
}

header('Allow: POST, DELETE');
sendJson(['error' => 'Method not allowed'], 405);
