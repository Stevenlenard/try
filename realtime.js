(function () {
  // Improved client-side WebSocket helper for realtime updates.
  // Usage:
  //   <script src="/js/realtime.js"></script>
  //   Realtime.init({ url: 'wss://example.com:3000', onMessage: fn, reconnectInterval: 2000 });
  // Or omit url to auto-detect (will try wss/ws on same host and port 3000 by default).
  if (window.Realtime) return;

  const Realtime = (function () {
    let ws = null;
    let url = null;
    let baseReconnectInterval = 2000;
    let reconnectInterval = baseReconnectInterval;
    let onMessageCallback = null;
    let intentConnect = true;
    let maxReconnectInterval = 30000;
    let reconnectAttempts = 0;

    function emitMessageEvent(data) {
      try {
        const ev = new CustomEvent('realtime:message', { detail: data });
        window.dispatchEvent(ev);
      } catch (e) {
        // older browsers: ignore
      }
    }

    function defaultHandler(data) {
      // Example: handle a notification push
      if (data && data.type === 'notification') {
        const list = document.getElementById('notifications-list');
        if (list) {
          const item = document.createElement('li');
          item.innerText = data.payload && data.payload.text ? data.payload.text : JSON.stringify(data.payload);
          list.prepend(item);
        }
      }

      // Example: handle generic update for reports
      if (data && data.type === 'report') {
        console.log('Report update received:', data.payload);
        const el = document.getElementById('reports-updates');
        if (el) {
          el.innerText = 'New report at ' + new Date().toLocaleTimeString();
        }
      }

      // Allow other code to listen via event:
      emitMessageEvent(data);

      if (onMessageCallback) onMessageCallback(data);
    }

    function makeDefaultUrl() {
      // Use given location but default port 3000 if none provided.
      try {
        // Prefer same host + port 3000 (common dev setup)
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        // If page is served via host:port, use same host; otherwise use hostname
        const host = location.hostname;
        // If you're serving WS on a different host/port, pass url in init().
        const port = 3000;
        return `${protocol}//${host}:${port}`;
      } catch (e) {
        return null;
      }
    }

    function connect() {
      if (!url) {
        url = makeDefaultUrl();
      }
      if (!url) {
        console.error('Realtime: missing url, call Realtime.init({url: "wss://..."}).');
        return;
      }

      try {
        ws = new WebSocket(url);
      } catch (err) {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        reconnectAttempts = 0;
        reconnectInterval = baseReconnectInterval;
        console.log('Realtime: connected to', url);
        // Optionally announce the client or perform auth handshake here:
        // ws.send(JSON.stringify({ type: 'hello', payload: { page: location.pathname } }));
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          defaultHandler(data);
        } catch (e) {
          console.warn('Realtime: invalid message', evt.data);
        }
      };

      ws.onclose = (ev) => {
        console.log('Realtime: connection closed', ev && ev.code ? 'code=' + ev.code : '');
        if (intentConnect) scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.log('Realtime: socket error', err && err.message ? err.message : err);
        // close will trigger reconnect logic
        try {
          ws.close();
        } catch (e) {}
      };
    }

    function scheduleReconnect() {
      reconnectAttempts++;
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 1000);
      reconnectInterval = Math.min(maxReconnectInterval, Math.floor(baseReconnectInterval * Math.pow(1.5, reconnectAttempts)) + jitter);
      console.log('Realtime: reconnecting in', reconnectInterval, 'ms');
      setTimeout(() => {
        console.log('Realtime: reconnecting...');
        connect();
      }, reconnectInterval);
    }

    return {
      init: function (opts) {
        opts = opts || {};
        url = opts.url || null;
        // If the user passed a page/port like 3000 in location, prefer that
        if (!url) {
          url = makeDefaultUrl();
        }
        baseReconnectInterval = opts.reconnectInterval || baseReconnectInterval;
        maxReconnectInterval = opts.maxReconnectInterval || maxReconnectInterval;
        onMessageCallback = typeof opts.onMessage === 'function' ? opts.onMessage : null;
        intentConnect = true;
        reconnectAttempts = 0;
        reconnectInterval = baseReconnectInterval;
        connect();
      },
      close: function () {
        intentConnect = false;
        if (ws) ws.close();
      },
      send: function (obj) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(obj));
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      }
    };
  })();

  window.Realtime = Realtime;
})();