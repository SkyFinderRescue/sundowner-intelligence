"use strict";

const fs=require("fs");
const path=require("path");
const OUT=process.env.OUT||"research/ndfd-ncss-probe.json";
const BASE="https://www.ncei.noaa.gov/thredds";
const FILENAME=process.env.FILENAME||"YBUZ98_KWBN_202401140050";
const CATALOG=`${BASE}/catalog/model-ndfd-file/access/202401/20240114/catalog.xml`;

async function get(url,opts={}){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
  try{
    const r=await fetch(url,{signal:ctl.signal,redirect:"follow",headers:{"User-Agent":"Sundowner-Intelligence-SI4-NDFD-Research/1.1",...(opts.headers||{})}});
    const ct=r.headers.get("content-type")||"";
    const buf=Buffer.from(await r.arrayBuffer());
    clearTimeout(timer);
    return{url,status:r.status,ok:r.ok,final_url:r.url,content_type:ct,bytes_received:buf.length,content_range:r.headers.get("content-range"),content_length:r.headers.get("content-length"),body:buf};
  }catch(e){clearTimeout(timer);return{url,ok:false,error:String(e.message||e),body:Buffer.alloc(0)};}
}
function textSummary(name,r){
  const textual=/text|xml|json|html/i.test(r.content_type||"");
  return{name,url:r.url,status:r.status,ok:r.ok,final_url:r.final_url,content_type:r.content_type,bytes_received:r.bytes_received,content_range:r.content_range,content_length:r.content_length,error:r.error,excerpt:textual?r.body.toString("utf8",0,Math.min(r.body.length,5000)):r.body.subarray(0,64).toString("hex")};
}
function unescapeXml(s){return String(s).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function resolveUrlPath(xml,filename){
  // THREDDS catalogs expose each scanned dataset with name + urlPath. Parse the exact
  // filename rather than guessing the internal access path.
  const escaped=filename.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const patterns=[
    new RegExp(`<dataset\\s+[^>]*name=["']${escaped}["'][^>]*urlPath=["']([^"']+)["']`,"i"),
    new RegExp(`<dataset\\s+[^>]*urlPath=["']([^"']+)["'][^>]*name=["']${escaped}["']`,"i"),
    new RegExp(`<dataset\\s+[^>]*urlPath=["']([^"']*${escaped})["'][^>]*>`,"i")
  ];
  for(const p of patterns){const m=xml.match(p);if(m)return unescapeXml(m[1]);}
  const at=xml.indexOf(filename);
  return at>=0?{not_resolved:true,context:xml.slice(Math.max(0,at-1200),Math.min(xml.length,at+1800))}:null;
}

(async()=>{
  const catalog=await get(CATALOG);
  if(!catalog.ok)throw Error(`NCEI THREDDS catalog unavailable: ${catalog.status||catalog.error}`);
  const xml=catalog.body.toString("utf8");
  const resolved=resolveUrlPath(xml,FILENAME);
  if(!resolved||typeof resolved!=="string"){
    const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),filename:FILENAME,catalog:textSummary("catalog",catalog),resolved_url_path:null,resolution_debug:resolved,rules:{production_change:false,source_identity_must_match:true,no_model_change:true,future_observation_leakage:false}};
    fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
    console.log(JSON.stringify({resolved_url_path:null,resolution_debug:resolved},null,2));
    throw Error(`Could not resolve THREDDS urlPath for ${FILENAME}`);
  }

  const encPath=resolved.split("/").map(encodeURIComponent).join("/");
  const urls={
    http_file:`${BASE}/fileServer/${encPath}`,
    opendap_dds:`${BASE}/dodsC/${encPath}.dds`,
    ncss_capabilities:`${BASE}/ncss/grid/${encPath}?req=capabilities`,
    ncss_dataset:`${BASE}/ncss/grid/${encPath}/dataset.xml`
  };
  const results=[textSummary("catalog",catalog)];
  for(const [name,url] of Object.entries(urls)){
    const r=await get(url,name==="http_file"?{headers:{Range:"bytes=0-2047"}}:{});
    results.push(textSummary(name,r));
  }
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"Resolve the exact NCEI THREDDS dataset urlPath from the authoritative catalog before probing HTTP/OPeNDAP/NCSS services for an NDFD file already validated against NOAA Open Data.",
    filename:FILENAME,
    catalog_url:CATALOG,
    aws_equivalent_key:`wmo/wdir/2024/01/14/${FILENAME}`,
    resolved_url_path:resolved,
    results,
    rules:{production_change:false,source_identity_must_match:true,catalog_url_path_resolution_required:true,no_model_change:true,future_observation_leakage:false}
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({resolved_url_path:resolved,results:results.map(r=>({name:r.name,status:r.status,ok:r.ok,final_url:r.final_url,content_type:r.content_type,bytes_received:r.bytes_received,content_range:r.content_range,excerpt:(r.excerpt||"").slice(0,800)}))},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
