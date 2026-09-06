<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/content.json';

if ($method === 'GET') {
    if (!is_file($dataFile)) {
        echo json_encode(['version' => 1, 'updatedAt' => null, 'records' => []], JSON_UNESCAPED_UNICODE);
        exit;
    }
    readfile($dataFile);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => '不支持的请求方式'], JSON_UNESCAPED_UNICODE);
    exit;
}

$configuredToken = getenv('PAOGOU_ADMIN_TOKEN') ?: '';
$providedToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if ($configuredToken === '' || !hash_equals($configuredToken, $providedToken)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => $configuredToken === '' ? '服务器尚未设置后台发布密码' : '后台密码错误'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload) || !isset($payload['records']) || !is_array($payload['records'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => '资料格式不正确'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (count($payload['records']) > 2000) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => '资料数量超过限制'], JSON_UNESCAPED_UNICODE);
    exit;
}

$allowedSections = ['five','four','tail','fourZodiac','strategy','wave','kill','poem','ten','expert'];
$clean = [];
foreach ($payload['records'] as $record) {
    if (!is_array($record) || !in_array($record['section'] ?? '', $allowedSections, true)) continue;
    $clean[] = [
        'id' => mb_substr((string)($record['id'] ?? uniqid('record-', true)), 0, 80),
        'section' => $record['section'],
        'issue' => mb_substr((string)($record['issue'] ?? ''), 0, 20),
        'author' => mb_substr((string)($record['author'] ?? ''), 0, 40),
        'category' => mb_substr((string)($record['category'] ?? ''), 0, 60),
        'content' => mb_substr((string)($record['content'] ?? ''), 0, 1000),
        'result' => mb_substr((string)($record['result'] ?? ''), 0, 120),
        'status' => in_array($record['status'] ?? '', ['pending','hit','miss'], true) ? $record['status'] : 'pending',
    ];
}
$output = ['version' => 1, 'updatedAt' => date('c'), 'records' => $clean];
if (!is_dir($dataDir) && !mkdir($dataDir, 0750, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => '无法创建资料目录'], JSON_UNESCAPED_UNICODE);
    exit;
}
$tmp = $dataFile . '.tmp';
$json = json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $dataFile)) {
    @unlink($tmp);
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => '资料保存失败'], JSON_UNESCAPED_UNICODE);
    exit;
}
echo json_encode(['ok' => true, 'updatedAt' => $output['updatedAt'], 'count' => count($clean)], JSON_UNESCAPED_UNICODE);
