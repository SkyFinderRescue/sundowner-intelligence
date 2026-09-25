"use strict";

const fs=require("fs");
const path=require("path");

const OUT=process.env.OUT||"research/swex-order-response-probe.json";
const UA={"User-Agent":"Sundowner-Intelligence-SI4-SWEX/1.5","Accept":"text/html,*/*;q=0.8","Content-Type":"application/x-www-form-urlencoded"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function postRetry(url,params){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),45000);
      const r=await fetch(url,{method:"POST",redirect:"follow",headers:UA,body:new URLSearchParams(params).toString(),signal:ctl.signal});
      clearTimeout(timer);
      if(r.status>=500){last=new Error(`HTTP ${r.status}`);if(attempt<3){await sleep(attempt*1500);continue;}}
      return r;
    }catch(e){last=e;if(attempt<3){await sleep(attempt*1500);continue;}}
  }
  throw last;
}
function strip(x){return String(x||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}
function hrefs(html,base){const out=new Set();const re=/href=["']([^"']+)["']/gi;let m;while((m=re.exec(html))){try{out.add(new URL(m[1],base).href);}catch{}}return [...out].filter(u=>/(codiac|download|zinc\/file|600\.)/i.test(u));}
function filenames(text){return [...new Set((text.match(/[\w.-]+\.(?:tar\.gz|tgz|zip|nc|cdf|txt|csv|gz)/gi)||[]))];}

const trials=[
  {key:"profiler_one_file",url:"https://data.eol.ucar.edu/cgi-bin/codiac/fgr",params:{ds_id:"600.034",origfmt:"57",options:"nnnnnnny",file:"swex_iss2-ranchoalegre_prof915_winds_v1.tar.gz",format:"TAR/GNU Zip (.tar.gz/.tgz) [57]",fake_chrome_email:"", "email-add":"",affiliation:"none"}},
  {key:"iss2_one_day",url:"https://data.eol.ucar.edu/cgi-bin/codiac/fgr",params:{ds_id:"600.003",origfmt:"22",options:"nnnynnnn",begin_date:"20220417",begin_time:"17:00:00",end_date:"20220418",end_time:"14:00:00",format:"Network Common Data Form (NetCDF) [22]",fake_chrome_email:"", "email-add":"",affiliation:"none"}},
  {key:"composite_one_day",url:"https://data.eol.ucar.edu/cgi-bin/codiac/fgr",params:{ds_id:"600.029",origfmt:"19",options:"nnnynnnn",begin_date:"20220417",begin_time:"17:00:00",end_date:"20220418",end_time:"14:00:00",format:"EOL Sounding Composite Format (ASCII) [19]",fake_chrome_email:"", "email-add":"",affiliation:"none"}}
];

(async()=>{
  const results=[];
  for(const t of trials){
    const r=await postRetry(t.url,t.params),html=await r.text(),plain=strip(html);
    results.push({key:t.key,dataset_id:t.params.ds_id,status:r.status,final_url:r.url,content_type:r.headers.get("content-type"),title:strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]),links:hrefs(html,r.url).slice(0,100),file_candidates:filenames(html).slice(0,100),response_excerpt:plain.slice(0,3000)});
  }
  const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),authority:"NSF NCAR/EOL CODIAC",purpose:"Determine whether public SWEX archive orders can resolve synchronously without contact information before any real archive order is submitted.",rules:{contact_information_sent:false,credentials_used:false,selected_files_or_dates_minimal:true,no_model_change:true,missing_values_not_invented:true,fire_outcome_used:false,future_observation_leakage:false},results};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(results.map(x=>({key:x.key,status:x.status,final_url:x.final_url,title:x.title,files:x.file_candidates,excerpt:x.response_excerpt.slice(0,500)})),null,2));
  if(results.some(x=>x.status>=500))process.exitCode=2;
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
