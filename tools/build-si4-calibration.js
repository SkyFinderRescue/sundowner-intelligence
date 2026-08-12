"use strict";

const fs = require("fs");
const S = require("../research/si4-science");

const TRAIN_START = process.env.TRAIN_START || "2024-01-01";
const TRAIN_END = process.env.TRAIN_END || "2024-12-31";
const TEST_START = process.env.TEST_START || "2025-01-01";
const TEST_END = process.env.TEST_END || "2025-12-31";
const OUT = process.env.OUT || "research/si4-calibration-candidate.json";

const PAIRS = [
  {name:"Gaviota", station:"GVTC1", lat:34.48, lon:-120.23, regime:"western", targetDir:345},
  {name:"Refugio", station:"RHWC1", lat:34.49, lon:-120.07, regime:"western", targetDir:355},
  {name:"San Marcos Pass", station:"MPWC1", lat:34.51, lon:-119.80, regime:"hybrid", targetDir:10},
  {name:"Montecito", station:"MTIC1", lat:34.45, lon:-119.63, regime:"eastern", targetDir:20},
  {name:"Carpinteria", station:"CXPC1", lat:34.42, lon:-119.52, regime:"eastern", targetDir:25}
];
const AIRPORTS = {
  sba:[34.4262,-119.8404], bfl:[35.4336,-119.0568], smx:[34.8993,-120.4576],
  iza:[34.6068,-120.0756], vbg:[34.7373,-120.5843]
};
const SURF = [
  "relative_humidity_2m","wind_speed_10m","wind_direction_10m","wind_gusts_10m",
  "shortwave_radiation","cloud_cover_low","boundary_layer_height"
];
const LEVELS = [925,850,700,600,500];
const UPPER = LEVELS.flatMap(p => [
  `wind_speed_${p}hPa`,`wind_direction_${p}hPa`,`temperature_${p}hPa`,`geopotential_height_${p}hPa`
]);
const VARS = [...SURF,"relative_humidity_925hPa",...UPPER];
const FEATURE_NAMES = [
  "baseline_logit","pressure_support","pressure_strengthening_3h","mountain_wave_index",
  "critical_level_below_5km","marine_gate_open","dryness","season_sin","season_cos"
];

const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const sig = x => 1/(1+Math.exp(-x));
const logit = p => { p=clamp(p,.001,.999); return Math.log(p/(1-p)); };
const rad = x => x*Math.PI/180;
const dc = (d,t) => Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));

async function text(url, attempts=3){
  let last;
  for(let i=0;i<attempts;i++){
    const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),45000);
    try{
      const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Research/1.0"}});
      clearTimeout(timer);
      if(!r.ok) throw Error(`${r.status} ${(await r.text()).slice(0,240)} URL=${url}`);
      return await r.text();
    } catch(e){
      clearTimeout(timer); last=e;
      if(i+1<attempts) await new Promise(resolve=>setTimeout(resolve,1000*(i+1)));
    }
  }
  throw last;
}
async function json(url){ return JSON.parse(await text(url)); }

