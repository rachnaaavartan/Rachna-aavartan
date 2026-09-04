(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = A.esc || (s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])));

  const toast = (message, error = false) => {
    const n = $('#toast');
    if (!n) return;
    n.textContent = message;
    n.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(window.__rachnaUxToast);
    window.__rachnaUxToast = setTimeout(() => n.className = 'toast', 3000);
  };
  const close = () => $('#backdrop')?.classList.remove('show');
  const project = id => A.state.projects.find(p => p.id === id);
  const servicesFor = id => A.state.projectServices.filter(s => s.project_id === id);
  const rachnaServices = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'rachna' && s.active !== false);
  const aavartanServices = () => A.state.services.filter(s => String(s.brand).toLowerCase() === 'aavartan' && s.active !== false);

  const style = document.createElement('style');
  style.textContent = `
    .ux-scope-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .ux-scope-card{border:1px solid #ddd8cf;border-radius:16px;padding:18px;background:#fff}
    .ux-scope-card h3{margin:0 0 6px;font-size:17px}
    .ux-scope-card p{margin:0 0 14px;color:#6f6b66;font-size:13px;line-height:1.45}
    .ux-brand-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .ux-toggle{position:relative;width:48px;height:28px;flex:0 0 auto}
    .ux-toggle input{position:absolute;opacity:0;width:1px;height:1px}
    .ux-toggle-track{position:absolute;inset:0;border-radius:999px;background:#d8d4cd;cursor:pointer}
    .ux-toggle-track:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#fff;transition:.15s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
    .ux-toggle input:checked + .ux-toggle-track{background:#25232a}
    .ux-toggle input:checked + .ux-toggle-track:before{transform:translateX(20px)}
    .ux-service-list{display:grid;gap:8px}
    .ux-service-choice{display:flex;align-items:center;gap:10px;border:1px solid #e5e0d8;border-radius:11px;padding:10px 12px;background:#faf9f7;cursor:pointer}
    .ux-service-choice input{width:17px;height:17px;flex:0 0 auto}
    .ux-service-choice b{font-size:13px}.ux-service-choice small{display:block;color:#88827a;margin-top:2px}
    .ux-note{padding:12px 14px;border-radius:12px;background:#f5f3ef;color:#625e58;font-size:12px;line-height:1.45;margin-bottom:14px}
    .ux-warning{padding:11px 12px;background:#fbf7ed;border:1px solid #eadfbe;border-radius:11px;color:#665b3e;font-size:12px;line-height:1.4;margin-top:12px}
    .ux-amounts{display:grid;gap:9px}
    .ux-amount-row{display:grid;grid-template-columns:minmax(0,1fr) 150px 150px;gap:8px;align-items:center;border:1px solid #e5e0d8;border-radius:11px;padding:9px 10px;background:#faf9f7}
    .ux-amount-row b{font-size:13px}.ux-amount-row small{display:block;color:#88827a}.ux-amount-row input{width:100%;box-sizing:border-box}
    @media(max-width:760px){.ux-scope-grid{grid-template-columns:1fr}.ux-amount-row{grid-template-columns:1fr 1fr}.ux-amount-row>div{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  function modal(title, body, actions = '') {
    const n = $('#modal');
    if (!n) return;
    n.innerHTML = `<div class="modal-head"><div><div class="eyebrow">RACHNA OS</div><h2>${esc(title)}</h2></div><button class="close-btn" data-ux-action="close">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn" data-ux-action="close">Cancel</button>${actions}</div>`;
    $('#backdrop')?.classList.add('show');
  }

  function openNewEvent() {
    modal('Create Event ID',
      `<div class="ux-note"><b>Event first. Services second.</b><br>Create the Event ID without choosing a brand or service. Add only the service the client actually books.</div>
       <div class="form-grid">
         <label class="field"><span>Customer name</span><input id="uxCustomer"></label>
         <label class="field"><span>Phone / WhatsApp</span><input id="uxPhone" inputmode="tel"></label>
         <label class="field"><span>Event / wedding name</span><input id="uxName"></label>
         <label class="field"><span>BS date range</span><input id="uxDate" placeholder="2083-08-25 → 2083-08-27"></label>
         <label class="field"><span>First function</span><input id="uxFunction" value="Wedding"></label>
         <label class="field"><span>Venue</span><input id="uxVenue"></label>
         <label class="field"><span>Guests</span><input id="uxGuests" type="number" min="0"></label>
       </div>`,
      '<button class="btn primary" data-ux-action="create-event">Create Event ID</button>'
    );
  }

  function openProject(id) {
    const b = document.createElement('button');
    b.dataset.action = 'open-project';
    b.dataset.id = id;
    b.hidden = true;
    document.body.appendChild(b);
    b.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
    b.remove();
  }

  function renderServiceScope(projectId) {
    const page = $('#page');
    const p = project(projectId);
    if (!page || !p) return;
    const panel = $$('.panel', page).find(x => x.querySelector('.service-builder') || x.querySelector('[data-action="save-services"]'));
    if (!panel) return;

    const existing = servicesFor(projectId);
    const names = new Set(existing.map(s => s.name));
    const aavCore = existing.find(s => String(s.name || '').toLowerCase().startsWith('aavartan photo + video'));
    const aavOn = !!aavCore || existing.some(s => String(s.brand).toLowerCase() === 'aavartan');
    const addons = ['Candid coverage','Cinematic coverage','Drone','Premium Karizma album','Social media reels','Additional photographer','Additional videographer','Pre-wedding','Post-wedding','Additional album','Photo frame'];

    panel.innerHTML = `
      <div class="section-head"><div><div class="eyebrow">SERVICE SCOPE</div><h2>Choose only what this client booked</h2><p>Rachna and Aavartan are independent. Use one, both, or neither.</p></div><button class="btn primary" data-ux-action="save-scope" data-project="${esc(projectId)}">Save scope</button></div>
      <div class="ux-scope-grid">
        <section class="ux-scope-card">
          <div class="ux-brand-row"><div><h3>Rachna</h3><p>Decoration, planning and other event services.</p></div></div>
          <div class="ux-service-list">
            ${rachnaServices().map(s => `<label class="ux-service-choice"><input type="checkbox" data-ux-rachna data-service-id="${esc(s.id)}" data-name="${esc(s.name)}" ${names.has(s.name) ? 'checked' : ''}><span><b>${esc(s.name)}</b><small>${esc(s.category || 'Rachna service')}</small></span></label>`).join('') || '<div class="ux-note">No Rachna services configured.</div>'}
          </div>
        </section>
        <section class="ux-scope-card">
          <div class="ux-brand-row"><div><h3>Aavartan</h3><p>Photography + video. Turn this on only when needed.</p></div><label class="ux-toggle"><input id="uxAavToggle" type="checkbox" ${aavOn ? 'checked' : ''}><span class="ux-toggle-track"></span></label></div>
          <div id="uxAavBody" ${aavOn ? '' : 'style="display:none"'}>
            <label class="field"><span>Photography / Video package</span><select id="uxAavPackage">${['Essential Package','Signature Package','Legacy Package','2-Day Story','3-Day Story','Multi-day / Custom'].map(n => `<option value="${esc(n)}" ${aavCore?.name?.includes(n) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
            <div class="ux-service-list" style="margin-top:10px">${addons.map(n => `<label class="ux-service-choice"><input type="checkbox" data-ux-addon data-name="${esc(n)}" ${existing.some(v => v.name === n || String(v.name || '').startsWith(n + ' —')) ? 'checked' : ''}><span><b>${esc(n)}</b></span></label>`).join('')}</div>
          </div>
          <div class="ux-warning"><b>Decoration-only client?</b> Leave Aavartan OFF. No Photo + Video selection is required.</div>
        </section>
      </div>`;

    $('#uxAavToggle')?.addEventListener('change', e => {
      const body = $('#uxAavBody');
      if (body) body.style.display = e.target.checked ? '' : 'none';
    });
  }

  function amounts(projectId, rows) {
    if (!rows.length) {
      modal('No service selected', '<div class="ux-note"><b>This is valid.</b> Save the Event ID with no service scope and add services later.</div>', `<button class="btn primary" data-ux-action="save-empty-scope" data-project="${esc(projectId)}">Save empty scope</button>`);
      return;
    }
    window.__rachnaUxDraft = rows;
    const lines = rows.map((s,i) => `<div class="ux-amount-row"><div><b>${esc(s.name)}</b><small>${esc(s.brand || '')}</small></div><input id="uxPrice_${i}" type="number" min="0" placeholder="Client price" value="${Number(s.customer_price || 0)}"><input id="uxCost_${i}" type="number" min="0" placeholder="Internal cost" value="${Number(s.internal_cost || 0)}"></div>`).join('');
    modal('Enter agreed amounts', `<div class="ux-note">Enter the actual client price and internal cost. These feed the Event ID financials.</div><div class="ux-amounts"><div class="ux-amount-row" style="border:0;background:transparent;padding:0 10px"><b>Service</b><b>Client price</b><b>Internal cost</b></div>${lines}</div>`, `<button class="btn primary" data-ux-action="commit-scope" data-project="${esc(projectId)}">Save scope</button>`);
  }

  async function saveScope(projectId, rows) {
    try {
      await A.saveProjectServiceScope(projectId, rows);
      await A.refresh();
      close();
      toast(rows.length ? 'Service scope saved' : 'Event saved with no service scope');
      renderServiceScope(projectId);
    } catch (e) {
      toast(e?.message || 'Could not save service scope', true);
    }
  }

  document.addEventListener('click', e => {
    const ux = e.target.closest('[data-ux-action]');
    if (!ux) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    (async () => {
      try {
        const action = ux.dataset.uxAction;
        if (action === 'close') return close();
        if (action === 'create-event') {
          let customer = null;
          if ($('#uxCustomer').value.trim()) customer = await A.createCustomer({name: $('#uxCustomer').value, phone: $('#uxPhone').value});
          const p = await A.insertProject({customer_id: customer?.id || null, name: $('#uxName').value, date_range_bs: $('#uxDate').value, function_name: $('#uxFunction').value || 'Wedding', event_date_bs: ($('#uxDate').value || '').split(/\s|→/)[0] || null, venue: $('#uxVenue').value, guest_count: $('#uxGuests').value, brand: 'Rachna'});
          close(); toast(`Event created · ${p.event_code || 'Event ID assigned'}`); openProject(p.id); return;
        }
        if (action === 'save-empty-scope') return saveScope(ux.dataset.project, []);
        if (action === 'commit-scope') {
          const rows = (window.__rachnaUxDraft || []).map((s,i) => ({...s, customer_price:Number($(`#uxPrice_${i}`)?.value || 0), internal_cost:Number($(`#uxCost_${i}`)?.value || 0)}));
          return saveScope(ux.dataset.project, rows);
        }
        if (action === 'save-scope') {
          const projectId = ux.dataset.project;
          const rows = [];
          $$('[data-ux-rachna]:checked').forEach(i => rows.push({service_id:i.dataset.serviceId,name:i.dataset.name,brand:'Rachna',customer_price:0,internal_cost:0,quantity:1}));
          if ($('#uxAavToggle')?.checked) {
            const pkg = $('#uxAavPackage')?.value || 'Essential Package';
            rows.push({service_id:aavartanServices().find(s => s.name === 'Aavartan Photo + Video')?.id || null,name:`Aavartan Photo + Video — ${pkg}`,brand:'Aavartan',customer_price:0,internal_cost:0,quantity:1});
            $$('[data-ux-addon]:checked').forEach(i => rows.push({service_id:aavartanServices().find(s => s.name === i.dataset.name)?.id || null,name:i.dataset.name,brand:'Aavartan',customer_price:0,internal_cost:0,quantity:1}));
          }
          return amounts(projectId, rows);
        }
      } catch (e) { toast(e?.message || 'Something went wrong', true); }
    })();
  }, true);

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action="new-project"]');
    if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation(); openNewEvent();
  }, true);

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action="save-services"]');
    if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    setTimeout(() => renderServiceScope(t.dataset.project), 0);
  }, true);

  const observer = new MutationObserver(() => {
    const btn = $('#page [data-action="save-services"]');
    if (btn?.dataset.project) renderServiceScope(btn.dataset.project);
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
