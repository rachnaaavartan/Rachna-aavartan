(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || new URLSearchParams(location.search).has('portal')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));

  function inject() {
    if (!A.state?.user || $('#clientPortalAction')) return !!$('#clientPortalAction');
    const top = $('.topbar');
    const enquiry = top?.querySelector('[data-route="inquiries"]');
    if (!top || !enquiry) return false;
    const portal = document.createElement('button');
    portal.id = 'clientPortalAction';
    portal.className = 'top-action';
    portal.textContent = '◈ Client Portal';
    portal.addEventListener('click', () => $('#clientPortalAction')?.click());
    return false;
  }

  // Keep retrying because the main application initializes the session asynchronously.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (window.osClientPortalInject) {
      window.osClientPortalInject();
      if ($('#clientPortalAction') || attempts >= 30) clearInterval(timer);
    } else if (attempts >= 30) clearInterval(timer);
  }, 500);

  async function showRequests() {
    if (!A.state?.user) return;
    const modal = $('#modal'), backdrop = $('#backdrop');
    if (!modal || !backdrop) return;
    modal.innerHTML = '<div class="modal-head"><div><div class="eyebrow">CLIENT PORTAL</div><h2>Client Requests</h2></div><button class="close-btn" id="crClose">×</button></div><div class="modal-body"><div id="crBody">Loading requests…</div></div><div class="modal-foot"><button class="btn" id="crClose2">Close</button></div>';
    backdrop.classList.add('show');
    const close = () => backdrop.classList.remove('show');
    $('#crClose').onclick = close; $('#crClose2').onclick = close;
    const { data, error } = await A.sb.from('portal_requests').select('*').order('created_at', { ascending: false }).limit(50);
    const body = $('#crBody');
    if (error) { body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; return; }
    if (!data?.length) { body.innerHTML = '<div class="empty"><b>No client requests</b><span>New requests sent from shared portals will appear here.</span></div>'; return; }
    const projectName = id => A.state.projects.find(p => p.id === id);
    body.innerHTML = data.map(r => {
      const p = projectName(r.project_id);
      return `<div class="mini-row" style="align-items:flex-start"><div style="flex:1"><b>${esc(r.request_type || 'general')} · ${esc(p?.event_code || 'Event')}</b><small>${esc(p?.name || 'Event')} · ${esc(new Date(r.created_at).toLocaleString())}</small><p style="margin:6px 0 0">${esc(r.message)}</p></div><select class="cr-status" data-id="${r.id}">${['open','in_progress','done','closed'].map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}</select></div>`;
    }).join('');
    body.querySelectorAll('.cr-status').forEach(s => s.addEventListener('change', async () => {
      const { error: e } = await A.sb.from('portal_requests').update({ status: s.value, updated_at: new Date().toISOString() }).eq('id', s.dataset.id);
      if (e) { s.value = 'open'; window.alert(e.message); }
    }));
  }

  // Bridge the existing portal injector without duplicating its implementation.
  const previousReady = window.osClientPortalInject;
  window.osClientPortalInject = () => {
    if (typeof previousReady === 'function') previousReady();
    const existing = $('#clientPortalAction');
    if (existing) return true;
    return false;
  };

  const addRequestsButton = () => {
    if (!A.state?.user || $('#clientRequestsAction')) return;
    const top = $('.topbar');
    const notification = top?.querySelector('[data-action="notifications"]');
    if (!top || !notification) return;
    const btn = document.createElement('button');
    btn.id = 'clientRequestsAction';
    btn.className = 'top-action';
    btn.textContent = '◌ Client Requests';
    btn.onclick = showRequests;
    notification.after(btn);
  };
  const requestTimer = setInterval(() => {
    addRequestsButton();
    if ($('#clientRequestsAction') || attempts >= 30) clearInterval(requestTimer);
  }, 500);
})();
