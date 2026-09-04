(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));
  const money = A.money || (n => `NPR ${Number(n || 0).toLocaleString('en-IN')}`);

  const style = document.createElement('style');
  style.textContent = `
    .ux-scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .ux-scope-card{border:1px solid #ddd8cf;border-radius:16px;padding:18px;background:#fff}
    .ux-scope-card h3{margin:0 0 6px;font-size:17px}
    .ux-scope-card p{margin:0 0 14px;color:#6f6b66;font-size:13px;line-height:1.45}
    .ux-brand-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .ux-toggle{position:relative;width:48px;height:28px;flex:0 0 auto}
    .ux-toggle input{opacity:0;width:0;height:0}
    .ux-toggle span{position:absolute;inset:0;border-radius:999px;background:#d8d4cd;cursor:pointer;transition:.15s}
    .ux-toggle span:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.15s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
    .ux-toggle input:checked+span{background:#25232a}
    .ux-toggle input:checked+span:before{transform:translateX(20px)}
    .ux-service-list{display:grid;gap:8px}
    .ux-service-choice{display:flex;align-items:center;gap:10px;border:1px solid #e5e0d8;border-radius:11px;padding:10px 12px;background:#faf9f7}
    .ux-service-choice input{width:17px;height:17px}
    .ux-service-choice b{font-size:13px}
    .ux-service-choice small{display:block;color:#88827a;margin-top:2px}
    .ux-muted{color:#8a847c;font-size:12px}
    .ux-empty-scope{padding:16px;border:1px dashed #d7d1c8;border-radius:12px;color:#79736b;text-align:center;background:#faf9f7}
    .ux-warning{padding:11px 12px;background:#fbf7ed;border:1px solid #eadfbe;border-radius:11px;color:#665b3e;font-size:12px;margin-top:12px}
    .ux-amount-table{display:grid;gap:9px}
    .ux-amount-row{display:grid;grid-template-columns:minmax(0,1fr) 150px 150px;gap:8px;align-items:center;border:1px solid #e5e0d8;border-radius:11px;padding:9px 10px;background:#faf9f7}
    .ux-amount-row b{font-size:13px}.ux-amount-row small{display:block;color:#88827a}
    .ux-amount-row input{width:100%;box-sizing:border-box}
    .ux-modal-note{padding:12px 14px;border-radius:12px;background:#f5f3ef;color:#625e58;font-size:12px;line-height:1.45;margin-bottom:14px}
    @media(max-width:760px){.ux-scope-grid{grid-template-columns:1fr}.ux-amount-row{grid-template-columns:1fr 1fr}.ux-amount-row>div{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  function close(){ $('#backdrop')?.classList.remove('show'); }
  function showModal(title, body, actions){
    const n = $('#modal');
    if (!n) return;
    n.innerHTML = `<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-ux-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-ux-action="close">Cancel</button>${actions || ''}</div>`;
    $('#backdrop')?.classList.add('show');
  }
  function toast(message, error = false){
    const n = $('#toast'); if (!n) return;
    n.textContent = message; n.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(window.__rachnaUxToast);
    window.__rachnaUxToast = setTimeout(() => n.className = 'toast', 3000);
  }
  const projectOf = id => A.state.projects.find(p => p.id === id);
  const functionsOf = id => A.state.functions.filter(f => f.project_id === id);
  const servicesOf = id => A.state.projectServices.filter(s => s.project_id === id);
  const rachnaServices = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'rachna' && s.active !== false);
  const aavartanServices = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'aavartan' && s.active !== false);

  function openNewEvent(){
    showModal('Create Event ID', `
      <div class="ux-modal-note"><b>Only create the event first.</b> Services are optional and can be added afterward. A decoration-only client does not need any photography selection.</div>
      <div class="form-grid">
        <label class="field"><span>Customer name</span><input id="uxPcustomer" type="text"></label>
        <label class="field"><span>Phone / WhatsApp</span><input id="uxPphone" type="text" inputmode="tel"></label>
        <label class="field"><span>Event / wedding name</span><input id="uxPname" type="text"></label>
        <label class="field"><span>BS date range</span><input id="uxPdate" type="text" placeholder="2083-08-25 → 2083-08-27"></label>
        <label class="field"><span>First function</span><input id="uxPfunction" type="text" value="Wedding"></label>
        <label class="field"><span>Venue</span><input id="uxPvenue" type="text"></label>
        <label class="field"><span>Guests</span><input id="uxPguests" type="number" min="0"></label>
      </div>`,
      '<button class="btn primary" data-ux-action="create-event">Create Event ID</button>'
    );
  }

  function renderScopeIntoPage(projectId){
    const page = $('#page'); if (!page) return;
    const p = projectOf(projectId); if (!p) return;
    const sv = servicesOf(projectId);
    const aavCore = sv.find(s => String(s.name || '').toLowerCase().includes('aavartan photo + video'));
    const rachna = rachnaServices();
    const coreId = aavCore?.service_id || aavartanServices().find(s => s.name === 'Aavartan Photo + Video')?.id || '';
    const addons = ['Candid coverage','Cinematic coverage','Drone','Premium Karizma album','Social media reels','Additional photographer','Additional videographer','Pre-wedding','Post-wedding','Additional album','Photo frame'];
    const isRachna = sv.some(s => String(s.brand).toLowerCase() === 'rachna');
    const isAav = !!aavCore || sv.some(s => String(s.brand).toLowerCase() === 'aavartan');
    const currentNames = new Set(sv.map(s => s.name));
    const pagePanel = $$('.panel', page).find(x => x.querySelector('.service-builder') || x.querySelector('[data-action="save-services"]'));
    if (!pagePanel) return;
    pagePanel.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">SERVICE SCOPE</div><h2>Choose only what this client booked</h2><p>No service is selected by default. Rachna and Aavartan are completely independent.</p></div><button class="btn primary" data-ux-action="save-scope" data-project="${projectId}">Save scope</button></div>
      <div class="ux-scope-grid">
        <section class="ux-scope-card">
          <div class="ux-brand-title"><div><h3>Rachna · Decoration &amp; Event Services</h3><p>Tick the Rachna services the client actually booked.</p></div></div>
          <div class="ux-service-list">
            ${rachna.map(s => `<label class="ux-service-choice"><input type="checkbox" data-ux-rachna data-service-id="${esc(s.id)}" data-name="${esc(s.name)}" ${currentNames.has(s.name) ? 'checked' : ''}><span><b>${esc(s.name)}</b><small>${esc(s.category || 'Rachna service')}</small></span></label>`).join('') || '<div class="ux-empty-scope">No Rachna services are configured yet.</div>'}
          </div>
        </section>
        <section class="ux-scope-card">
          <div class="ux-brand-title"><div><h3>Aavartan · Photography + Video</h3><p>Turn this on only when the client also books photography/video.</p></div><label class="ux-toggle"><input id="uxAavToggle" type="checkbox" ${isAav ? 'checked' : ''}><span></span></label></div>
          <div id="uxAavBody" ${isAav ? '' : 'style="display:none"'}>
            <label class="field"><span>Photography / Video package</span><select id="uxAavPackage">
              ${[['Essential Package','1 photographer + 1 videographer'],['Signature Package','2 photographers + 2 videographers'],['Legacy Package','3 photographers + 2 cinematographers'],['2-Day Story','Multi-day coverage'],['3-Day Story','Multi-day coverage'],['Multi-day / Custom','Custom coverage']].map(([n,d]) => `<option value="${esc(n)}" ${aavCore?.name?.includes(n) ? 'selected' : ''}>${esc(n)} · ${esc(d)}</option>`).join('')}
            </select></label>
            <div class="ux-muted" style="margin:4px 0 8px">Optional add-ons</div>
            <div class="ux-service-list">
              ${addons.map(n => `<label class="ux-service-choice"><input type="checkbox" data-ux-addon data-name="${esc(n)}" ${sv.some(v => v.name === n || String(v.name || '').startsWith(n + ' —')) ? 'checked' : ''}><span><b>${esc(n)}</b></span></label>`).join('')}
            </div>
          </div>
          <div class="ux-warning">Decoration-only example: leave Aavartan OFF. No photography package is required to save the event scope.</div>
        </section>
      </div>`;
    $('#uxAavToggle')?.addEventListener('change', e => { $('#uxAavBody').style.display = e.target.checked ? '' : 'none'; });
  }

  function openAmountStep(projectId, selected){
    if (!selected.length){
      showModal('No services selected', '<div class="ux-modal-note">This is valid. You can save the Event ID with no service scope and add services later.</div>', `<button class="btn primary" data-ux-action="save-empty-scope" data-project="${projectId}">Save empty scope</button>`);
      return;
    }
    const rows = selected.map((s,i) => `<div class="ux-amount-row"><div><b>${esc(s.name)}</b><small>${esc(s.brand || '')}</small></div><input id="uxPrice_${i}" type="number" min="0" placeholder="Customer price" value="${Number(s.customer_price || 0)}"><input id="uxCost_${i}" type="number" min="0" placeholder="Internal cost" value="${Number(s.internal_cost || 0)}"></div>`).join('');
    window.__rachnaUxDraft = selected;
    showModal('Enter agreed amounts', `<div class="ux-modal-note">Enter the price actually agreed with the client and your internal cost. These numbers roll into the Event ID financials.</div><div class="ux-amount-table"><div class="ux-amount-row" style="border:0;background:transparent;padding:0 10px"><b>Service</b><b>Client price</b><b>Internal cost</b></div>${rows}</div>`, `<button class="btn primary" data-ux-action="commit-scope" data-project="${projectId}">Save scope</button>`);
  }

  async function saveScope(projectId, selected){
    try {
      await A.saveProjectServiceScope(projectId, selected);
      close();
      toast(selected.length ? 'Service scope saved' : 'Event has no service scope');
      window.location.hash = '';
      if (typeof A.refresh === 'function') await A.refresh();
      document.dispatchEvent(new CustomEvent('rachna-ux-refresh'));
      const p = projectOf(projectId);
      if (p) renderScopeIntoPage(projectId);
    } catch (e) {
      toast(e?.message || 'Could not save service scope', true);
    }
  }

  document.addEventListener('click', e => {
    const ux = e.target.closest('[data-ux-action]');
    if (ux){
      e.preventDefault();
      e.stopImmediatePropagation();
      const action = ux.dataset.uxAction;
      (async () => {
        try {
          if (action === 'close') return close();
          if (action === 'create-event') {
            let customer = null;
            const name = $('#uxPcustomer').value.trim();
            if (name) customer = await A.createCustomer({name, phone: $('#uxPphone').value});
            const p = await A.insertProject({customer_id: customer?.id || null, name: $('#uxPname').value, date_range_bs: $('#uxPdate').value, function_name: $('#uxPfunction').value || 'Wedding', event_date_bs: $('#uxPdate').value.split(/\s|→/)[0], venue: $('#uxPvenue').value, guest_count: $('#uxPguests').value, brand: 'Rachna'});
            close(); toast(`Event created · ${p.event_code || 'Event ID assigned'}`);
            document.querySelector(`[data-action="open-project"][data-id="${p.id}"]`);
            if (typeof window.__rachnaUxOpenProject === 'function') window.__rachnaUxOpenProject(p.id);
            else { const ev = document.createEvent('MouseEvents'); ev.initEvent('click', true, true); const holder = document.createElement('button'); holder.dataset.action='open-project'; holder.dataset.id=p.id; document.body.appendChild(holder); holder.dispatchEvent(ev); holder.remove(); }
            return;
          }
          if (action === 'save-empty-scope') return saveScope(ux.dataset.project, []);
          if (action === 'commit-scope') {
            const selected = (window.__rachnaUxDraft || []).map((s,i) => ({...s, customer_price: Number($(`#uxPrice_${i}`)?.value || 0), internal_cost: Number($(`#uxCost_${i}`)?.value || 0)}));
            return saveScope(ux.dataset.project, selected);
          }
          if (action === 'save-scope') {
            const projectId = ux.dataset.project;
            const selected = [];
            $$('[data-ux-rachna]:checked').forEach(i => selected.push({service_id:i.dataset.serviceId,name:i.dataset.name,brand:'Rachna',customer_price:0,internal_cost:0,quantity:1}));
            if ($('#uxAavToggle')?.checked) {
              const pkg = $('#uxAavPackage')?.value || 'Essential Package';
              const coreId = aavartanServices().find(s => s.name === 'Aavartan Photo + Video')?.id || '';
              selected.push({service_id:coreId || null,name:`Aavartan Photo + Video — ${pkg}`,brand:'Aavartan',customer_price:0,internal_cost:0,quantity:1});
              $$('[data-ux-addon]:checked').forEach(i => selected.push({name:i.dataset.name,brand:'Aavartan',customer_price:0,internal_cost:0,quantity:1}));
            }
            return openAmountStep(projectId, selected);
          }
        } catch (err) { toast(err?.message || 'Something went wrong', true); }
      })();
      return;
    }
    const tab = e.target.closest('[data-project-tab="services"]');
    if (tab) setTimeout(() => { const p = projectOf(A?.state?.projects?.find?.(x => x.id)); renderScopeIntoPage(A?.state?.projects?.find?.(x => x.id)?.id); }, 0);
    const legacySave = e.target.closest('[data-action="save-services"]');
    if (legacySave) {
      e.preventDefault(); e.stopImmediatePropagation();
      setTimeout(() => renderScopeIntoPage(legacySave.dataset.project), 0);
    }
  }, true);

  let lastPage = '';
  const observer = new MutationObserver(() => {
    const serviceButton = $('[data-action="save-services"]');
    if (serviceButton) {
      const pid = serviceButton.dataset.project;
      if (pid && lastPage !== pid) { lastPage = pid; renderScopeIntoPage(pid); }
    }
  });
  observer.observe(document.body, {childList:true, subtree:true});

  document.addEventListener('click', e => {
    if (e.target.closest('[data-action="new-project"]')) return;
    if (e.target.closest('#refresh')) lastPage = '';
  }, false);

  const captureNewProject = e => {
    const t = e.target.closest('[data-action="new-project"]');
    if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation(); openNewEvent();
  };
  document.addEventListener('click', captureNewProject, true);

  window.__rachnaUxOpenProject = id => {
    const p = A.state.projects.find(x => x.id === id); if (!p) return;
    // Reuse the app's navigation by setting the same internal route through a synthetic event.
    const btn = document.createElement('button'); btn.dataset.action='open-project'; btn.dataset.id=id; btn.style.display='none'; document.body.appendChild(btn);
    document.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    btn.remove();
  };
})();
