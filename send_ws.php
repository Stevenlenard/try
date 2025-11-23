<?php
// Minimal helper to POST a payload to the Node broadcast endpoint.
// Put this file somewhere like includes/send_ws.php and include/require it
function send_ws_broadcast($payloadArray) {
    // Configure: update these to your server and secret
    $wsHost = 'http://127.0.0.1:3000'; // if Node server runs on same host
    $endpoint = $wsHost . '/broadcast';
    $secret = 'change-me-secret'; // must match BROADCAST_SECRET set for Node server

    $data = json_encode($payloadArray);
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Broadcast-Token: ' . $secret
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2); // don't block for long
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