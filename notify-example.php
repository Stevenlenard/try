<?php
// Example usage: call this whenever you create a new notification/report in PHP.
// Put this next to your existing send_ws.php helper and include/require it from the code that creates notifications.
//
// Example:
//   require_once __DIR__ . '/send_ws.php';
//   $payload = [
//     'type' => 'notification',
//     'payload' => ['text' => 'New cookie created by ' . $userName, 'id' => $insertedId]
//   ];
//   send_ws_broadcast($payload);

require_once __DIR__ . '/send_ws.php';

function notify_new_cookie($text) {
    $payload = [
        'type' => 'notification',
        'payload' => [
            'text' => $text,
            'timestamp' => time()
        ]
    ];
    $resp = send_ws_broadcast($payload);
    // $resp is false on curl error or the server JSON string otherwise.
    if ($resp === false) {
        error_log('Realtime notify failed for: ' . $text);
    } else {
        // Optionally decode the response from the Node broadcast endpoint
        // $decoded = json_decode($resp, true);
    }
    return $resp;
}

// Simple quick test: call notify_new_cookie('Hello world'); from a page that includes this file.
// Note: keep timeout small in send_ws.php so requests don't block user actions.
?>