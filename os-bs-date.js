(() => {
  'use strict';
  const fields = ['inqDate','pDate','fnBS','docBSDate'];
  const months = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
  const years = Array.from({length:31},(_,i)=>String(2070+i));
  const pad = n => String(n).padStart(2,'0');
  function parse(value){
    const m=String(value||'').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if(!m)return {y:'',m:'',d:''};
    return {y:m[1],m:String(Number(m[2])),d:String(Number(m[3]))};
  }
  function decorate(input){
    if(!input || input.dataset.bsSelectReady==='1')return;
    input.dataset.bsSelectReady='1';
    const initial=parse(input.value);
    input.type='hidden';
    input.classList.add('bs-date-value');
    const wrap=document.createElement('div'); wrap.className='bs-date-picker';
    const year=document.createElement('select'), month=document.createElement('select'), day=document.createElement('select');
    year.className=month.className=day.className='bs-date-part';
    year.innerHTML='<option value="">Year</option>'+years.map(v=>`<option value="${v}">${v}</option>`).join('');
    month.innerHTML='<option value="">Month</option>'+months.map((v,i)=>`<option value="${i+1}">${i+1} · ${v}</option>`).join('');
    function fillDays(selected=''){
      const count=32;
      day.innerHTML='<option value="">Day</option>'+Array.from({length:count},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
      if(selected)day.value=selected;
    }
    fillDays(initial.d); year.value=initial.y; month.value=initial.m;
    function sync(){ input.value=year.value&&month.value&&day.value?`${year.value}-${pad(month.value)}-${pad(day.value)}`:''; input.dispatchEvent(new Event('change',{bubbles:true})); }
    year.addEventListener('change',sync); month.addEventListener('change',sync); day.addEventListener('change',sync);
    wrap.append(year,month,day); input.insertAdjacentElement('afterend',wrap);
  }
  function scan(root=document){fields.forEach(id=>decorate(root.querySelector?.(`#${id}`)))}
  const style=document.createElement('style'); style.textContent='.bs-date-picker{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px}.bs-date-part{min-width:0}@media(max-width:700px){.bs-date-picker{grid-template-columns:1fr}}'; document.head.appendChild(style);
  const obs=new MutationObserver(()=>scan()); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();obs.observe(document.body,{childList:true,subtree:true})}); else {scan();obs.observe(document.body,{childList:true,subtree:true})}
})();
