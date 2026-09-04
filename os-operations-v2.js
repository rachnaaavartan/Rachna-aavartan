(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => 'NPR ' + Number(n || 0).toLocaleString('en-IN', {maximumFractionDigits:0}));
  const state = { projectId: null, filter: 'all' };
  const statuses = [['todo','To do'],['in_progress','In progress'],['done','Done'],['blocked','Blocked'],['cancelled','Cancelled']];
  const priorities = [['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']];
  const toast = (m, error=false) => { const n=$('#toast'); if(!n)return; n.textContent=m; n.className='toast show'+(error?' error':''); clearTimeout(window.__opsToast); window.__opsToast=setTimeout(()=>n.className='toast',3000); };
  const close = () => $('#backdrop')?.classList.remove('show');
  const project = id => A.state.projects.find(p => p.id === id);
  const functionsFor = id => A.state.functions.filter(f => f.project_id === id);
  const members = () => A.state.team.filter(t => t.active !== false);
  const customers = id => A.state.customers.find(c => c.id === id);

  const css = document.createElement('style');
  css.textContent = `
    .ops-wrap{display:grid;gap:18px}.ops-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.ops-kpi{background:#fff;border:1px solid #e1ddd5;border-radius:15px;padding:15px}.ops-kpi span{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#817b73}.ops-kpi strong{display:block;font-size:23px;margin-top:5px}.ops-kpi em{font-size:12px;font-style:normal;color:#8a847c}.ops-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.ops-filters{display:flex;gap:8px;flex-wrap:wrap}.ops-event{border:1px solid #e1ddd5;background:#fff;border-radius:16px;overflow:hidden}.ops-event-head{display:flex;justify-content:space-between;gap:16px;padding:16px 18px;background:#faf8f4;border-bottom:1px solid #e5e0d8}.ops-event-head h3{margin:0;font-size:17px}.ops-event-head p{margin:5px 0 0;color:#7b766f;font-size:12px}.ops-event-body{padding:16px 18px}.ops-function{border:1px solid #ebe6df;border-radius:13px;margin-bottom:12px;overflow:hidden}.ops-function:last-child{margin-bottom:0}.ops-function-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;background:#fbfaf7}.ops-function-head b{font-size:14px}.ops-function-head small{display:block;color:#857f77;margin-top:3px}.ops-task{display:grid;grid-template-columns:24px minmax(200px,1fr) 130px 100px 160px 100px;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid #eee9e2;font-size:13px}.ops-task-title small{display:block;color:#8b857d;font-size:11px;margin-top:3px}.ops-status{font-size:11px;padding:4px 8px;border-radius:999px;background:#f0ede7;display:inline-block}.ops-status.done{background:#e9f3ec;color:#28724e}.ops-status.blocked{background:#faecea;color:#9a4037}.ops-priority{font-size:11px}.ops-priority.urgent,.ops-priority.high{font-weight:700;color:#9b4a2c}.ops-due{color:#6f6961;font-size:12px}.ops-overdue{color:#9a4037;font-weight:700}.ops-empty{padding:20px;color:#7c766e;text-align:center}.ops-note{padding:12px 14px;border:1px solid #eadfbd;background:#fffaf0;border-radius:12px;color:#665a3c;font-size:12px}.ops-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ops-full{grid-column:1/-1}.ops-action-row{display:flex;gap:8px;flex-wrap:wrap}.ops-project-list{display:grid;gap:8px}.ops-project-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #e5e0d8;border-radius:11px}.ops-project-row small{display:block;color:#8a847c;margin-top:3px}
    @media(max-width:1050px){.ops-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.ops-task{grid-template-columns:24px minmax(220px,1fr) 110px 90px 130px 90px;min-width:780px}.ops-task-scroll{overflow:auto}}
    @media(max-width:700px){.ops-kpis{grid-template-columns:1fr 1fr}.ops-event-head{flex-direction:column}.ops-modal-grid{grid-template-columns:1fr}.ops-full{grid-column:auto}}
  `;
  document.head.appendChild(css);

  function modal(title, body, actions='') {
    const n=$('#modal'); if(!n)return;
    n.innerHTML=`<div class="modal-head"><div><div class="eyebrow">EVENT OPERATIONS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-ops-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-ops-action="close">Cancel</button>${actions}</div>`;
    $('#backdrop')?.classList.add('show');
  }

  async function loadTasks(projectId){
    const {data,error}=await A.sb.from('event_operations_tasks').select('*').eq('project_id',projectId).order('due_at',{ascending:true,nullsFirst:false});
    if(error) throw error;
    return data || [];
  }

  function taskLabelStatus(v){ return statuses.find(x=>x[0]===v)?.[1] || v || 'To do'; }
  function taskLabelPriority(v){ return priorities.find(x=>x[0]===v)?.[1] || v || 'Normal'; }
  function dueLabel(v){ if(!v)return 'No due time'; const d=new Date(v); return Number.isNaN(d.getTime())?'No due time':d.toLocaleString(); }
  function isOverdue(t){ return t.status!=='done' && t.status!=='cancelled' && t.due_at && new Date(t.due_at).getTime() < Date.now(); }

  function addTaskModal(projectId, functionId=''){
    const fs=functionsFor(projectId), people=members();
    modal('Add operations task', `<div class="ops-modal-grid">
      <label class="field"><span>Task</span><input id="opsTitle" placeholder="Confirm mandap setup"></label>
      <label class="field"><span>Function</span><select id="opsFunction"><option value="">General event task</option>${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===functionId?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Status</span><select id="opsStatus">${statuses.map(s=>`<option value="${s[0]}" ${s[0]==='todo'?'selected':''}>${esc(s[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Priority</span><select id="opsPriority">${priorities.map(s=>`<option value="${s[0]}" ${s[0]==='normal'?'selected':''}>${esc(s[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Due</span><input id="opsDue" type="datetime-local"></label>
      <label class="field"><span>Assign to</span><select id="opsMember"><option value="">Unassigned</option>${people.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}${m.role?' · '+esc(m.role):''}</option>`).join('')}</select></label>
      <label class="field ops-full"><span>Notes</span><textarea id="opsNotes" placeholder="Details, contact, setup instruction or dependency"></textarea></label>
    </div>`, `<button class="btn primary" data-ops-action="save-task" data-project="${esc(projectId)}">Add task</button>`);
  }

  function renderProjectSelector(){
    const ps=A.state.projects;
    modal('Open Event Operations', `<div class="ops-project-list">${ps.length?ps.map(p=>{const c=customers(p.customer_id);return `<div class="ops-project-row"><div><b>${esc(p.event_code||'Event')}</b><small>${esc(p.name)} · ${esc(c?.name||'No client')}</small></div><button class="btn tiny" data-ops-action="open-project" data-project="${esc(p.id)}">Open</button></div>`}).join(''):'<div class="ops-empty">No events yet.</div>'}</div>`);
  }

  function renderOperations(projectId, tasks){
    const page=$('#page'), p=project(projectId); if(!page||!p)return;
    const fs=functionsFor(projectId);
    const eventTasks=tasks.filter(t=>state.filter==='all'||t.status===state.filter);
    const total=tasks.length, done=tasks.filter(t=>t.status==='done').length, blocked=tasks.filter(t=>t.status==='blocked').length, overdue=tasks.filter(isOverdue).length, unassigned=tasks.filter(t=>!t.team_member_id && t.status!=='done' && t.status!=='cancelled').length;
    const c=customers(p.customer_id);
    const general=eventTasks.filter(t=>!t.function_id);
    page.innerHTML=`<div class="ops-wrap">
      <div class="page-head"><div><div class="eyebrow">EVENT OPERATIONS</div><h1>${esc(p.event_code||'Event')} · ${esc(p.name)}</h1><p>${esc(c?.name||'No client')} · function-by-function event-day control.</p></div><div class="actions"><button class="btn soft" data-ops-action="open-events">Switch event</button><button class="btn primary" data-ops-action="add-task" data-project="${esc(projectId)}">＋ Add task</button></div></div>
      <div class="ops-kpis"><div class="ops-kpi"><span>Total tasks</span><strong>${total}</strong><em>event operations</em></div><div class="ops-kpi"><span>Done</span><strong>${done}</strong><em>${total?Math.round(done/total*100):0}% complete</em></div><div class="ops-kpi"><span>Blocked</span><strong>${blocked}</strong><em>needs attention</em></div><div class="ops-kpi"><span>Overdue</span><strong>${overdue}</strong><em>past due and open</em></div><div class="ops-kpi"><span>Unassigned</span><strong>${unassigned}</strong><em>no crew owner</em></div></div>
      <div class="ops-toolbar"><div class="ops-filters">${[['all','All'],...statuses].map(s=>`<button class="btn tiny ${state.filter===s[0]?'primary':''}" data-ops-filter="${s[0]}">${esc(s[1])}</button>`).join('')}</div><div class="fin-note">Execution checklist stays separate from quotation/services.</div></div>
      ${blocked||overdue||unassigned?`<div class="ops-note"><b>Attention:</b> ${blocked?blocked+' blocked · ':''}${overdue?overdue+' overdue · ':''}${unassigned?unassigned+' unassigned':''}</div>`:''}
      <section class="ops-event"><div class="ops-event-body">
        ${fs.map(f=>{
          const rows=eventTasks.filter(t=>t.function_id===f.id);
          return `<section class="ops-function"><div class="ops-function-head"><div><b>${esc(f.name)}</b><small>${esc(f.event_date_bs||'Date TBC')}${f.event_date?' · '+esc(f.event_date):''}${f.start_time?' · '+esc(String(f.start_time).slice(0,5)):''} · ${esc(f.venue||'Venue TBC')}</small></div><button class="btn tiny" data-ops-action="add-task" data-project="${esc(projectId)}" data-function="${esc(f.id)}">＋ Task</button></div>${rows.length?`<div class="ops-task-scroll"><div class="ops-task" style="border-top:0;background:#faf9f7;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#817b73"><span></span><span>Task</span><span>Status</span><span>Priority</span><span>Due / Owner</span><span></span></div>${rows.map(taskRow).join('')}</div>`:'<div class="ops-empty">No tasks for this function yet.</div>'}</section>`;
        }).join('')}
        ${general.length?`<section class="ops-function"><div class="ops-function-head"><div><b>General Event Tasks</b><small>Not tied to one function</small></div><button class="btn tiny" data-ops-action="add-task" data-project="${esc(projectId)}">＋ Task</button></div><div class="ops-task-scroll"><div class="ops-task" style="border-top:0;background:#faf9f7;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#817b73"><span></span><span>Task</span><span>Status</span><span>Priority</span><span>Due / Owner</span><span></span></div>${general.map(taskRow).join('')}</div></section>`:''}
        ${!fs.length&&!general.length?`<div class="ops-empty"><b>No functions yet</b><div>Add an event function first, then build its execution checklist.</div></div>`:''}
      </div></section>
    </div>`;
  }

  function taskRow(t){
    const m=A.state.team.find(x=>x.id===t.team_member_id);
    return `<div class="ops-task"><input type="checkbox" data-ops-complete="${esc(t.id)}" ${t.status==='done'?'checked':''}><div class="ops-task-title"><b>${esc(t.title)}</b>${t.notes?`<small>${esc(t.notes)}</small>`:''}</div><span class="ops-status ${esc(t.status||'todo')}">${esc(taskLabelStatus(t.status))}</span><span class="ops-priority ${esc(t.priority||'normal')}">${esc(taskLabelPriority(t.priority))}</span><span class="ops-due ${isOverdue(t)?'ops-overdue':''}">${esc(dueLabel(t.due_at))}${m?' · '+esc(m.name):' · Unassigned'}</span><div class="ops-action-row"><button class="btn tiny" data-ops-action="edit-task" data-id="${esc(t.id)}">Edit</button><button class="btn tiny" data-ops-action="remove-task" data-id="${esc(t.id)}" data-project="${esc(t.project_id)}">Delete</button></div></div>`;
  }

  function editTaskModal(projectId, task){
    const fs=functionsFor(projectId), people=members();
    const toLocal = v => { if(!v)return ''; const d=new Date(v); if(Number.isNaN(d.getTime()))return ''; const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    modal('Edit operations task', `<div class="ops-modal-grid">
      <label class="field"><span>Task</span><input id="opsTitle" value="${esc(task.title)}"></label>
      <label class="field"><span>Function</span><select id="opsFunction"><option value="">General event task</option>${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===task.function_id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Status</span><select id="opsStatus">${statuses.map(s=>`<option value="${s[0]}" ${s[0]===task.status?'selected':''}>${esc(s[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Priority</span><select id="opsPriority">${priorities.map(s=>`<option value="${s[0]}" ${s[0]===task.priority?'selected':''}>${esc(s[1])}</option>`).join('')}</select></label>
      <label class="field"><span>Due</span><input id="opsDue" type="datetime-local" value="${esc(toLocal(task.due_at))}"></label>
      <label class="field"><span>Assign to</span><select id="opsMember"><option value="">Unassigned</option>${people.map(m=>`<option value="${esc(m.id)}" ${m.id===task.team_member_id?'selected':''}>${esc(m.name)}${m.role?' · '+esc(m.role):''}</option>`).join('')}</select></label>
      <label class="field ops-full"><span>Notes</span><textarea id="opsNotes">${esc(task.notes||'')}</textarea></label>
    </div>`, `<button class="btn primary" data-ops-action="update-task" data-id="${esc(task.id)}" data-project="${esc(projectId)}">Save changes</button>`);
  }

  async function open(projectId){
    try { state.projectId=projectId; const tasks=await loadTasks(projectId); renderOperations(projectId,tasks); }
    catch(e){ toast(e?.message||'Could not load operations',true); }
  }

  document.addEventListener('click', e => {
    const route=e.target.closest('[data-route="events"]');
    if(route){ return; }
    const openOps=e.target.closest('[data-ops-open]');
    if(openOps){ e.preventDefault(); e.stopImmediatePropagation(); const id=openOps.dataset.project; id?open(id):renderProjectSelector(); }
  }, true);

  document.addEventListener('click', e => {
    const a=e.target.closest('[data-ops-action]'); if(!a)return;
    e.preventDefault(); e.stopImmediatePropagation();
    (async()=>{
      try{
        const action=a.dataset.opsAction;
        if(action==='close') return close();
        if(action==='open-events') return renderProjectSelector();
        if(action==='open-project'){ close(); return open(a.dataset.project); }
        if(action==='add-task'){ return addTaskModal(a.dataset.project,a.dataset.function||''); }
        if(action==='save-task'){
          const due=$('#opsDue').value ? new Date($('#opsDue').value).toISOString() : null;
          await A.sb.from('event_operations_tasks').insert({project_id:a.dataset.project,function_id:$('#opsFunction').value||null,title:$('#opsTitle').value.trim(),status:$('#opsStatus').value,priority:$('#opsPriority').value,due_at:due,team_member_id:$('#opsMember').value||null,notes:$('#opsNotes').value.trim()||null}).throwOnError();
          close(); toast('Operations task added'); return open(a.dataset.project);
        }
        if(action==='edit-task'){
          const all=await loadTasks(state.projectId); const t=all.find(x=>x.id===a.dataset.id); if(t) editTaskModal(state.projectId,t); return;
        }
        if(action==='update-task'){
          const due=$('#opsDue').value ? new Date($('#opsDue').value).toISOString() : null;
          await A.sb.from('event_operations_tasks').update({function_id:$('#opsFunction').value||null,title:$('#opsTitle').value.trim(),status:$('#opsStatus').value,priority:$('#opsPriority').value,due_at:due,team_member_id:$('#opsMember').value||null,notes:$('#opsNotes').value.trim()||null}).eq('id',a.dataset.id).throwOnError();
          close(); toast('Operations task updated'); return open(a.dataset.project);
        }
        if(action==='remove-task'){
          if(!confirm('Delete this operations task?')) return;
          await A.sb.from('event_operations_tasks').delete().eq('id',a.dataset.id).throwOnError(); toast('Task deleted'); return open(a.dataset.project||state.projectId);
        }
      }catch(err){ toast(err?.message||'Operation failed',true); }
    })();
  }, true);

  document.addEventListener('click', e => {
    const f=e.target.closest('[data-ops-filter]'); if(!f||!state.projectId)return;
    state.filter=f.dataset.opsFilter; open(state.projectId);
  }, true);
  document.addEventListener('change', e => {
    const cb=e.target.closest('[data-ops-complete]'); if(!cb)return;
    (async()=>{ try { await A.sb.from('event_operations_tasks').update({status:cb.checked?'done':'todo'}).eq('id',cb.dataset.opsComplete).throwOnError(); toast(cb.checked?'Task completed':'Task reopened'); await open(state.projectId); } catch(err){ toast(err?.message||'Could not update task',true); } })();
  }, true);

  function injectButtons(){
    const page=$('#page'); if(!page)return;
    const eventHead=page.querySelector('.event-head');
    if(eventHead && !page.querySelector('[data-ops-open]')){
      const wrap=document.createElement('div'); wrap.className='actions'; const projectId=A.state.projects.find(p=>eventHead.textContent.includes(p.event_code||'__never__'))?.id;
      if(projectId){ wrap.innerHTML=`<button class="btn soft" data-ops-open data-project="${esc(projectId)}">◫ Event Operations</button>`; eventHead.appendChild(wrap); }
    }
    const nav=$('#nav'); if(nav && !nav.querySelector('[data-ops-open]')){
      const group=document.createElement('div'); group.className='nav-group'; group.innerHTML=`<div class="nav-label">Operations</div><button class="nav-item" data-ops-open><span class="nav-ico">◈</span><span>Event Operations</span></button>`; nav.appendChild(group);
    }
  }
  new MutationObserver(injectButtons).observe(document.body,{childList:true,subtree:true});
  setTimeout(injectButtons,300);
})();
