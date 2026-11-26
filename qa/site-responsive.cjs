'use strict';
// Full-page responsive smoke tests. All requests stay local; intake and analytics are never sent to production.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = process.cwd();
const out = path.join(root, 'qa-output');
fs.mkdirSync(out, { recursive: true });
const results = [];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8'
};
const check = (name, condition, details = '') => {
  assert.ok(condition, name + (details ? ': ' + details : ''));
  results.push({ name, passed: true, details });
  console.log('PASS ' + name);
};

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch (_) { res.writeHead(400); return res.end(); }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });

  async function openPage(route, width, reducedMotion = false) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
    });
    let intakeCalls = 0;
    await context.route('**/*', async requestRoute => {
      const requestUrl = new URL(requestRoute.request().url());
      if (requestUrl.origin !== origin) return requestRoute.abort();
      if (requestUrl.pathname === '/api/intake.php') {
        intakeCalls++;
        const payload = JSON.parse(requestRoute.request().postData() || '{}');
        return requestRoute.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            request_id: payload.request_id || 'qa-request',
            receipt: 'QA-NO-PRODUCTION'
          })
        });
      }
      return requestRoute.continue();
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
    return { context, page, response, pageErrors, intakeCalls: () => intakeCalls };
  }

  async function prepareVisualReview(page, label) {
    // Start keyboard testing before dismissing overlays so Tab reaches the skip link.
    await page.keyboard.press('Tab');
    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      const style = getComputedStyle(active);
      return {
        tag: active && active.tagName,
        className: active && active.className,
        focusVisible: !!active && active.matches(':focus-visible'),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor
      };
    });
    check(label + ' keyboard focus has visible indicator',
      focusState.focusVisible && focusState.outlineStyle !== 'none' && parseFloat(focusState.outlineWidth) > 0,
      JSON.stringify(focusState));
    await page.evaluate(() => document.activeElement && document.activeElement.blur());

    const languageDismiss = page.locator('#language-suggestion .language-dismiss');
    if (await languageDismiss.isVisible().catch(() => false)) {
      await languageDismiss.click();
    }
    check(label + ' language suggestion dismissed', !(await page.locator('#language-suggestion').isVisible().catch(() => false)));

    const consentPanel = page.locator('.sc-analytics-panel');
    const rejectAnalytics = page.locator('.sc-analytics-panel .sc-analytics-reject');
    if (await rejectAnalytics.isVisible().catch(() => false)) {
      await rejectAnalytics.click();
    }
    check(label + ' analytics consent panel dismissed without opt-in',
      !(await consentPanel.isVisible().catch(() => false)));
  }

  const locales = [
    { route: '/', lang: 'es', name: 'Spanish home' },
    { route: '/en/', lang: 'en', name: 'English home' },
    { route: '/it/', lang: 'it', name: 'Italian home' }
  ];
  const widths = [390, 720, 980, 1440];

  for (const locale of locales) {
    for (const width of widths) {
      const fixture = await openPage(locale.route, width);
      const { page } = fixture;
      check(locale.name + ' HTTP 200 @ ' + width, fixture.response && fixture.response.status() === 200);
      check(locale.name + ' language @ ' + width,
        (await page.locator('html').getAttribute('lang') || '').toLowerCase().startsWith(locale.lang));
      check(locale.name + ' visible H1 @ ' + width, await page.locator('h1').first().isVisible());
      check(locale.name + ' main landmark @ ' + width, await page.locator('main').count() === 1);
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      check(locale.name + ' no horizontal overflow @ ' + width,
        dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
        JSON.stringify(dimensions));
      const missingAnchors = await page.locator('a[href^="#"]').evaluateAll(links =>
        links.map(link => link.getAttribute('href'))
          .filter(href => href && href !== '#' && !document.getElementById(href.slice(1)))
      );
      check(locale.name + ' internal anchors resolve @ ' + width, missingAnchors.length === 0,
        missingAnchors.join(', '));
      check(locale.name + ' no uncaught JS errors @ ' + width, fixture.pageErrors.length === 0,
        fixture.pageErrors.join(' | '));
      await prepareVisualReview(page, locale.name + ' @ ' + width);
      if (width === 390 || width === 1440) {
        await page.screenshot({
          path: path.join(out, locale.lang + '-' + width + '.png'),
          fullPage: true,
          animations: 'disabled'
        });
      }
      await fixture.context.close();
    }
  }

  // Verify the live Quiz application renders at all target widths without calling a real endpoint.
  for (const width of widths) {
    const fixture = await openPage('/quest/?lang=es', width);
    await fixture.page.waitForSelector('#quest-root > *', { timeout: 10000 });
    check('Quiz renders @ ' + width, await fixture.page.locator('#quest-root').isVisible());
    const dimensions = await fixture.page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    check('Quiz no horizontal overflow @ ' + width,
      dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
      JSON.stringify(dimensions));
    check('Quiz no uncaught JS errors @ ' + width, fixture.pageErrors.length === 0,
      fixture.pageErrors.join(' | '));
    if (width === 390 || width === 1440) {
      await fixture.page.screenshot({
        path: path.join(out, 'quiz-' + width + '.png'),
        fullPage: true,
        animations: 'disabled'
      });
    }
    check('Quiz made no real intake calls @ ' + width, fixture.intakeCalls() === 0);
    await fixture.context.close();
  }

  // Privacy routes are static and must remain available in each locale.
  for (const route of ['/privacy/es/', '/privacy/en/', '/privacy/it/']) {
    const fixture = await openPage(route, 390);
    check('Privacy route available ' + route,
      fixture.response && fixture.response.status() === 200);
    check('Privacy route no JS errors ' + route, fixture.pageErrors.length === 0);
    await fixture.context.close();
  }

  // When Creator Partners is added to this branch, automatically include its route in the same viewport QA.
  if (fs.existsSync(path.join(root, 'creator-partners', 'index.html'))) {
    for (const width of widths) {
      const fixture = await openPage('/creator-partners/', width);
      check('Creator Partners HTTP 200 @ ' + width,
        fixture.response && fixture.response.status() === 200);
      check('Creator Partners visible H1 @ ' + width,
        await fixture.page.locator('h1').first().isVisible());
      const dimensions = await fixture.page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      check('Creator Partners no horizontal overflow @ ' + width,
        dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
        JSON.stringify(dimensions));
      check('Creator Partners no uncaught JS errors @ ' + width, fixture.pageErrors.length === 0);
      check('Creator Partners made no real intake calls @ ' + width, fixture.intakeCalls() === 0);
      if (width === 390 || width === 1440) {
        await fixture.page.screenshot({
          path: path.join(out, 'creator-partners-' + width + '.png'),
          fullPage: true,
          animations: 'disabled'
        });
      }
      await fixture.context.close();
    }
  } else {
    results.push({ name: 'Creator Partners route not yet present', passed: true, details: 'Conditional coverage will activate when creator-partners/index.html is added.' });
    console.log('INFO Creator Partners route not yet present; conditional QA will activate when implemented.');
  }

  const reduced = await openPage('/', 390, true);
  const scrollBehavior = await reduced.page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  check('Reduced motion disables smooth scrolling', scrollBehavior === 'auto', scrollBehavior);
  await reduced.context.close();

  await browser.close();
  await new Promise(resolve => server.close(resolve));
  const report = {
    scope: 'Local checkout only. Third-party requests blocked. Intake mocked. No production leads, emails, CRM writes or analytics.',
    widths,
    passed: results.filter(result => result.passed).length,
    failed: 0,
    tests: results
  };
  fs.writeFileSync(path.join(out, 'responsive-qa.json'), JSON.stringify(report, null, 2));
  console.log('ALL RESPONSIVE CHECKS PASSED: ' + report.passed);
})().catch(error => {
  console.error(error);
  server.close();
  process.exit(1);
});
