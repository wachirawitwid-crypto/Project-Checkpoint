<?php
// ฟังก์ชันกลางสำหรับจัดการไฟล์ JSON ในโฟลเดอร์นอก Web Root (../Private/portfolios)

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Asia/Bangkok');

define(
    'DATA_DIR',
    (getenv('PORTFOLIO_DATA_DIR') ?: (dirname(__DIR__, 2) . '/Private/portfolios'))
);

// เช็ก Portfolio ID ต้องเป็นตัวเลข 10 หลัก (กันการส่ง ../ มาเปิดไฟล์อื่น)
function is_valid_portfolio_id($id)
{
    return is_string($id) && preg_match('/^[0-9]{10}$/', $id) === 1;
}

// นับความยาวตัวอักษร (รองรับภาษาไทย)
function str_length($s)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($s, 'UTF-8');
    }
    $n = preg_match_all('/./su', $s);
    return $n === false ? strlen($s) : $n;
}

// เช็กรูปแบบวันที่ YYYY-MM-DD และต้องเป็นวันที่มีอยู่จริงในปฏิทิน
function is_valid_date($date)
{
    if (!is_string($date) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) !== 1) {
        return false;
    }
    $y = (int) $m[1];
    $mo = (int) $m[2];
    $d = (int) $m[3];
    return $y >= 1970 && $y <= 2100 && checkdate($mo, $d, $y);
}

// เช็กลิงก์หลักฐาน อนุญาตเฉพาะ http:// และ https://
function is_safe_url($url)
{
    if (!is_string($url) || trim($url) === '' || str_length($url) > 2048) {
        return false;
    }
    $trimmed = trim($url);
    if (filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
        return false;
    }
    $scheme = strtolower((string) parse_url($trimmed, PHP_URL_SCHEME));
    $host = (string) parse_url($trimmed, PHP_URL_HOST);
    return ($scheme === 'http' || $scheme === 'https') && $host !== '';
}

// ส่งข้อมูลกลับไปหน้าเว็บเป็น JSON
function sendJson($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

// อ่านไฟล์ JSON ของ Portfolio 1 คน
function readPortfolio($portfolioId)
{
    if (!is_valid_portfolio_id($portfolioId)) {
        return null;
    }
    $file = DATA_DIR . '/' . $portfolioId . '.json';
    if (!file_exists($file)) {
        return null;
    }
    $json = @file_get_contents($file);
    if ($json === false) {
        return null;
    }
    $data = json_decode($json, true);
    if (!is_array($data)) {
        return null;
    }
    return $data;
}

// บันทึกไฟล์ JSON ของ Portfolio 1 คน (ใช้ LOCK_EX กันไฟล์เสียเวลาเซฟพร้อมกัน)
function writePortfolio($portfolioId, $data)
{
    if (!is_valid_portfolio_id($portfolioId)) {
        return false;
    }
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0750, true);
    }
    if (!is_dir(DATA_DIR) || !is_writable(DATA_DIR)) {
        return false;
    }
    $file = DATA_DIR . '/' . $portfolioId . '.json';
    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    if ($json === false) {
        return false;
    }
    return @file_put_contents(
        $file,
        $json . "\n",
        LOCK_EX
    ) !== false;
}

// ดึงรายชื่อ Portfolio ทั้งหมดที่มีอยู่บน Server (เอาไว้โชว์ในแถบเลือก Portfolio)
function listPortfolios()
{
    if (!is_dir(DATA_DIR)) {
        return [];
    }
    $files = @glob(DATA_DIR . '/*.json');
    if (!is_array($files)) {
        return [];
    }

    $list = [];
    foreach ($files as $file) {
        $id = basename($file, '.json');
        if (!is_valid_portfolio_id($id)) {
            continue;
        }
        $data = readPortfolio($id);
        if (!is_array($data)) {
            continue;
        }
        $profile = isset($data['profile']) && is_array($data['profile']) ? $data['profile'] : [];
        $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
        $list[] = [
            'id' => $id,
            'name' => trim((string) ($profile['full-name'] ?? 'Unnamed')),
            'itemCount' => count($items),
            'updatedAt' => date('c', (int) @filemtime($file))
        ];
    }

    usort($list, function ($a, $b) {
        return strcmp($b['updatedAt'], $a['updatedAt']);
    });

    return $list;
}

