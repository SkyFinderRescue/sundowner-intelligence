"use strict";

const fs=require("fs");
const S=require("../research/si4-science");
const MANIFEST=process.env.MANIFEST||process.argv[2];
const CYCLES=process.env.CYCLES||process.argv[3];
const OUT=process.env.OUT||"research/hrrr-cycle-skill-2024.json";
if(!MANIFEST||!CYCLES)throw Error("usage: node evaluate-hrrr-cycle-skill-2024.js manifest.json cycles.json");
const manifest=JSON.parse(fs.readFileSync(MANIFEST,"utf8"));
const cycles=JSON.parse(fs.readFileSync(CYCLES,"utf8"));
if(manifest.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION"||cycles.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw Error("research-only guard missing");
if(manifest.rules?.development_year!==2024||manifest.rules?.holdout_2025_loaded!==false)throw Error("manifest must be 2024-only");
if(cycles.rules?.development_year!==2024||cycles.rules?.holdout_2025_loaded!==false)throw Error("cycle profiles must be 2024-only");

const TARGET={Gaviota:345,Refugio:355,Goleta:0,"San Marcos Pass":10,"Mission Canyon":15,Montecito:20,"Toro Canyon":22,Carpinteria:25};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>{const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null;};
const hourKey=r=>String(r.valid_time).slice(0,13);
const rowKey=r=>`${hourKey(r)}|${r.zone}`;
const groups=new Map();
for(const r of cycles.rows||[]){const k=rowKey(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
const selected=[];
for(const g of ["events","hard_negatives"]){for(const r of manifest.selected?.[g]||[])selected.push({...r,kind:g,y:g==="events"?1:0});}
function profile(p){return(p||[]).map(x=>({pressureHpa:+x.pressureHpa,heightM:+x.heightM,temperatureC:+x.temperatureC,windSpeed:+x.windSpeedMph,windDirection:+x.windDirectionDeg,relativeHumidityPct:Number.isFinite(+x.relativeHumidityPct)?+x.relativeHumidityPct:null}));}
function features(r){const key=rowKey(r),m=(groups.get(key)||[]).slice().sort((a,b)=>a.forecast_lead_hours-b.forecast_lead_hours),target=TARGET[r.zone];if(!Number.isFinite(target)||m.length<3)return null;const vals=m.map(x=>{const w=S.mountainWaveIndex(profile(x.profile),target);return{lead:+x.forecast_lead_hours,wave:w.score,cross:w.meanCrossBarrier,critical:w.critical?.criticalHeightM??null};});const wa=S.cycleAgreement(vals.map(x=>x.wave*100)),ca=S.cycleAgreement(vals.map(x=>x.cross));const crit=vals.map(x=>x.critical).filter(Number.isFinite);const confidence=mean([wa.score,ca.score]);return{...r,cycles:vals,n_cycles:vals.length,wave_spread_points:wa.spread,cross_spread_mph:ca.spread,critical_spread_m:crit.length>=2?Math.max(...crit)-Math.min(...crit):null,cycle_confidence:confidence,baseline_probability:+r.baseline_probability};}
// valid_time values are intentionally compact ISO-hour strings such as 2024-06-16T06.
// Some JavaScript runtimes treat that form as Invalid Date, so chronology is handled by
// lexicographic ISO-hour keys rather than Date parsing. This is plumbing only; labels,
// probabilities, thresholds, candidate transforms and scoring are unchanged.
const rows=selected.map(features).filter(Boolean).sort((a,b)=>hourKey(a).localeCompare(hourKey(b))||String(a.zone).localeCompare(String(b.zone)));
if(rows.length<40)throw Error(`too few matched cycle rows ${rows.length}`);
const candidates={
 mild_confidence_tempering:r=>clamp(r.baseline_probability*(0.75+0.25*r.cycle_confidence),0.001,0.999),
 moderate_confidence_tempering:r=>clamp(r.baseline_probability*(0.50+0.50*r.cycle_confidence),0.001,0.999)
};
const base=r=>r.baseline_probability;
function auc(a,pf){const x=a.map(r=>({p:pf(r),y:r.y})).sort((u,v)=>u.p-v.p),pos=x.filter(r=>r.y).length,neg=x.length-pos;if(!pos||!neg)return null;let rankSum=0;for(let i=0;i<x.length;){let j=i+1;while(j<x.length&&x[j].p===x[i].p)j++;const rank=(i+1+j)/2;for(let k=i;k<j;k++)if(x[k].y)rankSum+=rank;i=j;}return(rankSum-pos*(pos+1)/2)/(pos*neg);}
function brier(a,pf){return mean(a.map(r=>(pf(r)-r.y)**2));}
function thresholdForPod(a,pf,target=.60){const ev=a.filter(r=>r.y);if(!ev.length)return null;const ps=[...new Set(a.map(pf))].sort((a,b)=>b-a);for(const t of ps){const tp=a.filter(r=>r.y&&pf(r)>=t).length,fn=ev.length-tp;if(tp/(tp+fn)>=target)return t;}return ps.at(-1)??null;}
function classM(a,pf,t){let tp=0,fp=0,tn=0,fn=0;for(const r of a){const q=pf(r)>=t;if(q&&r.y)tp++;else if(q)fp++;else if(r.y)fn++;else tn++;}return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,hard_negative_fpr:fp+tn?fp/(fp+tn):null};}
function summary(a,pf){const hn=a.filter(r=>!r.y);return{n:a.length,events:a.filter(r=>r.y).length,brier:brier(a,pf),auc:auc(a,pf),hard_negative_brier:brier(hn,pf)};}
// Expanding chronological folds. Thresholds are selected on prior 2024 rows only, then frozen for the next block.
const nights=[...new Set(rows.map(r=>hourKey(r).slice(0,10)))].sort();
const cuts=[Math.floor(nights.length*.4),Math.floor(nights.length*.7),nights.length];
const folds=[];const testKeys=new Set();let prev=cuts[0];
for(let fi=1;fi<cuts.length;fi++){
  const trainN=new Set(nights.slice(0,prev)),testN=new Set(nights.slice(prev,cuts[fi]));
  const tr=rows.filter(r=>trainN.has(hourKey(r).slice(0,10))),te=rows.filter(r=>testN.has(hourKey(r).slice(0,10)));
  prev=cuts[fi];
  if(tr.filter(r=>r.y).length<5||tr.filter(r=>!r.y).length<5||te.filter(r=>r.y).length<3||te.filter(r=>!r.y).length<3)continue;
  for(const r of te)testKeys.add(rowKey(r));
  const rec={train_n:tr.length,test_n:te.length,train_start:tr[0].valid_time,train_end:tr.at(-1).valid_time,test_start:te[0].valid_time,test_end:te.at(-1).valid_time,baseline:{threshold:thresholdForPod(tr,base),...summary(te,base)}};
  rec.baseline.threshold_metrics=classM(te,base,rec.baseline.threshold);
  rec.candidates={};
  for(const[name,pf]of Object.entries(candidates)){const t=thresholdForPod(tr,pf);rec.candidates[name]={threshold:t,...summary(te,pf),threshold_metrics:classM(te,pf,t)};}
  folds.push(rec);
}
if(folds.length<2)throw Error(`need >=2 valid chronological folds; got ${folds.length}`);
const pooled=rows.filter(r=>testKeys.has(rowKey(r)));
const baseline=summary(pooled,base);baseline.mean_fold_pod=mean(folds.map(f=>f.baseline.threshold_metrics.pod));baseline.mean_fold_hard_negative_fpr=mean(folds.map(f=>f.baseline.threshold_metrics.hard_negative_fpr));
const results={};const eligible=[];
for(const[name,pf]of Object.entries(candidates)){const s=summary(pooled,pf);s.mean_fold_pod=mean(folds.map(f=>f.candidates[name].threshold_metrics.pod));s.mean_fold_hard_negative_fpr=mean(folds.map(f=>f.candidates[name].threshold_metrics.hard_negative_fpr));s.gates={overall_brier:s.brier<=baseline.brier,hard_negative_brier:s.hard_negative_brier<=baseline.hard_negative_brier,auc_noninferior:s.auc>=baseline.auc-.01,pod_noninferior:s.mean_fold_pod>=baseline.mean_fold_pod-.05,hard_negative_fpr:s.mean_fold_hard_negative_fpr<=baseline.mean_fold_hard_negative_fpr};s.passes_all=Object.values(s.gates).every(Boolean);if(s.passes_all)eligible.push(name);results[name]=s;}
const output={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),rules:{development_year:2024,holdout_2025_loaded:false,future_observations_used_for_features:false,fire_outcome_used:false,missing_features_imputed:false,candidate_family_predeclared:["mild_confidence_tempering","moderate_confidence_tempering"],target_pod_for_training_threshold:.60,production_change_authorized:false,interpretation:"Bounded 2024 western development screen only. Passing permits a larger 2024-only all-season cycle-skill test; it does not authorize 2025 exposure or production."},counts:{manifest_rows:selected.length,matched_rows:rows.length,events:rows.filter(r=>r.y).length,hard_negatives:rows.filter(r=>!r.y).length,valid_folds:folds.length,pooled_test_rows:pooled.length},cycle_descriptives:{mean_wave_spread_points:mean(rows.map(r=>r.wave_spread_points)),mean_cross_spread_mph:mean(rows.map(r=>r.cross_spread_mph)),mean_cycle_confidence:mean(rows.map(r=>r.cycle_confidence)),min_cycles:Math.min(...rows.map(r=>r.n_cycles)),max_cycles:Math.max(...rows.map(r=>r.n_cycles))},baseline,candidates:results,eligible_for_larger_2024_cycle_test:eligible,folds};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");console.log(JSON.stringify({counts:output.counts,baseline,eligible,candidates:results},null,2));
