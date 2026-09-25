"use strict";

const fs=require("fs");
const path=require("path");

const PROBE_VERSION="1.4.1";
const OUT=process.env.OUT||"research/swex-order-controls.json";
const DATASETS=["600.029","600.003","600.004","600.034","600.016"];
const UA={"User-Agent":`Sundowner-Intelligence-SI4-SWEX/${PROBE_VERSION}`,"Accept":"text/html,*/*;q=0.8"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchRetry(url){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),45000);
      const r=await fetch(url,{redirect:"follow",headers:UA,signal:ctl.signal});
      clearTimeout(timer);
      if(r.status>=500){last=new Error(`HTTP ${r.status}`);if(attempt<3){await sleep(attempt*1500);continue;}}
      return r;
    }catch(e){last=e;if(attempt<3){await sleep(attempt*1500);continue;}}
  }
  throw last;
}

function attr(src,name){
  const m=src.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,`i`));
  return m?m[1]:null;
}
function boolAttr(src,name){return new RegExp(`\\b${name}(?:\\s|>|=)`,`i`).test(src);}
function strip(x){return String(x||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}

function parseForm(html,base){
  const forms=[];
  const fre=/<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let fm;
  while((fm=fre.exec(html))){
    const attrs=fm[1],body=fm[2];
    let action=attr(attrs,"action")||base;
    try{action=new URL(action,base).href;}catch{}
    const controls=[];
    const ire=/<input\b([^>]*)>/gi;let im;
    while((im=ire.exec(body))){
      const a=im[1];controls.push({tag:"input",type:attr(a,"type")||"text",name:attr(a,"name"),value:attr(a,"value"),checked:boolAttr(a,"checked"),disabled:boolAttr(a,"disabled")});
    }
    const sre=/<select\b([^>]*)>([\s\S]*?)<\/select>/gi;let sm;
    while((sm=sre.exec(body))){
      const a=sm[1],options=[];const ore=/<option\b([^>]*)>([\s\S]*?)<\/option>/gi;let om;
      while((om=ore.exec(sm[2]))){
        options.push({value:attr(om[1],"value"),label:strip(om[2]),selected:boolAttr(om[1],"selected"),disabled:boolAttr(om[1],"disabled")});
      }
      controls.push({tag:"select",name:attr(a,"name"),multiple:boolAttr(a,"multiple"),options});
    }
    const bre=/<button\b([^>]*)>([\s\S]*?)<\/button>/gi;let bm;
    while((bm=bre.exec(body))){controls.push({tag:"button",type:attr(bm[1],"type")||"submit",name:attr(bm[1],"name"),value:attr(bm[1],"value"),label:strip(bm[2])});}
    forms.push({action,method:(attr(attrs,"method")||"GET").toUpperCase(),controls});
  }
  return forms;
}

(async()=>{
  const datasets=[];
  for(const id of DATASETS){
    const url=`https://data.eol.ucar.edu/cgi-bin/codiac/fgr_form/id=${encodeURIComponent(id)}`;
    const r=await fetchRetry(url),html=await r.text();
    datasets.push({dataset_id:id,url,status:r.status,final_url:r.url,title:strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]),forms:parseForm(html,r.url)});
  }
  const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",probe_version:PROBE_VERSION,generated:new Date().toISOString(),authority:"NSF NCAR/EOL CODIAC order forms",purpose:"Capture exact public order-form controls before any automated acquisition request is attempted.",rules:{get_only:true,order_submission:false,credentials_used:false,missing_values_not_invented:true,fire_outcome_used:false,future_observation_leakage:false},datasets};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(datasets.map(d=>({dataset_id:d.dataset_id,status:d.status,forms:d.forms.length,order_controls:d.forms.filter(f=>/codiac\/fgr/.test(f.action)).flatMap(f=>f.controls).length})),null,2));
  if(datasets.some(d=>d.status!==200||!d.forms.some(f=>/codiac\/fgr/.test(f.action))))process.exitCode=2;
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
