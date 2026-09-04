"use strict";

// Final research ablation for the already-frozen SI-4 lane.
// Configurations are predeclared here before the score-only 2025 run.
// This is diagnostic evidence only: it must not trigger post-holdout coefficient
// tuning or an automatic production selection.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const FREEZE=process.env.FREEZE||"research/SI4_WESTERN_COUPLING_2024_FROZEN_RULES.json";
const OUT=process.env.OUT||"research/si4-final-ablation-frozen-2025.json";
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
  if(freeze.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw new Error("western freeze guard missing");
  if(freeze.rules?.holdout_2025_seen_when_rules_frozen!==false)throw new Error("western freeze does not prove 2025 was untouched");
  if(JSON.stringify(freeze.frozen_extra_features)!==JSON.stringify(expectedExtras))throw new Error("western frozen feature set changed");

  const upper=loadUpperCache();
  const train=await dataset(TRAIN_START,TRAIN_END,upper);
  const holdout=await dataset(TEST_START,TEST_END,upper);
  const regimes=["western","hybrid","eastern"];
  const targetDir={Gaviota:345,Refugio:355};

  // PREDECLARED feature blocks by FEATURE_NAMES index:
  // 0 baseline_logit
  // 1 pressure_support
  // 2 pressure_strengthening_3h
  // 3 mountain_wave_index
  // 4 critical_level_below_5km
  // 5 upper_dryness
  // 6 surface_dryness
  // 7 season_sin
  // 8 season_cos
  const CONFIGS=[
    {name:"si3_baseline",kind:"baseline"},
    {name:"si4_full",kind:"fit",drop:[]},
    {name:"si4_no_pressure_evolution",kind:"fit",drop:[1,2]},
    {name:"si4_no_wave_critical",kind:"fit",drop:[3,4]},
    {name:"si4_no_dryness",kind:"fit",drop:[5,6]},
    {name:"si4_no_season",kind:"fit",drop:[7,8]},
    {name:"si4_baseline_logit_only",kind:"fit",keep:[0]},
    {name:"si4_full_plus_frozen_western_coupling",kind:"western_frozen"}
  ];

  function subsetX(x,cfg){
    if(cfg.keep)return cfg.keep.map(i=>x[i]);
    const drop=new Set(cfg.drop||[]);
    return x.filter((_,i)=>!drop.has(i));
  }
  function augX(r){
    const t=targetDir[r.zone];
    const projected=(Number.isFinite(r.modelGust)&&Number.isFinite(r.modelDir)&&Number.isFinite(t))?r.modelGust*dc(r.modelDir,t):null;
    const below3=r.wave?.critical?.below3km?1:0;
    const meanCross=Number(r.wave?.meanCrossBarrier);
    if(![projected,below3,meanCross].every(Number.isFinite))throw new Error("missing frozen western diagnostic at "+r.time+" "+r.zone);
    return [...r.x,projected,below3,meanCross];
  }
  function xFor(r,cfg,regime){
    if(cfg.kind==="western_frozen"&&regime==="western")return augX(r);
    return subsetX(r.x,cfg);
  }
  function aggregateClass(rows,pf,thresholds){
    let tp=0,fp=0,tn=0,fn=0;
    for(const r of rows){
      const th=thresholds[r.regime];
      const yes=Number.isFinite(th)&&pf(r)>=th,actual=!!r.y;
      if(yes&&actual)tp++;else if(yes&&!actual)fp++;else if(!yes&&actual)fn++;else tn++;
    }
    return {tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null};
  }
  function hardSummary(rows,pf,thresholds){
    const hard=hardNegativeRows(rows);
    const probs=hard.map(pf).filter(Number.isFinite);
    let fp=0;
    for(const r of hard){const th=thresholds[r.regime];if(Number.isFinite(th)&&pf(r)>=th)fp++;}
    return {n:hard.length,brier_negative_only:probs.length?mean(probs.map(p=>p*p)):null,mean_probability:mean(probs),fpr_at_train_matched_pod:hard.length?fp/hard.length:null};
  }

  const trAll=[],teAll=[];
  for(const regime of regimes){
    for(const r of train.byReg[regime])trAll.push({...r,regime});
    for(const r of holdout.byReg[regime])teAll.push({...r,regime});
  }

  const results={};
  for(const cfg of CONFIGS){
    const models={},thresholds={};
    for(const regime of regimes){
      const tr=trAll.filter(r=>r.regime===regime);
      if(cfg.kind==="baseline"){
        models[regime]=null;
        thresholds[regime]=thresholdForPod(tr,r=>r.baseline,.5);
      }else{
        const fitRows=tr.map(r=>({...r,x:xFor(r,cfg,regime)}));
        models[regime]=fit(fitRows);
        thresholds[regime]=thresholdForPod(fitRows,r=>predict(models[regime],r.x),.5);
      }
    }
    const pf=r=>cfg.kind==="baseline"?r.baseline:predict(models[r.regime],xFor(r,cfg,r.regime));
    const overall={
      n:teAll.length,
      events:teAll.filter(r=>r.y).length,
      brier:brier(teAll,pf),
      auc:auc(teAll,pf),
      classification:aggregateClass(teAll,pf,thresholds),
      hard_negative:hardSummary(teAll,pf,thresholds)
    };
    const by_regime={};
    for(const regime of regimes){
      const rows=teAll.filter(r=>r.regime===regime);
      const hard=hardNegativeRows(rows),probs=hard.map(pf).filter(Number.isFinite);
      let hfp=0;for(const r of hard)if(Number.isFinite(thresholds[regime])&&pf(r)>=thresholds[regime])hfp++;
      by_regime[regime]={n:rows.length,events:rows.filter(r=>r.y).length,brier:brier(rows,pf),auc:auc(rows,pf),classification:classificationMetrics(rows,pf,"y",thresholds[regime]),hard_negative:{n:hard.length,brier_negative_only:probs.length?mean(probs.map(p=>p*p)):null,mean_probability:mean(probs),fpr_at_train_matched_pod:hard.length?hfp/hard.length:null},threshold_2024_matched_pod:thresholds[regime]};
    }
    results[cfg.name]={definition:cfg,overall,by_regime};
  }

  const full=results.si4_full;
  const deltas={};
  for(const [name,r] of Object.entries(results)){
    if(name==="si4_full")continue;
    deltas[name]={
      brier:r.overall.brier-full.overall.brier,
      auc:r.overall.auc-full.overall.auc,
      event_pod:r.overall.classification.pod-full.overall.classification.pod,
      event_far:r.overall.classification.far-full.overall.classification.far,
      hard_negative_brier:r.overall.hard_negative.brier_negative_only-full.overall.hard_negative.brier_negative_only,
      hard_negative_fpr:r.overall.hard_negative.fpr_at_train_matched_pod-full.overall.hard_negative.fpr_at_train_matched_pod
    };
  }

  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"Predeclared final feature-block ablation on the frozen 2025 score-only holdout. Diagnostic evidence only; no automatic post-holdout model selection or coefficient tuning.",
    provenance:{upper_air:upper.meta,western_freeze:FREEZE,western_source_cv_run_id:freeze.source_cv_run_id},
    rules:{training_2024_only:true,holdout_2025_score_only:true,configurations_predeclared_in_code_before_run:true,thresholds_selected_2024_only:true,future_observations_label_only:true,fire_association_used:false,missing_values_fabricated:false,post_holdout_coefficient_tuning:false,automatic_production_selection:false,production_change_authorized:false},
    feature_names:FEATURE_NAMES,
    configurations:CONFIGS,
    results,
    delta_vs_si4_full:deltas,
    interpretation:"If a removal appears better on 2025, treat that as diagnostic evidence, not permission to retune and rescore the same holdout. Any architecture change based on this ablation requires independent confirmation. The already-frozen western coupling lane may be judged only against its predeclared one-time gate plus this diagnostic context."
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({rules:out.rules,summary:Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{overall:v.overall,by_regime:v.by_regime}]))},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

eval(defs+"\n"+main);
