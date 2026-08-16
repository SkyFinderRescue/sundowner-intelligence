"use strict";

const fs=require("fs");
const path=require("path");
const OUT=process.env.OUT||"research/ndfd-ncss-probe.json";
const BASE="https://www.ncei.noaa.gov/thredds";
const REL="model-ndfd-file/access/202401/20240114/YBUZ98_KWBN_202401140050";
const URLS={
  catalog:`${BASE}/catalog/model-ndfd-file/access/202401/20240114/catalog.xml`,
  http_file:`${BASE}/fileServer/${REL}`,
  opendap_dds:`${BASE}/dodsC/${REL}.dds`,
  ncss_capabilities:`${BASE}/ncss/${REL}?req=capabilities`,
  ncss_dataset:`${BASE}/ncss/${REL}/dataset.xml`
};

async function probe(name,url){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
  try{
    const r=await fetch(url,{signal:ctl.signal,redirect:"follow",headers:{"User-Agent":"Sundowner-Intelligence-SI4-NDFD-Research/1.0","Range":name==="http_file"?"bytes=0-2047":undefined}});
    const ct=r.headers.get("content-type")||"";
    const buf=Buffer.from(await r.arrayBuffer());
    clearTimeout(timer);
    return{name,url,status:r.status,ok:r.ok,final_url:r.url,content_type:ct,bytes_received:buf.length,content_range:r.headers.get("content-range"),content_length:r.headers.get("content-length"),excerpt:/text|xml|json|html/i.test(ct)?buf.toString("utf8",0,Math.min(buf.length,12000)):buf.subarray(0,64).toString("hex")};
  }catch(e){clearTimeout(timer);return{name,url,ok:false,error:String(e.message||e)};}
}

(async()=>{
  const results=[];
  for(const [name,url] of Object.entries(URLS))results.push(await probe(name,url));
  const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),purpose:"Probe official NCEI THREDDS/NCSS access for the exact NDFD source file already validated against the NOAA Open Data archive. A usable subset service would reduce full-year benchmark transfer while preserving authoritative source identity.",aws_equivalent_key:"wmo/wdir/2024/01/14/YBUZ98_KWBN_202401140050",results,rules:{production_change:false,source_identity_must_match:true,no_model_change:true,future_observation_leakage:false}};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(results.map(r=>({name:r.name,status:r.status,ok:r.ok,final_url:r.final_url,content_type:r.content_type,bytes_received:r.bytes_received,content_range:r.content_range,excerpt:(r.excerpt||"").slice(0,1000)})),null,2));
  if(!results.find(r=>r.name==="catalog")?.ok)throw Error("NCEI THREDDS catalog unavailable");
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
