import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function unique(values) { return [...new Set(values)].sort(); }
function assert(ok, msg) { if (!ok) throw new Error(msg); }

const aRefs = unique([...app.matchAll(/\bA\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
const allowed = new Set(['state', 'sb']);

const apiBlock = app.match(/window\.RachnaAPI\s*=\s*\{([\s\S]*?)\n\s*\};/);
assert(apiBlock, 'RachnaAPI export block missing');
const exportText = apiBlock[1];
const exported = new Set();
for (const m of exportText.matchAll(/(?:^|,|\n)\s*([A-Za-z_$][\w$]*)\s*(?=,|\n|$)/g)) exported.add(m[1]);
for (const m of exportText.matchAll(/(?:^|,|\n)\s*([A-Za-z_$][\w$]*)\s*:/g)) exported.add(m[1]);
const definedFunctions = new Set([...app.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const definedConsts = new Set([...app.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]));
const missingApi = aRefs.filter(x => !allowed.has(x) && !exported.has(x) && !definedFunctions.has(x) && !definedConsts.has(x));
assert(missingApi.length === 0, `A.* references not backed by a defined/exported API member: ${missingApi.join(', ')}`);

const handlerBlock = app.match(/const HANDLERS=\{([\s\S]*?)\n\};/);
const routeBlock = app.match(/const routeMap=\{([\s\S]*?)\n\};/);
assert(handlerBlock, 'HANDLERS block missing');
assert(routeBlock, 'routeMap block missing');
const handlerKeys = new Set([...handlerBlock[1].matchAll(/(?:^|,)\s*['"]?([A-Za-z0-9_-]+)['"]?\s*:/g)].map(m => m[1]));
handlerKeys.add('sign-in-panel');
const routeKeys = new Set([...routeBlock[1].matchAll(/(?:^|,)\s*['"]?([A-Za-z0-9_-]+)['"]?\s*:/g)].map(m => m[1]));

const actions = unique([...app.matchAll(/data-action=["']([^"']+)["']/g)].map(m => m[1]).filter(x => !x.includes('$')));
const routes = unique([...app.matchAll(/data-route=["']([^"']+)["']/g)].map(m => m[1]).filter(x => !x.includes('$')));
assert(actions.every(x => handlerKeys.has(x)), `Unwired data-actions: ${actions.filter(x => !handlerKeys.has(x)).join(', ')}`);
assert(routes.every(x => routeKeys.has(x)), `Unwired data-routes: ${routes.filter(x => !routeKeys.has(x)).join(', ')}`);

const idsUsed = unique([...app.matchAll(/\$\(['"]#([A-Za-z][A-Za-z0-9_-]*)['"]\)/g)].map(m => m[1]));
const idsDefined = new Set([...app.matchAll(/\bid=["']([A-Za-z][A-Za-z0-9_-]*)["']/g)].map(m => m[1]));
const missingIds = idsUsed.filter(x => !idsDefined.has(x) && !html.includes(`id="${x}"`) && !html.includes(`id='${x}'`));
assert(missingIds.length === 0, `Direct DOM ids referenced but not defined: ${missingIds.join(', ')}`);

// The working external BS date implementation is locked against regression.
assert(app.includes('const DATE=window.NepaliFunctions;'), 'External BS date implementation missing');
assert(app.includes('DATE.BS2AD'), 'External BS->AD conversion missing');
assert(app.includes('DATE.AD2BS'), 'External AD->BS conversion missing');
assert(!app.includes('const NP=window.NepaliDate;'), 'Old internal NepaliDate implementation returned');
assert(!app.includes('data-bs-year') && !app.includes('data-bs-month') && !app.includes('data-bs-day'), 'Old three-field date picker returned');

console.log(JSON.stringify({ ok: true, apiRefs: aRefs.length, actions: actions.length, routes: routes.length, ids: idsUsed.length }));
