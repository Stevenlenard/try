// Lightweight client helper. Drop into /js/realtime.js and include in your admin pages.
window.Realtime = (function(){
  let ws = null;
  let url = null;
  let intent = true;
  let baseReconnect = 2000;
  function connect() {
    if (!url) return console.error('Realtime: missing url');
    try { ws = new WebSocket(url); } catch (e) { schedule(); return; }
    ws.onopen = () => { console.log('Realtime connected'); };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        // emit DOM CustomEvent for other scripts
        window.dispatchEvent(new CustomEvent('realtime:message', { detail: data }));
      } catch (e) { console.warn('Realtime invalid message', evt.data); }
    };
    ws.onclose = () => { if (intent) schedule(); };
    ws.onerror = (e) => { console.error('Realtime error', e); ws.close(); };
  }
  let retry = 0;
  function schedule() {
    retry++;
    const ms = Math.min(30000, Math.round(baseReconnect * Math.pow(1.5, retry)));
    console.log('Realtime reconnect in', ms);
    setTimeout(connect, ms);
  }
  return {
    init(opts) {
      opts = opts || {};
      url = opts.url || ((location.protocol === 'https:') ? 'wss://' : 'ws://') + location.hostname + ':3000';
      if (opts.query) url += (url.includes('?') ? '&' : '?') + opts.query;
      baseReconnect = opts.reconnectInterval || baseReconnect;
      intent = true; retry = 0;
      connect();
    },
    close() { intent = false; if (ws) ws.close(); },
    send(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
  };
})();