(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || ((s) => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || ((n) => `NPR ${Number(n || 0).toLocaleString('en-IN')}`);
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
  const close = () => $('#backdrop')?.classList.remove('show');
  const show = (title, body, actions='') => {
    const m = $('#modal'); if (!m) return;
    m.innerHTML = `<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-oh-close>×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-oh-close>Close</button>${actions}</div>`;
    $('#backdrop')?.classList.add('show');
  };
  const toast = (msg, error=false) => {
    const n = $('#toast'); if (!n) return;
    n.textContent = msg; n.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(window.__ohToast); window.__ohToast = setTimeout(() => n.className = 'toast', 2800);
  };

  async function dateCheck() {
    const initial = today();
    show('Date Check', `<div class="form-grid"><label class="field"><span>Event date (AD)</span><input id="ohDate" type="date" value="${initial}"></label></div><div id="ohDateResult" class="notice">Checking schedule…</div>`, '<button class="btn primary" data-oh-check>Check availability</button>');
    await runDateCheck();
  }
  async function runDateCheck() {
    const d = $('#ohDate')?.value; const out = $('#ohDateResult'); if (!d || !out) return;
    out.textContent = 'Checking schedule…';
    try {
      const { data, error } = await A.sb.rpc('check_event_date_conflicts', { p_event_date: d, p_exclude_project_id: null });
      if (error) throw error;
      if (!data?.length) {
        out.innerHTML = `<div class="success-box"><b>Available</b><span>No existing function is recorded on ${esc(d)}.</span></div>`;
        return;
      }
      out.innerHTML = `<div class="warning-box"><b>${data.length} function${data.length === 1 ? '' : 's'} already scheduled</b>${data.map(x => `<div class="mini-row"><div><b>${esc(x.event_name || 'Event')}</b><small>${esc(x.function_name || 'Function')} · ${esc(x.venue || 'Venue TBC')}</small></div><span>${x.start_time ? esc(String(x.start_time).slice(0,5)) : 'Time TBC'}</span></div>`).join('')}</div>`;
    } catch (e) { out.innerHTML = `<div class="error-box">${esc(e.message || 'Date check failed')}</div>`; }
  }

  async function reminders(kind='all') {
    const now = Date.now();
    const rows = (A.state.reminders || []).filter(r => r.status === 'open').filter(r => kind !== 'payment' || String(r.reminder_type || '').toLowerCase().includes('payment'))
      .sort((a,b) => new Date(a.due_at || 0) - new Date(b.due_at || 0));
    const overdue = rows.filter(r => r.due_at && new Date(r.due_at).getTime() < now);
    const label = kind === 'payment' ? 'Payment Reminders' : 'Notifications';
    show(label, `<div class="notice"><b>${rows.length}</b> open · <b>${overdue.length}</b> overdue</div><div id="ohReminderList">${rows.length ? rows.map(r => `<div class="mini-row"><div><b>${esc(r.title)}</b><small>${r.due_at ? esc(new Date(r.due_at).toLocaleString()) : 'No due time'} · ${esc(r.priority || 'normal')}</small></div><button class="btn tiny" data-oh-done="${r.id}">Done</button></div>`).join('') : '<div class="empty"><b>Nothing needs attention</b><span>No open reminders.</span></div>'}</div>`, '<button class="btn primary" data-action="new-reminder">＋ New reminder</button>');
  }

  const PIPE = [
    ['new','New enquiries'],['quote_pending','Quotation pending'],['quote_made','Quotations made'],['quote_sent','Quotation sent'],['interested','Interested'],['not_interested','Not interested'],['awaiting_advance','Advance pending'],['booked','Booked'],['cancelled','Cancelled'],['booked_elsewhere','Booked elsewhere'],['lost','Lost'],['passed_on','Passed on'],['booking_cancelled','Booking cancelled']
  ];
  async function enquiriesPage() {
    await A.refresh();
    const rows = A.state.inquiries || [];
    const c = id => A.state.customers.find(x => x.id === id);
    $('#crumb').textContent = 'Enquiries & Quotation';
    $('#page').innerHTML = `<div class="page-head"><div><div class="eyebrow">ENQUIRIES & QUOTATION</div><h1>Sales Pipeline</h1><p>Every enquiry stays attached to its customer and becomes the same Event ID when converted.</p></div><div class="actions"><button class="btn primary" data-action="new-inquiry">＋ New enquiry</button></div></div><div class="pipeline-mini">${PIPE.map(([k,l]) => `<button class="${rows.filter(x=>x.status===k).length?'':'muted'}" data-oh-stage="${k}"><span>${esc(l)}</span><b>${rows.filter(x=>x.status===k).length}</b></button>`).join('')}</div><div class="panel table-panel"><table><thead><tr><th>Client / Enquiry</th><th>Date</th><th>Venue</th><th>Budget</th><th>Stage</th><th></th></tr></thead><tbody>${rows.map(i => `<tr data-oh-row="${i.id}"><td><b>${esc(i.event_name || 'Untitled event')}</b><small>${esc(c(i.customer_id)?.name || 'No client')} · ${esc(i.source || 'Other')}</small></td><td>${esc(i.event_date_bs || 'Date TBC')}</td><td>${esc(i.venue || 'Venue TBC')}</td><td>${i.budget ? money(i.budget) : '—'}</td><td><select data-oh-status="${i.id}">${PIPE.map(([k,l])=>`<option value="${k}" ${i.status===k?'selected':''}>${esc(l)}</option>`).join('')}</select></td><td>${i.status==='new'||i.status==='quote_pending'||i.status==='quote_made'||i.status==='quote_sent'||i.status==='interested'||i.status==='awaiting_advance' ? `<button class="btn tiny" data-oh-convert="${i.id}">Convert to Event</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="6">No enquiries yet.</td></tr>`}</tbody></table></div>`;
  }
  async function setInquiryStage(id, status) {
    await A.updateInquiry(id, { status, updated_at: new Date().toISOString() });
    toast('Enquiry stage updated');
    await enquiriesPage();
  }
  async function convertInquiry(id) {
    try {
      const p = await A.convertInquiry(id);
      toast(`Converted to ${p.event_code || 'Event'}`);
      const open = document.querySelector(`[data-action="open-project"][data-id="${p.id}"]`);
      if (open) open.click();
      else await enquiriesPage();
    } catch (e) { toast(e.message || 'Could not convert enquiry', true); }
  }

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-oh-close]'); if (t) { close(); return; }
    const check = ev.target.closest('[data-oh-check]'); if (check) { runDateCheck(); return; }
    const done = ev.target.closest('[data-oh-done]');
    if (done) { A.updateReminder(done.dataset.ohDone, { status: 'done' }).then(() => { toast('Reminder completed'); reminders(); }).catch(e => toast(e.message || 'Could not update reminder', true)); return; }
    const routeInquiry = ev.target.closest('[data-route="inquiries"]');
    if (routeInquiry) { ev.preventDefault(); ev.stopImmediatePropagation(); enquiriesPage().catch(e => toast(e.message || 'Could not open enquiries', true)); return; }
    const el = ev.target.closest('[data-action="date-check"], [data-oh-date-check]'); if (el) { ev.preventDefault(); dateCheck(); return; }
    const note = ev.target.closest('[data-action="notifications"]'); if (note) { ev.preventDefault(); reminders('all'); return; }
    const pay = ev.target.closest('[data-action="payment-reminder"]'); if (pay) { ev.preventDefault(); reminders('payment'); return; }
    const conv = ev.target.closest('[data-oh-convert]'); if (conv) { ev.preventDefault(); convertInquiry(conv.dataset.ohConvert); return; }
    const stage = ev.target.closest('[data-oh-stage]'); if (stage) { const val = stage.dataset.ohStage; enquiriesPage().then(() => { const s=document.querySelector(`[data-oh-status]`); if(s) s.focus(); toast(`Showing ${val.replaceAll('_',' ')}`); }); return; }
  }, true);
  document.addEventListener('change', (ev) => {
    const s = ev.target.closest('[data-oh-status]'); if (!s) return;
    setInquiryStage(s.dataset.ohStatus, s.value).catch(e => toast(e.message || 'Could not update enquiry', true));
  }, true);
})();
