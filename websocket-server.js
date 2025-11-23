/*
Simple WS server with targeted broadcasts.
Requires: npm install express ws
Run: BROADCAST_SECRET=your-secret node websocket-server.js
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
  // parse querystring for role/userId: ws://host:3000/?role=admin&userId=1
  try {
    const parsed = url.parse(req.url, true);
    ws.clientMeta = { role: parsed.query.role || null, userId: parsed.query.userId ? String(parsed.query.userId) : null };
  } catch (e) {
    ws.clientMeta = { role: null, userId: null };
  }
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', (m) => {
    // optional: client can send identify msg {type:'identify', role:'admin', userId:'1'}
    try {
      const obj = JSON.parse(m.toString());
      if (obj && obj.type === 'identify') ws.clientMeta = { role: obj.role || null, userId: obj.userId ? String(obj.userId) : null };
    } catch (e) {}
  });
  ws.on('close', () => {});
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// Broadcast endpoint: accepts {type, payload, recipients?}
app.post('/broadcast', (req, res) => {
  const token = req.headers['x-broadcast-token'] || '';
  if (token !== BROADCAST_SECRET) return res.status(401).json({ ok: false, error: 'invalid token' });

  const body = req.body;
  if (!body || !body.type) return res.status(400).json({ ok: false, error: 'invalid payload' });

  const recipients = body.recipients || null;
  const msg = JSON.stringify(body);
  let sent = 0;

  wss.clients.forEach((client) => {
    if (client.readyState !== client.OPEN) return;
    if (!recipients) {
      client.send(msg);
      sent++;
      return;
    }
    let delivered = false;
    if (recipients.role && client.clientMeta && client.clientMeta.role === recipients.role) {
      client.send(msg); delivered = true;
    } else if (recipients.user_id && client.clientMeta && String(client.clientMeta.userId) === String(recipients.user_id)) {
      client.send(msg); delivered = true;
    } else if (Array.isArray(recipients.user_ids) && client.clientMeta && recipients.user_ids.map(String).includes(String(client.clientMeta.userId))) {
      client.send(msg); delivered = true;
    }
    if (delivered) sent++;
  });

  res.json({ ok: true, clients: sent });
});

server.listen(PORT, () => console.log(`WS server listening on ${PORT}`));