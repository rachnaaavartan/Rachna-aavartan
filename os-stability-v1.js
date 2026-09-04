(()=>{
'use strict';
const A=window.RachnaAPI;
if(!A)return;
const KEY='rachna-os-ui-state-v1';
const safeRead=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{}}catch(_){return {}}};
const safeWrite=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}};
let ui=safeRead();
let saveTimer=0;
const persist=patch=>{ui={...ui,...patch,t:Date.now()};clearTimeout(saveTimer);saveTimer=setTimeout(()=>safeWrite(ui),80)};
const target=e=>e.target?.closest?.('[data-route],[data-action],[data-project-tab],[data-cos-tab],[data-cos-open],[data-cos-filter],[data-do-tab]');

document.addEventListener('click',e=>{
  const t=target(e); if(!t)return;
  const d=t.dataset||{};
  if(d.cosTab){persist({surface:'company',companyTab:d.cosTab});return;}
  if(d.doTab){persist({surface:'company',companyTab:d.doTab});return;}
  if(d.cosOpen){persist({surface:'company',companyTab:'command'});return;}
  if(d.cosFilter){persist({surface:'company',companyFilter:d.cosFilter});return;}
  if(d.route){persist({surface:'classic',route:d.route,projectId:'',projectTab:'overview'});return;}
  if(d.projectTab){persist({surface:'classic',projectId:ui.projectId||'',projectTab:d.projectTab});return;}
  if(d.action==='open-project'||d.action==='convert-inquiry'){
    if(d.id)persist({surface:'classic',projectId:d.id,projectTab:'overview'});return;
  }
  if(d.action==='back-events'){persist({surface:'classic',route:'events',projectId:'',projectTab:'overview'});return;}
},true);

document.addEventListener('input',e=>{
  const id=e.target?.id;
  if(!id)return;
  if(['eventSearch','projectSearch','clientSearch','fileSearch'].includes(id))persist({routeQuery:e.target.value});
  if(e.target.matches('[data-cos-search]'))persist({companySearch:e.target.value});
},true);
window.addEventListener('scroll',()=>{ui.scrollY=window.scrollY||0;clearTimeout(saveTimer);saveTimer=setTimeout(()=>safeWrite(ui),180)},{passive:true});
window.addEventListener('beforeunload',()=>{ui.scrollY=window.scrollY||0;safeWrite(ui)});

const baseRefresh=A.refresh;
const mutationHintMap={
  customers:['customers'], inquiries:['inquiries'], projects:['projects'], event_functions:['event_functions'],
  services:['services'], project_services:['project_services','projects'], vendors:['vendors'],
  vendor_bookings:['vendor_bookings','projects'], team_members:['team_members'], project_team:['project_team','projects'],
  payments:['payments','projects'], project_expenses:['project_expenses','projects'], quotations:['quotations'],
  quotation_items:['quotation_items','quotations'], production_costs:['production_costs','projects'],
  aavartan_deliverables:['aavartan_deliverables'], production_jobs:['production_jobs'], event_files:['event_files'],
  reminders:['reminders'], documents:['documents'], marketing_campaigns:['marketing_campaigns']
};
let hint=null;
A.refresh=async function(options={}){
  if(options&&options.tables)return baseRefresh(options);
  if(options&&options.core)return baseRefresh(options);
  if(hint&&hint.length)return baseRefresh({tables:[...new Set(hint)]});
  if(options&&options.full)return baseRefresh({});
  return baseRefresh({core:true});
};
['insert','update','remove'].forEach(method=>{
  if(typeof A[method]!=='function')return;
  const original=A[method];
  A[method]=async function(table,...args){const prev=hint;hint=mutationHintMap[table]||[table];try{return await original.call(this,table,...args)}finally{hint=prev}};
});
A.fullRefresh=()=>baseRefresh({});

function restoreClassic(){
  const r=ui.route||'home';
  const routeBtn=document.querySelector(`[data-route="${CSS.escape(r)}"]`);
  if(!routeBtn)return false;
  routeBtn.click();
  if(ui.routeQuery){setTimeout(()=>{const id=['eventSearch','projectSearch','clientSearch','fileSearch'].find(x=>document.getElementById(x));const el=id&&document.getElementById(id);if(el){el.value=ui.routeQuery;el.dispatchEvent(new Event('input',{bubbles:true}))}},80)}
  if(ui.projectId){
    setTimeout(()=>{
      const open=document.querySelector(`[data-action="open-project"][data-id="${CSS.escape(ui.projectId)}"]`);
      if(open){open.click();setTimeout(()=>{const tab=document.querySelector(`[data-project-tab="${CSS.escape(ui.projectTab||'overview')}"]`);tab?.click();restoreScroll()},100)}
    },100);
  }else setTimeout(restoreScroll,100);
  return true;
}
function restoreCompany(){
  const tabName=ui.companyTab||'command';
  const current=document.querySelector(`#cosRoot .cos-nav-item[data-cos-tab="${CSS.escape(tabName)}"]`);
  if(current){current.click();setTimeout(()=>{const search=document.querySelector('#cosRoot [data-cos-search]');if(search&&ui.companySearch!=null){search.value=ui.companySearch;search.dispatchEvent(new Event('input',{bubbles:true}))}restoreScroll()},80);return true;}
  const dayOne=document.querySelector(`#nav .dayone-company-nav[data-do-tab="${CSS.escape(tabName)}"]`);
  if(dayOne){dayOne.click();return true;}
  const opener=document.querySelector('[data-cos-open]');
  if(!opener)return false;
  opener.click();
  setTimeout(()=>restoreCompany(),100);
  return true;
}
function restoreScroll(){const y=Math.max(0,Number(ui.scrollY||0));if(y)requestAnimationFrame(()=>window.scrollTo(0,y));}
function restore(){
  if(!ui||!ui.t)return;
  const company=ui.surface==='company';
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ok=company?restoreCompany():restoreClassic();
    if(ok||tries>=16){clearInterval(timer);if(!ok)restoreScroll();}
  },250);
}
if(ui.t&&Date.now()-ui.t>1000*60*60*24*30){ui={};safeWrite(ui)}
setTimeout(restore,900);
})();
