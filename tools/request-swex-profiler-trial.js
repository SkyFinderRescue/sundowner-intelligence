"use strict";

const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const OUT=process.env.OUT||"research/swex-profiler-order-trial.json";
const EMAIL=String(process.env.SWEX_ORDER_EMAIL||"").trim();
const FILE="swex_iss2-ranchoalegre_prof915_winds_v1.tar.gz";
const URL="https://data.eol.ucar.edu/cgi-bin/codiac/fgr";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=x=>String(x||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
const hrefs=(html,base)=>{const out=new Set();const re=/href=["']([^"']+)["']/gi;let m;while((m=re.exec(html))){try{out.add(new URL(m[1],base).href);}catch{}}return [...out].filter(u=>/(download|codiac|zinc\/file|600\.)/i.test(u));};

async function submit(){
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL))throw Error("SWEX_ORDER_EMAIL must be a fully qualified email address");
  const params={ds_id:"600.034",origfmt:"57",options:"nnnnnnny",file:FILE,format:"TAR/GNU Zip (.tar.gz/.tgz) [57]",fake_chrome_email:"","email-add":EMAIL,affiliation:"us_gov"};
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
      const r=await fetch(URL,{method:"POST",redirect:"follow",headers:{"User-Agent":"Sundowner-Intelligence-SI4-SWEX/1.6","Accept":"text/html,*/*;q=0.8","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params).toString(),signal:ctl.signal});
      clearTimeout(timer);
      if(r.status>=500){last=Error(`HTTP ${r.status}`);if(attempt<3){await sleep(attempt*2000);continue;}}
      const html=await r.text(),plain=strip(html);
      return {status:r.status,final_url:r.url,content_type:r.headers.get("content-type"),title:strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]),links:hrefs(html,r.url).slice(0,100),response_excerpt:plain.replaceAll(EMAIL,"<redacted-email>").slice(0,5000)};
    }catch(e){last=e;if(attempt<3){await sleep(attempt*2000);continue;}}
  }
  throw last;
}

(async()=>{
  const response=await submit();
  const denied=/Service Denied|must supply a valid|denied/i.test(response.title+" "+response.response_excerpt);
  const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),authority:"NSF NCAR/EOL CODIAC",dataset:{id:"600.034",doi:"10.26023/2659-AF70-3009",quality:"final",requested_file:FILE},contact:{source:"Git commit author email at workflow runtime",email_sha256:crypto.createHash("sha256").update(EMAIL).digest("hex"),affiliation:"us_gov",email_not_persisted:true},rules:{one_file_trial:true,no_credentials:true,no_model_change:true,missing_values_not_invented:true,fire_outcome_used:false,future_observation_leakage:false},response:{...response,accepted:!denied}};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({dataset:out.dataset,response:{status:response.status,title:response.title,accepted:!denied,links:response.links,excerpt:response.response_excerpt.slice(0,1200)},contact:{email_sha256:out.contact.email_sha256,email_not_persisted:true}},null,2));
  if(response.status>=500||denied)process.exitCode=2;
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
