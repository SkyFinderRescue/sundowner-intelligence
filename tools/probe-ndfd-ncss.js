"use strict";

const fs=require("fs");
const path=require("path");
const OUT=process.env.OUT||"research/ndfd-ncss-probe.json";
const BASE="https://www.ncei.noaa.gov/thredds";
const FILENAME=process.env.FILENAME||"YBUZ98_KWBN_202401140050";
const WMO=FILENAME.split("_",1)[0];
const CATALOG=`${BASE}/catalog/model-ndfd-file/access/202401/20240114/catalog.xml`;

async function get(url,opts={}){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
  try{
    const r=await fetch(url,{signal:ctl.signal,redirect:"follow",headers:{"User-Agent":"Sundowner-Intelligence-SI4-NDFD-Research/1.2",...(opts.headers||{})}});
    const ct=r.headers.get("content-type")||"";
    const buf=Buffer.from(await r.arrayBuffer());
    clearTimeout(timer);
    return{url,status:r.status,ok:r.ok,final_url:r.url,content_type:ct,bytes_received:buf.length,content_range:r.headers.get("content-range"),content_length:r.headers.get("content-length"),body:buf};
  }catch(e){clearTimeout(timer);return{url,ok:false,error:String(e.message||e),body:Buffer.alloc(0)};}
}
function textSummary(name,r){
  const textual=/text|xml|json|html/i.test(r.content_type||"");
  return{name,url:r.url,status:r.status,ok:r.ok,final_url:r.final_url,content_type:r.content_type,bytes_received:r.bytes_received,content_range:r.content_range,content_length:r.content_length,error:r.error,excerpt:textual?r.body.toString("utf8",0,Math.min(r.body.length,3000)):r.body.subarray(0,64).toString("hex")};
}
function unescapeXml(s){return String(s).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function attrs(tag){
  const out={}; const re=/([:\w-]+)=["']([^"']*)["']/g; let m;
  while((m=re.exec(tag)))out[m[1]]=unescapeXml(m[2]);
  return out;
}
function datasetTags(xml){return xml.match(/<dataset\b[^>]*>/gi)||[];}
function candidates(xml){
  const tags=datasetTags(xml).map(t=>({tag:t,...attrs(t)}));
  const exact=tags.filter(x=>x.name===FILENAME||x.urlPath?.endsWith("/"+FILENAME)||x.urlPath===FILENAME);
  const wmo=tags.filter(x=>(x.name||"").includes(WMO)||(x.urlPath||"").includes(WMO)).slice(0,50);
  const kwbn=tags.filter(x=>(x.name||"").includes("KWBN_20240114")||(x.urlPath||"").includes("KWBN_20240114")).slice(0,100);
  return{exact,wmo,kwbn};
}

(async()=>{
  const catalog=await get(CATALOG);
  if(!catalog.ok)throw Error(`NCEI THREDDS catalog unavailable: ${catalog.status||catalog.error}`);
  const xml=catalog.body.toString("utf8");
  const found=candidates(xml);
  const chosen=found.exact[0]||found.wmo.find(x=>x.urlPath)||null;
  const resolved=chosen?.urlPath||null;
  const results=[textSummary("catalog",catalog)];
  if(resolved){
    const encPath=resolved.split("/").map(encodeURIComponent).join("/");
    const urls={
      http_file:`${BASE}/fileServer/${encPath}`,
      opendap_dds:`${BASE}/dodsC/${encPath}.dds`,
      ncss_capabilities:`${BASE}/ncss/grid/${encPath}?req=capabilities`,
      ncss_dataset:`${BASE}/ncss/grid/${encPath}/dataset.xml`
    };
    for(const [name,url] of Object.entries(urls))results.push(textSummary(name,await get(url,name==="http_file"?{headers:{Range:"bytes=0-2047"}}:{})));
  }
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),
    purpose:"Resolve NCEI THREDDS NDFD dataset naming from the authoritative catalog. If the exact AWS object name is absent, inspect same-WMO catalog entries rather than guessing an internal urlPath.",
    filename:FILENAME,wmo_heading:WMO,catalog_url:CATALOG,
    aws_equivalent_key:`wmo/wdir/2024/01/14/${FILENAME}`,
    exact_catalog_matches:found.exact,
    same_wmo_catalog_matches:found.wmo,
    same_kwbn_day_matches:found.kwbn,
    selected_catalog_entry:chosen,
    resolved_url_path:resolved,
    results,
    rules:{production_change:false,source_identity_must_match:true,catalog_url_path_resolution_required:true,no_model_change:true,future_observation_leakage:false,guessing_internal_path_forbidden:true}
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({exact_count:found.exact.length,wmo_count:found.wmo.length,kwbn_count:found.kwbn.length,selected:chosen,resolved_url_path:resolved,results:results.map(r=>({name:r.name,status:r.status,ok:r.ok,final_url:r.final_url,content_type:r.content_type,bytes_received:r.bytes_received,content_range:r.content_range,excerpt:(r.excerpt||"").slice(0,500)}))},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
