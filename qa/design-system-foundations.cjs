'use strict';
// Foundations-only regression against the pre-migration typography at e8eeb59.
// No external requests, production form submissions, analytics or remote writes.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { isDeepStrictEqual } = require('node:util');

const root = process.cwd();
const out = path.join(root, 'qa-output', 'foundations');
fs.mkdirSync(out, { recursive: true });
const baseline = 'e8eeb59a7cf5196071f1fd292fcced6470f6b48d';
const oldTypography = execFileSync('git', ['show', baseline + ':typography.css'], { encoding: 'utf8' });
const widths = [390, 720, 980, 1440];
const routes = ['/', '/en/', '/it/', '/quest/?lang=es', '/privacy/es/', '/privacy/en/', '/privacy/it/'];
const tests = [];
const check = (name, passed, details = '') => {
  tests.push({ name, passed: !!passed, details });
  console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed || !details ? '' : ': ' + details));
};
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400); return res.end(); }
  if (!['GET', 'HEAD'].includes(req.method) || pathname.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end('{"ok":false,"code":"not_configured"}');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.resolve(root, '.' + pathname);
  const ext = path.extname(target).toLowerCase();
  if (!target.startsWith(root + path.sep) || !types[ext] || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(target).pipe(res);
});

async function inspect(browser, origin, route, width, reference = false, reduce = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-AR', reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const errors = [];
  const missing = [];
  await context.route('**/*', async intercepted => {
    const url = new URL(intercepted.request().url());
    if (url.origin !== origin) return intercepted.abort();
    if (url.pathname.startsWith('/api/')) return intercepted.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"code":"not_configured"}' });
    if (reference && url.pathname === '/typography.css') return intercepted.fulfill({ status: 200, contentType: 'text/css', body: oldTypography });
    if (reference && url.pathname === '/assets/design-system/quiz-bridge.css') return intercepted.fulfill({ status: 200, contentType: 'text/css', body: '/* pre-migration Quiz: no bridge */' });
    return intercepted.continue();
  });
  try {
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) missing.push(response.url()); });
    const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
    if (route.startsWith('/quest/')) await page.waitForSelector('#quest-root > *');
    await page.evaluate(() => document.fonts.ready);
    const dismiss = page.locator('#language-suggestion .language-dismiss');
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    const data = await page.evaluate(() => {
      const vars = getComputedStyle(document.documentElement);
      const tokenNames = ['--sc-foundations-version', '--sc-bg-primary', '--sc-text-primary', '--sc-aqua', '--sc-text-on-aqua', '--sc-font-editorial', '--sc-weight-display', '--sc-weight-wordmark', '--sc-tracking-h1', '--sc-container-web', '--sc-container-quiz', '--sc-radius-field', '--sc-radius-card', '--sc-motion-standard', '--sc-motion-shine', '--sc-reduced-motion', '--ink'];
      const tokens = Object.fromEntries(tokenNames.map(name => [name, vars.getPropertyValue(name).trim()]));
      const selector = 'body,header,main,footer,.wrap,.nav,.brand,.hero,.hero h1,.section,.section-title,.section-lead,.eyebrow,.card,.card p,.method-card,.method-card h3,.fit-column,.diagnostic-main,.next-step,.quote-title,.button,.lead-form-shell,.form-field input,.form-field textarea,.q-header,.q-brand,.q-layout,.q-rail,.q-main,.q-main h1,.q-card,.q-primary,.q-secondary,.q-footer';
      const props = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'borderRadius', 'borderTopColor', 'borderTopWidth', 'paddingTop', 'paddingLeft', 'paddingBottom', 'paddingRight', 'gap', 'display', 'gridTemplateColumns', 'boxShadow'];
      const round = n => Math.round(n * 1000) / 1000;
      const nodes = Array.from(document.querySelectorAll(selector)).map(el => {
        const s = getComputedStyle(el), rect = el.getBoundingClientRect();
        return { tag: el.tagName, class: el.className, rect: [rect.x, rect.y, rect.width, rect.height].map(round), styles: Object.fromEntries(props.map(p => [p, s[p]])) };
      });
      const logo = document.querySelector('.brand');
      if (logo) {
        const s = getComputedStyle(logo, '::after');
        nodes.push({ tag: 'WORDMARK', styles: Object.fromEntries(props.map(p => [p, s[p]])) });
      }
      return { tokens, nodes, width: innerWidth, scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) };
    });
    let screenshot;
    if (!route.startsWith('/privacy/') && [390, 1440].includes(width) && !reduce) {
      const label = route === '/' ? 'es' : route.split('/')[1];
      screenshot = await page.screenshot({ fullPage: true, animations: 'disabled', path: path.join(out, label + '-' + width + (reference ? '-before' : '-after') + '.png') });
    }
    return { status: response.status(), errors, missing, ...data, screenshot };
  } finally { await context.close(); }
}

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true });
    for (const route of routes) {
      for (const width of widths) {
        const label = route + ' @ ' + width;
        const before = await inspect(browser, origin, route, width, true);
        const after = await inspect(browser, origin, route, width);
        check(label + ' assets available', after.status === 200 && after.missing.length === 0, JSON.stringify(after.missing));
        check(label + ' no JavaScript errors', after.errors.length === 0, after.errors.join(' | '));
        check(label + ' no horizontal overflow', after.scrollWidth <= width + 1, String(after.scrollWidth));
        const expected = { '--sc-foundations-version': '"1.0.0"', '--sc-bg-primary': '#121514', '--sc-text-primary': '#f2f0e9', '--sc-aqua': '#63e6d2', '--sc-text-on-aqua': '#10201c', '--sc-weight-display': '780', '--sc-weight-wordmark': '760', '--sc-tracking-h1': '-.055em', '--sc-container-web': '1180px', '--sc-container-quiz': '1320px', '--sc-radius-field': '13px', '--sc-radius-card': '22px', '--sc-motion-standard': '220ms', '--sc-motion-shine': '620ms', '--sc-reduced-motion': '0' };
        const wrongTokens = Object.entries(expected).filter(([key, val]) => after.tokens[key] !== val);
        check(label + ' canonical tokens resolve', wrongTokens.length === 0, JSON.stringify(wrongTokens.map(([key, expected]) => ({ key, expected, actual: after.tokens[key] }))));
        const equal = isDeepStrictEqual(before.nodes, after.nodes);
        if (!equal) fs.writeFileSync(path.join(out, 'computed-diff-' + route.split('/').filter(Boolean).join('-').replace(/[^\w-]/g, '_') + '-' + width + '.json'), JSON.stringify({ before: before.nodes, after: after.nodes }, null, 2));
        check(label + ' legacy geometry and computed styles unchanged', equal);
        if (route.startsWith('/quest/')) check(label + ' Quiz ink remains page background', after.tokens['--ink'] === '#121514');
        if (before.screenshot && after.screenshot) check(label + ' before/after pixels identical', before.screenshot.equals(after.screenshot));
      }
    }
    for (const route of ['/', '/quest/?lang=es']) {
      const after = await inspect(browser, origin, route, 390, false, true);
      check(route + ' reduced-motion tokens disable displacement/timing', after.tokens['--sc-reduced-motion'] === '1' && after.tokens['--sc-motion-standard'] === '0ms' && after.tokens['--sc-motion-shine'] === '0ms');
    }
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    const report = { baseline, scope: 'Chromium local checkout. External services and font CDN blocked. Computed styles, geometry and PNGs compared for the foundations migration only; not a redesign or live-server E2E approval.', passed: tests.filter(t => t.passed).length, failed: tests.filter(t => !t.passed).length, tests };
    fs.writeFileSync(path.join(out, 'foundations-qa.json'), JSON.stringify(report, null, 2));
  }
  const failures = tests.filter(t => !t.passed);
  if (failures.length) throw new Error(failures.length + ' foundations checks failed');
  console.log('FOUNDATIONS CHECKS PASSED: ' + tests.length);
})().catch(error => { console.error(error); process.exitCode = 1; });
