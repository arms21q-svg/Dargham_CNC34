<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$file = dirname(__DIR__) . '/site-data.json';
$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

$result = file_put_contents($file, $json);

// نسخة احتياطية في dist عند الاستضافة
$distFile = dirname(__DIR__, 2) . '/site-data.json';
if (is_writable(dirname($distFile))) {
    @file_put_contents($distFile, $json);
}

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Saved successfully']);
