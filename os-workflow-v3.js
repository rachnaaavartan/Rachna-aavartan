(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || window.__RACHNA_WORKFLOW_V3__) return;
  window.__RACHNA_WORKFLOW_V3__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => `NPR ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
  const BS_MONTHS = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashoj','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
  const BS_DAYS = [31,32,31,32,31,30,30,30,30,30,30,30];
  const BS_YEARS = Array.from({ length: 16 }, (_, i) => 2078 + i);
  const PAYMENT_METHODS = ['Cash','Bank Transfer','eSewa','Khalti','Cheque','Other'];
  const CREW_ROLES = ['Event Manager','Photographer','Videographer','Cinematographer','Editor','Assistant','Drone Operator','Driver','Decorator','Coordinator','Other'];
  const VENDOR_CATEGORIES = ['Decoration','Florist','Catering','Venue','Sound & Light','Furniture','Transport','Makeup','Mehendi','Entertainment','Printing','Other'];
  const TASKS = ['Confirm venue','Confirm client timeline','Confirm vendor jobs','Confirm crew assignments','Prepare event-day run sheet','Confirm final client balance','Post-event delivery follow-up'];
  const toast = (message, error = false) => { const n = $('#toast'); if (!n) return; n.textContent = message; n.className = 'toast show' + (error ? ' error' : ''); clearTimeout(window.__workflowToast); window.__workflowToast = setTimeout(() => n.className = 'toast', 2800); };

  function setLocal(table, id, patch) {
    const map = {
      projects:'projects', inquiries:'inquiries', quotations:'quotations', payments:'payments',
      documents:'documents', event_functions:'functions', project_team:'projectTeam', vendor_bookings:'vendorBookings'
    };
    const key = map[table];
    if (!key || !Array.isArray(A.state[key])) return;
    const idx = A.state[key].findIndex(x => x.id === id);
    if (idx >= 0) A.state[key][idx] = { ...A.state[key][idx], ...patch };
  }

  async function selectOne(table, id, columns='*') {
    const { data, error } = await A.sb.from(table).select(columns).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function nextDocumentNumber(type) {
    const prefix = type === 'quotation' ? 'QUO' : type === 'invoice' ? 'INV' : 'RCT';
    const year = new Date().getFullYear();
    const { data, error } = await A.sb.from('documents').select('document_number').eq('document_type', type).like('document_number', `${prefix}-${year}-%`).order('document_number', { ascending: false }).limit(1);
    if (error) throw error;
    const last = data?.[0]?.document_number || '';
    const seq = Number.parseInt(last.split('-').pop() || '0', 10) + 1;
    return `${prefix}-${year}-${String(Number.isFinite(seq) ? seq : 1).padStart(4, '0')}`;
  }

  async function latestQuotation(projectId) {
    const { data, error } = await A.sb.from('quotations').select('*').eq('project_id', projectId).order('version', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function quoteAmount(quotationId) {
    const q = await selectOne('quotations', quotationId, '*');
    const { data, error } = await A.sb.from('quotation_items').select('quantity,customer_price').eq('quotation_id', quotationId);
    if (error) throw error;
    const itemsTotal = (data || []).reduce((sum, x) => sum + Number(x.customer_price || 0) * Number(x.quantity || 1), 0);
    return { quote: q, total: Number(q?.customer_total || 0) || itemsTotal };
  }

  async function ensureDocument(type, projectId, quotationId = null, paymentId = null, amount = 0, notes = null) {
    let existingQuery = A.sb.from('documents').select('*').eq('project_id', projectId).eq('document_type', type);
    if (quotationId) existingQuery = existingQuery.eq('quotation_id', quotationId);
    if (paymentId) existingQuery = existingQuery.eq('payment_id', paymentId);
    const { data: existing, error: existingError } = await existingQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return existing;
    const number = await nextDocumentNumber(type);
    const { data, error } = await A.sb.from('documents').insert({
      organization_id: A.state.profile?.organization_id,
      project_id: projectId,
      quotation_id: quotationId,
      payment_id: paymentId,
      document_type: type,
      document_number: number,
      issue_date: new Date().toISOString().slice(0, 10),
      amount: Number(amount || 0),
      status: 'issued',
      notes
    }).select().single();
    if (error) throw error;
    A.state.documents = A.state.documents || [];
    A.state.documents.unshift(data);
    return data;
  }

  async function ensureBookingTasks(projectId) {
    const { data: existing, error } = await A.sb.from('event_operations_tasks').select('title').eq('project_id', projectId);
    if (error) throw error;
    const existingTitles = new Set((existing || []).map(x => x.title));
    const rows = TASKS.filter(title => !existingTitles.has(title)).map(title => ({ project_id: projectId, title, status: 'todo', priority: title.includes('final') ? 'high' : 'normal', notes: 'Auto-created from booking workflow.' }));
    if (!rows.length) return;
    const { data, error: insertError } = await A.sb.from('event_operations_tasks').insert(rows).select();
    if (insertError) throw insertError;
    A.state.eventOperationsTasks = A.state.eventOperationsTasks || [];
    A.state.eventOperationsTasks.push(...(data || []));
  }

  async function setInquiryStageForProject(projectId, status) {
    const p = (A.state.projects || []).find(x => x.id === projectId) || await selectOne('projects', projectId, 'id,inquiry_id');
    if (!p?.inquiry_id) return;
    const inquiry = (A.state.inquiries || []).find(x => x.id === p.inquiry_id) || await selectOne('inquiries', p.inquiry_id, '*');
    if (!inquiry || inquiry.status === status) return;
    const { data, error } = await A.sb.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', inquiry.id).select().single();
    if (error) throw error;
    setLocal('inquiries', inquiry.id, data);
  }

  const baseUpdateQuotation = A.updateQuotation.bind(A);
  A.updateQuotation = async function(id, row, projectId) {
    const qBefore = await selectOne('quotations', id, '*');
    const result = await baseUpdateQuotation(id, row, projectId);
    const project = projectId ? ((A.state.projects || []).find(p => p.id === projectId) || await selectOne('projects', projectId, '*')) : (qBefore?.project_id ? ((A.state.projects || []).find(p => p.id === qBefore.project_id) || await selectOne('projects', qBefore.project_id, '*')) : null);
    const newStatus = row?.status;
    if (project && newStatus === 'sent') {
      try {
        const totals = await quoteAmount(id);
        await ensureDocument('quotation', project.id, id, null, totals.total, 'Quotation issued from the Event ID sales workflow.');
        await setInquiryStageForProject(project.id, 'quote_sent');
      } catch (e) { toast(`Quotation updated, but document link failed: ${e.message || e}`, true); }
    }
    if (project && newStatus === 'accepted') {
      try {
        const totals = await quoteAmount(id);
        await ensureDocument('invoice', project.id, id, null, totals.total, 'Invoice generated from the accepted quotation.');
        await setInquiryStageForProject(project.id, 'awaiting_advance');
      } catch (e) { toast(`Quotation accepted, but invoice link failed: ${e.message || e}`, true); }
    }
    return result;
  };

  const baseRecordAdvance = A.recordAdvance.bind(A);
  A.recordAdvance = async function(projectId, amount, method, reference) {
    const result = await baseRecordAdvance(projectId, amount, method, reference);
    try {
      const { data: payments, error } = await A.sb.from('payments').select('*').eq('project_id', projectId).eq('direction', 'in').order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      const payment = payments?.[0];
      if (payment) await ensureDocument('receipt', projectId, null, payment.id, Number(payment.amount || amount), 'Customer advance receipt linked to the Event ID.');
      if (result?.booked) {
        setLocal('projects', projectId, { status: 'planning', customer_advance: result.received });
        await setInquiryStageForProject(projectId, 'booked');
        await ensureBookingTasks(projectId);
      } else {
        await setInquiryStageForProject(projectId, 'awaiting_advance');
      }
    } catch (e) { toast(`Advance recorded, but workflow sync failed: ${e.message || e}`, true); }
    return result;
  };

  function optionHtml(values, current = '') { return values.map(v => `<option value="${esc(v)}" ${String(v) === String(current) ? 'selected' : ''}>${esc(v)}</option>`).join(''); }
  function convertInputToSelect(id, values) {
    const input = document.getElementById(id);
    if (!input || input.tagName === 'SELECT') return;
    const select = document.createElement('select');
    select.id = input.id;
    select.className = input.className || 'search';
    select.innerHTML = optionHtml(['', ...values], input.value || '');
    input.replaceWith(select);
  }

  function mountBSDate(id, labelText = 'BS Date') {
    const input = document.getElementById(id);
    if (!input || input.dataset.bsMounted === '1') return;
    input.dataset.bsMounted = '1';
    const raw = String(input.value || '').trim();
    const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const year = m ? Number(m[1]) : '';
    const month = m ? Number(m[2]) : '';
    const day = m ? Number(m[3]) : '';
    const wrap = document.createElement('div');
    wrap.className = 'bs-date-field';
    const title = document.createElement('span'); title.textContent = labelText; title.className = 'bs-date-label';
    const row = document.createElement('div'); row.className = 'bs-date-row';
    const y = document.createElement('select'); y.className = 'bs-year'; y.innerHTML = '<option value="">Year</option>' + optionHtml(BS_YEARS, year);
    const mo = document.createElement('select'); mo.className = 'bs-month'; mo.innerHTML = '<option value="">Month</option>' + BS_MONTHS.map((name, i) => `<option value="${i + 1}" ${i + 1 === month ? 'selected' : ''}>${i + 1} · ${esc(name)}</option>`).join('');
    const d = document.createElement('select'); d.className = 'bs-day';
    const rebuildDays = (selected = day) => { const max = BS_DAYS[Math.max(0, Number(mo.value || 1) - 1)] || 30; d.innerHTML = '<option value="">Day</option>' + Array.from({length:max},(_,i)=>i+1).map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join(''); };
    rebuildDays(day);
    const sync = () => { input.value = (y.value && mo.value && d.value) ? `${y.value}-${String(mo.value).padStart(2,'0')}-${String(d.value).padStart(2,'0')}` : ''; input.dispatchEvent(new Event('input', { bubbles:true })); input.dispatchEvent(new Event('change', { bubbles:true })); };
    y.addEventListener('change', sync); mo.addEventListener('change', () => { rebuildDays(); sync(); }); d.addEventListener('change', sync);
    row.append(y, mo, d); wrap.append(title, row);
    input.style.display = 'none';
    input.parentElement?.appendChild(wrap);
  }

  function enhanceModalFields() {
    mountBSDate('inqDate', 'Event date · BS');
    mountBSDate('pDate', 'Event date / date range · BS');
    mountBSDate('fnBS', 'Function date · BS');
    convertInputToSelect('tRole', CREW_ROLES);
    convertInputToSelect('vjCategory', VENDOR_CATEGORIES);
    convertInputToSelect('tActive', ['true','false']);
  }

  function workflowBar() {
    const page = $('#page');
    if (!page || !A.state.user) return;
    const eventHead = $('.event-head', page);
    if (!eventHead || $('.workflow-v3', page)) return;
    const text = eventHead.querySelector('h1')?.textContent?.trim() || '';
    const p = (A.state.projects || []).find(x => String(x.event_code || '') === text);
    if (!p) return;
    const inquiry = (A.state.inquiries || []).find(i => i.id === p.inquiry_id);
    const q = (A.state.quotations || []).filter(x => x.project_id === p.id).sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    const steps = [
      ['CRM', inquiry?.status || 'new', 'inquiries'],
      ['Quotation', q?.status || 'draft', 'quotation'],
      ['Booking', p.status === 'planning' && Number(p.customer_advance || 0) > 0 ? 'booked' : 'awaiting_advance', 'bookings'],
      ['Documents', '', 'documents'],
      ['Operations', '', 'operations']
    ];
    const bar = document.createElement('section');
    bar.className = 'workflow-v3';
    bar.innerHTML = `<div class="workflow-v3-head"><div><span>EVENT WORKFLOW</span><strong>${esc(p.event_code || p.name)}</strong></div><small>One Event ID · one connected trail</small></div><div class="workflow-v3-steps">${steps.map((s,i)=>`<button class="workflow-step" data-workflow-go="${esc(s[2])}"><b>${i+1}</b><span>${esc(s[0])}</span><em>${esc(s[1] || 'Open')}</em></button>`).join('<i>→</i>')}</div>`;
    eventHead.after(bar);
  }

  function go(kind) {
    const route = kind === 'CRM' || kind === 'inquiries' ? '[data-route="inquiries"]' : kind === 'bookings' ? '[data-route="bookings"]' : kind === 'documents' ? '[data-route="documents"]' : null;
    if (route) { $(route)?.click(); return; }
    if (kind === 'quotation') { $('.tabs [data-project-tab="quotation"]')?.click(); return; }
    if (kind === 'operations') { $('.tabs [data-project-tab="overview"]')?.click(); toast('Operations remain inside the Event ID workspace.'); return; }
  }

  document.addEventListener('click', e => {
    const goBtn = e.target.closest('[data-workflow-go]');
    if (goBtn) { e.preventDefault(); go(goBtn.dataset.workflowGo); }
  }, true);

  const observer = new MutationObserver(() => { enhanceModalFields(); workflowBar(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { enhanceModalFields(); workflowBar(); }, 50);

  A.standardizeBSDate = mountBSDate;
})();