// แปลง 1 item จากรูปแบบในระบบ ให้เป็นรูปแบบมาตรฐาน CS100 (portfolio-example.json) สำหรับ Export / แลกเปลี่ยน
function toStandardPortfolioItem($item)
{
    $rawSkills = $item['skills'] ?? [];
    if (is_string($rawSkills)) {
        $skills = array_values(array_filter(array_map('trim', explode(',', $rawSkills)), function ($s) {
            return $s !== '';
        }));
    } elseif (is_array($rawSkills)) {
        $skills = array_values(array_filter(array_map(function ($s) {
            return is_string($s) ? trim($s) : '';
        }, $rawSkills), function ($s) {
            return $s !== '';
        }));
    } else {
        $skills = [];
    }

    $ref = isset($item['reflection']) && is_array($item['reflection']) ? $item['reflection'] : [];
    $reflection = [
        'whatIDid' => trim((string) ($ref['whatIDid'] ?? $item['what_i_did'] ?? '')),
        'whatILearned' => trim((string) ($ref['whatILearned'] ?? $item['what_i_learned'] ?? '')),
        'challenge' => trim((string) ($ref['challenge'] ?? $item['challenge'] ?? '')),
        'nextStep' => trim((string) ($ref['nextStep'] ?? $item['next_step'] ?? ''))
    ];

    $rawEvidence = $item['evidence'] ?? [];
    if (is_array($rawEvidence) && count($rawEvidence) > 0) {
        $evidence = array_values(array_filter(array_map(function ($u) {
            return is_string($u) ? trim($u) : '';
        }, $rawEvidence), function ($u) {
            return $u !== '';
        }));
    } elseif (!empty($item['link']) && is_string($item['link'])) {
        $evidence = [trim($item['link'])];
    } else {
        $evidence = [];
    }

    return [
        'id' => (string) ($item['id'] ?? 'item001'),
        'title' => trim((string) ($item['title'] ?? '')),
        'type' => trim((string) ($item['type'] ?? '')),
        'date' => trim((string) ($item['date'] ?? '')),
        'role' => trim((string) ($item['role'] ?? '')),
        'description' => trim((string) ($item['description'] ?? '')),
        'skills' => $skills,
        'reflection' => $reflection,
        'evidence' => $evidence
    ];
}

// แปลงข้อมูล Portfolio ทั้งชุดให้เป็นไฟล์ my-portfolio.json ตามโครงสร้างมาตรฐาน CS100
function toExportPortfolio($portfolioId, $data)
{
    $profile = isset($data['profile']) && is_array($data['profile']) ? $data['profile'] : [];
    $sourceItems = isset($data['content']) && is_array($data['content']) && count($data['content']) > 0
        ? $data['content']
        : (isset($data['items']) && is_array($data['items']) ? $data['items'] : []);

    $standardItems = [];
    foreach ($sourceItems as $it) {
        if (is_array($it)) {
            $standardItems[] = toStandardPortfolioItem($it);
        }
    }

    return [
        'portfolioId' => $portfolioId,
        'displayName' => trim((string) ($profile['full-name'] ?? '')),
        'whatIEnjoy' => trim((string) ($profile['enjoy'] ?? '')),
        'whatIVeTried' => trim((string) ($profile['tried'] ?? '')),
        'whatIMCuriousAbout' => trim((string) ($profile['curious-about'] ?? '')),
        'exportedAt' => date('c'),
        'items' => $standardItems
    ];
}
