(()=>{
  const A=window.RachnaAPI;
  const $=s=>document.querySelector(s);
  const E=A.esc;
  const M=A.money;
  const months=['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
  const addons=[['Candid coverage',12000],['Cinematic coverage',15000],['Drone',8000],['Premium Karizma album',10000],['Social media reels',15000],['Additional photographer',12000],['Additional videographer',12000],['Pre-wedding',25000],['Post-wedding',25000],['Additional album',5000]];
  const rachna=['Decoration / stage design','Venue coordination','Catering coordination','Makeup & beauty','Mehendi','Band / DJ / artists','Wedding car / transport','Panche baja','Event coordination'];
  const packages=[['Essential Package','45,000+'],['Signature Package','85,000+'],['Legacy Package','150,000+'],['2-Day Story','120,000+'],['3-Day Story','180,000+'],['Multi-day / Custom','Custom']];
  function closeModal(){ $('#backdrop')?.classList.remove('show'); }
  function toast(msg,error=false){ const t=$('#toast'); if(!t)return; t.textContent=msg; t.className='toast show '+(error?'error':''); clearTimeout(window.__f6t); window.__f6t=setTimeout(()=>t.className='toast',3000); }
  function modal(title,body,actions){ $('#modal').innerHTML='<div class="modal-head"><div><div class="eyebrow">Rachna OS</div><h2>'+title+'</h2></div><button class="close-btn" onclick="closeModal()">×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot">'+actions+'</div>'; $('#backdrop').classList.add('show'); }
  function servicePicker(id){
    const ex=A.state.projectServices.filter(x=>x.project_id===id).map(x=>x.description||x.name);
    const body='<div class="form-note">Choose the Aavartan package first. Add-ons and Rachna services are optional.</div>'+
      '<div class="service-group"><div class="group-title">Aavartan · PHOTO + VIDEO PACKAGE</div><div class="check-grid">'+
      packages.map((p,i)=>'<label class="check-card '+(i===0?'core':'')+'"><input type="radio" name="avPackage" data-package="'+i+'" value="'+E(p[0])+'"><span><b>'+E(p[0])+'</b><small>'+E(p[1])+'</small></span></label>').join('')+
      '</div></div>'+
      '<div class="service-group"><div class="group-title">Aavartan · ADD-ONS</div><div class="check-grid">'+
      addons.map((x,i)=>'<label class="check-card"><input data-add="'+i+'" type="checkbox" '+(ex.includes(x[0])?'checked':'')+'><span><b>'+E(x[0])+'</b><small>'+M(x[1])+'</small></span></label>').join('')+
      '</div></div>'+
      '<div class="service-group"><div class="group-title">Rachna · EVENT MANAGEMENT</div><div class="check-grid">'+
      rachna.map((x,i)=>'<label class="check-card"><input data-rachna="'+i+'" type="checkbox" '+(ex.includes(x)?'checked':'')+'><span><b>'+E(x)+'</b><small>Price after consultation</small></span></label>').join('')+
      '</div></div>'+
      '<div class="inline-tip"><b>Important:</b> Photo + Video is one combined core service. The package price is entered per project/quotation; there is no automatic 45K charge.</div>';
    modal('Choose services',body,'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveServices(\''+id+'\')">Add selected</button>');
    const existingPackage=ex.find(v=>packages.some(p=>p[0]===v));
    if(existingPackage){ const r=document.querySelector(`input[name="avPackage"][value="${CSS.escape(existingPackage)}"]`); if(r)r.checked=true; }
  }
  async function saveServices(id){
    try{
      const selectedPackage=document.querySelector('input[name="avPackage"]:checked')?.value||null;
      if(!selectedPackage){ throw new Error('Please select an Aavartan Photo + Video package.'); }
      const existing=A.state.projectServices.filter(x=>x.project_id===id);
      const existingByDesc=new Map(existing.map(x=>[(x.description||x.name||''),x]));
      const desired=[];
      desired.push({description:selectedPackage,category:'Aavartan Package',quantity:1,customer_price:0,internal_cost:0});
      addons.forEach((x,i)=>{if($('[data-add="'+i+'"]')?.checked)desired.push({description:x[0],category:'Aavartan Add-on',quantity:1,customer_price:x[1],internal_cost:0});});
      rachna.forEach((x,i)=>{if($('[data-rachna="'+i+'"]')?.checked)desired.push({description:x,category:'Rachna Service',quantity:1,customer_price:0,internal_cost:0});});
      const desiredNames=new Set(desired.map(x=>x.description));
      for(const row of existing){
        const desc=row.description||row.name||'';
        if(!desiredNames.has(desc)) await A.remove?.('project_services',row.id);
      }
      const current=A.state.projectServices.filter(x=>x.project_id===id);
      const currentNames=new Set(current.map(x=>x.description||x.name||''));
      for(const item of desired){
        if(!currentNames.has(item.description)) await A.addProjectService({project_id:id,...item});
      }
      await A.recalc(id);
      closeModal();
      if(typeof window.render==='function')window.render();
      toast('Selected services added');
    }catch(e){ toast(e.message||'Could not save services',true); }
  }
  window.servicePicker=servicePicker;
  window.saveServices=saveServices;
  window.closeModal=window.closeModal||closeModal;
})();
