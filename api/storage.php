<?php

declare(strict_types=1);

// เก็บไฟล์ JSON นอกโฟลเดอร์ Public Web Root ป้องกันการเข้าถึงผ่าน URL โดยตรง
define('DATA_DIR', dirname(__DIR__, 2) . '/Private/portfolios');

const ALLOWED_ITEM_TYPES = [
    'Course Assignment',
    'Personal Project',
    'Hackathon / Contest',
    'Workshop / Training',
    'Extracurricular',
];

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

function is_valid_date(string $date): bool
{
    $dt = DateTime::createFromFormat('Y-m-d', $date);
    return $dt !== false && $dt->format('Y-m-d') === $date;
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readPortfolio(string $portfolioId): ?array
{
    $file = DATA_DIR . '/' . "portfolio" . $portfolioId . '.json';
    if (!file_exists($file)) {
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
    $file = DATA_DIR . '/' . $portfolioId . '.json';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }
    return file_put_contents($file, $json, LOCK_EX) !== false;
}

function listAllPortfolios(): array
{
    if (!is_dir(DATA_DIR)) {
        return [];
    }
    // ค้นหาไฟล์ .json ทั้งหมดในโฟลเดอร์ (รองรับทั้ง portfolio_xxxx.json และ xxxx.json)
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
            'fullData' => $data // ส่งข้อมูลทั้งหมดมาด้วยเลย
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

    // 2. ตรวจสอบ Items
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

        $itemId = trim((string) ($item['id'] ?? ''));
        if ($itemId === '' || str_length($itemId) > 50) {
            sendJson(['error' => "Invalid item id at index {$index}"], 400);
        }

        $title = trim((string) ($item['title'] ?? ''));
        if ($title === '' || str_length($title) > 200) {
            sendJson(['error' => "Invalid item title at index {$index}"], 400);
        }

        $type = trim((string) ($item['type'] ?? ''));
        if (!in_array($type, ALLOWED_ITEM_TYPES, true)) {
            sendJson(['error' => "Invalid item type at index {$index}"], 400);
        }

        $date = trim((string) ($item['date'] ?? ''));
        if (!is_valid_date($date)) {
            sendJson(['error' => "Invalid item date at index {$index}"], 400);
        }

        $role = trim((string) ($item['role'] ?? ''));
        if ($role === '' || str_length($role) > 100) {
            sendJson(['error' => "Invalid item role at index {$index}"], 400);
        }

        $description = trim((string) ($item['description'] ?? ''));
        if ($description === '' || str_length($description) > 2000) {
            sendJson(['error' => "Invalid item description at index {$index}"], 400);
        }

        $skills = trim((string) ($item['skills'] ?? ''));
        if ($skills === '' || str_length($skills) > 500) {
            sendJson(['error' => "Invalid item skills at index {$index}"], 400);
        }

        $whatIDid = trim((string) ($item['what_i_did'] ?? ''));
        $whatILearned = trim((string) ($item['what_i_learned'] ?? ''));
        $challenge = trim((string) ($item['challenge'] ?? ''));
        $nextStep = trim((string) ($item['next_step'] ?? ''));

        if (
            $whatIDid === '' || str_length($whatIDid) > 1000 ||
            $whatILearned === '' || str_length($whatILearned) > 1000 ||
            $challenge === '' || str_length($challenge) > 1000 ||
            $nextStep === '' || str_length($nextStep) > 1000
        ) {
            sendJson(['error' => "All 4 reflection fields are required at index {$index}"], 400);
        }

        $link = trim((string) ($item['link'] ?? ''));
        if (!is_safe_url($link)) {
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
            'what_i_did' => $whatIDid,
            'what_i_learned' => $whatILearned,
            'challenge' => $challenge,
            'next_step' => $nextStep,
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
