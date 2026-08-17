"use strict";

// Training-only diagnostic. This script deliberately reuses the frozen SI-4
// builder's data/feature definitions without changing any model coefficient.
// It must never inspect 2025 labels while defining a hard-negative remedy.

const fs = require("fs");
const path = require("path");

const BUILDER = process.env.BUILDER || "tools/build-si4-calibration.js";
const OUT = process.env.OUT || "research/si4-training-hard-negative-feature-diagnostic.json";

function quantile(values, q) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const p = (a.length - 1) * q;
  const lo = Math.floor(p), hi = Math.ceil(p);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (p - lo);
}
function mean(values) {
  const a = values.filter(Number.isFinite);
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
}
function summarize(values) {
  const a = values.filter(Number.isFinite);
  return {
    n: a.length,
    mean: mean(a),
    q10: quantile(a, .10),
    q25: quantile(a, .25),
    median: quantile(a, .50),
    q75: quantile(a, .75),
    q90: quantile(a, .90),
    min: a.length ? Math.min(...a) : null,
    max: a.length ? Math.max(...a) : null
  };
}

const source = fs.readFileSync(BUILDER, "utf8");
const marker = "\n(async()=>{";
const idx = source.indexOf(marker);
if (idx < 0) throw new Error("unable to isolate SI-4 builder definitions");
const defs = source.slice(0, idx);

const diagnosticMain = String.raw`
(async()=>{
  if (TRAIN_START !== "2024-01-01" || TRAIN_END !== "2024-12-31") throw new Error("diagnostic must remain frozen to 2024 training only");
  if (TEST_START.startsWith("2025") || TEST_END.startsWith("2025")) {
    // TEST_* is inherited from the builder defaults but this diagnostic never calls dataset() for test/holdout.
  }
  const upper = loadUpperCache();
  const train = await dataset(TRAIN_START, TRAIN_END, upper);
  const regime = "western";
  const rows = train.byReg[regime];
  const model = fit(rows);
  const candidate = r => predict(model, r.x);
  const hard = hardNegativeRows(rows);
  const events = rows.filter(r => r.y === 1);
  const ordinaryNegatives = rows.filter(r => r.y === 0 && !S.hardNegativeFlag({pressureSupport:r.x[1],mountainWaveScore:r.wave.score,eventObserved:false}).isHardNegative);

  function contributions(r){
    return r.x.map((v,j)=>model.weights[j]*((v-model.mean[j])/model.sd[j]));
  }
  function group(name, arr){
    const features = {};
    for(let j=0;j<FEATURE_NAMES.length;j++){
      features[FEATURE_NAMES[j]] = {
        raw: summarize(arr.map(r=>r.x[j])),
        logit_contribution: summarize(arr.map(r=>contributions(r)[j]))
      };
    }
    const byZone = {};
    for(const z of [...new Set(arr.map(r=>r.zone))]){
      const a=arr.filter(r=>r.zone===z);
      byZone[z]={n:a.length,candidate_probability:summarize(a.map(candidate)),baseline_probability:summarize(a.map(r=>r.baseline))};
    }
    return {name,n:arr.length,candidate_probability:summarize(arr.map(candidate)),baseline_probability:summarize(arr.map(r=>r.baseline)),features,by_zone:byZone};
  }

  const featureContrast = {};
  for(let j=0;j<FEATURE_NAMES.length;j++){
    const hn=hard.map(r=>r.x[j]), ev=events.map(r=>r.x[j]), on=ordinaryNegatives.map(r=>r.x[j]);
    const hc=hard.map(r=>contributions(r)[j]), ec=events.map(r=>contributions(r)[j]), oc=ordinaryNegatives.map(r=>contributions(r)[j]);
    featureContrast[FEATURE_NAMES[j]]={
      hard_negative_minus_event_mean_raw:(mean(hn)-mean(ev)),
      hard_negative_minus_ordinary_negative_mean_raw:(mean(hn)-mean(on)),
      hard_negative_minus_event_mean_logit_contribution:(mean(hc)-mean(ec)),
      hard_negative_minus_ordinary_negative_mean_logit_contribution:(mean(hc)-mean(oc))
    };
  }

  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"2024-training-only western hard-negative feature/contribution diagnostic. No 2025 observations are loaded and no model coefficients are changed.",
    frozen_design:{train_start:TRAIN_START,train_end:TRAIN_END,forecast_lead_hours:24,upper_air_cache:upper.meta},
    rules:{future_observations_loaded:false,fire_association_used:false,model_coefficients_changed:false,diagnostic_only:true},
    counts:{western_rows:rows.length,events:events.length,hard_negatives:hard.length,ordinary_negatives:ordinaryNegatives.length},
    model:{feature_names:FEATURE_NAMES,intercept:model.intercept,weights:model.weights,mean:model.mean,sd:model.sd},
    groups:{events:group("events",events),hard_negatives:group("hard_negatives",hard),ordinary_negatives:group("ordinary_negatives",ordinaryNegatives)},
    feature_contrast:featureContrast
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,hard_negative_probability:out.groups.hard_negatives.candidate_probability,feature_contrast:out.feature_contrast},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

// The frozen builder owns the science/data definitions. Appending the diagnostic
// main keeps this script from drifting to a second implementation.
eval(defs + "\n" + diagnosticMain);
