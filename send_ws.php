// send_ws.php
<?php
/**
 * Helper: Send a WebSocket broadcast to connected admins
 * Requires: WS server running at WS_HOST:WS_PORT with BROADCAST_SECRET set
 */
function broadcast_to_admins($type, $payload, $recipient_role = 'admin') {
    $ws_host = $_ENV['WS_HOST'] ?? 'localhost';
    $ws_port = $_ENV['WS_PORT'] ?? 3000;
    $broadcast_secret = $_ENV['BROADCAST_SECRET'] ?? '';
    
    if (!$broadcast_secret) return false; // secret not set
    
    $broadcast_url = "http://{$ws_host}:{$ws_port}/broadcast";
    $data = array(
        'type' => $type,
        'payload' => $payload,
        'recipients' => array('role' => $recipient_role)
    );
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $broadcast_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'x-broadcast-token: ' . $broadcast_secret
    ));
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return ($response !== false);
}
?>