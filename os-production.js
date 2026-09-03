(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || new URLSearchParams(location.search).has('portal')) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => `NPR ${Number(n || 0).toLocaleString('en-IN')}`);
  const CATEGORIES = ['Photographer','Videographer','Cinematographer','Gadget rental','Manpower','Photo editing','Video editing','Album','Pen drive','Photo frame','Drone','Transport','Other'];

  function recalcPreview(projectId) {
    const p = (A.state.projects || []).find(x => x.id === projectId);
    if (!p) return;
    const costs = (A.state.productionCosts || []).filter(x => x.project_id === projectId);
    const total = costs.reduce((sum, x) => sum + Number(x.quantity || 0) * Number(x.unit_cost || 0), 0);
    const quoted = Number(p.quoted_total || 0);
    const baseCost = Math.max(0, Number(p.internal_cost || 0) - total);
    const profit = quoted - baseCost - total;
    $('#apQuoted') && ($('#apQuoted').textContent = money(quoted));
    $('#apProduction') && ($('#apProduction').textContent = money(total));
    $('#apProfit') && ($('#apProfit').textContent = money(profit));
  }

  function renderList(projectId) {
    const rows = (A.state.productionCosts || []).filter(x => x.project_id === projectId).sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const box = $('#apCostList');
    if (!box) return;
    box.innerHTML = rows.length ? rows.map(x => `<div class="mini-row" style="align-items:flex-start"><div style="flex:1"><b>${esc(x.category)} · ${esc(x.description)}</b><small>${esc(x.function_id ? ((A.state.functions||[]).find(f=>f.id===x.function_id)?.name || 'Function') : 'Event-wide')} · ${esc(String(x.quantity))} × ${money(x.unit_cost)}</small></div><strong>${money(Number(x.quantity||0)*Number(x.unit_cost||0))}</strong><button class="btn tiny" data-ap-delete="${x.id}">Delete</button></div>`).join('') : '<div class="empty"><b>No production costs recorded</b><span>Add photographer, videographer, gadget, manpower and post-production costs for this Event ID.</span></div>';
  }

  function updateFunctions(projectId) {
    const fns = (A.state.functions || []).filter(f => f.project_id === projectId);
    const sel = $('#apFunction');
    if (!sel) return;
    sel.innerHTML = '<option value="">Event-wide</option>' + fns.map(f => `<option value="${esc(f.id)}">${esc(f.name)}${f.event_date_bs ? ' · ' + esc(f.event_date_bs) : ''}</option>`).join('');
  }

  async function refreshProduction(projectId) {
    await A.refresh();
    updateFunctions(projectId);
    renderList(projectId);
    recalcPreview(projectId);
  }

  function open() {
    if (!A.state?.user) return;
    const projects = A.state.projects || [];
    if (!projects.length) {
      const m = $('#modal'), b = $('#backdrop');
      if (!m || !b) return;
      m.innerHTML = '<div class="modal-head"><div><div class="eyebrow">AAVARTAN PRODUCTION</div><h2>Production costing</h2></div><button class="close-btn" data-ap-close>×</button></div><div class="modal-body"><div class="empty"><b>No Event IDs yet</b><span>Create an event first, then record production costs against it.</span></div></div><div class="modal-foot"><button class="btn" data-ap-close>Close</button></div>';
      b.classList.add('show');
      return;
    }
    const m = $('#modal'), b = $('#backdrop');
    if (!m || !b) return;
    const current = projects[0];
    m.innerHTML = `<div class="modal-head"><div><div class="eyebrow">AAVARTAN PRODUCTION</div><h2>Production costing</h2><p style="margin:4px 0 0;color:#6a646d">Keep every real production cost attached to the same Event ID.</p></div><button class="close-btn" data-ap-close>×</button></div><div class="modal-body"><div class="form-grid"><label class="field full"><span>Event ID</span><select id="apProject">${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.event_code || 'Event')} · ${esc(p.name)}</option>`).join('')}</select></label><label class="field full"><span>Function</span><select id="apFunction"><option value="">Event-wide</option></select></label><label class="field"><span>Cost category</span><select id="apCategory">${CATEGORIES.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label><label class="field"><span>Quantity</span><input id="apQty" type="number" min="0" step="0.01" value="1"></label><label class="field"><span>Unit cost (NPR)</span><input id="apUnit" type="number" min="0" step="1" value="0"></label><label class="field full"><span>Description</span><input id="apDescription" value="" placeholder="Example: 2 photographers for wedding day"></label><label class="field full"><span>Notes</span><textarea id="apNotes" placeholder="Vendor, freelancer, gadget model, edit scope, etc."></textarea></label></div><div class="summary-bar" style="margin-top:16px"><span><b id="apQuoted">NPR 0</b><small>Quoted</small></span><span><b id="apProduction">NPR 0</b><small>Production costs</small></span><span><b id="apProfit">NPR 0</b><small>Current profit</small></span></div><div class="panel" style="margin-top:16px"><div class="panel-title"><div><div class="eyebrow">EVENT COST LEDGER</div><h3 style="margin:4px 0">Recorded production costs</h3></div><button class="btn tiny" id="apRefresh">Refresh</button></div><div id="apCostList"></div></div></div><div class="modal-foot"><button class="btn" data-ap-close>Close</button><button class="btn primary" id="apAdd">＋ Add production cost</button></div>`;
    b.classList.add('show');
    const close = () => b.classList.remove('show');
    document.querySelectorAll('[data-ap-close]').forEach(x => x.onclick = close);
    const projectSelect = $('#apProject');
    const load = async () => refreshProduction(projectSelect.value).catch(e => window.alert(e.message || 'Could not refresh production costs'));
    projectSelect.onchange = load;
    $('#apRefresh').onclick = load;
    $('#apAdd').onclick = async () => {
      const projectId = projectSelect.value;
      const qty = Number($('#apQty').value || 0);
      const unit = Number($('#apUnit').value || 0);
      const category = $('#apCategory').value;
      const description = String($('#apDescription').value || '').trim() || category;
      if (!(qty > 0)) return window.alert('Quantity must be greater than zero.');
      if (!(unit >= 0)) return window.alert('Unit cost cannot be negative.');
      const button = $('#apAdd'); button.disabled = true; button.textContent = 'Saving…';
      try {
        await A.addProductionCost({ project_id: projectId, function_id: $('#apFunction').value || null, brand: 'Aavartan', category, description, quantity: qty, unit_cost: unit, notes: $('#apNotes').value || null });
        $('#apDescription').value = ''; $('#apNotes').value = ''; $('#apQty').value = '1'; $('#apUnit').value = '0';
        await refreshProduction(projectId);
      } catch (e) { window.alert(e.message || 'Could not save production cost'); }
      button.disabled = false; button.textContent = '＋ Add production cost';
    };
    $('#apCostList').addEventListener('click', async ev => {
      const del = ev.target.closest('[data-ap-delete]');
      if (!del) return;
      if (!window.confirm('Delete this production cost?')) return;
      try { await A.remove('production_costs', del.dataset.apDelete); await refreshProduction(projectSelect.value); } catch (e) { window.alert(e.message || 'Could not delete production cost'); }
    });
    load();
  }

  function ensureButton() {
    if (!A.state?.user) return false;
    const top = $('.topbar');
    if (!top || $('#aavartanProductionAction')) return !!$('#aavartanProductionAction');
    const delivery = top.querySelector('[data-route="deliverables"]');
    const b = document.createElement('button');
    b.id = 'aavartanProductionAction'; b.className = 'top-action'; b.textContent = '▧ Aavartan Costing'; b.onclick = open;
    (delivery || top.querySelector('.quick') || top.lastElementChild)?.before(b);
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => { tries += 1; if (ensureButton() || tries >= 40) clearInterval(timer); }, 500);
  window.addEventListener('focus', ensureButton);
})();
