(() => {
  'use strict';
  const A = window.RachnaAPI;
  if (!A || !A.sb) return;
  const $ = (s, r=document) => r.querySelector(s);
  const esc = A.esc || (v => String(v ?? ''));
  const toast = (message, bad=false) => {
    let n = $('#cosToast');
    if (!n) { n=document.createElement('div'); n.id='cosToast'; n.className='cos-toast'; document.body.appendChild(n); }
    n.textContent = message;
    n.className = 'cos-toast show' + (bad ? ' bad' : '');
    clearTimeout(window.__dayOneHotfixToast);
    window.__dayOneHotfixToast = setTimeout(() => n.className='cos-toast', 2800);
  };
  async function saveInquiry(id) {
    const row = A.state.inquiries.find(x => x.id === id);
    if (!row) throw new Error('Inquiry not found');
    const c = A.state.customers.find(x => x.id === row.customer_id);
    if (!c) throw new Error('Client record not found');
    const name = $('#d-c-name')?.value.trim();
    if (!name) throw new Error('Client name is required');
    const client = await A.sb.from('customers').update({
      name,
      phone: $('#d-c-phone').value.trim() || null,
      whatsapp: $('#d-c-whatsapp').value.trim() || null,
      email: $('#d-c-email').value.trim() || null
    }).eq('id', c.id);
    if (client.error) throw client.error;
    const result = await A.sb.from('inquiries').update({
      event_name: $('#d-i-event').value.trim() || null,
      event_date_bs: $('#d-i-bs').value.trim() || null,
      venue: $('#d-i-venue').value.trim() || null,
      guest_count: $('#d-i-guests').value === '' ? null : Number($('#d-i-guests').value),
      budget: $('#d-i-budget').value === '' ? null : Number($('#d-i-budget').value),
      status: $('#d-i-status').value,
      source: $('#d-i-source').value || null,
      notes: $('#d-i-notes').value.trim() || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (result.error) throw result.error;
    $('#dayOneModal')?.classList.remove('show');
    await A.refresh();
    window.dispatchEvent(new CustomEvent('rachna:dayone-refresh'));
    toast('Inquiry updated.');
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-dayone-save-inquiry]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { await saveInquiry(button.dataset.dayoneSaveInquiry); }
    catch (e) { console.error(e); toast(e.message || 'Could not save inquiry.', true); }
  }, true);
})();
