(()=>{
  const A=window.RachnaAPI;
  const $=s=>document.querySelector(s);
  const esc=A.esc;
  const BS_MONTH_DAYS={
    2075:[31,31,32,31,31,31,30,29,30,29,30,30],2076:[31,32,31,32,31,30,30,30,29,29,30,30],
    2077:[31,32,31,32,31,30,30,30,29,30,29,31],2078:[31,31,31,32,31,31,30,29,30,29,30,30],
    2079:[31,31,32,31,31,31,30,29,30,29,30,30],2080:[31,32,31,32,31,30,30,30,29,29,30,30],
    2081:[31,31,32,32,31,30,30,29,30,30,30,30],2082:[30,32,31,32,31,30,30,29,30,30,30,30],
    2083:[31,31,32,31,31,30,30,29,30,30,30,30],2084:[31,31,32,31,31,30,30,29,30,30,30,30],
    2085:[31,32,31,32,30,31,30,30,29,30,30,30],2086:[30,32,31,32,31,30,30,29,30,30,30,30],
    2087:[31,31,32,31,31,31,30,30,29,30,30,30],2088:[30,31,32,32,30,31,30,30,29,30,30,30],
    2089:[30,32,31,32,31,30,30,30,29,30,30,30],2090:[30,32,31,32,31,30,30,30,29,30,30,30],
    2091:[31,31,32,31,31,31,30,30,29,30,30,30],2092:[30,31,32,32,31,30,30,29,30,30,30,30],
    2093:[30,32,31,32,31,30,30,30,29,30,30,30],2094:[31,31,32,31,31,30,30,30,29,30,30,30],
    2095:[31,31,32,31,31,31,30,29,30,30,30,30],2096:[30,31,32,32,31,30,30,29,30,29,30,30],
    2097:[31,32,31,32,31,30,30,29,30,30,30,30],2098:[31,31,32,31,31,31,29,30,29,30,29,31],
    2099:[31,31,32,31,31,31,30,29,29,30,30,30]
  };
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function dayCount(y,m){return (BS_MONTH_DAYS[y]&&BS_MONTH_DAYS[y][m-1])||32;}
  function populateDay(k){
    const yEl=$('#'+k+'Y'),mEl=$('#'+k+'M'),dEl=$('#'+k+'D');
    if(!yEl||!mEl||!dEl)return;
    const y=+yEl.value,m=+mEl.value,max=dayCount(y,m),old=+dEl.value||1,d=Math.min(old,max);
    dEl.innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}" ${i+1===d?'selected':''}>${i+1}</option>`).join('');
    const bs=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const h=$('#'+k+'BS');if(h)h.value=bs;
    const p=$('#'+k+'AD');
    try{const X=window.DateConverter;const a=X?new X(bs).toAd():null;p&&(p.textContent=a?`AD ${String(a.date).padStart(2,'0')} ${monthNames[a.month-1]} ${a.year}`:'');}catch(e){p&&(p.textContent='');}
  }
  window.__date3=function(k){populateDay(k)};
  window.RachnaDateDays=function(y,m){return Array.from({length:dayCount(y,m)},(_,i)=>i+1)};
  const observer=new MutationObserver(()=>{
    document.querySelectorAll('select[id$="Y"]').forEach(y=>{
      const k=y.id.slice(0,-1);
      const m=$('#'+k+'M'),d=$('#'+k+'D');
      if(m&&d&&d.options.length===1)populateDay(k);
    });
    document.querySelectorAll('*').forEach(el=>{
      if(el.children.length===0&&el.textContent&&/45,?000/.test(el.textContent)){
        const t=el.textContent.replace(/(?:NPR\s*)?45,?000(?:\+)?/g,'Package pricing');
        if(t!==el.textContent)el.textContent=t;
      }
    });
  });
  function start(){
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.querySelectorAll('select[id$="Y"]').forEach(y=>{
      const k=y.id.slice(0,-1);
      if($('#'+k+'M')&&$('#'+k+'D'))populateDay(k);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();

  window.RachnaCRUD={
    async save(table,id,row){
      const payload={...row};
      if(['customers','inquiries','projects','services','vendors','tasks','payments','project_expenses','team_members','documents','marketing_leads'].includes(table)&&!payload.organization_id){payload.organization_id=A.state.profile?.organization_id;}
      const q=id?A.sb.from(table).update(payload).eq('id',id):A.sb.from(table).insert(payload);
      const r=await q.select().single();
      if(r.error)throw r.error;
      await A.refresh();
      return r.data;
    },
    async remove(table,id){
      if(!confirm('Delete this record?'))return false;
      const r=await A.sb.from(table).delete().eq('id',id);
      if(r.error)throw r.error;
      await A.refresh();
      return true;
    }
  };
})();