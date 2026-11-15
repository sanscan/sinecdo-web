'use strict';
// One technical QA visit only. No form submissions or generate_lead events.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext();
 await ctx.addInitScript(()=>{
   window.dataLayer=[];
   window.gtag=function(){window.dataLayer.push(arguments);};
   window.gtag('set',{debug_mode:true,traffic_type:'internal',qa_check:'sinecdo_ga4_installation'});
 });
 await ctx.route('**/api/intake.php',r=>r.abort());
 const page=await ctx.newPage();
 const requests=[];
 page.on('request',r=>{const u=new URL(r.url());if(u.hostname.endsWith('google-analytics.com')||u.hostname==='www.googletagmanager.com')requests.push(r.url());});
 await page.goto('https://sinecdo.com/?utm_source=qa&utm_medium=internal&utm_campaign=ga4_installation_check',{waitUntil:'networkidle',timeout:45000});
 if(requests.length)throw Error('Google measurement request observed before consent');
 const received=page.waitForResponse(r=>{
   const u=new URL(r.url());
   return u.hostname.endsWith('google-analytics.com') && u.pathname.includes('/collect') && u.searchParams.get('tid')==='G-L9VZZXF0ZW';
 },{timeout:45000});
 await page.locator('.sc-analytics-accept').click();
 const response=await received;
 const url=new URL(response.url());
 const q=url.searchParams;
 const report={scope:'One live QA visit, debug_mode and internal traffic set; no lead or CRM submission',url:'https://sinecdo.com/',measurement_id:q.get('tid'),event:q.get('en'),http_status:response.status(),collector:url.hostname,debug_flag:q.get('_dbg'),observed_at:new Date().toISOString(),note:'Collector acceptance is not independent proof of GA4 report ingestion or filter settings.'};
 if(!response.ok())throw Error('GA4 collector HTTP '+response.status());
 fs.mkdirSync('qa-output',{recursive:true});fs.writeFileSync('qa-output/live-collector.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
