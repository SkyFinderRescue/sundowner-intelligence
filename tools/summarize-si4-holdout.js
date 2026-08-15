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
for(const r of regimes){const b=x.report?.[r]?.baseline||{},c=x.report?.[r]?.candidate||{};regimeEvidence[r]={n:c.n??null,events:c.events??null,baseline_brier:b.brier??null,candidate_brier:c.brier??null,brier_delta:Number.isFinite(c.brier)&&Number.isFinite(b.brier)?c.brier-b.brier:null,baseline_auc:b.auc??null,candidate_auc:c.auc??null,auc_delta:Number.isFinite(c.auc)&&Number.isFinite(b.auc)?c.auc-b.auc:null,baseline_far_50:b.at50?.far??null,candidate_far_50:c.at50?.far??null,hard_negatives_holdout:x.report?.[r]?.hard_negatives_holdout??null};}
const terrain=x.report?.terrain_response||{};
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
    "Hard-negative counts are reported but hard-negative FAR requires row-level candidate probabilities and remains an unfinished gate.",
    "No NWS superiority claim is permitted until the matched archived NDFD benchmark is complete."
  ],
  rules:{future_observation_leakage:false,fire_outcome_used:false,missing_values:"preserved/null"}
};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence,null,2));
