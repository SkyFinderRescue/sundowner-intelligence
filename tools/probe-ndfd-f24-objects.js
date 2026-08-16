"use strict";

const fs = require("fs");
const path = require("path");

const BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/";
const DATE = process.env.SAMPLE_DATE || "2025/01/15";
const OUT = process.env.OUT || "research/ndfd-f24-object-probe.json";
const SPECS = {
  wdir: { super: "YBUZ98", f24: "YBUB00", element: "Wind Direction" },
  wspd: { super: "YCUZ98", f24: "YCUB00", element: "Wind Speed" },
  wgust: { super: "YWUZ98", f24: "YWUB00", element: "Wind Gust Speed" }
};

function decodeXml(s) {
  return String(s || "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function values(xml, tag) {
  const out=[]; const re=new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,"g"); let m;
  while((m=re.exec(xml))) out.push(decodeXml(m[1]));
  return out;
}
async function list(prefix) {
  const u=new URL(BASE);
  u.searchParams.set("list-type","2");
  u.searchParams.set("prefix",prefix);
  u.searchParams.set("max-keys","1000");
  const r=await fetch(u,{headers:{"User-Agent":"Sundowner-Intelligence-SI4-NDFD-Research/1.0"}});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText} ${u}`);
  const xml=await r.text();
  const keys=values(xml,"Key"), sizes=values(xml,"Size").map(Number), lm=values(xml,"LastModified");
  return keys.map((key,i)=>({key,size:Number.isFinite(sizes[i])?sizes[i]:null,last_modified:lm[i]||null}));
}

(async()=>{
  const result={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    sample_date:DATE,
    source:"NOAA NDFD Open Data noaa-ndfd-pds",
    wmo_lookup:"NDFDelem_fullres_202206.xls",
    purpose:"Determine whether exact operational 2.5-km CONUS F24 WMO grids are independently archived, so the matched NWS benchmark can avoid downloading super-files and can freeze the exact 24-hour projection by heading.",
    parameters:{},
    rules:{production_change:false,f24_headings_fixed_from_official_lookup:true,future_observation_leakage:false}
  };
  for(const [parameter,spec] of Object.entries(SPECS)){
    const exactPrefix=`wmo/${parameter}/${DATE}/${spec.f24}_KWBN_`;
    const superPrefix=`wmo/${parameter}/${DATE}/${spec.super}_KWBN_`;
    const [exact,superFiles]=await Promise.all([list(exactPrefix),list(superPrefix)]);
    result.parameters[parameter]={...spec,exact_prefix:exactPrefix,exact_objects:exact,super_prefix:superPrefix,super_objects:superFiles};
  }
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result.parameters).map(([p,x])=>[p,{f24:x.f24,exact_count:x.exact_objects.length,exact:x.exact_objects.slice(0,3),super_count:x.super_objects.length,super:x.super_objects.slice(0,3)}])),null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
