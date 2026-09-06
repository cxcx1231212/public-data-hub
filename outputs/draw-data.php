<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$allowed = [5, 6, 11];
$lottery = (int)($_GET['lottery'] ?? 5);
if (!in_array($lottery, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['code' => 1, 'message' => '不支持的彩种'], JSON_UNESCAPED_UNICODE);
    exit;
}
$ch = curl_init('https://fkzyapi.niksuhfds.com/api/index/lastLotteryRecord/' . $lottery);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
]);
$raw = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);
if ($raw === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['code' => 1, 'message' => $error ?: '开奖接口暂时不可用'], JSON_UNESCAPED_UNICODE);
    exit;
}
echo $raw;
