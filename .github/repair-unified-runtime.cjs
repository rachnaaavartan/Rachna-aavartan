const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'app.js');
const backendPath = path.join(root, 'backend-clean.js');
const indexPath = path.join(root, 'index.html');
const swPath = path.join(root, 'sw.js');
const stylesPath = path.join(root, 'styles.css');
const uiCssPath = path.join(root, 'ui.css');

function unwrapIife(src) {
  const m = src.match(/^\(\(\) => \{[\s\S]*?\n([\s\S]*)\n\}\)\(\);\s*$/);
  if (!m) throw new Error('Could not unwrap runtime module');
  return m[1];
}

let app = fs.readFileSync(appPath, 'utf8');
let backend = fs.readFileSync(backendPath, 'utf8');

if (!app.includes("$('#authBtn')?.addEventListener('click'")) throw new Error('Expected account handler missing');
if (!app.includes("'filter-inquiry':({stage})=>{ui.page='inquiries';ui.query='';render()},")) throw new Error('Expected inquiry filter handler missing');

backend = unwrapIife(backend);
app = unwrapIife(app);

// Keep one JavaScript runtime file while isolating backend lexical names in a block.
const merged = `(() => {\n'use strict';\n{\n${backend}\n}\n${app}\n})();\n`;

let repaired = merged
  .replace(
    "'filter-inquiry':({stage})=>{ui.page='inquiries';ui.query='';render()},",
    "'filter-inquiry':({stage})=>{ui.page='inquiries';ui.query=stage||'';render()},"
  )
  .replace(
    "const modal=(title,body,actions='')=>{const b=$('#backdrop'),m=$('#modal');m.innerHTML=`<div class=\"modal-head\"><div><div class=\"eyebrow\">RACHNA OS</div><h2>${esc(title)}</h2></div><button class=\"close-btn\" type=\"button\" data-action=\"close\">×</button></div><div class=\"modal-body\">${body}</div><div class=\"modal-foot\"><button class=\"btn\" type=\"button\" data-action=\"close\">Cancel</button>${actions}</div>`;b.classList.add('show');bindPickers(m)};",
    "const modal=(title,body,actions='')=>{const b=$('#backdrop'),m=$('#modal');m.innerHTML=`<div class=\"modal-head\"><div><div class=\"eyebrow\">RACHNA OS</div><h2>${esc(title)}</h2></div><button class=\"close-btn\" type=\"button\" data-action=\"close\">×</button></div><div class=\"modal-body\">${body}</div><div class=\"modal-foot\"><button class=\"btn\" type=\"button\" data-action=\"close\">Cancel</button>${actions}</div>`;b.classList.add('show');bindPickers(m);m.querySelectorAll('[data-action=\"close\"]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeModal()}));};"
  )
  .replace(
    "const closeModal=()=>$('#backdrop')?.classList.remove('show');",
    "const closeModal=()=>{const b=$('#backdrop');if(b)b.classList.remove('show');};"
  )
  .replace(
    "$('#authBtn')?.addEventListener('click',()=>state.user?settingsPage()&&render():authModal());",
    "$('#authBtn')?.addEventListener('click',()=>{if(state.user){ui.project=null;ui.page='settings';ui.tab='overview';ui.query='';closeModal();render()}else authModal()});"
  );

if (!repaired.includes("ui.page='settings';ui.tab='overview'")) throw new Error('Account navigation fix did not apply');
if (!repaired.includes("ui.query=stage||''")) throw new Error('Inquiry filter fix did not apply');

// Add an Escape key close path to the single global interaction system.
const oldBind = "function bindGlobal(){document.addEventListener('click',e=>{";
const newBind = "function bindGlobal(){document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()},{capture:true});document.addEventListener('click',e=>{";
if (!repaired.includes(oldBind)) throw new Error('Global binder not found');
repaired = repaired.replace(oldBind, newBind);

fs.writeFileSync(appPath, repaired);

// Merge the second stylesheet into the canonical stylesheet, then remove it.
if (fs.existsSync(uiCssPath)) {
  const styles = fs.readFileSync(stylesPath, 'utf8');
  const ui = fs.readFileSync(uiCssPath, 'utf8');
  if (!styles.includes('/* unified-ui */')) fs.writeFileSync(stylesPath, styles + '\n\n/* unified-ui */\n' + ui);
  fs.unlinkSync(uiCssPath);
}

let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/\n<link rel="stylesheet" href="ui\.css\?v=[^"]+">/, '');
index = index.replace(/\n<script src="\.\/backend-clean\.js\?v=[^"]+"><\/script>/, '');
index = index.replace(/backend-clean\.js\?v=[^'\"]+/, '');
index = index.replace(/ui\.css\?v=[^'\"]+/, '');
const oldAppVersion = index.match(/app\.js\?v=([^'\"]+)/)?.[1] || '20260905.4';
const version = '20260905.5';
index = index.replaceAll(oldAppVersion, version);
fs.writeFileSync(indexPath, index);

let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE='[^']+'/,"const CACHE='rachna-os-v20260905-5'");
sw = sw.replace(/,?'\.\/ui\.css\?v=[^']+'/g, '').replace(/,?'\.\/backend-clean\.js\?v=[^']+'/g, '');
sw = sw.replace(/\?v=[0-9.]+/g, '?v=' + version);
fs.writeFileSync(swPath, sw);

console.log('Unified runtime repair applied:', version);
