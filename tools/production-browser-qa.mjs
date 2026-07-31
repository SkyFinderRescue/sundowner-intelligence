import { chromium } from 'playwright-core';
import fs from 'fs';
const URL='https://skyfinderrescue.github.io/sundowner-intelligence/';
const CHROME=process.env.CHROME_PATH||'/usr/bin/google-chrome';
async function runCase(name,viewport){
 const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewportSize:viewport});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const result={name,viewport,url:URL};
 try{
  const r=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000}); result.http_status=r?.status()||null;
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('Live forecast complete'),null,{timeout:120000});
  result.status_text=await page.locator('#status').innerText();
  result.howto_text=(await page.locator('#howto').innerText()).replace(/\s+/g,' ').trim();
  for(const expected of ['1. Let the data load.','2. Pick an area.','3. Read the forecast.'])if(!result.howto_text.includes(expected))throw Error(`How-to guide missing: ${expected}`);
  result.zone_cards=await page.locator('.card').count(); if(result.zone_cards!==8)throw Error(`Expected 8 zone cards, got ${result.zone_cards}`);
  result.zone_polygons=await page.locator('#map path.leaflet-interactive').count(); if(result.zone_polygons<8)throw Error(`Expected >=8 zone polygons, got ${result.zone_polygons}`);
  result.contact_text=(await page.locator('#contact').innerText()).replace(/\s+/g,' ').trim(); if(!result.contact_text.includes('Questions or comments?')||!result.contact_text.includes('sky.bonillo@gmail.com'))throw Error(`Contact line incorrect: ${result.contact_text}`);
  result.contact_href=await page.locator('#contact a').getAttribute('href'); if(result.contact_href!=='mailto:sky.bonillo@gmail.com')throw Error(`Contact mailto incorrect: ${result.contact_href}`);
  result.calibration_tabs=await page.locator('button[data-view="calibration"]').count(); if(result.calibration_tabs!==0)throw Error('Calibration is still exposed in primary navigation');
  await page.locator('.card').first().click(); await page.waitForTimeout(250); result.focus_title=await page.locator('#focusTitle').innerText(); if(!result.focus_title||/County overview/i.test(result.focus_title))throw Error('Zone click did not update sidebar');
  await page.locator('button[data-view="stations"]').click(); await page.waitForTimeout(150); result.station_rows=await page.locator('#stationRows tr').count(); if(result.station_rows<1)throw Error('Stations view empty');
  const artifacts=await page.evaluate(async()=>{const [c,e,h]=await Promise.all([fetch('./calibration.json',{cache:'no-store'}).then(r=>r.json()),fetch('./data/known-sundowner-events.json',{cache:'no-store'}).then(r=>r.json()),fetch('./data/historical-event-reconstructions.json',{cache:'no-store'}).then(r=>r.json())]);return{version:c.version||'',known:Array.isArray(e.events)?e.events.length:0,reconstructed:Number(h.reconstructed||0)}});
  result.calibration_version=artifacts.version; if(!result.calibration_version.startsWith('SI-3.1-cal-'))throw Error(`Production calibration is not fitted: ${result.calibration_version}`);
  result.known_events=artifacts.known; if(result.known_events<47)throw Error(`Expected >=47 curated documented events, got ${result.known_events}`);
  result.reconstructed_events=artifacts.reconstructed; if(result.reconstructed_events<57)throw Error(`Expected >=57 reconstructed historical events/IOPs, got ${result.reconstructed_events}`);
  await page.locator('button[data-view="health"]').click(); result.health_rows=await page.locator('#healthList .healthrow').count(); if(result.health_rows<5)throw Error(`Insufficient Data Health rows: ${result.health_rows}`);
  await page.locator('button[data-view="forecast"]').click(); await page.waitForTimeout(100); result.horizontal_overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2); if(result.horizontal_overflow)throw Error('Horizontal viewport overflow detected');
  result.console_errors=errors; if(errors.length)throw Error(`Browser console/page errors: ${errors.slice(0,5).join(' | ')}`);
  result.pass=true; await page.screenshot({path:`validation/${name}.png`,fullPage:true});
 }catch(e){result.pass=false;result.error=String(e?.stack||e);result.console_errors=errors;try{await page.screenshot({path:`validation/${name}-failure.png`,fullPage:true})}catch{}}
 await browser.close(); return result;
}
fs.mkdirSync('validation',{recursive:true});
const desktop=await runCase('production-desktop',{width:1440,height:1000});
const mobile=await runCase('production-mobile',{width:390,height:844});
const out={checked_at:new Date().toISOString(),url:URL,chrome:CHROME,desktop,mobile,pass:desktop.pass&&mobile.pass};
fs.writeFileSync('validation/browser-qa-status.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
if(!out.pass)process.exit(1);
