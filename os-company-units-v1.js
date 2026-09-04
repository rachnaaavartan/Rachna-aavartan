(()=>{
'use strict';
if(window.__RACHNA_UNITS_V1__)return;window.__RACHNA_UNITS_V1__=true;
const A=window.RachnaAPI;if(!A||!A.state)return;
const esc=A.esc||((s)=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
const key='rachna_os_business_unit';
const units={rachna:'Rachna',aavartan:'Aavartan',shared:'All / Shared'};
const norm=v=>{v=String(v||'').toLowerCase();if(v.includes('aavartan')&&!v.includes('rachna'))return'aavartan';if(v.includes('rachna')&&!v.includes('aavartan'))return'rachna';return'shared'};
let full=null;
function unit(){return localStorage.getItem(key)||A.state.profile?.primary_business_unit||'shared'}
function setFull(){const s=A.state;full={inquiries:[...(s.inquiries||[])],projects:[...(s.projects||[])],functions:[...(s.functions||[])],services:[...(s.services||[])],projectServices:[...(s.projectServices||[])],vendorBookings:[...(s.vendorBookings||[])],projectTeam:[...(s.projectTeam||[])],payments:[...(s.payments||[])],expenses:[...(s.expenses||[])],quotations:[...(s.quotations||[])],quotationItems:[...(s.quotationItems||[])],productionCosts:[...(s.productionCosts||[])],deliverables:[...(s.deliverables||[])],productionJobs:[...(s.productionJobs||[])],eventFiles:[...(s.eventFiles||[])],reminders:[...(s.reminders||[])]}}
function scopeArr(rows,fn){return(rows||[]).filter(fn)}
function apply(){if(!full)return;const u=unit(),s=A.state;
 const allowedProjectIds=new Set(scopeArr(full.projects,p=>u==='shared'||norm(p.brand)===u).map(p=>p.id));
 const allowedQuoteIds=new Set(scopeArr(full.quotations,q=>allowedProjectIds.has(q.project_id)).map(q=>q.id));
 const allowedFunctionIds=new Set(scopeArr(full.functions,f=>allowedProjectIds.has(f.project_id)).map(f=>f.id));
 s.inquiries=scopeArr(full.inquiries,i=>u==='shared'||i.business_unit===u||i.business_unit==='shared');
 s.projects=scopeArr(full.projects,p=>allowedProjectIds.has(p.id));
 s.functions=scopeArr(full.functions,f=>allowedFunctionIds.has(f.id));
 s.services=scopeArr(full.services,x=>u==='shared'||norm(x.brand)===u||norm(x.brand)==='shared');
 s.projectServices=scopeArr(full.projectServices,x=>allowedProjectIds.has(x.project_id));
 s.vendorBookings=scopeArr(full.vendorBookings,x=>allowedProjectIds.has(x.project_id));
 s.projectTeam=scopeArr(full.projectTeam,x=>allowedProjectIds.has(x.project_id));
 s.payments=scopeArr(full.payments,x=>!x.project_id||allowedProjectIds.has(x.project_id));
 s.expenses=scopeArr(full.expenses,x=>!x.project_id||allowedProjectIds.has(x.project_id));
 s.quotations=scopeArr(full.quotations,x=>allowedProjectIds.has(x.project_id));
 s.quotationItems=scopeArr(full.quotationItems,x=>allowedQuoteIds.has(x.quotation_id));
 s.productionCosts=scopeArr(full.productionCosts,x=>allowedProjectIds.has(x.project_id));
 s.deliverables=scopeArr(full.deliverables,x=>allowedProjectIds.has(x.project_id));
 s.productionJobs=scopeArr(full.productionJobs,x=>allowedProjectIds.has(x.project_id));
 s.eventFiles=scopeArr(full.eventFiles,x=>allowedProjectIds.has(x.project_id));
 s.reminders=scopeArr(full.reminders,x=>!x.project_id||allowedProjectIds.has(x.project_id));
 s.businessUnit=u;
 document.documentElement.dataset.businessUnit=u;
 updateUI();
}
function capture(){setFull();apply()}
const rawRefresh=A.refresh;
A.refresh=async function(){const r=await rawRefresh();capture();return r};
['createCustomer','createInquiry','updateInquiry','convertInquiry','insertProject','updateProject','addFunction','updateFunction','deleteFunction','setProjectStatus','saveProjectServiceScope','addService','addProjectService','updateProjectService','addVendor','updateVendor','addVendorBooking','updateVendorBooking','payVendorBooking','addTeam','updateTeam','assignTeam','updateProjectTeam','recordPayment','recordExpense','recordAdvance','createQuotation','updateQuotation','addQuoteItem','createQuoteVersionFrom','recalc','addProductionCost','addProductionJob','updateProductionJob','deleteProductionJob','addDeliverable','updateDeliverable','addEventFile','updateEventFile','removeEventFile','addReminder','updateReminder','update','remove'].forEach(name=>{const fn=A[name];if(typeof fn!=='function'||fn.__unitWrapped)return;const w=async function(...args){const r=await fn.apply(this,args);setTimeout(()=>{capture()},0);return r};w.__unitWrapped=true;A[name]=w});
function ensureProfileUnit(){const p=A.state.profile;if(!p)return;const saved=localStorage.getItem(key);if(!saved){localStorage.setItem(key,p.primary_business_unit||'shared');return}}
async function change(u){if(!['rachna','aavartan','shared'].includes(u))return;localStorage.setItem(key,u);if(A.state.profile?.id){const{error}=await A.sb.from('profiles').update({primary_business_unit:u}).eq('id',A.state.profile.id);if(error)throw error;A.state.profile.primary_business_unit=u}capture();try{if(window.__RACHNA_UI_RENDER__)window.__RACHNA_UI_RENDER__();}catch(_){} }
function updateUI(){const bar=document.querySelector('[data-business-switch]');if(!bar)return;bar.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.unit===unit()));const ws=document.querySelector('.workspace');if(ws){ws.querySelector('[data-unit-title]')?.replaceChildren(document.createTextNode(units[unit]||'All / Shared'));ws.querySelector('[data-unit-sub]')?.replaceChildren(document.createTextNode(unit()==='shared'?'Shared customer + cross-brand view':'Independent business workspace'))}}
function mount(){let w=document.querySelector('.workspace');if(!w)return;if(!w.querySelector('[data-unit-title]')){w.innerHTML=`<b data-unit-title>${esc(units[unit])}</b><span data-unit-sub>${unit()==='shared'?'Shared customer + cross-brand view':'Independent business workspace'}</span><div class="business-switch" data-business-switch><button data-unit="rachna">Rachna</button><button data-unit="aavartan">Aavartan</button><button data-unit="shared">All</button></div>`;w.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>change(b.dataset.unit).catch(e=>{alert(e.message||'Could not switch workspace')})))}updateUI()}
function style(){if(document.getElementById('business-unit-style'))return;const s=document.createElement('style');s.id='business-unit-style';s.textContent='.workspace{position:relative}.business-switch{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:10px}.business-switch button{border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;border-radius:7px;padding:6px 4px;font-size:11px;cursor:pointer}.business-switch button.active{background:#fff;color:#25232a;border-color:#fff;font-weight:700}[data-business-unit="rachna"] .workspace:after{content:"Rachna workspace"}[data-business-unit="aavartan"] .workspace:after{content:"Aavartan workspace"}';document.head.appendChild(s)}
function inferCurrentProfileFromMode(){const u=unit();if(A.state.businessUnit!==u){capture()}}
ensureProfileUnit();style();mount();inferCurrentProfileFromMode();
window.RachnaBusinessUnits={get:unit,set:change,apply,capture};
})();
