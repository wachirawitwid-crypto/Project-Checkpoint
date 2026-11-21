<?php

declare(strict_types=1);

// เก็บไฟล์ JSON นอกโฟลเดอร์ Public Web Root ป้องกันการเข้าถึงผ่าน URL โดยตรง
define('DATA_DIR', dirname(__DIR__, 2) . '/Private/portfolios');

function is_valid_portfolio_id($id): bool
{
    return is_string($id) && preg_match('/^[0-9]{10}$/', $id) === 1;
}

function str_length(string $s): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($s, 'UTF-8');
    }
    $n = preg_match_all('/./su', $s);
    return $n === false ? strlen($s) : $n;
}

function is_safe_url($url): bool
{
    if (!is_string($url) || $url === '' || str_length($url) > 2048) {
        return false;
    }
    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        return false;
    }
    $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    return $scheme === 'http' || $scheme === 'https';
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// สร้างชื่อไฟล์: portfolio-ชื่อคนกด.json
function makePortfolioFilePath(string $fullName, string $portfolioId): string
{
    $safeName = preg_replace('/[^A-Za-z0-9ก-๙\-]+/u', '_', trim($fullName));
    $safeName = trim((string) $safeName, '_');
    if ($safeName === '') {
        $safeName = $portfolioId;
    }
    return DATA_DIR . '/portfolio-' . $safeName . '.json';
}

// ค้นหาไฟล์ของ ID 10 หลักนี้
function findFileByPortfolioId(string $portfolioId): ?string
{
    if (!is_dir(DATA_DIR)) {
        return null;
    }
    $files = glob(DATA_DIR . '/*.json') ?: [];
    foreach ($files as $file) {
        $data = json_decode((string) file_get_contents($file), true);
        if (!is_array($data)) {
            continue;
        }
        $p = $data['profile'] ?? $data;
        $id = (string) ($p['studen_id'] ?? $p['student_id'] ?? '');
        if ($id === $portfolioId) {
            return $file;
        }
    }
    return null;
}

function readPortfolio(string $portfolioId): ?array
{
    $file = findFileByPortfolioId($portfolioId);
    if ($file === null || !file_exists($file)) {
        return null;
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    if (!is_array($data)) {
        return null;
    }
    return $data;
}

function writePortfolio(string $portfolioId, array $data): bool
{
    if (!is_dir(DATA_DIR)) {
        if (!mkdir(DATA_DIR, 0750, true) && !is_dir(DATA_DIR)) {
            return false;
        }
    }

    $fullName = (string) ($data['profile']['full-name'] ?? $portfolioId);
    $targetFile = makePortfolioFilePath($fullName, $portfolioId);

    // ลบไฟล์ชื่อเก่าของ ID นี้หากมีการเปลี่ยนชื่อ
    $existingFile = findFileByPortfolioId($portfolioId);
    if ($existingFile !== null && $existingFile !== $targetFile && file_exists($existingFile)) {
        @unlink($existingFile);
    }

    // กันเขียนทับหากคนอื่นตั้งชื่อซ้ำกัน
    if (file_exists($targetFile)) {
        $existingData = json_decode((string) file_get_contents($targetFile), true);
        $existingOwnerId = (string) ($existingData['profile']['studen_id'] ?? '');
        if ($existingOwnerId !== '' && $existingOwnerId !== $portfolioId) {
            $safeName = preg_replace('/[^A-Za-z0-9ก-๙\-]+/u', '_', trim($fullName));
            $targetFile = DATA_DIR . '/portfolio-' . trim((string) $safeName, '_') . '-' . $portfolioId . '.json';
        }
    }

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }
    return file_put_contents($targetFile, $json, LOCK_EX) !== false;
}

function listAllPortfolios(): array
{
    if (!is_dir(DATA_DIR)) {
        return [];
    }
    $files = glob(DATA_DIR . '/*.json') ?: [];
    $list = [];
    foreach ($files as $file) {
        $data = json_decode((string) file_get_contents($file), true);
        if (!is_array($data)) {
            continue;
        }
        $p = $data['profile'] ?? $data;
        $id = $p['studen_id'] ?? $p['student_id'] ?? preg_replace('/\D/', '', basename($file, '.json'));
        if (!is_valid_portfolio_id((string) $id)) {
            continue;
        }
        $list[] = [
            'id' => (string) $id,
            'name' => $p['full-name'] ?? $p['fullName'] ?? 'Unknown',
            'count' => is_array($data['items'] ?? null) ? count($data['items']) : 0,
            'fullData' => $data
        ];
    }
    return $list;
}

