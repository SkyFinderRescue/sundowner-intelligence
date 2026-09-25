"use strict";

const fs = require("fs");
const S = require("../research/si4-science");

const inputs = (process.env.INPUTS || process.argv.slice(2).join(","))
  .split(",").map(s=>s.trim()).filter(Boolean);
const OUT = process.env.OUT || "research/si4-hrrr-cycle-agreement.json";
if (inputs.length < 2) throw new Error("provide at least two HRRR profile JSON inputs via INPUTS");

const TARGET = {
  "Gaviota":345,"Refugio":355,"Goleta":0,"San Marcos Pass":10,
  "Mission Canyon":15,"Montecito":20,"Toro Canyon":22,"Carpinteria":25
};
const groups = new Map();
const provenance = [];
for (const file of inputs) {
  const x = JSON.parse(fs.readFileSync(file,"utf8"));
  if (x.status !== "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION") throw new Error(`research-only guard missing: ${file}`);
  if (Number(x.failure_count||0) !== 0) throw new Error(`input contains failures: ${file}`);
  provenance.push({file,source:x.source,forecast_lead_hours:x.forecast_lead_hours,start:x.start,end:x.end,rows:(x.rows||[]).length});
  for (const r of x.rows||[]) {
    const key = `${r.valid_time}|${r.zone}`;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r);
  }
}

const q = (a,p) => {
  const x=a.filter(Number.isFinite).sort((a,b)=>a-b); if(!x.length)return null;
  const z=(x.length-1)*p,lo=Math.floor(z),hi=Math.ceil(z); return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(z-lo);
};
const mean=a=>{const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:null;};
const rows=[];
for (const [key, members] of groups) {
  const [valid_time,zone] = key.split("|");
  const target = TARGET[zone];
  if (!Number.isFinite(target)) continue;
  const cycles=[];
  for (const r of members) {
    const profile=(r.profile||[]).map(p=>({
      pressureHpa:Number(p.pressureHpa),heightM:Number(p.heightM),temperatureC:Number(p.temperatureC),
      windSpeed:Number(p.windSpeedMph),windDirection:Number(p.windDirectionDeg),relativeHumidityPct:Number(p.relativeHumidityPct)
    }));
    const wave=S.mountainWaveIndex(profile,target);
    cycles.push({run_time:r.run_time,forecast_lead_hours:Number(r.forecast_lead_hours),wave_score:wave.score,mean_cross_barrier_mph:wave.meanCrossBarrier,critical_height_m:wave.critical?.criticalHeightM??null});
  }
  cycles.sort((a,b)=>new Date(a.run_time)-new Date(b.run_time));
  if(cycles.length<2) continue;
  const waveAgreement=S.cycleAgreement(cycles.map(c=>c.wave_score*100));
  const crossAgreement=S.cycleAgreement(cycles.map(c=>c.mean_cross_barrier_mph));
  const critVals=cycles.map(c=>c.critical_height_m).filter(Number.isFinite);
  rows.push({valid_time,zone,n_cycles:cycles.length,cycles,
    wave_score_agreement:waveAgreement,cross_barrier_agreement:crossAgreement,
    critical_height_spread_m:critVals.length>=2?Math.max(...critVals)-Math.min(...critVals):null});
}
const eligible=rows.filter(r=>r.n_cycles>=3);
const waveSpreads=eligible.map(r=>r.wave_score_agreement.spread).filter(Number.isFinite);
const crossSpreads=eligible.map(r=>r.cross_barrier_agreement.spread).filter(Number.isFinite);
const output={
  status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
  generated:new Date().toISOString(),
  rule:"Descriptive HRRR forecast-cycle agreement only. No verifying observations, coefficient fitting, or promotion claim is made by this artifact.",
  provenance,
  summary:{groups_total:rows.length,groups_with_at_least_3_cycles:eligible.length,
    wave_score_spread_points:{mean:mean(waveSpreads),p50:q(waveSpreads,.5),p90:q(waveSpreads,.9)},
    cross_barrier_spread_mph:{mean:mean(crossSpreads),p50:q(crossSpreads,.5),p90:q(crossSpreads,.9)}},
  rows
};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify(output.summary,null,2));
if (!eligible.length) process.exit(2);
