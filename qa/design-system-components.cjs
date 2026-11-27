'use strict';
// Local checkout only. External requests and every API request are blocked.
// Tests actual interactions; no production leads, analytics or emails.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = process.cwd();
const out = path.join(root, 'qa-output', 'components');
fs.mkdirSync(out, { recursive: true });
const tests = [];
const check = (name, passed, details = '') => {
  tests.push({ name, passed: !!passed, details });
  console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ': ' + details));
};
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400); return res.end(); }
  if (!['GET', 'HEAD'].includes(req.method) || pathname.startsWith('/api/')) { res.writeHead(503); return res.end('not_configured'); }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep) || !mime[path.extname(target)] || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(target)], 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(target).pipe(res);
});
const style = (locator, prop) => locator.evaluate((node, key) => getComputedStyle(node)[key], prop);
const settle = page => page.waitForTimeout(260);
const widths = [390, 720, 980, 1440];
let browser, origin;
async function open(route, width = 1440, options = {}) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, locale: 'es-AR', ...options });
  const violations = [], errors = [];
  await context.route('**/*', intercepted => {
    const url = new URL(intercepted.request().url());
    if (url.origin !== origin) {
      if (/google-analytics|googletagmanager|script\.google/.test(url.hostname)) violations.push(url.hostname);
      return intercepted.abort();
    }
    if (url.pathname.startsWith('/api/') || intercepted.request().method() !== 'GET') {
      violations.push(url.pathname);
      return intercepted.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"code":"not_configured"}' });
    }
    return intercepted.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
  check(route + ' HTTP 200 @ ' + width, response && response.status() === 200);
  const dismiss = page.locator('#language-suggestion .language-dismiss');
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  return { context, page, violations, errors };
}
async function finish(f, label) {
  check(label + ' no JS errors', f.errors.length === 0, f.errors.join(' | '));
  check(label + ' no API/analytics attempts', f.violations.length === 0, f.violations.join(' | '));
  check(label + ' no horizontal overflow', await f.page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1));
  await f.context.close();
}
async function keyboardFocus(page, locator) {
  await page.keyboard.press('Tab');
  await locator.focus();
  await settle(page);
  return locator.evaluate(el => ({ visible: el.matches(':focus-visible'), outline: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true });
    for (const route of ['/', '/en/', '/it/']) {
      for (const width of widths) {
        const f = await open(route, width), { page } = f;
        const label = route + ' @ ' + width;
        check(label + ' component layer loaded', await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sc-components-version').trim()) === '"1.0.0"');
        const cta = page.locator('.hero-actions .button').first();
        const focus = await keyboardFocus(page, cta);
        check(label + ' button keyboard focus visible', focus.visible && focus.outline === 'solid' && focus.width >= 2, JSON.stringify(focus));
        await cta.evaluate(el => el.blur());
        await cta.hover(); await settle(page);
        const hover = await style(cta, 'transform');
        check(label + ' button hover lifts 2px', hover === 'matrix(1, 0, 0, 1, 0, -2)', hover);
        const box = await cta.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down(); await settle(page);
        const pressed = await style(cta, 'transform');
        check(label + ' pressed state responds', pressed.includes('0.99'), pressed);
        // Release outside the link: do not navigate or submit anything.
        await page.mouse.move(0, 0); await page.mouse.up(); await settle(page);
        const nav = page.locator('.nav-links a[href]:not(.button)').first();
        if (await nav.isVisible()) {
          await nav.hover(); await settle(page);
          check(label + ' navigation aqua underline', (await style(nav, 'textDecorationLine')).includes('underline') && await style(nav, 'textDecorationColor') === 'rgb(99, 230, 210)');
        }
        const field = page.locator('.form-field input[type="email"]').first();
        check(label + ' field not marked invalid on load', await style(field, 'borderTopColor') !== 'rgb(217, 123, 95)');
        const fieldFocus = await keyboardFocus(page, field);
        check(label + ' input keyboard focus visible', fieldFocus.visible && fieldFocus.width >= 2 && await style(field, 'borderTopColor') === 'rgb(99, 230, 210)');
        await field.fill('not-an-email'); await field.blur(); await settle(page);
        check(label + ' interacted invalid email gets error border', await style(field, 'borderTopColor') === 'rgb(217, 123, 95)');
        await field.fill('qa@example.invalid'); await field.blur(); await settle(page);
        check(label + ' corrected email clears error border', await style(field, 'borderTopColor') !== 'rgb(217, 123, 95)');
        await field.evaluate(el => { el.disabled = true; });
        check(label + ' disabled field cursor', await style(field, 'cursor') === 'not-allowed');
        await field.evaluate(el => { el.disabled = false; el.value = ''; });
        const submit = page.locator('#lead-form button[type="submit"]');
        await submit.evaluate(el => { el.disabled = true; }); await settle(page);
        check(label + ' native disabled submit', await submit.isDisabled() && await style(submit, 'cursor') === 'not-allowed');
        await submit.evaluate(el => { el.disabled = false; });
        if ([390, 1440].includes(width)) {
          await keyboardFocus(page, field);
          await page.locator('.lead-form-shell').screenshot({ path: path.join(out, (route === '/' ? 'es' : route.split('/')[1]) + '-form-focus-' + width + '.png'), animations: 'disabled' });
          await field.blur();
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(out, (route === '/' ? 'es' : route.split('/')[1]) + '-page-' + width + '.png'), fullPage: true, animations: 'disabled' });
        }
        await finish(f, label);
      }
    }
    for (const lang of ['es', 'en', 'it']) {
      for (const width of [390, 1440]) {
        const f = await open('/quest/?lang=' + lang, width), { page } = f;
        const radio = page.locator('.q-card input').first();
        await radio.check(); await settle(page);
        const selected = page.locator('.q-card:has(input:checked)').first();
        check('Quiz ' + lang + ' selected state @ ' + width, await style(selected, 'backgroundColor') === 'rgba(99, 230, 210, 0.12)');
        await keyboardFocus(page, radio);
        check('Quiz ' + lang + ' option keyboard ring @ ' + width, await style(selected, 'outlineStyle') === 'solid');
        await page.locator('.q-main').screenshot({ path: path.join(out, 'quiz-' + lang + '-selected-' + width + '.png'), animations: 'disabled' });
        await finish(f, 'Quiz ' + lang + ' @ ' + width);
      }
    }
    for (const route of ['/', '/quest/?lang=es']) {
      const f = await open(route, 390, { reducedMotion: 'reduce' });
      const button = f.page.locator(route === '/' ? '.hero-actions .button' : '.q-primary').first();
      await button.hover(); await settle(f.page);
      check(route + ' reduced motion removes displacement', await style(button, 'transform') === 'none');
      check(route + ' reduced motion removes transition', await style(button, 'transitionDuration') === '0s');
      await finish(f, route + ' reduced motion');
    }
    const touch = await open('/', 390, { isMobile: true, hasTouch: true });
    const touchButton = touch.page.locator('.hero-actions .button').first();
    await touchButton.hover(); await settle(touch.page);
    check('Touch does not inherit sticky hover movement', await style(touchButton, 'transform') === 'none');
    await finish(touch, 'Touch');

    // Opt-in primitives tested in an isolated fixture, not a new public route.
    const f = await open('/');
    await f.page.evaluate(() => {
      const fixture = document.createElement('section');
      fixture.id = 'component-fixture';
      fixture.innerHTML = '<button class="sc-button" id="fixture-button" type="button">Evaluar oportunidad</button><button class="sc-button" id="fixture-disabled" type="button" disabled>Deshabilitado</button><div class="sc-field"><label for="fixture-input">Especialidad</label><input id="fixture-input" placeholder="Tu especialidad"><p class="sc-field-help">Campo de prueba local, sin envío.</p></div><a class="sc-card" id="fixture-card" href="#component-fixture">Explorar el proceso</a>';
      fixture.style.cssText = 'max-width:640px;margin:60px auto;display:grid;gap:24px;padding:32px';
      document.body.appendChild(fixture);
    });
    const primitive = f.page.locator('#fixture-button');
    check('Reusable button canonical color and weight', await style(primitive, 'backgroundColor') === 'rgb(99, 230, 210)' && await style(primitive, 'fontWeight') === '690');
    check('Reusable field canonical height and radius', await style(f.page.locator('#fixture-input'), 'minHeight') === '50px' && await style(f.page.locator('#fixture-input'), 'borderRadius') === '13px');
    const card = f.page.locator('#fixture-card');
    await card.hover(); await settle(f.page);
    check('Interactive card lift and shadow', await style(card, 'transform') === 'matrix(1, 0, 0, 1, 0, -2)' && await style(card, 'boxShadow') !== 'none');
    const staticCard = f.page.locator('.card:not(a):not(button)').first();
    await staticCard.hover(); await settle(f.page);
    check('Informational card not falsely interactive', await style(staticCard, 'cursor') !== 'pointer' && await style(staticCard, 'transform') === 'none');
    await f.page.locator('#component-fixture').screenshot({ path: path.join(out, 'reusable-primitives.png'), animations: 'disabled' });
    await finish(f, 'Primitives');
  } catch (error) {
    check('Component test execution', false, error.stack || String(error));
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    const report = { scope: 'Chromium, local checkout. Font CDN and all external/API traffic blocked. Interaction QA, not live deployment or full WCAG certification.', passed: tests.filter(t => t.passed).length, failed: tests.filter(t => !t.passed).length, tests };
    fs.writeFileSync(path.join(out, 'components-qa.json'), JSON.stringify(report, null, 2));
    console.log('COMPONENT CHECKS: ' + report.passed + ' passed, ' + report.failed + ' failed');
    if (report.failed) process.exitCode = 1;
  }
})();
