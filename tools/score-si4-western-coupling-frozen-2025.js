"use strict";

// One-time 2025 score-only evaluation of the western coupling feature set that
// passed the predeclared 2024 expanding-window CV. Feature definitions and
// promotion rules are frozen in SI4_WESTERN_COUPLING_2024_FROZEN_RULES.json.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const FREEZE=process.env.FREEZE||"research/SI4_WESTERN_COUPLING_2024_FROZEN_RULES.json";
const OUT=process.env.OUT||"research/si4-western-coupling-frozen-2025.json";
const source=fs.readFileSync(BUILDER,"utf8");
const marker="\n(async()=>{";
const idx=source.indexOf(marker);
if(idx<0)throw new Error("unable to isolate SI-4 builder definitions");
const defs=source.slice(0,idx);

const main=String.raw`
(async()=>{
  if(TRAIN_START!=="2024-01-01"||TRAIN_END!=="2024-12-31")throw new Error("training period must remain frozen to 2024");
  if(TEST_START!=="2025-01-01"||TEST_END!=="2025-12-31")throw new Error("holdout period must remain frozen to 2025");

  const freeze=JSON.parse(fs.readFileSync(FREEZE,"utf8"));
  const expectedExtras=["surface_cross_barrier_gust_mph","critical_below_3km","wave_mean_cross_barrier_mph"];
  if(freeze.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw new Error("freeze guard missing");
  if(freeze.rules?.holdout_2025_seen_when_rules_frozen!==false)throw new Error("freeze manifest does not prove 2025 was untouched");
  if(JSON.stringify(freeze.frozen_extra_features)!==JSON.stringify(expectedExtras))throw new Error("frozen feature set changed");
  if(JSON.stringify(freeze.base_features)!==JSON.stringify(FEATURE_NAMES))throw new Error("base feature set changed");

  const upper=loadUpperCache();
  const train=await dataset(TRAIN_START,TRAIN_END,upper);
  const holdout=await dataset(TEST_START,TEST_END,upper);
  const trainRows=train.byReg.western.slice().sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  const testRows=holdout.byReg.western.slice().sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  const targetDir={Gaviota:345,Refugio:355};

  function augX(r){
    const t=targetDir[r.zone];
    const projected=(Number.isFinite(r.modelGust)&&Number.isFinite(r.modelDir)&&Number.isFinite(t))?r.modelGust*dc(r.modelDir,t):null;
    const below3=r.wave?.critical?.below3km?1:0;
    const meanCross=Number(r.wave?.meanCrossBarrier);
    if(![projected,below3,meanCross].every(Number.isFinite))throw new Error("missing frozen augmented diagnostic at "+r.time+" "+r.zone);
    return [...r.x,projected,below3,meanCross];
  }
  function clone(rows,aug){return rows.map(r=>({...r,x:aug?augX(r):r.x.slice()}));}
  function hardBrier(rows,pf){const h=hardNegativeRows(rows);return h.length?mean(h.map(r=>pf(r)**2)):null;}
  function hardFpr(rows,pf,thr){const h=hardNegativeRows(rows);return h.length?h.filter(r=>pf(r)>=thr).length/h.length:null;}
  function score(trainInput,testInput,aug){
    const tr=clone(trainInput,aug),te=clone(testInput,aug);
    const model=fit(tr),pf=r=>predict(model,r.x);
    const threshold=thresholdForPod(tr,pf,.5);
    const mm=metrics(te,pf);
    const cls=classificationMetrics(te,pf,"y",threshold);
    return {
      n:mm.n,
      events:mm.events,
      brier:mm.brier,
      auc:mm.auc,
      train_threshold_for_50pct_pod:threshold,
      pod_at_train_threshold:cls.pod,
      far_at_train_threshold:cls.far,
      precision_at_train_threshold:cls.precision,
      confusion_at_train_threshold:{tp:cls.tp,fp:cls.fp,tn:cls.tn,fn:cls.fn},
      hard_negative_n:hardNegativeRows(te).length,
      hard_negative_negative_brier:hardBrier(te,pf),
      hard_negative_fpr_at_train_threshold:hardFpr(te,pf,threshold),
      model:{intercept:model.intercept,weights:model.weights,mean:model.mean,sd:model.sd}
    };
  }

  if(trainRows.length<1000||testRows.length<1000)throw new Error("unexpected western row count: train="+trainRows.length+" test="+testRows.length);
  const current=score(trainRows,testRows,false);
  const candidate=score(trainRows,testRows,true);
  const gate={
    western_brier_noninferior:candidate.brier<=current.brier,
    hard_negative_brier_improves_5pct:Number.isFinite(candidate.hard_negative_negative_brier)&&Number.isFinite(current.hard_negative_negative_brier)&&candidate.hard_negative_negative_brier<=current.hard_negative_negative_brier*.95,
    auc_not_worse_by_more_than_0_01:Number.isFinite(candidate.auc)&&Number.isFinite(current.auc)&&candidate.auc>=current.auc-.01,
    event_pod_not_worse_by_more_than_0_02:Number.isFinite(candidate.pod_at_train_threshold)&&Number.isFinite(current.pod_at_train_threshold)&&candidate.pod_at_train_threshold>=current.pod_at_train_threshold-.02,
    hard_negative_fpr_not_worse:Number.isFinite(candidate.hard_negative_fpr_at_train_threshold)&&Number.isFinite(current.hard_negative_fpr_at_train_threshold)&&candidate.hard_negative_fpr_at_train_threshold<=current.hard_negative_fpr_at_train_threshold
  };
  gate.all=Object.values(gate).every(Boolean);

  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"One-time 2025 score-only evaluation of the western coupling candidate frozen after 2024-only expanding-window CV.",
    provenance:{freeze_file:FREEZE,source_cv_run_id:freeze.source_cv_run_id,upper_air:upper.meta},
    rules:{training_2024_only:true,holdout_2025_score_only:true,post_holdout_tuning:false,future_observations_are_labels_only:true,fire_association_used:false,missing_values_fabricated:false,production_change_authorized:false},
    design:{regime:"western",zones:["Gaviota","Refugio"],forecast_lead_hours:24,base_features:FEATURE_NAMES,frozen_extra_features:expectedExtras,thresholds_fit_on_2024_only:true},
    counts:{training_rows:trainRows.length,training_events:trainRows.filter(r=>r.y).length,holdout_rows:testRows.length,holdout_events:testRows.filter(r=>r.y).length,holdout_hard_negatives:hardNegativeRows(testRows).length},
    current,
    candidate,
    delta:{brier:candidate.brier-current.brier,auc:candidate.auc-current.auc,hard_negative_negative_brier:candidate.hard_negative_negative_brier-current.hard_negative_negative_brier,pod_at_train_threshold:candidate.pod_at_train_threshold-current.pod_at_train_threshold,far_at_train_threshold:candidate.far_at_train_threshold-current.far_at_train_threshold,hard_negative_fpr_at_train_threshold:candidate.hard_negative_fpr_at_train_threshold-current.hard_negative_fpr_at_train_threshold},
    gate,
    decision:gate.all?"CANDIDATE_SURVIVES_ONE_TIME_2025_GATE":"REJECT_OR_REDESIGN_WITHOUT_RETUNING_ON_2025"
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,current:out.current,candidate:out.candidate,delta:out.delta,gate:out.gate,decision:out.decision},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

eval(defs+"\n"+main);
