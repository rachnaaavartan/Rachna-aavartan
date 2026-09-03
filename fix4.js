(()=>{
  const A=window.RachnaAPI;
  const $=s=>document.querySelector(s);
  const esc=A.esc;
  const money=A.money;
  const AD=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function days(y,m){
    const X=window.DateConverter,out=[];
    if(X){for(let d=1;d<=32;d++){try{new X(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`).toAd();out.push(d)}catch(e){}}}
    return out.length?out:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  }
  function ad(v){try{return window.DateConverter?new window.DateConverter(v).toAd():null}catch(e){return null}}
  window.__date3=function(k){
    const y=+$('#'+k+'Y').value,m=+$('#'+k+'M').value,ds=days(y,m),old=+$('#'+k+'D').value,d=ds.includes(old)?old:ds[ds.length-1];
    $('#'+k+'D').innerHTML=ds.map(x=>`<option value="${x}" ${x===d?'selected':''}>${x}</option>`).join('');
    const bs=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const h=$('#'+k+'BS');if(h)h.value=bs;
    const a=ad(bs),p=$('#'+k+'AD');if(p)p.textContent=a?`AD ${String(a.date).padStart(2,'0')} ${AD[a.month-1]} ${a.year}`:'Unable to convert';
  };
  window.RachnaCRUD={
    async save(table,id,row){
      const q=id?A.sb.from(table).update(row).eq('id',id):A.sb.from(table).insert(row);
      const r=await q.select().single();if(r.error)throw r.error;await A.refresh();return r.data;
    },
    async remove(table,id){
      if(!confirm('Delete this record?'))return false;
      const r=await A.sb.from(table).delete().eq('id',id);if(r.error)throw r.error;await A.refresh();return true;
    }
  };
  window.homeStable=()=>{
    const s=A.state,next=s.functions.filter(f=>f.event_date).slice().sort((a,b)=>a.event_date.localeCompare(b.event_date)).slice(0,5);
    const H=(window.head||((e,t,sub,a='')=>`<div class="page-head"><div><div class="eyebrow">${esc(e)}</div><h1>${t}</h1><p>${sub}</p></div><div class="action-row">${a}</div></div>`));
    const K=(window.kpi||((l,v,f)=>`<div class="card kpi"><small>${esc(l)}</small><strong>${v}</strong><span>${esc(f)}</span></div>`));
    return H('Rachna + Aavartan','Event command centre','Inquiry → Project → Functions → Services → Quote → Advance → Booked.','<button class="btn" onclick="newInquiry3()">New inquiry</button><button class="btn primary" onclick="newProject3()">New project</button>')+`<div class="grid four-col">${K('Open inquiries',s.inquiries.filter(x=>!['booked','lost'].includes(x.status)).length,'Sales pipeline')}${K('Booked projects',s.projects.filter(x=>x.status==='booked').length,'30% advance')}${K('Cash received',money(s.payments.filter(x=>x.direction==='in').reduce((a,x)=>a+Number(x.amount||0),0)),'Incoming')}${K('Upcoming functions',next.length,'Scheduled')}</div><div class="card how"><div><div class="eyebrow">AAVARTAN PRIORITY</div><h2>Photography + Videography are ONE core service.</h2><p>All other Aavartan options are optional checkboxes. Rachna manages the event planning and management side.</p></div></div>`;
  };
  window.RachnaDateDays=days;
})();