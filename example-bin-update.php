<?php
// Example: call this right AFTER you successfully update a bin in DB.
// require send_ws.php and include proper user context (janitor id, bin id, etc.).
require_once __DIR__ . '/send_ws.php';

$bin_id = $updatedBinId ?? 123;
$janitor_id = $currentJanitorId ?? 45;
$bin_code = $bin_code ?? "BIN-{$bin_id}";

$payload = [
  'type' => 'notification',
  'payload' => [
    'notification_type' => 'bin_update',
    'title' => "Bin updated: {$bin_code}",
    'message' => "Janitor #{$janitor_id} updated bin {$bin_code}.",
    'bin_id' => $bin_id,
    'janitor_id' => $janitor_id,
    'created_at' => date('c')
  ],
  // target admins so only admins receive it
  'recipients' => ['role' => 'admin']
];

send_ws_broadcast($payload);
?>