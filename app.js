(() => {
'use strict';
{
  'use strict';
  const SUPABASE_URL = 'https://awptvpxfzhqeawrpdczg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_4D7iA3OZGhalc6bzxtYgBw__jCUmOVq';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'rachna-os-auth-v1' }
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
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kathmandu', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
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
    if (state.profile?.organization_id) state.org = await q(sb.from('organizations').select('*').eq('id', state.profile.organization_id).maybeSingle());
  }

  async function bootstrap(fullName, orgName) {
    const id = await q(sb.rpc('bootstrap_workspace', { p_full_name: fullName || null, p_org_name: orgName || null }));
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
    if (!state.profile?.organization_id) await bootstrap(state.user.user_metadata?.full_name || state.user.email?.split('@')[0] || 'Owner', 'Rachna Workspace');
    const results = await Promise.all(DATASETS.map(([table, column, ascending]) => {
      let query = sb.from(table).select('*');
      if (column) query = query.order(column, { ascending });
      return query;
    }));
    const fatal = results.find((r) => r.error && !['event_files'].includes(DATASETS[results.indexOf(r)]?.[0]));
    if (fatal) throw fatal.error;
    [state.customers, state.inquiries, state.projects, state.functions, state.services, state.projectServices,
      state.vendors, state.vendorBookings, state.team, state.projectTeam, state.payments, state.expenses,
      state.quotations, state.quotationItems, state.productionCosts, state.deliverables,
      state.productionJobs, state.eventFiles, state.reminders] = results.map((r) => r.data || []);
    return state;
  }

  async function init() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    state.user = data.session?.user || null;
    state.connected = !!state.user;
    if (state.user) {
      try { await loadProfile(); await refresh(); }
      catch (e) { state.error = e; state.connected = true; }
    }
    return state;
  }

  async function signIn(email, password) {
    assertText(email, 'Email is required');
    assertText(password, 'Password is required');
    const result = await sb.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    state.user = result.data.user; state.connected = true;
    await loadProfile();
    if (!state.profile?.organization_id) await bootstrap(state.user.user_metadata?.full_name || email.split('@')[0], 'Rachna Workspace');
    try { await refresh(); } catch (_) { state.error = _; }
    return state;
  }

  async function signUp(email, password, fullName, orgName) {
    assertText(email, 'Email is required'); assertText(password, 'Password is required');
    const result = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName || email.split('@')[0] } } });
    if (result.error) throw result.error;
    if (!result.data.user) throw new Error('Signup did not create a user.');
    if (!result.data.session) return { needsConfirmation: true };
    state.user = result.data.user; state.connected = true;
    await bootstrap(fullName, orgName); try { await refresh(); } catch (e) { state.error = e; }
    return state;
  }

  async function signOut() { await sb.auth.signOut(); state.user=null; state.profile=null; state.org=null; state.connected=false; location.reload(); }

  // The session is authoritative. Never turn a data-loading failure into a logout.
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { state.user=null; state.profile=null; state.org=null; state.connected=false; return; }
    if (session?.user) { state.user=session.user; state.connected=true; }
  });

  async function insert(table, row) { const data={...row}; if(['customers','inquiries','projects','services','vendors','team_members','payments','project_expenses','production_jobs','event_files','reminders'].includes(table)) data.organization_id=orgId(); const out=await q(sb.from(table).insert(data).select().single()); await refresh(); return out; }
  async function update(table,id,row) { if(!id)throw new Error('Record ID is required'); const out=await q(sb.from(table).update(row).eq('id',id)); await refresh(); return out; }
  async function remove(table,id) { if(!id)throw new Error('Record ID is required'); await q(sb.from(table).delete().eq('id',id)); await refresh(); return true; }

  async function createCustomer(x) { assertText(x.name,'Customer name is required'); const phone=String(x.phone||'').trim(); const existing=phone?state.customers.find(c=>String(c.phone||'').trim()===phone):null; if(existing)return existing; return insert('customers',{name:x.name.trim(),phone:x.phone||null,whatsapp:x.whatsapp||x.phone||null,email:x.email||null,notes:x.notes||null}); }
  async function createInquiry(x) { assertText(x.event_name,'Event name is required'); assertText(x.customer_name,'Customer name is required'); let customer=null; const phone=String(x.phone||'').trim(); if(phone)customer=state.customers.find(c=>String(c.phone||'').trim()===phone)||null; if(!customer)customer=await createCustomer({name:x.customer_name,phone:x.phone,whatsapp:x.whatsapp,email:x.email}); return insert('inquiries',{customer_id:customer.id,source:x.source||'Other',status:x.status||'new',owner_id:state.user?.id||null,event_name:x.event_name.trim(),event_date_bs:x.event_date_bs||null,venue:x.venue||null,guest_count:x.guest_count?n(x.guest_count):null,budget:x.budget?n(x.budget):null,notes:x.notes||null}); }
  async function updateInquiry(id,row){return update('inquiries',id,row)}
  async function convertInquiry(id){const inquiry=state.inquiries.find(v=>v.id===id);if(!inquiry)throw new Error('Inquiry not found');const existing=state.projects.find(p=>p.inquiry_id===id);if(existing)return existing;const project=await insert('projects',{customer_id:inquiry.customer_id,inquiry_id:inquiry.id,name:inquiry.event_name||'New Event',status:'planning',brand:'Rachna + Aavartan',date_range_bs:inquiry.event_date_bs||null});await addFunction(project.id,{name:inquiry.event_name||'Event',event_date_bs:inquiry.event_date_bs||null,event_date:null,venue:inquiry.venue||null,guest_count:inquiry.guest_count||null});await updateInquiry(id,{status:'quote_pending',updated_at:new Date().toISOString()});return state.projects.find(p=>p.id===project.id)||project;}
  async function insertProject(x){assertText(x.name,'Event name is required');const project=await insert('projects',{customer_id:x.customer_id||null,inquiry_id:x.inquiry_id||null,name:x.name.trim(),status:x.status||'planning',brand:x.brand||'Rachna + Aavartan',date_range_bs:x.date_range_bs||null});if(x.function_name?.trim())await addFunction(project.id,{name:x.function_name.trim(),event_date:x.event_date||null,event_date_bs:x.event_date_bs||null,venue:x.venue||null,guest_count:x.guest_count||null});await refresh();return state.projects.find(p=>p.id===project.id)||project;}
  async function addFunction(projectId,x){assertText(x.name,'Function name is required');return q(sb.from('event_functions').insert({...x,project_id:projectId,name:x.name.trim(),event_date:x.event_date||null,guest_count:x.guest_count?n(x.guest_count):null}).select().single()).then(async r=>{await refresh();return r;});}
  async function updateFunction(id,row){return update('event_functions',id,row)} async function deleteFunction(id){return remove('event_functions',id)} async function setProjectStatus(id,status){return update('projects',id,{status})} async function updateProject(id,row){return update('projects',id,row)}

  async function saveProjectServiceScope(projectId,rows){const data=await q(sb.rpc('save_project_service_scope',{p_project_id:projectId,p_rows:rows||[]}));await refresh();return data;}
  async function addService(x){assertText(x.name,'Service name is required');return insert('services',{brand:x.brand||'Rachna',name:x.name.trim(),category:x.category||null,base_price:n(x.base_price),internal_cost:n(x.internal_cost),active:x.active!==false});}
  async function addProjectService(x){const out=await q(sb.from('project_services').insert({project_id:x.project_id,function_id:x.function_id||null,service_id:x.service_id||null,name:x.name,customer_price:n(x.customer_price),internal_cost:n(x.internal_cost),quantity:n(x.quantity,1)}).select().single());await refresh();await recalc(x.project_id);return out;}
  async function updateProjectService(id,row,projectId){await q(sb.from('project_services').update(row).eq('id',id));if(projectId)await recalc(projectId);else await refresh();}
  async function addVendor(x){assertText(x.name,'Vendor name is required');return insert('vendors',{name:x.name.trim(),phone:x.phone||null,service_category:x.category||null,area:x.area||null,rate_guide:x.rate_guide||null,reliability:x.reliability||'Medium',notes:x.notes||null});}
  async function updateVendor(id,row){return update('vendors',id,row)}
  async function addVendorBooking(x){const quoted=n(x.quoted_cost),advance=n(x.advance_paid),finalPaid=n(x.final_paid);if(advance!==0||finalPaid!==0)throw new Error('Vendor payments must be recorded separately after the vendor job is created.');const out=await q(sb.from('vendor_bookings').insert({project_id:x.project_id,function_id:x.function_id||null,vendor_id:x.vendor_id,category:x.category||null,requirement:x.requirement||null,quantity:n(x.quantity,1),client_price:n(x.client_price),quoted_cost:quoted,advance_paid:0,final_paid:0,payable:Math.max(0,quoted),status:x.status||'reserved',notes:x.notes||null}).select().single());await refresh();await recalc(x.project_id);return out;}
  async function updateVendorBooking(id,row,projectId){if('advance_paid'in row||'final_paid'in row)throw new Error('Vendor payments must be recorded through the vendor payment action.');await q(sb.from('vendor_bookings').update(row).eq('id',id));if(projectId)await recalc(projectId);else await refresh();}
  async function payVendorBooking(id,amount,method,reference,isAdvance=false){const value=n(amount);if(!(value>0))throw new Error('Payment must be greater than zero');const result=await q(sb.rpc('apply_vendor_payment',{p_vendor_booking_id:id,p_amount:value,p_method:method||null,p_reference:reference||null,p_is_advance:!!isAdvance}));await refresh();return result;}
  async function addTeam(x){assertText(x.name,'Team member name is required');return insert('team_members',{name:x.name.trim(),role:x.role||null,phone:x.phone||null,email:x.email||null,active:x.active!==false});}
  async function updateTeam(id,row){return update('team_members',id,row)} async function assignTeam(x){const out=await q(sb.from('project_team').insert({project_id:x.project_id,team_member_id:x.team_member_id,function_id:x.function_id||null,responsibility:x.responsibility||null,rate:n(x.rate)}).select().single());await refresh();await recalc(x.project_id);return out;} async function updateProjectTeam(id,row,projectId){await q(sb.from('project_team').update(row).eq('id',id));if(projectId)await recalc(projectId);else await refresh();}
  async function recordPayment(x){const amount=n(x.amount);if(!(amount>0))throw new Error('Amount must be greater than zero');return insert('payments',{project_id:x.project_id||null,direction:x.direction||'in',amount,method:x.method||'Cash',payment_date:x.payment_date||today(),reference:x.reference||null,notes:x.notes||null});}
  async function addExpense(x){const amount=n(x.amount);if(!(amount>0))throw new Error('Expense amount must be greater than zero');return insert('project_expenses',{project_id:x.project_id||null,category:x.category||'Other',description:x.description||null,amount,expense_date:x.expense_date||today(),vendor_id:x.vendor_id||null,paid:x.paid!==false,notes:x.notes||null});}
  async function upsertQuotation(x){return q(sb.rpc('upsert_quotation',{p_project_id:x.project_id,p_notes:x.notes||null,p_items:x.items||[]})).then(async r=>{await refresh();return r;});}
  async function recalc(projectId){return q(sb.rpc('recalculate_project_totals',{p_project_id:projectId})).then(async r=>{await refresh();return r;});}
  async function addProductionCost(x){const amount=n(x.amount);if(!(amount>0))throw new Error('Production cost must be greater than zero');return insert('production_costs',{project_id:x.project_id,category:x.category||'Other',description:x.description||null,amount});}
  async function addJob(x){assertText(x.title,'Job title is required');return insert('production_jobs',{project_id:x.project_id,type:x.type||'photo',title:x.title.trim(),status:x.status||'todo',assignee_id:x.assignee_id||null,due_date:x.due_date?adOfBs(x.due_date):null,notes:x.notes||null});}
  async function updateJob(id,row,projectId){await q(sb.from('production_jobs').update(row).eq('id',id));if(projectId)await recalc(projectId);else await refresh();}
  async function addDeliverable(x){assertText(x.title,'Deliverable title is required');return q(sb.from('aavartan_deliverables').insert({project_id:x.project_id,type:x.type||'photo',title:x.title.trim(),status:x.status||'todo',due_date:x.due_date?adOfBs(x.due_date):null,notes:x.notes||null}).select().single()).then(async r=>{await refresh();return r;});}
  async function updateDeliverable(id,row,projectId){await q(sb.from('aavartan_deliverables').update(row).eq('id',id));if(projectId)await recalc(projectId);else await refresh();}
  async function addFile(x){return insert('event_files',{project_id:x.project_id||null,category:x.category||'Other',name:x.name.trim(),url:x.url,notes:x.notes||null});}
  async function addReminder(x){assertText(x.title,'Reminder title is required');return insert('reminders',{project_id:x.project_id||null,title:x.title.trim(),due_at:x.due_at,status:x.status||'open',notes:x.notes||null});}
  async function markReminderDone(id){return update('reminders',id,{status:'done'});}
  async function setCompanySettings(x){return q(sb.from('organizations').update(x).eq('id',orgId())) .then(async r=>{await loadProfile();return r;});}

  window.RachnaAPI={state,init,signIn,signUp,signOut,createCustomer,createInquiry,updateInquiry,convertInquiry,insertProject,addFunction,updateFunction,deleteFunction,updateProject,setProjectStatus,saveProjectServiceScope,addService,addProjectService,updateProjectService,addVendor,updateVendor,addVendorBooking,updateVendorBooking,payVendorBooking,addTeam,updateTeam,assignTeam,updateProjectTeam,recordPayment,addExpense,upsertQuotation,recalc,addProductionCost,addJob,updateJob,addDeliverable,updateDeliverable,addFile,addReminder,markReminderDone,setCompanySettings};
}
})();