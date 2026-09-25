"use strict";

const fs=require("fs");
const path=require("path");

const BUCKET="noaa-rrfs-pds";
const ROOT="retro_output_final/";
const OUT=process.env.OUT||"research/si4-rrfs-retro-inventory.json";
const TIMEOUT_MS=Number(process.env.PROBE_TIMEOUT_MS||20000);
const MAX_DEPTH=Number(process.env.RRFS_PROBE_DEPTH||5);
const MAX_PREFIXES=Number(process.env.RRFS_PROBE_PREFIXES||120);

function decodeXml(s){return String(s||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function tags(block,name){return [...block.matchAll(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`,"g"))].map(m=>decodeXml(m[1]));}
function parseList(xml){
  const prefixes=[...xml.matchAll(/<CommonPrefixes>\s*<Prefix>([\s\S]*?)<\/Prefix>\s*<\/CommonPrefixes>/g)].map(m=>decodeXml(m[1]));
  const objects=[...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(m=>{
    const b=m[1],one=n=>tags(b,n)[0]??null;
    return {key:one("Key"),etag:one("ETag")?.replace(/^"|"$/g,"")??null,last_modified:one("LastModified"),size_bytes:Number(one("Size"))||0,storage_class:one("StorageClass")};
  });
  return {prefixes,objects,is_truncated:/<IsTruncated>true<\/IsTruncated>/.test(xml),next_token:tags(xml,"NextContinuationToken")[0]??null};
}
async function fetchText(url){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-RRFS-Retro-Probe/1.1"}});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url,text};
  } finally { clearTimeout(timer); }
}
async function list(prefix,{delimiter="/",maxKeys=1000}={}){
  let token=null,objects=[],prefixes=[];
  do{
    let url=`https://${BUCKET}.s3.amazonaws.com/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${maxKeys}`;
    if(delimiter)url+=`&delimiter=${encodeURIComponent(delimiter)}`;
    if(token)url+=`&continuation-token=${encodeURIComponent(token)}`;
    const r=await fetchText(url);
    if(!r.ok)return {ok:false,status:r.status,prefix,url:r.url,error:`HTTP ${r.status}`,objects,prefixes};
    const p=parseList(r.text);objects.push(...p.objects);prefixes.push(...p.prefixes);token=p.is_truncated?p.next_token:null;
  }while(token&&objects.length+prefixes.length<5000);
  return {ok:true,status:200,prefix,objects,prefixes};
}
function classify(text){
  const s=text.toLowerCase();
  return {
    spring_2024:/202405\d{2}|may.*2024|spring/.test(s),
    winter_2024:/20240[12]\d{2}|jan|feb|winter/.test(s),
    summer_2023:/202307\d{2}|jul|summer/.test(s),
    deterministic:/control|det|prslev|2dfld/.test(s),
    ensemble:/ens|refs|member|m0\d\d/.test(s),
    pressure:/prslev|pressure/.test(s),
    surface:/2dfld|sfc|surface/.test(s)
  };
}
function priority(prefix,depth){
  const c=classify(prefix);
  let score=depth*10;
  if(c.spring_2024||c.winter_2024)score+=100;
  if(/202405(02|12)|202401(08|16)/.test(prefix))score+=40;
  if(/\/(00|12)\/$/.test(prefix))score+=20;
  return score;
}
async function main(){
  const root=await list(ROOT);
  if(!root.ok)throw new Error(`RRFS retrospective root unavailable: ${root.error}`);
  const queue=root.prefixes.map(prefix=>({prefix,depth:1}));
  const nodes=[{...root,depth:0,classification:classify(ROOT)}];
  const seen=new Set([ROOT]);
  while(queue.length&&nodes.length<MAX_PREFIXES){
    queue.sort((a,b)=>priority(b.prefix,b.depth)-priority(a.prefix,a.depth));
    const item=queue.shift();
    if(seen.has(item.prefix)||item.depth>MAX_DEPTH)continue;
    seen.add(item.prefix);
    const r=await list(item.prefix);
    nodes.push({...r,depth:item.depth,classification:classify(item.prefix)});
    if(r.ok&&item.depth<MAX_DEPTH){for(const prefix of r.prefixes)queue.push({prefix,depth:item.depth+1});}
  }
  const allObjects=nodes.flatMap(n=>n.objects.map(o=>({...o,parent_prefix:n.prefix,classification:classify(`${n.prefix}${o.key||""}`)})));
  const spring=nodes.filter(n=>n.classification.spring_2024||n.objects.some(o=>classify(o.key).spring_2024));
  const winter=nodes.filter(n=>n.classification.winter_2024||n.objects.some(o=>classify(o.key).winter_2024));
  const summer=nodes.filter(n=>n.classification.summer_2023||n.objects.some(o=>classify(o.key).summer_2023));
  const summary={
    root_prefixes:root.prefixes,
    nodes_probed:nodes.length,
    max_depth_reached:Math.max(...nodes.map(n=>n.depth)),
    objects_observed:allObjects.length,
    spring_2024_nodes:spring.length,
    winter_2024_nodes:winter.length,
    summer_2023_nodes:summer.length,
    pressure_objects:allObjects.filter(o=>o.classification.pressure).length,
    surface_objects:allObjects.filter(o=>o.classification.surface).length,
    deterministic_objects:allObjects.filter(o=>o.classification.deterministic).length,
    ensemble_objects:allObjects.filter(o=>o.classification.ensemble).length
  };
  const out={
    generated:new Date().toISOString(),
    status:"RESEARCH_ONLY_SHADOW_GUIDANCE",
    rules:{future_observations_label_only:true,missing_files_remain_missing:true,prototype_parallel_retrospective_separated:true,model_tuning_from_2025_forbidden:true},
    source:{provider:"NOAA Open Data Dissemination",bucket:`s3://${BUCKET}/`,root:ROOT,registry:"https://registry.opendata.aws/noaa-rrfs/"},
    summary,
    nodes:nodes.map(n=>({prefix:n.prefix,depth:n.depth,ok:n.ok,status:n.status,classification:n.classification,prefixes:n.prefixes,objects:n.objects.slice(0,25)})),
    sample_objects:allObjects.slice(0,100)
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
  if(!summary.spring_2024_nodes&&!summary.winter_2024_nodes){console.error("No documented 2024 retrospective lane was discovered within bounded probe depth; inspect artifact before changing paths.");process.exitCode=2;}
  if(summary.max_depth_reached<3){console.error("RRFS retrospective probe did not descend to forecast-cycle depth; treat as inventory plumbing failure.");process.exitCode=3;}
}
main().catch(e=>{console.error(e.stack||e);process.exit(1);});
