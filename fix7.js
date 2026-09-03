(()=>{
'use strict';
const A=window.RachnaAPI;
if(!A)return;
const $=s=>document.querySelector(s), esc=A.esc, money=A.money;
const PACKAGES=[['Essential Package',45000],['Signature Package',85000],['Legacy Package',150000],['2-Day Story',120000],['3-Day Story',180000],['Multi-day / Custom',null]];
const ADDONS=[['Candid coverage',12000],['Cinematic coverage',15000],['Drone',8000],['Premium Karizma album',10000],['Social media reels',15000],['Additional photographer',12000],['Additional videographer',12000],['Pre-wedding',25000],['Post-wedding',25000],['Additional album',5000]];
let activeProject=null;
function toast(message,error=false){const t=$('#toast');if(!t)return;t.textContent=message;t.className='toast show '+(error?'error':'');clearTimeout(window.__svcToast);window.__svcToast=setTimeout(()=>t.className='toast',2800)}
function closeModal(){ $('#backdrop')?.classList.remove('show') }
function openModal(title,body,actions){const m=$('#modal');if(!m)return;m.innerHTML='<div class="modal-head"><div><div class="eyebrow">Rachna OS</div><h2>'+esc(title)+'</h2></div><button class="close-btn" id="svcClose">×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot">'+actions+'</div>';$('#backdrop')?.classList.add('show');$('#svcClose')?.addEventListener('click',closeModal)}
function projectIdFromButton(btn){const x=btn?.getAttribute('onclick')||'';const m=x.match(/openP\('([^']+)'/);return m?m[1]:null}
function projectInfo(id){return A.state.projects.find(p=>p.id===id)}
function catalogRachna(){return A.state.services.filter(s=>String(s.brand||'').toLowerCase()==='rachna'&&s.active!==false)}
function rowsFor(id){return A.state.projectServices.filter(s=>s.project_id===id)}
function selectedServiceIds(id){return new Set(rowsFor(id).map(r=>r.service_id).filter(Boolean))}
function renderServicePage(id){
 activeProject=id;
 const p=projectInfo(id); if(!p)return;
 const rachna=catalogRachna();
 const rows=rowsFor(id), ids=selectedServiceIds(id);
 const aavartan=rows.filter(r=>String(r.category||'').startsWith('Aavartan'));
 const selectedR=rachna.filter(s=>ids.has(s.id));
 const body='<div class="service-rebuild">'
 +' <div class="service-rebuild-head"><div><div class="eyebrow">SERVICES</div><h2>Build this project\'s service scope</h2><p>Choose the Aavartan core package, optional Aavartan add-ons, and the Rachna services required for the event.</p></div><button class="btn primary" id="svcOpenPicker">Edit services</button></div>'
 +' <div class="svc-summary-grid">'
 +'  <div class="svc-summary-card"><small>Aavartan core</small><strong>'+esc((aavartan.find(r=>r.category==='Aavartan Package')||{}).name||'Not selected').replace('Aavartan Photo + Video — ','')+'</strong><span>Final selling price is controlled in the quotation.</span></div>'
 +'  <div class="svc-summary-card"><small>Rachna services</small><strong>'+selectedR.length+'</strong><span>Selected from the Rachna service catalog.</span></div>'
 +'  <div class="svc-summary-card"><small>Optional add-ons</small><strong>'+rows.filter(r=>r.category==='Aavartan Add-on').length+'</strong><span>Available per project.</span></div>'
 +' </div>'
 +' <div class="card"><div class="section-title"><div><div class="eyebrow">RACHNA</div><h3>Selected event-management services</h3></div><span class="tag">'+selectedR.length+' selected</span></div>'
 + (selectedR.length?'<div class="selected-service-list">'+selectedR.map(s=>'<div class="selected-service"><div><b>'+esc(s.name)+'</b><small>Rachna catalog service</small></div><button class="btn danger svc-remove" data-sid="'+esc(s.id)+'">Remove</button></div>').join('')+'</div>':'<div class="empty-service"><b>No Rachna services selected.</b><span>Use Edit services to add decoration, venue coordination, catering coordination, beauty, mehendi, artists, transport, panche baja or coordination.</span></div>')
 +' </div></div>';
 const page=$('#page');if(page){page.innerHTML=body;document.querySelectorAll('.svc-remove').forEach(b=>b.addEventListener('click',()=>removeRachnaService(id,b.dataset.sid)));$('#svcOpenPicker')?.addEventListener('click',()=>openServiceEditor(id))}
}
function serviceCard(service,checked){return '<label class="svc-choice '+(checked?'selected':'')+'"><input type="checkbox" data-rid="'+esc(service.id)+'" '+(checked?'checked':'')+'><span><b>'+esc(service.name)+'</b><small>Rachna service</small></span></label>'}
function openServiceEditor(id){
 activeProject=id;const rows=rowsFor(id),names=new Set(rows.map(r=>String(r.name||''))),ids=selectedServiceIds(id),rch=catalogRachna();
 const currentPackage=(rows.find(r=>r.category==='Aavartan Package')?.name||'').replace('Aavartan Photo + Video — ','');
 let html='<div class="service-editor">'
 +'<div class="service-editor-block"><div class="eyebrow">1 · AAVARTAN PHOTO + VIDEO</div><h3>Core package</h3><p>One combined photography + videography service. Package selection does not automatically create a quotation charge.</p><div class="svc-choice-grid">'
 +PACKAGES.map((p,i)=>'<label class="svc-choice package '+(p[0]===currentPackage?'selected':'')+'"><input type="radio" name="svcPackage" value="'+esc(p[0])+'" '+(p[0]===currentPackage?'checked':'')+'><span><b>'+esc(p[0])+'</b><small>'+(p[1]?money(p[1])+' guide price':'Custom quotation')+'</small></span></label>').join('')+'</div></div>'
 +'<div class="service-editor-block"><div class="eyebrow">2 · AAVARTAN ADD-ONS</div><h3>Optional production extras</h3><div class="svc-choice-grid">'
 +ADDONS.map((x,i)=>'<label class="svc-choice"><input type="checkbox" data-addon="'+i+'" '+(names.has('Aavartan Add-on — '+x[0])?'checked':'')+'><span><b>'+esc(x[0])+'</b><small>'+money(x[1])+' guide price</small></span></label>').join('')+'</div></div>'
 +'<div class="service-editor-block"><div class="eyebrow">3 · RACHNA</div><h3>Event-management services</h3><p>Select the actual Rachna services this project requires. Prices are handled in the quotation.</p><div class="svc-choice-grid">'
 +(rch.length?rch.map(s=>serviceCard(s,ids.has(s.id)||names.has(s.name))).join(''):'<div class="empty-service"><b>No Rachna services are configured.</b><span>Add Rachna services in Settings → Service Catalog first.</span></div>')+'</div></div>'
 +'</div>';
 openModal('Add services',html,'<button class="btn" id="svcCancel">Cancel</button><button class="btn primary" id="svcSave">Save service scope</button>');
 $('#svcCancel')?.addEventListener('click',closeModal);$('#svcSave')?.addEventListener('click',()=>saveAllServices(id));
}
async function saveAllServices(id){
 try{
  const pkg=document.querySelector('input[name="svcPackage"]:checked')?.value;if(!pkg)throw new Error('Select an Aavartan Photo + Video package.');
  const rch=catalogRachna(),wantedR=new Set([...document.querySelectorAll('[data-rid]:checked')].map(x=>x.dataset.rid));
  const wantedAdd=new Set([...document.querySelectorAll('[data-addon]:checked')].map(x=>Number(x.dataset.addon)));
  const existing=rowsFor(id);
  for(const row of existing){
   const isPkg=row.category==='Aavartan Package';
   const isAdd=row.category==='Aavartan Add-on';
   const isR=row.service_id&&rch.some(s=>s.id===row.service_id) || row.category==='Rachna Service';
   let keep=true;
   if(isPkg)keep=String(row.name||'')==='Aavartan Photo + Video — '+pkg;
   else if(isAdd){const nm=String(row.name||'').replace('Aavartan Add-on — ','');keep=[...wantedAdd].some(i=>ADDONS[i]?.[0]===nm)}
   else if(isR)keep=Boolean(row.service_id&&wantedR.has(row.service_id));
   if(!keep)await A.remove('project_services',row.id);
  }
  await A.refresh();
  const fresh=rowsFor(id);
  if(!fresh.some(r=>r.category==='Aavartan Package'))await A.addProjectService({project_id:id,name:'Aavartan Photo + Video — '+pkg,category:'Aavartan Package',quantity:1,customer_price:0,internal_cost:0});
  for(const i of wantedAdd){const x=ADDONS[i];if(x&&!rowsFor(id).some(r=>r.name==='Aavartan Add-on — '+x[0]))await A.addProjectService({project_id:id,name:'Aavartan Add-on — '+x[0],category:'Aavartan Add-on',quantity:1,customer_price:0,internal_cost:0});}
  await A.refresh();
  for(const s of rch){if(wantedR.has(s.id)&&!rowsFor(id).some(r=>r.service_id===s.id)){await A.addProjectService({project_id:id,service_id:s.id,name:s.name,category:'Rachna Service',quantity:1,customer_price:Number(s.base_price)||0,internal_cost:Number(s.internal_cost)||0})}}
  await A.recalc(id); await A.refresh(); closeModal(); renderServicePage(id); toast('Service scope saved');
 }catch(e){toast(e?.message||'Could not save service scope',true)}
}
async function removeRachnaService(projectId,serviceId){try{const row=rowsFor(projectId).find(r=>r.service_id===serviceId);if(!row) return;await A.remove('project_services',row.id);await A.refresh();await A.recalc(projectId);await A.refresh();renderServicePage(projectId);toast('Rachna service removed')}catch(e){toast(e?.message||'Could not remove service',true)}}
function intercept(){
 document.addEventListener('click',e=>{
  const btn=e.target.closest('.subnav-btn');
  if(btn&&btn.textContent.trim()==='Services'){
   const id=projectIdFromButton(btn);if(id){e.preventDefault();e.stopImmediatePropagation();renderServicePage(id)}
  }
  const pick=e.target.closest('[onclick*="servicePicker"]');
  if(pick){const id=projectIdFromButton(pick)||activeProject; if(id){e.preventDefault();e.stopImmediatePropagation();openServiceEditor(id)}}
 },true);
}
intercept();
})();
