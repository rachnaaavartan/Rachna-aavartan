(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN', {maximumFractionDigits:0}));
  const toast = (m, error=false) => { const n=$('#toast'); if(!n)return; n.textContent=m; n.className='toast show'+(error?' error':''); clearTimeout(window.__finToast); window.__finToast=setTimeout(()=>n.className='toast',3000); };
  const state = { search:'', status:'all' };

  const css = document.createElement('style');
  css.textContent = `
    .fin-wrap{display:grid;gap:18px}.fin-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.fin-kpi{border:1px solid #e1ddd5;border-radius:15px;background:#fff;padding:15px}.fin-kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#817b73}.fin-kpi strong{display:block;font-size:22px;margin-top:5px}.fin-kpi em{display:block;font-size:12px;font-style:normal;color:#8a847c;margin-top:3px}.fin-profit{color:#26734d}.fin-loss{color:#9a4037}
    .fin-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.fin-filters{display:flex;gap:8px;flex-wrap:wrap}.fin-search{min-width:260px}.fin-select{min-width:150px}.fin-note{font-size:12px;color:#817b73}.fin-table{width:100%;border-collapse:collapse}.fin-table th,.fin-table td{padding:11px 12px;border-bottom:1px solid #eee9e2;text-align:left;font-size:13px;vertical-align:top}.fin-table th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#817b73;background:#faf9f7}.fin-table tr:last-child td{border-bottom:0}.fin-event{font-weight:700}.fin-event small{display:block;color:#8b857d;font-weight:400;margin-top:3px}.fin-num{text-align:right!important;white-space:nowrap}.fin-total{font-weight:700;background:#faf9f7}.fin-badge{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:11px;background:#f1eee8;color:#625d56}.fin-breakdown{display:grid;grid-template-columns:1fr 1fr;gap:14px}.fin-card{border:1px solid #e1ddd5;border-radius:15px;background:#fff;padding:16px}.fin-card h3{margin:0 0 4px;font-size:15px}.fin-card p{margin:0;color:#817b73;font-size:12px}.fin-list{margin-top:12px;display:grid;gap:8px}.fin-line{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px dashed #e7e2da;font-size:13px}.fin-line:last-child{border-bottom:0}.fin-alert{padding:12px 14px;border:1px solid #eadfbd;background:#fffaf0;border-radius:12px;color:#665a3c;font-size:12px}.fin-mobile-scroll{overflow:auto}.fin-drill{cursor:pointer}.fin-drill:hover{background:#faf9f7}
    @media(max-width:1100px){.fin-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.fin-kpis{grid-template-columns:1fr 1fr}.fin-breakdown{grid-template-columns:1fr}.fin-search{min-width:200px}.fin-table{min-width:1050px}}
  `;
  document.head.appendChild(css);

  function calcProject(p){
    const id=p.id;
    const payments=A.state.payments.filter(x=>x.project_id===id && x.direction==='in');
    const received=payments.reduce((s,x)=>s+Number(x.amount||0),0);
    const vendorRows=A.state.vendorBookings.filter(x=>x.project_id===id);
    const vendorCost=vendorRows.reduce((s,x)=>s+Number(x.quoted_cost||0),0);
    const crewRows=A.state.projectTeam.filter(x=>x.project_id===id);
    const crewCost=crewRows.reduce((s,x)=>s+Number(x.rate||0),0);
    const expenses=A.state.expenses.filter(x=>x.project_id===id);
    const otherCost=expenses.filter(x=>!['vendor','crew','freelancer','team'].some(k=>String(x.category||'').toLowerCase().includes(k)))
      .reduce((s,x)=>s+Number(x.amount||0),0);
    const totalCost=vendorCost+crewCost+otherCost;
    const revenue=Number(p.quoted_total||0);
    const balance=Math.max(0,revenue-received);
    const profit=revenue-totalCost;
    const margin=revenue>0?(profit/revenue)*100:0;
    return {p,revenue,received,balance,vendorCost,crewCost,otherCost,totalCost,profit,margin,payments,vendorRows,crewRows,expenses};
  }

  function renderFinance(){
    const page=$('#page'); if(!page) return;
    const projects=A.state.projects.map(calcProject);
    const filtered=projects.filter(x=>{
      const text=[x.p.event_code,x.p.name,A.state.customers.find(c=>c.id===x.p.customer_id)?.name,x.p.status].join(' ').toLowerCase();
      return (!state.search || text.includes(state.search.toLowerCase())) && (state.status==='all' || x.p.status===state.status);
    });
    const revenue=projects.reduce((s,x)=>s+x.revenue,0), received=projects.reduce((s,x)=>s+x.received,0), balance=projects.reduce((s,x)=>s+x.balance,0), vendor=projects.reduce((s,x)=>s+x.vendorCost,0), crew=projects.reduce((s,x)=>s+x.crewCost,0), other=projects.reduce((s,x)=>s+x.otherCost,0), costs=vendor+crew+other, profit=revenue-costs, margin=revenue?profit/revenue*100:0;
    const statuses=[...new Set(A.state.projects.map(p=>p.status).filter(Boolean))].sort();
    page.innerHTML=`<div class="fin-wrap">
      <div class="page-head"><div><div class="eyebrow">FINANCE MANAGER</div><h1>Finance & P&amp;L</h1><p>Event-level revenue, received cash, direct operating costs and profit.</p></div></div>
      <div class="fin-kpis">
        <div class="fin-kpi"><span>Quoted revenue</span><strong>${money(revenue)}</strong><em>all events</em></div>
        <div class="fin-kpi"><span>Cash received</span><strong>${money(received)}</strong><em>customer payments</em></div>
        <div class="fin-kpi"><span>Customer balance</span><strong>${money(balance)}</strong><em>still to collect</em></div>
        <div class="fin-kpi"><span>Total operating cost</span><strong>${money(costs)}</strong><em>vendor + crew + other</em></div>
        <div class="fin-kpi"><span>Net profit</span><strong class="${profit>=0?'fin-profit':'fin-loss'}">${money(profit)}</strong><em>${margin.toFixed(1)}% margin</em></div>
      </div>
      <div class="fin-toolbar"><div class="fin-filters"><input class="search fin-search" id="finSearch" value="${esc(state.search)}" placeholder="Search Event ID, client or event"><select class="search fin-select" id="finStatus"><option value="all">All statuses</option>${statuses.map(s=>`<option value="${esc(s)}" ${s===state.status?'selected':''}>${esc(s)}</option>`).join('')}</select></div><div class="fin-note">Profit = quoted revenue − vendor − crew − other recorded costs.</div></div>
      <section class="panel table-panel"><div class="panel-title"><div><div class="eyebrow">EVENT P&amp;L</div><h2>Profitability by Event ID</h2><p>Click an event to see the underlying money breakdown.</p></div></div><div class="fin-mobile-scroll"><table class="fin-table"><thead><tr><th>Event</th><th class="fin-num">Quoted</th><th class="fin-num">Received</th><th class="fin-num">Balance</th><th class="fin-num">Vendor</th><th class="fin-num">Crew</th><th class="fin-num">Other</th><th class="fin-num">Profit</th><th>Margin</th></tr></thead><tbody>${filtered.map(x=>{const c=A.state.customers.find(v=>v.id===x.p.customer_id);return `<tr class="fin-drill" data-fin-event="${esc(x.p.id)}"><td><div class="fin-event">${esc(x.p.event_code||'Event')}</div><small>${esc(x.p.name||'')} · ${esc(c?.name||'No client')} · <span class="fin-badge">${esc(x.p.status||'—')}</span></small></td><td class="fin-num">${money(x.revenue)}</td><td class="fin-num">${money(x.received)}</td><td class="fin-num">${money(x.balance)}</td><td class="fin-num">${money(x.vendorCost)}</td><td class="fin-num">${money(x.crewCost)}</td><td class="fin-num">${money(x.otherCost)}</td><td class="fin-num ${x.profit>=0?'fin-profit':'fin-loss'}"><b>${money(x.profit)}</b></td><td>${x.revenue?x.margin.toFixed(1)+'%':'—'}</td></tr>`}).join('')||`<tr><td colspan="9">No events match this filter.</td></tr>`}</tbody></table></div></section>
      <div class="fin-breakdown"><section class="fin-card"><h3>Cost mix</h3><p>Where event operating money is going.</p><div class="fin-list"><div class="fin-line"><span>Vendor costs</span><b>${money(vendor)}</b></div><div class="fin-line"><span>Crew / freelancer costs</span><b>${money(crew)}</b></div><div class="fin-line"><span>Other expenses</span><b>${money(other)}</b></div><div class="fin-line"><span>Total costs</span><b>${money(costs)}</b></div></div></section><section class="fin-card"><h3>Collection health</h3><p>Cash received against quoted event revenue.</p><div class="fin-list"><div class="fin-line"><span>Quoted revenue</span><b>${money(revenue)}</b></div><div class="fin-line"><span>Received</span><b>${money(received)}</b></div><div class="fin-line"><span>Outstanding</span><b>${money(balance)}</b></div><div class="fin-line"><span>Collection rate</span><b>${revenue?(received/revenue*100).toFixed(1):'0.0'}%</b></div></div></section></div>
      ${projects.some(x=>x.profit<0)?'<div class="fin-alert"><b>Attention:</b> one or more events currently have costs above quoted revenue. Review those Event IDs before committing more spend.</div>':''}
    </div>`;
  }

  function openDetail(id){
    const x=calcProject(A.state.projects.find(p=>p.id===id)); if(!x)return;
    const c=A.state.customers.find(v=>v.id===x.p.customer_id);
    const vendorLines=x.vendorRows.map(v=>{const vd=A.state.vendors.find(z=>z.id===v.vendor_id);return `<div class="fin-line"><span>${esc(vd?.name||'Vendor')} · ${esc(v.requirement||v.category||'Job')}</span><b>${money(v.quoted_cost)}</b></div>`}).join('')||'<div class="fin-line"><span>No vendor cost recorded</span><b>NPR 0</b></div>';
    const crewLines=x.crewRows.map(v=>{const m=A.state.team.find(z=>z.id===v.team_member_id);const f=A.state.functions.find(z=>z.id===v.function_id);return `<div class="fin-line"><span>${esc(m?.name||'Crew')} · ${esc(v.responsibility||'Crew')}${f?' · '+esc(f.name):''}</span><b>${money(v.rate)}</b></div>`}).join('')||'<div class="fin-line"><span>No crew cost recorded</span><b>NPR 0</b></div>';
    const expenseLines=x.expenses.map(v=>`<div class="fin-line"><span>${esc(v.category||'Other')} · ${esc(v.description||'Expense')}</span><b>${money(v.amount)}</b></div>`).join('')||'<div class="fin-line"><span>No other expenses recorded</span><b>NPR 0</b></div>';
    const n=$('#modal'); if(!n)return;
    n.innerHTML=`<div class="modal-head"><div><div class="eyebrow">EVENT P&amp;L</div><h2>${esc(x.p.event_code||'Event')}</h2><p>${esc(x.p.name)} · ${esc(c?.name||'No client')}</p></div><button class="close-btn" data-fin-action="close">×</button></div><div class="modal-body">
      <div class="summary-bar"><span><b>Quoted</b><br>${money(x.revenue)}</span><span><b>Received</b><br>${money(x.received)}</span><span><b>Balance</b><br>${money(x.balance)}</span><span><b>Profit</b><br><span class="${x.profit>=0?'fin-profit':'fin-loss'}">${money(x.profit)}</span></span></div>
      <div class="fin-breakdown"><section class="fin-card"><h3>Vendor costs</h3><p>Recorded vendor jobs.</p><div class="fin-list">${vendorLines}</div></section><section class="fin-card"><h3>Crew costs</h3><p>Assigned freelancer/team rates.</p><div class="fin-list">${crewLines}</div></section><section class="fin-card"><h3>Other expenses</h3><p>General project expenses, excluding vendor/crew categories.</p><div class="fin-list">${expenseLines}</div></section><section class="fin-card"><h3>Result</h3><p>Current event margin.</p><div class="fin-list"><div class="fin-line"><span>Total cost</span><b>${money(x.totalCost)}</b></div><div class="fin-line"><span>Net profit</span><b class="${x.profit>=0?'fin-profit':'fin-loss'}">${money(x.profit)}</b></div><div class="fin-line"><span>Margin</span><b>${x.revenue?x.margin.toFixed(1)+'%':'—'}</b></div></div></section></div>
    </div><div class="modal-foot"><button class="btn" data-fin-action="close">Close</button></div>`;
    $('#backdrop')?.classList.add('show');
  }

  function intercept(){
    document.addEventListener('click',e=>{
      const route=e.target.closest('[data-route="finance"]');
      if(route){e.preventDefault();e.stopImmediatePropagation();state.search='';state.status='all';renderFinance();}
      const row=e.target.closest('[data-fin-event]');
      if(row && $('#page')){e.preventDefault();openDetail(row.dataset.finEvent);}
      const closeBtn=e.target.closest('[data-fin-action="close"]');
      if(closeBtn){e.preventDefault();$('#backdrop')?.classList.remove('show');}
    },true);
    document.addEventListener('input',e=>{if(e.target.id==='finSearch'){state.search=e.target.value;renderFinance();}},true);
    document.addEventListener('change',e=>{if(e.target.id==='finStatus'){state.status=e.target.value;renderFinance();}},true);
    const originalNav=window.__rachnaFinanceNav;
    if(!originalNav) window.__rachnaFinanceNav=true;
  }
  intercept();
})();
