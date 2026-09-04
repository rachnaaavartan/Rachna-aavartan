(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN'));
  const roles = ['Photographer','Videographer','Cinematographer','Editor','Coordinator','Decorator','Driver','Assistant','Drone','Other'];
  const state = { loadedFor: null };
  const toast = (m, error=false) => { const n=$('#toast'); if(!n)return; n.textContent=m; n.className='toast show'+(error?' error':''); clearTimeout(window.__crewToast); window.__crewToast=setTimeout(()=>n.className='toast',3000); };
  const close = () => $('#backdrop')?.classList.remove('show');
  const project = id => A.state.projects.find(p=>p.id===id);
  const fn = id => A.state.functions.find(f=>f.id===id);
  const crewForFunction = id => A.state.projectTeam.filter(x=>x.function_id===id);
  const reqForFunction = (reqs,id) => reqs.filter(x=>x.function_id===id);
  const activeTeam = () => A.state.team.filter(x=>x.active!==false);

  const style = document.createElement('style');
  style.textContent = `
    .crew-os{display:grid;gap:18px}
    .crew-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .crew-kpi{border:1px solid #e3ded6;border-radius:14px;padding:14px;background:#fff}.crew-kpi span{display:block;color:#817b73;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.crew-kpi strong{display:block;font-size:24px;margin-top:5px}.crew-kpi em{display:block;color:#8e877f;font-size:12px;font-style:normal;margin-top:3px}
    .crew-function{border:1px solid #e1dcd4;border-radius:16px;background:#fff;overflow:hidden}
    .crew-function-head{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;background:#faf8f4;border-bottom:1px solid #e5e0d8;align-items:flex-start}.crew-function-head h3{margin:0;font-size:17px}.crew-function-head p{margin:4px 0 0;color:#7b766f;font-size:12px}
    .crew-actions{display:flex;gap:8px;flex-wrap:wrap}
    .crew-table{width:100%;border-collapse:collapse}.crew-table th,.crew-table td{padding:11px 14px;border-bottom:1px solid #eee9e2;text-align:left;font-size:13px;vertical-align:middle}.crew-table th{font-size:11px;color:#817b73;text-transform:uppercase;letter-spacing:.06em;background:#fff}.crew-table tr:last-child td{border-bottom:0}
    .crew-gap{font-weight:700}.crew-gap.ok{color:#25734d}.crew-gap.warn{color:#9a6b12}.crew-gap.over{color:#9b3d36}
    .crew-assignees{margin-top:4px;color:#6f6a63;font-size:12px;line-height:1.45}.crew-assignee{display:flex;justify-content:space-between;gap:12px;padding:8px 14px;border-top:1px dashed #ece7df}.crew-assignee button{white-space:nowrap}
    .crew-unplanned{padding:10px 14px;background:#fffaf0;border-top:1px solid #ece7df;color:#665a3c;font-size:12px}
    .crew-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.crew-full{grid-column:1/-1}.crew-hint{font-size:12px;color:#7c766e;margin:10px 0 0}.crew-role-badge{display:inline-flex;padding:4px 8px;border-radius:999px;background:#f2efea;font-size:11px}
    .crew-member-meta{display:block;color:#8b857d;font-size:11px;margin-top:2px}
    .crew-empty{padding:28px;text-align:center;color:#777066}.crew-empty b{display:block;color:#3d3934;margin-bottom:4px}
    @media(max-width:900px){.crew-kpis{grid-template-columns:1fr 1fr}.crew-function-head{flex-direction:column}.crew-modal-grid{grid-template-columns:1fr}.crew-full{grid-column:auto}.crew-table{min-width:720px}.crew-scroll{overflow:auto}}
  `;
  document.head.appendChild(style);

  function modal(title, body, actions='') {
    const n=$('#modal'); if(!n)return;
    n.innerHTML=`<div class="modal-head"><div><div class="eyebrow">CREW OPERATIONS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-crew-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-crew-action="close">Cancel</button>${actions}</div>`;
    $('#backdrop')?.classList.add('show');
  }

  function requirementModal(projectId, functionId, existing) {
    const f=fn(functionId); if(!f)return;
    modal('Add crew requirement', `<div class="crew-modal-grid">
      <label class="field"><span>Function</span><input value="${esc(f.name)}" disabled></label>
      <label class="field"><span>Role</span><select id="crewReqRole">${roles.map(r=>`<option value="${esc(r)}" ${existing?.role===r?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
      <label class="field"><span>Required count</span><input id="crewReqCount" type="number" min="0" max="50" value="${Number(existing?.required_count??1)}"></label>
      <label class="field"><span>Notes</span><input id="crewReqNotes" value="${esc(existing?.notes||'')}" placeholder="Optional"></label>
    </div>`, `<button class="btn primary" data-crew-action="save-requirement" data-project="${esc(projectId)}" data-function="${esc(functionId)}" data-id="${esc(existing?.id||'')}">Save requirement</button>`);
  }

  function assignModal(projectId, functionId, role='') {
    const f=fn(functionId); if(!f)return;
    const reqs = window.__crewReqs || [];
    const roleValue = role || reqForFunction(reqs,functionId)[0]?.role || '';
    const team = activeTeam();
    modal('Assign crew', `<div class="crew-modal-grid">
      <label class="field"><span>Function</span><select id="crewAssignFunction">${A.state.functions.filter(x=>x.project_id===projectId).map(x=>`<option value="${esc(x.id)}" ${x.id===functionId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Role / responsibility</span><select id="crewAssignRole">${roles.map(r=>`<option value="${esc(r)}" ${r===roleValue?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
      <label class="field"><span>Team member</span><select id="crewAssignMember"><option value="">Select crew member</option>${team.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}${m.role?' · '+esc(m.role):''}${m.phone?' · '+esc(m.phone):''}</option>`).join('')}</select></label>
      <label class="field"><span>Rate / cost (NPR)</span><input id="crewAssignRate" type="number" min="0" value="0"></label>
      <label class="field crew-full"><span>Note</span><input id="crewAssignNote" placeholder="e.g. Lead photographer / second camera"></label>
    </div><p class="crew-hint">The database checks event/function ownership, duplicate assignment, and same-day freelancer conflicts when you save.</p>`, `<button class="btn primary" data-crew-action="assign" data-project="${esc(projectId)}" data-function="${esc(functionId)}">Assign crew</button>`);
  }

  function editMemberModal(member) {
    modal(member ? 'Edit crew member' : 'Add crew member', `<div class="crew-modal-grid">
      <label class="field"><span>Name</span><input id="crewMemberName" value="${esc(member?.name||'')}"></label>
      <label class="field"><span>Role</span><select id="crewMemberRole"><option value="">Select role</option>${roles.map(r=>`<option value="${esc(r)}" ${member?.role===r?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
      <label class="field"><span>Phone</span><input id="crewMemberPhone" value="${esc(member?.phone||'')}"></label>
      <label class="field"><span>Email</span><input id="crewMemberEmail" type="email" value="${esc(member?.email||'')}"></label>
    </div>`, `<button class="btn primary" data-crew-action="save-member" data-id="${esc(member?.id||'')}">${member?'Save changes':'Add crew member'}</button>`);
  }

  async function loadRequirements(projectId) {
    const {data,error}=await A.sb.from('function_crew_requirements').select('*').eq('project_id',projectId).order('created_at',{ascending:true});
    if(error) throw error; window.__crewReqs=data||[]; return window.__crewReqs;
  }

  function renderCrew(projectId) {
    const page=$('#page'), p=project(projectId); if(!page||!p)return;
    const functions=A.state.functions.filter(x=>x.project_id===projectId);
    const reqs=window.__crewReqs||[];
    const assignments=A.state.projectTeam.filter(x=>x.project_id===projectId);
    const requiredTotal=reqs.reduce((a,r)=>a+Number(r.required_count||0),0);
    const assignedTotal=assignments.filter(x=>x.function_id).length;
    const gaps=Math.max(0,requiredTotal-assignedTotal);
    const cost=assignments.reduce((a,x)=>a+Number(x.rate||0),0);
    const target=page.querySelector('[data-crew-host]');
    if(!target)return;
    target.innerHTML=`<div class="crew-os">
      <div class="section-head"><div><div class="eyebrow">FUNCTION CREW</div><h2>Required vs assigned</h2><p>Plan staffing per function without mixing it into services.</p></div><div class="actions"><button class="btn soft" data-crew-action="manage-members">Manage freelancers</button><button class="btn primary" data-crew-action="assign-first" data-project="${esc(projectId)}">＋ Assign crew</button></div></div>
      <div class="crew-kpis"><div class="crew-kpi"><span>Required</span><strong>${requiredTotal}</strong><em>planned crew positions</em></div><div class="crew-kpi"><span>Assigned</span><strong>${assignedTotal}</strong><em>function assignments</em></div><div class="crew-kpi"><span>Remaining</span><strong>${gaps}</strong><em>${gaps?'roles still to fill':'fully covered'}</em></div><div class="crew-kpi"><span>Crew cost</span><strong>${money(cost)}</strong><em>assigned internal rates</em></div></div>
      ${functions.length ? functions.map(f=>functionCard(projectId,f,reqForFunction(reqs,f.id))).join('') : `<div class="crew-empty"><b>No event functions yet</b><span>Add functions first, then set the crew requirement.</span></div>`}
    </div>`;
  }

  function functionCard(projectId,f,reqs) {
    const assignments=crewForFunction(f.id);
    const rows=reqs.map(r=>{
      const assigned=assignments.filter(a=>String(a.responsibility||'').toLowerCase()===String(r.role||'').toLowerCase()).length;
      const gap=Number(r.required_count||0)-assigned;
      const cls=gap>0?'warn':gap<0?'over':'ok';
      const label=gap>0?`${gap} needed`:gap<0?`${Math.abs(gap)} over`:'✓ Covered';
      const people=assignments.filter(a=>String(a.responsibility||'').toLowerCase()===String(r.role||'').toLowerCase()).map(a=>{const m=A.state.team.find(t=>t.id===a.team_member_id);return `<div class="crew-assignee"><span>${esc(m?.name||'Unknown')} <span class="crew-role-badge">${esc(r.role)}</span><small class="crew-member-meta">${money(a.rate||0)}${m?.phone?' · '+esc(m.phone):''}</small></span><button class="btn tiny" data-crew-action="remove-assignment" data-id="${esc(a.id)}" data-project="${esc(projectId)}">Remove</button></div>`}).join('');
      return `<tr><td><b>${esc(r.role)}</b>${r.notes?`<small class="crew-member-meta">${esc(r.notes)}</small>`:''}</td><td><b>${Number(r.required_count||0)}</b></td><td><b>${assigned}</b></td><td><span class="crew-gap ${cls}">${label}</span></td><td>${people||'<span class="crew-member-meta">No one assigned</span>'}</td><td><button class="btn tiny" data-crew-action="assign" data-project="${esc(projectId)}" data-function="${esc(f.id)}" data-role="${esc(r.role)}">+ Assign</button></td></tr>`;
    }).join('');
    const unplanned=assignments.filter(a=>!reqs.some(r=>String(r.role||'').toLowerCase()===String(a.responsibility||'').toLowerCase()));
    return `<section class="crew-function"><div class="crew-function-head"><div><h3>${esc(f.name)}</h3><p>${esc(f.event_date_bs||'Date TBC')}${f.event_date?' · '+esc(f.event_date):''}${f.start_time?' · '+esc(String(f.start_time).slice(0,5)):''} · ${esc(f.venue||'Venue TBC')}</p></div><div class="crew-actions"><button class="btn tiny" data-crew-action="add-requirement" data-project="${esc(projectId)}" data-function="${esc(f.id)}">＋ Add requirement</button><button class="btn tiny" data-crew-action="assign" data-project="${esc(projectId)}" data-function="${esc(f.id)}">Assign crew</button></div></div><div class="crew-scroll"><table class="crew-table"><thead><tr><th>Role</th><th>Required</th><th>Assigned</th><th>Gap</th><th>Assigned people</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="6"><div class="crew-empty"><b>No requirements yet</b><span>Add “Photographer — 2”, “Videographer — 2”, etc.</span></div></td></tr>`}</tbody></table></div>${unplanned.length?`<div class="crew-unplanned"><b>Unplanned assignments:</b> ${unplanned.map(a=>{const m=A.state.team.find(t=>t.id===a.team_member_id);return `${esc(m?.name||'Unknown')} · ${esc(a.responsibility||'No role')}`}).join(' · ')}</div>`:''}</section>`;
  }

  async function refreshCrew(projectId) {
    await A.refresh();
    await loadRequirements(projectId);
    renderCrew(projectId);
  }

  function detectProjectAndCrewTab() {
    const page=$('#page'); if(!page)return null;
    const eventId=page.querySelector('.event-head') ? (A.state.projects.find(p=>page.textContent.includes(p.event_code||'__never__'))?.id) : null;
    const buttons=$$('button',page).filter(b=>String(b.textContent||'').trim().toLowerCase()==='crew');
    const active=buttons.some(b=>b.classList.contains('active')||b.getAttribute('aria-selected')==='true');
    return eventId && active ? eventId : null;
  }

  function ensureHost(projectId) {
    const page=$('#page'); if(!page)return null;
    let host=page.querySelector('[data-crew-host]');
    if(!host){
      host=document.createElement('div'); host.dataset.crewHost='';
      const candidates=$$('.panel,section',page);
      const candidate=candidates.find(x=>/crew/i.test(x.textContent||''));
      if(candidate){candidate.innerHTML=''; candidate.appendChild(host);}
      else {host.className='panel'; page.appendChild(host);}
    }
    return host;
  }

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-crew-action]'); if(!t)return;
    e.preventDefault(); e.stopImmediatePropagation();
    (async()=>{
      try{
        const a=t.dataset.crewAction, pid=t.dataset.project;
        if(a==='close')return close();
        if(a==='add-requirement')return requirementModal(pid,t.dataset.function, null);
        if(a==='assign')return assignModal(pid,t.dataset.function,t.dataset.role||'');
        if(a==='assign-first')return assignModal(pid,A.state.functions.find(x=>x.project_id===pid)?.id||'');
        if(a==='save-requirement'){
          const fid=t.dataset.function, role=$('#crewReqRole')?.value, count=Math.max(0,Number($('#crewReqCount')?.value||0)), notes=$('#crewReqNotes')?.value?.trim()||null;
          if(!fid||!role)throw new Error('Choose a role and function.');
          const payload={project_id:pid,function_id:fid,role,required_count:count,notes};
          let query=A.sb.from('function_crew_requirements');
          if(t.dataset.id) query=query.update({role,required_count:count,notes}).eq('id',t.dataset.id); else query=query.insert(payload);
          const {error}=await query; if(error)throw error;
          close(); await refreshCrew(pid); toast('Crew requirement saved'); return;
        }
        if(a==='assign'){
          const fid=$('#crewAssignFunction')?.value||t.dataset.function, member=$('#crewAssignMember')?.value, role=$('#crewAssignRole')?.value, rate=Number($('#crewAssignRate')?.value||0), note=$('#crewAssignNote')?.value?.trim()||null;
          if(!fid||!member)throw new Error('Select a function and team member.');
          await A.assignTeam({project_id:pid,function_id:fid,team_member_id:member,responsibility:role||null,rate});
          close(); await refreshCrew(pid); toast('Crew assigned'); return;
        }
        if(a==='remove-assignment'){
          if(!confirm('Remove this crew assignment?'))return;
          await A.remove('project_team',t.dataset.id); await refreshCrew(pid); toast('Assignment removed'); return;
        }
        if(a==='manage-members'){
          const rows=activeTeam();
          modal('Manage freelancers', `<div class="section-head"><div><div class="eyebrow">ROSTER</div><h2>Active crew</h2><p>${rows.length} active member${rows.length===1?'':'s'}</p></div><button class="btn primary" data-crew-action="new-member">＋ Add member</button></div><div class="mini-list">${rows.map(m=>`<div class="mini-row"><div><b>${esc(m.name)}</b><small>${esc(m.role||'Role not set')}${m.phone?' · '+esc(m.phone):''}</small></div><button class="btn tiny" data-crew-action="edit-member" data-id="${esc(m.id)}">Edit</button></div>`).join('')||'<div class="crew-empty">No freelancers added yet.</div>'}</div>`, '');
          return;
        }
        if(a==='new-member')return editMemberModal(null);
        if(a==='edit-member'){const m=A.state.team.find(x=>x.id===t.dataset.id);return editMemberModal(m);}
        if(a==='save-member'){
          const name=$('#crewMemberName')?.value?.trim(); if(!name)throw new Error('Name is required.');
          const row={name,role:$('#crewMemberRole')?.value||null,phone:$('#crewMemberPhone')?.value?.trim()||null,email:$('#crewMemberEmail')?.value?.trim()||null};
          if(t.dataset.id)await A.updateTeam(t.dataset.id,row); else await A.addTeam(row);
          close();toast(t.dataset.id?'Crew member updated':'Crew member added');
          const current=detectProjectAndCrewTab(); if(current)await refreshCrew(current); return;
        }
      }catch(err){toast(err?.message||'Crew action failed',true)}
    })();
  },true);

  const observer=new MutationObserver(async()=>{
    const pid=detectProjectAndCrewTab();
    if(!pid)return;
    const host=ensureHost(pid); if(!host)return;
    if(state.loadedFor===pid && host.querySelector('.crew-os'))return;
    state.loadedFor=pid;
    host.innerHTML='<div class="crew-empty"><b>Loading crew plan…</b><span>Reading function requirements and assignments.</span></div>';
    try{await loadRequirements(pid); renderCrew(pid)}catch(err){host.innerHTML=`<div class="crew-empty"><b>Could not load crew plan</b><span>${esc(err?.message||'Unknown error')}</span></div>`}
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
