<?php
// Minimal helper: POST to your websocket-server /broadcast endpoint.
// Configure $wsHost and $secret to match websocket-server.js settings.
function send_ws_broadcast(array $payload) {
    $wsHost = 'http://127.0.0.1:3000'; // node server host (use https:// if behind TLS reverse proxy)
    $endpoint = rtrim($wsHost, '/') . '/broadcast';
    $secret = 'change-me-secret'; // set same value as BROADCAST_SECRET

    $data = json_encode($payload);
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Broadcast-Token: ' . $secret
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        error_log('send_ws_broadcast error: ' . $err);
        return false;
    }
    return $resp;
}
?>