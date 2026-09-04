(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || !A.sb) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (v => String(v ?? ''));
  const escAttr = v => esc(v).replace(/`/g, '&#96;');
  const money = A.money || (v => `NPR ${Number(v || 0).toLocaleString('en-IN')}`);
  const state = A.state;
  const byId = (list, id) => list.find(x => x.id === id);
  const customer = id => byId(state.customers, id);
  const inquiry = id => byId(state.inquiries, id);
  const project = id => byId(state.projects, id);
  const functionsFor = id => state.functions.filter(f => f.project_id === id).sort((a,b) => String(a.event_date || '9999-12-31').localeCompare(String(b.event_date || '9999-12-31')));
  const toast = (message, bad = false) => {
    let node = $('#cosToast');
    if (!node) { node = document.createElement('div'); node.id = 'cosToast'; document.body.appendChild(node); }
    node.textContent = message;
    node.className = 'cos-toast show' + (bad ? ' bad' : '');
    clearTimeout(window.__dayOneToast);
    window.__dayOneToast = setTimeout(() => { node.className = 'cos-toast'; }, 2800);
  };

  function modal(title, body, actions = '') {
    let backdrop = $('#dayOneModal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'dayOneModal';
      backdrop.className = 'dayone-modal-backdrop';
      document.body.appendChild(backdrop);
    }
    backdrop.innerHTML = `<div class="dayone-modal" role="dialog" aria-modal="true"><div class="dayone-modal-head"><div><small>RACHNA COMPANY OS · DAY ONE</small><h2>${esc(title)}</h2></div><button class="dayone-x" data-dayone-close>×</button></div><div class="dayone-modal-body">${body}</div><div class="dayone-modal-foot"><button class="cos-btn" data-dayone-close>Cancel</button>${actions}</div></div>`;
    backdrop.classList.add('show');
  }
  function closeModal() { $('#dayOneModal')?.classList.remove('show'); }

  const input = (label, id, value = '', type = 'text', attrs = '') => `<label class="dayone-field"><span>${esc(label)}</span><input id="${id}" type="${type}" value="${escAttr(value ?? '')}" ${attrs}></label>`;
  const area = (label, id, value = '') => `<label class="dayone-field dayone-full"><span>${esc(label)}</span><textarea id="${id}">${esc(value ?? '')}</textarea></label>`;
  const select = (label, id, options, value = '') => `<label class="dayone-field"><span>${esc(label)}</span><select id="${id}">${options.map(([v,l]) => `<option value="${escAttr(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const grid = html => `<div class="dayone-grid">${html}</div>`;

  async function refreshUI() {
    try { await A.refresh(); window.dispatchEvent(new CustomEvent('rachna:dayone-refresh')); patchUI(); } catch (e) { toast(e.message || 'Refresh failed', true); }
  }

  function inquiryForm(id) {
    const row = inquiry(id);
    if (!row) return toast('Inquiry not found.', true);
    const c = customer(row.customer_id) || {};
    modal('Edit inquiry', grid(
      input('Client name', 'd-c-name', c.name || '') +
      input('Phone', 'd-c-phone', c.phone || '') +
      input('WhatsApp', 'd-c-whatsapp', c.whatsapp || '') +
      input('Email', 'd-c-email', c.email || '', 'email') +
      input('Event / enquiry name', 'd-i-event', row.event_name || '') +
      input('Event date (BS)', 'd-i-bs', row.event_date_bs || '') +
      input('Venue', 'd-i-venue', row.venue || '') +
      input('Guest count', 'd-i-guests', row.guest_count ?? '', 'number', 'min="0"') +
      input('Budget (NPR)', 'd-i-budget', row.budget ?? '', 'number', 'min="0" step="1"') +
      select('Stage', 'd-i-status', [
        ['new','New'],['quote_pending','Quote pending'],['quote_made','Quote made'],['quote_sent','Quote sent'],
        ['interested','Interested'],['awaiting_advance','Awaiting advance'],['booked','Booked'],['not_interested','Not interested'],
        ['lost','Lost'],['booking_cancelled','Booking cancelled'],['booked_elsewhere','Booked elsewhere']
      ], row.status) +
      select('Lead source', 'd-i-source', [['Instagram','Instagram'],['Facebook','Facebook'],['WhatsApp','WhatsApp'],['TikTok','TikTok'],['Google','Google'],['Referral','Referral'],['Website','Website'],['Other','Other']], row.source || 'Other') +
      area('Notes', 'd-i-notes', row.notes || '')
    ), `<button class="cos-btn primary" data-dayone-save-inquiry="${escAttr(id)}">Save changes</button>`);
  }

  function bookingForm(id) {
    const row = project(id);
    if (!row) return toast('Booking not found.', true);
    const c = customer(row.customer_id) || {};
    const fs = functionsFor(id);
    const f = fs[0] || {};
    modal('Edit booking / event', grid(
      input('Event name', 'd-p-name', row.name || '') +
      input('Client name', 'd-p-c-name', c.name || '') +
      input('Phone', 'd-p-c-phone', c.phone || '') +
      input('WhatsApp', 'd-p-c-wa', c.whatsapp || '') +
      input('Email', 'd-p-c-email', c.email || '', 'email') +
      select('Brand', 'd-p-brand', [['Rachna','Rachna'],['Aavartan','Aavartan'],['Rachna + Aavartan','Rachna + Aavartan']], row.brand || 'Rachna + Aavartan') +
      select('Booking status', 'd-p-status', [['planning','Planning'],['booked','Booked'],['ongoing','Ongoing'],['completed','Completed'],['cancelled','Cancelled']], row.status || 'planning') +
      input('Total quoted (NPR)', 'd-p-quoted', row.quoted_total ?? 0, 'number', 'min="0" step="1"') +
      input('Event date range (BS)', 'd-p-date-bs', row.date_range_bs || '') +
      `<div class="dayone-section-label">Primary function · existing Event ID stays unchanged</div>` +
      input('Function name', 'd-f-name', f.name || '') +
      input('Function date (BS)', 'd-f-date-bs', f.event_date_bs || '') +
      input('Function date (AD)', 'd-f-date', f.event_date || '', 'date') +
      input('Start time', 'd-f-time', f.start_time || '', 'time') +
      input('Venue', 'd-f-venue', f.venue || '') +
      input('Guests', 'd-f-guests', f.guest_count ?? '', 'number', 'min="0"') +
      area('Function notes', 'd-f-notes', f.notes || '') +
      `<div class="dayone-readonly"><span>Advance received</span><b>${money(row.customer_advance)}</b><span>Vendor reserve</span><b>${money(row.vendor_reserve)}</b></div>`
    ), `<button class="cos-btn primary" data-dayone-save-booking="${escAttr(id)}">Save booking</button>`);
  }

  async function saveInquiry(id) {
    const row = inquiry(id);
    if (!row) throw new Error('Inquiry not found');
    const c = customer(row.customer_id);
    if (!c) throw new Error('Client record not found');
    const name = $('#d-c-name')?.value.trim();
    if (!name) throw new Error('Client name is required');
    await A.sb.from('customers').update({ name, phone: $('#d-c-phone').value.trim() || null, whatsapp: $('#d-c-whatsapp').value.trim() || null, email: $('#d-c-email').value.trim() || null }).eq('id', c.id).single();
    const payload = {
      event_name: $('#d-i-event').value.trim() || null,
      event_date_bs: $('#d-i-bs').value.trim() || null,
      venue: $('#d-i-venue').value.trim() || null,
      guest_count: $('#d-i-guests').value === '' ? null : Number($('#d-i-guests').value),
      budget: $('#d-i-budget').value === '' ? null : Number($('#d-i-budget').value),
      status: $('#d-i-status').value,
      source: $('#d-i-source').value || null,
      notes: $('#d-i-notes').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    const result = await A.sb.from('inquiries').update(payload).eq('id', id).select().single();
    if (result.error) throw result.error;
    closeModal(); toast('Inquiry updated.'); await refreshUI();
  }

  async function saveBooking(id) {
    const row = project(id);
    if (!row) throw new Error('Booking not found');
    const c = customer(row.customer_id);
    if (!c) throw new Error('Client record not found');
    const name = $('#d-p-c-name')?.value.trim();
    if (!name) throw new Error('Client name is required');
    const customerResult = await A.sb.from('customers').update({ name, phone: $('#d-p-c-phone').value.trim() || null, whatsapp: $('#d-p-c-wa').value.trim() || null, email: $('#d-p-c-email').value.trim() || null }).eq('id', c.id).select().single();
    if (customerResult.error) throw customerResult.error;
    const projectResult = await A.sb.from('projects').update({
      name: $('#d-p-name').value.trim() || row.name,
      brand: $('#d-p-brand').value,
      status: $('#d-p-status').value,
      quoted_total: Number($('#d-p-quoted').value || 0),
      date_range_bs: $('#d-p-date-bs').value.trim() || null
    }).eq('id', id).select().single();
    if (projectResult.error) throw projectResult.error;
    const fname = $('#d-f-name').value.trim();
    const hasFunction = functionsFor(id)[0];
    if (fname) {
      const functionPayload = {
        name: fname,
        event_date_bs: $('#d-f-date-bs').value.trim() || null,
        event_date: $('#d-f-date').value || null,
        start_time: $('#d-f-time').value || null,
        venue: $('#d-f-venue').value.trim() || null,
        guest_count: $('#d-f-guests').value === '' ? null : Number($('#d-f-guests').value),
        notes: $('#d-f-notes').value.trim() || null
      };
      if (hasFunction) {
        const result = await A.sb.from('event_functions').update(functionPayload).eq('id', hasFunction.id).select().single();
        if (result.error) throw result.error;
      } else {
        const result = await A.sb.from('event_functions').insert({ ...functionPayload, project_id: id }).select().single();
        if (result.error) throw result.error;
      }
    } else if (hasFunction) {
      const result = await A.sb.from('event_functions').update({
        event_date_bs: $('#d-f-date-bs').value.trim() || null, event_date: $('#d-f-date').value || null,
        start_time: $('#d-f-time').value || null, venue: $('#d-f-venue').value.trim() || null,
        guest_count: $('#d-f-guests').value === '' ? null : Number($('#d-f-guests').value), notes: $('#d-f-notes').value.trim() || null
      }).eq('id', hasFunction.id).select().single();
      if (result.error) throw result.error;
    }
    closeModal(); toast('Booking updated.'); await refreshUI();
  }

  async function deleteInquiry(id) {
    const row = inquiry(id);
    if (!row) throw new Error('Inquiry not found');
    const linked = state.projects.some(p => p.inquiry_id === id);
    const c = customer(row.customer_id);
    const message = linked
      ? `Delete enquiry “${row.event_name || 'Unnamed event'}”? The linked booking will stay in place, but its enquiry link will be cleared.`
      : `Delete enquiry “${row.event_name || 'Unnamed event'}” for ${c?.name || 'this client'}? This cannot be undone.`;
    if (!window.confirm(message)) return;
    const result = await A.sb.from('inquiries').delete().eq('id', id).select().maybeSingle();
    if (result.error) throw result.error;
    toast('Inquiry deleted.'); await refreshUI();
  }

  async function deleteBooking(id) {
    const row = project(id);
    if (!row) throw new Error('Booking not found');
    const linkedInquiry = row.inquiry_id ? inquiry(row.inquiry_id) : null;
    const c = customer(row.customer_id);
    const childCount = state.functions.filter(f => f.project_id === id).length + state.vendorBookings.filter(v => v.project_id === id).length + state.projectTeam.filter(t => t.project_id === id).length;
    const message = `Permanently delete booking “${row.name || 'Unnamed event'}” (${row.event_code || 'no Event ID'}) for ${c?.name || 'this client'}?\n\nThis will remove the booking and its event-linked records (${childCount} visible child records). Payments, expenses, quotations, files, vendors and crew assignments attached to this booking will be removed by the database cascade.\n\n${linkedInquiry ? 'The original enquiry will be kept and marked “Booking cancelled” so your sales history is not lost.' : 'There is no linked enquiry.'}`;
    if (!window.confirm(message)) return;
    if (linkedInquiry) {
      const statusResult = await A.sb.from('inquiries').update({ status: 'booking_cancelled', updated_at: new Date().toISOString() }).eq('id', linkedInquiry.id);
      if (statusResult.error) throw statusResult.error;
    }
    const result = await A.sb.from('projects').delete().eq('id', id).select().maybeSingle();
    if (result.error) throw result.error;
    toast('Booking deleted.'); await refreshUI();
  }

  function decorateRows() {
    // CRM: existing Convert/Open button contains the inquiry ID.
    $$('button[data-cos-convert]').forEach(button => {
      const cell = button.parentElement;
      if (!cell || cell.querySelector('[data-dayone-edit-inquiry]')) return;
      const id = button.getAttribute('data-cos-convert');
      const edit = document.createElement('button'); edit.className = 'cos-btn tiny dayone-inline-edit'; edit.textContent = 'Edit'; edit.dataset.dayoneEditInquiry = id;
      const del = document.createElement('button'); del.className = 'cos-btn tiny danger'; del.textContent = 'Delete'; del.dataset.dayoneDeleteInquiry = id;
      cell.append(edit, del);
    });
    // Events: existing Open button contains the project ID.
    $$('button[data-cos-open-event]').forEach(button => {
      const cell = button.parentElement;
      if (!cell || cell.querySelector('[data-dayone-edit-booking]')) return;
      const id = button.getAttribute('data-cos-open-event');
      const edit = document.createElement('button'); edit.className = 'cos-btn tiny dayone-inline-edit'; edit.textContent = 'Edit'; edit.dataset.dayoneEditBooking = id;
      const del = document.createElement('button'); del.className = 'cos-btn tiny danger'; del.textContent = 'Delete'; del.dataset.dayoneDeleteBooking = id;
      cell.append(edit, del);
    });
  }

  function patchTodayCard() {
    const content = $('.cos-content');
    if (!content || content.querySelector('.dayone-today-card')) return;
    const root = $('#cosRoot');
    if (!root) return;
    const activeTab = root.querySelector('.cos-nav-item.active');
    if (!activeTab || !/Command Center/i.test(activeTab.textContent || '')) return;

    const todayISO = new Date().toISOString().slice(0,10);
    const followups = state.inquiries.filter(i => ['new','quote_pending','quote_made','quote_sent','interested','awaiting_advance'].includes(i.status)).sort((a,b) => String(a.updated_at).localeCompare(String(b.updated_at)));
    const todayFns = state.functions.filter(f => f.event_date === todayISO);
    const upcoming = state.functions.filter(f => f.event_date && f.event_date >= todayISO).sort((a,b) => String(a.event_date).localeCompare(String(b.event_date))).slice(0,5);
    const booked = state.projects.filter(p => p.status === 'booked' || (Number(p.customer_advance || 0) >= Number(p.quoted_total || 0) * .3 && Number(p.quoted_total || 0) > 0));
    const card = document.createElement('section');
    card.className = 'cos-card dayone-today-card';
    card.innerHTML = `<div class="cos-card-head"><div><small>DAY ONE CONTROL</small><h2>Today at a glance</h2><p>Run sales first, then upcoming event execution. Everything still points to the same Event ID.</p></div><div class="dayone-today-actions"><button class="cos-btn primary" data-cos="new-inquiry">＋ Enquiry</button><button class="cos-btn" data-cos="new-event">＋ Booking</button></div></div><div class="dayone-today-grid"><div class="dayone-kpi"><b>${followups.length}</b><span>sales follow-ups</span></div><div class="dayone-kpi"><b>${todayFns.length}</b><span>functions today</span></div><div class="dayone-kpi"><b>${upcoming.length}</b><span>upcoming functions</span></div><div class="dayone-kpi"><b>${booked.length}</b><span>booked events</span></div></div><div class="dayone-split"><div><h3>Sales to contact</h3>${followups.slice(0,4).map(i => { const c=customer(i.customer_id); return `<div class="dayone-list-row"><div><b>${esc(c?.name || 'No client')}</b><span>${esc(i.event_name || 'Event')} · ${esc(i.event_date_bs || 'Date TBC')}</span></div><button class="cos-btn tiny" data-dayone-edit-inquiry="${escAttr(i.id)}">Edit</button></div>`; }).join('') || '<div class="cos-empty">No active sales follow-ups.</div>'}</div><div><h3>Upcoming work</h3>${upcoming.map(f => { const p=project(f.project_id); return `<div class="dayone-list-row"><div><b>${esc(f.name)}</b><span>${esc(p?.event_code || '')} · ${esc(f.event_date || 'Date TBC')} · ${esc(f.venue || 'Venue TBC')}</span></div><button class="cos-btn tiny" data-cos-open-event="${escAttr(f.project_id)}">Open</button></div>`; }).join('') || '<div class="cos-empty">No dated functions yet.</div>'}</div></div>`;
    const firstGrid = content.querySelector('.cos-grid');
    content.insertBefore(card, firstGrid || content.firstChild);
  }

  function patchUI() { setTimeout(() => { patchTodayCard(); decorateRows(); }, 0); }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-dayone-edit-inquiry],[data-dayone-delete-inquiry],[data-dayone-edit-booking],[data-dayone-delete-booking],[data-dayone-save-inquiry],[data-dayone-save-booking],[data-dayone-close]');
    if (!target) return;
    event.preventDefault();
    try {
      if (target.hasAttribute('data-dayone-close')) return closeModal();
      if (target.hasAttribute('data-dayone-edit-inquiry')) return inquiryForm(target.dataset.dayoneEditInquiry);
      if (target.hasAttribute('data-dayone-delete-inquiry')) return deleteInquiry(target.dataset.dayoneDeleteInquiry);
      if (target.hasAttribute('data-dayone-edit-booking')) return bookingForm(target.dataset.dayoneEditBooking);
      if (target.hasAttribute('data-dayone-delete-booking')) return deleteBooking(target.dataset.dayoneDeleteBooking);
      if (target.hasAttribute('data-dayone-save-inquiry')) return await saveInquiry(target.dataset.dayoneSaveInquiry);
      if (target.hasAttribute('data-dayone-save-booking')) return await saveBooking(target.dataset.dayoneSaveBooking);
    } catch (e) { console.error(e); toast(e.message || 'Could not save change.', true); }
  });

  const observer = new MutationObserver(() => patchUI());
  const boot = () => {
    const page = $('#page');
    if (page) observer.observe(page, { childList: true, subtree: true });
    patchUI();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
