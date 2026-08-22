"use strict";

// 2024-only chronological development test for whether issuance-time HRRR run-to-run
// agreement adds useful confidence information beyond the frozen SI-4 feature set.
// This file deliberately reuses the SI-4 builder definitions so event labels, hard-
// negative definitions, station pairing, and model fitting remain identical. 2025 is
// forbidden here and no production coefficients are written.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const CYCLE_INPUT=process.env.CYCLE_INPUT||"research/si4-hrrr-cycle-agreement-2024.json";
const OUT=process.env.OUT||"research/si4-hrrr-cycle-agreement-2024-cv.json";
const source=fs.readFileSync(BUILDER,"utf8");
const marker="\n(async()=>{";
const idx=source.indexOf(marker);
if(idx<0)throw Error("unable to isolate SI-4 builder definitions");
const defs=source.slice(0,idx);

const main=String.raw`
function monthOf(t){return Number(String(t).slice(5,7));}
function safeNum(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function cycleFeatures(c){
  if(!c||Number(c.n_cycles)<3)return null;
  const wa=safeNum(c.wave_score_agreement?.score),ca=safeNum(c.cross_barrier_agreement?.score);
  const ws=safeNum(c.wave_score_agreement?.spread),cs=safeNum(c.cross_barrier_agreement?.spread);
  if([wa,ca,ws,cs].some(v=>v===null))return null;
  // Small predeclared physically grounded set: agreement confidence and bounded spread.
  return [wa,ca,Math.min(ws,50)/50,Math.min(cs,8)/8];
}
function pooledAuc(rows,key){return auc(rows,r=>r[key]);}
function pooledBrier(rows,key){return brier(rows,r=>r[key]);}
function pooledPod(rows,key){return classificationMetrics(rows,r=>r[key],"y",.5).pod;}
function hardBrier(rows,key){const h=hardNegativeRows(rows);return h.length?mean(h.map(r=>r[key]*r[key])):null;}
function weighted(items,key){const a=items.filter(x=>Number.isFinite(x[key])&&x.n>0);const n=a.reduce((s,x)=>s+x.n,0);return n?a.reduce((s,x)=>s+x[key]*x.n,0)/n:null;}
(async()=>{
  if(TRAIN_START!=="2024-01-01"||TRAIN_END!=="2024-12-31"||TEST_START!=="2024-01-01"||TEST_END!=="2024-12-31")throw Error("cycle-agreement evaluator must remain 2024-only");
  const cyc=JSON.parse(fs.readFileSync(CYCLE_INPUT,"utf8"));
  if(cyc.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw Error("cycle artifact missing research-only guard");
  const cmap=new Map((cyc.rows||[]).map(r=>[String(r.valid_time).slice(0,13)+"|"+r.zone,r]));
  const upper=loadUpperCache();
  const ds=await dataset("2024-01-01","2024-12-31",upper);
  const folds=[
    {name:"H2-early",trainEnd:6,test:[7,8]},
    {name:"H2-mid",trainEnd:8,test:[9,10]},
    {name:"H2-late",trainEnd:10,test:[11,12]}
  ];
  const foldReports=[], pooled=[];
  for(const fold of folds){
    for(const regime of ["western","hybrid","eastern"]){
      const all=(ds.byReg[regime]||[]).map(r=>{const c=cmap.get(String(r.time).slice(0,13)+"|"+r.zone),cf=cycleFeatures(c);return cf?Object.assign({},r,{cycle:cf}):null;}).filter(Boolean);
      const tr=all.filter(r=>monthOf(r.time)<=fold.trainEnd),te=all.filter(r=>fold.test.includes(monthOf(r.time)));
      if(tr.length<350||te.length<40)continue;
      const base=fit(tr.map(r=>Object.assign({},r,{x:r.x.slice()})));
      const cand=fit(tr.map(r=>Object.assign({},r,{x:r.x.concat(r.cycle)})));
      const trainPred=tr.map(r=>Object.assign({},r,{p0:predict(base,r.x),p1:predict(cand,r.x.concat(r.cycle))}));
      const testPred=te.map(r=>Object.assign({},r,{p0:predict(base,r.x),p1:predict(cand,r.x.concat(r.cycle)),fold:fold.name,regime}));
      const t0=thresholdForPod(trainPred,r=>r.p0,.5),t1=thresholdForPod(trainPred,r=>r.p1,.5);
      const h0=hardNegativeRows(testPred),h1=h0;
      const rep={fold:fold.name,regime,n:testPred.length,events:testPred.filter(r=>r.y).length,
        baseline:{brier:pooledBrier(testPred,"p0"),auc:pooledAuc(testPred,"p0"),pod:pooledPod(testPred,"p0"),hard_negative_brier:hardBrier(testPred,"p0"),hard_negative_fpr:falsePositiveRate(h0,r=>r.p0,t0),train_matched_pod_threshold:t0},
        candidate:{brier:pooledBrier(testPred,"p1"),auc:pooledAuc(testPred,"p1"),pod:pooledPod(testPred,"p1"),hard_negative_brier:hardBrier(testPred,"p1"),hard_negative_fpr:falsePositiveRate(h1,r=>r.p1,t1),train_matched_pod_threshold:t1}};
      foldReports.push(rep);pooled.push(...testPred);
    }
  }
  if(!pooled.length)throw Error("no chronological CV test rows with >=3 coherent HRRR cycles");
  const overall={n:pooled.length,events:pooled.filter(r=>r.y).length,
    baseline:{brier:pooledBrier(pooled,"p0"),auc:pooledAuc(pooled,"p0"),pod:pooledPod(pooled,"p0"),hard_negative_brier:hardBrier(pooled,"p0")},
    candidate:{brier:pooledBrier(pooled,"p1"),auc:pooledAuc(pooled,"p1"),pod:pooledPod(pooled,"p1"),hard_negative_brier:hardBrier(pooled,"p1")}};
  const fprBase=weighted(foldReports.map(r=>({n:hardNegativeRows(pooled.filter(x=>x.fold===r.fold&&x.regime===r.regime)).length,v:r.baseline.hard_negative_fpr})).map(x=>({n:x.n,fpr:x.v})),"fpr");
  const fprCand=weighted(foldReports.map(r=>({n:hardNegativeRows(pooled.filter(x=>x.fold===r.fold&&x.regime===r.regime)).length,v:r.candidate.hard_negative_fpr})).map(x=>({n:x.n,fpr:x.v})),"fpr");
  overall.baseline.hard_negative_fpr_at_train_matched_pod=fprBase;
  overall.candidate.hard_negative_fpr_at_train_matched_pod=fprCand;
  const gates={
    brier_improves:Number.isFinite(overall.candidate.brier)&&overall.candidate.brier<overall.baseline.brier,
    auc_noninferior:Number.isFinite(overall.candidate.auc)&&overall.candidate.auc>=overall.baseline.auc-.01,
    pod_noninferior:Number.isFinite(overall.candidate.pod)&&overall.candidate.pod>=overall.baseline.pod-.03,
    hard_negative_brier_noninferior:Number.isFinite(overall.candidate.hard_negative_brier)&&overall.candidate.hard_negative_brier<=overall.baseline.hard_negative_brier,
    hard_negative_fpr_noninferior:Number.isFinite(fprCand)&&Number.isFinite(fprBase)&&fprCand<=fprBase
  };
  const output={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),purpose:"2024-only chronological CV of HRRR forecast-cycle agreement as an incremental SI-4 confidence feature.",
    source:{cycle:CYCLE_INPUT,upper_air:upper.meta},feature_set:["wave_agreement_score","cross_barrier_agreement_score","bounded_wave_spread","bounded_cross_barrier_spread"],folds:foldReports,overall,gates,eligible_for_one_time_2025_freeze:Object.values(gates).every(Boolean),
    rules:{development_year:2024,holdout_2025_loaded:false,future_observations_label_only:true,fire_association_used:false,missing_cycle_features_imputed:false,production_change_authorized:false}};
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");
  console.log(JSON.stringify({overall,gates,eligible_for_one_time_2025_freeze:output.eligible_for_one_time_2025_freeze,folds:foldReports.map(r=>({fold:r.fold,regime:r.regime,n:r.n,events:r.events}))},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
`;

eval(defs+"\n"+main);
