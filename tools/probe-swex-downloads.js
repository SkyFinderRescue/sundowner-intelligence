"use strict";

const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const OUT=process.env.OUT||"research/swex-download-probe.json";
const DATASETS=[
  {key:"swex_sounding_composite_5hpa",doi:"10.26023/CM8F-TNHW-HX01",eol:"600.029",query:"Multi-Network 5mb Vertical Resolution Sounding Composite"},
  {key:"iss2_radiosondes",doi:"10.26023/J6P8-7SYD-XP0M",eol:"600.003",query:"ISS Radiosonde Data - Rancho Alegre Site"},
  {key:"iss3_radiosondes",doi:"10.26023/H5TV-Y54J-R010",eol:"600.004",query:"ISS Radiosonde Data - Sedgwick Site"},
  {key:"iss_profiler",doi:"10.26023/2659-AF70-3009",eol:"600.034",query:"ISS Radar Wind Profiler Products"},
  {key:"isfs_surface_flux",doi:"10.26023/XDKV-QXC2-1Y0J",eol:"600.016",query:"ISFS Surface Meteorology and Flux Products - georeferenced"}
];
const UA={"User-Agent":"Sundowner-Intelligence-SI4-SWEX/1.2","Accept":"application/json,text/html;q=0.9,*/*;q=0.8"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchRetry(url,opt={}){let last=null;for(let i=1;i<=3;i++){try{const r=await fetch(url,{...opt,redirect:"follow",headers:{...UA,...(opt.headers||{})}});if(r.status>=500){last=new Error(`HTTP ${r.status}`);if(i<3){await sleep(i*1500);continue;}}return r;}catch(e){last=e;if(i<3){await sleep(i*1500);continue;}}}throw last;}
function hrefs(html,base){const out=[];for(const re of [/href=["']([^"']+)["']/gi,/src=["']([^"']+)["']/gi]){let m;while((m=re.exec(html))){try{out.push(new URL(m[1],base).href);}catch{}}}return [...new Set(out)];}
function publicApiKey(js){const usage=js.match(/headers:\{["']X-API-Key["']:\s*([A-Za-z_$][\w$]*)/);if(!usage)return null;const name=usage[1];const escaped=name.replace(/[$]/g,'\\$&');const m=js.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`));return m?m[1]:null;}
function frontendRouteLiterals(js){
  const out=new Set();
  for(const re of [/["'`]([^"'`]{1,180})["'`]/g]){
    let m;while((m=re.exec(js))){const s=m[1];if(!/(dataset|file|order|cart|download|zinc\/rest|aSearch)/i.test(s))continue;if(/[A-Za-z0-9_-]{40,}/.test(s))continue;out.add(s);if(out.size>=200)break;}
  }
  return [...out].sort();
}
function frontendRouteHints(js){
  const hints=new Set();const tokens=["download","/file","file/","order","cart","dataset/","aSearch"];
  for(const token of tokens){let at=0;while((at=js.indexOf(token,at))>=0){const lo=Math.max(0,at-220),hi=Math.min(js.length,at+320);let s=js.slice(lo,hi).replace(/[\r\n\t]+/g," ").replace(/\s+/g," ");s=s.replace(/[A-Za-z0-9_-]{32,}/g,"<redacted-long-token>");if(s.length>540)s=s.slice(0,540);hints.add(s);at+=token.length;if(hints.size>=120)break;}if(hints.size>=120)break;}return [...hints];
}
async function appInfo(){const landing=await fetchRetry('https://data.eol.ucar.edu/dataset/600.029');const html=await landing.text();const script=hrefs(html,landing.url).find(u=>/\/assets\/.*\.js(?:$|\?)/.test(u));const r=await fetchRetry(script);const text=await r.text();const key=publicApiKey(text);return {script,key,api_base:'https://data.eol.ucar.edu/zinc/rest/',key_hash:key?crypto.createHash('sha256').update(key).digest('hex'):null,route_hints:frontendRouteHints(text),route_literals:frontendRouteLiterals(text)};}
function sanitize(x){if(Array.isArray(x))return x.map(sanitize);if(x&&typeof x==='object'){const o={};for(const [k,v] of Object.entries(x)){if(/token|password|secret|api.?key/i.test(k))continue;o[k]=sanitize(v);}return o;}return x;}
async function getJson(url,key){const r=await fetchRetry(url,{headers:{"X-API-Key":key,"Accept":"application/json"}});const text=await r.text();let body=null;try{body=JSON.parse(text);}catch{}return {url,status:r.status,ok:r.ok,content_type:r.headers.get('content-type'),body:body?sanitize(body):null,excerpt:body?null:text.slice(0,1200)};}
async function probeRoute(url,key){try{const r=await fetchRetry(url,{headers:{"X-API-Key":key,"Accept":"application/json,text/plain,*/*"}});const text=await r.text();let body=null;try{body=JSON.parse(text);}catch{}return {url,status:r.status,ok:r.ok,content_type:r.headers.get('content-type'),body:body?sanitize(body):null,excerpt:body?null:text.slice(0,600)};}catch(e){return {url,status:null,ok:false,error:String(e.message||e)}}}
function idsFromSearch(body,eol){const p=body?.body?.payload||body?.body||[];const rows=Array.isArray(p)?p:[];const out=[];for(const row of rows){if(!row||typeof row!=='object')continue;for(const [id,label] of Object.entries(row)){if(String(label).includes(eol))out.push({id:String(id),label:String(label)});}}return out;}
function collectUrls(x,out=new Set()){if(typeof x==='string'){if(/^https?:\/\//i.test(x))out.add(x);return out;}if(Array.isArray(x)){for(const v of x)collectUrls(v,out);return out;}if(x&&typeof x==='object')for(const v of Object.values(x))collectUrls(v,out);return out;}
async function candidateFileRoutes(d,api){const base=api.api_base,id=encodeURIComponent(d.eol);const urls=[`${base}dataset/${id}/files`,`${base}dataset/${id}/file`,`${base}dataset/${id}/downloads`,`${base}dataset/${id}/download`,`${base}file?datasetId=${id}`,`${base}files?datasetId=${id}`,`${base}file/list?datasetId=${id}`,`${base}dataset/files/${id}`,`https://data.eol.ucar.edu/zinc/rest/file/list/${id}`,`https://data.eol.ucar.edu/zinc/rest/file/dataset/${id}`];const out=[];for(const u of urls)out.push(await probeRoute(u,api.key));return out;}
async function datasetApi(d,api){const probes=[];for(const u of [`${api.api_base}dataset/${encodeURIComponent(d.eol)}`,`${api.api_base}dataset?datasetId=${encodeURIComponent(d.eol)}`,`${api.api_base}dataset/aSearch?keyword=${encodeURIComponent(d.eol)}`,`${api.api_base}dataset/aSearch?keyword=${encodeURIComponent(d.query)}`,`${api.api_base}dataset/aSearch?keyword=${encodeURIComponent(d.doi)}`])probes.push(await getJson(u,api.key));let records=probes.filter(p=>p.ok&&p.body?.body);const matches=[];for(const p of probes)matches.push(...idsFromSearch(p.body,d.eol));for(const m of matches.slice(0,3))records.push(await getJson(`${api.api_base}dataset/${encodeURIComponent(m.id)}`,api.key));const urls=[...new Set(records.flatMap(r=>[...collectUrls(r.body)]))];const file_route_probes=await candidateFileRoutes(d,api);return {ok:records.length>0,probes,matches,records,urls,file_route_probes};}
(async()=>{const api=await appInfo();const datasets=[];for(const d of DATASETS)datasets.push({...d,api:await datasetApi(d,api)});const out={status:'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION',generated:new Date().toISOString(),authority:'NSF NCAR/EOL zinc REST API',frontend:{script:api.script,api_base:api.api_base,api_key_resolved:Boolean(api.key),api_key_sha256:api.key_hash,route_literals:api.route_literals,route_hints:api.route_hints},rules:{public_frontend_api_only:true,credentials_not_persisted:true,missing_values_not_invented:true,fire_outcome_used:false,future_observation_leakage:false},datasets};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({api_key_resolved:Boolean(api.key),route_literals:api.route_literals.length,route_hints:api.route_hints.length,datasets:datasets.map(d=>({key:d.key,record_ok:d.api.records.length>0,urls:d.api.urls.length,file_routes:d.api.file_route_probes.map(p=>p.status)}))},null,2));if(!api.key||datasets.some(d=>!d.api.ok))process.exitCode=2;})().catch(e=>{console.error(e.stack||e);process.exit(1)});
