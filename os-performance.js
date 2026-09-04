(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || !A.sb) return;

  const CORE = ['customers','inquiries','projects','event_functions','team_members','project_team','payments','project_expenses','reminders'];
  const ALL = ['services','project_services','vendors','vendor_bookings','quotations','quotation_items','production_costs','aavartan_deliverables','production_jobs','event_files'];
  const EXTRA = ['documents','marketing_campaigns','client_portals','portal_requests','event_operations_tasks'];
  const keyMap = {customers:'customers',inquiries:'inquiries',projects:'projects',event_functions:'functions',services:'services',project_services:'projectServices',vendors:'vendors',vendor_bookings:'vendorBookings',team_members:'team',project_team:'projectTeam',payments:'payments',project_expenses:'expenses',quotations:'quotations',quotation_items:'quotationItems',production_costs:'productionCosts',aavartan_deliverables:'deliverables',production_jobs:'productionJobs',event_files:'eventFiles',reminders:'reminders'};
  const orderMap = {customers:['created_at',false],inquiries:['updated_at',false],projects:['created_at',false],event_functions:['event_date',true],services:['name',true],project_services:['id',true],vendors:['name',true],vendor_bookings:['id',true],team_members:['name',true],project_team:['id',true],payments:['payment_date',false],project_expenses:['expense_date',false],quotations:['created_at',false],quotation_items:['id',true],production_costs:['created_at',false],aavartan_deliverables:['due_date',true],production_jobs:['due_date',true],event_files:['created_at',false],reminders:['due_at',true]};
  const originalAuthInit = A.init;

  async function load(table) {
    let q = A.sb.from(table).select('*');
    const cfg = orderMap[table];
    if (cfg) q = q.order(cfg[0], { ascending: cfg[1] });
    const { data, error } = await q;
    if (error) throw error;
    A.state[keyMap[table]] = data || [];
  }

  async function loadMany(tables) {
    await Promise.all([...new Set(tables)].map(load));
    return A.state;
  }

  A.refresh = async function(options = {}) {
    if (!A.state.user) return A.state;
    if (options.core) return loadMany(CORE);
    const tables = Array.isArray(options.tables) && options.tables.length ? options.tables.filter(t => keyMap[t]) : ALL.concat(CORE);
    await loadMany(tables);
    return A.state;
  };

  A.preload = async function() {
    if (!A.state.user) return A.state;
    try {
      await loadMany(CORE.concat(ALL));
      const results = await Promise.all(EXTRA.map(table => A.sb.from(table).select('*')));
      const extraKeys = ['documents','marketingCampaigns','clientPortals','portalRequests','eventOperationsTasks'];
      results.forEach((r, i) => { if (!r.error) A.state[extraKeys[i]] = r.data || []; });
    } catch (_) {}
    return A.state;
  };

  A.init = async function() {
    const { data, error } = await A.sb.auth.getSession();
    if (error) throw error;
    A.state.user = data.session?.user || null;
    A.state.connected = !!A.state.user;
    if (A.state.user) {
      const profileResult = await A.sb.from('profiles').select('*').eq('id', A.state.user.id).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      A.state.profile = profileResult.data;
      if (A.state.profile?.organization_id) {
        const orgResult = await A.sb.from('organizations').select('*').eq('id', A.state.profile.organization_id).maybeSingle();
        if (orgResult.error) throw orgResult.error;
        A.state.org = orgResult.data;
      }
      await A.refresh({ core: true });
      setTimeout(() => A.preload(), 0);
    }
    return A.state;
  };

  A.originalInit = originalAuthInit;
})();
