<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$allowed = ['xg', 'xam', 'tt'];
$type = $_GET['type'] ?? 'xam';
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(500, max(15, (int)($_GET['limit'] ?? 500)));
if (!in_array($type, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['status' => 1, 'info' => '不支持的彩种'], JSON_UNESCAPED_UNICODE);
    exit;
}
$ch = curl_init('https://lhw.235-from.com/index/wuqiapi/getwuqibizhong');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query(['type' => $type, 'page' => $page, 'limit' => $limit]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
]);
$raw = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);
if ($raw === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['status' => 1, 'info' => $error ?: '五期必中接口暂时不可用'], JSON_UNESCAPED_UNICODE);
    exit;
}
echo $raw;
