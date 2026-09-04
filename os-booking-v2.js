(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => `NPR ${Number(n || 0).toLocaleString('en-IN')}`);
  const STATUS = { draft:'Draft', sent:'Sent', accepted:'Accepted', rejected:'Rejected', booked:'Booked' };
  const toast = (m, error=false) => { const n=$('#toast'); if(!n)return; n.textContent=m; n.className='toast show'+(error?' error':''); setTimeout(()=>n.className='toast',2600); };
  const customer = p => A.state.customers.find(c => c.id === p?.customer_id);
  const quotes = p => A.state.quotations.filter(q => q.project_id === p?.id).sort((a,b) => Number(b.version||0)-Number(a.version||0));
  const latestQuote = p => quotes(p)[0] || null;
  const received = p => A.state.payments.filter(x => x.project_id === p?.id && x.direction === 'in').reduce((s,x)=>s+Number(x.amount||0),0);
  const requiredAdvance = p => Math.round(Number(p?.quoted_total||0) * 0.30);
  const booked = p => p?.status === 'booked' || (Number(p?.quoted_total||0) > 0 && received(p) >= requiredAdvance(p));

  function card(p){
    const q=latestQuote(p), got=received(p), req=requiredAdvance(p), bal=Math.max(0,Number(p?.quoted_total||0)-got), isBooked=booked(p);
    const state = isBooked ? ['Booked','Booking confirmed'] : (req > 0 && got >= req ? ['Ready','Advance threshold reached'] : ['Pending','Advance required to confirm']);
    return `<section class="panel booking-control" style="margin-top:16px"><div class="panel-title"><div><div class="eyebrow">BOOKING CONTROL</div><h2>${state[0]}</h2><p>One place to see quote, advance, confirmation and balance.</p></div><span class="status ${isBooked?'paid':'pending'}">${esc(state[1])}</span></div><div class="metrics" style="margin-top:12px"><div class="metric"><div class="metric-top"><small>Latest quotation</small></div><strong>${q ? `V${esc(q.version||1)}` : '—'}</strong><em>${esc(STATUS[q?.status] || q?.status || 'No quotation')}</em></div><div class="metric"><div class="metric-top"><small>Quoted total</small></div><strong>${money(p?.quoted_total)}</strong><em>Customer total</em></div><div class="metric"><div class="metric-top"><small>Advance received</small></div><strong>${money(got)}</strong><em>${req ? `Target ${money(req)}` : 'Set quotation first'}</em></div><div class="metric"><div class="metric-top"><small>Balance</small></div><strong>${money(bal)}</strong><em>${isBooked?'Remaining customer balance':'Not yet confirmed'}</em></div></div><div class="actions" style="margin-top:12px">${!isBooked && req>0 ? `<button class="btn primary" data-action="booking-advance" data-id="${p.id}">＋ Record advance</button>` : ''}${isBooked ? `<button class="btn soft" data-action="booking-receipt" data-id="${p.id}">View payments</button>` : ''}<button class="btn soft" data-action="booking-quotation" data-id="${p.id}">Open quotation</button></div></section>`;
  }

  const oldProjectPage = window.__rachnaProjectPage;
  if (!oldProjectPage) {
    try { window.__rachnaProjectPage = window.projectPage; } catch(e) {}
  }

  document.addEventListener('click', e => {
    const b=e.target.closest('[data-action="booking-advance"]');
    if(b){
      const p=A.state.projects.find(x=>x.id===b.dataset.id); if(!p)return;
      const req=requiredAdvance(p), got=received(p), remain=Math.max(0,req-got);
      const modal=$('#modal'), back=$('#backdrop'); if(!modal||!back)return;
      modal.innerHTML=`<div class="modal-head"><div><div class="eyebrow">BOOKING CONTROL</div><h2>Record customer advance</h2></div><button class="close-btn" data-action="close">×</button></div><div class="modal-body"><div class="notice">${esc(customer(p)?.name||'Customer')} · ${esc(p.event_code||p.name||'Event')}<br>Booking threshold: <b>${money(req)}</b> · Already received: <b>${money(got)}</b></div><div class="form-grid">${`<label class="field"><span>Amount</span><input id="bkAmount" type="number" min="1" value="${remain||req}"></label>`}<label class="field"><span>Method</span><select id="bkMethod"><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="eSewa">eSewa</option><option value="Khalti">Khalti</option><option value="Other">Other</option></select></label><label class="field full"><span>Reference</span><input id="bkRef" placeholder="Receipt / transaction reference"></label></div></div><div class="modal-foot"><button class="btn" data-action="close">Cancel</button><button class="btn primary" id="bkSave">Save advance</button></div>`;
      back.classList.add('show');
      $('#bkSave').onclick=async()=>{try{const amount=Number($('#bkAmount').value); if(!(amount>0))throw new Error('Enter a valid amount'); await A.recordAdvance(p.id,amount,$('#bkMethod').value,$('#bkRef').value.trim()||null); back.classList.remove('show'); toast('Advance recorded'); document.dispatchEvent(new CustomEvent('rachna:refresh-booking')); }catch(err){toast(err.message||'Could not record advance',true)}};
    }
    const q=e.target.closest('[data-action="booking-quotation"]');
    if(q){ document.querySelector('[data-tab="quotation"]')?.click(); }
  });

  function mount(){
    const p=A.state.projects.find(x=>x.id===window.__rachnaCurrentProjectId);
    if(!p)return;
    const host=$('#page'); if(!host)return;
    const anchor=host.querySelector('.event-tabs')||host.querySelector('.event-body');
    if(host.querySelector('.booking-control')) host.querySelector('.booking-control').remove();
    if(anchor) anchor.insertAdjacentHTML('afterend', card(p));
    else host.insertAdjacentHTML('beforeend', card(p));
  }
  document.addEventListener('rachna:refresh-booking',()=>{ A.refresh().then(mount).catch(()=>{}); });
  window.RachnaBooking = { mount };
})();
