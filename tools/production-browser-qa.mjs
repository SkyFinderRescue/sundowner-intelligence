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
  result.zone_cards=await page.locator('.card').count(); if(result.zone_cards!==8)throw Error(`Expected 8 zone cards, got ${result.zone_cards}`);
  result.zone_polygons=await page.locator('#map path.leaflet-interactive').count(); if(result.zone_polygons<8)throw Error(`Expected >=8 zone polygons, got ${result.zone_polygons}`);
  await page.locator('.card').first().click(); await page.waitForTimeout(250); result.focus_title=await page.locator('#focusTitle').innerText(); if(!result.focus_title||/County overview/i.test(result.focus_title))throw Error('Zone click did not update sidebar');
  await page.locator('button[data-view="stations"]').click(); await page.waitForTimeout(150); result.station_rows=await page.locator('#stationRows tr').count(); if(result.station_rows<1)throw Error('Stations view empty');
  await page.locator('button[data-view="calibration"]').click(); result.calibration_version=(await page.locator('#calVersion').innerText()).trim(); if(!result.calibration_version.startsWith('SI-3.1-cal-'))throw Error(`Production calibration is not fitted: ${result.calibration_version}`);
  result.known_events=Number((await page.locator('#eventCount').innerText()).trim()); if(result.known_events<57)throw Error(`Expected >=57 documented event records, got ${result.known_events}`);
  await page.locator('button[data-view="health"]').click(); result.health_rows=await page.locator('#healthList .healthrow').count(); if(result.health_rows<5)throw Error(`Insufficient Data Health rows: ${result.health_rows}`);
  await page.locator('button[data-view="forecast"]').click(); await page.waitForTimeout(100); result.horizontal_overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2); if(result.horizontal_overflow)throw Error('Horizontal viewport overflow detected');
  result.console_errors=errors;
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
