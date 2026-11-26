'use strict';
// Repository fixtures only: Google and intake requests are mocked. No real leads.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = process.cwd();
const results = [];
const out = path.join(root, 'qa-output');
fs.mkdirSync(out, {recursive:true});
const check = (name, condition) => { assert.ok(condition, name); results.push(name); console.log('PASS '+name); };
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((req,res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.'+p+(p.endsWith('/')?'index.html':''));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404); return res.end();}
  res.writeHead(200, {'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  async function fixture(url='/', width=390) {
    const ctx=await browser.newContext({viewport:{width,height:900}});
    await ctx.addInitScript(() => { window.__SINECDO_QA__ = true; });
    let tagRequests=0, intakeRequests=0, failIntake=false;
    await ctx.route('**/*', async route => {
      const req=route.request(), u=new URL(req.url());
      if(u.hostname==='www.googletagmanager.com') {tagRequests++; return route.fulfill({status:200,contentType:'application/javascript',body:'/* mock Google tag */'});}
      if(u.hostname!=='127.0.0.1') return route.abort();
      if(u.pathname==='/api/intake.php') {
        intakeRequests++;
        const payload=JSON.parse(req.postData()||'{}');
        return route.fulfill({status:failIntake?500:200,contentType:'application/json',body:JSON.stringify(failIntake?{ok:false,code:'qa_error'}:{ok:true,request_id:payload.request_id,receipt:'REG-'+payload.request_id})});
      }
      return route.continue();
    });
    const page=await ctx.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+url,{waitUntil:'networkidle'});
    return {ctx,page,errors,tags:()=>tagRequests,intakes:()=>intakeRequests,fail:v=>{failIntake=v;}};
  }
  const eventList=p=>p.evaluate(()=>Array.from(window.dataLayer||[],x=>Array.from(x)).filter(x=>x[0]==='event'));
  async function fillRequired(p,selector) {
    await p.locator(selector).evaluate(form=>{
      for (const el of form.elements) {
        if(!el.required) continue;
        if(el.type==='checkbox') el.checked=true;
        else if(el.tagName==='SELECT') el.value=Array.from(el.options).find(o=>o.value)?.value||'';
        else el.value=el.type==='email'?'qa@example.invalid':el.type==='url'?'https://example.invalid':'QA interna';
        el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }
  let f=await fixture('/?email=private%40example.invalid&utm_source=linkedin');
  check('No Google request before consent',f.tags()===0);
  await f.page.locator('.sc-analytics-reject').click();
  check('Rejection prevents tag',f.tags()===0);
  await f.page.reload({waitUntil:'networkidle'});
  check('Rejection persists after reload',f.tags()===0 && await f.page.locator('.sc-analytics-panel').isHidden());
  await f.page.locator('.sc-analytics-settings').click(); await f.page.locator('.sc-analytics-accept').click();
  await f.page.waitForTimeout(100);
  check('One tag request after acceptance',f.tags()===1);
  const cfg=await f.page.evaluate(()=>Array.from(window.dataLayer,x=>Array.from(x)).find(x=>x[0]==='config'));
  check('Correct GA4 ID',cfg[1]==='G-L9VZZXF0ZW');
  check('Unapproved URL parameter omitted',!cfg[2].page_location.includes('email=') && cfg[2].page_location.includes('utm_source=linkedin'));
  check('Advertising features disabled',cfg[2].allow_google_signals===false && cfg[2].allow_ad_personalization_signals===false);
  await fillRequired(f.page,'#lead-form'); f.fail(true);
  await f.page.locator('#lead-form button[type=submit]').click(); await f.page.waitForTimeout(100);
  check('Failed direct submission is not a lead',!(await eventList(f.page)).some(x=>x[1]==='generate_lead'));
  f.fail(false); await f.page.locator('#lead-form button[type=submit]').click(); await f.page.waitForTimeout(100);
  check('Confirmed direct submission creates exactly one lead',(await eventList(f.page)).filter(x=>x[1]==='generate_lead').length===1);
  check('Custom event payload excludes entered PII',!JSON.stringify(await eventList(f.page)).includes('qa@example.invalid'));
  await f.page.locator('.sc-analytics-settings').click();
  await Promise.all([f.page.waitForNavigation({waitUntil:'networkidle'}),f.page.locator('.sc-analytics-reject').click()]);
  check('Consent withdrawal unloads tag',await f.page.locator('script[src*=googletagmanager]').count()===0);
  check('No uncaught application errors',f.errors.length===0);
  await f.ctx.close();
  f=await fixture('/'); await fillRequired(f.page,'#lead-form');
  await f.page.locator('#lead-form button[type=submit]').click(); await f.page.waitForTimeout(100);
  check('Form works without analytics consent',f.intakes()===1 && f.tags()===0 && (await f.page.locator('#lead-form-status').innerText()).includes('REG-'));
  await f.ctx.close();
  for(const requestContact of [false,true]) {
    f=await fixture('/quest/?lang=es'); await f.page.locator('.sc-analytics-accept').click();
    for(const name of ['need','role','timing']) {await f.page.locator('input[name='+name+']').first().check();await f.page.locator('#q-next').click();}
    await fillRequired(f.page,'#quiz-register');
    if(requestContact) await f.page.locator('#quiz-register input[name=contact_requested]').check();
    await f.page.locator('#quiz-register button[type=submit]').first().click();await f.page.waitForTimeout(100);
    const ev=await eventList(f.page);
    check('Quiz '+(requestContact?'contact request is lead':'save-only is not lead'),ev.filter(x=>x[1]==='generate_lead').length===(requestContact?1:0));
    if(!requestContact)check('Save-only has its own event',ev.some(x=>x[1]==='quiz_registration_saved'));
    check('Quiz '+requestContact+' has no JS errors',f.errors.length===0);await f.ctx.close();
  }
  for(const [url,language] of [['/','es'],['/en/','en'],['/it/','it'],['/quest/?lang=en','en'],['/quest/?lang=it','it'],['/privacy/es/','es'],['/privacy/en/','en'],['/privacy/it/','it']]) {
    f=await fixture(url);
    const expected={es:'Aceptar analítica',en:'Accept analytics',it:'Accetta analisi'}[language];
    check('Correct consent language '+url,await f.page.locator('.sc-analytics-accept').innerText()===expected);
    check('Single consent module '+url,await f.page.locator('.sc-analytics-panel').count()===1);
    await f.ctx.close();
  }
  for(const width of [360,768,1440]) {
    f=await fixture('/',width);
    const box=await f.page.locator('.sc-analytics-panel').boundingBox();
    check('Banner within viewport '+width,box && box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=900);
    await f.page.screenshot({path:path.join(out,'ga4-'+width+'.png'),fullPage:false});await f.ctx.close();
  }
  await browser.close(); server.close();
  fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify({scope:'Repository served locally; GA and intake mocked; zero production leads or GA requests',passed:results.length,tests:results},null,2));
  console.log('ALL PASSED: '+results.length);
})().catch(e=>{console.error(e);server.close();process.exit(1);});
