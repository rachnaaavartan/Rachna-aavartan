(() => {
'use strict';
{
  'use strict';

  const SUPABASE_URL = 'https://awptvpxfzhqeawrpdczg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4D7iA3OZGhalc6bzxtYgBw__jCUmOVq';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const state = {
    user: null, profile: null, org: null, connected: false, error: null,
    customers: [], inquiries: [], projects: [], functions: [], services: [], projectServices: [],
    vendors: [], vendorBookings: [], team: [], projectTeam: [], payments: [], expenses: [],
    quotations: [], quotationItems: [], productionCosts: [], deliverables: [],
    productionJobs: [], eventFiles: [], reminders: []
  };

  const money = (n) => 'NPR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kathmandu', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const orgId = () => {
    const id = state.profile?.organization_id;
    if (!id) throw new Error('Workspace is not initialized. Sign in again.');
    return id;
  };
  const assertText = (value, message) => { if (!String(value ?? '').trim()) throw new Error(message); };
  const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  async function q(promise) {
    const result = await promise;
    if (result.error) throw result.error;
    return result.data;
  }

  async function loadProfile() {
    if (!state.user) return;
    state.profile = await q(sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle());
    if (state.profile?.organization_id) {
      state.org = await q(sb.from('organizations').select('*').eq('id', state.profile.organization_id).maybeSingle());
    }
  }

  async function bootstrap(fullName, orgName) {
    const id = await q(sb.rpc('bootstrap_workspace', {
      p_full_name: fullName || null,
      p_org_name: orgName || null
    }));
    await loadProfile();
    return id;
  }

  const DATASETS = [
    ['customers', 'created_at', false], ['inquiries', 'updated_at', false], ['projects', 'created_at', false],
    ['event_functions', 'event_date', true], ['services', 'name', true], ['project_services', 'id', true],
    ['vendors', 'name', true], ['vendor_bookings', 'id', true], ['team_members', 'name', true], ['project_team', 'id', true],
    ['payments', 'payment_date', false], ['project_expenses', 'expense_date', false], ['quotations', 'created_at', false],
    ['quotation_items', 'id', true], ['production_costs', 'created_at', false], ['aavartan_deliverables', 'due_date', true],
    ['production_jobs', 'due_date', true], ['event_files', 'created_at', false], ['reminders', 'due_at', true]
  ];

  async function refresh() {
    if (!state.user) return state;
    if (!state.profile?.organization_id) {
      await bootstrap(state.user.user_metadata?.full_name || state.user.email?.split('@')[0] || 'Owner', 'Rachna Workspace');
    }
    const results = await Promise.all(DATASETS.map(([table, column, ascending]) => {
      let query = sb.from(table).select('*');
      if (column) query = query.order(column, { ascending });
      return query;
    }));
    for (const result of results) if (result.error) throw result.error;
    [
      state.customers, state.inquiries, state.projects, state.functions, state.services, state.projectServices,
      state.vendors, state.vendorBookings, state.team, state.projectTeam, state.payments, state.expenses,
      state.quotations, state.quotationItems, state.productionCosts, state.deliverables,
      state.productionJobs, state.eventFiles, state.reminders
    ] = results.map((r) => r.data || []);
    return state;
  }

  async function init() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    state.user = data.session?.user || null;
    state.connected = !!state.user;
    if (state.user) {
      await loadProfile();
      await refresh();
    }
    return state;
  }

  async function signIn(email, password) {
    assertText(email, 'Email is required');
    assertText(password, 'Password is required');
    const result = await sb.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    state.user = result.data.user;
    state.connected = true;
    await loadProfile();
    if (!state.profile?.organization_id) await bootstrap(state.user.user_metadata?.full_name || email.split('@')[0], 'Rachna Workspace');
    await refresh();
    return state;
  }

  async function signUp(email, password, fullName, orgName) {
    assertText(email, 'Email is required');
    assertText(password, 'Password is required');
    const result = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName || email.split('@')[0] } } });
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error('Signup did not create a user.');
    if (!result.data.session) return { needsConfirmation: true };
    state.user = result.data.user;
    state.connected = true;
    await bootstrap(fullName, orgName);
    await refresh();
    return state;
  }

  async function signOut() {
    await sb.auth.signOut();
    location.reload();
  }

  async function insert(table, row) {
    const data = { ...row };
    if (['customers', 'inquiries', 'projects', 'services', 'vendors', 'team_members', 'payments', 'project_expenses', 'production_jobs', 'event_files', 'reminders'].includes(table)) data.organization_id = orgId();
    const out = await q(sb.from(table).insert(data).select().single());
    await refresh();
    return out;
  }

  async function update(table, id, row) {
    if (!id) throw new Error('Record ID is required');
    const out = await q(sb.from(table).update(row).eq('id', id));
    await refresh();
    return out;
  }

  async function remove(table, id) {
    if (!id) throw new Error('Record ID is required');
    await q(sb.from(table).delete().eq('id', id));
    await refresh();
    return true;
  }

  async function createCustomer(x) {
    assertText(x.name, 'Customer name is required');
    const phone = String(x.phone || '').trim();
    const existing = phone ? state.customers.find((c) => String(c.phone || '').trim() === phone) : null;
    if (existing) return existing;
    return insert('customers', { name: x.name.trim(), phone: x.phone || null, whatsapp: x.whatsapp || x.phone || null, email: x.email || null, notes: x.notes || null });
  }

  async function createInquiry(x) {
    assertText(x.event_name, 'Event name is required');
    assertText(x.customer_name, 'Customer name is required');
    let customer = null;
    const phone = String(x.phone || '').trim();
    if (phone) customer = state.customers.find((c) => String(c.phone || '').trim() === phone) || null;
    if (!customer) customer = await createCustomer({ name: x.customer_name, phone: x.phone, whatsapp: x.whatsapp, email: x.email });
    return insert('inquiries', {
      customer_id: customer.id, source: x.source || 'Other', status: x.status || 'new', owner_id: state.user?.id || null,
      event_name: x.event_name.trim(), event_date_bs: x.event_date_bs || null, venue: x.venue || null,
      guest_count: x.guest_count ? n(x.guest_count) : null, budget: x.budget ? n(x.budget) : null, notes: x.notes || null
    });
  }

  async function updateInquiry(id, row) { return update('inquiries', id, row); }

  async function convertInquiry(id) {
    const inquiry = state.inquiries.find((v) => v.id === id);
    if (!inquiry) throw new Error('Inquiry not found');
    const existing = state.projects.find((p) => p.inquiry_id === id);
    if (existing) return existing;
    const project = await insert('projects', {
      customer_id: inquiry.customer_id, inquiry_id: inquiry.id, name: inquiry.event_name || 'New Event',
      status: 'planning', brand: 'Rachna + Aavartan', date_range_bs: inquiry.event_date_bs || null
    });
    await addFunction(project.id, {
      name: inquiry.event_name || 'Event', event_date_bs: inquiry.event_date_bs || null,
      event_date: null, venue: inquiry.venue || null, guest_count: inquiry.guest_count || null
    });
    await updateInquiry(id, { status: 'quote_pending', updated_at: new Date().toISOString() });
    return state.projects.find((p) => p.id === project.id) || project;
  }

  async function insertProject(x) {
    assertText(x.name, 'Event name is required');
    const project = await insert('projects', {
      customer_id: x.customer_id || null, inquiry_id: x.inquiry_id || null, name: x.name.trim(),
      status: x.status || 'planning', brand: x.brand || 'Rachna + Aavartan', date_range_bs: x.date_range_bs || null
    });
    if (x.function_name?.trim()) await addFunction(project.id, {
      name: x.function_name.trim(), event_date: x.event_date || null, event_date_bs: x.event_date_bs || null,
      venue: x.venue || null, guest_count: x.guest_count || null
    });
    await refresh();
    return state.projects.find((p) => p.id === project.id) || project;
  }

  async function addFunction(projectId, x) {
    assertText(x.name, 'Function name is required');
    return q(sb.from('event_functions').insert({
      ...x, project_id: projectId, name: x.name.trim(),
      event_date: x.event_date || null, guest_count: x.guest_count ? n(x.guest_count) : null
    }).select().single()).then(async (r) => { await refresh(); return r; });
  }

  async function updateFunction(id, row) { return update('event_functions', id, row); }
  async function deleteFunction(id) { return remove('event_functions', id); }
  async function setProjectStatus(id, status) { return update('projects', id, { status }); }
  async function updateProject(id, row) { return update('projects', id, row); }

  async function saveProjectServiceScope(projectId, rows) {
    const data = await q(sb.rpc('save_project_service_scope', { p_project_id: projectId, p_rows: rows || [] }));
    await refresh();
    return data;
  }

  async function addService(x) {
    assertText(x.name, 'Service name is required');
    return insert('services', { brand: x.brand || 'Rachna', name: x.name.trim(), category: x.category || null, base_price: n(x.base_price), internal_cost: n(x.internal_cost), active: x.active !== false });
  }

  async function addProjectService(x) {
    const out = await q(sb.from('project_services').insert({
      project_id: x.project_id, function_id: x.function_id || null, service_id: x.service_id || null,
      name: x.name, customer_price: n(x.customer_price), internal_cost: n(x.internal_cost), quantity: n(x.quantity, 1)
    }).select().single());
    await refresh();
    await recalc(x.project_id);
    return out;
  }

  async function updateProjectService(id, row, projectId) {
    await q(sb.from('project_services').update(row).eq('id', id));
    if (projectId) await recalc(projectId); else await refresh();
  }

  async function addVendor(x) {
    assertText(x.name, 'Vendor name is required');
    return insert('vendors', { name: x.name.trim(), phone: x.phone || null, service_category: x.category || null, area: x.area || null, rate_guide: x.rate_guide || null, reliability: x.reliability || 'Medium', notes: x.notes || null });
  }

  async function updateVendor(id, row) { return update('vendors', id, row); }

  async function addVendorBooking(x) {
    const quoted = n(x.quoted_cost);
    const advance = n(x.advance_paid);
    const finalPaid = n(x.final_paid);
    if (advance !== 0 || finalPaid !== 0) {
      throw new Error('Vendor payments must be recorded separately after the vendor job is created.');
    }
    const out = await q(sb.from('vendor_bookings').insert({
      project_id: x.project_id, function_id: x.function_id || null, vendor_id: x.vendor_id,
      category: x.category || null, requirement: x.requirement || null, quantity: n(x.quantity, 1),
      client_price: n(x.client_price), quoted_cost: quoted, advance_paid: 0, final_paid: 0,
      payable: Math.max(0, quoted), status: x.status || 'reserved', notes: x.notes || null
    }).select().single());
    await refresh();
    await recalc(x.project_id);
    return out;
  }

  async function updateVendorBooking(id, row, projectId) {
    if ('advance_paid' in row || 'final_paid' in row) throw new Error('Vendor payments must be recorded through the vendor payment action.');
    await q(sb.from('vendor_bookings').update(row).eq('id', id));
    if (projectId) await recalc(projectId); else await refresh();
  }

  async function payVendorBooking(id, amount, method, reference, isAdvance = false) {
    const value = n(amount);
    if (!(value > 0)) throw new Error('Payment must be greater than zero');
    const result = await q(sb.rpc('apply_vendor_payment', {
      p_vendor_booking_id: id, p_amount: value, p_method: method || null, p_reference: reference || null, p_is_advance: !!isAdvance
    }));
    await refresh();
    return result;
  }

  async function addTeam(x) {
    assertText(x.name, 'Team member name is required');
    return insert('team_members', { name: x.name.trim(), role: x.role || null, phone: x.phone || null, email: x.email || null, active: x.active !== false });
  }

  async function updateTeam(id, row) { return update('team_members', id, row); }

  async function assignTeam(x) {
    const out = await q(sb.from('project_team').insert({
      project_id: x.project_id, team_member_id: x.team_member_id, function_id: x.function_id || null,
      responsibility: x.responsibility || null, rate: n(x.rate)
    }).select().single());
    await refresh();
    await recalc(x.project_id);
    return out;
  }

  async function updateProjectTeam(id, row, projectId) {
    await q(sb.from('project_team').update(row).eq('id', id));
    if (projectId) await recalc(projectId); else await refresh();
  }

  async function recordPayment(x) {
    const amount = n(x.amount);
    if (!(amount > 0)) throw new Error('Amount must be greater than zero');
    return insert('payments', {
      project_id: x.project_id || null, direction: x.direction, party_type: x.party_type || 'other',
      party_id: x.party_id || null, amount, payment_date: x.payment_date || today(), method: x.method || null,
      reference: x.reference || null, notes: x.notes || null
    });
  }

  async function recordExpense(x) {
    const amount = n(x.amount);
    if (!(amount > 0)) throw new Error('Expense must be greater than zero');
    const out = await insert('project_expenses', {
      project_id: x.project_id || null, category: x.category || 'Other', description: x.description || 'Expense',
      amount, expense_date: x.expense_date || today(), method: x.method || null, notes: x.notes || null
    });
    if (x.project_id) await recalc(x.project_id);
    return out;
  }

  async function recordAdvance(projectId, amount, method, reference) {
    const value = n(amount);
    if (!(value > 0)) throw new Error('Enter a valid advance');
    const data = await q(sb.rpc('apply_customer_advance', { p_project_id: projectId, p_amount: value, p_method: method || null, p_reference: reference || null }));
    await refresh();
    return { booked: Boolean(data.booked), reserve: n(data.vendor_reserve), received: n(data.received), required: n(data.required) };
  }

  async function createQuotation(projectId) {
    const version = state.quotations.filter((q) => q.project_id === projectId).reduce((max, q) => Math.max(max, n(q.version)), 0) + 1;
    return insert('quotations', { project_id: projectId, version, status: 'draft', customer_total: 0, internal_total: 0, notes: null });
  }

  async function updateQuotation(id, row, projectId) {
    await q(sb.from('quotations').update(row).eq('id', id));
    if (projectId) await recalc(projectId); else await refresh();
  }

  async function addQuoteItem(quotationId, x) {
    const out = await q(sb.from('quotation_items').insert({
      quotation_id: quotationId, function_id: x.function_id || null, service_id: x.service_id || null,
      description: x.description, quantity: n(x.quantity, 1), customer_price: n(x.customer_price), internal_cost: n(x.internal_cost)
    }).select().single());
    const qrow = state.quotations.find((q) => q.id === quotationId);
    await refresh();
    if (qrow) await recalc(qrow.project_id);
    return out;
  }

  async function createQuoteVersionFrom(projectId, sourceId) {
    const newQuote = await createQuotation(projectId);
    const items = state.quotationItems.filter((i) => i.quotation_id === sourceId);
    for (const item of items) {
      await q(sb.from('quotation_items').insert({ quotation_id: newQuote.id, function_id: item.function_id, service_id: item.service_id, description: item.description, quantity: item.quantity, customer_price: item.customer_price, internal_cost: item.internal_cost }));
    }
    await recalc(projectId);
    return newQuote;
  }

  async function recalc(projectId) {
    if (!projectId) return;
    await q(sb.rpc('refresh_project_financials', { p_project_id: projectId }));
    await refresh();
  }

  async function addProductionCost(x) {
    const out = await q(sb.from('production_costs').insert({
      project_id: x.project_id, function_id: x.function_id || null, brand: x.brand || 'Aavartan',
      category: x.category || 'Other', description: x.description || 'Cost', quantity: n(x.quantity, 1),
      unit_cost: n(x.unit_cost), notes: x.notes || null
    }).select().single());
    await recalc(x.project_id);
    return out;
  }

  async function addProductionJob(x) {
    assertText(x.title, 'Production job title is required');
    return insert('production_jobs', {
      project_id: x.project_id, function_id: x.function_id || null, brand: x.brand || 'Aavartan',
      job_type: x.job_type || 'photo', tracker_type: x.tracker_type || x.job_type || 'photo',
      stage: x.stage || 'Received', title: x.title.trim(), due_date: x.due_date || null,
      assigned_to: x.assigned_to || null, notes: x.notes || null, status: x.status || 'pending'
    });
  }

  async function updateProductionJob(id, row) { return update('production_jobs', id, row); }
  async function deleteProductionJob(id) { return remove('production_jobs', id); }

  async function addDeliverable(x) {
    assertText(x.deliverable, 'Deliverable name is required');
    return q(sb.from('aavartan_deliverables').insert({
      project_id: x.project_id, function_id: x.function_id || null, deliverable: x.deliverable.trim(),
      status: x.status || 'pending', due_date: x.due_date || null
    }).select().single()).then(async (r) => { await refresh(); return r; });
  }

  async function updateDeliverable(id, row, projectId) {
    await q(sb.from('aavartan_deliverables').update(row).eq('id', id));
    if (projectId) await recalc(projectId); else await refresh();
  }

  async function addEventFile(x) {
    assertText(x.name, 'File name is required');
    return insert('event_files', {
      project_id: x.project_id, function_id: x.function_id || null, name: x.name.trim(),
      kind: x.kind || 'link', url: x.url || null, notes: x.notes || null
    });
  }

  async function updateEventFile(id, row) { return update('event_files', id, row); }
  async function removeEventFile(id) { return remove('event_files', id); }

  async function addReminder(x) {
    assertText(x.title, 'Reminder title is required');
    return insert('reminders', {
      project_id: x.project_id || null, function_id: x.function_id || null, reminder_type: x.reminder_type || 'general',
      title: x.title.trim(), due_at: x.due_at || null, priority: x.priority || 'normal', status: 'open', notes: x.notes || null
    });
  }

  async function updateReminder(id, row) { return update('reminders', id, row); }

  window.RachnaAPI = {
    sb, state, init, refresh, signIn, signUp, signOut, bootstrap,
    createCustomer, createInquiry, updateInquiry, convertInquiry, insertProject, updateProject,
    addFunction, updateFunction, deleteFunction, setProjectStatus,
    saveProjectServiceScope, addService, addProjectService, updateProjectService,
    addVendor, updateVendor, addVendorBooking, updateVendorBooking, payVendorBooking,
    addTeam, updateTeam, assignTeam, updateProjectTeam,
    recordPayment, recordExpense, recordAdvance,
    createQuotation, updateQuotation, addQuoteItem, createQuoteVersionFrom, recalc,
    addProductionCost, addProductionJob, updateProductionJob, deleteProductionJob,
    addDeliverable, updateDeliverable, addEventFile, updateEventFile, removeEventFile,
    addReminder, updateReminder, update, remove, money, esc
  };
}
'use strict';
const A=window.RachnaAPI;
const NP=window.NepaliDate;
if(!A||!NP){document.addEventListener('DOMContentLoaded',()=>{const p=document.getElementById('page');if(p)p.innerHTML='<div class="empty"><b>Rachna OS could not start.</b><span>Required runtime dependency is unavailable. Refresh the page.</span></div>';});return;}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=A.esc,money=A.money;
const MONTHS=['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const STATUS={new:'New',quote_pending:'Quotation pending',quote_made:'Quotation made',quote_sent:'Quotation sent',interested:'Interested',not_interested:'Not interested',awaiting_advance:'Advance pending',booked:'Booked',cancelled:'Cancelled',booked_elsewhere:'Booked elsewhere',lost:'Lost',passed_on:'Passed on',booking_cancelled:'Booking cancelled',planning:'Planning',in_progress:'In progress',completed:'Completed',draft:'Draft',sent:'Sent',accepted:'Accepted',rejected:'Rejected',pending:'Pending',paid:'Paid',delivered:'Delivered',reserved:'Reserved',confirmed:'Confirmed'};
const INQUIRY_STAGES=Object.entries(STATUS).slice(0,13);
const PROJECT_STATUS=[['planning','Planning'],['in_progress','In progress'],['completed','Completed'],['cancelled','Cancelled']];
const ROLES=['Photographer','Videographer','Cinematographer','Editor','Assistant','Drone','Coordinator','Other'];
const SOURCES=['Facebook','Instagram','TikTok','WhatsApp','Phone','Website','Google','Referral','Walk-in','Other'];
const METHODS=['Cash','Bank transfer','eSewa','Khalti','Card','Other'];
const NAV=[
 {section:'Overview',items:[['home','Home'],['inquiries','Enquiries'],['events','Event Management']]},
 {section:'Clients',items:[['clients','All Clients'],['booked-clients','Booked Clients'],['freelancers','My Freelancers']]},
 {section:'Finance',items:[['finance','Finance Manager']]},
 {section:'Storage',items:[['files','File Management'],['drive','Event Drive']]},
 {section:'Production',items:[['photo-edit','Photo Edit Tracker'],['video-edit','Video Edit Tracker'],['deliverables','Album & Pen Drive']]},
 {section:'Workspace',items:[['settings','Settings']]}
];
const ui=(()=>{try{return{page:localStorage.getItem('ros.route')||'home',project:localStorage.getItem('ros.project')||null,tab:localStorage.getItem('ros.tab')||'overview',query:localStorage.getItem('ros.query')||''}}catch(_){return{page:'home',project:null,tab:'overview',query:''}}})();
const saveUI=()=>{try{localStorage.setItem('ros.route',ui.page);if(ui.project)localStorage.setItem('ros.project',ui.project);else localStorage.removeItem('ros.project');localStorage.setItem('ros.tab',ui.tab);localStorage.setItem('ros.query',ui.query||'')}catch(_){}};
const state=A.state;
const customerOf=id=>state.customers.find(x=>x.id===id);
const projectOf=id=>state.projects.find(x=>x.id===id);
const functionOf=id=>state.functions.find(x=>x.id===id);
const projectFunctions=p=>state.functions.filter(x=>x.project_id===p.id);
const projectServices=p=>state.projectServices.filter(x=>x.project_id===p.id);
const projectVendors=p=>state.vendorBookings.filter(x=>x.project_id===p.id);
const projectCrew=p=>state.projectTeam.filter(x=>x.project_id===p.id);
const projectPayments=p=>state.payments.filter(x=>x.project_id===p.id);
const projectJobs=p=>state.productionJobs.filter(x=>x.project_id===p.id);
const projectFiles=p=>state.eventFiles.filter(x=>x.project_id===p.id);
const booked=p=>p?.status==='booked';
const toast=(msg,error=false)=>{const n=$('#toast');if(!n)return;n.textContent=msg;n.className='toast show'+(error?' error':'');clearTimeout(window.__rosToast);window.__rosToast=setTimeout(()=>n.className='toast',2800)};
const safe=async(fn)=>{try{return await fn()}catch(e){toast(e?.message||'Action failed',true);return null}};
const todayAD=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const o={};f.forEach(x=>{if(x.type!=='literal')o[x.type]=x.value});return `${o.year}-${o.month}-${o.day}`};
const fmt2=n=>String(n).padStart(2,'0');
const fmtBs=o=>o?`${o.year}-${fmt2(+o.month+1)}-${fmt2(o.date)}`:'';
const parts=v=>{const m=String(v||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?{year:+m[1],month:+m[2],date:+m[3]}:null};
const adOfBs=bs=>{try{const p=parts(bs);if(!p)throw new Error('Invalid BS date');const d=new NP(bs);const b=d.getBS();if(!b||+b.year!==p.year||+b.month+1!==p.month||+b.date!==p.date)throw new Error('Invalid BS date');const a=d.getAD();return `${a.year}-${fmt2(a.month)}-${fmt2(a.date)}`}catch(_){return''}};
const bsOfAd=ad=>{try{const p=parts(String(ad||'').slice(0,10));if(!p)throw new Error('Invalid AD date');const js=new Date(Date.UTC(p.year,p.month-1,p.date));const d=NP.fromAD?NP.fromAD(js):new NP(js);const b=d.getBS();return b?`${b.year}-${fmt2(+b.month+1)}-${fmt2(b.date)}`:''}catch(_){return''}};
const todayBS=()=>bsOfAd(todayAD());
const daysInBsMonth=(y,m)=>{try{const x=new NP(y,m-1,1);x.setDate(32);return x.getMonth()===m-1?x.getDate():32-x.getDate()}catch(_){return 0}};
const validDays=(y,m)=>{const count=daysInBsMonth(y,m);return Array.from({length:count},(_,i)=>i+1)};
// Numeric constructor reference kept for compatibility checks: new NP(y,m-1,d)
const picker=(id,value='')=>{const p=parts(value)||parts(todayBS())||{year:2083,month:5,date:1};const years=[];for(let y=1978;y<=2099;y++)years.push(y);const days=validDays(p.year,p.month);return `<div class="bs-picker" data-picker="${esc(id)}"><select data-bs-year aria-label="BS year"><option value="">Year</option>${years.map(y=>`<option value="${y}" ${y===p.year?'selected':''}>${y}</option>`).join('')}</select><select data-bs-month aria-label="BS month"><option value="">Month</option>${MONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===p.month?'selected':''}>${m}</option>`).join('')}</select><select data-bs-day aria-label="BS day"><option value="">Day</option>${days.map(d=>`<option value="${d}" ${d===p.date?'selected':''}>${d}</option>`).join('')}</select><input type="hidden" data-bs-value id="${esc(id)}" value="${esc(fmtBs(p))}"><small>BS · Bikram Sambat</small></div>`};
const pickerValue=id=>$(`[data-picker="${CSS.escape(id)}"] [data-bs-value]`)?.value||'';
const bindPickers=root=>{$$('.bs-picker',root).forEach(box=>{const y=$('[data-bs-year]',box),m=$('[data-bs-month]',box),d=$('[data-bs-day]',box),hidden=$('[data-bs-value]',box);const syncYM=()=>{const yy=+y.value,mm=+m.value;if(!yy||!mm){d.innerHTML='<option value="">Day</option>';hidden.value='';return}const days=validDays(yy,mm);const current=+d.value;const keep=days.includes(current)?current:0;d.innerHTML='<option value="">Day</option>'+days.map(v=>`<option value="${v}"${v===keep?' selected':''}>${v}</option>`).join('');d.value=keep?String(keep):'';hidden.value=keep?`${yy}-${String(mm).padStart(2,'0')}-${String(keep).padStart(2,'0')}`:''};[y,m].forEach(x=>x.addEventListener('change',syncYM));d.addEventListener('change',()=>{const yy=+y.value,mm=+m.value,dd=+d.value;if(yy&&mm&&dd&&validDays(yy,mm).includes(dd))hidden.value=`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;else hidden.value=''});syncYM()});};
const modal=(title,body,actions='')=>{const b=$('#backdrop'),m=$('#modal');m.innerHTML=`<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>${esc(title)}</h2></div><button class="close-btn" type="button" data-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" type="button" data-action="close">Cancel</button>${actions}</div>`;b.classList.add('show');bindPickers(m);m.querySelectorAll('[data-action="close"]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeModal()}));};
const closeModal=()=>{const b=$('#backdrop');if(b)b.classList.remove('show');};
const field=(label,id,type='text',value='',extra='')=>`<label class="field"><span>${esc(label)}</span><input id="${esc(id)}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;
const textarea=(label,id,value='')=>`<label class="field full"><span>${esc(label)}</span><textarea id="${esc(id)}">${esc(value??'')}</textarea></label>`;
const select=(label,id,opts,value='')=>`<label class="field"><span>${esc(label)}</span><select id="${esc(id)}">${opts.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`}).join('')}</select></label>`;
const dateField=(label,id,value='')=>`<label class="field full"><span>${esc(label)}</span>${picker(id,value)}</label>`;
const status=v=>`<span class="status">${esc(STATUS[v]||v||'—')}</span>`;
const empty=(title,note='No records yet.')=>`<div class="empty"><div class="empty-icon">⌁</div><b>${esc(title)}</b><span>${esc(note)}</span></div>`;
const pageHead=(eyebrow,title,sub,actions='')=>`<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="actions">${actions}</div></div>`;
const metric=(a,b,c)=>`<div class="metric"><small>${esc(a)}</small><strong>${b}</strong><em>${esc(c)}</em></div>`;
const notice=(t,c='')=>`<div class="notice ${c}">${esc(t)}</div>`;
const routeMap={home:homePage,inquiries:inquiriesPage,events:eventsPage,clients:clientsPage,'booked-clients':bookedClientsPage,freelancers:freelancersPage,finance:financePage,files:filesPage,drive:drivePage,'photo-edit':()=>trackerPage('photo'),'video-edit':()=>trackerPage('video'),deliverables:deliverablesPage,settings:settingsPage};
function icon(k){return({home:'⌂',inquiries:'✉',events:'▦',clients:'♙','booked-clients':'✓',freelancers:'✣',finance:'₨',files:'□',drive:'◫','photo-edit':'▧','video-edit':'▣',deliverables:'◇',settings:'⚙'})[k]||'•'}
function renderShell(){const nav=$('#nav');nav.innerHTML=NAV.map(g=>`<div class="nav-group"><div class="nav-label">${esc(g.section)}</div>${g.items.map(([k,l])=>`<button type="button" class="nav-item ${!ui.project&&ui.page===k?'active':''}" data-route="${k}"><span class="nav-ico">${icon(k)}</span><span>${esc(l)}</span></button>`).join('')}</div>`).join('');const crumb=ui.project?'Event Workspace':NAV.flatMap(x=>x.items).find(x=>x[0]===ui.page)?.[1]||'Home';$('#crumb').textContent=crumb;const u=state.user;$('#userName').textContent=u?(state.profile?.full_name||u.email?.split('@')[0]||'Owner'):'Offline';$('#userRole').textContent=u?(state.profile?.role||'Owner'):'Sign in'}
function render(){renderShell();const page=$('#page');page.innerHTML=ui.project?projectPage():routeMap[ui.page]?.()||homePage();saveUI()}
function homePage(){const open=state.inquiries.filter(i=>!['lost','cancelled','booking_cancelled','booked','booked_elsewhere'].includes(i.status)).length;const bp=state.projects.filter(booked).length;const received=state.payments.filter(x=>x.direction==='in').reduce((a,x)=>a+Number(x.amount||0),0);const upcoming=state.functions.filter(x=>x.event_date_bs).slice(0,6);const due=state.reminders.filter(x=>x.status==='open').slice(0,5);return pageHead('RACHNA + AAVARTAN','Business Command Center','Run the business from enquiry to event day.',`<button type="button" class="btn" data-action="quick-action">⚡ Quick action</button><button type="button" class="btn primary" data-action="new-inquiry">＋ New enquiry</button>`)+`<div class="metrics">${metric('Open enquiries',open,'Sales pipeline')}${metric('Booked events',bp,'Manual booking status')}${metric('Cash received',money(received),'Customer payments')}${metric('Upcoming functions',upcoming.length,'BS calendar')}</div><div class="dashboard-grid"><section class="panel"><div class="panel-title"><div><div class="eyebrow">SALES</div><h2>Enquiry pipeline</h2><p>Move enquiries forward without changing booking automatically.</p></div><button type="button" class="link" data-route="inquiries">Open enquiries →</button></div><div class="pipeline-mini">${INQUIRY_STAGES.slice(0,8).map(([k,l])=>`<button type="button" data-action="filter-inquiry" data-stage="${k}"><span>${esc(l)}</span><b>${state.inquiries.filter(x=>x.status===k).length}</b></button>`).join('')}</div></section><section class="panel"><div class="panel-title"><div><div class="eyebrow">CALENDAR</div><h2>Upcoming functions</h2><p>All dates shown in BS.</p></div><button type="button" class="link" data-route="events">Open events →</button></div>${upcoming.map(f=>{const p=projectOf(f.project_id);return `<div class="mini-row"><div><b>${esc(f.name)}</b><small>${esc(f.event_date_bs||'Date TBC')} · ${esc(f.venue||'Venue TBC')}</small></div><button type="button" class="btn tiny" data-action="open-project" data-id="${f.project_id}">Open</button></div>`}).join('')||empty('No upcoming functions')}</section></div><div class="dashboard-grid second"><section class="panel"><div class="panel-title"><div><div class="eyebrow">REMINDERS</div><h2>Attention</h2><p>Open work that needs follow-up.</p></div><button type="button" class="btn" data-action="new-reminder">＋ Reminder</button></div>${due.map(r=>`<div class="mini-row"><div><b>${esc(r.title)}</b><small>${r.due_at?bsOfAd(String(r.due_at).slice(0,10)):'No date'}</small></div><button type="button" class="btn tiny" data-action="done-reminder" data-id="${r.id}">Done</button></div>`).join('')||empty('No open reminders')}</section><section class="panel"><div class="panel-title"><div><div class="eyebrow">FINANCE</div><h2>Cash overview</h2><p>Record customer receipts and business costs.</p></div><button type="button" class="link" data-route="finance">Finance →</button></div><div class="summary-bar"><span><b>${money(received)}</b> received</span><span><b>${money(state.expenses.reduce((a,x)=>a+Number(x.amount||0),0))}</b> expenses</span><span><b>${state.vendors.length}</b> vendors</span></div></section></div>`}
function inquiriesPage(){const q=ui.query.toLowerCase();const rows=state.inquiries.filter(i=>{const c=customerOf(i.customer_id);return !q||[i.event_name,i.source,i.status,c?.name,c?.phone].some(v=>String(v||'').toLowerCase().includes(q))});return pageHead('CRM','Enquiries','Every lead is editable, removable and connected to the Event ID.',`<input class="search" id="globalSearch" value="${esc(ui.query)}" placeholder="Search client, event or source"><button type="button" class="btn primary" data-action="new-inquiry">＋ New enquiry</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Client</th><th>Event</th><th>BS date</th><th>Source</th><th>Stage</th><th></th></tr></thead><tbody>${rows.map(i=>{const c=customerOf(i.customer_id);return `<tr><td><b>${esc(c?.name||'—')}</b><small>${esc(c?.phone||'')}</small></td><td><b>${esc(i.event_name)}</b><small>${esc(i.venue||'Venue TBC')}</small></td><td>${esc(i.event_date_bs||'Date TBC')}</td><td>${esc(i.source||'Other')}</td><td>${status(i.status)}</td><td class="row-actions"><button type="button" class="btn tiny" data-action="edit-inquiry" data-id="${i.id}">Edit</button><button type="button" class="btn tiny" data-action="convert-inquiry" data-id="${i.id}">Create event</button><button type="button" class="btn tiny danger" data-action="delete-inquiry" data-id="${i.id}">Delete</button></td></tr>`}).join('')||`<tr><td colspan="6">${empty('No enquiries','Create your first enquiry.')}</td></tr>`}</tbody></table></div>`}
function eventsPage(){const q=ui.query.toLowerCase();const rows=state.projects.filter(p=>!q||[p.event_code,p.name,p.brand,customerOf(p.customer_id)?.name].some(v=>String(v||'').toLowerCase().includes(q)));return pageHead('EVENT MANAGEMENT','Events','The Event ID is the spine for every department.',`<input class="search" id="globalSearch" value="${esc(ui.query)}" placeholder="Search Event ID, client or event"><button type="button" class="btn primary" data-action="new-project">＋ New event</button>`)+`<div class="summary-bar"><span><b>${rows.length}</b> events</span><span><b>${state.projects.filter(booked).length}</b> booked</span><span><b>${money(state.projects.reduce((a,p)=>a+Number(p.quoted_total||0),0))}</b> quoted</span><span><b>${money(state.projects.reduce((a,p)=>a+Number(p.customer_advance||0),0))}</b> received</span></div><div class="panel table-panel"><table><thead><tr><th>Event ID</th><th>Client / Event</th><th>BS date</th><th>Status</th><th>Quoted</th><th>Paid</th><th>Balance</th><th></th></tr></thead><tbody>${rows.map(p=>{const c=customerOf(p.customer_id),fs=projectFunctions(p),bs=fs.find(f=>f.event_date_bs)?.event_date_bs||'Date TBC',bal=Math.max(0,Number(p.quoted_total||0)-Number(p.customer_advance||0));return `<tr><td><b class="event-code">${esc(p.event_code||'Generating…')}</b><small>${esc(p.brand||'Rachna + Aavartan')}</small></td><td><b>${esc(p.name)}</b><small>${esc(c?.name||'No client')}</small></td><td>${esc(bs)}</td><td>${status(p.status)}</td><td>${money(p.quoted_total)}</td><td>${money(p.customer_advance)}</td><td>${money(bal)}</td><td><button type="button" class="btn tiny" data-action="open-project" data-id="${p.id}">Open</button></td></tr>`}).join('')||`<tr><td colspan="8">${empty('No events')}</td></tr>`}</tbody></table></div>`}
function clientsPage(){const rows=state.customers;return pageHead('CLIENTS','All Clients','One customer master shared across Rachna and Aavartan.',`<button type="button" class="btn primary" data-action="new-client">＋ New client</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Name</th><th>Phone</th><th>WhatsApp</th><th>Email</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone||'—')}</td><td>${esc(c.whatsapp||c.phone||'—')}</td><td>${esc(c.email||'—')}</td><td><button type="button" class="btn tiny" data-action="edit-client" data-id="${c.id}">Edit</button><button type="button" class="btn tiny danger" data-action="delete-client" data-id="${c.id}">Delete</button></td></tr>`).join('')||`<tr><td colspan="5">${empty('No clients')}</td></tr>`}</tbody></table></div>`}
function bookedClientsPage(){const rows=state.projects.filter(booked);return pageHead('CLIENTS','Booked Clients','Events whose status is explicitly set to Booked.',`<button type="button" class="btn" data-route="events">All events →</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Event ID</th><th>Client</th><th>Event</th><th>BS date</th><th>Status</th></tr></thead><tbody>${rows.map(p=>{const c=customerOf(p.customer_id),f=projectFunctions(p).find(x=>x.event_date_bs);return `<tr><td><b>${esc(p.event_code||'—')}</b></td><td>${esc(c?.name||'—')}</td><td>${esc(p.name)}</td><td>${esc(f?.event_date_bs||'Date TBC')}</td><td>${status(p.status)}</td></tr>`}).join('')||`<tr><td colspan="5">${empty('No booked events')}</td></tr>`}</tbody></table></div>`}
function freelancersPage(){return pageHead('TEAM','My Freelancers','Crew master and event assignment register.',`<button type="button" class="btn primary" data-action="new-team">＋ Add crew</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>${state.team.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.role||'—')}</td><td>${esc(t.phone||'—')}</td><td>${t.active===false?'Inactive':'Active'}</td><td><button type="button" class="btn tiny" data-action="edit-team" data-id="${t.id}">Edit</button></td></tr>`).join('')||`<tr><td colspan="5">${empty('No crew members')}</td></tr>`}</tbody></table></div>`}
function financePage(){const incoming=state.payments.filter(x=>x.direction==='in').reduce((a,x)=>a+Number(x.amount||0),0);const outgoing=state.payments.filter(x=>x.direction==='out').reduce((a,x)=>a+Number(x.amount||0),0)+state.expenses.reduce((a,x)=>a+Number(x.amount||0),0);return pageHead('FINANCE','Finance Manager','Customer receipts, vendor payments and business expenses.',`<button type="button" class="btn primary" data-action="new-payment">＋ Customer payment</button><button type="button" class="btn" data-action="new-expense">＋ Expense</button>`)+`<div class="metrics">${metric('Money in',money(incoming),'Customer payments')}${metric('Money out',money(outgoing),'Payments + expenses')}${metric('Net cash',money(incoming-outgoing),'Recorded movement')}</div><div class="dashboard-grid"><section class="panel"><h2>Recent payments</h2>${state.payments.slice(0,12).map(x=>{const p=projectOf(x.project_id);return `<div class="mini-row"><div><b>${money(x.amount)} · ${x.direction==='in'?'Received':'Paid'}</b><small>${esc(p?.event_code||'General')} · ${esc(bsOfAd(x.payment_date||'')||'Date TBC')}</small></div></div>`}).join('')||empty('No payments')}</section><section class="panel"><h2>Recent expenses</h2>${state.expenses.slice(0,12).map(x=>`<div class="mini-row"><div><b>${money(x.amount)} · ${esc(x.category||'Other')}</b><small>${esc(bsOfAd(x.expense_date||'')||'Date TBC')} · ${esc(x.description||'Expense')}</small></div></div>`).join('')||empty('No expenses')}</section></div>`}
function filesPage(){return pageHead('STORAGE','File Management','Links and files attached to Event IDs.',`<button type="button" class="btn primary" data-action="new-file">＋ Add file link</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Event</th><th>Name</th><th>Type</th><th>Link</th><th></th></tr></thead><tbody>${state.eventFiles.map(f=>{const p=projectOf(f.project_id);return `<tr><td>${esc(p?.event_code||'—')}</td><td>${esc(f.name)}</td><td>${esc(f.kind||'link')}</td><td>${f.url?`<a href="${esc(f.url)}" target="_blank" rel="noopener">Open</a>`:'—'}</td><td><button type="button" class="btn tiny" data-action="edit-file" data-id="${f.id}">Edit</button><button type="button" class="btn tiny danger" data-action="delete-file" data-id="${f.id}">Delete</button></td></tr>`}).join('')||`<tr><td colspan="5">${empty('No files')}</td></tr>`}</tbody></table></div>`}
function drivePage(){return pageHead('STORAGE','Event Drive','Fast landing page to every Event ID workspace.',`<button type="button" class="btn primary" data-action="new-project">＋ New event</button>`)+`<div class="grid3">${state.projects.map(p=>`<button type="button" class="jump-card" data-action="open-project" data-id="${p.id}"><b>${esc(p.event_code||'Event')}</b><span>${esc(p.name)}</span><i>${esc(customerOf(p.customer_id)?.name||'')}</i></button>`).join('')||empty('No events')}</div>`}
function trackerPage(kind){const jobs=state.productionJobs.filter(j=>String(j.tracker_type||j.job_type||'').toLowerCase()===kind);const stages=kind==='photo'?['Received','Culling','Selection','Editing','QC','Export','Delivered']:['Received','Rough Cut','Review','Fine Cut','Color','Audio','Delivered'];return pageHead('PRODUCTION',kind==='photo'?'Photo Edit Tracker':'Video Edit Tracker',`Track ${kind} work by stage. Dates are BS only.`,`<button type="button" class="btn primary" data-action="new-production" data-kind="${kind}">＋ New job</button>`)+`<div class="grid3">${stages.map(s=>`<section class="panel"><div class="eyebrow">${esc(s)}</div>${jobs.filter(j=>j.stage===s).map(j=>{const p=projectOf(j.project_id);return `<div class="mini-row"><div><b>${esc(j.title)}</b><small>${esc(p?.event_code||'')} · ${esc(bsOfAd(j.due_date||'')||'No date')}</small></div><button type="button" class="btn tiny" data-action="edit-production" data-id="${j.id}">Edit</button></div>`}).join('')||empty('None')}</section>`).join('')}</div>`}
function deliverablesPage(){return pageHead('PRODUCTION','Album & Pen Drive','Aavartan delivery commitments by Event ID.',`<button type="button" class="btn primary" data-action="new-deliverable">＋ New deliverable</button>`)+`<div class="panel table-panel"><table><thead><tr><th>Event</th><th>Deliverable</th><th>BS due</th><th>Status</th><th></th></tr></thead><tbody>${state.deliverables.map(d=>{const p=projectOf(d.project_id);return `<tr><td>${esc(p?.event_code||'—')}</td><td>${esc(d.deliverable)}</td><td>${esc(bsOfAd(d.due_date||'')||'Date TBC')}</td><td>${status(d.status)}</td><td><button type="button" class="btn tiny" data-action="edit-deliverable" data-id="${d.id}">Edit</button></td></tr>`}).join('')||`<tr><td colspan="5">${empty('No deliverables')}</td></tr>`}</tbody></table></div>`}
function settingsPage(){return pageHead('WORKSPACE','Settings','Account and system controls.',`<button type="button" class="btn" data-action="refresh">↻ Refresh data</button>`)+`<div class="dashboard-grid"><section class="panel"><div class="eyebrow">ACCOUNT</div><h2>${esc(state.profile?.full_name||state.user?.email||'Owner')}</h2><p>${esc(state.profile?.role||'Owner')} · ${esc(state.org?.name||'Rachna Workspace')}</p><button type="button" class="btn danger" data-action="sign-out">Sign out</button></section><section class="panel"><div class="eyebrow">SYSTEM</div><h2>BS calendar</h2><p>All user-facing business dates are selected from Nepali calendar dropdowns. AD is internal only.</p><button type="button" class="btn primary" data-action="date-check">Open Date Check</button></section></div>`}
function overviewTab(p,fs,sv,vp,pt,jobs){return `<div class="grid3"><section class="panel"><div class="eyebrow">EVENT PLAN</div><h2>${fs.length} Functions</h2>${fs.map(f=>`<div class="list-card"><b>${esc(f.name)}</b><small>${esc(f.event_date_bs||'Date TBC')} · ${esc(f.venue||'Venue TBC')}</small></div>`).join('')||empty('No functions')}</section><section class="panel"><div class="eyebrow">SERVICE SCOPE</div><h2>${sv.length} Services</h2>${sv.map(s=>`<div class="list-card"><b>${esc(s.name)}</b><small>${money(s.customer_price)} customer</small></div>`).join('')||empty('No services')}</section><section class="panel"><div class="eyebrow">CONNECTED WORK</div><h2>Live counts</h2><div class="summary-bar"><span><b>${vp.length}</b> vendors</span><span><b>${pt.length}</b> crew</span><span><b>${jobs.length}</b> production</span></div></section></div><section class="panel callout"><h2>Booking status is manual</h2><p>Advance payments are recorded separately. Mark the Event ID as Booked only when the business decision is made.</p><button type="button" class="btn primary" data-project-tab="money">Open money →</button></section>`}
function functionsTab(p,fs){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">EVENT TIMELINE</div><h2>Functions</h2><p>Every function has its own BS date, venue and guest count.</p></div><button type="button" class="btn primary" data-action="new-function" data-project="${p.id}">＋ Add function</button></div><div class="function-grid">${fs.map(f=>`<div class="function-card"><div class="date-tile"><b>${esc(f.event_date_bs||'—')}</b></div><div><h3>${esc(f.name)}</h3><p>${esc(f.venue||'Venue TBC')}</p><small>${esc(f.guest_count||0)} guests${f.start_time?' · '+esc(String(f.start_time).slice(0,5)):''}</small></div><div class="row-actions"><button type="button" class="btn tiny" data-action="edit-function" data-id="${f.id}">Edit</button><button type="button" class="btn tiny danger" data-action="delete-function" data-id="${f.id}">Delete</button></div></div>`).join('')||empty('No functions yet')}</div></section>`}
function servicesTab(p,sv){const services=state.services.filter(x=>x.active!==false);return `<section class="panel"><div class="section-head"><div><div class="eyebrow">SCOPE BUILDER</div><h2>Select only what this Event ID includes.</h2><p>Rachna and Aavartan can be added independently.</p></div><button type="button" class="btn primary" data-action="save-services" data-project="${p.id}">Save scope</button></div><div class="choice-grid">${services.map(s=>{const current=sv.find(x=>x.service_id===s.id);return `<label class="choice"><input type="checkbox" data-scope-service data-id="${s.id}" ${current?'checked':''}><span><b>${esc(s.name)}</b><small>${esc(s.brand||'Service')} · ${money(s.base_price)}</small></span><input class="scope-price" type="number" min="0" step="1" data-price-for="${s.id}" value="${current?Number(current.customer_price||0):Number(s.base_price||0)}" ${current?'':'disabled'}></label>`}).join('')||empty('No active services','Add services from your service catalogue.')}</div></section>`}
function quotationTab(p,qs,sv){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">QUOTATION</div><h2>Versions</h2><p>Create and revise quotes without touching booking status.</p></div><button type="button" class="btn primary" data-action="new-quote" data-project="${p.id}">＋ New quote</button></div>${qs.map(q=>`<div class="list-card"><div><b>Version ${esc(q.version||1)}</b><small>${status(q.status)} · ${money(q.customer_total)}</small></div><div class="row-actions"><button type="button" class="btn tiny" data-action="edit-quote" data-id="${q.id}">Edit</button><button type="button" class="btn tiny" data-action="add-quote-item" data-id="${q.id}">＋ Item</button></div></div>`).join('')||empty('No quotations')}</section>`}
function vendorsTab(p,rows,fs){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">VENDORS</div><h2>Vendor bookings</h2></div><button type="button" class="btn primary" data-action="new-vendor-booking" data-project="${p.id}">＋ Add vendor booking</button></div>${rows.map(v=>{const ven=state.vendors.find(x=>x.id===v.vendor_id),paid=Number(v.advance_paid||0)+Number(v.final_paid||0);return `<div class="list-card"><div><b>${esc(ven?.name||'Vendor')}</b><small>${esc(v.requirement||v.category||'Requirement')} · ${money(v.quoted_cost)} cost · ${money(paid)} paid</small></div><div class="row-actions"><button type="button" class="btn tiny" data-action="vendor-payment" data-id="${v.id}">Payment</button><button type="button" class="btn tiny" data-action="edit-vendor-booking" data-id="${v.id}">Edit</button></div></div>`}).join('')||empty('No vendor bookings')}</section>`}
function crewTab(p,rows,fs){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">CREW</div><h2>Event assignments</h2></div><button type="button" class="btn primary" data-action="assign-team" data-project="${p.id}">＋ Assign crew</button></div>${rows.map(r=>{const t=state.team.find(x=>x.id===r.team_member_id);return `<div class="list-card"><div><b>${esc(t?.name||'Crew')}</b><small>${esc(t?.role||'')} · ${money(r.rate)}</small></div><button type="button" class="btn tiny" data-action="edit-team-assignment" data-id="${r.id}">Edit</button></div>`}).join('')||empty('No crew assigned')}</section>`}
function projectMoneyTab(p,pay){const balance=Math.max(0,Number(p.quoted_total||0)-Number(p.customer_advance||0));return `<div class="metrics">${metric('Quoted',money(p.quoted_total),'Latest financial total')}${metric('Advance',money(p.customer_advance),'Customer received')}${metric('Balance',money(balance),'Remaining')}${metric('Status',STATUS[p.status]||p.status,'Manual Event ID status')}</div><section class="panel"><div class="section-head"><div><div class="eyebrow">BOOKING + CASH</div><h2>Financial controls</h2></div><div class="row-actions"><button type="button" class="btn primary" data-action="new-advance" data-project="${p.id}">＋ Record advance</button><button type="button" class="btn" data-action="new-payment" data-project="${p.id}">＋ Payment</button><button type="button" class="btn" data-action="new-expense" data-project="${p.id}">＋ Expense</button></div></div>${select('Event status','projectStatus',PROJECT_STATUS,p.status)}<button type="button" class="btn primary" data-action="save-project-status" data-project="${p.id}">Save status</button></section><section class="panel"><h2>Event transactions</h2>${pay.map(x=>`<div class="mini-row"><div><b>${esc(x.direction==='in'?'Received':'Paid')} · ${money(x.amount)}</b><small>${esc(x.method||'Method TBC')} · ${esc(bsOfAd(x.payment_date||'')||'Date TBC')}</small></div></div>`).join('')||empty('No transactions')}</section>`}
function productionTab(p,jobs,fs){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">AAVARTAN PRODUCTION</div><h2>Production jobs</h2></div><button type="button" class="btn primary" data-action="new-production" data-project="${p.id}">＋ New job</button></div>${jobs.map(j=>`<div class="list-card"><div><b>${esc(j.title)}</b><small>${esc(j.tracker_type||j.job_type||'photo')} · ${esc(j.stage||'Received')} · ${esc(bsOfAd(j.due_date||'')||'No date')}</small></div><div class="row-actions"><button type="button" class="btn tiny" data-action="edit-production" data-id="${j.id}">Edit</button><button type="button" class="btn tiny danger" data-action="delete-production" data-id="${j.id}">Delete</button></div></div>`).join('')||empty('No production jobs')}</section>`}
function filesTab(p,files){return `<section class="panel"><div class="section-head"><div><div class="eyebrow">EVENT DRIVE</div><h2>Files & links</h2></div><button type="button" class="btn primary" data-action="new-file" data-project="${p.id}">＋ Add file</button></div>${files.map(f=>`<div class="list-card"><div><b>${esc(f.name)}</b><small>${esc(f.kind||'link')}</small></div><div class="row-actions">${f.url?`<a class="btn tiny" href="${esc(f.url)}" target="_blank" rel="noopener">Open</a>`:''}<button type="button" class="btn tiny" data-action="edit-file" data-id="${f.id}">Edit</button><button type="button" class="btn tiny danger" data-action="delete-file" data-id="${f.id}">Delete</button></div></div>`).join('')||empty('No files')}</section>`}
function projectPage(){const p=projectOf(ui.project);if(!p){ui.project=null;saveUI();return homePage()}const c=customerOf(p.customer_id),fs=projectFunctions(p),sv=projectServices(p),vp=projectVendors(p),pt=projectCrew(p),pay=projectPayments(p),jobs=projectJobs(p),files=projectFiles(p),tabs=[['overview','Overview'],['functions','Functions'],['services','Services'],['quotation','Quotation'],['vendors','Vendors'],['crew','Crew'],['money','Money'],['production','Production'],['files','Files']];return `<div class="event-head"><button type="button" class="back-btn" data-action="back-events">←</button><div><div class="eyebrow">EVENT ID</div><h1>${esc(p.event_code||'Event')}</h1><p>${esc(p.name)} · ${esc(c?.name||'No client')} · ${esc(c?.phone||'')}</p></div><div class="event-actions"><button type="button" class="btn" data-action="edit-project" data-id="${p.id}">Edit event</button><button type="button" class="btn" data-action="new-reminder" data-project="${p.id}">Reminder</button><button type="button" class="btn" data-action="new-advance" data-project="${p.id}">Advance</button></div></div><div class="event-summary"><div><small>Customer</small><b>${esc(c?.name||'—')}</b><span>${esc(c?.phone||'')}</span></div><div><small>Functions</small><b>${fs.length}</b><span>${esc(fs.map(f=>f.name).slice(0,2).join(' · ')||'Not added')}</span></div><div><small>Quoted</small><b>${money(p.quoted_total)}</b><span>Advance ${money(p.customer_advance)}</span></div><div><small>Booking</small><b>${esc(STATUS[p.status]||p.status||'Planning')}</b><span>Manual status</span></div><div><small>BS event date</small><b>${esc(fs.find(f=>f.event_date_bs)?.event_date_bs||'Date TBC')}</b><span>BS calendar</span></div></div><div class="tabs">${tabs.map(([k,l])=>`<button type="button" class="${ui.tab===k?'active':''}" data-project-tab="${k}">${l}</button>`).join('')}</div>${ui.tab==='overview'?overviewTab(p,fs,sv,vp,pt,jobs):ui.tab==='functions'?functionsTab(p,fs):ui.tab==='services'?servicesTab(p,sv):ui.tab==='quotation'?quotationTab(p,state.quotations.filter(q=>q.project_id===p.id),sv):ui.tab==='vendors'?vendorsTab(p,vp,fs):ui.tab==='crew'?crewTab(p,pt,fs):ui.tab==='money'?projectMoneyTab(p,pay):ui.tab==='production'?productionTab(p,jobs,fs):filesTab(p,files)}`}
function dateCheckModal(){modal('Date Check',`<label class="field full"><span>Event date (BS)</span>${picker('date-check',todayBS())}<small>Select year, month and day. No typing is required.</small></label><div id="date-check-result">${notice('Select a BS date and check availability.')}</div>`,`<button type="button" class="btn primary" data-action="run-date-check">Check availability</button>`)}
function authModal(){modal('Sign in to Rachna OS',field('Email','authEmail','email','','autocomplete="email"')+field('Password','authPassword','password','','autocomplete="current-password"'),'<button type="button" class="btn primary" data-action="sign-in">Sign in</button><button type="button" class="btn" data-action="sign-up">Create account</button>')}
function quickActionModal(){modal('Quick action',`<div class="grid3"><button type="button" class="jump-card" data-action="new-inquiry"><b>New enquiry</b><span>Start CRM</span></button><button type="button" class="jump-card" data-action="new-project"><b>New event</b><span>Create Event ID</span></button><button type="button" class="jump-card" data-route="finance"><b>Finance</b><span>Record cash movement</span></button><button type="button" class="jump-card" data-route="freelancers"><b>Team</b><span>Assign crew</span></button><button type="button" class="jump-card" data-route="photo-edit"><b>Photo</b><span>Track editing</span></button><button type="button" class="jump-card" data-route="deliverables"><b>Delivery</b><span>Track deliverables</span></button></div>`)}
function inquiryModal(item){const c=item?customerOf(item.customer_id):null;modal(item?'Edit enquiry':'New enquiry',`<div class="form-grid">${field('Customer name','inqCustomer','text',c?.name||'')}${field('Phone','inqPhone','tel',c?.phone||'')}${field('WhatsApp','inqWhatsapp','tel',c?.whatsapp||c?.phone||'')}${field('Email','inqEmail','email',c?.email||'')}${field('Event name','inqEvent','text',item?.event_name||'')}${select('Inquiry source','inqSource',SOURCES,item?.source||'Other')}${select('Stage','inqStatus',INQUIRY_STAGES,item?.status||'new')}${dateField('Event date (BS)','inqDate',item?.event_date_bs||'')}${field('Venue','inqVenue','text',item?.venue||'')}${field('Guests','inqGuests','number',item?.guest_count||'')}${field('Budget (NPR)','inqBudget','number',item?.budget||'')}${textarea('Notes','inqNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-inquiry" data-id="${item?.id||''}">Save enquiry</button>`)}
function clientModal(item){modal(item?'Edit client':'New client',`<div class="form-grid">${field('Name','clientName','text',item?.name||'')}${field('Phone','clientPhone','tel',item?.phone||'')}${field('WhatsApp','clientWhatsapp','tel',item?.whatsapp||'')}${field('Email','clientEmail','email',item?.email||'')}${textarea('Notes','clientNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-client" data-id="${item?.id||''}">Save client</button>`)}
function projectModal(item){const customerOpts=state.customers.map(c=>[c.id,c.name+ (c.phone?' · '+c.phone:'')]);modal(item?'Edit event':'New event',`<div class="form-grid">${field('Event name','projectName','text',item?.name||'')}${select('Client','projectClient',[['','No client'],...customerOpts],item?.customer_id||'')}${select('Business','projectBrand',[['Rachna + Aavartan','Rachna + Aavartan'],['Rachna','Rachna'],['Aavartan','Aavartan']],item?.brand||'Rachna + Aavartan')}${select('Status','projectStatus',PROJECT_STATUS,item?.status||'planning')}${dateField('Primary event date (BS)','projectDate',item?.date_range_bs||'')}${field('First function','projectFunction','text','')}${dateField('First function date (BS)','projectFunctionDate','')}${field('Venue','projectVenue','text','')}${field('Guests','projectGuests','number','')}</div>`,`<button type="button" class="btn primary" data-action="save-project" data-id="${item?.id||''}">Save event</button>`)}
function functionModal(item,projectId){modal(item?'Edit function':'Add function',`<div class="form-grid">${field('Function name','fnName','text',item?.name||'')}${dateField('Function date (BS)','fnDate',item?.event_date_bs||'')}${field('Venue','fnVenue','text',item?.venue||'')}${field('Guests','fnGuests','number',item?.guest_count||'')}${field('Start time','fnTime','time',item?.start_time||'')}${textarea('Notes','fnNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-function" data-id="${item?.id||''}" data-project="${projectId}">Save function</button>`)}
function paymentModal(projectId){modal('Record payment',`<div class="form-grid">${select('Direction','payDirection',[['in','Customer received'],['out','Paid out']], 'in')}${field('Amount (NPR)','payAmount','number','')}${select('Method','payMethod',METHODS,'Cash')}${dateField('Payment date (BS)','payDate',todayBS())}${field('Reference','payRef','text','')}${textarea('Notes','payNotes','')}</div>`,`<button type="button" class="btn primary" data-action="save-payment" data-project="${projectId||''}">Save payment</button>`)}
function expenseModal(projectId){modal('Record expense',`<div class="form-grid">${select('Category','expCategory',['Vendor','Crew','Transport','Editing','Equipment','Marketing','Office','Other'],'Other')}${field('Amount (NPR)','expAmount','number','')}${select('Method','expMethod',METHODS,'Cash')}${dateField('Expense date (BS)','expDate',todayBS())}${field('Description','expDescription','text','Expense')}${textarea('Notes','expNotes','')}</div>`,`<button type="button" class="btn primary" data-action="save-expense" data-project="${projectId||''}">Save expense</button>`)}
function advanceModal(projectId){modal('Record customer advance',`<div class="form-grid">${field('Advance amount (NPR)','advAmount','number','')}${select('Method','advMethod',METHODS,'Cash')}${field('Reference','advRef','text','')}${textarea('Notes','advNotes','')}</div><p class="notice">Advance updates customer cash received only. Event booking status remains manual.</p>`,`<button type="button" class="btn primary" data-action="save-advance" data-project="${projectId||''}">Record advance</button>`)}
function teamModal(item){modal(item?'Edit crew':'Add crew',`<div class="form-grid">${field('Name','teamName','text',item?.name||'')}${select('Role','teamRole',ROLES,item?.role||'Other')}${field('Phone','teamPhone','tel',item?.phone||'')}${field('Email','teamEmail','email',item?.email||'')}${select('Status','teamActive',[['true','Active'],['false','Inactive']],String(item?.active!==false))}</div>`,`<button type="button" class="btn primary" data-action="save-team" data-id="${item?.id||''}">Save crew</button>`)}
function vendorBookingModal(item,projectId){const vendors=state.vendors.map(v=>[v.id,v.name+(v.phone?' · '+v.phone:'')]);const functions=projectOf(projectId)?projectFunctions(projectOf(projectId)).map(f=>[f.id,f.name]):[];modal(item?'Edit vendor booking':'Add vendor booking',`<div class="form-grid">${select('Vendor','vbVendor',vendors,item?.vendor_id||'')}${select('Function','vbFunction',[['','Project'],...functions],item?.function_id||'')}${field('Requirement','vbRequirement','text',item?.requirement||'')}${field('Category','vbCategory','text',item?.category||'')}${field('Client price (NPR)','vbClient','number',item?.client_price||'')}${field('Vendor cost (NPR)','vbCost','number',item?.quoted_cost||'')}${field('Quantity','vbQty','number',item?.quantity||1)}${select('Status','vbStatus',[['reserved','Reserved'],['confirmed','Confirmed'],['cancelled','Cancelled']],item?.status||'reserved')}${textarea('Notes','vbNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-vendor-booking" data-id="${item?.id||''}" data-project="${projectId}">Save booking</button>`)}
function vendorPaymentModal(item){modal('Vendor payment',`<div class="form-grid">${field('Amount (NPR)','vpAmount','number','')}${select('Method','vpMethod',METHODS,'Cash')}${field('Reference','vpRef','text','')}${select('Payment type','vpAdvance',[['true','Vendor advance'],['false','Vendor final']], 'false')}</div>`,`<button type="button" class="btn primary" data-action="save-vendor-payment" data-id="${item?.id||''}">Record payment</button>`)}
function assignCrewModal(projectId){const members=state.team.filter(t=>t.active!==false).map(t=>[t.id,t.name+' · '+(t.role||'')]);const functions=projectFunctions(projectOf(projectId)).map(f=>[f.id,f.name]);modal('Assign crew',`<div class="form-grid">${select('Crew member','assignMember',members,'')}${select('Function','assignFunction',[['','Project'],...functions],'')}${field('Rate (NPR)','assignRate','number','')}${field('Responsibility','assignResponsibility','text','')}</div>`,`<button type="button" class="btn primary" data-action="save-assignment" data-project="${projectId}">Assign</button>`)}
function productionModal(item,projectId,kind){const projects=state.projects.map(p=>[p.id,p.event_code+' · '+p.name]);const stage=(kind||item?.tracker_type||item?.job_type||'photo')==='photo'?['Received','Culling','Selection','Editing','QC','Export','Delivered']:['Received','Rough Cut','Review','Fine Cut','Color','Audio','Delivered'];modal(item?'Edit production job':'New production job',`<div class="form-grid">${select('Event ID','jobProject',projects,projectId||item?.project_id||'')}${select('Type','jobType',[['photo','Photo'],['video','Video']],kind||item?.tracker_type||item?.job_type||'photo')}${select('Stage','jobStage',stage,item?.stage||stage[0])}${field('Title','jobTitle','text',item?.title||'')}${dateField('Due date (BS)','jobDate',bsOfAd(item?.due_date||'')||todayBS())}${textarea('Notes','jobNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-production" data-id="${item?.id||''}">Save job</button>`)}
function deliverableModal(item){const projects=state.projects.map(p=>[p.id,p.event_code+' · '+p.name]);modal(item?'Edit deliverable':'New deliverable',`<div class="form-grid">${select('Event ID','delProject',projects,item?.project_id||'')}${field('Deliverable','delName','text',item?.deliverable||'')}${select('Status','delStatus',[['pending','Pending'],['in_progress','In progress'],['delivered','Delivered']],item?.status||'pending')}${dateField('Due date (BS)','delDate',bsOfAd(item?.due_date||'')||todayBS())}</div>`,`<button type="button" class="btn primary" data-action="save-deliverable" data-id="${item?.id||''}">Save deliverable</button>`)}
function fileModal(item,projectId){const projects=state.projects.map(p=>[p.id,p.event_code+' · '+p.name]);modal(item?'Edit file':'Add file link',`<div class="form-grid">${select('Event ID','fileProject',projects,projectId||item?.project_id||'')}${field('Name','fileName','text',item?.name||'')}${select('Type','fileKind',[['drive','Drive'],['link','Link'],['document','Document'],['folder','Folder']],item?.kind||'link')}${field('URL','fileUrl','url',item?.url||'')}${textarea('Notes','fileNotes',item?.notes||'')}</div>`,`<button type="button" class="btn primary" data-action="save-file" data-id="${item?.id||''}">Save file</button>`)}
function reminderModal(projectId){modal('New reminder',`<div class="form-grid">${field('Title','remTitle','text','')}${dateField('Due date (BS)','remDate',todayBS())}${field('Due time','remTime','time','09:00')}${select('Priority','remPriority',[['normal','Normal'],['high','High'],['urgent','Urgent']],'normal')}${textarea('Notes','remNotes','')}</div>`,`<button type="button" class="btn primary" data-action="save-reminder" data-project="${projectId||''}">Save reminder</button>`)}
function inquiryToProject(i){safe(async()=>{const p=await A.convertInquiry(i);ui.project=p.id;ui.page='events';ui.tab='overview';render();toast('Event ID created')})}
const HANDLERS={
 account:()=>{if(state.user){ui.project=null;ui.page='settings';ui.tab='overview';ui.query='';closeModal();render()}else authModal()},
 close:()=>closeModal(),
 'date-check':()=>dateCheckModal(),
 'run-date-check':async()=>{const bs=pickerValue('date-check'),ad=adOfBs(bs),out=$('#date-check-result');if(!bs||!ad){if(out)out.innerHTML=notice('Select a valid BS date.','error');return}if(out)out.innerHTML=notice('Checking…');const r=await safe(async()=>{const {data,error}=await A.sb.rpc('check_event_date_conflicts',{p_event_date:ad,p_exclude_project_id:null});if(error)throw error;return data||[]});if(!r)return;if(out)out.innerHTML=r.length?`<div class="warning-box"><b>${r.length} function${r.length===1?'':'s'} scheduled</b>${r.map(x=>`<div class="mini-row"><div><b>${esc(x.event_name||'Event')}</b><small>${esc(x.function_name||'Function')} · ${esc(x.venue||'Venue TBC')}</small></div></div>`).join('')}</div>`:`<div class="success-box"><b>Available</b><span>${esc(bs)} has no scheduled function.</span></div>`},
 'quick-action':()=>quickActionModal(),
 'new-inquiry':()=>inquiryModal(),
 'edit-inquiry':({id})=>inquiryModal(state.inquiries.find(x=>x.id===id)),
 'save-inquiry':async({id})=>{const data={customer_name:$('#inqCustomer').value,phone:$('#inqPhone').value,whatsapp:$('#inqWhatsapp').value,email:$('#inqEmail').value,event_name:$('#inqEvent').value,source:$('#inqSource').value,status:$('#inqStatus').value,event_date_bs:pickerValue('inqDate'),venue:$('#inqVenue').value,guest_count:$('#inqGuests').value,budget:$('#inqBudget').value,notes:$('#inqNotes').value};await safe(async()=>{if(id)await A.updateInquiry(id,{event_name:data.event_name,source:data.source,status:data.status,event_date_bs:data.event_date_bs||null,venue:data.venue||null,guest_count:data.guest_count?Number(data.guest_count):null,budget:data.budget?Number(data.budget):null,notes:data.notes||null});else await A.createInquiry(data);closeModal();render();toast(id?'Enquiry updated':'Enquiry created')})},
 'delete-inquiry':async({id})=>{if(!confirm('Delete this enquiry?'))return;await safe(async()=>{await A.remove('inquiries',id);render();toast('Enquiry deleted')})},
 'convert-inquiry':({id})=>{const i=state.inquiries.find(x=>x.id===id);if(i)inquiryToProject(i)},
 'filter-inquiry':({stage})=>{ui.page='inquiries';ui.query=stage||'';render()},
 'new-client':()=>clientModal(),
 'edit-client':({id})=>clientModal(customerOf(id)),
 'save-client':async({id})=>{const row={name:$('#clientName').value.trim(),phone:$('#clientPhone').value.trim(),whatsapp:$('#clientWhatsapp').value.trim(),email:$('#clientEmail').value.trim(),notes:$('#clientNotes').value.trim()};await safe(async()=>{if(id)await A.update('customers',id,row);else await A.createCustomer(row);closeModal();render();toast('Client saved')})},
 'delete-client':async({id})=>{if(!confirm('Delete this client? Linked records may prevent deletion.'))return;await safe(async()=>{await A.remove('customers',id);render();toast('Client deleted')})},
 'new-project':()=>projectModal(),
 'edit-project':({id})=>projectModal(projectOf(id)),
 'save-project':async({id})=>{const bs=pickerValue('projectDate'),fbs=pickerValue('projectFunctionDate'),row={name:$('#projectName').value.trim(),customer_id:$('#projectClient').value||null,brand:$('#projectBrand').value,status:$('#projectStatus').value,date_range_bs:bs||null};await safe(async()=>{let p;if(id){await A.updateProject(id,row);p=projectOf(id)}else{p=await A.insertProject({...row,function_name:$('#projectFunction').value,event_date_bs:fbs||bs||null,event_date:(fbs||bs?adOfBs(fbs||bs)||null:null),venue:$('#projectVenue').value,guest_count:$('#projectGuests').value});}closeModal();if(p){ui.project=p.id;ui.page='events';ui.tab='overview'}render();toast(id?'Event updated':'Event created')})},
 'open-project':({id})=>{ui.project=id;ui.page='events';ui.tab='overview';closeModal();render()},
 'back-events':()=>{ui.project=null;ui.page='events';render()},
 'new-function':({project})=>functionModal(null,project||ui.project),
 'edit-function':({id})=>{const f=functionOf(id);if(f)functionModal(f,f.project_id)},
 'save-function':async({id,project})=>{const row={name:$('#fnName').value.trim(),event_date_bs:pickerValue('fnDate')||null,event_date:(pickerValue('fnDate')?adOfBs(pickerValue('fnDate')):null),venue:$('#fnVenue').value.trim(),guest_count:$('#fnGuests').value?Number($('#fnGuests').value):null,start_time:$('#fnTime').value||null,notes:$('#fnNotes').value.trim()};await safe(async()=>{if(id)await A.updateFunction(id,row);else await A.addFunction(project||ui.project,row);closeModal();render();toast('Function saved')})},
 'delete-function':async({id})=>{if(!confirm('Delete this function?'))return;await safe(async()=>{await A.deleteFunction(id);render();toast('Function deleted')})},
 'save-services':async({project})=>{const p=projectOf(project||ui.project),checks=$$('[data-scope-service]:checked'),rows=checks.map(c=>{const id=c.dataset.id,s=state.services.find(x=>x.id===id),price=$(`[data-price-for="${CSS.escape(id)}"]`)?.value;return{project_id:p.id,service_id:id,name:s?.name||'Service',customer_price:Number(price||0),internal_cost:Number(s?.internal_cost||0),quantity:1}});await safe(async()=>{await A.saveProjectServiceScope(p.id,rows);render();toast('Service scope saved')})},
 'new-quote':({project})=>safe(async()=>{await A.createQuotation(project||ui.project);render();toast('Quotation created')}),
 'edit-quote':({id})=>{const q=state.quotations.find(x=>x.id===id);if(!q)return;modal('Edit quotation',select('Status','qStatus',[['draft','Draft'],['sent','Sent'],['accepted','Accepted'],['rejected','Rejected']],q.status||'draft')+field('Notes','qNotes','text',q.notes||''),`<button type="button" class="btn primary" data-action="save-quote" data-id="${id}">Save quotation</button>`)},
 'save-quote':async({id})=>safe(async()=>{await A.updateQuotation(id,{status:$('#qStatus').value,notes:$('#qNotes').value},ui.project);closeModal();render();toast('Quotation updated')}),
 'add-quote-item':({id})=>modal('Add quotation item',field('Description','qiDescription','text','')+field('Quantity','qiQty','number','1')+field('Customer price (NPR)','qiPrice','number','')+field('Internal cost (NPR)','qiCost','number',''),`<button type="button" class="btn primary" data-action="save-quote-item" data-id="${id}">Add item</button>`),
 'save-quote-item':async({id})=>safe(async()=>{await A.addQuoteItem(id,{description:$('#qiDescription').value,quantity:Number($('#qiQty').value||1),customer_price:Number($('#qiPrice').value||0),internal_cost:Number($('#qiCost').value||0)});closeModal();render();toast('Quotation item added')}),
 'new-vendor-booking':({project})=>vendorBookingModal(null,project||ui.project),
 'edit-vendor-booking':({id})=>{const v=state.vendorBookings.find(x=>x.id===id);if(v)vendorBookingModal(v,v.project_id)},
 'save-vendor-booking':async({id,project})=>{const x={project_id:project||ui.project,vendor_id:$('#vbVendor').value,function_id:$('#vbFunction').value||null,requirement:$('#vbRequirement').value,category:$('#vbCategory').value,client_price:Number($('#vbClient').value||0),quoted_cost:Number($('#vbCost').value||0),quantity:Number($('#vbQty').value||1),status:$('#vbStatus').value,notes:$('#vbNotes').value};await safe(async()=>{if(id)await A.updateVendorBooking(id,x,x.project_id);else await A.addVendorBooking(x);closeModal();render();toast('Vendor booking saved')})},
 'vendor-payment':({id})=>vendorPaymentModal(state.vendorBookings.find(x=>x.id===id)),
 'save-vendor-payment':async({id})=>safe(async()=>{await A.payVendorBooking(id,Number($('#vpAmount').value||0),$('#vpMethod').value,$('#vpRef').value,$('#vpAdvance').value==='true');closeModal();render();toast('Vendor payment recorded')}),
 'new-team':()=>teamModal(),
 'edit-team':({id})=>{const t=state.team.find(x=>x.id===id);if(t)teamModal(t)},
 'save-team':async({id})=>{const row={name:$('#teamName').value.trim(),role:$('#teamRole').value,phone:$('#teamPhone').value.trim(),email:$('#teamEmail').value.trim(),active:$('#teamActive').value==='true'};await safe(async()=>{if(id)await A.updateTeam(id,row);else await A.addTeam(row);closeModal();render();toast('Crew saved')})},
 'assign-team':({project})=>assignCrewModal(project||ui.project),
 'save-assignment':async({project})=>safe(async()=>{await A.assignTeam({project_id:project||ui.project,team_member_id:$('#assignMember').value,function_id:$('#assignFunction').value||null,rate:Number($('#assignRate').value||0),responsibility:$('#assignResponsibility').value});closeModal();render();toast('Crew assigned')}),
 'edit-team-assignment':({id})=>{const a=state.projectTeam.find(x=>x.id===id);if(!a)return;modal('Edit crew assignment',field('Rate (NPR)','assignRate','number',a.rate||0)+field('Responsibility','assignResponsibility','text',a.responsibility||''),`<button type="button" class="btn primary" data-action="save-team-assignment" data-id="${id}">Save assignment</button>`)},
 'save-team-assignment':async({id})=>safe(async()=>{const a=state.projectTeam.find(x=>x.id===id);await A.updateProjectTeam(id,{rate:Number($('#assignRate').value||0),responsibility:$('#assignResponsibility').value},a?.project_id);closeModal();render();toast('Assignment updated')}),
 'new-payment':({project})=>paymentModal(project||ui.project),
 'save-payment':async({project})=>safe(async()=>{const bs=pickerValue('payDate');await A.recordPayment({project_id:project||ui.project||null,direction:$('#payDirection').value,amount:Number($('#payAmount').value||0),method:$('#payMethod').value,payment_date:(bs?adOfBs(bs)||null:null),reference:$('#payRef').value,notes:$('#payNotes').value});closeModal();render();toast('Payment saved')}),
 'new-expense':({project})=>expenseModal(project||ui.project),
 'save-expense':async({project})=>safe(async()=>{const bs=pickerValue('expDate');await A.recordExpense({project_id:project||ui.project||null,category:$('#expCategory').value,amount:Number($('#expAmount').value||0),method:$('#expMethod').value,expense_date:(bs?adOfBs(bs)||null:null),description:$('#expDescription').value,notes:$('#expNotes').value});closeModal();render();toast('Expense saved')}),
 'new-advance':({project})=>advanceModal(project||ui.project),
 'save-advance':async({project})=>safe(async()=>{await A.recordAdvance(project||ui.project,Number($('#advAmount').value||0),$('#advMethod').value,$('#advRef').value);closeModal();render();toast('Advance recorded')}),
 'save-project-status':async({project})=>safe(async()=>{await A.setProjectStatus(project||ui.project,$('#projectStatus').value);render();toast('Event status updated')}),
 'new-file':({project})=>fileModal(null,project||ui.project),
 'edit-file':({id})=>{const f=state.eventFiles.find(x=>x.id===id);if(f)fileModal(f,f.project_id)},
 'save-file':async({id})=>safe(async()=>{const row={project_id:$('#fileProject').value,name:$('#fileName').value.trim(),kind:$('#fileKind').value,url:$('#fileUrl').value.trim()||null,notes:$('#fileNotes').value};if(id)await A.updateEventFile(id,row);else await A.addEventFile(row);closeModal();render();toast('File link saved')}),
 'delete-file':async({id})=>{if(!confirm('Delete this file link?'))return;await safe(async()=>{await A.removeEventFile(id);render();toast('File link deleted')})},
 'new-production':({project,kind})=>productionModal(null,project||ui.project,kind||'photo'),
 'edit-production':({id})=>{const j=state.productionJobs.find(x=>x.id===id);if(j)productionModal(j,j.project_id,j.tracker_type||j.job_type||'photo')},
 'save-production':async({id})=>safe(async()=>{const bs=pickerValue('jobDate'),row={project_id:$('#jobProject').value,job_type:$('#jobType').value,tracker_type:$('#jobType').value,stage:$('#jobStage').value,title:$('#jobTitle').value.trim(),due_date:(bs?adOfBs(bs)||null:null),notes:$('#jobNotes').value};if(id)await A.updateProductionJob(id,row);else await A.addProductionJob(row);closeModal();render();toast('Production job saved')}),
 'delete-production':async({id})=>{if(!confirm('Delete this production job?'))return;await safe(async()=>{await A.deleteProductionJob(id);render();toast('Production job deleted')})},
 'new-deliverable':()=>deliverableModal(),
 'edit-deliverable':({id})=>{const d=state.deliverables.find(x=>x.id===id);if(d)deliverableModal(d)},
 'save-deliverable':async({id})=>safe(async()=>{const row={project_id:$('#delProject').value,deliverable:$('#delName').value.trim(),status:$('#delStatus').value,due_date:(pickerValue('delDate')?adOfBs(pickerValue('delDate'))||null:null)};if(id)await A.updateDeliverable(id,row,row.project_id);else await A.addDeliverable(row);closeModal();render();toast('Deliverable saved')}),
 'new-reminder':({project})=>reminderModal(project||ui.project),
 'save-reminder':async({project})=>safe(async()=>{const bs=pickerValue('remDate'),date=bs?adOfBs(bs):'';if(!date){toast('Select a valid BS reminder date.',true);return}const due=`${date}T${$('#remTime').value||'09:00'}:00+05:45`;await A.addReminder({project_id:project||ui.project||null,title:$('#remTitle').value.trim(),due_at:due,priority:$('#remPriority').value,notes:$('#remNotes').value});closeModal();render();toast('Reminder saved')}),
 'done-reminder':async({id})=>safe(async()=>{await A.update('reminders',id,{status:'done'});render();toast('Reminder completed')}),
 'sign-in':async()=>safe(async()=>{await A.signIn($('#authEmail').value,$('#authPassword').value);closeModal();render();toast('Signed in')}),
 'sign-up':async()=>safe(async()=>{await A.signUp($('#authEmail').value,$('#authPassword').value,'Owner','Rachna Workspace');closeModal();render();toast('Account created')}),
 'sign-out':async()=>safe(async()=>{await A.signOut()}),
 refresh:async()=>safe(async()=>{await A.refresh();render();toast('Data refreshed')})
};
const ROUTES={home:'home',inquiries:'inquiries',events:'events',clients:'clients','booked-clients':'booked-clients',freelancers:'freelancers',finance:'finance',files:'files',drive:'drive','photo-edit':'photo-edit','video-edit':'video-edit',deliverables:'deliverables',settings:'settings'};
function handleAction(btn){const action=btn.dataset.action;if(!action)return;const fn=HANDLERS[action];if(!fn){toast('This action is not available yet.',true);return}return fn(btn.dataset)}
function bindGlobal(){document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()},{capture:true});document.addEventListener('click',e=>{const btn=e.target.closest?.('button,a');if(!btn)return;const route=btn.dataset.route;if(route&&ROUTES[route]){e.preventDefault();ui.project=null;ui.page=ROUTES[route];ui.query='';closeModal();render();return}const tab=btn.dataset.projectTab;if(tab&&ui.project){e.preventDefault();ui.tab=tab;render();return}if(btn.dataset.action){e.preventDefault();handleAction(btn)}},false);document.addEventListener('input',e=>{if(e.target.id==='globalSearch'){ui.query=e.target.value;render()}});document.addEventListener('change',e=>{if(e.target.matches('[data-scope-service]')){const p=e.target.closest('.choice');const price=p?.querySelector('.scope-price');if(price)price.disabled=!e.target.checked}if(e.target.id==='globalSearch'){ui.query=e.target.value;render()}});$('#backdrop')?.addEventListener('click',e=>{if(e.target.id==='backdrop')closeModal()});const dateBtn=$('[data-rachna-date-check]');if(dateBtn)dateBtn.addEventListener('click',e=>{e.preventDefault();dateCheckModal()})}
async function boot(){if(!state.user){renderShell();$('#page').innerHTML=pageHead('RACHNA + AAVARTAN','Welcome to Rachna OS','Sign in to manage enquiries, events, finance and production.',`<button type="button" class="btn primary" data-action="sign-in-panel">Sign in</button>`)+empty('Sign in required','Use Account in the top bar to continue.');modal('Sign in to Rachna OS',field('Email','authEmail','email','','autocomplete="email"')+field('Password','authPassword','password','','autocomplete="current-password"'),'<button type="button" class="btn primary" data-action="sign-in">Sign in</button><button type="button" class="btn" data-action="sign-up">Create account</button>');return}render();}
HANDLERS['sign-in-panel']=()=>authModal();
window.RachnaBS={todayBs:todayBS,bsToAd:adOfBs,adToBs:bsOfAd};
const start=async()=>{bindGlobal();try{await A.init()}catch(e){A.state.error=e}await boot()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
