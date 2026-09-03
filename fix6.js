(()=>{
const A=window.RachnaAPI,$=s=>document.querySelector(s),E=A.esc;
const addons=[['Candid coverage',12000],['Cinematic coverage',15000],['Drone',8000],['Premium Karizma album',10000],['Social media reels',15000],['Additional photographer',12000],['Additional videographer',12000],['Pre-wedding',25000],['Post-wedding',25000],['Additional album',5000]];
const rachna=['Decoration / stage design','Venue coordination','Catering coordination','Makeup & beauty','Mehendi','Band / DJ / artists','Wedding car / transport','Panche baja','Event coordination'];
const packages=[['Essential Package','45,000+'],['Signature Package','85,000+'],['Legacy Package','150,000+'],['2-Day Story','120,000+'],['3-Day Story','180,000+'],['Multi-day / Custom','Custom']];
function closeModal(){ $('#backdrop')?.classList.remove('show'); }
function toast(msg,error=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show '+(error?'error':'');clearTimeout(window.__f6t);window.__f6t=setTimeout(()=>t.className='toast',3000);}
function modal(title,body,actions){$('#modal').innerHTML='<div class="modal-head"><div><div class="eyebrow">Rachna OS</div><h2>'+E(title)+'</h2></div><button class="close-btn" onclick="closeModal()">×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot">'+actions+'</div>';$('#backdrop').classList.add('show');}
function servicePicker(id){
 const rows=A.state.projectServices.filter(x=>x.project_id===id),names=new Set(rows.map(x=>String(x.name||x.description||'')));
 const pkgRow=rows.find(x=>String(x.name||'').startsWith('Aavartan Photo + Video — '));
 const currentPkg=pkgRow?String(pkgRow.name||'').replace(/^Aavartan Photo \+ Video — /,''):'';
 let body='<div class="form-note"><b>Choose the Aavartan Photo + Video package.</b> This is one combined core service. Add-ons and Rachna services are optional.</div>';
 body+='<div class="service-group"><div class="group-title">Aavartan · PHOTO + VIDEO PACKAGE</div><div class="check-grid">'+packages.map(p=>'<label class="check-card '+(p[0]===currentPkg?'core':'')+'"><input type="radio" name="fix6Package" value="'+E(p[0])+'" '+(p[0]===currentPkg?'checked':'')+'><span><b>'+E(p[0])+'</b><small>NPR '+E(p[1])+'</small></span></label>').join('')+'</div></div>';
 body+='<div class="service-group"><div class="group-title">Aavartan · ADD-ONS</div><div class="check-grid">'+addons.map((x,i)=>'<label class="check-card"><input data-fix6-addon="'+i+'" type="checkbox" '+(names.has('Aavartan Add-on — '+x[0])||names.has(x[0])?'checked':'')+'><span><b>'+E(x[0])+'</b><small>NPR '+E(String(x[1]))+'</small></span></label>').join('')+'</div></div>';
 body+='<div class="service-group"><div class="group-title">Rachna · EVENT MANAGEMENT</div><div class="check-grid">'+rachna.map((x,i)=>'<label class="check-card"><input data-fix6-rachna="'+i+'" type="checkbox" '+(names.has('Rachna — '+x)||names.has(x)?'checked':'')+'><span><b>'+E(x)+'</b><small>Price after consultation</small></span></label>').join('')+'</div></div>';
 body+='<div class="inline-tip">Rachna services are linked to the service catalog. Their final customer price is entered in the quotation; selecting them here does not add an automatic customer charge.</div>';
 modal('Choose services',body,'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="fix6SaveServices(\''+E(id)+'\')">Add selected</button>');
}
window.fix6SaveServices=async function(id){
 try{
   const packageName=document.querySelector('input[name="fix6Package"]:checked')?.value;
   if(!packageName)throw new Error('Please select an Aavartan Photo + Video package.');
   const desired=[{name:'Aavartan Photo + Video — '+packageName,quantity:1,customer_price:0,internal_cost:0}];
   addons.forEach((x,i)=>{if(document.querySelector('[data-fix6-addon="'+i+'"]')?.checked)desired.push({name:'Aavartan Add-on — '+x[0],quantity:1,customer_price:0,internal_cost:0});});
   rachna.forEach((x,i)=>{
     if(!document.querySelector('[data-fix6-rachna="'+i+'"]')?.checked)return;
     const catalog=A.state.services.find(s=>String(s.brand||'').toLowerCase()==='rachna'&&String(s.name||'').trim()===x.trim())||A.state.services.find(s=>String(s.name||'').trim()===x.trim());
     desired.push({name:'Rachna — '+x,service_id:catalog?.id||null,quantity:1,customer_price:0,internal_cost:Number(catalog?.internal_cost||0)});
   });
   const existing=A.state.projectServices.filter(x=>x.project_id===id);
   const desiredNames=new Set(desired.map(x=>x.name));
   for(const row of existing){if(!desiredNames.has(String(row.name||row.description||'')))await A.remove('project_services',row.id);}
   await A.refresh();
   const now=new Set(A.state.projectServices.filter(x=>x.project_id===id).map(x=>String(x.name||x.description||'')));
   for(const item of desired){if(!now.has(item.name))await A.addProjectService({project_id:id,...item});}
   await A.refresh();
   await A.recalc(id);
   closeModal();toast('Services saved');
 }catch(e){toast(e?.message||'Could not save services',true);}
};
window.servicePicker=servicePicker;
})();
