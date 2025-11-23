// Include after realtime.js and after you set window.CURRENT_USER in your page.
// This listens for realtime:message events and auto-inserts a notification row + toast.
(function(){
  function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/[&<>"'`=\/]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c]; }); }
  function isForMe(msg){
    const rec = msg.recipients || null;
    if (!rec) return true;
    const me = window.CURRENT_USER || {};
    if (rec.role && me.role && rec.role === me.role) return true;
    if (rec.user_id && me.id && String(rec.user_id) === String(me.id)) return true;
    if (Array.isArray(rec.user_ids) && me.id && rec.user_ids.map(String).includes(String(me.id))) return true;
    return false;
  }
  function addRow(content){
    const tbody = document.getElementById('notificationsTableBody');
    if (!tbody) return;
    const nid = content.notification_id || '';
    const time = content.created_at ? new Date(content.created_at).toLocaleString() : '-';
    const type = content.notification_type || (content.payload && content.payload.notification_type) || 'info';
    const title = content.title || (content.payload && content.payload.title) || '';
    const message = content.message || (content.payload && content.payload.message) || '';
    const binId = content.bin_id || (content.payload && content.payload.bin_id) || '';
    const janitorId = content.janitor_id || (content.payload && content.payload.janitor_id) || '';
    const target = binId ? ('Bin #' + binId) : (janitorId ? ('Janitor #' + janitorId) : '-');
    const row = `<tr data-id="${escapeHtml(nid)}" data-bin-id="${escapeHtml(binId)}" data-janitor-id="${escapeHtml(janitorId)}" data-title="${escapeHtml(title)}" data-message="${escapeHtml(message)}">
      <td>${escapeHtml(time)}</td>
      <td>${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</td>
      <td>${escapeHtml(title)}</td>
      <td class="d-none d-md-table-cell"><small class="text-muted">${escapeHtml(message)}</small></td>
      <td class="d-none d-lg-table-cell">${escapeHtml(target)}</td>
      <td class="text-end"><button class="btn btn-sm btn-success mark-read-btn" data-id="${escapeHtml(nid)}"><i class="fas fa-check me-1"></i>Read</button></td>
    </tr>`;
    tbody.insertAdjacentHTML('afterbegin', row);
  }
  function showToast(text){
    const container = document.getElementById('notifToastContainer');
    if (!container) return alert(text);
    const id = 'toast-' + Math.random().toString(36).slice(2,9);
    const div = document.createElement('div');
    div.id = id; div.className = 'toast bg-info text-white'; div.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(text)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    container.appendChild(div);
    const t = new bootstrap.Toast(div); t.show();
    div.addEventListener('hidden.bs.toast', () => div.remove());
  }

  window.addEventListener('realtime:message', function(ev){
    const msg = ev.detail;
    if (!msg) return;
    // If server uses wrapper object {type, payload, recipients}
    if (!isForMe(msg)) return;
    if (msg.type === 'notification') {
      const content = msg.payload || msg;
      addRow(content);
      const toastText = (content.title ? content.title + ' — ' : '') + (content.message || '');
      showToast(toastText || 'New notification');
    } else if (msg.type === 'notification_read' && msg.payload && msg.payload.notification_id) {
      const id = String(msg.payload.notification_id);
      const row = document.querySelector(`#notificationsTableBody tr[data-id="${id}"]`);
      if (row) { row.classList.add('table-light'); const btn = row.querySelector('.mark-read-btn'); if (btn) btn.remove(); }
    } else if (msg.type === 'notifications_cleared') {
      const tbody = document.getElementById('notificationsTableBody'); if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No notifications found</td></tr>';
    }
  });

  // Auto-init Realtime connection using CURRENT_USER if available
  document.addEventListener('DOMContentLoaded', function(){
    if (window.Realtime && typeof window.Realtime.init === 'function') {
      const me = window.CURRENT_USER || {};
      const wsHost = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.hostname + ':3000';
      const q = []; if (me.role) q.push('role=' + encodeURIComponent(me.role)); if (me.id) q.push('userId=' + encodeURIComponent(me.id));
      Realtime.init({ url: wsHost + (q.length ? ('/?' + q.join('&')) : '') });
    }
  });
})();