(()=>{
'use strict';
const A=window.RachnaAPI;if(!A)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=A.esc||String;
const close=()=>$('#backdrop')?.classList.remove('show');
const toast=(m,b=false)=>{const n=$('#toast');if(!n)return;n.textContent=m;n.className='toast show'+(b?' error':'');clearTimeout(window.__ohToast);window.__ohToast=setTimeout(()=>n.className='toast',2800)};
async function reminders(){
  const now=Date.now();
  const rows=(A.state.reminders||[]).filter(r=>r.status==='open').sort((a,b)=>new Date(a.due_at||0)-new Date(b.due_at||0));
  const overdue=rows.filter(r=>r.due_at&&new Date(r.due_at).getTime()<now);
  const items=rows.map(r=>`<div class="mini-row"><div><b>${esc(r.title)}</b><small>${r.due_at?esc(r.due_at):'No due time'} · ${esc(r.priority||'normal')}</small></div><button class="btn tiny" data-oh-done="${r.id}">Done</button></div>`).join('');
  const m=$('#modal');if(!m)return;
  m.innerHTML=`<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>Notifications</h2></div><button class="close-btn" data-oh-close>×</button></div><div class="modal-body"><div class="notice"><b>${rows.length}</b> open · <b>${overdue.length}</b> overdue</div><div>${items||'<div class="empty"><b>Nothing needs attention</b></div>'}</div></div><div class="modal-foot"><button class="btn" data-oh-close>Close</button><button class="btn primary" data-action="new-reminder">＋ Reminder</button></div>`;
  $('#backdrop')?.classList.add('show');
}
document.addEventListener('click',e=>{
 const c=e.target.closest('[data-oh-close]');if(c){e.preventDefault();close();return}
 const d=e.target.closest('[data-oh-done]');if(d){e.preventDefault();A.updateReminder(d.dataset.ohDone,{status:'done'}).then(()=>{toast('Reminder completed');reminders()}).catch(x=>toast(x.message||'Could not update reminder',true));return}
 const n=e.target.closest('[data-action="notifications"]');if(n){e.preventDefault();e.stopImmediatePropagation();reminders();return}
},true);
})();