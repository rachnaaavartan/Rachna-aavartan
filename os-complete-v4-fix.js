(() => {
'use strict';
const A=window.RachnaAPI;if(!A)return;
const originalCreateQuotation=A.createQuotation;
if(originalCreateQuotation&&!originalCreateQuotation.__cosPatched){
  const wrapped=async arg=>{
    if(arg&&typeof arg==='object'){
      const projectId=arg.project_id||arg.projectId;
      if(!projectId) throw new Error('Event is required');
      const q=await originalCreateQuotation(projectId);
      const patch={};
      if(arg.customer_total!=null) patch.customer_total=Number(arg.customer_total||0);
      if(arg.internal_total!=null) patch.internal_total=Number(arg.internal_total||0);
      if(arg.status) patch.status=arg.status;
      if(arg.notes!=null) patch.notes=arg.notes;
      if(Object.keys(patch).length) await A.updateQuotation(q.id,{...patch},projectId);
      return A.state.quotations.find(x=>x.id===q.id)||q;
    }
    return originalCreateQuotation(arg);
  };
  wrapped.__cosPatched=true;A.createQuotation=wrapped;
}

// All Clients CRUD. Keeps client master editable/deletable without creating a second client system.
const esc=A.esc||String,escAttr=v=>esc(v).replace(/`/g,'&#96;');
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const S=A.state;
const toast=(m,bad=false)=>{const n=$('#toast')||$('#cosToast');if(!n)return;n.textContent=m;n.className=(n.id==='toast'?'toast':'cos-toast')+' show'+(bad?' error':'');clearTimeout(window.__clientCrudToast);window.__clientCrudToast=setTimeout(()=>n.className=n.id==='toast'?'toast':'cos-toast',2800)};
function modal(title,body,actions=''){let b=$('#clientCrudModal');if(!b){b=document.createElement('div');b.id='clientCrudModal';b.className='dayone-modal-backdrop';document.body.appendChild(b)}b.innerHTML=`<div class="dayone-modal"><div class="dayone-modal-head"><div><small>RACHNA COMPANY OS</small><h2>${esc(title)}</h2></div><button class="dayone-x" data-client-close>×</button></div><div class="dayone-modal-body">${body}</div><div class="dayone-modal-foot"><button class="cos-btn" data-client-close>Cancel</button>${actions}</div></div>`;b.classList.add('show')}
function close(){ $('#clientCrudModal')?.classList.remove('show'); }
const field=(l,id,v='',type='text')=>`<label class="dayone-field"><span>${esc(l)}</span><input id="${id}" type="${type}" value="${escAttr(v??'')}"></label>`;
function clientEdit(id){const c=(S.customers||[]).find(x=>x.id===id);if(!c)return;modal('Edit client',`<div class="dayone-grid">${field('Client name','cc-name',c.name)}${field('Phone','cc-phone',c.phone)}${field('WhatsApp','cc-wa',c.whatsapp)}${field('Email','cc-email',c.email,'email')}<label class="dayone-field dayone-full"><span>Notes</span><textarea id="cc-notes">${esc(c.notes||'')}</textarea></label><div class="dayone-readonly"><span>Connected enquiries</span><b>${(S.inquiries||[]).filter(i=>i.customer_id===id).length}</b><span>Connected events</span><b>${(S.projects||[]).filter(p=>p.customer_id===id).length}</b></div></div>`,`<button class="cos-btn primary" data-client-save="${escAttr(id)}">Save changes</button>`);}
async function clientSave(id){const name=$('#cc-name')?.value.trim();if(!name)throw Error('Client name is required');const payload={name,phone:$('#cc-phone')?.value.trim()||null,whatsapp:$('#cc-wa')?.value.trim()||null,email:$('#cc-email')?.value.trim()||null,notes:$('#cc-notes')?.value.trim()||null};const {error}=await A.sb.from('customers').update(payload).eq('id',id);if(error)throw error;close();await A.refresh();toast('Client updated.');sync();}
async function clientDelete(id){const c=(S.customers||[]).find(x=>x.id===id);if(!c)return;const iq=(S.inquiries||[]).filter(i=>i.customer_id===id),ps=(S.projects||[]).filter(p=>p.customer_id===id);const linked=iq.length+ps.length;if(!confirm(`Delete client “${c.name||'Unnamed client'}”?${linked?` This will unlink ${iq.length} enquiry/enquiries and ${ps.length} event/event(s), but will not delete those records.`:''}`))return;for(const i of iq){const {error}=await A.sb.from('inquiries').update({customer_id:null,updated_at:new Date().toISOString()}).eq('id',i.id);if(error)throw error;}for(const p of ps){const {error}=await A.sb.from('projects').update({customer_id:null}).eq('id',p.id);if(error)throw error;}const {error}=await A.sb.from('customers').delete().eq('id',id);if(error)throw error;await A.refresh();toast('Client deleted.');sync();}
function visibleClients(){const input=$('#clientSearch');const q=(input?.value||'').toLowerCase();return (S.customers||[]).filter(c=>!q||[c.name,c.phone,c.email].some(v=>String(v||'').toLowerCase().includes(q)));}
function sync(){const page=$('#page');if(!page)return;const h=page.querySelector('.page-head h1');if(!h||h.textContent.trim()!=='All Clients')return;const table=page.querySelector('.table-panel table');if(!table)return;const head=table.querySelector('thead tr');if(head&&!head.querySelector('[data-client-actions-head]')){const th=document.createElement('th');th.dataset.clientActionsHead='1';th.textContent='Actions';head.appendChild(th);}const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.querySelector('td'));const clients=visibleClients();rows.slice(0,clients.length).forEach((tr,i)=>{const id=clients[i]?.id;if(!id||tr.querySelector('[data-client-edit]'))return;const td=document.createElement('td');td.className='dayone-action-cell';td.innerHTML=`<button class="btn tiny dayone-edit" data-client-edit="${escAttr(id)}">Edit</button><button class="btn tiny dayone-danger" data-client-delete="${escAttr(id)}">Delete</button>`;tr.appendChild(td);});}
document.addEventListener('input',e=>{if(e.target?.id==='clientSearch')requestAnimationFrame(sync)},true);
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-client-close],[data-client-edit],[data-client-delete],[data-client-save]');if(!t)return;if(t.dataset.clientClose){e.preventDefault();close();return;}if(t.dataset.clientEdit){e.preventDefault();clientEdit(t.dataset.clientEdit);return;}if(t.dataset.clientDelete){e.preventDefault();clientDelete(t.dataset.clientDelete).catch(x=>toast(x.message||'Could not delete client',true));return;}if(t.dataset.clientSave){e.preventDefault();clientSave(t.dataset.clientSave).catch(x=>toast(x.message||'Could not update client',true));return;}},true);
const mo=new MutationObserver(()=>{if(window.__clientCrudLock)return;window.__clientCrudLock=true;requestAnimationFrame(()=>{window.__clientCrudLock=false;sync()})});
mo.observe(document.body,{subtree:true,childList:true});
sync();
})();