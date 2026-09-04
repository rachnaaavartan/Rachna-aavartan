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

// One-time merge is only needed on legacy trees. Once merged, this script is idempotent.
if (fs.existsSync(backendPath)) {
  const backend = unwrapIife(fs.readFileSync(backendPath, 'utf8'));
  const appBody = unwrapIife(app);
  app = `(() => {\n'use strict';\n{\n${backend}\n}\n${appBody}\n})();\n`;
  fs.unlinkSync(backendPath);
}

// Fix pipeline shortcuts so the displayed stage is actually applied.
app = app.replace(
  /'filter-inquiry':\(\{stage\}\)=>\{ui\.page='inquiries';ui\.query='';render\(\)\},/,
  "'filter-inquiry':({stage})=>{ui.page='inquiries';ui.query=stage||'';render()},"
);

// Make modal close independent from the global click delegate.
app = app.replace(
  /const closeModal=\(\)=>[^;]+;/,
  "const closeModal=()=>{const b=$('#backdrop');if(b)b.classList.remove('show');};"
);
if (!app.includes("m.querySelectorAll('[data-action=\"close\"]').forEach")) {
  app = app.replace(
    /;b\.classList\.add\('show'\);bindPickers\(m\)\};/,
    ";b.classList.add('show');bindPickers(m);m.querySelectorAll('[data-action=\"close\"]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeModal()}));};"
  );
}

// Route Account through the same dispatcher as every other visible action.
app = app.replace(
  /const HANDLERS=\{/,
  "const HANDLERS={\n account:()=>{if(state.user){ui.project=null;ui.page='settings';ui.tab='overview';ui.query='';closeModal();render()}else authModal()},"
);
app = app.replace(
  /function bindGlobal\(\)\{document\.addEventListener\('click',e=>\{/,
  "function bindGlobal(){document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()},{capture:true});document.addEventListener('click',e=>{"
);
// Remove duplicate direct top-bar listeners now handled by the dispatcher.
app = app.replace(/;\$\('#refresh'\)\?\.addEventListener\('click',[\s\S]*?;const dateBtn=\$\('\[data-rachna-date-check\]'\);if\(dateBtn\)dateBtn\.addEventListener\('click',[\s\S]*?dateCheckModal\(\)\);/,
  ';');

if (!app.includes("const HANDLERS={\n account:")) throw new Error('Account handler missing after normalization');
if (!app.includes("ui.query=stage||''")) throw new Error('Inquiry filter fix missing after normalization');

fs.writeFileSync(appPath, app);

if (fs.existsSync(uiCssPath)) {
  const styles = fs.readFileSync(stylesPath, 'utf8');
  const ui = fs.readFileSync(uiCssPath, 'utf8');
  if (!styles.includes('/* unified-ui */')) fs.writeFileSync(stylesPath, styles + '\n\n/* unified-ui */\n' + ui);
  fs.unlinkSync(uiCssPath);
}

let index = fs.readFileSync(indexPath, 'utf8');
index = index.replace(/\n<link rel="stylesheet" href="ui\.css\?v=[^"]+">/g, '');
index = index.replace(/\n<script src="\.\/backend-clean\.js\?v=[^"]+"><\/script>/g, '');
index = index.replace(/\n<script src=""><\/script>/g, '');
index = index.replace(/data-rachna-date-check/g, 'data-action="date-check"');
if (!index.includes('data-action="refresh"')) index = index.replace('id="refresh" title="Refresh"', 'id="refresh" data-action="refresh" title="Refresh"');
if (!index.includes('data-action="account"')) index = index.replace('id="authBtn" title="Account"', 'id="authBtn" data-action="account" title="Account"');
const version = '20260905.7';
index = index.replace(/\?v=[0-9.]+/g, '?v=' + version);
fs.writeFileSync(indexPath, index);

let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE='[^']+'/, "const CACHE='rachna-os-v20260905-7'");
sw = sw.replace(/,?'\.\/ui\.css\?v=[^']+'/g, '').replace(/,?'\.\/backend-clean\.js\?v=[^']+'/g, '');
sw = sw.replace(/\?v=[0-9.]+/g, '?v=' + version);
fs.writeFileSync(swPath, sw);

console.log('Production runtime normalized:', version);
