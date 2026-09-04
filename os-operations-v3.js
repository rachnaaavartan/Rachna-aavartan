(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || !A.sb) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }));
  const css = document.createElement('style');
  css.textContent = `
    .ops3-wrap{display:grid;gap:18px}.ops3-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ops3-card{background:#fff;border:1px solid #e3ded6;border-radius:16px;padding:16px}.ops3-card h3{margin:0 0 6px;font-size:15px}.ops3-card p{margin:0;color:#7c766e;font-size:12px}.ops3-kpi{font-size:24px;font-weight:800;margin-top:8px}.ops3-event{border:1px solid #e2ddd5;border-radius:16px;overflow:hidden;background:#fff}.ops3-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:15px 17px;background:#faf8f4;border-bottom:1px solid #e8e2d9}.ops3-head h2{margin:0;font-size:17px}.ops3-head small{display:block;margin-top:4px;color:#827b72}.ops3-section{padding:15px 17px;border-bottom:1px solid #eee8df}.ops3-section:last-child{border-bottom:0}.ops3-section-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.ops3-table{width:100%;border-collapse:collapse;margin-top:10px}.ops3-table th,.ops3-table td{text-align:left;padding:9px 7px;border-bottom:1px solid #eee8df;font-size:12px}.ops3-table th{text-transform:uppercase;font-size:10px;letter-spacing:.06em;color:#817a71}.ops3-pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#f2efe9;font-size:11px}.ops3-pill.good{background:#e9f3ec;color:#28724e}.ops3-pill.warn{background:#fff3df;color:#915d21}.ops3-pill.bad{background:#faecea;color:#9a4037}.ops3-actions{display:flex;gap:7px;flex-wrap:wrap}.ops3-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ops3-full{grid-column:1/-1}.ops3-progress{height:7px;background:#eee9e2;border-radius:99px;overflow:hidden;margin-top:7px}.ops3-progress>span{display:block;height:100%;background:#5b5650}.ops3-fn{border:1px solid #ebe5dd;border-radius:13px;overflow:hidden;margin-top:11px}.ops3-fn-head{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#fbfaf7}.ops3-fn-head b{font-size:14px}.ops3-fn-head small{display:block;color:#837c74;margin-top:4px}.ops3-empty{padding:18px;text-align:center;color:#817a72;font-size:12px}.ops3-note{padding:12px 14px;border:1px solid #e9dfbf;background:#fffaf0;border-radius:12px;color:#665a3c;font-size:12px}
    @media(max-width:1000px){.ops3-grid{grid-template-columns:1fr 1fr}.ops3-table-wrap{overflow:auto}.ops3-table{min-width:720px}}
    @media(max-width:680px){.ops3-grid{grid-template-columns:1fr}.ops3-modal-grid{grid-template-columns:1fr}.ops3-full{grid-column:auto}}
  `;
  document.head.appendChild(css);

  const roles = ['Event Manager','Photographer','Videographer','Cinematographer','Drone Operator','Editor','Decorator','Coordinator','Assistant','Sound','Makeup','Other'];
  const statuses = [['todo','To do'],['in_progress','In progress'],['done','Done'],['blocked','Blocked'],['cancelled','Cancelled']];
  const priorities = [['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']];
  const state = { projectId: null, filter: 'all' };
  const projects = () => A.state.projects || [];
  const functions = id => (A.state.functions || []).filter(f => f.project_id === id);
  const customer = id => (A.state.customers || []).find(c => c.id === id);
  const team = () => (A.state.team || []).filter(t => t.active !== false);
  const toast = (m, error = false) => { const n = $('#toast'); if (!n) return; n.textContent = m; n.className = 'toast show' + (error ? ' error' : ''); clearTimeout(window.__ops3Toast); window.__ops3Toast = setTimeout(() => n.className = 'toast', 3000); };
  const close = () => $('#backdrop')?.classList.remove('show');

  async function loadProjectData(projectId) {
    const [tasksRes, reqRes, crewRes, vendorRes] = await Promise.all([
      A.sb.from('event_operations_tasks').select('*').eq('project_id', projectId).order('due_at', { ascending: true, nullsFirst: false }),
      A.sb.from('function_crew_requirements').select('*').eq('project_id', projectId),
      A.sb.from('project_team').select('*').eq('project_id', projectId),
      A.sb.from('vendor_bookings').select('*').eq('project_id', projectId)
    ]);
    for (const r of [tasksRes, reqRes, crewRes, vendorRes]) if (r.error) throw r.error;
    return { tasks: tasksRes.data || [], requirements: reqRes.data || [], crew: crewRes.data || [], vendors: vendorRes.data || [] };
  }

  function modal(title, body, actions = '') {
    const n = $('#modal'); if (!n) return;
    n.innerHTML = `<div class="modal-head"><div><div class="eyebrow">EVENT OPERATIONS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-ops3="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-ops3="close">Cancel</button>${actions}</div>`;
    $('#backdrop')?.classList.add('show');
  }

  function eventSelector() {
    const rows = projects().map(p => `<div class="ops3-card" style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b>${esc(p.event_code || 'Event')}</b><p>${esc(p.name || 'Event')} · ${esc(customer(p.customer_id)?.name || 'No client')}</p></div><button class="btn tiny primary" data-ops3="open" data-project="${esc(p.id)}">Open</button></div>`).join('');
    modal('Open Event Operations', rows || '<div class="ops3-empty">No events yet. Create an Event ID first.</div>');
  }

  function taskModal(projectId, functionId = '', existing = null) {
    const fs = functions(projectId), people = team();
    const local = value => { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; const pad = x => String(x).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    modal(existing ? 'Edit operations task' : 'Add operations task', `<div class="ops3-modal-grid">
      <label class="field"><span>Task</span><input id="ops3Title" value="${esc(existing?.title || '')}" placeholder="Confirm venue setup"></label>
      <label class="field"><span>Function</span><select id="ops3Function"><option value="">General event</option>${fs.map(f=>`<option value="${esc(f.id)}" ${f.id === (existing?.function_id || functionId) ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Status</span><select id="ops3Status">${statuses.map(x=>`<option value="${x[0]}" ${x[0] === (existing?.status || 'todo') ? 'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Priority</span><select id="ops3Priority">${priorities.map(x=>`<option value="${x[0]}" ${x[0] === (existing?.priority || 'normal') ? 'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Due</span><input id="ops3Due" type="datetime-local" value="${esc(local(existing?.due_at))}"></label>
      <label class="field"><span>Assign to</span><select id="ops3Member"><option value="">Unassigned</option>${people.map(m=>`<option value="${esc(m.id)}" ${m.id === existing?.team_member_id ? 'selected':''}>${esc(m.name)}${m.role ? ' · '+esc(m.role):''}</option>`).join('')}</select></label>
      <label class="field ops3-full"><span>Notes</span><textarea id="ops3Notes">${esc(existing?.notes || '')}</textarea></label>
    </div>`, `<button class="btn primary" data-ops3="${existing ? 'update-task':'save-task'}" data-project="${esc(projectId)}" ${existing ? `data-id="${esc(existing.id)}"`:''}>${existing ? 'Save changes':'Add task'}</button>`);
  }

  function requirementModal(projectId, functionId) {
    const f = functions(projectId).find(x => x.id === functionId);
    modal('Crew requirement', `<div class="ops3-modal-grid">
      <label class="field"><span>Function</span><select id="ops3ReqFn">${functions(projectId).map(x=>`<option value="${esc(x.id)}" ${x.id===functionId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Role</span><select id="ops3ReqRole">${roles.map(r=>`<option>${esc(r)}</option>`).join('')}</select></label>
      <label class="field"><span>Required people</span><input id="ops3ReqCount" type="number" min="0" value="1"></label>
      <label class="field ops3-full"><span>Notes</span><textarea id="ops3ReqNotes" placeholder="Example: two photographers for the wedding ceremony"></textarea></label>
    </div>`, `<button class="btn primary" data-ops3="save-req" data-project="${esc(projectId)}">Save requirement</button>`);
  }

  function eventSummary(p, data) {
    const { tasks, requirements, crew, vendors } = data;
    const done = tasks.filter(t => t.status === 'done').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const overdue = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.due_at && new Date(t.due_at) < new Date()).length;
    let reqTotal = 0, assignedTotal = 0, gaps = 0;
    requirements.forEach(r => { reqTotal += Number(r.required_count || 0); const assigned = crew.filter(c => c.function_id === r.function_id && roleMatches(r.role, c.team_member_id)).length; assignedTotal += assigned; gaps += Math.max(0, Number(r.required_count || 0) - assigned); });
    return { done, blocked, overdue, reqTotal, assignedTotal, gaps, vendors: vendors.length };
  }

  function roleMatches(role, memberId) {
    const m = team().find(x => x.id === memberId);
    const wanted = String(role || '').toLowerCase();
    const actual = String(m?.role || '').toLowerCase();
    if (!wanted || !actual) return false;
    return actual.includes(wanted.split(' ')[0]) || wanted.includes(actual.split(' ')[0]);
  }

  function render(p, data) {
    state.projectId = p.id;
    const page = $('#page'); if (!page) return;
    const fs = functions(p.id);
    const summary = eventSummary(p, data);
    const visibleTasks = data.tasks.filter(t => state.filter === 'all' || t.status === state.filter);
    const general = visibleTasks.filter(t => !t.function_id);
    const c = customer(p.customer_id);
    page.innerHTML = `<div class="ops3-wrap">
      <div class="page-head"><div><div class="eyebrow">EVENT OPERATIONS CONTROL</div><h1>${esc(p.event_code || 'Event')} · ${esc(p.name || '')}</h1><p>${esc(c?.name || 'No client')} · function-by-function execution, crew readiness and vendor control.</p></div><div class="actions"><button class="btn soft" data-ops3="switch-events">Switch event</button><button class="btn primary" data-ops3="add-task" data-project="${esc(p.id)}">＋ Add task</button></div></div>
      <div class="ops3-grid"><div class="ops3-card"><h3>Task progress</h3><p>${summary.done} of ${data.tasks.length} tasks complete</p><div class="ops3-kpi">${data.tasks.length ? Math.round(summary.done/data.tasks.length*100) : 0}%</div><div class="ops3-progress"><span style="width:${data.tasks.length ? Math.round(summary.done/data.tasks.length*100) : 0}%"></span></div></div><div class="ops3-card"><h3>Crew readiness</h3><p>${summary.assignedTotal} assigned of ${summary.reqTotal} required</p><div class="ops3-kpi">${summary.gaps} gap${summary.gaps===1?'':'s'}</div></div><div class="ops3-card"><h3>Execution alerts</h3><p>${summary.vendors} vendor job${summary.vendors===1?'':'s'} · ${summary.overdue} overdue</p><div class="ops3-kpi">${summary.blocked + summary.overdue}</div></div></div>
      ${summary.gaps || summary.blocked || summary.overdue ? `<div class="ops3-note"><b>Attention:</b> ${summary.gaps ? summary.gaps+' crew gap'+(summary.gaps===1?'':'s')+' · ':''}${summary.blocked ? summary.blocked+' blocked task'+(summary.blocked===1?'':'s')+' · ':''}${summary.overdue ? summary.overdue+' overdue task'+(summary.overdue===1?'':'s'):''}</div>`:''}
      <div class="ops3-actions">${[['all','All'],...statuses].map(x=>`<button class="btn tiny ${state.filter===x[0]?'primary':''}" data-ops3-filter="${x[0]}">${esc(x[1])}</button>`).join('')}<button class="btn tiny" data-ops3="add-req" data-project="${esc(p.id)}">＋ Crew requirement</button><button class="btn tiny" data-ops3="seed" data-project="${esc(p.id)}">⚡ Seed essentials</button></div>
      <section class="ops3-event"><div class="ops3-head"><div><h2>Run sheet</h2><small>Every function gets its own execution checklist.</small></div><div class="ops3-actions"><span class="ops3-pill ${summary.done===data.tasks.length&&data.tasks.length?'good':''}">${summary.done}/${data.tasks.length} done</span></div></div>
      ${fs.map(f=>{
        const rows=visibleTasks.filter(t=>t.function_id===f.id), reqs=data.requirements.filter(r=>r.function_id===f.id);
        const assignedForFn=data.crew.filter(x=>x.function_id===f.id);
        return `<section class="ops3-section"><div class="ops3-fn-head"><div><b>${esc(f.name)}</b><small>${esc(f.event_date_bs || 'Date TBC')}${f.event_date?' · '+esc(f.event_date):''}${f.start_time?' · '+esc(String(f.start_time).slice(0,5)):''} · ${esc(f.venue || 'Venue TBC')}</small></div><div class="ops3-actions"><button class="btn tiny" data-ops3="add-req" data-project="${esc(p.id)}" data-function="${esc(f.id)}">＋ Crew</button><button class="btn tiny" data-ops3="add-task" data-project="${esc(p.id)}" data-function="${esc(f.id)}">＋ Task</button></div></div>${reqs.length ? `<table class="ops3-table"><thead><tr><th>Crew role</th><th>Required</th><th>Assigned</th><th>Gap</th></tr></thead><tbody>${reqs.map(r=>{const count=data.crew.filter(x=>x.function_id===r.function_id && roleMatches(r.role,x.team_member_id)).length,gap=Math.max(0,Number(r.required_count||0)-count);return `<tr><td><b>${esc(r.role)}</b>${r.notes?`<div style="color:#817a72;font-size:11px">${esc(r.notes)}</div>`:''}</td><td>${Number(r.required_count||0)}</td><td>${count}</td><td><span class="ops3-pill ${gap?'bad':'good'}">${gap || 'Ready'}</span></td></tr>`}).join('')}</tbody></table>` : '<div class="ops3-empty">No crew requirements set for this function.</div>'}${rows.length?`<div class="ops3-table-wrap"><table class="ops3-table"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th>Owner</th><th></th></tr></thead><tbody>${rows.map(t=>taskRow(t,data)).join('')}</tbody></table></div>`:'<div class="ops3-empty">No execution tasks yet.</div>'}</section>`;
      }).join('')}
      ${general.length?`<section class="ops3-section"><div class="ops3-fn-head"><div><b>General event tasks</b><small>Not tied to one function.</small></div><button class="btn tiny" data-ops3="add-task" data-project="${esc(p.id)}">＋ Task</button></div><div class="ops3-table-wrap"><table class="ops3-table"><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th>Owner</th><th></th></tr></thead><tbody>${general.map(t=>taskRow(t,data)).join('')}</tbody></table></div></section>`:''}
      </section>
      <section class="ops3-event"><div class="ops3-head"><div><h2>Vendor execution</h2><small>Booked vendor jobs connected to this Event ID.</small></div></div>${data.vendors.length?`<div class="ops3-table-wrap"><table class="ops3-table"><thead><tr><th>Vendor</th><th>Category</th><th>Requirement</th><th>Qty</th><th>Client</th><th>Cost</th><th>Payable</th><th>Status</th></tr></thead><tbody>${data.vendors.map(v=>{const vendor=(A.state.vendors||[]).find(x=>x.id===v.vendor_id);return `<tr><td><b>${esc(vendor?.name||'Vendor')}</b><div style="color:#817a72;font-size:11px">${esc(vendor?.phone||'')}</div></td><td>${esc(v.category||'—')}</td><td>${esc(v.requirement||'—')}</td><td>${esc(v.quantity||1)}</td><td>${money(v.client_price)}</td><td>${money(v.quoted_cost)}</td><td>${money(v.payable)}</td><td><span class="ops3-pill ${['completed','paid'].includes(v.status)?'good':['cancelled','blocked'].includes(v.status)?'bad':'warn'}">${esc(v.status||'reserved')}</span></td></tr>`}).join('')}</tbody></table></div>`:'<div class="ops3-empty">No vendor jobs booked for this event.</div>'}</section>
    </div>`;
  }

  function taskRow(t) {
    const m = team().find(x => x.id === t.team_member_id);
    const labels = Object.fromEntries(statuses), pri = Object.fromEntries(priorities);
    const overdue = t.status !== 'done' && t.status !== 'cancelled' && t.due_at && new Date(t.due_at) < new Date();
    return `<tr><td><b>${esc(t.title)}</b>${t.notes?`<div style="color:#817a72;font-size:11px">${esc(t.notes)}</div>`:''}</td><td><span class="ops3-pill ${t.status==='done'?'good':t.status==='blocked'?'bad':t.status==='in_progress'?'warn':''}">${esc(labels[t.status]||t.status||'To do')}</span></td><td>${esc(pri[t.priority]||t.priority||'Normal')}</td><td class="${overdue?'ops-overdue':''}">${t.due_at?esc(new Date(t.due_at).toLocaleString()):'No due'}</td><td>${esc(m?.name||'Unassigned')}</td><td><div class="ops3-actions"><button class="btn tiny" data-ops3="toggle-task" data-id="${esc(t.id)}" data-project="${esc(t.project_id)}">${t.status==='done'?'Reopen':'Done'}</button><button class="btn tiny" data-ops3="edit-task" data-id="${esc(t.id)}">Edit</button></div></td></tr>`;
  }

  async function seedEssentials(projectId) {
    const fs = functions(projectId);
    const templates = ['Confirm venue and access','Confirm client schedule','Confirm vendor arrival','Confirm crew call time','Final setup / readiness check','Event day final walkthrough'];
    const existing = await A.sb.from('event_operations_tasks').select('title,function_id').eq('project_id', projectId);
    if (existing.error) throw existing.error;
    const rows = existing.data || [];
    const inserts = [];
    for (const f of fs) for (const title of templates) if (!rows.some(x => x.function_id === f.id && x.title === title)) inserts.push({ project_id:projectId, function_id:f.id, title, status:'todo', priority:'normal', due_at:null, team_member_id:null, notes:null });
    if (!inserts.length) { toast('Essential tasks already exist'); return; }
    const { error } = await A.sb.from('event_operations_tasks').insert(inserts);
    if (error) throw error;
    toast(`${inserts.length} essential task${inserts.length===1?'':'s'} added`);
    await open(projectId);
  }

  async function open(projectId) {
    if (!projectId) return eventSelector();
    try { const p = projects().find(x=>x.id===projectId); if(!p) throw new Error('Event not found'); const data=await loadProjectData(projectId); close(); render(p,data); }
    catch(e){ toast(e?.message||'Could not load operations',true); }
  }

  window.addEventListener('click', e => {
    const nav = e.target.closest('[data-ops3-nav]'); if(nav){ e.preventDefault(); e.stopPropagation(); eventSelector(); return; }
    const openButton = e.target.closest('[data-ops3-open]'); if(openButton){ e.preventDefault(); e.stopPropagation(); open(openButton.dataset.project || state.projectId); }
  }, true);

  window.addEventListener('click', e => {
    const action = e.target.closest('[data-ops3]'); if(!action) return;
    const a = action.dataset.ops3;
    if(a==='close'){ e.preventDefault(); e.stopPropagation(); close(); return; }
    (async()=>{
      try{
        if(a==='switch-events') return eventSelector();
        if(a==='open') return open(action.dataset.project);
        if(a==='add-task') return taskModal(action.dataset.project, action.dataset.function || '');
        if(a==='edit-task'){ const id=action.dataset.id; const {data,error}=await A.sb.from('event_operations_tasks').select('*').eq('id',id).maybeSingle(); if(error)throw error; if(data)taskModal(data.project_id,data.function_id||'',data); return; }
        if(a==='save-task' || a==='update-task'){
          const projectId=action.dataset.project;
          const row={function_id:$('#ops3Function').value||null,title:$('#ops3Title').value.trim(),status:$('#ops3Status').value,priority:$('#ops3Priority').value,due_at:$('#ops3Due').value?new Date($('#ops3Due').value).toISOString():null,team_member_id:$('#ops3Member').value||null,notes:$('#ops3Notes').value.trim()||null};
          if(!row.title) throw new Error('Task title is required');
          if(a==='save-task'){ const {error}=await A.sb.from('event_operations_tasks').insert({project_id:projectId,...row}); if(error)throw error; toast('Task added'); }
          else { const {error}=await A.sb.from('event_operations_tasks').update(row).eq('id',action.dataset.id); if(error)throw error; toast('Task updated'); }
          close(); return open(projectId);
        }
        if(a==='toggle-task'){ const id=action.dataset.id; const next=action.textContent.trim()==='Done'?'done':'todo'; const {error}=await A.sb.from('event_operations_tasks').update({status:next}).eq('id',id); if(error)throw error; return open(action.dataset.project); }
        if(a==='remove-task'){ const {error}=await A.sb.from('event_operations_tasks').delete().eq('id',action.dataset.id); if(error)throw error; toast('Task deleted'); return open(action.dataset.project||state.projectId); }
        if(a==='add-req') return requirementModal(action.dataset.project, action.dataset.function || functions(action.dataset.project)[0]?.id || '');
        if(a==='save-req'){
          const projectId=action.dataset.project, functionId=$('#ops3ReqFn').value, role=$('#ops3ReqRole').value, count=Math.max(0,Number($('#ops3ReqCount').value||0));
          if(!functionId) throw new Error('Choose a function first');
          const {error}=await A.sb.from('function_crew_requirements').upsert({project_id:projectId,function_id:functionId,role,required_count:count,notes:$('#ops3ReqNotes').value.trim()||null},{onConflict:'function_id,role'});
          if(error)throw error; close(); toast('Crew requirement saved'); return open(projectId);
        }
        if(a==='seed') return seedEssentials(action.dataset.project);
      }catch(err){ toast(err?.message||'Operation failed',true); }
    })();
  }, true);

  window.addEventListener('click', e => {
    const f=e.target.closest('[data-ops3-filter]'); if(f && state.projectId){ state.filter=f.dataset.ops3Filter; open(state.projectId); }
  }, true);

  function inject(){
    const nav=$('#nav');
    if(nav && !nav.querySelector('[data-ops3-nav]')){
      const g=document.createElement('div'); g.className='nav-group'; g.innerHTML='<div class="nav-label">Operations</div><button class="nav-item" data-ops3-nav><span class="nav-ico">◈</span><span>Event Operations</span></button>'; nav.appendChild(g);
    }
    const page=$('#page');
    const eventHead=page?.querySelector('.event-head');
    if(eventHead && !eventHead.querySelector('[data-ops3-open]')){
      const p=A.state.projects.find(x=>eventHead.textContent.includes(x.event_code||'__none__'));
      if(p){ const b=document.createElement('button'); b.className='btn soft'; b.dataset.ops3Open=''; b.dataset.project=p.id; b.textContent='◈ Event Operations'; const host=eventHead.querySelector('.event-actions')||eventHead; host.appendChild(b); }
    }
  }
  const observer=new MutationObserver(inject); observer.observe(document.body,{childList:true,subtree:true}); setTimeout(inject,250);
  window.RachnaOperationsV3={open,inject};
})();
