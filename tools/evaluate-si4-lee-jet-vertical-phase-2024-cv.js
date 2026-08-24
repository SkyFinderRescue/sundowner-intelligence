"use strict";

// SI-4 research only. lee_jet_vertical_phase_v1, 2024 chronological CV only.
// This evaluator reuses the already-validated upstream-thermal CV scoring harness
// but replaces only the predeclared candidate feature transform. No holdout data path exists.
const fs=require("fs");
const cp=require("child_process");
const path=require("path");

const START="2024-01-01", END="2024-12-31";
const BASE=path.join(__dirname,"evaluate-si4-upstream-thermal-2024-cv.js");
const TMP="/tmp/evaluate-si4-lee-jet-vertical-phase-2024-cv.generated.js";
const OUT=process.env.OUT||"research/si4-lee-jet-vertical-phase-2024-cv.json";

let src=fs.readFileSync(BASE,"utf8");
if(!src.includes('const START="2024-01-01", END="2024-12-31"')) throw Error("base chronological-development guard missing");
if(!src.includes("holdout_2025_loaded:false")) throw Error("base holdout guard missing");
if(src.includes("2025-")) throw Error("base evaluator unexpectedly contains a 2025 date");

const begin=src.indexOf("function upstreamFeatures(");
const end=src.indexOf("function standardize(",begin);
if(begin<0||end<0||end<=begin) throw Error("validated feature-function seam not found");

const replacement=String.raw`function upstreamFeatures(m,time,base){
 const get=n=>m.get(time+"|"+n),syv=get("santa_ynez_valley"),cuy=get("cuyama_interior"),lee=get("santa_barbara_lee"),chn=get("western_channel");
 if(![syv,cuy,lee,chn].every(Array.isArray))return null;
 const q=(p,h)=>plevel(p,h), vals={
  l850:q(lee,850),l700:q(lee,700),c850:q(chn,850),c700:q(chn,700),
  s850:q(syv,850),s700:q(syv,700),u850:q(cuy,850),u700:q(cuy,700)
 };
 if(!Object.values(vals).every(Boolean))return null;
 const omega=k=>Number(vals[k].vvelPaS);
 const all=Object.keys(vals).map(omega); if(!all.every(Number.isFinite))return null;
 // GRIB pressure vertical velocity (omega): negative = ascent, positive = descent.
 const leeMean=mean([omega("l850"),omega("l700")]);
 const channelMean=mean([omega("c850"),omega("c700")]);
 const upstreamMean=mean([omega("s850"),omega("s700"),omega("u850"),omega("u700")]);
 const leeMinusUpstream=leeMean-upstreamMean;
 const channelMinusLee=channelMean-leeMean;
 const leeAscent=clamp((-leeMean-.01)/.24,0,1);
 const channelAscent=clamp((-channelMean-.01)/.24,0,1);
 const leeDescent=clamp((leeMean+.01)/.24,0,1);
 const lessUpwardThanUpstream=clamp((leeMinusUpstream+.01)/.24,0,1);
 const liftSuppression=clamp(Math.max(leeAscent,.70*channelAscent),0,1);
 const downwardCoupling=clamp(Math.max(leeDescent,lessUpwardThanUpstream),0,1);
 const contrastLee=clamp((leeMinusUpstream+.24)/.48,0,1);
 const contrastChannel=clamp((channelMinusLee+.24)/.48,0,1);
 const pressure=clamp(base.x[1],0,1), wave=clamp(base.wave.score,0,1);
 return {raw:{lee_omega_850_pas:omega("l850"),lee_omega_700_pas:omega("l700"),channel_omega_850_pas:omega("c850"),channel_omega_700_pas:omega("c700"),upstream_mean_omega_pas:upstreamMean,lee_minus_upstream_omega_pas:leeMinusUpstream,channel_minus_lee_omega_pas:channelMinusLee},scaled:[leeAscent,channelAscent,downwardCoupling,contrastLee,contrastChannel,liftSuppression*pressure,liftSuppression*wave,downwardCoupling*pressure,downwardCoupling*wave]};
}
`;

src=src.slice(0,begin)+replacement+src.slice(end);
src=src.replaceAll("upstream_thermal_subsidence_v1","lee_jet_vertical_phase_v1");
src=src.replace('const OUT=process.env.OUT||"research/si4-upstream-thermal-2024-cv.json";','const OUT=process.env.OUT||"research/si4-lee-jet-vertical-phase-2024-cv.json";');
src=src.replace("Per-regime regularized logistic model adds only predeclared upstream thermal/northerly/subsidence support and interactions with existing pressure/wave state; all scaling/model fitting and threshold selection occur inside each prior chronological training window.","Per-regime regularized logistic model adds only predeclared lee/channel/upstream omega vertical-phase diagnostics, wave-lift suppression, downward-coupling support and interactions with existing issuance-time pressure/wave state; all scaling/model fitting and threshold selection occur inside each prior chronological training window.");
src=src.replaceAll("upstream:uf.raw","vertical_phase:uf.raw");
fs.writeFileSync(TMP,src);
const env={...process.env,OUT};
const r=cp.spawnSync(process.execPath,[TMP],{stdio:"inherit",env});
if(r.error)throw r.error;
process.exit(r.status??1);
