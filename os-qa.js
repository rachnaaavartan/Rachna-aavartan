(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || new URLSearchParams(location.search).has('portal')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));

  async function openClientPortal() {
    const modal = $('#modal'), backdrop = $('#backdrop');
    if (!modal || !backdrop || !A.state?.user) return;
    const projects = A.state.projects || [];
    if (!projects.length) {
      modal.innerHTML = '<div class="modal-head"><div><div class="eyebrow">CLIENT PORTAL</div><h2>Client Portal</h2></div><button class="close-btn" id="cpClose">×</button></div><div class="modal-body"><div class="empty"><b>No events yet</b><span>Create an Event ID first.</span></div></div>';
      backdrop.classList.add('show'); $('#cpClose').onclick = () => backdrop.classList.remove('show'); return;
    }
    modal.innerHTML = `<div class="modal-head"><div><div class="eyebrow">CLIENT PORTAL</div><h2>Share an event portal</h2></div><button class="close-btn" id="cpClose">×</button></div><div class="modal-body"><label class="field"><span>Event</span><select id="cpProject">${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.event_code||'Event')} · ${esc(p.name)}</option>`).join('')}</select></label><div id="cpResult" class="notice">Create a secure portal link for the selected Event ID.</div></div><div class="modal-foot"><button class="btn" id="cpClose2">Close</button><button class="btn primary" id="cpCreate">Create portal</button></div>`;
    backdrop.classList.add('show');
    const close = () => backdrop.classList.remove('show');
    $('#cpClose').onclick = close; $('#cpClose2').onclick = close;
    $('#cpCreate').onclick = async () => {
      const button = $('#cpCreate'); button.disabled = true; button.textContent = 'Creating…';
      const { data, error } = await A.sb.rpc('create_client_portal', { p_project_id: $('#cpProject').value });
      button.disabled = false; button.textContent = 'Create portal';
      if (error) { $('#cpResult').innerHTML = `<div class="error-box">${esc(error.message)}</div>`; return; }
      const url = `${location.origin}${location.pathname}?portal=${encodeURIComponent(data.token)}`;
      $('#cpResult').innerHTML = `<div class="success-box"><b>Portal ready</b><p style="word-break:break-all">${esc(url)}</p><button class="btn tiny" id="cpCopy">Copy link</button> <a class="btn tiny" target="_blank" rel="noopener" href="${esc(url)}">Open</a></div>`;
      $('#cpCopy').onclick = async () => { try { await navigator.clipboard.writeText(url); $('#cpCopy').textContent = 'Copied'; } catch { window.prompt('Copy portal link', url); } };
    };
  }

  async function showRequests() {
    const modal = $('#modal'), backdrop = $('#backdrop');
    if (!modal || !backdrop || !A.state?.user) return;
    modal.innerHTML = '<div class="modal-head"><div><div class="eyebrow">CLIENT PORTAL</div><h2>Client Requests</h2></div><button class="close-btn" id="crClose">×</button></div><div class="modal-body"><div id="crBody">Loading requests…</div></div><div class="modal-foot"><button class="btn" id="crClose2">Close</button></div>';
    backdrop.classList.add('show');
    const close = () => backdrop.classList.remove('show');
    $('#crClose').onclick = close; $('#crClose2').onclick = close;
    const { data, error } = await A.sb.from('portal_requests').select('*').order('created_at', { ascending: false }).limit(50);
    const body = $('#crBody');
    if (error) { body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; return; }
    if (!data?.length) { body.innerHTML = '<div class="empty"><b>No client requests</b><span>New requests sent from shared portals will appear here.</span></div>'; return; }
    body.innerHTML = data.map(r => {
      const p = A.state.projects.find(x => x.id === r.project_id);
      return `<div class="mini-row" style="align-items:flex-start"><div style="flex:1"><b>${esc(r.request_type || 'general')} · ${esc(p?.event_code || 'Event')}</b><small>${esc(p?.name || 'Event')} · ${esc(new Date(r.created_at).toLocaleString())}</small><p style="margin:6px 0 0">${esc(r.message)}</p></div><select class="cr-status" data-id="${r.id}">${['open','in_progress','done','closed'].map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}</select></div>`;
    }).join('');
    body.querySelectorAll('.cr-status').forEach(s => s.addEventListener('change', async () => {
      const old = s.dataset.old || 'open';
      const { error: e } = await A.sb.from('portal_requests').update({ status: s.value, updated_at: new Date().toISOString() }).eq('id', s.dataset.id);
      if (e) { s.value = old; window.alert(e.message); } else s.dataset.old = s.value;
    }));
  }

  function ensureButtons() {
    if (!A.state?.user) return false;
    const top = $('.topbar');
    if (!top) return false;
    const enquiry = top.querySelector('[data-route="inquiries"]');
    if (enquiry && !$('#clientPortalAction')) {
      const b = document.createElement('button');
      b.id = 'clientPortalAction'; b.className = 'top-action'; b.textContent = '◈ Client Portal'; b.onclick = openClientPortal;
      enquiry.after(b);
    }
    const notification = top.querySelector('[data-action="notifications"]');
    if (notification && !$('#clientRequestsAction')) {
      const b = document.createElement('button');
      b.id = 'clientRequestsAction'; b.className = 'top-action'; b.textContent = '◌ Client Requests'; b.onclick = showRequests;
      notification.after(b);
    }
    return !!$('#clientPortalAction') && !!$('#clientRequestsAction');
  }

  let attempts = 0;
  const timer = setInterval(() => { attempts += 1; if (ensureButtons() || attempts >= 40) clearInterval(timer); }, 500);
  window.addEventListener('focus', ensureButtons);
})();
