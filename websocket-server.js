/*
Small change: store minimal client meta (role/userId) supplied via query string at WS connect time,
and allow POST /broadcast to include a "recipients" key to target messages.

Start (unchanged): node websocket-server.js
Requires: express ws
*/
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.WS_PORT || 3000;
const BROADCAST_SECRET = process.env.BROADCAST_SECRET || 'change-me-secret';

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Parse query params from the WebSocket upgrade request (e.g. ws://host:3000/?role=admin&userId=123)
  try {
    const parsed = url.parse(req.url, true);
    const q = parsed.query || {};
    ws.clientMeta = {
      role: q.role || null,           // e.g. "admin" or "janitor"
      userId: q.userId ? String(q.userId) : null // keep as string for comparison
    };
  } catch (e) {
    ws.clientMeta = { role: null, userId: null };
  }

  console.log('Client connected:', req.socket.remoteAddress, ws.clientMeta);
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (msg) => {
    // optional: handle client-originated messages (heartbeat, register, etc.)
    console.log('Received from client:', msg.toString());
    try {
      const obj = JSON.parse(msg.toString());
      // Example: client can send {type: 'identify', role: 'admin', userId: '1'} instead of querystring
      if (obj && obj.type === 'identify') {
        ws.clientMeta = { role: obj.role || null, userId: obj.userId ? String(obj.userId) : null };
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log('Client disconnected', ws.clientMeta);
  });
});

// Heartbeat to drop dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// Broadcast endpoint: accepts payload and optional recipients
// Example POST body:
// {
//   "type": "notification",
//   "payload": { "title": "...", "bin_id": 5 },
//   "recipients": { "role": "admin" }
// }
app.post('/broadcast', (req, res) => {
  const token = req.headers['x-broadcast-token'] || '';
  if (token !== BROADCAST_SECRET) {
    return res.status(401).json({ ok: false, error: 'invalid token' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || !payload.type) {
    return res.status(400).json({ ok: false, error: 'invalid payload' });
  }

  const recipients = payload.recipients || null; // e.g. { role: 'admin' } or { user_id: '123' }
  const message = JSON.stringify(payload);
  let count = 0;

  wss.clients.forEach((client) => {
    if (client.readyState !== client.OPEN) return;
    if (!recipients) {
      client.send(message);
      count++;
      return;
    }

    // recipients targeting logic:
    let sent = false;
    if (recipients.role && client.clientMeta && client.clientMeta.role === recipients.role) {
      client.send(message);
      sent = true;
    } else if (recipients.user_id && client.clientMeta && String(client.clientMeta.userId) === String(recipients.user_id)) {
      client.send(message);
      sent = true;
    } else if (Array.isArray(recipients.user_ids) && client.clientMeta && recipients.user_ids.map(String).includes(String(client.clientMeta.userId))) {
      client.send(message);
      sent = true;
    }

    if (sent) count++;
  });

  res.json({ ok: true, clients: count });
});

server.listen(PORT, () => {
  console.log(`WebSocket + Broadcast HTTP server listening on port ${PORT}`);
});