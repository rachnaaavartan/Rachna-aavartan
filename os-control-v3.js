(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => `NPR ${Number(n || 0).toLocaleString('en-IN')}`);
  const state = { active:false };
  const project = id => A.state.projects.find(p => p.id === id);
  const customer = p => A.state.customers.find(c => c.id === p?.customer_id);
  const booked = p => p?.status === 'booked' || (Number(p?.quoted_total||0) > 0 && Number(p?.customer_advance||0) >= Number(p?.quoted_total||0) * 0.30);
  const received = p => A.state.payments.filter(x => x.project_id === p?.id && x.direction === 'in').reduce((s,x)=>s+Number(x.amount||0),0);
  const metric = (title,value,note) => `<div class="metric"><div class="metric-top"><small>${esc(title)}</small></div><strong>${value}</strong><em>${esc(note)}</em></div>`;
  const cardTitle = (kicker,title,action='') => `<div class="panel-title"><div><div class="eyebrow">${esc(kicker)}</div><h2>${esc(title)}</h2></div>${action}</div>`;
  function render(){
    const page = $('#page'); if(!page)return;
    state.active = true;
    const projects=A.state.projects||[], inquiries=A.state.inquiries||[], functions=A.state.functions||[], payments=A.state.payments||[];
    const vendorBookings=A.state.vendorBookings||[], projectTeam=A.state.projectTeam||[], expenses=A.state.expenses||[], productionCosts=A.state.productionCosts||[];
    const marketing=A.state.marketingCampaigns||[], deliverables=A.state.deliverables||[], productionJobs=A.state.productionJobs||[], tasks=A.state.eventOperationsTasks||[];
    const totalRevenue=projects.reduce((s,p)=>s+Number(p.quoted_total||0),0);
    const totalReceived=payments.filter(x=>x.direction==='in').reduce((s,x)=>s+Number(x.amount||0),0);
    const vendorCost=vendorBookings.reduce((s,x)=>s+Number(x.quoted_cost||0),0);
    const crewCost=projectTeam.reduce((s,x)=>s+Number(x.rate||0),0);
    const otherCost=expenses.reduce((s,x)=>s+Number(x.amount||0),0);
    const productionCost=productionCosts.reduce((s,x)=>s+Number(x.unit_cost||0)*Number(x.quantity||1),0);
    const marketingSpend=marketing.reduce((s,x)=>s+Number(x.spend||0),0);
    const totalCost=vendorCost+crewCost+otherCost+productionCost+marketingSpend;
    const balances=projects.reduce((s,p)=>s+Math.max(0,Number(p.quoted_total||0)-received(p)),0);
    const bookedCount=projects.filter(booked).length;
    const openLeads=inquiries.filter(i=>!['lost','booked','cancelled','booking_cancelled','booked_elsewhere','passed_on'].includes(i.status)).length;
    const quotePending=inquiries.filter(i=>['quote_pending','quote_made','quote_sent'].includes(i.status)).length;
    const upcoming=functions.filter(f=>f.event_date&&f.event_date>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.event_date.localeCompare(b.event_date));
    const opsTasks=tasks.filter(t=>t.status!=='done'&&t.status!=='cancelled').length;
    const overdue=tasks.filter(t=>t.status!=='done'&&t.status!=='cancelled'&&t.due_at&&new Date(t.due_at)<new Date()).length;
    const unassigned=projectTeam.filter(x=>!x.team_member_id).length;
    const pendingVendor=vendorBookings.reduce((s,x)=>s+Math.max(0,Number(x.quoted_cost||0)-Number(x.advance_paid||0)-Number(x.final_paid||0)),0);
    const delivered=deliverables.filter(x=>x.status==='delivered').length;
    const deliveryPending=Math.max(0,deliverables.length-delivered);
    const grossProfit=totalRevenue-totalCost;
    const conversion=inquiries.length?Math.round(bookedCount/inquiries.length*100):0;
    const sourceMap={};
    inquiries.forEach(i=>{const s=i.source||'Other';sourceMap[s]??={leads:0,booked:0,budget:0};sourceMap[s].leads++;sourceMap[s].budget+=Number(i.budget||0);if(projects.some(p=>p.inquiry_id===i.id&&booked(p)))sourceMap[s].booked++;});
    const sourceRows=Object.entries(sourceMap).sort((a,b)=>b[1].leads-a[1].leads).slice(0,8);
    const attention=[];
    if(openLeads) attention.push(['Sales',`${openLeads} enquiries still open`,'inquiries']);
    if(quotePending) attention.push(['Quotation',`${quotePending} enquiries need quotation follow-up`,'inquiries']);
    if(balances>0) attention.push(['Finance',`${money(balances)} customer balance outstanding`,'finance']);
    if(pendingVendor>0) attention.push(['Vendors',`${money(pendingVendor)} vendor balance pending`,'events']);
    if(overdue) attention.push(['Operations',`${overdue} overdue event task${overdue===1?'':'s'}`,'events']);
    if(unassigned) attention.push(['Crew',`${unassigned} crew assignment${unassigned===1?'':'s'} missing`,'freelancers']);
    if(deliveryPending) attention.push(['Delivery',`${deliveryPending} deliverable${deliveryPending===1?'':'s'} pending`,'deliverables']);
    page.innerHTML=`<div class="page-head"><div><div class="eyebrow">COMPANY CONTROL</div><h1>Rachna OS Control Center</h1><p>One operating view across sales, bookings, events, crew, vendors, finance, marketing and delivery.</p></div><div class="actions"><button class="btn primary" data-action="new-inquiry">＋ New enquiry</button><button class="btn soft" data-route="events">Event Register</button></div></div>
      <div class="metrics">${metric('Open enquiries',openLeads,'Needs sales action')}${metric('Booked events',bookedCount,`Conversion ${conversion}%`)}${metric('Quoted revenue',money(totalRevenue),'Current event value')}${metric('Cash received',money(totalReceived),'Customer payments')}${metric('Receivable',money(balances),'Outstanding customer balance')}${metric('Projected profit',money(grossProfit),'Revenue minus recorded costs')}</div>
      <div class="dashboard-grid"><section class="panel">${cardTitle('ATTENTION NOW','Things to clear today',`<span class="status ${attention.length?'pending':'paid'}">${attention.length} open</span>`)}<div class="mini-list">${attention.map(a=>`<div class="mini-row"><div><b>${esc(a[0])}</b><small>${esc(a[1])}</small></div><button class="btn tiny" data-route="${a[2]}">Open</button></div>`).join('')||`<div class="empty"><b>Nothing urgent</b><span>Core sales, finance and operations indicators are clear.</span></div>`}</div></section><section class="panel">${cardTitle('EVENT CALENDAR','Upcoming functions',`<button class="link" data-route="events">Open events →</button>`)}<div class="mini-list">${upcoming.slice(0,6).map(f=>{const p=project(f.project_id),c=customer(p);return `<div class="mini-row"><div><b>${esc(f.event_date_bs||f.event_date||'Date TBC')} · ${esc(f.name)}</b><small>${esc(p?.event_code||'')} · ${esc(c?.name||'No client')} · ${esc(f.venue||'Venue TBC')}</small></div><button class="btn tiny" data-action="open-project" data-id="${f.project_id}">Open</button></div>`}).join('')||`<div class="empty"><b>No upcoming functions</b><span>Your calendar is empty.</span></div>`}</div></section></div>
      <div class="dashboard-grid second"><section class="panel">${cardTitle('PIPELINE','Sales conversion by source',`<button class="link" data-route="inquiries">Open CRM →</button>`)}<div class="table-panel" style="margin:0"><table><thead><tr><th>Source</th><th>Leads</th><th>Booked</th><th>Conv.</th><th>Budget</th></tr></thead><tbody>${sourceRows.map(([s,v])=>`<tr><td><b>${esc(s)}</b></td><td>${v.leads}</td><td>${v.booked}</td><td>${v.leads?Math.round(v.booked/v.leads*100):0}%</td><td>${money(v.budget)}</td></tr>`).join('')||`<tr><td colspan="5">No lead data yet.</td></tr>`}</tbody></table></div></section><section class="panel">${cardTitle('FINANCE','Business snapshot',`<button class="link" data-route="finance">Open finance →</button>`)}<div class="summary-bar"><span><b>${money(vendorCost)}</b> vendor cost</span><span><b>${money(crewCost)}</b> crew cost</span><span><b>${money(otherCost+productionCost)}</b> other + production</span><span><b>${money(marketingSpend)}</b> ads</span></div><div class="notice"><b>Recorded margin:</b> ${totalRevenue ? Math.round(grossProfit/totalRevenue*100):0}% · <b>Vendor payable:</b> ${money(pendingVendor)}</div></section></div>
      <div class="dashboard-grid second"><section class="panel">${cardTitle('OPERATIONS','Event readiness',`<button class="link" data-route="freelancers">Crew →</button>`)}<div class="summary-bar"><span><b>${opsTasks}</b> open tasks</span><span><b>${overdue}</b> overdue</span><span><b>${projectTeam.length}</b> assignments</span><span><b>${vendorBookings.length}</b> vendor jobs</span></div><div class="notice">Crew conflicts, vendor payment controls and function staffing rules are enforced in the live OS.</div></section><section class="panel">${cardTitle('DELIVERY','Production & delivery',`<button class="link" data-route="deliverables">Open delivery →</button>`)}<div class="summary-bar"><span><b>${productionJobs.filter(j=>j.status!=='delivered').length}</b> production jobs open</span><span><b>${deliveryPending}</b> deliverables pending</span><span><b>${delivered}</b> delivered</span></div><div class="notice">Photos, videos, albums, frames and pen drives stay attached to the Event ID.</div></section></div>
      <section class="panel" style="margin-top:18px">${cardTitle('SYSTEM','Everything connected',`<button class="btn tiny" data-action="full-refresh">↻ Refresh all</button>`)}<div class="role-strip"><span>CRM <b>${inquiries.length}</b></span><span>Events <b>${projects.length}</b></span><span>Functions <b>${functions.length}</b></span><span>Quotes <b>${A.state.quotations.length}</b></span><span>Vendors <b>${A.state.vendors.length}</b></span><span>Crew <b>${A.state.team.length}</b></span><span>Documents <b>${(A.state.documents||[]).length}</b></span><span>Campaigns <b>${marketing.length}</b></span><span>Portals <b>${(A.state.clientPortals||[]).length}</b></span></div></section>`;
  }
  function injectNav(){
    const nav=$('#nav');if(!nav||nav.querySelector('[data-route="control-center"]'))return;
    const group=document.createElement('div');group.className='nav-group';group.innerHTML='<div class="nav-label">Command</div><button class="nav-item" data-route="control-center"><span class="nav-ico">◉</span><span>Control Center</span></button>';nav.prepend(group);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-route="control-center"]');if(b){e.preventDefault();e.stopPropagation();state.active=true;render();}
    if(e.target.closest('[data-action="full-refresh"]'))A.refresh().then(render).catch(()=>{});
  },true);
  const mo=new MutationObserver(()=>injectNav());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.RachnaControl={render,injectNav};
  injectNav();
})();
