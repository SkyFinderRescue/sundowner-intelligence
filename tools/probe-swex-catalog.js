"use strict";

const fs=require("fs");
const path=require("path");
const OUT=process.env.OUT||"research/swex-catalog-inventory.json";
const DATASETS=[
  "multi-network-5mb-vertical-resolution-sounding-composite2",
  "multi-network-composite-highest-resolution-radiosonde-data7",
  "iss-radar-wind-profiler-products",
  "isfs-surface-meteorology-and-flux-products-georeferenced",
  "iss-radiosonde-data-rancho-alegre-site",
  "iss-radiosonde-data-sedgwick-site",
  "iss-surface-meteorology-products",
  "iss-wind-lidar-data-products",
  "iss-lidar-products",
  "iss-ceilometer-cl31-data-products",
  "iss-ceilometer-cl51-data-products",
  "iss-ceilometer-cl61-data-products"
];

async function get(id){
  const u=`https://ckanprod.data-commons.k8s.ucar.edu/api/3/action/package_show?id=${encodeURIComponent(id)}`;
  const r=await fetch(u,{headers:{"User-Agent":"Sundowner-Intelligence-SI4-SWEX/1.0"}});
  if(!r.ok)return{id,ok:false,status:r.status,url:u,error:(await r.text()).slice(0,500)};
  const j=await r.json();
  if(!j.success||!j.result)return{id,ok:false,status:r.status,url:u,error:"CKAN success=false"};
  const x=j.result;
  return{
    id,ok:true,title:x.title,name:x.name,notes:x.notes,metadata_modified:x.metadata_modified,
    resources:(x.resources||[]).map(q=>({id:q.id,name:q.name,description:q.description,format:q.format,mimetype:q.mimetype,url:q.url,url_type:q.url_type,size:q.size,created:q.created,last_modified:q.last_modified}))
  };
}

(async()=>{
  const results=[];
  for(const id of DATASETS)results.push(await get(id));
  const out={status:"RESEARCH_ONLY",generated:new Date().toISOString(),results};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  const summary=results.map(x=>({id:x.id,ok:x.ok,title:x.title,resources:x.resources?.length||0}));
  console.log(JSON.stringify(summary,null,2));
  const required=[
    "multi-network-5mb-vertical-resolution-sounding-composite2",
    "multi-network-composite-highest-resolution-radiosonde-data7",
    "iss-radar-wind-profiler-products",
    "isfs-surface-meteorology-and-flux-products-georeferenced"
  ];
  const missing=required.filter(id=>!results.find(x=>x.id===id)?.ok);
  if(missing.length){console.error(`Required SWEX catalog records unresolved: ${missing.join(", ")}`);process.exit(2);}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
