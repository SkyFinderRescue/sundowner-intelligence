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
  const TARGET_DIR = {Gaviota:345, Refugio:355};

  function contributions(r){
    return r.x.map((v,j)=>model.weights[j]*((v-model.mean[j])/model.sd[j]));
  }
  function angleDiff(a,b){
    if(!Number.isFinite(Number(a))||!Number.isFinite(Number(b))) return null;
    return Math.abs((((Number(a)-Number(b))+540)%360)-180);
  }
  function coupling(r){
    const target=TARGET_DIR[r.zone];
    const raw=upper.map.get(r.time+"|"+r.zone);
    const profile=toScienceProfile(raw||[]);
    if(!target||profile.length<4)return null;
    return S.surfaceCouplingIndex({
      levels:profile,
      targetDirection:target,
      regime,
      pressureSupport:r.x[1]
    });
  }
  const couplingCache=new Map();
  function couplingFor(r){
    const key=r.time+"|"+r.zone;
    if(!couplingCache.has(key))couplingCache.set(key,coupling(r));
    return couplingCache.get(key);
  }
  function extraValue(r,name){
    const target=TARGET_DIR[r.zone];
    if(name==="surface_direction_error_deg") return angleDiff(r.modelDir,target);
    if(name==="surface_direction_alignment") return Number.isFinite(target)&&Number.isFinite(r.modelDir)?dc(r.modelDir,target):null;
    if(name==="surface_cross_barrier_gust_mph") return Number.isFinite(target)&&Number.isFinite(r.modelDir)&&Number.isFinite(r.modelGust)?r.modelGust*dc(r.modelDir,target):null;
    if(name==="model_gust_mph") return Number.isFinite(r.modelGust)?r.modelGust:null;
    if(name==="wave_mean_cross_barrier_mph") return Number.isFinite(r.wave?.meanCrossBarrier)?r.wave.meanCrossBarrier:null;
    if(name==="ridge_stability_n_per_sec") return Number.isFinite(r.wave?.nPerSec)?r.wave.nPerSec:null;
    if(name==="froude") return Number.isFinite(r.wave?.froude)?r.wave.froude:null;
    if(name==="critical_height_m") return Number.isFinite(r.wave?.critical?.criticalHeightM)?r.wave.critical.criticalHeightM:null;
    if(name==="critical_below_3km") return r.wave?.critical?.present?(r.wave.critical.below3km?1:0):0;
    if(name==="hour_utc") return Number(String(r.time||"").slice(11,13));
    const c=couplingFor(r);
    if(!c)return null;
    if(name==="surface_coupling") return c.surfaceCoupling;
    if(name==="surface_event_support") return c.surfaceEventSupport;
    if(name==="jet_access") return c.jetAccess;
    if(name==="coupling_resistance") return c.resistance;
    if(name==="rotor_susceptibility") return c.hydraulicJumpRotor?.score;
    if(name==="low_level_reversal") return c.hydraulicJumpRotor?.lowLevelReversal?1:0;
    if(name==="jet_surface_drop_mph") return c.structure?.jetSurfaceDrop;
    if(name==="jet_height_relative_ridge_m") return c.structure?.jetHeightRelativeRidgeM;
    if(name==="profile_inversion_strength_c") return c.structure?.inversionStrengthC;
    if(name==="profile_theta_gradient_k_per_km") return c.structure?.maxThetaGradientKPerKm;
    return null;
  }
  const EXTRA_NAMES=[
    "surface_direction_error_deg","surface_direction_alignment","surface_cross_barrier_gust_mph","model_gust_mph",
    "wave_mean_cross_barrier_mph","ridge_stability_n_per_sec","froude","critical_height_m","critical_below_3km","hour_utc",
    "surface_coupling","surface_event_support","jet_access","coupling_resistance","rotor_susceptibility","low_level_reversal",
    "jet_surface_drop_mph","jet_height_relative_ridge_m","profile_inversion_strength_c","profile_theta_gradient_k_per_km"
  ];

  function group(name, arr){
    const features = {};
    for(let j=0;j<FEATURE_NAMES.length;j++){
      features[FEATURE_NAMES[j]] = {
        raw: summarize(arr.map(r=>r.x[j])),
        logit_contribution: summarize(arr.map(r=>contributions(r)[j]))
      };
    }
    const extra = {};
    for(const n of EXTRA_NAMES) extra[n]=summarize(arr.map(r=>extraValue(r,n)));
    const byZone = {};
    for(const z of [...new Set(arr.map(r=>r.zone))]){
      const a=arr.filter(r=>r.zone===z);
      const zoneExtra={};
      for(const n of EXTRA_NAMES) zoneExtra[n]=summarize(a.map(r=>extraValue(r,n)));
      byZone[z]={n:a.length,candidate_probability:summarize(a.map(candidate)),baseline_probability:summarize(a.map(r=>r.baseline)),extra_diagnostics:zoneExtra};
    }
    return {name,n:arr.length,candidate_probability:summarize(arr.map(candidate)),baseline_probability:summarize(arr.map(r=>r.baseline)),features,extra_diagnostics:extra,by_zone:byZone};
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
  const extraContrast={};
  for(const n of EXTRA_NAMES){
    const hn=hard.map(r=>extraValue(r,n)), ev=events.map(r=>extraValue(r,n)), on=ordinaryNegatives.map(r=>extraValue(r,n));
    extraContrast[n]={
      hard_negative_minus_event_mean:(mean(hn)-mean(ev)),
      hard_negative_minus_ordinary_negative_mean:(mean(hn)-mean(on)),
      hard_negative_summary:summarize(hn),event_summary:summarize(ev),ordinary_negative_summary:summarize(on)
    };
  }

  const couplingThresholds=[.25,.30,.35,.40,.45,.50];
  const couplingScreen=couplingThresholds.map(threshold=>({
    threshold,
    hard_negative_below:hard.filter(r=>(extraValue(r,"surface_coupling")??1)<threshold).length,
    events_below:events.filter(r=>(extraValue(r,"surface_coupling")??1)<threshold).length,
    hard_negative_rate:hard.length?hard.filter(r=>(extraValue(r,"surface_coupling")??1)<threshold).length/hard.length:null,
    event_loss_rate:events.length?events.filter(r=>(extraValue(r,"surface_coupling")??1)<threshold).length/events.length:null
  }));

  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"2024-training-only western hard-negative feature/contribution diagnostic including SWEX-informed jet-to-surface coupling, inversion/jet structure and hydraulic-jump/rotor susceptibility. No 2025 observations are loaded and no model coefficients are changed.",
    frozen_design:{train_start:TRAIN_START,train_end:TRAIN_END,forecast_lead_hours:24,upper_air_cache:upper.meta},
    rules:{future_observations_loaded:false,fire_association_used:false,model_coefficients_changed:false,diagnostic_only:true,extra_diagnostics_not_model_features:true,goes_inputs_used:false,marine_inputs_missing_are_neutral:true},
    counts:{western_rows:rows.length,events:events.length,hard_negatives:hard.length,ordinary_negatives:ordinaryNegatives.length},
    model:{feature_names:FEATURE_NAMES,intercept:model.intercept,weights:model.weights,mean:model.mean,sd:model.sd},
    groups:{events:group("events",events),hard_negatives:group("hard_negatives",hard),ordinary_negatives:group("ordinary_negatives",ordinaryNegatives)},
    feature_contrast:featureContrast,
    unused_physics_contrast:extraContrast,
    surface_coupling_threshold_screen:couplingScreen
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,hard_negative_probability:out.groups.hard_negatives.candidate_probability,surface_coupling_threshold_screen:couplingScreen,unused_physics_contrast:out.unused_physics_contrast},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

// The frozen builder owns the science/data definitions. Appending the diagnostic
// main keeps this script from drifting to a second implementation.
eval(defs + "\n" + diagnosticMain);
