(() => {
  'use strict';

  const A = window.RachnaAPI;
  if (!A) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = A.esc;
  const money = A.money;

  const ui = { page: 'home', project: null, tab: 'overview', query: '' };

  const NAV = [
    ['home', 'Home'],
    ['inquiries', 'Inquiries'],
    ['projects', 'Projects'],
    ['calendar', 'Calendar'],
    ['money', 'Money'],
    ['settings', 'Settings']
  ];

  const STATUS = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified', quote_sent: 'Quote sent',
    negotiation: 'Negotiation', awaiting_advance: 'Awaiting advance', lost: 'Lost',
    planning: 'Planning', in_progress: 'In progress', completed: 'Completed', booked: 'Booked',
    draft: 'Draft', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected',
    paid: 'Paid', reserved: 'Reserved', pending: 'Pending', delivered: 'Delivered',
    in: 'Received', out: 'Paid out'
  };

  const AAVARTAN_PACKAGES = [
    ['Essential Package', '1 photographer + 1 videographer · 300+ edited photos · full video · highlight · Drive + Pendrive'],
    ['Signature Package', '2 photographers + 2 videographers · 600+ edited photos · candid · album · full video + highlight'],
    ['Legacy Package', '3 photographers + 2 cinematographers · 1000+ photos · cinematic coverage · drone · premium album'],
    ['2-Day Story', 'Multi-day coverage built around a 2-day event timeline'],
    ['3-Day Story', 'Multi-day coverage built around a 3-day event timeline'],
    ['Multi-day / Custom', 'Custom dates, functions, coverage team and deliverables']
  ];

  const AAVARTAN_ADDONS = [
    'Candid coverage',
    'Cinematic coverage',
    'Drone',
    'Premium Karizma album',
    'Social media reels',
    'Additional photographer',
    'Additional videographer',
    'Pre-wedding',
    'Post-wedding',
    'Additional album',
    'Photo frame'
  ];

  const RACHNA = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'rachna' && s.active !== false);
  const AAVARTAN = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'aavartan' && s.active !== false);

  const toast = (message, error = false) => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => node.className = 'toast', 2800);
  };

  const closeModal = () => $('#backdrop')?.classList.remove('show');

  const modal = (title, body, actions = '') => {
    const node = $('#modal');
    if (!node) return;
    node.innerHTML = `
      <div class="modal-head">
        <div><div class="eyebrow">RACHNA OS</div><h2>${esc(title)}</h2></div>
        <button class="close-btn" id="modalClose" type="button">×</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button class="btn" id="modalCancel" type="button">Cancel</button>
        ${actions}
      </div>`;
    $('#backdrop').classList.add('show');
    $('#modalClose').onclick = closeModal;
    $('#modalCancel').onclick = closeModal;
  };

  const field = (label, id, type = 'text', value = '', extra = '') => `
    <label class="field"><span>${esc(label)}</span><input id="${esc(id)}" type="${esc(type)}" value="${esc(value ?? '')}" ${extra}></label>`;

  const textarea = (label, id, value = '') => `
    <label class="field full"><span>${esc(label)}</span><textarea id="${esc(id)}">${esc(value ?? '')}</textarea></label>`;

  const select = (label, id, options, value = '') => `
    <label class="field"><span>${esc(label)}</span><select id="${esc(id)}">
      ${options.map(option => {
        const v = Array.isArray(option) ? option[0] : option;
        const l = Array.isArray(option) ? option[1] : option;
        return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
      }).join('')}
    </select></label>`;

  const dateField = (label, id, value = '') => {
    const months = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
    let parts = { year: 2083, month: 1, date: 1 };
    try {
      if (value) {
        const [year, month, date] = value.split('-').map(Number);
        parts = { year, month, date };
      } else if (window.DateConverter) {
        parts = new DateConverter(new Date().toISOString().slice(0, 10)).toBs();
      }
    } catch (_) {}
    const years = Array.from({ length: 25 }, (_, i) => 2075 + i);
    const days = Array.from({ length: 32 }, (_, i) => i + 1);
    return `<div class="field full">
      <span>${esc(label)} · Bikram Sambat</span>
      <div class="date-grid">
        <select id="${esc(id)}Y">${years.map(y => `<option value="${y}" ${y === parts.year ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <select id="${esc(id)}M">${months.map((m, i) => `<option value="${i + 1}" ${i + 1 === parts.month ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <select id="${esc(id)}D">${days.map(d => `<option value="${d}" ${d === parts.date ? 'selected' : ''}>${d}</option>`).join('')}</select>
      </div>
      <input id="${esc(id)}BS" type="hidden" value="${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.date).padStart(2, '0')}">
      <small id="${esc(id)}AD" class="date-preview"></small>
    </div>`;
  };

  const syncDate = id => {
    const y = Number($(`#${id}Y`)?.value);
    const m = Number($(`#${id}M`)?.value);
    const limits = [31,32,31,32,31,30,30,30,29,30,29,30];
    const d = Math.min(Number($(`#${id}D`)?.value), limits[m - 1] || 30);
    const bs = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    $(`#${id}BS`).value = bs;
    try {
      const ad = new DateConverter(bs).toAd();
      $(`#${id}AD`).textContent = `AD ${String(ad.date).padStart(2, '0')} ${ad.month} ${ad.year}`;
    } catch (_) {
      $(`#${id}AD`).textContent = '';
    }
  };

  const statusTag = value => `<span class="tag">${esc(STATUS[value] || value || '—')}</span>`;
  const empty = (title, note = 'Nothing here yet.') => `<div class="empty"><b>${esc(title)}</b><span>${esc(note)}</span></div>`;
  const metric = (name, value, note) => `<div class="metric"><span>${esc(name)}</span><strong>${value}</strong><small>${esc(note)}</small></div>`;

  const table = (headers, rows) => `<div class="panel table-panel"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}">${empty('No records')}</td></tr>`}</tbody></table></div>`;

  const head = (eyebrow, title, sub, actions = '') => `<div class="head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="actions">${actions}</div></div>`;

  const renderShell = () => {
    $('#nav').innerHTML = NAV.map(([key, label]) => `<button class="nav-item ${ui.page === key && !ui.project ? 'active' : ''}" data-route="${key}" type="button"><i></i>${label}</button>`).join('');
    $('#crumb').textContent = ui.project ? 'Project' : (NAV.find(x => x[0] === ui.page)?.[1] || 'Home');
    const user = A.state.user;
    $('#userName').textContent = user ? (A.state.profile?.full_name || user.email?.split('@')[0] || 'Owner') : 'Offline';
    $('#userRole').textContent = user ? (A.state.profile?.role || 'Workspace') : 'Sign in';
  };

  const projectStatus = p => Number(p.customer_advance || 0) >= Number(p.quoted_total || 0) * 0.3 && Number(p.quoted_total || 0) > 0;

  const render = () => {
    renderShell();
    const page = ui.project ? projectPage() : ({ home: homePage, inquiries: inquiriesPage, projects: projectsPage, calendar: calendarPage, money: moneyPage, settings: settingsPage }[ui.page] || homePage)();
    $('#page').innerHTML = page;
  };

  const openProject = id => { ui.project = id; ui.tab = 'overview'; render(); };
  const route = page => { ui.page = page; ui.project = null; ui.tab = 'overview'; render(); };

  const homePage = () => {
    const s = A.state;
    const open = s.inquiries.filter(i => !['lost', 'booked'].includes(i.status)).length;
    const booked = s.projects.filter(p => p.status === 'booked').length;
    const cash = s.payments.filter(p => p.direction === 'in').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const next = s.functions.filter(f => f.event_date).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5);
    return head('Rachna + Aavartan', 'Command center', 'One calm workspace from inquiry to event day.', '<button class="btn" data-action="new-inquiry">New inquiry</button><button class="btn primary" data-action="new-project">New project</button>') +
      `<div class="metrics">${metric('Open inquiries', open, 'Sales pipeline')}${metric('Booked projects', booked, '30% advance gate')}${metric('Cash received', money(cash), 'Actual receipts')}${metric('Upcoming functions', next.length, 'Scheduled')}</div>
      <div class="grid2">
        <section class="panel"><div class="panel-head"><div><div class="eyebrow">NEXT ON THE CALENDAR</div><h2>Upcoming functions</h2></div><button class="link" data-route="calendar">Calendar</button></div>${next.map(f => { const p = s.projects.find(x => x.id === f.project_id); return `<div class="agenda"><div class="agenda-date"><b>${esc(f.event_date_bs || '—')}</b><small>${esc(f.event_date || '')}</small></div><div><strong>${esc(f.name)}</strong><span>${esc(p?.name || 'Project')} · ${esc(f.venue || 'Venue TBC')}</span></div></div>`; }).join('') || empty('No scheduled functions')}</section>
        <section class="panel dark"><div class="eyebrow">WORKFLOW</div><h2>Every project has its own scope.</h2><div class="workflow"><span>Inquiry</span><i>→</i><span>Project</span><i>→</i><span>Functions</span><i>→</i><span>Services</span><i>→</i><span>Quote</span><i>→</i><span>Advance</span></div><p>Rachna services and Aavartan photo + video are independent. Select only what this client actually needs.</p></section>
      </div>`;
  };

  const inquiriesPage = () => head('Sales', 'Inquiries', 'Track leads and convert serious inquiries into projects.', '<button class="btn primary" data-action="new-inquiry">New inquiry</button>') + table(['Event', 'Customer', 'Venue', 'Stage', ''], A.state.inquiries.map(i => {
    const c = A.state.customers.find(x => x.id === i.customer_id);
    return `<tr><td><strong>${esc(i.event_name || 'Untitled')}</strong><small>${esc(i.event_date_bs || 'Date TBC')}</small></td><td>${esc(c?.name || '—')}<small>${esc(c?.phone || '')}</small></td><td>${esc(i.venue || 'Venue TBC')}</td><td>${statusTag(i.status)}</td><td><button class="btn" data-action="convert-inquiry" data-id="${i.id}">Open</button></td></tr>`;
  }));

  const projectsPage = () => head('Production', 'Projects', 'One master project per wedding or event.', '<input class="search" id="projectSearch" value="' + esc(ui.query) + '" placeholder="Search projects"><button class="btn primary" data-action="new-project">New project</button>') + table(['Project', 'Customer', 'Status', 'Quoted', 'Advance', ''], A.state.projects.filter(p => !ui.query || String(p.name || '').toLowerCase().includes(ui.query.toLowerCase())).map(p => {
    const c = A.state.customers.find(x => x.id === p.customer_id);
    return `<tr><td><strong>${esc(p.name)}</strong><small>${esc(p.date_range_bs || '')}</small></td><td>${esc(c?.name || '—')}</td><td>${statusTag(p.status)}</td><td>${money(p.quoted_total)}</td><td>${money(p.customer_advance)}</td><td><button class="btn" data-action="open-project" data-id="${p.id}">Open</button></td></tr>`;
  }));

  const calendarPage = () => head('Planning', 'Calendar', 'BS first, AD alongside it.', '<button class="btn primary" data-action="quick-function">Add function</button>') +
    `<div>${A.state.functions.filter(f => f.event_date).sort((a, b) => a.event_date.localeCompare(b.event_date)).map(f => { const p = A.state.projects.find(x => x.id === f.project_id); return `<div class="panel agenda-card"><div class="agenda-date big"><b>${esc(f.event_date_bs || '—')}</b><small>${esc(f.event_date || '')}</small></div><div><div class="eyebrow">${esc(p?.name || 'Project')}</div><h3>${esc(f.name)}</h3><p>${esc(f.venue || 'Venue TBC')} · ${esc(f.guest_count || 0)} guests</p></div><button class="btn" data-action="open-project" data-id="${f.project_id}">Open</button></div>`; }).join('') || empty('No scheduled functions')}</div>`;

  const moneyPage = () => {
    const inTotal = A.state.payments.filter(p => p.direction === 'in').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outTotal = A.state.payments.filter(p => p.direction === 'out').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return head('Finance', 'Money', 'Customer receipts and outgoing payments.', '<button class="btn primary" data-action="record-payment">Record payment</button>') +
      `<div class="metrics">${metric('Cash in', money(inTotal), 'Received')}${metric('Cash out', money(outTotal), 'Paid out')}${metric('Net cash', money(inTotal - outTotal), 'Recorded')}</div>` +
      table(['Date', 'Project', 'Direction', 'Amount', 'Method'], A.state.payments.slice(0, 60).map(p => `<tr><td>${esc(p.payment_date || '—')}</td><td>${esc(A.state.projects.find(x => x.id === p.project_id)?.name || '—')}</td><td>${statusTag(p.direction)}</td><td>${money(p.amount)}</td><td>${esc(p.method || '—')}</td></tr>`));
  };

  const settingsPage = () => head('Workspace', 'Settings', 'Master catalogs and operating rules.', '<button class="btn" data-action="account">Account</button>') +
    `<div class="settings-grid">
      <section class="panel"><div class="eyebrow">RACHNA</div><h2>Event management services</h2><p>Independent services. Select only the services the project needs.</p>${RACHNA().map(s => `<div class="catalog-row"><div><strong>${esc(s.name)}</strong><small>${esc(s.category || 'Event management')}</small></div><span>${s.base_price ? money(s.base_price) : 'Quote'}</span></div>`).join('')}</section>
      <section class="panel"><div class="eyebrow">AAVARTAN</div><h2>Photo + Video</h2><p>One combined core service. Package determines the customer price.</p>${AAVARTAN_PACKAGES.map(([name]) => `<div class="catalog-row"><div><strong>${esc(name)}</strong><small>Package</small></div><span>Quote</span></div>`).join('')}<hr>${AAVARTAN_ADDONS.map(name => `<div class="catalog-row"><div><strong>${esc(name)}</strong><small>Optional add-on</small></div></div>`).join('')}</section>
    </div>`;

  const projectPage = () => {
    const p = A.state.projects.find(x => x.id === ui.project);
    if (!p) return projectsPage();
    const customer = A.state.customers.find(x => x.id === p.customer_id);
    const tabs = [['overview', 'Overview'], ['functions', 'Functions'], ['services', 'Services'], ['quote', 'Quotation'], ['operations', 'Operations'], ['money', 'Money'], ['delivery', 'Delivery']];
    let body = overviewView(p, customer);
    if (ui.tab === 'functions') body = functionsView(p);
    if (ui.tab === 'services') body = servicesView(p);
    if (ui.tab === 'quote') body = quoteView(p);
    if (ui.tab === 'operations') body = operationsView(p);
    if (ui.tab === 'money') body = projectMoneyView(p);
    if (ui.tab === 'delivery') body = deliveryView(p);
    return head('Project', p.name, `${customer?.name || 'Customer'} · ${p.date_range_bs || 'Dates TBC'}`, `<button class="btn" data-route="projects">Back</button><button class="btn primary" data-action="advance" data-id="${p.id}">30% advance</button>`) +
      `<div class="project-bar"><div><span>Customer</span><strong>${esc(customer?.name || '—')}</strong></div><div><span>Quoted</span><strong>${money(p.quoted_total)}</strong></div><div><span>Advance</span><strong>${money(p.customer_advance)}</strong></div><div><span>Due</span><strong>${money(Math.max(0, Number(p.quoted_total || 0) - Number(p.customer_advance || 0)))}</strong></div></div>
      <div class="tabs">${tabs.map(([key, label]) => `<button class="${ui.tab === key ? 'active' : ''}" data-tab="${key}" type="button">${label}</button>`).join('')}</div>${body}`;
  };

  const overviewView = (p, c) => {
    const functions = A.state.functions.filter(f => f.project_id === p.id);
    const services = A.state.projectServices.filter(s => s.project_id === p.id);
    const quote = A.state.quotations.filter(q => q.project_id === p.id && q.status !== 'rejected').sort((a,b) => Number(b.version) - Number(a.version))[0];
    return `<div class="metrics">${metric('Functions', functions.length, 'Event dates')}${metric('Services', services.length, 'Selected scope')}${metric('Latest quote', quote ? money(quote.customer_total) : 'Not created', 'Current version')}${metric('Booking', projectStatus(p) ? 'Confirmed' : 'Awaiting advance', '30% gate')}</div>
      <div class="grid2"><section class="panel"><div class="eyebrow">CUSTOMER</div><h2>${esc(c?.name || '—')}</h2><p>${esc(c?.phone || '')} · ${esc(c?.email || '')}</p><p>${esc(p.brand || 'Project')}</p></section><section class="panel dark"><div class="eyebrow">EVENT</div><h2>${esc(p.name)}</h2><p>${esc(p.date_range_bs || 'Dates TBC')}</p><p>Use Functions for Mehendi, Haldi, Engagement, Wedding, Reception or any custom day.</p></section></div>`;
  };

  const functionsView = p => {
    const rows = A.state.functions.filter(f => f.project_id === p.id);
    return `<div class="sub-head"><div><h2>Functions</h2><p>Add every event date separately.</p></div><button class="btn primary" data-action="new-function" data-id="${p.id}">Add function</button></div><div class="cards3">${rows.map(f => `<article class="mini"><div class="eyebrow">FUNCTION</div><h3>${esc(f.name)}</h3><small>${esc(f.event_date_bs || 'Date TBC')}</small><small>${esc(f.event_date || '')}</small><small>${esc(f.venue || 'Venue TBC')} · ${esc(f.guest_count || 0)} guests</small><div class="mini-actions"><button class="btn" data-action="edit-function" data-id="${f.id}">Edit</button><button class="btn danger" data-action="delete" data-table="event_functions" data-id="${f.id}">Delete</button></div></article>`).join('') || empty('No functions yet', 'Add Mehendi, Haldi, Engagement, Wedding, Reception or a custom function.')}</div>`;
  };

  const servicesView = p => {
    const rows = A.state.projectServices.filter(s => s.project_id === p.id);
    return `<div class="sub-head"><div><h2>Services</h2><p>Select only what this client actually needs.</p></div><button class="btn primary" data-action="service-scope" data-id="${p.id}">Manage services</button></div>
      <div class="service-summary">${rows.map(s => `<div class="service-item ${String(s.name).startsWith('Aavartan Photo + Video') ? 'hero' : ''}"><div><span>${String(s.name).startsWith('Aavartan') ? 'AAVARTAN' : 'RACHNA'}</span><strong>${esc(s.name)}</strong><small>Qty ${esc(s.quantity || 1)}</small></div><div><strong>${Number(s.customer_price || 0) ? money(Number(s.customer_price) * Number(s.quantity || 1)) : 'Quote'}</strong><div class="mini-actions"><button class="btn" data-action="edit-project-service" data-id="${s.id}">Edit</button><button class="btn danger" data-action="delete" data-table="project_services" data-id="${s.id}">Delete</button></div></div></div>`).join('') || empty('No services selected', 'A project can use Rachna only, Aavartan only, or both.')}</div>`;
  };

  const quoteView = p => {
    const quote = A.state.quotations.filter(q => q.project_id === p.id && q.status !== 'rejected').sort((a,b) => Number(b.version) - Number(a.version))[0];
    const items = quote ? A.state.quotationItems.filter(i => i.quotation_id === quote.id) : [];
    return `<div class="sub-head"><div><h2>Quotation</h2><p>Customer pricing is finalized here.</p></div><button class="btn primary" data-action="new-quote" data-id="${p.id}">New quotation</button></div>` +
      (quote ? `<div class="panel"><div class="panel-head"><div><div class="eyebrow">VERSION ${quote.version}</div><h2>${statusTag(quote.status)}</h2></div><button class="btn" data-action="open-quote" data-id="${quote.id}">Open quote</button></div>${table(['Description','Qty','Customer price'], items.map(i => `<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)}</td><td>${money(i.customer_price)}</td></tr>`))}</div>` : empty('No quotation yet', 'Create a quotation after selecting the project scope.'));
  };

  const operationsView = p => {
    const vendors = A.state.vendorBookings.filter(x => x.project_id === p.id);
    const team = A.state.projectTeam.filter(x => x.project_id === p.id);
    const costs = A.state.productionCosts.filter(x => x.project_id === p.id);
    return `<div class="grid2"><section class="panel"><div class="panel-head"><div><h2>Vendor bookings</h2><p>Internal vendor costs stay private.</p></div><button class="btn" data-action="vendor-booking" data-id="${p.id}">Add vendor</button></div>${vendors.map(v => `<div class="list-row"><div><strong>${esc(A.state.vendors.find(x => x.id === v.vendor_id)?.name || 'Vendor')}</strong><small>${money(v.quoted_cost)}</small></div></div>`).join('') || empty('No vendors')}</section>
      <section class="panel"><div class="panel-head"><div><h2>Team</h2><p>Assign people and cost by function.</p></div><button class="btn" data-action="assign-team" data-id="${p.id}">Assign</button></div>${team.map(t => `<div class="list-row"><div><strong>${esc(A.state.team.find(x => x.id === t.team_member_id)?.name || 'Team member')}</strong><small>${money(t.rate)}</small></div></div>`).join('') || empty('No team assigned')}</section></div>
      <section class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>Aavartan production costs</h2><p>Manpower, gadgets and post-production costs.</p></div><button class="btn" data-action="production-cost" data-id="${p.id}">Add cost</button></div>${costs.map(c => `<div class="list-row"><div><strong>${esc(c.description)}</strong><small>${esc(c.category || 'Other')}</small></div><strong>${money(Number(c.quantity || 1) * Number(c.unit_cost || 0))}</strong></div>`).join('') || empty('No production costs')}</section>`;
  };

  const projectMoneyView = p => `<div class="sub-head"><div><h2>Money</h2><p>Actual receipts and outgoing payments.</p></div><button class="btn primary" data-action="project-payment" data-id="${p.id}">Record payment</button></div>${table(['Date','Direction','Amount','Method'], A.state.payments.filter(x => x.project_id === p.id).map(x => `<tr><td>${esc(x.payment_date || '—')}</td><td>${statusTag(x.direction)}</td><td>${money(x.amount)}</td><td>${esc(x.method || '—')}</td></tr>`))}`;

  const deliveryView = p => `<div class="sub-head"><div><h2>Delivery</h2><p>Albums, drives, reels and final handover.</p></div><button class="btn primary" data-action="deliverable" data-id="${p.id}">Add deliverable</button></div>${table(['Deliverable','Due','Status'], A.state.deliverables.filter(d => d.project_id === p.id).map(d => `<tr><td>${esc(d.deliverable)}</td><td>${esc(d.due_date || '—')}</td><td>${statusTag(d.status)}</td></tr>`))}`;

  const newInquiry = () => { modal('New inquiry', `<div class="rule-note">Required: customer name, event name and date.</div>${field('Customer name','iName')}${field('Phone / WhatsApp','iPhone','tel')}${field('Email','iEmail','email')}${field('Event / wedding name','iEvent')}${dateField('Event date','iDate')}${field('Venue','iVenue')}${field('Guest count','iGuests','number','','min="1"')}${select('Lead source','iSource',['Instagram','Facebook','WhatsApp','Referral','Website','Other'])}${field('Budget','iBudget','number','','min="0"')}${textarea('Notes','iNotes')}`, '<button class="btn primary" data-action="save-inquiry">Save inquiry</button>'); setTimeout(() => syncDate('iDate'), 0); };

  const newProject = () => { const opts = [['','Select customer…'], ...A.state.customers.map(c => [c.id, c.name + (c.phone ? ` · ${c.phone}` : '')])]; modal('New project', `${select('Customer','pCustomer',opts)}${field('Project / wedding name','pName')}${select('Brand','pBrand',[['Rachna + Aavartan','Rachna + Aavartan'],['Rachna','Rachna'],['Aavartan','Aavartan']])}${field('First function name','pFn','text','Wedding')}${dateField('First function date','pDate')}${field('Venue','pVenue')}${field('Guest count','pGuests','number','','min="1"')}`, '<button class="btn primary" data-action="save-project">Create project</button>'); setTimeout(() => syncDate('pDate'), 0); };

  const newFunction = id => { modal('Add function', `${field('Function name','fName')}${dateField('Function date','fDate')}${field('Venue','fVenue')}${field('Guest count','fGuests','number','','min="1"')}${field('Start time','fTime','time')}${textarea('Notes','fNotes')}`, `<button class="btn primary" data-action="save-function" data-id="${id}">Add function</button>`); setTimeout(() => syncDate('fDate'), 0); };

  const manageServices = id => {
    const existing = A.state.projectServices.filter(s => s.project_id === id);
    const names = new Set(existing.map(s => String(s.name)));
    const existingPackage = existing.find(s => String(s.name).startsWith('Aavartan Photo + Video'));
    const packageName = existingPackage ? String(existingPackage.name).replace('Aavartan Photo + Video — ', '') : '';
    const aavartanOn = Boolean(existingPackage || existing.some(s => String(s.name).startsWith('Aavartan Add-on — ')));

    modal('Manage project services', `
      <div class="editor">
        <section>
          <div class="step">01 · Rachna services</div>
          <p class="rule-note">Select independently. A project does not need Aavartan unless the client asks for photography + videography.</p>
          <div class="choice-grid">
            ${RACHNA().map(s => `<label class="choice"><input type="checkbox" data-rachna value="${esc(s.id)}" ${names.has(s.name) ? 'checked' : ''}><span><b>${esc(s.name)}</b><small>${esc(s.category || 'Event management')} · quote price</small></span></label>`).join('')}
          </div>
        </section>

        <section>
          <div class="step">02 · Aavartan Photo + Video</div>
          <label class="choice featured-toggle"><input id="includeAavartan" type="checkbox" ${aavartanOn ? 'checked' : ''}><span><b>Include Aavartan Photography + Videography</b><small>Turn this on only when the client needs Aavartan coverage.</small></span></label>
          <div id="aavartanOptions" style="display:${aavartanOn ? 'block' : 'none'};margin-top:12px">
            <div class="choice-grid">
              ${AAVARTAN_PACKAGES.map(([name, description]) => `<label class="choice"><input type="radio" name="aPkg" value="${esc(name)}" ${name === packageName ? 'checked' : ''}><span><b>${esc(name)}</b><small>${esc(description)}</small></span></label>`).join('')}
            </div>

            <div class="step" style="margin-top:18px">03 · Optional Aavartan add-ons</div>
            <div class="choice-grid">
              ${AAVARTAN_ADDONS.map(addon => `<label class="choice"><input type="checkbox" data-addon value="${esc(addon)}" ${names.has('Aavartan Add-on — ' + addon) ? 'checked' : ''}><span><b>${esc(addon)}</b><small>Optional production add-on</small></span></label>`).join('')}
            </div>
          </div>
        </section>

        <div class="editor-note">You may select Rachna only, Aavartan only, or both. Customer pricing is entered in the quotation.</div>
      </div>`, '<button class="btn primary" data-action="save-services" data-id="' + id + '">Save services</button>');

    $('#includeAavartan').addEventListener('change', e => {
      $('#aavartanOptions').style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        $$('input[name="aPkg"]').forEach(x => x.checked = false);
        $$('[data-addon]').forEach(x => x.checked = false);
      }
    });
  };

  const editProjectService = id => { const x = A.state.projectServices.find(s => s.id === id); modal('Edit service', `${field('Service name','psName','text',x?.name || '')}${field('Quantity','psQty','number',x?.quantity || 1,'min="1"')}${field('Customer price','psPrice','number',x?.customer_price || 0,'min="0"')}${field('Internal cost','psCost','number',x?.internal_cost || 0,'min="0"')}`, '<button class="btn primary" data-action="save-project-service" data-id="' + id + '">Save</button>'); };

  const newQuote = id => A.createQuotation(id).then(() => { render(); toast('Quotation version created'); }).catch(e => toast(e.message, true));
  const openQuote = id => { const q = A.state.quotations.find(x => x.id === id); const items = A.state.quotationItems.filter(x => x.quotation_id === id); modal('Quotation version ' + q.version, `${table(['Description','Qty','Customer price','Internal cost'], items.map(i => `<tr><td>${esc(i.description)}</td><td>${esc(i.quantity)}</td><td>${money(i.customer_price)}</td><td>${money(i.internal_cost)}</td></tr>`))}`, '<button class="btn primary" data-action="add-quote-item" data-id="' + id + '">Add line</button>'); };
  const addQuoteItem = id => { const q = A.state.quotations.find(x => x.id === id); modal('Add quote line', `${field('Description','qiDesc')}${field('Quantity','qiQty','number','1','min="1"')}${field('Customer price','qiPrice','number','','min="0"')}${field('Internal cost','qiCost','number','','min="0"')}`, '<button class="btn primary" data-action="save-quote-item" data-id="' + id + '" data-project="' + q.project_id + '">Save</button>'); };
  const advance = id => { const p = A.state.projects.find(x => x.id === id); const need = Number(p.quoted_total || 0) * 0.3; modal('Record customer advance', `${field('Amount received','advAmt','number','','min="1"')}<div class="rule-note"><b>30% booking rule</b><br>Required ${money(need)} · Received ${money(p.customer_advance)}</div>${field('Payment method','advMethod')}${field('Reference','advRef')}`, '<button class="btn primary" data-action="save-advance" data-id="' + id + '">Save advance</button>'); };
  const account = () => A.state.user ? modal('Account', `<div class="rule"><b>Name</b><span>${esc(A.state.profile?.full_name || 'Owner')}</span></div><div class="rule"><b>Email</b><span>${esc(A.state.user.email || '')}</span></div>`, '<button class="btn primary" data-action="sign-out">Sign out</button>') : modal('Sign in', `${field('Email','siEmail','email')}${field('Password','siPass','password')}`, '<button class="btn primary" data-action="sign-in">Sign in</button>');

  async function saveInquiry() {
    try {
      const name = $('#iName').value.trim();
      await A.createInquiry({ customer_name: name, phone: $('#iPhone').value.trim(), whatsapp: $('#iPhone').value.trim(), email: $('#iEmail').value.trim(), event_name: $('#iEvent').value.trim(), event_date_bs: $('#iDateBS').value, venue: $('#iVenue').value.trim(), guest_count: Number($('#iGuests').value) || null, budget: Number($('#iBudget').value) || null, source: $('#iSource').value, notes: $('#iNotes').value.trim() });
      closeModal(); render(); toast('Inquiry saved');
    } catch (e) { toast(e.message, true); }
  }

  async function saveProject() {
    try {
      const bs = $('#pDateBS').value;
      let ad = null;
      try { const x = new DateConverter(bs).toAd(); ad = `${x.year}-${String(x.month).padStart(2, '0')}-${String(x.date).padStart(2, '0')}`; } catch (_) {}
      const p = await A.insertProject({ customer_id: $('#pCustomer').value || null, name: $('#pName').value.trim(), brand: $('#pBrand').value, date_range_bs: bs, function_name: $('#pFn').value.trim(), event_date: ad, event_date_bs: bs, venue: $('#pVenue').value.trim(), guest_count: Number($('#pGuests').value) || null });
      closeModal(); openProject(p.id); toast('Project created');
    } catch (e) { toast(e.message, true); }
  }

  async function saveFunction(pid) {
    try {
      const bs = $('#fDateBS').value;
      let ad = null;
      try { const x = new DateConverter(bs).toAd(); ad = `${x.year}-${String(x.month).padStart(2, '0')}-${String(x.date).padStart(2, '0')}`; } catch (_) {}
      await A.addFunction(pid, { name: $('#fName').value.trim(), event_date: ad, event_date_bs: bs, venue: $('#fVenue').value.trim(), guest_count: Number($('#fGuests').value) || null, start_time: $('#fTime').value || null, notes: $('#fNotes').value.trim() });
      closeModal(); render(); toast('Function saved');
    } catch (e) { toast(e.message, true); }
  }

  async function saveServices(pid) {
    try {
      const includeAavartan = $('#includeAavartan')?.checked === true;
      const rows = [];
      $$('[data-rachna]:checked').forEach(input => {
        const service = RACHNA().find(s => s.id === input.value);
        if (service) rows.push({ name: service.name, service_id: service.id, customer_price: 0, internal_cost: Number(service.internal_cost || 0), quantity: 1, function_id: null });
      });

      if (includeAavartan) {
        const pkg = $('input[name="aPkg"]:checked')?.value;
        if (!pkg) throw Error('Choose an Aavartan package or turn Aavartan off.');
        rows.unshift({ name: 'Aavartan Photo + Video — ' + pkg, service_id: AAVARTAN().find(s => s.name === 'Aavartan Photo + Video')?.id || null, customer_price: 0, internal_cost: 0, quantity: 1, function_id: null });
        $$('[data-addon]:checked').forEach(input => rows.push({ name: 'Aavartan Add-on — ' + input.value, service_id: AAVARTAN().find(s => String(s.name).toLowerCase().includes(input.value.toLowerCase()))?.id || null, customer_price: 0, internal_cost: 0, quantity: 1, function_id: null }));
      }

      await A.saveProjectServiceScope(pid, rows);
      closeModal(); render(); toast('Services saved');
    } catch (e) { toast(e.message || 'Could not save services', true); }
  }

  async function saveProjectService(id) {
    try {
      const x = A.state.projectServices.find(s => s.id === id);
      await A.updateProjectService(id, { name: $('#psName').value.trim(), quantity: Number($('#psQty').value) || 1, customer_price: Number($('#psPrice').value) || 0, internal_cost: Number($('#psCost').value) || 0 }, x.project_id);
      closeModal(); render(); toast('Service updated');
    } catch (e) { toast(e.message, true); }
  }

  async function saveQuoteItem(qid, pid) {
    try {
      await A.addQuoteItem(qid, { description: $('#qiDesc').value.trim(), quantity: Number($('#qiQty').value) || 1, customer_price: Number($('#qiPrice').value) || 0, internal_cost: Number($('#qiCost').value) || 0 });
      await A.recalc(pid); closeModal(); render(); toast('Quote line saved');
    } catch (e) { toast(e.message, true); }
  }

  async function saveAdvance(id) {
    try {
      const r = await A.recordAdvance(id, Number($('#advAmt').value), $('#advMethod').value, $('#advRef').value);
      closeModal(); render(); toast(r.booked ? 'Booking confirmed' : 'Advance recorded');
    } catch (e) { toast(e.message, true); }
  }

  const vendorBooking = pid => { const vendors = [['','Select vendor…'], ...A.state.vendors.map(v => [v.id, v.name])]; const funcs = [['','General'], ...A.state.functions.filter(f => f.project_id === pid).map(f => [f.id, f.name])]; modal('Vendor booking', `${select('Vendor','vbVendor',vendors)}${select('Function','vbFunction',funcs)}${field('Quoted cost','vbCost','number','','min="0"')}${field('Vendor advance paid','vbAdv','number','0','min="0"')}${field('Final paid','vbFinal','number','0','min="0"')}`, '<button class="btn primary" data-action="save-vendor-booking" data-id="' + pid + '">Save</button>'); };
  async function saveVendorBooking(pid) { try { await A.addVendorBooking({ project_id: pid, vendor_id: $('#vbVendor').value, function_id: $('#vbFunction').value || null, quoted_cost: Number($('#vbCost').value) || 0, advance_paid: Number($('#vbAdv').value) || 0, final_paid: Number($('#vbFinal').value) || 0, status: 'reserved' }); closeModal(); render(); toast('Vendor booking saved'); } catch (e) { toast(e.message, true); } }

  const assignTeam = pid => modal('Assign team', `${select('Team member','tmMember',[['','Select…'], ...A.state.team.filter(x => x.active !== false).map(t => [t.id, t.name + ' · ' + (t.role || '')])])}${select('Function','tmFunction',[['','General'], ...A.state.functions.filter(f => f.project_id === pid).map(f => [f.id, f.name])])}${field('Rate / cost','tmRate','number','','min="0"')}${textarea('Responsibility','tmResp')}`, '<button class="btn primary" data-action="save-team" data-id="' + pid + '">Assign</button>');
  async function saveTeam(pid) { try { await A.assignTeam({ project_id: pid, team_member_id: $('#tmMember').value, function_id: $('#tmFunction').value || null, rate: Number($('#tmRate').value) || 0, responsibility: $('#tmResp').value.trim() || null }); closeModal(); render(); toast('Team assigned'); } catch (e) { toast(e.message, true); } }

  const productionCost = pid => modal('Production cost', `${select('Function','pcFunction',[['','General'], ...A.state.functions.filter(f => f.project_id === pid).map(f => [f.id, f.name])])}${field('Category','pcCategory','text','Photography / Video')}${field('Description','pcDescription')}${field('Quantity','pcQty','number','1','min="1"')}${field('Unit cost','pcUnit','number','','min="0"')}`, '<button class="btn primary" data-action="save-production" data-id="' + pid + '">Save</button>');
  async function saveProduction(pid) { try { await A.addProductionCost({ project_id: pid, function_id: $('#pcFunction').value || null, brand: 'Aavartan', category: $('#pcCategory').value, description: $('#pcDescription').value.trim(), quantity: Number($('#pcQty').value) || 1, unit_cost: Number($('#pcUnit').value) || 0 }); closeModal(); render(); toast('Production cost saved'); } catch (e) { toast(e.message, true); } }

  const projectPayment = pid => modal('Project payment', `${select('Direction','payDir',[['in','Customer received'],['out','Paid out']],'in')}${field('Amount','payAmount','number','','min="1"')}${field('Payment date','payDate','date',new Date().toISOString().slice(0,10))}${field('Method','payMethod')}${field('Reference','payRef')}${textarea('Notes','payNotes')}`, '<button class="btn primary" data-action="save-payment" data-id="' + pid + '">Save</button>');
  async function savePayment(pid) { try { await A.recordPayment({ project_id: pid, direction: $('#payDir').value, party_type: $('#payDir').value === 'in' ? 'customer' : 'other', amount: Number($('#payAmount').value), payment_date: $('#payDate').value, method: $('#payMethod').value || null, reference: $('#payRef').value || null, notes: $('#payNotes').value || null }); closeModal(); render(); toast('Payment saved'); } catch (e) { toast(e.message, true); } }

  const deliverable = pid => modal('Aavartan deliverable', `${field('Deliverable','dName')}${field('Due date','dDue','date')}${select('Status','dStatus',[['pending','Pending'],['in_progress','In progress'],['delivered','Delivered']],'pending')}`, '<button class="btn primary" data-action="save-deliverable" data-id="' + pid + '">Save</button>');
  async function saveDeliverable(pid) { try { await A.addDeliverable({ project_id: pid, deliverable: $('#dName').value.trim(), due_date: $('#dDue').value || null, status: $('#dStatus').value }); closeModal(); render(); toast('Deliverable saved'); } catch (e) { toast(e.message, true); } }

  const quickFunction = () => A.state.projects[0] ? newFunction(A.state.projects[0].id) : newProject();

  async function onAction(el) {
    const action = el.dataset.action;
    const id = el.dataset.id;
    try {
      if (action === 'new-inquiry') return newInquiry();
      if (action === 'new-project') return newProject();
      if (action === 'open-project') return openProject(id);
      if (action === 'convert-inquiry') { const p = await A.convertInquiry(id); return openProject(p.id); }
      if (action === 'quick-function') return quickFunction();
      if (action === 'record-payment') return A.state.projects[0] ? projectPayment(A.state.projects[0].id) : toast('Create a project first', true);
      if (action === 'account') return account();
      if (action === 'service-scope') return manageServices(id);
      if (action === 'new-function') return newFunction(id);
      if (action === 'edit-function') return toast('Function editing can be added from the function workflow');
      if (action === 'edit-project-service') return editProjectService(id);
      if (action === 'new-quote') return newQuote(id);
      if (action === 'open-quote') return openQuote(id);
      if (action === 'add-quote-item') return addQuoteItem(id);
      if (action === 'advance') return advance(id);
      if (action === 'vendor-booking') return vendorBooking(id);
      if (action === 'assign-team') return assignTeam(id);
      if (action === 'production-cost') return productionCost(id);
      if (action === 'project-payment') return projectPayment(id);
      if (action === 'deliverable') return deliverable(id);
      if (action === 'save-inquiry') return saveInquiry();
      if (action === 'save-project') return saveProject();
      if (action === 'save-function') return saveFunction(id);
      if (action === 'save-services') return saveServices(id);
      if (action === 'save-project-service') return saveProjectService(id);
      if (action === 'save-quote-item') return saveQuoteItem(id, el.dataset.project);
      if (action === 'save-advance') return saveAdvance(id);
      if (action === 'save-vendor-booking') return saveVendorBooking(id);
      if (action === 'save-team') return saveTeam(id);
      if (action === 'save-production') return saveProduction(id);
      if (action === 'save-payment') return savePayment(id);
      if (action === 'save-deliverable') return saveDeliverable(id);
      if (action === 'sign-out') { await A.signOut(); return; }
      if (action === 'sign-in') { await A.signIn($('#siEmail').value, $('#siPass').value); closeModal(); render(); return; }
      if (action === 'delete') {
        if (!confirm('Delete this record?')) return;
        await A.remove(el.dataset.table, id);
        render(); toast('Deleted');
      }
    } catch (e) {
      console.error(e);
      toast(e.message || 'Action failed', true);
    }
  }

  document.addEventListener('click', event => {
    const routeEl = event.target.closest('[data-route]');
    if (routeEl) { route(routeEl.dataset.route); return; }
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) { onAction(actionEl); return; }
    const tabEl = event.target.closest('[data-tab]');
    if (tabEl && ui.project) { ui.tab = tabEl.dataset.tab; render(); }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'projectSearch') { ui.query = event.target.value; render(); }
  });

  document.addEventListener('change', event => {
    if (/^[ifp][A-Za-z]+[YMD]$/.test(event.target.id || '')) {
      syncDate(event.target.id.slice(0, -1));
    }
  });

  A.init().then(render).catch(error => {
    console.error(error);
    toast(error.message || 'Startup failed', true);
    render();
  });
})();