function validateAndSanitizePayload($payload): array
{
    if (!is_array($payload)) {
        sendJson(['error' => 'Invalid JSON payload'], 400);
    }

    // 1. ตรวจสอบ Profile
    $profile = $payload['profile'] ?? null;
    if (!is_array($profile)) {
        sendJson(['error' => 'Missing profile object'], 400);
    }

    $studentId = trim((string) ($profile['studen_id'] ?? ''));
    if (!is_valid_portfolio_id($studentId)) {
        sendJson(['error' => 'studen_id must be exactly 10 digits'], 400);
    }

    $fullName = trim((string) ($profile['full-name'] ?? ''));
    if ($fullName === '' || str_length($fullName) > 100) {
        sendJson(['error' => 'Invalid full-name'], 400);
    }

    $enjoy = trim((string) ($profile['enjoy'] ?? ''));
    if (str_length($enjoy) > 1000) {
        sendJson(['error' => 'enjoy exceeds max length (1000)'], 400);
    }

    $tried = trim((string) ($profile['tried'] ?? ''));
    if ($tried === '' || str_length($tried) > 1000) {
        sendJson(['error' => 'tried is required and must not exceed 1000 characters'], 400);
    }

    $curious = trim((string) ($profile['curious-about'] ?? ''));
    if ($curious === '' || str_length($curious) > 1000) {
        sendJson(['error' => 'curious-about is required and must not exceed 1000 characters'], 400);
    }

    // 2. ตรวจสอบ Items (ยืดหยุ่นรองรับข้อมูลที่ Import เข้ามา)
    $rawItems = $payload['items'] ?? [];
    if (!is_array($rawItems)) {
        sendJson(['error' => 'items must be an array'], 400);
    }
    if (count($rawItems) > 50) {
        sendJson(['error' => 'Maximum 50 items allowed per portfolio'], 400);
    }

    $cleanItems = [];
    foreach ($rawItems as $index => $item) {
        if (!is_array($item)) {
            sendJson(['error' => "Item at index {$index} is invalid"], 400);
        }

        $itemId = trim((string) ($item['id'] ?? 'Item-' . ($index + 1)));
        if ($itemId === '') {
            $itemId = 'Item-' . ($index + 1);
        }

        $title = trim((string) ($item['title'] ?? ''));
        if ($title === '' || str_length($title) > 200) {
            sendJson(['error' => "Invalid item title at index {$index}"], 400);
        }

        $type = trim((string) ($item['type'] ?? 'Personal Project'));
        if ($type === '' || str_length($type) > 100) {
            $type = 'Personal Project';
        }

        $date = trim((string) ($item['date'] ?? '-'));
        if ($date === '' || str_length($date) > 50) {
            $date = '-';
        }

        $role = trim((string) ($item['role'] ?? '-'));
        if ($role === '') {
            $role = '-';
        }

        $description = trim((string) ($item['description'] ?? '-'));
        if ($description === '') {
            $description = '-';
        }

        $skills = trim((string) ($item['skills'] ?? ''));
        $whatIDid = trim((string) ($item['what_i_did'] ?? '-'));
        $whatILearned = trim((string) ($item['what_i_learned'] ?? '-'));
        $challenge = trim((string) ($item['challenge'] ?? '-'));
        $nextStep = trim((string) ($item['next_step'] ?? '-'));

        // ไม่บังคับใส่ Link แต่ถ้าใส่มาต้องเป็น http/https ที่ถูกต้อง
        $link = trim((string) ($item['link'] ?? ''));
        if ($link !== '' && !is_safe_url($link)) {
            sendJson(['error' => "Invalid evidence URL at index {$index}"], 400);
        }

        $cleanItems[] = [
            'id' => $itemId,
            'title' => $title,
            'type' => $type,
            'date' => $date,
            'role' => $role,
            'description' => $description,
            'skills' => $skills,
            'what_i_did' => $whatIDid === '' ? '-' : $whatIDid,
            'what_i_learned' => $whatILearned === '' ? '-' : $whatILearned,
            'challenge' => $challenge === '' ? '-' : $challenge,
            'next_step' => $nextStep === '' ? '-' : $nextStep,
            'link' => $link,
        ];
    }

    $counter = isset($payload['counter']) && is_numeric($payload['counter'])
        ? max(1, (int) $payload['counter'])
        : count($cleanItems) + 1;

    return [
        'studentId' => $studentId,
        'data' => [
            'profile' => [
                'full-name' => $fullName,
                'studen_id' => $studentId,
                'enjoy' => $enjoy,
                'tried' => $tried,
                'curious-about' => $curious,
            ],
            'items' => $cleanItems,
            'counter' => $counter,
            'updatedAt' => date('c'),
        ],
    ];
}

// ================= จัดการ HTTP Request =================
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (isset($_GET['list']) && $_GET['list'] === '1') {
        sendJson(listAllPortfolios(), 200);
    }

    $id = $_GET['id'] ?? '';
    if (!is_valid_portfolio_id($id)) {
        sendJson(['error' => 'Invalid portfolio ID (must be 10 digits)'], 400);
    }

    $portfolio = readPortfolio($id);
    if ($portfolio === null) {
        sendJson(['error' => 'Portfolio not found'], 404);
    }

    sendJson($portfolio, 200);
}

if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody ?: '', true);

    $validated = validateAndSanitizePayload($payload);
    $saved = writePortfolio($validated['studentId'], $validated['data']);

    if (!$saved) {
        sendJson(['error' => 'Failed to write portfolio data on server'], 500);
    }

    sendJson([
        'status' => 'ok',
        'message' => 'Portfolio saved successfully',
        'data' => $validated['data'],
    ], 200);
}

sendJson(['error' => 'Method not allowed'], 405);