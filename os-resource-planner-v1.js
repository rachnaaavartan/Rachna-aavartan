(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN'));
  const q = (s, r = document) => r.querySelector(s);
  const today = new Date();
  const iso = d => d.toISOString().slice(0,10);
  const parse = s => new Date(s + 'T00:00:00');
  let state = { date: iso(today), view: 'all', search: '' };

  const style = document.createElement('style');
  style.textContent = `
    .rp-modal{position:fixed;inset:0;background:rgba(28,25,22,.42);display:none;align-items:center;justify-content:center;padding:22px;z-index:10060}.rp-modal.show{display:flex}.rp-card{width:min(1180px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #e3ded6;border-radius:18px;box-shadow:0 24px 70px rgba(20,18,15,.24)}
    .rp-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid #ece7e0;background:#faf8f4;position:sticky;top:0;z-index:2}.rp-head h2{margin:3px 0 0;font-size:22px}.rp-head p{margin:5px 0 0;color:#7d766d;font-size:12px}.rp-close{border:0;background:transparent;font-size:26px;cursor:pointer}.rp-body{padding:18px}.rp-toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:end;margin-bottom:14px}.rp-field{display:grid;gap:5px}.rp-field span{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#817a72}.rp-field input,.rp-field select{border:1px solid #ddd7ce;border-radius:10px;padding:9px 10px;background:#fff;min-height:38px}.rp-tabs{display:flex;gap:6px;margin-bottom:14px}.rp-tab{border:1px solid #ddd7ce;background:#fff;border-radius:999px;padding:8px 12px;font-size:11px;cursor:pointer}.rp-tab.active{background:#28252b;color:#fff;border-color:#28252b}.rp-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:12px}.rp-panel{border:1px solid #e3ded6;border-radius:14px;background:#fff;padding:14px;min-height:180px}.rp-panel h3{margin:0 0 3px;font-size:14px}.rp-panel p{margin:0;color:#817a72;font-size:11px}.rp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.rp-kpi{background:#faf9f7;border:1px solid #eee9e2;border-radius:11px;padding:10px}.rp-kpi span{display:block;font-size:9px;text-transform:uppercase;color:#817a72;letter-spacing:.06em}.rp-kpi b{font-size:18px;display:block;margin-top:3px}.rp-list{display:grid;gap:6px;margin-top:10px}.rp-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border:1px solid #eee9e2;border-radius:10px}.rp-row b{font-size:12px}.rp-row small{display:block;color:#817a72;font-size:10px;margin-top:2px}.rp-badge{display:inline-flex;padding:4px 8px;border-radius:999px;background:#f1eee8;font-size:10px}.rp-busy{background:#fff1ef;color:#8f3f38}.rp-free{background:#edf7ef;color:#2a6b49}.rp-warn{background:#fff8e8;color:#8c681a}.rp-empty{text-align:center;padding:28px;color:#817a72;font-size:12px}.rp-table-wrap{overflow:auto}.rp-table{width:100%;border-collapse:collapse;min-width:850px}.rp-table th,.rp-table td{padding:10px 11px;border-bottom:1px solid #eee9e2;text-align:left;font-size:11px;vertical-align:top}.rp-table th{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#817a72}.rp-conflict{background:#fff7f5}.rp-muted{color:#817a72}.rp-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.rp-btn{border:1px solid #dcd6cd;background:#fff;border-radius:10px;padding:9px 12px;font-size:11px;cursor:pointer}.rp-btn.primary{background:#28252b;color:#fff;border-color:#28252b}.rp-btn.danger{background:#fff2f0;color:#8f3f38;border-color:#efd0cc}.rp-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.rp-chip{border:1px solid #e4dfd8;border-radius:999px;padding:7px 10px;font-size:10px;background:#fff}
    @media(max-width:900px){.rp-grid{grid-template-columns:1fr}.rp-kpis{grid-template-columns:1fr 1fr}.rp-head{position:static}.rp-modal{padding:8px}}
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.id='rpModal'; modal.className='rp-modal';
  document.body.appendChild(modal);

  function eventDate(functionId){ return A.state.functions.find(f=>f.id===functionId)?.event_date || null; }
  function eventName(projectId){ return A.state.projects.find(p=>p.id===projectId)?.event_code || A.state.projects.find(p=>p.id===projectId)?.name || 'Event'; }
  function clientName(projectId){ const p=A.state.projects.find(x=>x.id===projectId); return A.state.customers.find(c=>c.id===p?.customer_id)?.name || 'No client'; }
  function resourceRows(){
    const fs=A.state.functions.filter(f=>f.event_date===state.date);
    const pids=new Set(fs.map(f=>f.project_id));
    const assignments=A.state.projectTeam.filter(a=>pids.has(a.project_id));
    const vendors=A.state.vendorBookings.filter(v=>pids.has(v.project_id) && (v.status||'reserved')!=='cancelled');
    const crewBusy=new Set(assignments.map(a=>a.team_member_id));
    const vendorBusy=new Set(vendors.map(v=>v.vendor_id));
    const conflicts=[];
    const crewCounts={}; assignments.forEach(a=>{crewCounts[a.team_member_id]=(crewCounts[a.team_member_id]||0)+1});
    Object.entries(crewCounts).filter(([,n])=>n>1).forEach(([id])=>conflicts.push('crew:'+id));
    const vendorCounts={}; vendors.forEach(v=>{vendorCounts[v.vendor_id]=(vendorCounts[v.vendor_id]||0)+1});
    Object.entries(vendorCounts).filter(([,n])=>n>1).forEach(([id])=>conflicts.push('vendor:'+id));
    return {fs, pids, assignments, vendors, crewBusy, vendorBusy, conflicts};
  }

  function render(){
    const r=resourceRows();
    const crew=A.state.team.filter(t=>t.active!==false).map(t=>({t,busy:r.crewBusy.has(t.id)})).filter(x=>!state.search||x.t.name.toLowerCase().includes(state.search.toLowerCase())||String(x.t.role||'').toLowerCase().includes(state.search.toLowerCase()));
    const vendor=A.state.vendors.map(v=>({v,busy:r.vendorBusy.has(v.id)})).filter(x=>!state.search||x.v.name.toLowerCase().includes(state.search.toLowerCase())||String(x.v.service_category||'').toLowerCase().includes(state.search.toLowerCase()));
    const eventRows=r.fs.map(f=>{
      const as=r.assignments.filter(a=>a.function_id===f.id); const vs=r.vendors.filter(v=>v.function_id===f.id);
      const req=A.state._plannerReqs?.filter(x=>x.function_id===f.id) || [];
      return {f,as,vs,req};
    });
    const busyCrew=r.assignments.length, requiredCrew=(A.state._plannerReqs||[]).filter(x=>x.function_id && r.fs.some(f=>f.id===x.function_id)).reduce((s,x)=>s+Number(x.required_count||0),0);
    modal.innerHTML=`<div class="rp-card"><div class="rp-head"><div><div class="rp-muted" style="font-size:9px;letter-spacing:.08em;text-transform:uppercase">EXECUTION CONTROL</div><h2>Resource Planner</h2><p>Crew + vendor availability, same-day collisions and event execution view.</p></div><button class="rp-close" data-rp="close">×</button></div><div class="rp-body"><div class="rp-toolbar"><label class="rp-field"><span>Planning date</span><input type="date" id="rpDate" value="${esc(state.date)}"></label><label class="rp-field" style="min-width:230px"><span>Search</span><input id="rpSearch" value="${esc(state.search)}" placeholder="Crew, vendor, role..."></label></div><div class="rp-tabs">${['all','crew','vendors','conflicts'].map(v=>`<button class="rp-tab ${state.view===v?'active':''}" data-rp-view="${v}">${v==='all'?'Overview':v==='crew'?'Crew':'vendors'==='vendors'?'Vendors':'Conflicts'}</button>`).join('')}</div>
    <div class="rp-summary"><span class="rp-chip">${r.fs.length} functions</span><span class="rp-chip">${r.pids.size} events</span><span class="rp-chip">${busyCrew} crew assignments</span><span class="rp-chip">${r.vendors.length} vendor jobs</span><span class="rp-chip ${r.conflicts.length?'rp-warn':''}">${r.conflicts.length} collision flags</span></div>
    ${state.view==='all'?`<div class="rp-grid"><section class="rp-panel"><h3>Functions on ${esc(state.date)}</h3><p>What is executing that day.</p>${eventRows.length?`<div class="rp-list">${eventRows.map(x=>`<div class="rp-row"><div><b>${esc(x.f.name)}</b><small>${esc(eventName(x.f.project_id))} · ${esc(clientName(x.f.project_id))} · ${esc(x.f.venue||'Venue TBC')}</small></div><span class="rp-badge">${x.as.length} crew · ${x.vs.length} vendors</span></div>`).join('')}</div>`:'<div class="rp-empty">No dated functions on this date.</div>'}</section><section class="rp-panel"><h3>Crew availability</h3><p>Busy means assigned to at least one function this day.</p><div class="rp-kpis"><div class="rp-kpi"><span>Active</span><b>${A.state.team.filter(t=>t.active!==false).length}</b></div><div class="rp-kpi"><span>Busy</span><b>${r.crewBusy}</b></div><div class="rp-kpi"><span>Free</span><b>${Math.max(0,A.state.team.filter(t=>t.active!==false).length-r.crewBusy)}</b></div></div></section><section class="rp-panel"><h3>Vendor availability</h3><p>Busy means a vendor has a non-cancelled job that day.</p><div class="rp-kpis"><div class="rp-kpi"><span>Total</span><b>${A.state.vendors.length}</b></div><div class="rp-kpi"><span>Busy</span><b>${r.vendorBusy.size}</b></div><div class="rp-kpi"><span>Free</span><b>${Math.max(0,A.state.vendors.length-r.vendorBusy.size)}</b></div></div></section></div>`:''}
    ${state.view==='crew'?`<section class="rp-panel"><h3>Crew roster — ${esc(state.date)}</h3><p>Select a free freelancer in the event crew assignment screen.</p><div class="rp-list">${crew.map(x=>`<div class="rp-row"><div><b>${esc(x.t.name)}</b><small>${esc(x.t.role||'General')} · ${esc(x.t.phone||x.t.email||'')}</small></div><span class="rp-badge ${x.busy?'rp-busy':'rp-free'}">${x.busy?'Busy':'Available'}</span></div>`).join('')||'<div class="rp-empty">No active crew match.</div>'}</div></section>`:''}
    ${state.view==='vendors'?`<section class="rp-panel"><h3>Vendor roster — ${esc(state.date)}</h3><p>Availability is calculated from all non-cancelled vendor jobs on the selected date.</p><div class="rp-list">${vendor.map(x=>`<div class="rp-row"><div><b>${esc(x.v.name)}</b><small>${esc(x.v.service_category||'General')} · ${esc(x.v.area||'Area TBC')}</small></div><span class="rp-badge ${x.busy?'rp-busy':'rp-free'}">${x.busy?'Booked':'Available'}</span></div>`).join('')||'<div class="rp-empty">No vendor match.</div>'}</div></section>`:''}
    ${state.view==='conflicts'?`<section class="rp-panel"><h3>Collision review</h3><p>Same-day multi-event resource usage is shown here before you commit another assignment.</p><div class="rp-table-wrap"><table class="rp-table"><thead><tr><th>Type</th><th>Resource</th><th>Event</th><th>Function</th><th>Status</th></tr></thead><tbody>${r.assignments.filter(a=>{const n=r.assignments.filter(x=>x.team_member_id===a.team_member_id).length;return n>1}).map(a=>{const m=A.state.team.find(t=>t.id===a.team_member_id),f=A.state.functions.find(x=>x.id===a.function_id);return `<tr class="rp-conflict"><td>Crew</td><td><b>${esc(m?.name||'Unknown')}</b></td><td>${esc(eventName(a.project_id))}</td><td>${esc(f?.name||'')}</td><td><span class="rp-badge rp-warn">Multiple assignments</span></td></tr>`}).concat(r.vendors.filter(v=>r.vendors.filter(x=>x.vendor_id===v.vendor_id).length>1).map(v=>{const vd=A.state.vendors.find(x=>x.id===v.vendor_id),f=A.state.functions.find(x=>x.id===v.function_id);return `<tr class="rp-conflict"><td>Vendor</td><td><b>${esc(vd?.name||'Unknown')}</b></td><td>${esc(eventName(v.project_id))}</td><td>${esc(f?.name||'')}</td><td><span class="rp-badge rp-warn">Multiple event jobs</span></td></tr>`})).join('')||'<tr><td colspan="5"><div class="rp-empty">No same-day collisions detected.</div></td></tr>'}</tbody></table></div></section>`:''}
    </div><div class="rp-actions"><button class="rp-btn" data-rp="refresh">Refresh data</button><button class="rp-btn primary" data-rp="close">Done</button></div></div></div>`;
    modal.classList.add('show');
  }

  async function open(){ try{ await A.refresh(); const req=await A.sb.from('function_crew_requirements').select('*'); A.state._plannerReqs=req.data||[]; render(); }catch(e){ modal.innerHTML=`<div class="rp-card"><div class="rp-head"><div><h2>Resource Planner</h2><p>${esc(e.message||'Could not load resource data')}</p></div><button class="rp-close" data-rp="close">×</button></div></div>`; modal.classList.add('show'); } }

  function inject(){
    const host=q('.cos-top-actions');
    if(!host || host.querySelector('[data-rp-open]')) return;
    const b=document.createElement('button'); b.className='cos-btn soft'; b.dataset.rpOpen='1'; b.textContent='◫ Resource Planner'; host.insertBefore(b,host.firstChild);
  }
  document.addEventListener('click', e=>{
    const openBtn=e.target.closest('[data-rp-open]'); if(openBtn){e.preventDefault();open();return;}
    const a=e.target.closest('[data-rp]'); if(!a)return;
    if(a.dataset.rp==='close'){modal.classList.remove('show');return;}
    if(a.dataset.rp==='refresh'){open();return;}
    if(a.dataset.rpView){state.view=a.dataset.rpView;render();}
  });
  document.addEventListener('change',e=>{if(e.target.id==='rpDate'){state.date=e.target.value;render();}});
  document.addEventListener('input',e=>{if(e.target.id==='rpSearch'){state.search=e.target.value;clearTimeout(window.__rpSearch);window.__rpSearch=setTimeout(render,120);}});
  const timer=setInterval(inject,900); window.setTimeout(()=>{clearInterval(timer);inject()},8000); inject();
})();
