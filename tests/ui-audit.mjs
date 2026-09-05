import { chromium } from 'playwright';

const ROOT = 'https://rachnaaavartan.github.io/Rachna-aavartan/';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function visibleDateNumberCount(page) {
  return page.locator('body *').evaluateAll((els) => els.filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const t = (el.textContent || '').trim();
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && /^(?:[0-9०-९]{1,2})$/.test(t);
  }).length);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

try {
  await page.goto(`${ROOT}?audit=${Date.now()}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);

  assert(await page.title() === 'Rachna OS — Business Suite', 'Unexpected page title');
  assert(await page.locator('#page').count() === 1, 'Main page container missing');
  assert((await page.locator('#page').innerText()).trim().length > 20, 'Application page did not render');
  assert(await page.locator('#nav').count() === 1, 'Navigation container missing');

  const signInHeading = page.getByRole('heading', { name: 'Sign in to Rachna OS' });
  if (await signInHeading.count()) {
    const close = page.locator('.modal-backdrop.show .close-btn').first();
    if (await close.count()) await close.click();
  }

  await page.locator('[data-action="date-check"]').first().click();
  assert(await page.getByRole('heading', { name: 'Date Check' }).count() === 1, 'Date Check did not open');

  assert(await page.locator('.bs-date-input').count() === 1, 'External BS date input missing');
  assert(await page.locator('[data-bs-year], [data-bs-month], [data-bs-day]').count() === 0, 'Old three-select BS date picker still exists');
  await page.locator('.bs-date-input').click();
  await page.waitForTimeout(700);
  assert(await visibleDateNumberCount(page) >= 20, 'External BS calendar did not render numeric days');
  await page.locator('.modal-backdrop.show .close-btn').first().click();

  await page.locator('[data-action="quick-action"]').first().click();
  assert(await page.locator('.modal-backdrop.show').count() >= 1, 'Quick action did not open');
  await page.locator('.modal-backdrop.show .close-btn').first().click();

  const routes = await page.locator('[data-route]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-route')).filter(Boolean))]);
  for (const route of routes) {
    await page.locator(`[data-route="${route}"]`).first().click();
    await page.waitForTimeout(150);
    assert((await page.locator('#page').innerText()).trim().length > 10, `Route ${route} rendered an empty page`);
    assert((await page.locator('.modal-backdrop.show').count()) === 0, `Route ${route} unexpectedly left a modal open`);
  }

  await page.locator('[data-action="account"]').first().click();
  assert((await page.locator('.modal-backdrop.show').count()) >= 1 || /settings/i.test(await page.locator('#page').innerText()), 'Account action is not wired');
  if (await page.locator('.modal-backdrop.show').count()) await page.locator('.modal-backdrop.show .close-btn').first().click();

  assert(pageErrors.length === 0, `Uncaught page errors: ${pageErrors.join(' | ')}`);
  const badConsole = consoleErrors.filter((x) => !/favicon|net::ERR_BLOCKED_BY_CLIENT/i.test(x));
  assert(badConsole.length === 0, `Browser console errors: ${badConsole.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, routes, pageErrors, consoleErrors }));
} finally {
  await browser.close();
}
