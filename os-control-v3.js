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
  const totalRevenue = A.state.projects.reduce((s,p)=>s+Number(p.quoted_total||0),0);
  const totalReceived = A.state.payments.filter(x=>x.direction==='in').reduce((s,x)=>s+Number(x.amount||0),0);
  const vendorCost = A.state.vendorBookings.reduce((s,x)=>s+Number(x.quoted_cost||0),0);
  const crewCost = A.state.projectTeam.reduce((s,x)=>s+Number(x.rate||0),0);
  const otherCost = A.state.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const productionCost = A.state.productionCosts.reduce((s,x)=>s + Number(x.unit_cost||0)*Number(x.quantity||1),0);
  const marketingSpend = (A.state.marketingCampaigns || []).reduce((s,x)=>s+Number(x.spend||0),0);
  const totalCost = vendorCost + crewCost + otherCost + productionCost + marketingSpend;
  const openLeads = A.state.inquiries.filter(i=>!['lost','booked','cancelled','booking_cancelled','booked_elsewhere','passed_on'].includes(i.status)).length;
  const quotePending = A.state.inquiries.filter(i=>['quote_pending','quote_made','quote_sent'].includes(i.status)).length;
  const balances = A.state.projects.reduce((s,p)=>s+Math.max(0,Number(p.quoted_total||0)-received(p)),0);
  const upcoming = A.state.functions.filter(f=>f.event_date).filter(f=>f.event_date >= new Date().toISOString().slice(0,10)).sort((a,b)=>a.event_date.localeCompare(b.event_date));
  const tasks = A.state.eventOperationsTasks || [];
  const opsTasks = tasks.filter(t=>t.status!=='done' && t.status!=='cancelled');
  const overdue = tasks.filter(t=>t.status!=='done'&&t.status!=='cancelled'&&t.due_at&&new Date(t.due_at)<new Date()).length;
  const unassigned = A.state.projectTeam.filter(x=>!x.team_member_id).length;
  const pendingVendor = A.state.vendorBookings.reduce((s,x)=>s+Math.max(0,Number(x.quoted_cost||0)-Number(x.advance_paid||0)-Number(x.final_paid||0)),0);
  const delivered = A.state.deliverables.filter(x=>x.status==='delivered').length;
  const deliveryPending = A.state.deliverables.length-delivered;
  const statusLabel = {new:'New enquiries',quote_pending:'Quotation pending',quote_made:'Quotation made',quote_sent:'Quotation sent',interested:'Interested',awaiting_advance:'Advance pending',booked:'Booked',planning:'Planning',in_progress:'In progress',completed:'Completed',cancelled:'Cancelled',lost:'Lost',passed_on:'Passed on'};

  function go(route){ document.querySelector(`[data-route="${route}"]`)?.click(); }
  function metric(title,value,note){ return `<div class="metric"><div class="metric-top"><small>${esc(title)}</small></div><strong>${value}</strong><em>${esc(note)}</em></div>`; }
  function cardTitle(kicker,title,action=''){ return `<div class="panel-title"><div><div class="eyebrow">${esc(kicker)}</div><h2>${esc(title)}</h2></div>${action}</div>`; }
  function render(){
    const page = $('#page'); if(!page)return;
    state.active = true;
    const grossProfit = totalRevenue - totalCost;
    const conversion = A.state.inquiries.length ? Math.round((A.state.projects.filter(booked).length / A.state.inquiries.length)*100) : 0;
    const sourceMap = {};
    A.state.inquiries.forEach(i => { const s=i.source||'Other'; sourceMap[s] = sourceMap[s] || {leads:0,booked:0,budget:0}; sourceMap[s].leads++; sourceMap[s].budget += Number(i.budget||0); if(A.state.projects.some(p=>p.inquiry_id===i.id && booked(p))) sourceMap[s].booked++; });
    const sourceRows = Object.entries(sourceMap).sort((a,b)=>b[1].leads-a[1].leads).slice(0,8);
    const attention = [];
    if(openLeads) attention.push(['Sales',`${openLeads} enquiries still open`,`[data-route="inquiries"]`]);
    if(quotePending) attention.push(['Quotation',`${quotePending} enquiries need quotation follow-up`,`[data-route="inquiries"]`]);
    if(balances > 0) attention.push(['Finance',`${money(balances)} customer balance outstanding`,`[data-route="finance"]`]);
    if(pendingVendor > 0) attention.push(['Vendors',`${money(pendingVendor)} vendor balance pending`,`[data-route="events"]`]);
    if(overdue) attention.push(['Operations',`${overdue} overdue event task${overdue===1?'':'s'}`,`[data-route="events"]`]);
    if(unassigned) attention.push(['Crew',`${unassigned} crew assignment${unassigned===1?'':'s'} missing`,`[data-route="freelancers"]`]);
    if(deliveryPending) attention.push(['Delivery',`${deliveryPending} deliverable${deliveryPending===1?'':'s'} pending`,`[data-route="deliverables"]`]);
    page.innerHTML = `<div class="page-head"><div><div class="eyebrow">COMPANY CONTROL</div><h1>Rachna OS Control Center</h1><p>One operating view across sales, bookings, events, crew, vendors, finance, marketing and delivery.</p></div><div class="actions"><button class="btn primary" data-action="new-inquiry">＋ New enquiry</button><button class="btn soft" data-route="events">Event Register</button></div></div>
      <div class="metrics">${metric('Open enquiries',openLeads,'Needs sales action')}${metric('Booked events',A.state.projects.filter(booked).length,`Conversion ${conversion}%`)}${metric('Quoted revenue',money(totalRevenue),'Current event value')}${metric('Cash received',money(totalReceived),'Customer payments')}${metric('Receivable',money(balances),'Outstanding customer balance')}${metric('Projected profit',money(grossProfit),'Revenue minus recorded costs')}</div>
      <div class="dashboard-grid"><section class="panel">${cardTitle('ATTENTION NOW','Things to clear today',`<span class="status ${attention.length?'pending':'paid'}">${attention.length} open</span>`)}<div class="mini-list">${attention.map(a=>`<div class="mini-row"><div><b>${esc(a[0])}</b><small>${esc(a[1])}</small></div><button class="btn tiny" data-route="${a[2].match(/data-route=\\"([^\\"]+)/)?.[1]||'events'}">Open</button></div>`).join('') || `<div class="empty"><b>Nothing urgent</b><span>Core sales, finance and operations indicators are clear.</span></div>`}</div></section><section class="panel">${cardTitle('EVENT CALENDAR','Upcoming functions',`<button class="link" data-route="events">Open events →</button>`)}<div class="mini-list">${upcoming.slice(0,6).map(f=>{const p=project(f.project_id),c=customer(p);return `<div class="mini-row"><div><b>${esc(f.event_date_bs||f.event_date||'Date TBC')} · ${esc(f.name)}</b><small>${esc(p?.event_code||'')} · ${esc(c?.name||'No client')} · ${esc(f.venue||'Venue TBC')}</small></div><button class="btn tiny" data-action="open-project" data-id="${f.project_id}">Open</button></div>`}).join('') || `<div class="empty"><b>No upcoming functions</b><span>Your calendar is empty.</span></div>`}</div></section></div>
      <div class="dashboard-grid second"><section class="panel">${cardTitle('PIPELINE','Sales conversion by source',`<button class="link" data-route="inquiries">Open CRM →</button>`)}<div class="table-panel" style="margin:0"><table><thead><tr><th>Source</th><th>Leads</th><th>Booked</th><th>Conv.</th><th>Budget</th></tr></thead><tbody>${sourceRows.map(([s,v])=>`<tr><td><b>${esc(s)}</b></td><td>${v.leads}</td><td>${v.booked}</td><td>${v.leads?Math.round(v.booked/v.leads*100):0}%</td><td>${money(v.budget)}</td></tr>`).join('') || `<tr><td colspan="5">No lead data yet.</td></tr>`}</tbody></table></div></section><section class="panel">${cardTitle('FINANCE','Business snapshot',`<button class="link" data-route="finance">Open finance →</button>`)}<div class="summary-bar"><span><b>${money(vendorCost)}</b> vendor cost</span><span><b>${money(crewCost)}</b> crew cost</span><span><b>${money(otherCost+productionCost)}</b> other + production</span><span><b>${money(marketingSpend)}</b> ads</span></div><div class="notice"><b>Recorded margin:</b> ${totalRevenue ? Math.round(grossProfit/totalRevenue*100) : 0}% · <b>Vendor payable:</b> ${money(pendingVendor)}</div></section></div>
      <div class="dashboard-grid second"><section class="panel">${cardTitle('OPERATIONS','Event readiness',`<button class="link" data-route="freelancers">Crew →</button>`)}<div class="summary-bar"><span><b>${opsTasks}</b> open tasks</span><span><b>${overdue}</b> overdue</span><span><b>${A.state.projectTeam.length}</b> assignments</span><span><b>${A.state.vendorBookings.length}</b> vendor jobs</span></div><div class="notice">Crew conflicts, vendor payment controls and function staffing rules remain enforced at database level.</div></section><section class="panel">${cardTitle('DELIVERY','Production & delivery',`<button class="link" data-route="deliverables">Open delivery →</button>`)}<div class="summary-bar"><span><b>${A.state.productionJobs.filter(j=>j.status!=='delivered').length}</b> production jobs open</span><span><b>${deliveryPending}</b> deliverables pending</span><span><b>${delivered}</b> delivered</span></div><div class="notice">Photos, videos, albums, frames and pen drives stay attached to the Event ID.</div></section></div>
      <section class="panel" style="margin-top:18px">${cardTitle('SYSTEM','Everything connected',`<button class="btn tiny" data-action="full-refresh">↻ Refresh all</button>`)}<div class="role-strip"><span>CRM <b>${A.state.inquiries.length}</b></span><span>Events <b>${A.state.projects.length}</b></span><span>Functions <b>${A.state.functions.length}</b></span><span>Quotes <b>${A.state.quotations.length}</b></span><span>Vendors <b>${A.state.vendors.length}</b></span><span>Crew <b>${A.state.team.length}</b></span><span>Documents <b>${(A.state.documents||[]).length}</b></span><span>Campaigns <b>${(A.state.marketingCampaigns||[]).length}</b></span><span>Portals <b>${(A.state.clientPortals||[]).length}</b></span></div></section>`;
    document.querySelectorAll('[data-route="control-center"]').forEach(b=>b.classList.add('active'));
  }
  function injectNav(){
    const nav=$('#nav'); if(!nav || nav.querySelector('[data-route="control-center"]')) return;
    const group=document.createElement('div'); group.className='nav-group'; group.innerHTML=`<div class="nav-label">Command</div><button class="nav-item" data-route="control-center"><span class="nav-ico">◉</span><span>Control Center</span></button>`; nav.prepend(group);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-route="control-center"]'); if(b){e.preventDefault();state.active=true;render();}
    const r=e.target.closest('[data-action="full-refresh"]'); if(r){A.refresh().then(render).catch(()=>{});}
  });
  const mo=new MutationObserver(()=>{injectNav();if(state.active&&$('#page')&&!$('#page').querySelector('h1')?.textContent?.includes('Rachna OS Control Center') && !document.querySelector('[data-route="control-center"].active')) state.active=false;});
  mo.observe(document.body,{childList:true,subtree:true});
  window.RachnaControl={render,injectNav};
  injectNav();
})();
