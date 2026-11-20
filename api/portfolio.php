<?php
// API จัดการข้อมูล Portfolio (ดูรายชื่อทั้งหมด, โหลด, บันทึก, ลบ และ Export my-portfolio.json)
require_once 'storage.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = isset($_GET['action']) && is_string($_GET['action']) ? trim($_GET['action']) : '';

if ($method === 'GET') {
    // 1. ดึงรายชื่อ Portfolio ทั้งหมดบน Server (สำหรับแถบเลือก Portfolio)
    if ($action === 'list' || ($action === '' && !isset($_GET['id']))) {
        sendJson([
            'ok' => true,
            'portfolios' => listPortfolios()
        ]);
    }

    // 2. เช็กสถานะ Server และสิทธิ์โฟลเดอร์เก็บไฟล์
    if ($action === 'health') {
        if (!is_dir(DATA_DIR)) {
            @mkdir(DATA_DIR, 0750, true);
        }
        $ready = is_dir(DATA_DIR) && is_writable(DATA_DIR);
        sendJson([
            'ok' => $ready,
            'storageReady' => $ready,
            'serverTime' => date('c')
        ], $ready ? 200 : 500);
    }

    // 3. Export ไฟล์ my-portfolio.json สำหรับส่งงานรายบุคคล
    if ($action === 'export') {
        $portfolioId = $_GET['id'] ?? '';
        if (!is_valid_portfolio_id($portfolioId)) {
            sendJson(['error' => 'Invalid Portfolio ID'], 400);
        }
        $data = readPortfolio($portfolioId);
        if ($data === null) {
            sendJson(['error' => 'Portfolio not found'], 404);
        }
        $exported = toExportPortfolio($portfolioId, $data);
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="my-portfolio.json"');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($exported, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 4. โหลดข้อมูล Portfolio 1 คนตาม ID (คงรูปแบบเดิมของระบบไว้ 100%)
    $portfolioId = $_GET['id'] ?? '';
    if (!is_valid_portfolio_id($portfolioId)) {
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
    if ($raw === false || strlen($raw) > 524288) {
        sendJson(['error' => 'Request body is too large or unreadable'], 400);
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        sendJson(['error' => 'Invalid JSON'], 400);
    }
    if (
        !isset($data['profile']) ||
        !is_array($data['profile']) ||
        !isset($data['items']) ||
        !isset($data['content']) ||
        !isset($data['counter'])
    ) {
        sendJson(['error' => 'Missing required fields'], 400);
    }

    $profile = $data['profile'];
    $portfolioId = $profile['studen_id'] ?? '';
    $errors = [];

    if (!is_valid_portfolio_id($portfolioId)) {
        $errors[] = 'PORTFOLIO ID TAG ต้องเป็นตัวเลข 10 หลักพอดี';
    }
    if (!isset($profile['full-name']) || !is_string($profile['full-name']) || trim($profile['full-name']) === '' || str_length(trim($profile['full-name'])) > 120) {
        $errors[] = 'กรุณากรอกชื่อแสดงผล (1–120 ตัวอักษร)';
    }

    $textProfileChecks = [
        'enjoy' => ['label' => 'What I Enjoy', 'max' => 1500],
        'tried' => ['label' => "What I've Tried", 'max' => 2500],
        'curious-about' => ['label' => "What I'm Curious About", 'max' => 1500]
    ];
    foreach ($textProfileChecks as $key => $rule) {
        $val = isset($profile[$key]) && is_string($profile[$key]) ? trim($profile[$key]) : '';
        if ($val === '' || str_length($val) > $rule['max']) {
            $errors[] = "กรุณากรอก {$rule['label']} (ไม่เกิน {$rule['max']} ตัวอักษร)";
        }
    }

    if (
        !is_array($data['items']) ||
        !is_array($data['content']) ||
        !is_int($data['counter']) ||
        $data['counter'] < 1
    ) {
        $errors[] = 'Invalid data format';
    } elseif (count($data['items']) > 100 || count($data['content']) > 100) {
        $errors[] = 'Too many items (สูงสุด 100 รายการ)';
    } else {
        foreach ($data['items'] as $idx => $item) {
            if (
                !is_array($item) ||
                !isset($item['id'], $item['title']) ||
                !is_string($item['id']) ||
                !is_string($item['title']) ||
                trim($item['title']) === '' ||
                !is_safe_url($item['link'] ?? '')
            ) {
                $errors[] = "ข้อมูลผลงานรายการที่ " . ($idx + 1) . " ไม่ถูกต้อง";
            }
        }
    }

    if (count($errors) > 0) {
        sendJson([
            'error' => $errors[0],
            'errors' => $errors
        ], 400);
    }

    if (!writePortfolio($portfolioId, $data)) {
        sendJson(['error' => 'Cannot save data (ตรวจสอบสิทธิ์โฟลเดอร์ Private/portfolios บน Server)'], 500);
    }

    sendJson([
        'ok' => true,
        'message' => 'Portfolio saved successfully',
        'portfolios' => listPortfolios()
    ]);
}

if ($method === 'DELETE') {
    $portfolioId = $_GET['id'] ?? '';
    if (!is_valid_portfolio_id($portfolioId)) {
        sendJson(['error' => 'Invalid Portfolio ID'], 400);
    }
    $file = DATA_DIR . '/' . $portfolioId . '.json';
    if (!file_exists($file)) {
        sendJson(['error' => 'Portfolio not found'], 404);
    }
    if (!@unlink($file)) {
        sendJson(['error' => 'Cannot delete portfolio'], 500);
    }
    sendJson([
        'ok' => true,
        'message' => 'Portfolio deleted successfully',
        'portfolios' => listPortfolios()
    ]);
}

header('Allow: GET, POST, DELETE');
sendJson(['error' => 'Method not allowed'], 405);
