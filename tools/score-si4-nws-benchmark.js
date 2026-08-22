"use strict";

const fs=require("fs");
const INPUT=process.env.INPUT||process.argv[2]||"research/nws-si4-matched.json";
const OUT=process.env.OUT||process.argv[3]||"research/nws-si4-benchmark-report.json";
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;

function finite(x){return Number.isFinite(Number(x));}
function isoHour(s){const d=new Date(s);return Number.isFinite(d.getTime())?d.getTime()/3600000:null;}
function auc(rows,pf,yf){const a=rows.filter(r=>finite(pf(r))&&[0,1].includes(Number(yf(r)))).slice().sort((x,y)=>pf(y)-pf(x)),pos=a.filter(r=>Number(yf(r))===1).length,neg=a.length-pos;if(!pos||!neg)return null;let tp=0,rank=0;for(const r of a){if(Number(yf(r))===1)tp++;else rank+=tp;}return rank/(pos*neg);}
function brier(rows,pf,yf){const a=rows.filter(r=>finite(pf(r))&&[0,1].includes(Number(yf(r))));return a.length?mean(a.map(r=>(clamp(Number(pf(r)))-Number(yf(r)))**2)):null;}
function contingency(rows,pf,yf,threshold=.5){let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const p=pf(r),y=yf(r);if(!finite(p)||![0,1].includes(Number(y)))continue;const yes=Number(p)>=threshold,actual=Number(y)===1;if(yes&&actual)tp++;else if(yes)fp++;else if(actual)fn++;else tn++;}return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null,specificity:tn+fp?tn/(tn+fp):null,accuracy:tp+fp+tn+fn?(tp+tn)/(tp+fp+tn+fn):null};}
function gustMetrics(rows,predKey){const a=rows.filter(r=>finite(r.observed_gust_mph)&&finite(r[predKey]));if(!a.length)return{n:0,mae_mph:null,bias_mph:null,rmse_mph:null};const e=a.map(r=>Number(r[predKey])-Number(r.observed_gust_mph));return{n:a.length,mae_mph:mean(e.map(Math.abs)),bias_mph:mean(e),rmse_mph:Math.sqrt(mean(e.map(x=>x*x)))};}
function timingMetrics(cases,predKey){const e=[];for(const c of cases||[]){const o=isoHour(c.observed_onset),p=isoHour(c[predKey]);if(finite(o)&&finite(p))e.push(p-o);}return{n:e.length,mae_hours:mean(e.map(Math.abs)),bias_hours:mean(e)};}
function reliability(rows){const bins=[];for(let lo=0;lo<1;lo+=.1){const hi=lo+.1,a=rows.filter(r=>finite(r.si_probability)&&Number(r.si_probability)>=lo&&(hi>=1?Number(r.si_probability)<=hi:Number(r.si_probability)<hi)&&[0,1].includes(Number(r.observed_event)));bins.push({bin:`${Math.round(lo*100)}-${Math.round(hi*100)}%`,n:a.length,mean_forecast:a.length?mean(a.map(r=>Number(r.si_probability))):null,observed_frequency:a.length?mean(a.map(r=>Number(r.observed_event))):null});}return bins;}
function byGroup(rows,key,fn){const out={};for(const value of [...new Set(rows.map(r=>r[key]).filter(Boolean))])out[value]=fn(rows.filter(r=>r[key]===value));return out;}
function compare(rows){const si={probability:{n:rows.filter(r=>finite(r.si_probability)&&finite(r.observed_event)).length,brier:brier(rows,r=>r.si_probability,r=>r.observed_event),roc_auc:auc(rows,r=>r.si_probability,r=>r.observed_event),at50:contingency(rows,r=>r.si_probability,r=>r.observed_event,.5)},gust:gustMetrics(rows,"si_gust_mph")};const nws={event:{n:rows.filter(r=>finite(r.nws_event_pred)&&finite(r.observed_event)).length,atBinary:contingency(rows,r=>r.nws_event_pred,r=>r.observed_event,.5)},gust:gustMetrics(rows,"nws_gust_mph")};return{si,nws,deltas:{gust_mae_si_minus_nws:finite(si.gust.mae_mph)&&finite(nws.gust.mae_mph)?si.gust.mae_mph-nws.gust.mae_mph:null,gust_abs_bias_si_minus_nws:finite(si.gust.bias_mph)&&finite(nws.gust.bias_mph)?Math.abs(si.gust.bias_mph)-Math.abs(nws.gust.bias_mph):null}};}

function validate(x){if(!Array.isArray(x.rows))throw Error("input.rows must be an array");for(const r of x.rows){for(const k of["valid_time","zone","observed_event"])if(r[k]==null)throw Error(`matched row missing ${k}`);if(r.fire_associated!=null&&r.event_definition_source==="fire")throw Error("fire association may not define Sundowner truth");}return x;}

const input=validate(JSON.parse(fs.readFileSync(INPUT,"utf8"))),rows=input.rows;
const report={
  status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
  generated:new Date().toISOString(),
  input:INPUT,
  matched_rows:rows.length,
  rules:{same_valid_time_and_observation:true,fire_association_excluded_from_event_definition:true,nws_probability_not_invented:true,nws_event_is_deterministic_threshold_from_archived_wind:true},
  overall:compare(rows),
  by_regime:byGroup(rows,"regime",compare),
  by_zone:byGroup(rows,"zone",compare),
  hard_negatives:compare(rows.filter(r=>r.hard_negative===true)),
  si_reliability:reliability(rows),
  onset_timing:{si:timingMetrics(input.event_cases,"si_onset"),nws:timingMetrics(input.event_cases,"nws_onset")},
  notes:[
    "SI probability receives Brier/AUC/reliability scoring. NDFD/NWS is not assigned a fabricated probability; its archived deterministic event forecast is scored with contingency metrics.",
    "Gust MAE/bias/RMSE use exactly matched valid times and verifying observations.",
    "Operational superiority must not be claimed from this report unless coverage is sufficiently complete and promotion gates are satisfied."
  ]
};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({matched_rows:rows.length,overall:report.overall},null,2));
