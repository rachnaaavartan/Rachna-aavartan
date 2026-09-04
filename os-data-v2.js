(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || !A.sb) return;
  A.state.documents = A.state.documents || [];
  A.state.marketingCampaigns = A.state.marketingCampaigns || [];
  A.state.clientPortals = A.state.clientPortals || [];
  A.state.portalRequests = A.state.portalRequests || [];
  A.state.eventOperationsTasks = A.state.eventOperationsTasks || [];
  const original = A.refresh.bind(A);
  let loading = false;
  async function refreshAll() {
    if (loading) return A.state;
    loading = true;
    try {
      await original();
      const extras = await Promise.all([
        A.sb.from('documents').select('*').order('created_at', { ascending: false }),
        A.sb.from('marketing_campaigns').select('*').order('start_date', { ascending: false }),
        A.sb.from('client_portals').select('*').order('created_at', { ascending: false }),
        A.sb.from('portal_requests').select('*').order('created_at', { ascending: false }),
        A.sb.from('event_operations_tasks').select('*').order('due_at', { ascending: true })
      ]);
      const failed = extras.find(x => x.error && !['PGRST116'].includes(x.error.code));
      if (failed?.error) throw failed.error;
      A.state.documents = extras[0].data || [];
      A.state.marketingCampaigns = extras[1].data || [];
      A.state.clientPortals = extras[2].data || [];
      A.state.portalRequests = extras[3].data || [];
      A.state.eventOperationsTasks = extras[4].data || [];
      return A.state;
    } finally {
      loading = false;
    }
  }
  A.refresh = refreshAll;
  A.refreshExtraData = refreshAll;
})();
