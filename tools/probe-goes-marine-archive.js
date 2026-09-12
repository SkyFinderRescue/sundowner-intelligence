"use strict";

// Research-only NOAA GOES-18 ABI archive probe for SI-4 marine-layer work.
// This script lists only predeclared archive prefixes and verifies that the
// required nighttime-microphysics source bands (7, 13, 15) are available.
// It does not read future verifying imagery, does not create labels, and does
// not alter any SI-4/production model coefficient.

const fs = require("fs");

const BUCKET = "https://noaa-goes18.s3.amazonaws.com";
const PRODUCT = "ABI-L1b-RadC";
const BANDS = [7, 13, 15];
const OUT = process.env.OUT || "research/goes-marine-archive-probe.json";
const TIMES = (process.env.GOES_PROBE_TIMES || "2024-04-01T00:00:00Z,2024-07-15T00:00:00Z,2025-04-01T00:00:00Z,2025-07-15T00:00:00Z")
  .split(",").map(s=>s.trim()).filter(Boolean);

function dayOfYear(d){
  const y=d.getUTCFullYear();
  const start=Date.UTC(y,0,1);
  return String(Math.floor((Date.UTC(y,d.getUTCMonth(),d.getUTCDate())-start)/86400000)+1).padStart(3,"0");
}
function prefixFor(d){
  return `${PRODUCT}/${d.getUTCFullYear()}/${dayOfYear(d)}/${String(d.getUTCHours()).padStart(2,"0")}/`;
}
function decodeXml(s){
  return s.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&#39;", "'");
}
function keysFromXml(xml){
  return [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map(m=>decodeXml(m[1]));
}
function bandFromKey(key){
  const m=String(key).match(/M\dC(\d{2})_/);
  return m?Number(m[1]):null;
}
function scanStartFromKey(key){
  const m=String(key).match(/_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})/);
  if(!m)return null;
  const [,year,doy,hh,mm,ss]=m;
  const dt=new Date(Date.UTC(Number(year),0,1,Number(hh),Number(mm),Number(ss))+(Number(doy)-1)*86400000);
  return dt.toISOString();
}
async function getText(url, attempts=3){
  let last;
  for(let i=0;i<attempts;i++){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),30000);
    try{
      const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-GOES-Research/1.0"}});
      clearTimeout(timer);
      if(!r.ok)throw Error(`${r.status} ${r.statusText}`);
      return await r.text();
    }catch(e){
      clearTimeout(timer);last=e;
      if(i+1<attempts)await new Promise(resolve=>setTimeout(resolve,1000*(i+1)));
    }
  }
  throw last;
}
async function listPrefix(prefix){
  const url=`${BUCKET}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`;
  return keysFromXml(await getText(url));
}
function nearestByBand(keys,target){
  const targetMs=target.getTime();
  const out={};
  for(const band of BANDS){
    const candidates=keys.filter(k=>bandFromKey(k)===band).map(key=>({key,start:scanStartFromKey(key)})).filter(x=>x.start);
    candidates.sort((a,b)=>Math.abs(new Date(a.start)-targetMs)-Math.abs(new Date(b.start)-targetMs));
    const best=candidates[0]||null;
    out[`C${String(band).padStart(2,"0")}`]=best?{...best,delta_minutes:Math.abs(new Date(best.start)-targetMs)/60000}:null;
  }
  return out;
}

(async()=>{
  const rows=[];
  for(const raw of TIMES){
    const target=new Date(raw);
    if(!Number.isFinite(target.getTime()))throw Error(`invalid probe time ${raw}`);
    const prefix=prefixFor(target);
    const keys=await listPrefix(prefix);
    const bands=nearestByBand(keys,target);
    const missing=BANDS.filter(b=>!bands[`C${String(b).padStart(2,"0")}`]);
    rows.push({target_time:target.toISOString(),prefix,key_count:keys.length,bands,missing_bands:missing});
  }
  const failures=rows.filter(r=>r.missing_bands.length||Object.values(r.bands).some(x=>!x||x.delta_minutes>20));
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    source:{provider:"NOAA/NESDIS/NCEI",bucket:BUCKET,product:PRODUCT,satellite:"GOES-18",required_bands:BANDS},
    rules:{future_observation_leakage:false,fire_outcome_used:false,model_coefficients_changed:false,probe_only:true,max_nearest_scan_minutes:20},
    rows,failures:failures.map(r=>({target_time:r.target_time,missing_bands:r.missing_bands}))
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({targets:rows.length,failures:out.failures,availability:rows.map(r=>({target_time:r.target_time,bands:r.bands}))},null,2));
  if(failures.length)process.exit(2);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
