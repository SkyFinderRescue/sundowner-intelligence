"use strict";

const fs=require("fs");
const path=require("path");
const OUT=process.env.OUT||"research/swex-download-probe.json";
const DATASETS=[
  {key:"swex_sounding_composite_5hpa",doi:"10.26023/CM8F-TNHW-HX01",eol:"600.029"},
  {key:"iss2_radiosondes",doi:"10.26023/J6P8-7SYD-XP0M",eol:"600.003"},
  {key:"iss3_radiosondes",doi:"10.26023/H5TV-Y54J-R010",eol:"600.004"},
  {key:"iss_profiler",doi:"10.26023/2659-AF70-3009",eol:"600.034"},
  {key:"isfs_surface_flux",doi:"10.26023/XDKV-QXC2-1Y0J",eol:"600.016"}
];
const UA={"User-Agent":"Sundowner-Intelligence-SI4-SWEX/1.0"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchRetry(url,opt={}){let last=null;for(let i=1;i<=3;i++){try{const r=await fetch(url,{...opt,redirect:"follow",headers:{...UA,...(opt.headers||{})}});if(r.status>=500){last=new Error(`HTTP ${r.status}`);if(i<3){await sleep(i*1500);continue;}}return r;}catch(e){last=e;if(i<3){await sleep(i*1500);continue;}}}throw last;}
function hrefs(html,base){const out=[];for(const re of [/href=["']([^"']+)["']/gi,/src=["']([^"']+)["']/gi]){let m;while((m=re.exec(html))){try{out.push(new URL(m[1],base).href);}catch{}}}return [...new Set(out)];}
function candidateLinks(html,base){return hrefs(html,base).filter(u=>/download|order|codiac|file|data|\.nc(?:$|\?)|\.tar\.gz(?:$|\?)|\.zip(?:$|\?)/i.test(u)).slice(0,100);}
function apiHints(js){const out=[];const re=/["'`]([^"'`]{3,240})["'`]/g;let m;while((m=re.exec(js))){const s=m[1];if(/(?:api|download|order|dataset|codiac|file)/i.test(s)&&(/\//.test(s)||/^https?:/.test(s)))out.push(s);}return [...new Set(out)].slice(0,200);}
async function inspectApp(html,base){const scripts=hrefs(html,base).filter(u=>/\/assets\/.*\.js(?:$|\?)/.test(u)).slice(0,4);const bundles=[];for(const u of scripts){try{const r=await fetchRetry(u);const text=await r.text();bundles.push({url:u,status:r.status,bytes:text.length,api_hints:apiHints(text)});}catch(e){bundles.push({url:u,error:String(e)});}}return bundles;}
async function probe(d){const starts=[`https://doi.org/${d.doi}`,`https://data.eol.ucar.edu/dataset/${d.eol}`,`https://data.eol.ucar.edu/codiac/dss/id=${d.eol}`];const attempts=[];for(const start of starts){try{const r=await fetchRetry(start);const ct=r.headers.get("content-type")||"";const body=(ct.includes("text")||ct.includes("html"))?await r.text():"";attempts.push({start,ok:r.ok,status:r.status,final_url:r.url,content_type:ct,content_length:r.headers.get("content-length"),candidate_links:candidateLinks(body,r.url),app_bundles:body?await inspectApp(body,r.url):[]});}catch(e){attempts.push({start,ok:false,error:String(e)});}}return {...d,attempts};}
(async()=>{const datasets=[];for(const d of DATASETS)datasets.push(await probe(d));const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),authority:"NSF NCAR/EOL DOI and dataset endpoints",rules:{credentials_not_used:true,missing_links_not_invented:true,fire_outcome_used:false,future_observation_leakage:false},datasets};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");console.log(JSON.stringify(datasets.map(d=>({key:d.key,reachable:d.attempts.some(a=>a.ok),candidate_links:d.attempts.reduce((n,a)=>n+(a.candidate_links?.length||0),0),api_hints:d.attempts.reduce((n,a)=>n+(a.app_bundles||[]).reduce((m,b)=>m+(b.api_hints?.length||0),0),0)})),null,2));if(datasets.some(d=>!d.attempts.some(a=>a.ok)))process.exitCode=2;})().catch(e=>{console.error(e.stack||e);process.exit(1)});
