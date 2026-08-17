"use strict";

// 2024-only expanding-window development test for a western hard-negative remedy.
// This file predeclares the candidate feature set and promotion rule before any
// 2025 holdout scoring. It reuses the frozen SI-4 builder's definitions and never
// loads 2025 observations.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const OUT=process.env.OUT||"research/si4-western-hard-negative-cv.json";
const source=fs.readFileSync(BUILDER,"utf8");
const marker="\n(async()=>{";
const idx=source.indexOf(marker);
if(idx<0)throw new Error("unable to isolate SI-4 builder definitions");
const defs=source.slice(0,idx);

const main=String.raw`
(async()=>{
  if(TRAIN_START!=="2024-01-01"||TRAIN_END!=="2024-12-31")throw new Error("CV must remain 2024-only");
  const upper=loadUpperCache();
  const train=await dataset(TRAIN_START,TRAIN_END,upper);
  const all=train.byReg.western.slice().sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  const targetDir={Gaviota:345,Refugio:355};
  const extraNames=["surface_cross_barrier_gust_mph","critical_below_3km","wave_mean_cross_barrier_mph"];
  function augX(r){
    const t=targetDir[r.zone];
    const projected=(Number.isFinite(r.modelGust)&&Number.isFinite(r.modelDir)&&Number.isFinite(t))?r.modelGust*dc(r.modelDir,t):null;
    const below3=r.wave?.critical?.below3km?1:0;
    const meanCross=Number(r.wave?.meanCrossBarrier);
    if(![projected,below3,meanCross].every(Number.isFinite))throw new Error(`missing predeclared augmented diagnostic at ${r.time} ${r.zone}`);
    return [...r.x,projected,below3,meanCross];
  }
  function clone(rows,aug){return rows.map(r=>({...r,x:aug?augX(r):r.x.slice()}));}
  function fpr(rows,pf,thr){const h=hardNegativeRows(rows);return h.length?h.filter(r=>pf(r)>=thr).length/h.length:null;}
  function negBrier(rows,pf){const h=hardNegativeRows(rows);return h.length?mean(h.map(r=>pf(r)**2)):null;}
  function score(trainRows,testRows,aug){
    const tr=clone(trainRows,aug),te=clone(testRows,aug),m=fit(tr),pf=r=>predict(m,r.x),thr=thresholdForPod(tr,pf,.5);
    const mm=metrics(te,pf);
    return {n:mm.n,events:mm.events,brier:mm.brier,auc:mm.auc,train_threshold_for_50pct_pod:thr,hard_negative_n:hardNegativeRows(te).length,hard_negative_negative_brier:negBrier(te,pf),hard_negative_fpr_at_train_threshold:fpr(te,pf,thr)};
  }
  const folds=[
    {name:"Q2",train_end:"2024-03-31",test_start:"2024-04-01",test_end:"2024-06-30"},
    {name:"Q3",train_end:"2024-06-30",test_start:"2024-07-01",test_end:"2024-09-30"},
    {name:"Q4",train_end:"2024-09-30",test_start:"2024-10-01",test_end:"2024-12-31"}
  ];
  const results=[];
  for(const f of folds){
    const tr=all.filter(r=>r.time.slice(0,10)>="2024-01-01"&&r.time.slice(0,10)<=f.train_end);
    const te=all.filter(r=>r.time.slice(0,10)>=f.test_start&&r.time.slice(0,10)<=f.test_end);
    if(tr.length<350||te.length<100)throw new Error(`insufficient fold rows ${f.name}: train=${tr.length} test=${te.length}`);
    results.push({...f,train_n:tr.length,test_n:te.length,current:score(tr,te,false),augmented:score(tr,te,true)});
  }
  function weighted(key,variant){
    let num=0,den=0;for(const r of results){const v=r[variant][key];if(Number.isFinite(v)){num+=v*r.test_n;den+=r.test_n;}}return den?num/den:null;
  }
  const currentB=weighted("brier","current"),augB=weighted("brier","augmented");
  const currentHN=weighted("hard_negative_negative_brier","current"),augHN=weighted("hard_negative_negative_brier","augmented");
  const currentA=weighted("auc","current"),augA=weighted("auc","augmented");
  const nonInferiorFolds=results.filter(r=>r.augmented.brier<=r.current.brier+0.002).length;
  const freezeCriteria={
    overall_brier_noninferior:augB<=currentB,
    hard_negative_negative_brier_improves_5pct:Number.isFinite(currentHN)&&Number.isFinite(augHN)&&augHN<=currentHN*.95,
    auc_not_worse_by_more_than_0_01:Number.isFinite(currentA)&&Number.isFinite(augA)&&augA>=currentA-.01,
    at_least_two_of_three_fold_brier_noninferior:nonInferiorFolds>=2
  };
  freezeCriteria.all=Object.values(freezeCriteria).every(Boolean);
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"2024-only expanding-window CV to decide whether a predeclared western hard-negative feature set may be frozen before one-time 2025 holdout scoring.",
    rules:{future_observations_loaded:false,fire_association_used:false,model_coefficients_changed:false,holdout_2025_touched:false,chronological_expanding_window:true},
    design:{training_year:2024,forecast_lead_hours:24,base_features:FEATURE_NAMES,predeclared_extra_features:extraNames,folds:folds.map(x=>({...x})),freeze_rule:"Freeze for one-time 2025 scoring only if weighted Brier is non-inferior, weighted hard-negative negative-only Brier improves >=5%, weighted AUC is no worse than -0.01, and >=2/3 folds are Brier non-inferior."},
    counts:{western_rows:all.length,events:all.filter(r=>r.y).length,hard_negatives:hardNegativeRows(all).length},
    folds:results,
    weighted:{current:{brier:currentB,hard_negative_negative_brier:currentHN,auc:currentA},augmented:{brier:augB,hard_negative_negative_brier:augHN,auc:augA},delta:{brier:augB-currentB,hard_negative_negative_brier:augHN-currentHN,auc:augA-currentA}},
    freeze_criteria:freezeCriteria,
    decision:freezeCriteria.all?"FREEZE_CANDIDATE_FOR_ONE_TIME_2025_HOLDOUT":"DO_NOT_FREEZE"
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({weighted:out.weighted,freeze_criteria:out.freeze_criteria,decision:out.decision},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

eval(defs+"\n"+main);