function csvRows(source){
  const lines=source.trim().split(/\r?\n/);
  if(lines.length<2) return [];
  const headers=lines[0].split(",");
  return lines.slice(1).map(line=>{
    const values=line.split(","), row={};
    headers.forEach((key,i)=>row[key]=values[i]??"");
    return row;
  });
}
function dateChunks(start,end){
  const out=[];
  let s=new Date(`${start}T00:00:00Z`), last=new Date(`${end}T00:00:00Z`);
  while(s<=last){
    let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));
    if(e>last) e=last;
    out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);
    s=new Date(e.getTime()+86400000);
  }
  return out;
}
async function hads(station,start,end){
  const out=new Map();
  for(const [a,b] of dateChunks(start,end)){
    const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");
    u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${a}T00:00Z`,ets:`${b}T23:59Z`,what:"txt",delim:"comma"});
    for(const r of csvRows(await text(u))){
      const speed=Number(r.USIRGZZ), gust=Number(r.UPHRGZZ), dir=Number(r.UDIRGZZ);
      if(!r.utc_valid || !Number.isFinite(speed) || !Number.isFinite(dir)) continue;
      const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);
      out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});
    }
  }
  return out;
}
function prev(v){ return `${v}_previous_day1`; }
async function previous(lat,lon,vars,start,end){
  const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};
  for(const [a,b] of dateChunks(start,end)){
    const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");
    u.search=new URLSearchParams({
      latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,
      hourly:vars.map(prev).join(","),wind_speed_unit:"mph",temperature_unit:"celsius",
      timezone:"GMT",models:"gfs_hrrr"
    });
    const j=await json(u), times=j.hourly?.time||[];
    merged.time.push(...times);
    for(const v of vars) merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));
  }
  return merged;
}
function indexTimes(j){ return new Map(j.time.map((t,i)=>[t.slice(0,13),i])); }
function val(j,i,k){ const n=Number(j.data[k]?.[i]); return Number.isFinite(n)?n:null; }
function median(values){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function mean(values){ const a=values.filter(Number.isFinite); return a.length?a.reduce((s,x)=>s+x,0)/a.length:null; }

function baseline(v,z){
  const west=sig((-v.s-1.8)/.8), east=sig((-v.b-1.2)/1);
  const press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east);
  const surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34,0,1);
  const dry=clamp((36-v.rh)/29,0,1), hour=Number(v.time.slice(11,13));
  const eve=(hour>=16||hour<=5)?1:0, tw=eve?1:clamp((350-v.sol)/350,0,1);
  return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);
}
function pressureSupport(v,z){
  const west=sig((-v.s-1.8)/.8), east=sig((-v.b-1.2)/1), local=sig((-(v.iza??0)-1.3)/1);
  return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);
}
function profile(model,i){
  return LEVELS.map(p=>({
    pressureHpa:p,
    windSpeed:val(model,i,`wind_speed_${p}hPa`),
    windDirection:val(model,i,`wind_direction_${p}hPa`),
    temperatureC:val(model,i,`temperature_${p}hPa`),
    heightM:val(model,i,`geopotential_height_${p}hPa`)
  }));
}
function featureRow(v,z,model,i){
  const p0=baseline(v,z), ps=pressureSupport(v,z);
  const wave=S.mountainWaveIndex(profile(model,i),z.targetDir);
  const marine=S.marineLayerResistance({
    lowCloudPct:val(model,i,"cloud_cover_low"),
    rh925:val(model,i,"relative_humidity_925hPa"),
    boundaryLayerHeightM:val(model,i,"boundary_layer_height")
  });
  const month=Number(v.time.slice(5,7)), phase=2*Math.PI*(month-1)/12;
  const strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75,0,1);
  return {
    baseline:p0,wave,marine,
    x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,1-marine.score,clamp((36-v.rh)/29,0,1),Math.sin(phase),Math.cos(phase)]
  };
}

function standardize(rows){
  const n=rows[0]?.x.length||0, mu=Array(n).fill(0), sd=Array(n).fill(1);
  for(let j=0;j<n;j++){
    mu[j]=rows.reduce((s,r)=>s+r.x[j],0)/rows.length;
    const variance=rows.reduce((s,r)=>s+(r.x[j]-mu[j])**2,0)/rows.length;
    sd[j]=Math.sqrt(variance)||1;
  }
  return {mean:mu,sd,apply:x=>x.map((v,j)=>(v-mu[j])/sd[j])};
}
function fit(rows,target="y"){
  if(rows.length<500) throw Error(`insufficient rows ${rows.length}`);
  const sc=standardize(rows), n=rows[0].x.length, w=Array(n).fill(0);
  let b=0, lr=.035;
  for(let step=0;step<2200;step++){
    let gb=0, gw=Array(n).fill(0);
    for(const r of rows){
      const x=sc.apply(r.x), q=sig(b+w.reduce((s,a,j)=>s+a*x[j],0)), e=q-r[target];
      gb+=e;
      for(let j=0;j<n;j++) gw[j]+=e*x[j];
    }
    b-=lr*gb/rows.length;
    for(let j=0;j<n;j++) w[j]-=lr*(gw[j]/rows.length+.002*w[j]);
    lr*=.9992;
  }
  return {intercept:b,weights:w,mean:sc.mean,sd:sc.sd};
}
function predict(model,x){
  let z=model.intercept;
  for(let j=0;j<x.length;j++) z+=model.weights[j]*((x[j]-model.mean[j])/model.sd[j]);
  return sig(z);
}
function auc(rows,pf,target="y"){
  const a=rows.slice().sort((x,y)=>pf(y)-pf(x)), pos=a.filter(x=>x[target]).length, neg=a.length-pos;
  if(!pos||!neg) return null;
  let rank=0,tp=0;
  for(const r of a){ if(r[target]) tp++; else rank+=tp; }
  return rank/(pos*neg);
}
function brier(rows,pf,target="y"){
  return rows.length?rows.reduce((s,r)=>s+(pf(r)-r[target])**2,0)/rows.length:null;
}
function classificationMetrics(rows,pf,target="y",threshold=.5){
  let tp=0,fp=0,tn=0,fn=0;
  for(const r of rows){
    const yes=pf(r)>=threshold, actual=!!r[target];
    if(yes&&actual)tp++; else if(yes&&!actual)fp++; else if(!yes&&actual)fn++; else tn++;
  }
  return {tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null};
}
function metrics(rows,pf,target="y"){
  return {n:rows.length,events:rows.filter(r=>r[target]).length,auc:auc(rows,pf,target),brier:brier(rows,pf,target),at50:classificationMetrics(rows,pf,target,.5)};
}

function directionSector(dir){ return Math.round((((Number(dir)%360)+360)%360)/45)%8; }
function terrainKey(row){ return `${row.zone}|${directionSector(row.modelDir)}|${row.wave.score>=.55?"wave":"plain"}|${row.marine.score>=.55?"marine":"open"}`; }
function fitTerrain(rows){
  const groups=new Map(), byZone=new Map();
  for(const r of rows){
    if(!Number.isFinite(r.gustResidual)||!Number.isFinite(r.modelDir)) continue;
    const k=terrainKey(r);
    if(!groups.has(k)) groups.set(k,[]);
    groups.get(k).push(r.gustResidual);
    if(!byZone.has(r.zone)) byZone.set(r.zone,[]);
    byZone.get(r.zone).push(r.gustResidual);
  }
  const corrections={};
  for(const [k,a] of groups) if(a.length>=20) corrections[k]={n:a.length,biasMph:clamp(median(a),-12,12)};
  const zoneFallback={};
  for(const [z,a] of byZone) zoneFallback[z]={n:a.length,biasMph:clamp(median(a),-10,10)};
  return {corrections,zoneFallback};
}
function terrainCorrection(model,row){
  const exact=model.corrections[terrainKey(row)]?.biasMph;
  if(Number.isFinite(exact)) return exact;
  return Number(model.zoneFallback[row.zone]?.biasMph)||0;
}
function terrainMetrics(rows,model){
  const a=rows.filter(r=>Number.isFinite(r.obsGust)&&Number.isFinite(r.modelGust));
  if(!a.length) return {n:0};
  const rawErr=a.map(r=>r.modelGust-r.obsGust);
  const correctedErr=a.map(r=>r.modelGust+terrainCorrection(model,r)-r.obsGust);
  return {
    n:a.length,
    raw_mae_mph:mean(rawErr.map(Math.abs)), corrected_mae_mph:mean(correctedErr.map(Math.abs)),
    raw_bias_mph:mean(rawErr), corrected_bias_mph:mean(correctedErr)
  };
}

async function loadPressure(start,end){
  const data={}, indices={};
  for(const [key,[lat,lon]] of Object.entries(AIRPORTS)){
    data[key]=await previous(lat,lon,["pressure_msl"],start,end);
    indices[key]=indexTimes(data[key]);
  }
  return {data,indices};
}
function airportPressure(pressure,key,time){
  const i=pressure.indices[key].get(time);
  return i==null?null:val(pressure.data[key],i,"pressure_msl");
}
function gradientAt(pressure,key,time){
  const sba=airportPressure(pressure,"sba",time), other=airportPressure(pressure,key,time);
  return Number.isFinite(sba)&&Number.isFinite(other)?sba-other:null;
}

async function dataset(start,end){
  const pressure=await loadPressure(start,end);
  const byReg={western:[],hybrid:[],eastern:[]};
  const hard={western:0,hybrid:0,eastern:0}, marineBlocked={western:0,hybrid:0,eastern:0};

  for(const z of PAIRS){
    const obs=await hads(z.station,start,end);
    const model=await previous(z.lat,z.lon,VARS,start,end), mi=indexTimes(model);

    for(const [time,o] of obs){
      const i=mi.get(time);
      if(i==null) continue;
      const b=gradientAt(pressure,"bfl",time), s=gradientAt(pressure,"smx",time), iza=gradientAt(pressure,"iza",time), vbg=gradientAt(pressure,"vbg",time);
      const rh=val(model,i,"relative_humidity_2m"), g=val(model,i,"wind_gusts_10m"), d=val(model,i,"wind_direction_10m"), sol=val(model,i,"shortwave_radiation");
      if(![b,s,iza,vbg,rh,g,d,sol].every(Number.isFinite)) continue;

      const priorTime=new Date(new Date(`${time}:00:00Z`).getTime()-3*3600000).toISOString().slice(0,13);
      const bPrior=gradientAt(pressure,"bfl",priorTime), sPrior=gradientAt(pressure,"smx",priorTime);
      const currentAnchor=z.regime==="western"?s:z.regime==="eastern"?b:Math.min(b,s);
      const priorAnchor=z.regime==="western"?sPrior:z.regime==="eastern"?bPrior:(Number.isFinite(bPrior)&&Number.isFinite(sPrior)?Math.min(bPrior,sPrior):null);
      const pressureTrend3h=Number.isFinite(priorAnchor)?currentAnchor-priorAnchor:0;
      const v={time,b,s,iza,vbg,rh,g,d,sol,pressureTrend3h};
      const f=featureRow(v,z,model,i);
      const y=o.speed*dc(o.dir,z.targetDir)>=20?1:0;
      const sy=Math.max(o.gust||0,o.speed)>=35&&dc(o.dir,z.targetDir)>.5?1:0;
      const obsGust=Number.isFinite(o.gust)?o.gust:o.speed;
      const row={...f,y,sy,zone:z.name,time,modelDir:d,modelGust:g,obsGust,gustResidual:Number.isFinite(obsGust)?obsGust-g:null};
      byReg[z.regime].push(row);

      const hn=S.hardNegativeFlag({pressureSupport:f.x[1],mountainWaveScore:f.wave.score,marineResistanceScore:f.marine.score,eventObserved:!!y});
      if(hn.isHardNegative) hard[z.regime]++;
      if(hn.likelyMarineBlocked) marineBlocked[z.regime]++;
    }
  }
  return {byReg,hard,marineBlocked};
}

(async()=>{
  fs.mkdirSync("research",{recursive:true});
  const train=await dataset(TRAIN_START,TRAIN_END), test=await dataset(TEST_START,TEST_END);
  const models={}, report={};
  const allTrain=Object.values(train.byReg).flat(), allTest=Object.values(test.byReg).flat();
  const terrain=fitTerrain(allTrain);

  for(const regime of ["western","hybrid","eastern"]){
    const tr=train.byReg[regime], te=test.byReg[regime], model=fit(tr);
    models[regime]=model;
    report[regime]={
      baseline:metrics(te,r=>r.baseline),
      candidate:metrics(te,r=>predict(model,r.x)),
      hard_negatives_train:train.hard[regime],
      hard_negatives_holdout:test.hard[regime],
      marine_blocked_hard_negatives_train:train.marineBlocked[regime],
      marine_blocked_hard_negatives_holdout:test.marineBlocked[regime]
    };
  }

  report.terrain_response=terrainMetrics(allTest,terrain);
  const out={
    version:`SI-4-research-${new Date().toISOString().slice(0,10)}`,
    generated:new Date().toISOString(),
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    feature_names:FEATURE_NAMES,
    train:{start:TRAIN_START,end:TRAIN_END,forecast_lead_hours:24,model:"NOAA HRRR via Open-Meteo Previous Runs"},
    holdout:{start:TEST_START,end:TEST_END,forecast_lead_hours:24},
    method:"All-season chronological fixed-lead candidate. Predictors are from a 24-hour-old archived HRRR forecast. HADS/RAWS verifying wind is label-only. Fire association is excluded from the target. Terrain corrections are fitted only on training residuals and evaluated on holdout residuals.",
    models,terrain_response:terrain,report
  };
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{ console.error(e.stack||e); process.exit(1); });
