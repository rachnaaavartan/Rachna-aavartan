(()=>{
'use strict';
const A=window.RachnaAPI;if(!A)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=A.esc||String;
const close=()=>$('#backdrop')?.classList.remove('show');
const toast=(m,b=false)=>{const n=$('#toast');if(!n)return;n.textContent=m;n.className='toast show'+(b?' error':'');clearTimeout(window.__ohToast);window.__ohToast=setTimeout(()=>n.className='toast',2800)};
function bsLabel(ad){const m=String(ad||'').match(/(\d{4})-(\d{2})-(\d{2})/);if(!m)return String(ad||'');const p=window.RachnaBS?.adToBs?.(`${m[1]}-${m[2]}-${m[3]}`);return p?`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`:String(ad||'')}
function dueLabel(v){if(!v)return 'No due time';try{const d=new Date(v),x=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}).formatToParts(d),o={};x.forEach(p=>{if(p.type!=='literal')o[p.type]=p.value});const b=window.RachnaBS?.adToBs?.(`${o.year}-${o.month}-${o.day}`);return b?`${b.y}-${String(b.m).padStart(2,'0')}-${String(b.d).padStart(2,'0')} · ${o.hour}:${o.minute} ${o.dayPeriod||''}`:String(v)}catch(_){return String(v)}}
async function reminders(){
  const now=Date.now();
  const rows=(A.state.reminders||[]).filter(r=>r.status==='open').sort((a,b)=>new Date(a.due_at||0)-new Date(b.due_at||0));
  const overdue=rows.filter(r=>r.due_at&&new Date(r.due_at).getTime()<now);
  const items=rows.map(r=>`<div class="mini-row"><div><b>${esc(r.title)}</b><small>${esc(dueLabel(r.due_at))} · ${esc(r.priority||'normal')}</small></div><button class="btn tiny" data-oh-done="${r.id}">Done</button></div>`).join('');
  const m=$('#modal');if(!m)return;
  m.innerHTML=`<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>Notifications</h2></div><button class="close-btn" data-oh-close>×</button></div><div class="modal-body"><div class="notice"><b>${rows.length}</b> open · <b>${overdue.length}</b> overdue</div><div>${items||'<div class="empty"><b>Nothing needs attention</b></div>'}</div></div><div class="modal-foot"><button class="btn" data-oh-close>Close</button><button class="btn primary" data-action="new-reminder">＋ Reminder</button></div>`;
  $('#backdrop')?.classList.add('show');
}
function normalizeBookingUi(){
  const s=A.state||{};
  const bookedCount=(s.projects||[]).filter(p=>p.status==='booked').length;
  $$('.metric').forEach(m=>{const label=m.querySelector('.metric-top small')?.textContent?.trim();if(label==='Booked clients'){const v=m.querySelector('strong');if(v)v.textContent=String(bookedCount);const n=m.querySelector('em');if(n)n.textContent='Manual booking status';}});
  $$('.summary-bar span').forEach((n,i)=>{if(i===1&&/booked/i.test(n.textContent||''))n.innerHTML=`<b>${bookedCount}</b> booked`;});
  const pageHead=$('#page .page-head h1')?.textContent?.trim();
  if(pageHead==='Booked Clients'){
    $$('#page [data-action="open-project"]').forEach(b=>{const p=(s.projects||[]).find(x=>x.id===b.dataset.id);if(p&&p.status!=='booked')b.closest('.event-card')?.remove();});
  }
  $$('.event-summary span,.panel-title p,.rule span,.page-head p,.callout p').forEach(n=>{
    const t=(n.textContent||'').trim();
    if(t==='BS first, AD alongside it.')n.textContent='BS calendar';
    else if(t==='30% advance gate')n.textContent='Manual booking status';
    else if(t==='30% advance is the booking gate.')n.textContent='Booking status is manual.';
    else if(t==='Confirmed after advance')n.textContent='Manual booking status';
    else if(t==='Confirmed Event IDs after the 30% customer advance gate.')n.textContent='Event IDs marked booked.';
  });
  $$('#page .agenda-date small,#page .date-tile small').forEach(n=>n.style.display='none');
  $$('#page .rnc-bs-note').forEach(n=>{if(/AD/i.test(n.textContent||''))n.textContent='BS · Nepali date'});
}
document.addEventListener('click',e=>{
 const c=e.target.closest('[data-oh-close]');if(c){e.preventDefault();close();return}
 const d=e.target.closest('[data-oh-done]');if(d){e.preventDefault();A.updateReminder(d.dataset.ohDone,{status:'done'}).then(()=>{toast('Reminder completed');reminders();normalizeBookingUi()}).catch(x=>toast(x.message||'Could not update reminder',true));return}
 const n=e.target.closest('[data-action="notifications"]');if(n){e.preventDefault();e.stopImmediatePropagation();reminders();return}
},true);
const mo=new MutationObserver(()=>{if(window.__ohLock)return;window.__ohLock=true;requestAnimationFrame(()=>{window.__ohLock=false;normalizeBookingUi()})});
mo.observe(document.body,{subtree:true,childList:true});
normalizeBookingUi();
})();