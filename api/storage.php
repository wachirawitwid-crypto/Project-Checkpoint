<?php

define(
    'DATA_DIR',
    dirname(__DIR__, 2) . '/Private/portfolios'
);

function is_valid_portfolio_id($id)
{
    return is_string($id) && preg_match('/^[0-9]{10}$/', $id) === 1;
}

function str_length($s)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($s, 'UTF-8');
    }
    $n = preg_match_all('/./su', $s);
    return $n === false ? strlen($s) : $n;
}

function is_safe_url($url)
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

function sendJson($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function readPortfolio($portfolioId)
{
    $file = DATA_DIR . '/' . $portfolioId . '.json';
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

function writePortfolio($portfolioId, $data)
{
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0750, true);
    }
    $file = DATA_DIR . '/' . $portfolioId . '.json';
    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );
    if ($json === false) {
        return false;
    }
    return file_put_contents(
        $file,
        $json,
        LOCK_EX
    ) !== false;
}
