(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const state = { view:'list', projectId:'', type:'', loading:false };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => A.esc ? A.esc(s) : String(s ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => A.money ? A.money(n) : `NPR ${Number(n||0).toLocaleString('en-IN')}`;
  const today = () => new Date().toISOString().slice(0,10);
  const fmt = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB') : '—';
  const projects = () => A.state.projects || [];
  const customers = () => A.state.customers || [];
  const project = (id) => projects().find(p=>p.id===id);
  const customer = (p) => customers().find(c=>c.id===p?.customer_id);
  const functionsFor = (id) => (A.state.functions||[]).filter(f=>f.project_id===id);
  const docs = async () => {
    const { data, error } = await A.sb.from('documents').select('*').order('issue_date',{ascending:false}).order('created_at',{ascending:false});
    if (error) throw error;
    return data || [];
  };
  const nextNumber = async (type) => {
    const prefix = type==='quotation'?'QUO':type==='invoice'?'INV':'RCT';
    const year = new Date().getFullYear();
    const { data, error } = await A.sb.from('documents').select('document_number').eq('document_type',type).like('document_number',`${prefix}-${year}-%`).order('document_number',{ascending:false}).limit(1);
    if (error) throw error;
    const last = data?.[0]?.document_number || '';
    const num = parseInt(last.split('-').pop() || '0',10) + 1;
    return `${prefix}-${year}-${String(num).padStart(4,'0')}`;
  };
  const quoteTotals = (projectId, quoteId) => {
    const q = (A.state.quotations||[]).find(x=>x.id===quoteId) || (A.state.quotations||[]).filter(x=>x.project_id===projectId && x.status!=='rejected').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
    const items = (A.state.quotationItems||[]).filter(i=>i.quotation_id===q?.id);
    return { quote:q, items, total:q ? Number(q.customer_total||items.reduce((s,i)=>s+Number(i.customer_price||0)*Number(i.quantity||1),0)) : 0 };
  };
  async function makeDoc(type, p, extras={}) {
    const pc = project(p.id);
    if (!pc) throw new Error('Event not found');
    let quotationId = extras.quotation_id || null;
    let paymentId = extras.payment_id || null;
    let amount = Number(extras.amount||0);
    if (type==='quotation') {
      let qrow = extras.quote_id ? (A.state.quotations||[]).find(q=>q.id===extras.quote_id) : null;
      if (!qrow) qrow = (A.state.quotations||[]).filter(q=>q.project_id===pc.id && q.status!=='rejected').sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0];
      if (!qrow) { qrow = await A.createQuotation(pc.id); await A.refresh(); }
      quotationId = qrow.id;
      amount = quoteTotals(pc.id, quotationId).total;
    } else if (type==='invoice') {
      const totals = quoteTotals(pc.id, extras.quote_id);
      if (!totals.quote) throw new Error('Create a quotation first.');
      quotationId = totals.quote.id;
      amount = extras.amount ? Number(extras.amount) : totals.total;
    } else if (type==='receipt') {
      const pay = (A.state.payments||[]).find(x=>x.id===paymentId);
      if (!pay) throw new Error('Select a customer payment first.');
      amount = Number(pay.amount||0);
      if (pay.direction!=='in') throw new Error('Receipt must be tied to a customer payment.');
    }
    const number = await nextNumber(type);
    const { data, error } = await A.sb.from('documents').insert({
      organization_id:A.state.profile?.organization_id,
      project_id:pc.id, quotation_id:quotationId, payment_id:paymentId,
      document_type:type, document_number:number, issue_date:today(), amount,
      status:'issued', notes:extras.notes||null
    }).select().single();
    if (error) throw error;
    return data;
  }
  function quoteMarkup(doc, p, c, items, total, title) {
    const funs = functionsFor(p.id);
    return `<div class="doc-paper"><div class="doc-top"><div><div class="doc-brand">RACHNA</div><div class="doc-tag">Celebrations, Composed</div><div class="doc-small">Event Planning &amp; Management · Nepal</div></div><div class="doc-kind"><div>${esc(title)}</div><strong>${esc(doc.document_number)}</strong><span>${fmt(doc.issue_date)}</span></div></div><div class="doc-rule"></div><div class="doc-grid"><div><label>CLIENT</label><strong>${esc(c?.name||'Client')}</strong><span>${esc(c?.phone||'')}</span><span>${esc(c?.email||'')}</span></div><div><label>EVENT</label><strong>${esc(p.name||'Event')}</strong><span>${esc(p.date_range_bs||'')}</span><span>${esc(funs.map(f=>f.name).join(' · '))}</span></div></div><table class="doc-table"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${(items.length?items:[{description:'Event services',quantity:1,customer_price:total}]).map(i=>`<tr><td>${esc(i.description||'Service')}</td><td>${Number(i.quantity||1)}</td><td>${money(i.customer_price)}</td><td>${money(Number(i.customer_price||0)*Number(i.quantity||1))}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3">TOTAL</td><td>${money(total)}</td></tr></tfoot></table><div class="doc-notes"><strong>Notes</strong><p>${esc(doc.notes||'Prices and scope are based on the confirmed event requirements. Any additions or changes will be discussed before execution.')}</p></div><div class="doc-footer"><span>Thank you for trusting Rachna.</span><span>This document is computer generated.</span></div></div>`;
  }
  function invoiceMarkup(doc,p,c,items,total){
    const base=quoteMarkup(doc,p,c,items,total,'SERVICE INVOICE');
    return base.replace('<div class="doc-notes"><strong>Notes</strong><p>', '<div class="doc-notes"><strong>Payment due</strong><p>Please settle the outstanding balance as agreed for the event.</p><strong>Notes</strong><p>');
  }
  function receiptMarkup(doc,p,c,payment){
    return `<div class="doc-paper"><div class="doc-top"><div><div class="doc-brand">RACHNA</div><div class="doc-tag">Celebrations, Composed</div><div class="doc-small">Event Planning &amp; Management · Nepal</div></div><div class="doc-kind"><div>PAYMENT RECEIPT</div><strong>${esc(doc.document_number)}</strong><span>${fmt(doc.issue_date)}</span></div></div><div class="doc-rule"></div><div class="doc-grid"><div><label>RECEIVED FROM</label><strong>${esc(c?.name||'Client')}</strong><span>${esc(c?.phone||'')}</span></div><div><label>EVENT</label><strong>${esc(p.name||'Event')}</strong><span>${esc(p.date_range_bs||'')}</span></div></div><div class="receipt-box"><div>Amount received</div><strong>${money(payment?.amount||doc.amount)}</strong><div>Payment date: ${fmt(payment?.payment_date||doc.issue_date)} · Method: ${esc(payment?.method||'—')}</div><div>Reference: ${esc(payment?.reference||'—')}</div></div><div class="doc-notes"><strong>Payment status</strong><p>Received and recorded against the event account.</p></div><div class="doc-footer"><span>Thank you for trusting Rachna.</span><span>This document is computer generated.</span></div></div>`;
  }
  function printDoc(doc){
    const p=project(doc.project_id), c=customer(p); if (!p) throw new Error('Event no longer exists.');
    const q=quoteTotals(p.id,doc.quotation_id), pay=(A.state.payments||[]).find(x=>x.id===doc.payment_id);
    const body=doc.document_type==='receipt'?receiptMarkup(doc,p,c,pay):doc.document_type==='invoice'?invoiceMarkup(doc,p,c,q.items,Number(doc.amount||q.total)):quoteMarkup(doc,p,c,q.items,Number(doc.amount||q.total),`QUOTATION v${q.quote?.version||''}`.trim());
    const w=window.open('','_blank','noopener,noreferrer,width=1000,height=900'); if(!w) throw new Error('Popup blocked. Allow popups to print the document.');
    w.document.write(`<!doctype html><html><head><title>${esc(doc.document_number)}</title><style>${printCss()}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>`); w.document.close();
  }
  function printCss(){return `*{box-sizing:border-box}body{margin:0;background:#f1eee9;color:#1f1b18;font:14px/1.5 Arial,sans-serif}.doc-paper{width:794px;min-height:1123px;margin:25px auto;padding:55px 58px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.1)}.doc-top{display:flex;justify-content:space-between;gap:30px}.doc-brand{font:800 30px/1 Georgia,serif;letter-spacing:4px}.doc-tag{font:12px/1.5 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-top:8px}.doc-small{margin-top:12px;color:#736c64;font-size:11px}.doc-kind{text-align:right;text-transform:uppercase;letter-spacing:1.6px;font-size:11px;color:#6b645d}.doc-kind strong{display:block;color:#1f1b18;font-size:18px;margin:7px 0}.doc-kind span{font-size:11px}.doc-rule{height:1px;background:#1f1b18;margin:28px 0}.doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:34px}.doc-grid label{display:block;font-size:9px;letter-spacing:1.5px;color:#837b73;margin-bottom:7px}.doc-grid strong,.doc-grid span{display:block}.doc-grid strong{font-size:15px;margin-bottom:4px}.doc-grid span{color:#6d665f;font-size:12px}.doc-table{width:100%;border-collapse:collapse}.doc-table th{font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left;border-bottom:1px solid #1f1b18;padding:9px 5px}.doc-table th:not(:first-child),.doc-table td:not(:first-child){text-align:right}.doc-table td{padding:11px 5px;border-bottom:1px solid #e8e3dd}.doc-table tfoot td{padding-top:18px;border-top:1px solid #1f1b18;border-bottom:none;font-weight:800}.doc-notes{margin-top:45px;padding:18px;background:#f7f4f0}.doc-notes strong{font-size:11px;text-transform:uppercase;letter-spacing:1px}.doc-notes p{margin:8px 0 0;color:#5e5750;font-size:12px}.doc-footer{margin-top:80px;padding-top:14px;border-top:1px solid #ddd6ce;display:flex;justify-content:space-between;font-size:10px;color:#8a8178}.receipt-box{margin:55px 0 40px;padding:30px;border:1px solid #1f1b18;text-align:center}.receipt-box div{font-size:11px;color:#706860}.receipt-box strong{display:block;font:700 38px Georgia,serif;margin:10px 0 18px}@media print{body{background:#fff}.doc-paper{width:auto;min-height:auto;margin:0;padding:35px 45px;box-shadow:none}@page{size:A4;margin:0}}`}
  async function page(){
    const el=$('#page'); if(!el) return;
    try{
      const all=await docs(); const rows=all.map(d=>{const p=project(d.project_id),c=customer(p);return {...d,p,c}});
      el.innerHTML=`<div class="docs-shell"><div class="page-head"><div><div class="eyebrow">DOCUMENTS</div><h1>Quotation, Invoice &amp; Receipt</h1><p>One document trail attached to every Event ID.</p></div><button class="primary" id="docs-new">New document</button></div><div class="kpi-grid"><div class="kpi"><span>Quotations</span><strong>${rows.filter(x=>x.document_type==='quotation').length}</strong></div><div class="kpi"><span>Invoices</span><strong>${rows.filter(x=>x.document_type==='invoice').length}</strong></div><div class="kpi"><span>Receipts</span><strong>${rows.filter(x=>x.document_type==='receipt').length}</strong></div><div class="kpi"><span>Document value</span><strong>${money(rows.reduce((s,x)=>s+Number(x.amount||0),0))}</strong></div></div><div class="panel"><div class="panel-head"><strong>Document register</strong><span>${rows.length} documents</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Document</th><th>Event</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><strong>${esc(x.document_number)}</strong><div class="muted">${esc(x.document_type)}</div></td><td>${esc(x.p?.name||'—')}</td><td>${esc(x.c?.name||'—')}</td><td>${fmt(x.issue_date)}</td><td>${money(x.amount)}</td><td>${esc(x.status)}</td><td><button class="ghost small" data-print="${x.id}">Print / PDF</button></td></tr>`).join(''):`<tr><td colspan="7"><div class="empty">No documents yet. Create the first quotation, invoice or receipt from an event.</div></td></tr>`}</tbody></table></div></div></div>`;
      el.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>{const d=rows.find(x=>x.id===b.dataset.print); if(d) printDoc(d)}); $('#docs-new')?.addEventListener('click',showNew);
    }catch(e){el.innerHTML=`<div class="panel"><strong>Documents could not load</strong><p>${esc(e.message||e)}</p></div>`}
  }
  function showNew(){
    const modal=document.createElement('div'); modal.className='os-modal-backdrop';
    modal.innerHTML=`<div class="os-modal"><div class="os-modal-head"><div><div class="eyebrow">NEW DOCUMENT</div><h2>Choose event &amp; document</h2></div><button class="ghost" data-close>Close</button></div><div class="os-form"><label>Event<select id="doc-event"><option value="">Select an event</option>${projects().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Document<select id="doc-type"><option value="quotation">Quotation</option><option value="invoice">Invoice</option><option value="receipt">Receipt</option></select></label><label id="doc-payment-wrap" style="display:none">Customer payment<select id="doc-payment"><option value="">Select payment</option></select></label><label id="doc-amount-wrap" style="display:none">Invoice amount<input id="doc-amount" type="number" min="0" step="1000"></label><div class="os-actions"><button class="ghost" data-close>Cancel</button><button class="primary" id="doc-create">Create &amp; Print</button></div></div></div>`;
    document.body.appendChild(modal);
    const ev=modal.querySelector('#doc-event'), typ=modal.querySelector('#doc-type'), pw=modal.querySelector('#doc-payment-wrap'), aw=modal.querySelector('#doc-amount-wrap'), pay=modal.querySelector('#doc-payment'), amount=modal.querySelector('#doc-amount');
    const sync=()=>{const p=project(ev.value); const payments=(A.state.payments||[]).filter(x=>x.project_id===ev.value&&x.direction==='in'); pw.style.display=typ.value==='receipt'?'block':'none'; aw.style.display=typ.value==='invoice'?'block':'none'; pay.innerHTML=`<option value="">Select payment</option>`+payments.map(x=>`<option value="${x.id}">${fmt(x.payment_date)} · ${money(x.amount)} · ${esc(x.method||'')}</option>`).join(''); if(p&&typ.value==='invoice'){const t=quoteTotals(p.id); amount.value=t.total||'';}};
    ev.onchange=sync; typ.onchange=sync; sync(); modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal.remove());
    modal.querySelector('#doc-create').onclick=async()=>{try{const p=project(ev.value);if(!p)throw new Error('Select an event.');const d=await makeDoc(typ.value,p,{payment_id:pay.value,amount:amount.value});modal.remove();await page();printDoc(d)}catch(e){alert(e.message||e)}};
  }
  function ensureStyles(){
    if(document.getElementById('os-documents-style')) return;
    const s=document.createElement('style'); s.id='os-documents-style'; s.textContent=`.os-modal-backdrop{position:fixed;inset:0;background:rgba(24,20,18,.38);display:grid;place-items:center;z-index:9999}.os-modal{width:min(560px,92vw);background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.os-modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.os-form{display:grid;gap:14px}.os-form label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#5e5750}.os-form input,.os-form select{width:100%;padding:11px 12px;border:1px solid #ddd6ce;border-radius:10px;background:#fff;color:#222}.os-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}.docs-shell{max-width:1400px}.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.kpi{background:#fff;border:1px solid #ebe5de;border-radius:14px;padding:15px}.kpi span{display:block;color:#7b7269;font-size:11px}.kpi strong{display:block;font-size:24px;margin-top:6px}.panel{background:#fff;border:1px solid #ebe5de;border-radius:14px;overflow:hidden}.panel-head{padding:16px;border-bottom:1px solid #eee7df;display:flex;justify-content:space-between}.table-wrap{overflow:auto}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{padding:12px 14px;border-bottom:1px solid #eee7df;text-align:left;font-size:12px}.muted{color:#8a8178;font-size:10px;margin-top:2px}.empty{padding:35px;text-align:center;color:#8a8178}.small{padding:7px 10px;font-size:11px}@media(max-width:800px){.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.page-head{flex-direction:column}}`; document.head.appendChild(s);
  }
  function inject(){
    const nav=$('#nav'); if(!nav||nav.querySelector('[data-documents-nav]')) return;
    const div=document.createElement('div'); div.innerHTML=`<div data-documents-nav><div class="nav-section-label">Documents</div><button class="nav-item" data-route="documents"><span>Documents</span></button></div>`;
    nav.prepend(div.firstElementChild); nav.querySelector('[data-route="documents"]').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();page();});
  }
  function boot(){ensureStyles();inject();const observer=new MutationObserver(inject);if($('#nav')) observer.observe($('#nav'),{childList:true,subtree:true});}
  window.RachnaDocuments={page,makeDoc,printDoc};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
