"use strict";

const fs=require("fs");
const path=require("path");

const BASE="https://noaa-rrfs-pds.s3.amazonaws.com";
const OUT=process.env.OUT||"research/si4-rrfs-f24-probe.json";
const TIMEOUT_MS=Number(process.env.PROBE_TIMEOUT_MS||20000);
const CASES=[
  {date:"20240502",cycle:"12"},
  {date:"20240512",cycle:"12"},
];
const FXX="024";
const PRESSURE_FIELDS=["UGRD","VGRD","TMP","HGT","RH"];
const PRESSURE_LEVELS=[925,850,700,600,500];
const SURFACE_PATTERNS=[/GUST:surface:/,/UGRD:10 m above ground:/,/VGRD:10 m above ground:/];
// RRFS retrospective naming predates the final operational convention. Probe only
// documented/observed product-name variants and preserve a 404 as missing data.
const SURFACE_PRODUCTS=["2dfld","2dfld.3km","natlev","natlev.3km"];

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function request(url,{method="GET",attempts=3}={}){
  let last;
  for(let i=0;i<attempts;i++){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
    try{
      const r=await fetch(url,{method,signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-RRFS-F24-Probe/1.1"}});
      const text=method==="HEAD"?"":await r.text();
      if(r.ok||r.status<500)return {ok:r.ok,status:r.status,headers:Object.fromEntries(r.headers.entries()),text,url};
      last={ok:false,status:r.status,headers:Object.fromEntries(r.headers.entries()),text,url};
    }catch(e){last={ok:false,status:0,error:String(e),url};}
    finally{clearTimeout(timer);}
    if(i+1<attempts)await sleep(500*(2**i));
  }
  return last;
}
function keyFor(c,product){return `retro_output_final/spring/rrfs.${c.date}/${c.cycle}/rrfs.t${c.cycle}z.${product}.f${FXX}.conus.grib2`;}
function parseIdx(text){return String(text||"").split(/\r?\n/).filter(Boolean);}
function pressureMatches(lines){
  const wanted=[];
  for(const level of PRESSURE_LEVELS){for(const field of PRESSURE_FIELDS){wanted.push(`${field}:${level} mb:`);}}
  const found={};
  for(const token of wanted)found[token]=lines.filter(x=>x.includes(token));
  return found;
}
function surfaceMatches(lines){
  const labels=["GUST:surface:","UGRD:10 m above ground:","VGRD:10 m above ground:"];
  const found={};
  labels.forEach((label,i)=>found[label]=lines.filter(x=>SURFACE_PATTERNS[i].test(x)));
  return found;
}
function headMeta(h){return {ok:h.ok,status:h.status,etag:(h.headers?.etag||null)?.replace(/^\"|\"$/g,""),content_length:Number(h.headers?.["content-length"]||0)||null,last_modified:h.headers?.["last-modified"]||null,url:h.url};}
async function inspectObject(key,kind){
  const url=`${BASE}/${key}`;
  const [head,idx]=await Promise.all([request(url,{method:"HEAD"}),request(`${url}.idx`)]);
  const lines=parseIdx(idx.text);
  const matches=kind==="pressure"?pressureMatches(lines):surfaceMatches(lines);
  return {key,kind,head:headMeta(head),idx:{ok:idx.ok,status:idx.status,url:idx.url,line_count:lines.length,etag:(idx.headers?.etag||null)?.replace(/^\"|\"$/g,"")},matches};
}
function surfaceObjectComplete(x){return x.head.ok&&x.idx.ok&&Object.values(x.matches).every(v=>v.length>=1);}
async function inspectSurface(c){
  const attempts=[];
  for(const product of SURFACE_PRODUCTS){
    const x=await inspectObject(keyFor(c,product),"surface");
    attempts.push(x);
    if(surfaceObjectComplete(x))return {...x,selected_product:product,candidate_attempts:attempts.map(a=>({key:a.key,head_status:a.head.status,idx_status:a.idx.status}))};
  }
  const last=attempts[attempts.length-1];
  return {...last,selected_product:null,candidate_attempts:attempts.map(a=>({key:a.key,head_status:a.head.status,idx_status:a.idx.status}))};
}
async function main(){
  const rows=[];
  for(const c of CASES){
    const pressure=await inspectObject(keyFor(c,"prslev"),"pressure");
    const surface=await inspectSurface(c);
    rows.push({case:c,forecast_hour:Number(FXX),valid_time_utc:new Date(Date.UTC(Number(c.date.slice(0,4)),Number(c.date.slice(4,6))-1,Number(c.date.slice(6,8)),Number(c.cycle))+24*3600e3).toISOString(),pressure,surface});
  }
  const pressureComplete=rows.every(r=>r.pressure.head.ok&&r.pressure.idx.ok&&Object.values(r.pressure.matches).every(v=>v.length>=1));
  const surfaceComplete=rows.every(r=>surfaceObjectComplete(r.surface));
  const out={
    generated:new Date().toISOString(),
    status:"RESEARCH_ONLY_SHADOW_GUIDANCE",
    purpose:"Availability/provenance gate for exact fixed-24h deterministic RRFS retrospective inputs; no model scoring.",
    source:{provider:"NOAA Open Data Dissemination",bucket:"s3://noaa-rrfs-pds/",lane:"retro_output_final/spring/",surface_product_candidates:SURFACE_PRODUCTS},
    rules:{forecast_hour_fixed:24,cases_predeclared_2024_only:true,future_observations_label_only:true,model_tuning_from_2025_forbidden:true,missing_files_remain_missing:true,rrfs_shadow_only:true,product_name_probe_only_no_science_change:true},
    required:{pressure_fields:PRESSURE_FIELDS,pressure_levels_hpa:PRESSURE_LEVELS,surface_fields:["GUST","UGRD 10m","VGRD 10m"]},
    summary:{cases:rows.length,pressure_complete:pressureComplete,surface_complete:surfaceComplete,all_complete:pressureComplete&&surfaceComplete},
    rows
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(out.summary,null,2));
  if(!out.summary.all_complete)process.exitCode=2;
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
