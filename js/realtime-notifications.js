(function(){
  // Ensure Realtime client is loaded first (your /js/realtime.js)
  // You must expose current user role/id into page, e.g.:
  // <script>window.CURRENT_USER = { id: 1, role: 'admin' };</script>

  function isRelevantForMe(msg) {
    // If payload has recipients, check role/user match. If none, treat as global.
    const rec = msg.recipients || null;
    if (!rec) return true;
    const me = window.CURRENT_USER || {};
    if (rec.role && me.role && rec.role === me.role) return true;
    if (rec.user_id && me.id && String(rec.user_id) === String(me.id)) return true;
    if (Array.isArray(rec.user_ids) && me.id && rec.user_ids.map(String).includes(String(me.id))) return true;
    return false;
  }

  function buildRowHtml(notification) {
    // build table row similar to existing server-side rendering
    const nid = notification.notification_id ? notification.notification_id : '';
    const timeDisplay = notification.created_at ? new Date(notification.created_at).toLocaleString() : '-';
    const type = notification.notification_type || 'info';
    const title = notification.title || notification.payload && notification.payload.title || (notification.payload && notification.payload.message) || 'Notification';
    const message = notification.message || notification.payload && notification.payload.message || '';
    const binId = notification.bin_id || (notification.payload && notification.payload.bin_id) || '';
    const janitorId = notification.janitor_id || (notification.payload && notification.payload.janitor_id) || '';
    const target = binId ? ('Bin #' + binId) : (janitorId ? ('Janitor #' + janitorId) : '-');
    const isReadClass = ''; // new notifications are unread

    return `<tr data-id="${nid}" data-bin-id="${binId}" data-janitor-id="${janitorId}" data-title="${escapeHtml(title)}" data-message="${escapeHtml(message)}" class="${isReadClass}">
      <td>${escapeHtml(timeDisplay)}</td>
      <td>${escapeHtml(capitalize(type))}</td>
      <td>${escapeHtml(title)}</td>
      <td class="d-none d-md-table-cell"><small class="text-muted">${escapeHtml(message)}</small></td>
      <td class="d-none d-lg-table-cell">${escapeHtml(target)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-success mark-read-btn" data-id="${nid}"><i class="fas fa-check me-1"></i>Read</button>
      </td>
    </tr>`;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c];
    });
  }
  function capitalize(s){ return String(s||'').charAt(0).toUpperCase() + String(s||'').slice(1); }

  function showToast(message, type) {
    // reuse site's showToast if present, otherwise simple alert fallback
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
      return;
    }
    // fallback: temporary toast
    const container = document.getElementById('notifToastContainer');
    if (!container) {
      alert(message);
      return;
    }
    const id = 'toast-' + Math.random().toString(36).slice(2,9);
    const div = document.createElement('div');
    div.id = id;
    div.className = 'toast bg-info text-white';
    div.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    container.appendChild(div);
    const toast = new bootstrap.Toast(div);
    toast.show();
    div.addEventListener('hidden.bs.toast', function(){ div.remove(); });
  }

  // Attach listener for messages emitted by realtime.js
  window.addEventListener('realtime:message', function(ev) {
    const msg = ev.detail;
    if (!msg) return;
    // If msg has outer 'payload' wrapper like we send from PHP, normalize
    // Our expected shape from server: { type: 'notification', payload: { ... }, recipients: { ... } }
    if (!isRelevantForMe(msg)) return;

    if (msg.type === 'notification' || msg.type === 'bin_update') {
      // The useful content may be in msg.payload or top-level fields
      const content = msg.payload || msg;
      // ensure created_at exists
      content.created_at = content.created_at || (new Date()).toISOString();

      // Insert new row into the notifications table
      const tbody = document.getElementById('notificationsTableBody');
      if (tbody) {
        const rowHtml = buildRowHtml(content);
        // prepend new row
        tbody.insertAdjacentHTML('afterbegin', rowHtml);
      }

      // show toast
      const toastText = (content.title ? content.title + ' — ' : '') + (content.message || (content.payload && content.payload.message) || '');
      showToast(toastText || 'New notification', 'info');

      // Optionally increment badge/unread counter if you have one:
      try {
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
          const val = parseInt(badge.innerText || '0') || 0;
          badge.innerText = val + 1;
        }
      } catch (e) {}
    }

    // handle other realtime types (notification_read, notifications_cleared) as needed
    if (msg.type === 'notification_read' && msg.payload && msg.payload.notification_id) {
      // find matching row and mark as read
      const nid = String(msg.payload.notification_id);
      const row = document.querySelector(`#notificationsTableBody tr[data-id="${nid}"]`);
      if (row) {
        row.classList.add('table-light');
        const btn = row.querySelector('.mark-read-btn');
        if (btn) btn.remove();
      }
    }
    if (msg.type === 'notifications_cleared') {
      const tbody = document.getElementById('notificationsTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No notifications found</td></tr>';
    }
  });

  // Initialize Realtime client if available (auto URL, or pass options)
  if (window.Realtime && typeof window.Realtime.init === 'function') {
    // Connect with query params so server knows client role/user (optional)
    const me = window.CURRENT_USER || {};
    const wsHost = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + ':3000';
    const q = [];
    if (me.role) q.push('role=' + encodeURIComponent(me.role));
    if (me.id) q.push('userId=' + encodeURIComponent(me.id));
    const wsUrl = wsHost + (q.length ? ('/?' + q.join('&')) : '');
    window.Realtime.init({ url: wsUrl });
  } else {
    // If not using Realtime helper, you can create raw WebSocket here (similar connection).
    // new WebSocket('ws://host:3000/?role=admin&userId=1') ...
  }
})();