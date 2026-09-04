(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN'));
  const roles = ['Photographer','Videographer','Cinematographer','Editor','Coordinator','Decorator','Driver','Assistant','Drone','Other'];
  let currentProjectId = null;
  let requirements = [];

  const toast = (m, error=false) => { const n=$('#toast'); if(!n)return; n.textContent=m; n.className='toast show'+(error?' error':''); clearTimeout(window.__crewToast2); window.__crewToast2=setTimeout(()=>n.className='toast',3000); };
  const close = () => $('#backdrop')?.classList.remove('show');
  const modal = (title, body, actions='') => { const n=$('#modal'); if(!n)return; n.innerHTML=`<div class="modal-head"><div><div class="eyebrow">CREW OPERATIONS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-crew2="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-crew2="close">Cancel</button>${actions}</div>`; $('#backdrop')?.classList.add('show'); };
  const project = id => A.state.projects.find(p=>p.id===id);
  const projectFunctions = id => A.state.functions.filter(f=>f.project_id===id);
  const team = () => A.state.team.filter(t=>t.active!==false);
  const assignments = id => A.state.projectTeam.filter(x=>x.project_id===id);
  const reqsFor = fid => requirements.filter(r=>r.function_id===fid);
  const assigneesFor = (fid, role) => assignments(currentProjectId).filter(x=>x.function_id===fid && String(x.responsibility||'').toLowerCase()===String(role||'').toLowerCase());

  const css = document.createElement('style');
  css.textContent = `
    .crew2-launch{margin-left:8px}
    .crew2-modal-wrap{display:grid;gap:16px}
    .crew2-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .crew2-kpi{border:1px solid #e3ded6;border-radius:14px;padding:13px;background:#faf9f7}.crew2-kpi span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#817a72}.crew2-kpi strong{display:block;font-size:23px;margin-top:3px}.crew2-kpi em{display:block;font-size:11px;color:#8b847b;font-style:normal;margin-top:2px}
    .crew2-function{border:1px solid #e0dbd3;border-radius:14px;overflow:hidden;background:#fff}.crew2-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:14px 16px;background:#faf8f4;border-bottom:1px solid #e7e2db}.crew2-head h3{margin:0;font-size:16px}.crew2-head p{margin:4px 0 0;color:#7c766f;font-size:11px}.crew2-head-actions{display:flex;gap:6px;flex-wrap:wrap}
    .crew2-scroll{overflow:auto}.crew2-table{width:100%;border-collapse:collapse;min-width:690px}.crew2-table th,.crew2-table td{padding:10px 12px;border-bottom:1px solid #eeeae4;font-size:12px;text-align:left;vertical-align:middle}.crew2-table th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#827a71}.crew2-table tr:last-child td{border-bottom:0}
    .crew2-gap.ok{font-weight:700;color:#27734c}.crew2-gap.warn{font-weight:700;color:#9b6b13}.crew2-gap.over{font-weight:700;color:#963f39}.crew2-muted{color:#898178;font-size:11px}.crew2-people{display:grid;gap:5px}.crew2-person{display:flex;align-items:center;justify-content:space-between;gap:8px}.crew2-person-name{font-weight:600}.crew2-person-rate{display:block;color:#8a837b;font-size:10px;margin-top:1px}.crew2-empty{padding:22px;text-align:center;color:#817a71}.crew2-empty b{display:block;color:#403b36;margin-bottom:3px}.crew2-unplanned{padding:9px 12px;background:#fff9ec;color:#665c43;font-size:11px}
    .crew2-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.crew2-full{grid-column:1/-1}.crew2-hint{margin:8px 0 0;font-size:11px;color:#817a71;line-height:1.4}
    @media(max-width:800px){.crew2-kpis{grid-template-columns:1fr 1fr}.crew2-grid{grid-template-columns:1fr}.crew2-full{grid-column:auto}.crew2-head{flex-direction:column}}
  `;
  document.head.appendChild(css);

  async function loadRequirements(projectId){
    const {data,error}=await A.sb.from('function_crew_requirements').select('*').eq('project_id',projectId).order('created_at',{ascending:true});
    if(error) throw error;
    requirements=data||[];
  }

  function requirementModal(projectId,functionId){
    const f=A.state.functions.find(x=>x.id===functionId); if(!f)return;
    modal('Add crew requirement', `<div class="crew2-grid"><label class="field"><span>Function</span><input value="${esc(f.name)}" disabled></label><label class="field"><span>Role</span><select id="c2ReqRole">${roles.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select></label><label class="field"><span>Required</span><input id="c2ReqCount" type="number" min="0" max="50" value="1"></label><label class="field"><span>Notes</span><input id="c2ReqNotes" placeholder="Optional"></label></div>`, `<button class="btn primary" data-crew2="save-req" data-project="${esc(projectId)}" data-function="${esc(functionId)}">Save requirement</button>`);
  }

  function assignModal(projectId,functionId,role=''){
    const fs=projectFunctions(projectId), members=team();
    modal('Assign crew', `<div class="crew2-grid"><label class="field"><span>Function</span><select id="c2AssignFunction">${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===functionId?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><label class="field"><span>Role</span><select id="c2AssignRole">${roles.map(r=>`<option value="${esc(r)}" ${r===role?'selected':''}>${esc(r)}</option>`).join('')}</select></label><label class="field"><span>Freelancer</span><select id="c2AssignMember"><option value="">Select freelancer</option>${members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}${m.role?' · '+esc(m.role):''}${m.phone?' · '+esc(m.phone):''}</option>`).join('')}</select></label><label class="field"><span>Rate / cost (NPR)</span><input id="c2AssignRate" type="number" min="0" value="0"></label><label class="field crew2-full"><span>Responsibility note</span><input id="c2AssignNote" placeholder="Lead / second camera / assistant etc."></label></div><p class="crew2-hint">The database enforces event ownership, duplicate-assignment prevention and same-day freelancer conflicts.</p>`, `<button class="btn primary" data-crew2="save-assignment" data-project="${esc(projectId)}">Assign crew</button>`);
  }

  function membersModal(){
    const rows=team();
    modal('Freelancer roster', `<div class="section-head"><div><div class="eyebrow">ROSTER</div><h2>Active crew</h2><p>These members can be assigned to event functions.</p></div><button class="btn primary" data-crew2="new-member">＋ Add member</button></div><div class="mini-list">${rows.map(m=>`<div class="mini-row"><div><b>${esc(m.name)}</b><small>${esc(m.role||'Role not set')}${m.phone?' · '+esc(m.phone):''}</small></div><button class="btn tiny" data-crew2="edit-member" data-id="${esc(m.id)}">Edit</button></div>`).join('')||'<div class="crew2-empty"><b>No active freelancers</b><span>Add your regular photographers, videographers, editors and assistants.</span></div>'}</div>`, '');
  }

  function memberModal(member){
    modal(member?'Edit freelancer':'Add freelancer', `<div class="crew2-grid"><label class="field"><span>Name</span><input id="c2MemName" value="${esc(member?.name||'')}"></label><label class="field"><span>Role</span><select id="c2MemRole"><option value="">Select role</option>${roles.map(r=>`<option value="${esc(r)}" ${member?.role===r?'selected':''}>${esc(r)}</option>`).join('')}</select></label><label class="field"><span>Phone</span><input id="c2MemPhone" value="${esc(member?.phone||'')}"></label><label class="field"><span>Email</span><input id="c2MemEmail" value="${esc(member?.email||'')}"></label></div>`, `<button class="btn primary" data-crew2="save-member" data-id="${esc(member?.id||'')}">${member?'Save changes':'Add freelancer'}</button>`);
  }

  function renderPanel(projectId){
    currentProjectId=projectId;
    const fs=projectFunctions(projectId), as=assignments(projectId);
    const required=requirements.reduce((a,r)=>a+Number(r.required_count||0),0);
    const assigned=as.filter(a=>a.function_id).length;
    const remaining=Math.max(0,required-assigned);
    const cost=as.reduce((a,a2)=>a+Number(a2.rate||0),0);
    return `<div class="crew2-modal-wrap"><div class="crew2-kpis"><div class="crew2-kpi"><span>Required</span><strong>${required}</strong><em>crew positions</em></div><div class="crew2-kpi"><span>Assigned</span><strong>${assigned}</strong><em>function assignments</em></div><div class="crew2-kpi"><span>Remaining</span><strong>${remaining}</strong><em>${remaining?'needs filling':'fully covered'}</em></div><div class="crew2-kpi"><span>Crew cost</span><strong>${money(cost)}</strong><em>assigned rates</em></div></div><div class="actions" style="justify-content:flex-end;display:flex;gap:8px"><button class="btn soft" data-crew2="members">Manage freelancers</button><button class="btn primary" data-crew2="assign-any" data-project="${esc(projectId)}">＋ Assign crew</button></div>${fs.map(f=>functionCard(projectId,f)).join('')||'<div class="crew2-empty"><b>No functions created</b><span>Create the event functions first.</span></div>'}</div>`;
  }

  function functionCard(projectId,f){
    const req=reqsFor(f.id), as=assignments(projectId).filter(a=>a.function_id===f.id);
    const rows=req.map(r=>{ const people=assigneesFor(f.id,r.role); const gap=Number(r.required_count||0)-people.length; const cls=gap>0?'warn':gap<0?'over':'ok'; const label=gap>0?`${gap} needed`:gap<0?`${Math.abs(gap)} over`:'✓ Covered'; return `<tr><td><b>${esc(r.role)}</b>${r.notes?`<small class="crew2-muted" style="display:block">${esc(r.notes)}</small>`:''}</td><td><b>${Number(r.required_count||0)}</b></td><td><b>${people.length}</b></td><td><span class="crew2-gap ${cls}">${label}</span></td><td><div class="crew2-people">${people.map(x=>{const m=A.state.team.find(t=>t.id===x.team_member_id);return `<div class="crew2-person"><span><span class="crew2-person-name">${esc(m?.name||'Unknown')}</span><small class="crew2-person-rate">${money(x.rate||0)}${m?.phone?' · '+esc(m.phone):''}</small></span><button class="btn tiny" data-crew2="remove" data-id="${esc(x.id)}" data-project="${esc(projectId)}">Remove</button></div>`}).join('')||'<span class="crew2-muted">No one assigned</span>'}</div></td><td><button class="btn tiny" data-crew2="assign" data-project="${esc(projectId)}" data-function="${esc(f.id)}" data-role="${esc(r.role)}">+ Assign</button></td></tr>`; }).join('');
    const unplanned=as.filter(a=>!req.some(r=>String(r.role).toLowerCase()===String(a.responsibility||'').toLowerCase()));
    return `<section class="crew2-function"><div class="crew2-head"><div><h3>${esc(f.name)}</h3><p>${esc(f.event_date_bs||'Date TBC')}${f.event_date?' · '+esc(f.event_date):''}${f.start_time?' · '+esc(String(f.start_time).slice(0,5)):''} · ${esc(f.venue||'Venue TBC')}</p></div><div class="crew2-head-actions"><button class="btn tiny" data-crew2="add-req" data-project="${esc(projectId)}" data-function="${esc(f.id)}">＋ Requirement</button><button class="btn tiny" data-crew2="assign" data-project="${esc(projectId)}" data-function="${esc(f.id)}">Assign</button></div></div><div class="crew2-scroll"><table class="crew2-table"><thead><tr><th>Role</th><th>Required</th><th>Assigned</th><th>Gap</th><th>People</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6"><div class="crew2-empty"><b>No requirements yet</b><span>Add Photographer — 2, Videographer — 2, etc.</span></div></td></tr>'}</tbody></table></div>${unplanned.length?`<div class="crew2-unplanned"><b>Unplanned:</b> ${unplanned.map(x=>{const m=A.state.team.find(t=>t.id===x.team_member_id);return `${esc(m?.name||'Unknown')} · ${esc(x.responsibility||'No role')}`}).join(' · ')}</div>`:''}</section>`;
  }

  function openCrew(projectId){
    (async()=>{ try { await A.refresh(); await loadRequirements(projectId); const p=project(projectId); modal(`Crew · ${p?.event_code||'Event'}`, `<p class="crew2-hint" style="margin:0 0 14px">${esc(p?.name||'Event')} — set the exact crew needed for each function and then assign freelancers.</p><div id="crew2Body">${renderPanel(projectId)}</div>`, ''); } catch(e){ toast(e?.message||'Could not load crew',true); } })();
  }

  function detectProjectId(){
    const page=$('#page'); if(!page || !page.querySelector('.event-head')) return null;
    const p=A.state.projects.find(x=>x.event_code && page.textContent.includes(x.event_code));
    return p?.id || null;
  }

  function ensureLaunchButton(){
    const page=$('#page'); if(!page)return;
    const pid=detectProjectId(); if(!pid)return;
    const head=page.querySelector('.event-head'); if(!head || head.querySelector('[data-crew2="open"]'))return;
    const btn=document.createElement('button'); btn.className='btn primary crew2-launch'; btn.dataset.crew2='open'; btn.dataset.project=pid; btn.textContent='Crew Operations';
    const actions=head.querySelector('.actions') || head;
    actions.appendChild(btn);
  }

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-crew2]'); if(!t)return;
    const action=t.dataset.crew2; if(action==='open'){e.preventDefault();e.stopImmediatePropagation();return openCrew(t.dataset.project);}
    e.preventDefault();e.stopImmediatePropagation();
    (async()=>{
      try{
        if(action==='close')return close();
        if(action==='add-req')return requirementModal(t.dataset.project,t.dataset.function);
        if(action==='assign')return assignModal(t.dataset.project,t.dataset.function,t.dataset.role||'');
        if(action==='assign-any')return assignModal(t.dataset.project,projectFunctions(t.dataset.project)[0]?.id||'');
        if(action==='save-req'){
          const role=$('#c2ReqRole')?.value, count=Math.max(0,Number($('#c2ReqCount')?.value||0)), notes=$('#c2ReqNotes')?.value?.trim()||null;
          if(!role)throw new Error('Choose a role.');
          const {error}=await A.sb.from('function_crew_requirements').insert({project_id:t.dataset.project,function_id:t.dataset.function,role,required_count:count,notes});
          if(error)throw error; close(); await openCrew(t.dataset.project); toast('Crew requirement saved'); return;
        }
        if(action==='save-assignment'){
          const pid=t.dataset.project, fid=$('#c2AssignFunction')?.value, mid=$('#c2AssignMember')?.value, role=$('#c2AssignRole')?.value, rate=Number($('#c2AssignRate')?.value||0), note=$('#c2AssignNote')?.value?.trim()||null;
          if(!fid||!mid)throw new Error('Select a function and freelancer.');
          await A.assignTeam({project_id:pid,function_id:fid,team_member_id:mid,responsibility:role||note||null,rate});
          close(); await openCrew(pid); toast('Crew assigned'); return;
        }
        if(action==='remove'){
          if(!confirm('Remove this crew assignment?'))return;
          await A.remove('project_team',t.dataset.id); close(); await openCrew(t.dataset.project); toast('Crew assignment removed'); return;
        }
        if(action==='members')return membersModal();
        if(action==='new-member')return memberModal(null);
        if(action==='edit-member')return memberModal(A.state.team.find(m=>m.id===t.dataset.id));
        if(action==='save-member'){
          const name=$('#c2MemName')?.value?.trim(); if(!name)throw new Error('Name is required.');
          const row={name,role:$('#c2MemRole')?.value||null,phone:$('#c2MemPhone')?.value?.trim()||null,email:$('#c2MemEmail')?.value?.trim()||null};
          if(t.dataset.id)await A.updateTeam(t.dataset.id,row); else await A.addTeam(row);
          close(); if(currentProjectId)await openCrew(currentProjectId); toast(t.dataset.id?'Freelancer updated':'Freelancer added'); return;
        }
      }catch(err){toast(err?.message||'Crew action failed',true)}
    })();
  },true);

  const observer=new MutationObserver(()=>ensureLaunchButton());
  observer.observe(document.body,{childList:true,subtree:true});
  window.setTimeout(ensureLaunchButton,600);
})();
