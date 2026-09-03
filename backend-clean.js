(() => {
  'use strict';
  const SUPABASE_URL='https://awptvpxfzhqeawrpdczg.supabase.co';
  const SUPABASE_KEY='sb_publishable_4D7iA3OZGhalc6bzxtYgBw__jCUmOVq';
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const state={user:null,profile:null,org:null,connected:false,customers:[],inquiries:[],projects:[],functions:[],services:[],projectServices:[],vendors:[],vendorBookings:[],team:[],projectTeam:[],payments:[],expenses:[],quotations:[],quotationItems:[],productionCosts:[],deliverables:[],error:null};
  const money=n=>'NPR '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  const orgId=()=>{const id=state.profile?.organization_id;if(!id)throw new Error('Workspace is not initialized. Sign in again.');return id};
  async function q(p){const r=await p;if(r.error)throw r.error;return r.data}
  async function profile(){if(!state.user)return;state.profile=await q(sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle());if(state.profile?.organization_id)state.org=await q(sb.from('organizations').select('*').eq('id',state.profile.organization_id).maybeSingle())}
  async function bootstrap(fullName,orgName){const id=await q(sb.rpc('bootstrap_workspace',{p_full_name:fullName||null,p_org_name:orgName||null}));await profile();return id}
  async function refresh(){
    if(!state.user)return state;
    if(!state.profile?.organization_id)await bootstrap(state.user.user_metadata?.full_name||state.user.email?.split('@')[0]||'Owner','Rachna Workspace');
    const rs=await Promise.all([
      sb.from('customers').select('*').order('created_at',{ascending:false}),
      sb.from('inquiries').select('*').order('updated_at',{ascending:false}),
      sb.from('projects').select('*').order('created_at',{ascending:false}),
      sb.from('event_functions').select('*').order('event_date'),
      sb.from('services').select('*').order('brand').order('name'),
      sb.from('project_services').select('*').order('id'),
      sb.from('vendors').select('*').order('name'),
      sb.from('vendor_bookings').select('*'),
      sb.from('team_members').select('*').order('name'),
      sb.from('project_team').select('*'),
      sb.from('payments').select('*').order('payment_date',{ascending:false}),
      sb.from('project_expenses').select('*').order('expense_date',{ascending:false}),
      sb.from('quotations').select('*').order('created_at',{ascending:false}),
      sb.from('quotation_items').select('*'),
      sb.from('production_costs').select('*').order('created_at',{ascending:false}),
      sb.from('aavartan_deliverables').select('*').order('due_date')
    ]);
    for(const r of rs)if(r.error)throw r.error;
    [state.customers,state.inquiries,state.projects,state.functions,state.services,state.projectServices,state.vendors,state.vendorBookings,state.team,state.projectTeam,state.payments,state.expenses,state.quotations,state.quotationItems,state.productionCosts,state.deliverables]=rs.map(r=>r.data||[]);
    return state;
  }
  async function init(){const {data,error}=await sb.auth.getSession();if(error)throw error;state.user=data.session?.user||null;state.connected=!!state.user;if(state.user){await profile();await refresh()}return state}
  async function signIn(email,password){const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;state.user=r.data.user;state.connected=true;await profile();if(!state.profile?.organization_id)await bootstrap(state.user.user_metadata?.full_name||email.split('@')[0],'Rachna Workspace');await refresh();return state}
  async function signUp(email,password,fullName,orgName){const r=await sb.auth.signUp({email,password,options:{data:{full_name:fullName||email.split('@')[0]}}});if(r.error)throw r.error;if(!r.data.user)throw Error('Signup did not create a user.');if(r.data.session){state.user=r.data.user;state.connected=true;await bootstrap(fullName,orgName);await refresh();return state}return{needsConfirmation:true}}
  async function signOut(){await sb.auth.signOut();state.user=null;state.profile=null;state.org=null;state.connected=false;location.reload()}
  async function insert(table,row){const data={...row};if(['customers','inquiries','projects','services','vendors','team_members','payments','project_expenses'].includes(table))data.organization_id=orgId();return q(sb.from(table).insert(data).select().single()).then(async out=>{await refresh();return out})}
  async function update(table,id,row){const out=await q(sb.from(table).update(row).eq('id',id));await refresh();return out}
  async function remove(table,id){await q(sb.from(table).delete().eq('id',id));await refresh();return true}
  async function createCustomer(x){if(!x.name?.trim())throw Error('Customer name is required');const existing=state.customers.find(c=>c.phone&&x.phone&&c.phone.trim()===String(x.phone).trim());if(existing)return existing;return insert('customers',{name:x.name.trim(),phone:x.phone||null,whatsapp:x.whatsapp||x.phone||null,email:x.email||null,notes:x.notes||null})}
  async function createInquiry(x){if(!x.event_name?.trim())throw Error('Event name is required');if(!x.customer_name?.trim())throw Error('Customer name is required');let c=state.customers.find(a=>a.phone&&x.phone&&a.phone.trim()===String(x.phone).trim());if(!c)c=await createCustomer({name:x.customer_name,phone:x.phone,whatsapp:x.whatsapp,email:x.email});return insert('inquiries',{customer_id:c.id,source:x.source||'Other',status:'new',owner_id:state.user.id,event_name:x.event_name,event_date_bs:x.event_date_bs||null,venue:x.venue||null,guest_count:x.guest_count?Number(x.guest_count):null,budget:x.budget?Number(x.budget):null,notes:x.notes||null})}
  async function convertInquiry(id){const i=state.inquiries.find(x=>x.id===id);if(!i)throw Error('Inquiry not found');const existing=state.projects.find(p=>p.inquiry_id===id);if(existing)return existing;const p=await insert('projects',{customer_id:i.customer_id,inquiry_id:i.id,name:i.event_name||'New Event Project',status:'planning',brand:'Rachna + Aavartan',date_range_bs:i.event_date_bs||null});let ad=null;try{ad=i.event_date_bs&&window.DateConverter?new window.DateConverter(i.event_date_bs).toAd():null}catch{}await q(sb.from('event_functions').insert({project_id:p.id,name:i.event_name||'Event',event_date:ad?`${ad.year}-${String(ad.month).padStart(2,'0')}-${String(ad.date).padStart(2,'0')}`:null,event_date_bs:i.event_date_bs||null,venue:i.venue||null,guest_count:i.guest_count?Number(i.guest_count):null}).select().single());await q(sb.from('inquiries').update({status:'awaiting_advance',updated_at:new Date().toISOString()}).eq('id',id));await refresh();return state.projects.find(x=>x.id===p.id)||p}
  async function insertProject(x){if(!x.name?.trim())throw Error('Project name is required');const p=await insert('projects',{customer_id:x.customer_id||null,name:x.name.trim(),status:x.status||'planning',brand:x.brand||'Rachna + Aavartan',date_range_bs:x.date_range_bs||null,inquiry_id:x.inquiry_id||null});if(x.function_name?.trim())await addFunction(p.id,{name:x.function_name.trim(),event_date:x.event_date||null,event_date_bs:x.event_date_bs||null,venue:x.venue||null,guest_count:x.guest_count||null});await refresh();return state.projects.find(v=>v.id===p.id)||p}
  async function addFunction(projectId,x){if(!x.name?.trim())throw Error('Function name is required');return q(sb.from('event_functions').insert({...x,project_id:projectId,name:x.name.trim(),guest_count:x.guest_count?Number(x.guest_count):null}).select().single()).then(async r=>{await refresh();return r})}
  async function addService(x){if(!x.name?.trim())throw Error('Service name is required');return insert('services',{brand:x.brand||'Rachna',name:x.name.trim(),category:x.category||null,base_price:Number(x.base_price)||0,internal_cost:Number(x.internal_cost)||0,active:x.active!==false})}
  async function addProjectService(x){return q(sb.from('project_services').insert({...x,project_id:x.project_id,quantity:Number(x.quantity)||1,customer_price:Number(x.customer_price)||0,internal_cost:Number(x.internal_cost)||0}).select().single())}
  async function updateProjectService(id,row,projectId){await q(sb.from('project_services').update(row).eq('id',id));if(projectId)await recalc(projectId)}
  async function saveProjectServiceScope(projectId,rows){const data=await q(sb.rpc('save_project_service_scope',{p_project_id:projectId,p_rows:rows||[]}));await refresh();return data}
  async function addVendor(x){if(!x.name?.trim())throw Error('Vendor name is required');return insert('vendors',{name:x.name.trim(),phone:x.phone||null,service_category:x.category||null,area:x.area||null,rate_guide:x.rate_guide||null,reliability:x.reliability||'Medium',notes:x.notes||null})}
  async function addTeam(x){if(!x.name?.trim())throw Error('Team member name is required');return insert('team_members',{name:x.name.trim(),role:x.role||null,phone:x.phone||null,email:x.email||null,active:x.active!==false})}
  async function assignTeam(x){const r=await q(sb.from('project_team').insert({...x,rate:Number(x.rate)||0}).select().single());await recalc(x.project_id);return r}
  async function recordPayment(x){const n=Number(x.amount);if(!(n>0))throw Error('Amount must be greater than zero');return insert('payments',{project_id:x.project_id||null,direction:x.direction,party_type:x.party_type||'other',party_id:x.party_id||null,amount:n,payment_date:x.payment_date||today(),method:x.method||null,reference:x.reference||null,notes:x.notes||null})}
  async function recordExpense(x){const n=Number(x.amount);if(!(n>0))throw Error('Expense must be greater than zero');const r=await insert('project_expenses',{project_id:x.project_id,category:x.category||'Other',description:x.description||'Expense',amount:n,expense_date:x.expense_date||today(),method:x.method||null,notes:x.notes||null});await recalc(x.project_id);return r}
  async function recordAdvance(projectId,amount,method,reference){const n=Number(amount);if(!(n>0))throw Error('Enter a valid advance');const data=await q(sb.rpc('apply_customer_advance',{p_project_id:projectId,p_amount:n,p_method:method||null,p_reference:reference||null}));await refresh();return{booked:Boolean(data.booked),reserve:Number(data.vendor_reserve||0),received:Number(data.received||0),required:Number(data.required||0)}}
  async function addVendorBooking(x){return q(sb.from('vendor_bookings').insert({...x,quoted_cost:Number(x.quoted_cost)||0,advance_paid:Number(x.advance_paid)||0,final_paid:Number(x.final_paid)||0}).select().single()).then(async r=>{await recalc(x.project_id);return r})}
  async function createQuotation(projectId){const vs=state.quotations.filter(q=>q.project_id===projectId),v=vs.reduce((m,x)=>Math.max(m,Number(x.version)||0),0)+1;return insert('quotations',{project_id:projectId,version:v,status:'draft',customer_total:0,internal_total:0,notes:null})}
  async function addQuoteItem(quotationId,x){const r=await q(sb.from('quotation_items').insert({...x,quotation_id:quotationId,quantity:Number(x.quantity)||1,customer_price:Number(x.customer_price)||0,internal_cost:Number(x.internal_cost)||0}).select().single());const qrow=state.quotations.find(q=>q.id===quotationId);await refresh();if(qrow)await recalc(qrow.project_id);return r}
  async function createQuoteVersionFrom(projectId,sourceId){const nq=await createQuotation(projectId);const src=state.quotationItems.filter(i=>i.quotation_id===sourceId);for(const item of src)await q(sb.from('quotation_items').insert({quotation_id:nq.id,function_id:item.function_id,service_id:item.service_id,description:item.description,quantity:item.quantity,customer_price:item.customer_price,internal_cost:item.internal_cost}));await recalc(projectId);return nq}
  async function updateQuotation(id,row,projectId){await q(sb.from('quotations').update(row).eq('id',id));if(projectId)await recalc(projectId)}
  async function recalc(projectId){if(!projectId)return;await q(sb.rpc('refresh_project_financials',{p_project_id:projectId}));await refresh()}
  async function addProductionCost(x){const r=await q(sb.from('production_costs').insert({project_id:x.project_id,function_id:x.function_id||null,brand:x.brand||'Aavartan',category:x.category||'Other',description:x.description||'Cost',quantity:Number(x.quantity)||1,unit_cost:Number(x.unit_cost)||0,notes:x.notes||null}).select().single());await recalc(x.project_id);return r}
  async function addDeliverable(x){return q(sb.from('aavartan_deliverables').insert({project_id:x.project_id,function_id:x.function_id||null,deliverable:x.deliverable,status:x.status||'pending',due_date:x.due_date||null}).select().single()).then(async r=>{await refresh();return r})}
  async function updateDeliverable(id,row,projectId){await q(sb.from('aavartan_deliverables').update(row).eq('id',id));if(projectId)await refresh()}
  async function setProjectStatus(id,status){return update('projects',id,{status})}
  window.RachnaAPI={sb,state,init,refresh,signIn,signUp,signOut,bootstrap,createCustomer,createInquiry,convertInquiry,insertProject,addFunction,addService,addProjectService,updateProjectService,saveProjectServiceScope,addVendor,addTeam,assignTeam,recordPayment,recordExpense,recordAdvance,addVendorBooking,createQuotation,createQuoteVersionFrom,addQuoteItem,updateQuotation,recalc,addProductionCost,addDeliverable,updateDeliverable,setProjectStatus,update,remove,money,esc};
})();
