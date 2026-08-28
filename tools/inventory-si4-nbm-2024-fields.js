#!/usr/bin/env node
'use strict';
const https=require('https'), fs=require('fs'), path=require('path');
const dates=['20240601','20240701','20240801','20240901','20241001','20241101','20241201'];
const base='https://noaa-nbm-grib2-pds.s3.amazonaws.com';
const cycle='00', lead='024';
const out=process.env.OUT||'research/si4-nbm-2024-field-inventory.json';
function get(url, attempts=3){return new Promise(resolve=>{let n=0; const go=()=>{n++; const req=https.get(url,{headers:{'User-Agent':'sundowner-intelligence-si4-research/1.0'}},res=>{let b='';res.setEncoding('utf8');res.on('data',d=>b+=d);res.on('end',()=>{if((res.statusCode>=500||res.statusCode===429)&&n<attempts)return setTimeout(go,1000*n);resolve({status:res.statusCode,body:b,attempts:n});});});req.setTimeout(20000,()=>req.destroy(new Error('timeout')));req.on('error',e=>{if(n<attempts)return setTimeout(go,1000*n);resolve({status:null,body:'',attempts:n,error:String(e.message||e)});});};go();});}
(async()=>{
 const rows=[];
 for(const d of dates){for(const suite of ['core','qmd']){
  const key=`blend.${d}/${cycle}/${suite}/blend.t${cycle}z.${suite}.f${lead}.co.grib2`;
  let r=await get(`${base}/${key}.idx`);
  if(r.status!==200) r=await get(`${base}/${key}.grib2.idx`);
  const lines=r.status===200?r.body.split(/\r?\n/).filter(Boolean):[];
  const wind=lines.filter(x=>/(GUST|WIND|WDIR|UGRD|VGRD|WIND SPEED|WIND DIRECTION)/i.test(x));
  rows.push({date:d,suite,key,index_status:r.status,index_attempts:r.attempts,index_error:r.error||null,index_line_count:lines.length,wind_lines:wind});
  console.log(JSON.stringify({date:d,suite,status:r.status,lines:lines.length,wind_lines:wind.length}));
 }}
 const normalized=[...new Set(rows.flatMap(r=>r.wind_lines.map(x=>x.replace(/^\d+:\d+:/,'').replace(/:\d{10,}:/g,':OFFSET:'))))].sort();
 const result={status:'RESEARCH_ONLY_2024_NBM_FIELD_INVENTORY',generated:new Date().toISOString(),rules:{development_year:2024,holdout_2025_loaded:false,observations_loaded:false,outcomes_loaded:false,forecast_hour:24,field_selection_not_yet_frozen:true,production_change_authorized:false},source:{provider:'NOAA National Blend of Models via NOAA Open Data AWS',base},rows,normalized_unique_wind_lines:normalized};
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
 if(!rows.some(r=>r.index_status===200&&r.wind_lines.length))process.exitCode=2;
})();
