(()=>{
'use strict';
const A=window.RachnaAPI;if(!A||!A.sb)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=A.esc||String,escAttr=v=>esc(v).replace(/`/g,'&#96;'),money=A.money||((n)=>`NPR ${Number(n||0).toLocaleString('en-IN')}`),S=A.state;
const by=(a,id)=>a.find(x=>x.id===id),inq=id=>by(S.inquiries,id),proj=id=>by(S.projects,id),cust=id=>by(S.customers,id),fns=id=>S.functions.filter(f=>f.project_id===id).sort((a,b)=>String(a.event_date||'9999').localeCompare(String(b.event_date||'9999')));
const toast=(m,bad=false)=>{let n=$('#toast')||$('#cosToast');if(!n)return;n.textContent=m;n.className=(n.id==='toast'?'toast':'cos-toast')+' show'+(bad?' error':'');clearTimeout(window.__doToast);window.__doToast=setTimeout(()=>n.className=n.id==='toast'?'toast':'cos-toast',2800)};
const field=(l,id,v='',type='text',x='')=>`<label class="dayone-field"><span>${esc(l)}</span><input id="${id}" type="${type}" value="${esc(v??'')}" ${x}></label>`;
const select=(l,id,opts,v='')=>`<label class="dayone-field"><span>${esc(l)}</span><select id="${id}">${opts.map(o=>`<option value="${escAttr(o[0])}" ${String(o[0])===String(v)?'selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`;
const area=(l,id,v='')=>`<label class="dayone-field dayone-full"><span>${esc(l)}</span><textarea id="${id}">${esc(v??'')}</textarea></label>`;
function modal(title,body,actions){let b=$('#dayOneModal');if(!b){b=document.createElement('div');b.id='dayOneModal';b.className='dayone-modal-backdrop';document.body.appendChild(b)}b.innerHTML=`<div class="dayone-modal"><div class="dayone-modal-head"><div><small>RACHNA COMPANY OS</small><h2>${esc(title)}</h2></div><button class="dayone-x" data-do-close>×</button></div><div class="dayone-modal-body">${body}</div><div class="dayone-modal-foot"><button class="cos-btn" data-do-close>Cancel</button>${actions||''}</div></div>`;b.classList.add('show')}
function close(){$('#dayOneModal')?.classList.remove('show')}
function inquiryEdit(id){const r=inq(id);if(!r)return;const c=cust(r.customer_id)||{};modal('Edit enquiry',`<div class="dayone-grid">${field('Client name','do-cn',c.name)}${field('Phone','do-cp',c.phone)}${field('WhatsApp','do-cw',c.whatsapp)}${field('Email','do-ce',c.email,'email')}${field('Event name','do-en',r.event_name)}${field('Event date (BS)','do-eb',r.event_date_bs)}${field('Venue','do-ev',r.venue)}${field('Guests','do-eg',r.guest_count,'number','min="0"')}${field('Budget (NPR)','do-bu',r.budget,'number','min="0" step="1"')}${select('Stage','do-st',[['new','New'],['quote_pending','Quote pending'],['quote_made','Quote made'],['quote_sent','Quote sent'],['interested','Interested'],['awaiting_advance','Awaiting advance'],['booked','Booked'],['not_interested','Not interested'],['lost','Lost'],['booking_cancelled','Booking cancelled'],['booked_elsewhere','Booked elsewhere']],r.status)}${select('Source','do-so',[['Instagram','Instagram'],['Facebook','Facebook'],['WhatsApp','WhatsApp'],['TikTok','TikTok'],['Google','Google'],['Referral','Referral'],['Website','Website'],['Other','Other']],r.source||'Other')}${area('Notes','do-no',r.notes)}</div>`,`<button class="cos-btn primary" data-do-save-inq="${escAttr(id)}">Save changes</button>`)}
function bookingEdit(id){const r=proj(id);if(!r)return;const c=cust(r.customer_id)||{},f=fns(id)[0]||{};modal('Edit booking / event',`<div class="dayone-grid">${field('Event name','do-pn',r.name)}${field('Client name','do-pcn',c.name)}${field('Phone','do-pcp',c.phone)}${field('WhatsApp','do-pcw',c.whatsapp)}${field('Email','do-pce',c.email,'email')}${select('Brand','do-pb',[['Rachna','Rachna'],['Aavartan','Aavartan'],['Rachna + Aavartan','Rachna + Aavartan']],r.brand||'Rachna + Aavartan')}${select('Status','do-ps',[['planning','Planning'],['booked','Booked'],['ongoing','Ongoing'],['completed','Completed'],['cancelled','Cancelled']],r.status||'planning')}${field('Quoted total (NPR)','do-pq',r.quoted_total||0,'number','min="0" step="1"')}${field('Date range (BS)','do-pdb',r.date_range_bs)}<div class="dayone-section-label">Primary function · Event ID remains unchanged</div>${field('Function name','do-fn',f.name)}${field('Function date (BS)','do-fbs',f.event_date_bs)}${field('Function date (AD)','do-fad',f.event_date,'date')}${field('Start time','do-ft',f.start_time,'time')}${field('Venue','do-fv',f.venue)}${field('Guests','do-fg',f.guest_count,'number','min="0"')}${area('Function notes','do-fnote',f.notes)}<div class="dayone-readonly"><span>Advance received</span><b>${money(r.customer_advance)}</b><span>Vendor reserve</span><b>${money(r.vendor_reserve)}</b></div></div>`,`<button class="cos-btn primary" data-do-save-booking="${escAttr(id)}">Save booking</button>`)}
async function saveInquiry(id){const r=inq(id),c=cust(r?.customer_id);if(!r||!c)throw Error('Enquiry/client not found');const name=$('#do-cn').value.trim();if(!name)throw Error('Client name is required');let z=await A.sb.from('customers').update({name,phone:$('#do-cp').value.trim()||null,whatsapp:$('#do-cw').value.trim()||null,email:$('#do-ce').value.trim()||null}).eq('id',c.id);if(z.error)throw z.error;z=await A.sb.from('inquiries').update({event_name:$('#do-en').value.trim()||null,event_date_bs:$('#do-eb').value.trim()||null,venue:$('#do-ev').value.trim()||null,guest_count:$('#do-eg').value===''?null:Number($('#do-eg').value),budget:$('#do-bu').value===''?null:Number($('#do-bu').value),status:$('#do-st').value,source:$('#do-so').value||null,notes:$('#do-no').value.trim()||null,updated_at:new Date().toISOString()}).eq('id',id);if(z.error)throw z.error;close();await A.refresh();toast('Enquiry updated.')}
async function saveBooking(id){const r=proj(id),c=cust(r.customer_id),f=fns(id)[0];if(!r||!c)throw Error('Booking/client not found');const name=$('#do-pcn').value.trim();if(!name)throw Error('Client name is required');let z=await A.sb.from('customers').update({name,phone:$('#do-pcp').value.trim()||null,whatsapp:$('#do-pcw').value.trim()||null,email:$('#do-pce').value.trim()||null}).eq('id',c.id);if(z.error)throw z.error;z=await A.sb.from('projects').update({name:$('#do-pn').value.trim()||r.name,brand:$('#do-pb').value,status:$('#do-ps').value,quoted_total:Number($('#do-pq').value||0),date_range_bs:$('#do-pdb').value.trim()||null}).eq('id',id);if(z.error)throw z.error;const fp={name:$('#do-fn').value.trim()||f?.name||'Event',event_date_bs:$('#do-fbs').value.trim()||null,event_date:$('#do-fad').value||null,start_time:$('#do-ft').value||null,venue:$('#do-fv').value.trim()||null,guest_count:$('#do-fg').value===''?null:Number($('#do-fg').value),notes:$('#do-fnote').value.trim()||null};z=f?await A.sb.from('event_functions').update(fp).eq('id',f.id):await A.sb.from('event_functions').insert({...fp,project_id:id});if(z.error)throw z.error;close();await A.refresh();toast('Booking updated.')}
async function delInquiry(id){const r=inq(id);if(!r)return;if(!confirm(`Delete enquiry “${r.event_name||'Unnamed event'}”?`))return;const linked=S.projects.filter(p=>p.inquiry_id===id);for(const p of linked){let z=await A.sb.from('projects').update({inquiry_id:null}).eq('id',p.id);if(z.error)throw z.error}let z=await A.sb.from('inquiries').delete().eq('id',id);if(z.error)throw z.error;await A.refresh();toast('Enquiry deleted.')}
async function delBooking(id){const r=proj(id);if(!r)return;if(!confirm(`Delete booking “${r.name||'Unnamed event'}” (${r.event_code||'no Event ID'})? Its linked event records will be removed.`))return;if(r.inquiry_id){let z=await A.sb.from('inquiries').update({status:'booking_cancelled',updated_at:new Date().toISOString()}).eq('id',r.inquiry_id);if(z.error)throw z.error}let z=await A.sb.from('projects').delete().eq('id',id);if(z.error)throw z.error;await A.refresh();toast('Booking deleted.')}
function actions(){const root=$('#cosRoot')||document;$$('button[data-cos-convert]',root).forEach(b=>{const c=b.parentElement;if(!c||c.querySelector('[data-do-edit-inq]'))return;const id=b.dataset.cosConvert;c.classList.add('dayone-action-cell');c.insertAdjacentHTML('beforeend',`<button class="cos-btn tiny dayone-edit" data-do-edit-inq="${escAttr(id)}">Edit</button><button class="cos-btn tiny dayone-danger" data-do-del-inq="${escAttr(id)}">Delete</button>`)})
$$('button[data-cos-open-event]',root).forEach(b=>{const c=b.parentElement;if(!c||c.querySelector('[data-do-edit-booking]'))return;const id=b.dataset.cosOpenEvent;c.classList.add('dayone-action-cell');c.insertAdjacentHTML('beforeend',`<button class="cos-btn tiny dayone-edit" data-do-edit-booking="${escAttr(id)}">Edit</button><button class="cos-btn tiny dayone-danger" data-do-del-booking="${escAttr(id)}">Delete</button>`)})}
const companyNav=[['command','Command Center','◈'],['crm','CRM & Sales','✉'],['events','Events','▦'],['vendors','Vendors','◉'],['crew','Crew','✣'],['finance','Finance','₨'],['documents','Documents','□'],['marketing','Ads & Marketing','◇'],['settings','Settings','⚙']];
function sidebar(){const root=$('#cosRoot'),n=$('#nav');if(!root||!n)return;const active=root.querySelector('.cos-nav-item.active')?.dataset.cosTab||'command';const html=`<div class="nav-group company-nav-group"><div class="nav-label">Company OS</div>${companyNav.map(x=>`<button class="nav-item ${active===x[0]?'active':''} dayone-company-nav" data-do-tab="${x[0]}"><span class="nav-ico">${x[2]}</span><span>${x[1]}</span></button>`).join('')}</div>`;if(n.dataset.companyNav!==html){n.innerHTML=html;n.dataset.companyNav=html}}

// Booking status is manual. Customer advances update financials/receipts only.
async function recordAdvanceManual(projectId,amount,method,reference){
  const value=Number(amount||0);if(!(value>0))throw Error('Enter a valid advance');
  const {data,error}=await A.sb.rpc('apply_customer_advance',{p_project_id:projectId,p_amount:value,p_method:method||null,p_reference:reference||null});
  if(error)throw error;
  await A.refresh();
  try{
    const {data:payments,error:pe}=await A.sb.from('payments').select('*').eq('project_id',projectId).eq('direction','in').order('created_at',{ascending:false}).limit(1);
    if(pe)throw pe;
    const payment=payments?.[0];
    if(payment){
      const {data:existing,error:ee}=await A.sb.from('documents').select('id').eq('project_id',projectId).eq('document_type','receipt').eq('payment_id',payment.id).limit(1).maybeSingle();
      if(ee)throw ee;
      if(!existing){
        const year=new Date().getFullYear();
        const prefix=`RCT-${year}-`;
        const {data:last,error:le}=await A.sb.from('documents').select('document_number').eq('document_type','receipt').like('document_number',`${prefix}%`).order('document_number',{ascending:false}).limit(1);
        if(le)throw le;
        const seq=Number.parseInt(String(last?.[0]?.document_number||'').split('-').pop()||'0',10)+1;
        const number=`${prefix}${String(Number.isFinite(seq)?seq:1).padStart(4,'0')}`;
        const {data:doc,error:de}=await A.sb.from('documents').insert({organization_id:A.state.profile?.organization_id,project_id:projectId,quotation_id:null,payment_id:payment.id,document_type:'receipt',document_number:number,issue_date:new Date().toISOString().slice(0,10),amount:Number(payment.amount||value),status:'issued',notes:'Customer advance receipt linked to the Event ID.'}).select().single();
        if(de)throw de;
        A.state.documents=A.state.documents||[];A.state.documents.unshift(doc);
      }
    }
  }catch(e){toast(`Advance recorded, but receipt link failed: ${e.message||e}`,true)}
  return data;
}
A.recordAdvance=recordAdvanceManual;

const SOURCE_OPTIONS=[['','Select source'],['Instagram','Instagram'],['Facebook','Facebook'],['WhatsApp','WhatsApp'],['TikTok','TikTok'],['Google','Google'],['Referral','Referral'],['Website','Website'],['Other','Other']];
function enhanceInquirySource(){
  const modalRoot=$('#backdrop')||document;
  $$('label',modalRoot).forEach(label=>{
    const caption=label.querySelector('span')?.textContent?.trim().toLowerCase();
    if(caption!=='source'||label.querySelector('select'))return;
    const input=label.querySelector('input');
    if(!input)return;
    const selectEl=document.createElement('select');
    selectEl.id=input.id;
    if(input.name)selectEl.name=input.name;
    selectEl.className=input.className||'search';
    const current=input.value||'Other';
    selectEl.innerHTML=SOURCE_OPTIONS.map(([value,text])=>`<option value="${escAttr(value)}" ${String(value)===String(current)?'selected':''}>${esc(text)}</option>`).join('');
    input.replaceWith(selectEl);
  });
}
function syncManualBookingStep(){const page=$('#page');if(!page||!A.state.user)return;const eventHead=$('.event-head',page);if(!eventHead)return;const text=eventHead.querySelector('h1')?.textContent?.trim()||'';const p=(A.state.projects||[]).find(x=>String(x.event_code||'')===text);const step=$$('.workflow-step',page)[2];if(!p||!step)return;const em=step.querySelector('em');if(em)em.textContent=String(p.status||'planning').replace(/_/g,' ')}
function sync(){actions();sidebar();syncManualBookingStep();enhanceInquirySource()}
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-do-edit-inq],[data-do-del-inq],[data-do-edit-booking],[data-do-del-booking],[data-do-save-inq],[data-do-save-booking],[data-do-close],[data-do-tab]');if(!t)return;if(t.dataset.doTab){e.preventDefault();const x=$(`#cosRoot .cos-nav-item[data-cos-tab="${CSS.escape(t.dataset.doTab)}"]`);x?.click();return}e.preventDefault();if(t.dataset.doEditInq)inquiryEdit(t.dataset.doEditInq);else if(t.dataset.doDelInq)delInquiry(t.dataset.doDelInq).catch(x=>toast(x.message,true));else if(t.dataset.doEditBooking)bookingEdit(t.dataset.doEditBooking);else if(t.dataset.doDelBooking)delBooking(t.dataset.doDelBooking).catch(x=>toast(x.message,true));else if(t.dataset.doSaveInq)saveInquiry(t.dataset.doSaveInq).catch(x=>toast(x.message,true));else if(t.dataset.doSaveBooking)saveBooking(t.dataset.doSaveBooking).catch(x=>toast(x.message,true));else if(t.dataset.doClose)close()},true);
const mo=new MutationObserver(()=>{if(window.__doLock)return;window.__doLock=true;requestAnimationFrame(()=>{window.__doLock=false;sync()})});
mo.observe(document.body,{subtree:true,childList:true});
sync();
})();
