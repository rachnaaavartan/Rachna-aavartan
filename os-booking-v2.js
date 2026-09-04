(() => {
  'use strict';
  const A=window.RachnaAPI;if(!A)return;
  const $=(s,r=document)=>r.querySelector(s);const esc=A.esc;const money=A.money;
  const customer=p=>A.state.customers.find(c=>c.id===p?.customer_id);
  const received=p=>A.state.payments.filter(x=>x.project_id===p?.id&&x.direction==='in').reduce((s,x)=>s+Number(x.amount||0),0);
  const required=p=>Math.round(Number(p?.quoted_total||0)*0.30);
  const isBooked=p=>p?.status==='booked'||(Number(p?.quoted_total||0)>0&&received(p)>=required(p));
  const quote=p=>A.state.quotations.filter(q=>q.project_id===p?.id).sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
  const toast=(m,e=false)=>{const n=$('#toast');if(!n)return;n.textContent=m;n.className='toast show'+(e?' error':'');setTimeout(()=>n.className='toast',2600)};
  function advanceModal(p){
    const req=required(p),got=received(p),remain=Math.max(0,req-got),modal=$('#modal'),back=$('#backdrop');if(!modal||!back)return;
    modal.innerHTML=`<div class="modal-head"><div><div class="eyebrow">BOOKING CONTROL</div><h2>Record customer advance</h2></div><button class="close-btn" data-action="close">×</button></div><div class="modal-body"><div class="notice">${esc(customer(p)?.name||'Customer')} · ${esc(p.event_code||p.name||'Event')}<br>Booking threshold: <b>${money(req)}</b> · Received: <b>${money(got)}</b></div><div class="form-grid"><label class="field"><span>Amount</span><input id="bkAmount" type="number" min="1" value="${remain||req}"></label><label class="field"><span>Method</span><select id="bkMethod"><option>Cash</option><option>Bank Transfer</option><option>eSewa</option><option>Khalti</option><option>Other</option></select></label><label class="field full"><span>Reference</span><input id="bkRef" placeholder="Receipt / transaction reference"></label></div></div><div class="modal-foot"><button class="btn" data-action="close">Cancel</button><button class="btn primary" id="bkSave">Save advance</button></div>`;back.classList.add('show');
    $('#bkSave').onclick=async()=>{try{const amount=Number($('#bkAmount').value);if(!(amount>0))throw new Error('Enter a valid amount');await A.recordAdvance(p.id,amount,$('#bkMethod').value,$('#bkRef').value.trim()||null);back.classList.remove('show');toast('Advance recorded and booking status refreshed');await A.refresh();render();}catch(e){toast(e.message||'Could not record advance',true)}};
  }
  function page(){
    const ps=A.state.projects.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    const rows=ps.map(p=>{const q=quote(p),got=received(p),req=required(p),bal=Math.max(0,Number(p.quoted_total||0)-got),b=isBooked(p);return `<tr><td><b class="event-code">${esc(p.event_code||'—')}</b><small>${esc(p.name||'Event')}</small></td><td><b>${esc(customer(p)?.name||'No client')}</b></td><td>${q?`V${esc(q.version||1)} · ${esc(q.status||'draft')}`:'—'}</td><td>${money(p.quoted_total)}</td><td>${money(got)}<small>Target ${money(req)}</small></td><td>${money(bal)}</td><td><span class="status ${b?'paid':'pending'}">${b?'Booked':'Advance pending'}</span></td><td>${b?'':`<button class="btn tiny primary" data-action="booking-advance" data-id="${p.id}">Record advance</button>`}</td></tr>`}).join('');
    const bookedCount=ps.filter(isBooked).length,totalQuoted=ps.reduce((s,p)=>s+Number(p.quoted_total||0),0),cash=ps.reduce((s,p)=>s+received(p),0),pending=ps.length-bookedCount;
    $('#page').innerHTML=`<div class="page-head"><div><div class="eyebrow">BOOKING CONTROL</div><h1>Bookings</h1><p>Quote → advance → confirmed booking, tied to the same Event ID.</p></div><div class="actions"><button class="btn soft" data-action="refresh-booking">↻ Refresh</button></div></div><div class="metrics"><div class="metric"><div class="metric-top"><small>Booked</small></div><strong>${bookedCount}</strong><em>Confirmed events</em></div><div class="metric"><div class="metric-top"><small>Advance pending</small></div><strong>${pending}</strong><em>Needs collection</em></div><div class="metric"><div class="metric-top"><small>Total quoted</small></div><strong>${money(totalQuoted)}</strong><em>All events</em></div><div class="metric"><div class="metric-top"><small>Cash received</small></div><strong>${money(cash)}</strong><em>Customer payments</em></div></div><div class="panel table-panel"><table><thead><tr><th>Event</th><th>Client</th><th>Quotation</th><th>Quoted</th><th>Received</th><th>Balance</th><th>Booking</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="8">No events yet.</td></tr>`}</tbody></table></div>`;
  }
  function render(){A.refresh().then(page).catch(e=>toast(e.message||'Could not load bookings',true));}
  document.addEventListener('click',e=>{
    const route=e.target.closest('[data-route="bookings"]');if(route){e.preventDefault();e.stopImmediatePropagation();render();return;}
    const b=e.target.closest('[data-action="booking-advance"]');if(b){const p=A.state.projects.find(x=>x.id===b.dataset.id);if(p)advanceModal(p);return;}
    if(e.target.closest('[data-action="refresh-booking"]'))render();
  },true);
  function inject(){
    const nav=$('#nav');if(nav&&!nav.querySelector('[data-route="bookings"]')){const g=document.createElement('div');g.className='nav-group';g.innerHTML='<div class="nav-label">Sales</div><button class="nav-item" data-route="bookings"><span class="nav-ico">✓</span><span>Bookings</span></button>';nav.prepend(g)}
  }
  new MutationObserver(inject).observe(document.documentElement,{subtree:true,childList:true});
  window.RachnaBooking={render};
})();
