"use strict";

const fs=require("fs");
const INPUT=process.env.INPUT||process.argv[2]||"research/si4-calibration-candidate.json";
const OUT=process.env.OUT||process.argv[3]||"research/si4-holdout-summary.json";
const x=JSON.parse(fs.readFileSync(INPUT,"utf8"));
if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw Error("candidate missing research-only guard");
if(Number(x.train?.forecast_lead_hours)!==24||Number(x.holdout?.forecast_lead_hours)!==24)throw Error("fixed-24h guard failed");
if(x.train?.start!=="2024-01-01"||x.train?.end!=="2024-12-31"||x.holdout?.start!=="2025-01-01"||x.holdout?.end!=="2025-12-31")throw Error("all-season chronological split does not match frozen design");

const regimes=["western","hybrid","eastern"];
function weighted(metric,kind){let num=0,den=0;for(const r of regimes){const m=x.report?.[r]?.[kind];if(!m||!Number.isFinite(m.n)||!Number.isFinite(m[metric]))continue;num+=m.n*m[metric];den+=m.n;}return den?num/den:null;}
const baselineBrier=weighted("brier","baseline");
const candidateBrier=weighted("brier","candidate");
const regimeEvidence={};
let hnBaseNum=0,hnCandNum=0,hnDen=0,hnBaseBrierNum=0,hnCandBrierNum=0;
for(const r of regimes){
  const b=x.report?.[r]?.baseline||{},c=x.report?.[r]?.candidate||{},h=x.report?.[r]?.hard_negative_analysis||{},hb=h.baseline||{},hc=h.candidate||{},n=Number(hc.n);
  regimeEvidence[r]={n:c.n??null,events:c.events??null,baseline_brier:b.brier??null,candidate_brier:c.brier??null,brier_delta:Number.isFinite(c.brier)&&Number.isFinite(b.brier)?c.brier-b.brier:null,baseline_auc:b.auc??null,candidate_auc:c.auc??null,auc_delta:Number.isFinite(c.auc)&&Number.isFinite(b.auc)?c.auc-b.auc:null,baseline_far_50:b.at50?.far??null,candidate_far_50:c.at50?.far??null,hard_negatives_holdout:x.report?.[r]?.hard_negatives_holdout??null,hard_negative_analysis:{selection_rule:h.selection_rule??null,target_train_pod:h.target_train_pod??null,baseline:hb,candidate:hc,baseline_holdout_at_train_threshold:h.baseline_holdout_at_train_threshold??null,candidate_holdout_at_train_threshold:h.candidate_holdout_at_train_threshold??null}};
  if(Number.isFinite(n)&&n>0){
    if(Number.isFinite(hb.fpr_at_train_matched_pod))hnBaseNum+=n*hb.fpr_at_train_matched_pod;
    if(Number.isFinite(hc.fpr_at_train_matched_pod))hnCandNum+=n*hc.fpr_at_train_matched_pod;
    if(Number.isFinite(hb.brier_negative_only))hnBaseBrierNum+=n*hb.brier_negative_only;
    if(Number.isFinite(hc.brier_negative_only))hnCandBrierNum+=n*hc.brier_negative_only;
    hnDen+=n;
  }
}
const terrain=x.report?.terrain_response||{};
const hardNegativeAggregate={
  n:hnDen||null,
  weighted_baseline_fpr_at_train_matched_pod:hnDen?hnBaseNum/hnDen:null,
  weighted_candidate_fpr_at_train_matched_pod:hnDen?hnCandNum/hnDen:null,
  weighted_fpr_delta:hnDen?(hnCandNum-hnBaseNum)/hnDen:null,
  weighted_baseline_negative_brier:hnDen?hnBaseBrierNum/hnDen:null,
  weighted_candidate_negative_brier:hnDen?hnCandBrierNum/hnDen:null,
  weighted_negative_brier_delta:hnDen?(hnCandBrierNum-hnBaseBrierNum)/hnDen:null,
  improves_false_alarm_rate:hnDen?hnCandNum<hnBaseNum:null,
  improves_negative_brier:hnDen?hnCandBrierNum<hnBaseBrierNum:null,
  threshold_policy:"Each model/regime threshold is selected on 2024 training only to reach >=50% POD, then frozen for 2025 hard-negative scoring."
};
const evidence={
  status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
  generated:new Date().toISOString(),
  source_candidate:INPUT,
  frozen_design:{train:x.train,holdout:x.holdout,upper_air_cache:x.upper_air_cache},
  aggregate:{
    weighted_baseline_brier:baselineBrier,
    weighted_candidate_brier:candidateBrier,
    weighted_brier_delta:Number.isFinite(candidateBrier)&&Number.isFinite(baselineBrier)?candidateBrier-baselineBrier:null,
    brier_improves_overall:Number.isFinite(candidateBrier)&&Number.isFinite(baselineBrier)?candidateBrier<baselineBrier:null,
  },
  regimes:regimeEvidence,
  hard_negative_aggregate:hardNegativeAggregate,
  terrain_response:{
    n:terrain.n??null,
    raw_mae_mph:terrain.raw_mae_mph??null,
    corrected_mae_mph:terrain.corrected_mae_mph??null,
    mae_delta_mph:Number.isFinite(terrain.corrected_mae_mph)&&Number.isFinite(terrain.raw_mae_mph)?terrain.corrected_mae_mph-terrain.raw_mae_mph:null,
    raw_bias_mph:terrain.raw_bias_mph??null,
    corrected_bias_mph:terrain.corrected_bias_mph??null,
  },
  promotion_gate_status:"EVIDENCE_ONLY_NOT_A_PROMOTION_DECISION",
  notes:[
    "Weighted Brier is computed exactly from regime sample counts and regime Brier scores.",
    "AUC is not aggregated by weighted averaging because that is not a valid pooled AUC calculation.",
    "Hard-negative false-alarm evidence uses thresholds selected only on the 2024 training period, then frozen before scoring the 2025 holdout.",
    "Fixed 0.10/0.20/0.30/0.50 hard-negative false-positive rates and negative-only Brier are retained per regime for threshold-independent context.",
    "No NWS superiority claim is permitted until the matched archived NDFD benchmark is complete."
  ],
  rules:{future_observation_leakage:false,fire_outcome_used:false,missing_values:"preserved/null",hard_negative_threshold_tuning:"2024 training only"}
};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence,null,2));
