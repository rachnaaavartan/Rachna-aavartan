(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }));
  const stages = [
    ['new','New enquiry'],['quote_pending','Quotation pending'],['quote_made','Quotation made'],['quote_sent','Quotation sent'],
    ['interested','Interested'],['awaiting_advance','Advance pending'],['booked','Booked'],['not_interested','Not interested'],
    ['lost','Lost'],['passed_on','Passed on'],['booked_elsewhere','Booked elsewhere'],['cancelled','Cancelled'],['booking_cancelled','Booking cancelled']
  ];
  const sources = ['Facebook','Instagram','TikTok','Google','WhatsApp','Referral','Walk-in','Website','Other'];
  const state = { search: '', source: 'all', stage: 'all' };
  const customer = id => A.state.customers.find(c => c.id === id);
  const converted = i => A.state.projects.find(p => p.inquiry_id === i.id);
  const booked = i => i.status === 'booked' || Boolean(converted(i));
  const label = v => stages.find(s => s[0] === v)?.[1] || v || '—';
  const toast = (m, error = false) => {
    const n = $('#toast'); if (!n) return;
    n.textContent = m; n.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(window.__crmToast); window.__crmToast = setTimeout(() => { n.className = 'toast'; }, 2800);
  };
  function render() {
    const all = A.state.inquiries || [];
    const rows = all.filter(i => {
      const c = customer(i.customer_id);
      const hay = [i.event_name, i.source, i.status, i.event_date_bs, i.venue, c?.name, c?.phone].join(' ').toLowerCase();
      return (!state.search || hay.includes(state.search.toLowerCase())) &&
        (state.source === 'all' || i.source === state.source) &&
        (state.stage === 'all' || i.status === state.stage);
    });
    const open = all.filter(i => !['lost','booked','cancelled','booking_cancelled','booked_elsewhere','not_interested','passed_on'].includes(i.status)).length;
    const convertedCount = all.filter(converted).length;
    const bookedCount = all.filter(booked).length;
    const budget = all.reduce((s, i) => s + Number(i.budget || 0), 0);
    const sourceMap = {};
    const stageMap = {};
    all.forEach(i => {
      sourceMap[i.source || 'Other'] = (sourceMap[i.source || 'Other'] || 0) + 1;
      stageMap[i.status || 'new'] = (stageMap[i.status || 'new'] || 0) + 1;
    });
    const html = `
      <div class="crm-wrap">
        <div class="page-head">
          <div><div class="eyebrow">CRM & SALES</div><h1>Lead & Conversion Center</h1><p>Every enquiry stays attached to the customer and becomes the same Event ID when converted.</p></div>
          <div class="actions"><button class="btn primary" data-action="new-inquiry">＋ New enquiry</button></div>
        </div>
        <div class="crm-kpis">
          <div class="crm-kpi"><span>Total enquiries</span><strong>${all.length}</strong><em>Captured leads</em></div>
          <div class="crm-kpi"><span>Open pipeline</span><strong>${open}</strong><em>Needs follow-up</em></div>
          <div class="crm-kpi"><span>Converted</span><strong>${convertedCount}</strong><em>Linked to Event ID</em></div>
          <div class="crm-kpi"><span>Booked</span><strong>${bookedCount}</strong><em>Won business</em></div>
          <div class="crm-kpi"><span>Lead budget</span><strong>${money(budget)}</strong><em>Captured budget</em></div>
        </div>
        <div class="crm-toolbar">
          <div class="crm-filters">
            <input class="search crm-search" id="crmSearch" value="${esc(state.search)}" placeholder="Search client, event, phone, source">
            <select class="search" id="crmSource"><option value="all">All sources</option>${sources.map(s => `<option value="${esc(s)}" ${state.source === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
            <select class="search" id="crmStage"><option value="all">All stages</option>${stages.map(s => `<option value="${s[0]}" ${state.stage === s[0] ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select>
          </div>
          <div class="crm-muted">Booking conversion: ${all.length ? (bookedCount / all.length * 100).toFixed(1) : '0.0'}%</div>
        </div>
        <section class="panel table-panel">
          <div class="panel-title"><div><div class="eyebrow">LEAD REGISTER</div><h2>Every enquiry</h2><p>Update the stage, edit lead details, or convert it into an Event ID.</p></div></div>
          <div style="overflow:auto"><table class="crm-table"><thead><tr><th>Client / Event</th><th>Source</th><th>Date / Venue</th><th>Budget</th><th>Stage</th><th>Event ID</th><th></th></tr></thead>
          <tbody>${rows.length ? rows.map(i => {
            const c = customer(i.customer_id), p = converted(i);
            return `<tr>
              <td><b>${esc(c?.name || 'Unknown')}</b><small>${esc(i.event_name || 'Event')} · ${esc(c?.phone || '')}</small></td>
              <td>${esc(i.source || 'Other')}</td>
              <td>${esc(i.event_date_bs || 'Date TBC')}<small>${esc(i.venue || 'Venue TBC')}</small></td>
              <td>${i.budget ? money(i.budget) : '—'}</td>
              <td><select data-crm-stage="${esc(i.id)}">${stages.map(s => `<option value="${s[0]}" ${s[0] === i.status ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select></td>
              <td>${p ? `<b>${esc(p.event_code || 'Event')}</b>` : '<span class="crm-muted">Not converted</span>'}</td>
              <td><button class="btn tiny" data-crm-open="${esc(i.id)}">Open</button>${p ? '' : ` <button class="btn tiny" data-crm-convert="${esc(i.id)}">Convert</button>`}</td>
            </tr>`;
          }).join('') : '<tr><td colspan="7"><div class="crm-empty">No enquiries match these filters.</div></td></tr>'}</tbody></table></div>
        </section>
        <div class="crm-cards">
          <section class="crm-card"><h3>Lead sources</h3><p>Where enquiries are coming from.</p><div class="crm-list">${Object.entries(sourceMap).sort((a,b) => b[1]-a[1]).map(([s,n]) => `<div class="crm-line"><span>${esc(s)}</span><b>${n}</b></div>`).join('') || '<div class="crm-empty">No source data yet.</div>'}</div></section>
          <section class="crm-card"><h3>Pipeline stages</h3><p>Where leads are sitting now.</p><div class="crm-list">${Object.entries(stageMap).sort((a,b) => b[1]-a[1]).map(([s,n]) => `<div class="crm-line"><span>${esc(label(s))}</span><b>${n}</b></div>`).join('') || '<div class="crm-empty">No stage data yet.</div>'}</div></section>
        </div>
      </div>`;
    $('#page').innerHTML = html;
  }
  function openLead(id) {
    const i = A.state.inquiries.find(x => x.id === id); if (!i) return;
    const c = customer(i.customer_id), p = converted(i);
    const body = `<div class="form-grid">
      <label class="field"><span>Client</span><input value="${esc(c?.name || '')}" disabled></label>
      <label class="field"><span>Phone</span><input value="${esc(c?.phone || '')}" disabled></label>
      <label class="field"><span>Event</span><input id="crmEvent" value="${esc(i.event_name || '')}"></label>
      <label class="field"><span>Source</span><select id="crmSourceEdit">${sources.map(s => `<option value="${esc(s)}" ${s === (i.source || 'Other') ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <label class="field"><span>Status</span><select id="crmStatusEdit">${stages.map(s => `<option value="${s[0]}" ${s[0] === i.status ? 'selected' : ''}>${esc(s[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Budget</span><input id="crmBudget" type="number" min="0" value="${Number(i.budget || 0)}"></label>
      <label class="field full"><span>Notes</span><textarea id="crmNotes">${esc(i.notes || '')}</textarea></label>
    </div><div class="notice">${p ? `Converted to <b>${esc(p.event_code || 'Event')}</b>.` : 'Not converted yet. Convert this lead to create its Event ID.'}</div>`;
    const m = $('#modal'); if (!m) return;
    m.innerHTML = `<div class="modal-head"><div><div class="eyebrow">CRM & SALES</div><h2>Lead detail</h2></div><button class="close-btn" data-crm-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-crm-action="close">Cancel</button>${p ? '' : `<button class="btn soft" data-crm-action="convert" data-id="${esc(id)}">Convert to Event ID</button>`}<button class="btn primary" data-crm-action="save" data-id="${esc(id)}">Save changes</button></div>`;
    $('#backdrop')?.classList.add('show');
  }
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-crm-open]');
    if (open) { e.preventDefault(); openLead(open.dataset.crmOpen); return; }
    const convert = e.target.closest('[data-crm-convert]');
    if (convert) {
      e.preventDefault();
      (async () => { try { const p = await A.convertInquiry(convert.dataset.crmConvert); toast(`Converted · ${p.event_code || 'Event ID created'}`); render(); } catch (err) { toast(err?.message || 'Could not convert lead', true); } })();
      return;
    }
    const action = e.target.closest('[data-crm-action]');
    if (!action) return;
    e.preventDefault();
    if (action.dataset.crmAction === 'close') { $('#backdrop')?.classList.remove('show'); return; }
    if (action.dataset.crmAction === 'save') {
      (async () => { try {
        await A.updateInquiry(action.dataset.id, { event_name: $('#crmEvent').value.trim(), source: $('#crmSourceEdit').value, status: $('#crmStatusEdit').value, budget: Number($('#crmBudget').value || 0), notes: $('#crmNotes').value || null, updated_at: new Date().toISOString() });
        $('#backdrop')?.classList.remove('show'); toast('Lead updated'); render();
      } catch (err) { toast(err?.message || 'Could not update lead', true); } })();
    }
    if (action.dataset.crmAction === 'convert') {
      (async () => { try { const p = await A.convertInquiry(action.dataset.id); $('#backdrop')?.classList.remove('show'); toast(`Converted · ${p.event_code || 'Event ID created'}`); render(); } catch (err) { toast(err?.message || 'Could not convert lead', true); } })();
    }
  }, true);
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-crm-stage]');
    if (s) { (async () => { try { await A.updateInquiry(s.dataset.crmStage, { status: s.value, updated_at: new Date().toISOString() }); toast('Stage updated'); render(); } catch (err) { toast(err?.message || 'Could not update stage', true); } })(); return; }
    if (e.target.id === 'crmSource') { state.source = e.target.value; render(); }
    if (e.target.id === 'crmStage') { state.stage = e.target.value; render(); }
  }, true);
  document.addEventListener('input', e => { if (e.target.id === 'crmSearch') { state.search = e.target.value; render(); } }, true);
  document.addEventListener('click', e => {
    const route = e.target.closest('[data-route="inquiries"]');
    if (route) { e.preventDefault(); render(); }
  }, true);
  const nav = $('#nav');
  const inject = () => { const n = $('#nav'); if (n && !n.querySelector('[data-route="inquiries"]')) { const g = document.createElement('div'); g.className = 'nav-group'; g.innerHTML = '<div class="nav-label">Sales</div><button class="nav-item" data-route="inquiries"><span class="nav-ico">✉</span><span>CRM & Conversion</span></button>'; n.prepend(g); } };
  if (nav) new MutationObserver(inject).observe(nav, { childList: true, subtree: true });
  window.RachnaCRM = { render };
})();
