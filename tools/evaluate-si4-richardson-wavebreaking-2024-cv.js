"use strict";

// SI-4 research only. This evaluator MUST NOT read 2025 observations/outcomes.
// Hypothesis and gates were persisted before this file in
// research/SI4_RICHARDSON_WAVEBREAKING_PREDECLARED.md.

const fs=require("fs");
const S=require("../research/si4-science");

const START="2024-01-01", END="2024-12-31";
const UPPER_CACHE=process.env.UPPER_CACHE||"research/hrrr-upper-fixed-lead-all-season.json";
const OUT=process.env.OUT||"research/si4-richardson-wavebreaking-2024-cv.json";
const PAIRS=[
  {name:"Gaviota",station:"GVTC1",lat:34.48,lon:-120.23,regime:"western",targetDir:345},
  {name:"Refugio",station:"RHWC1",lat:34.49,lon:-120.07,regime:"western",targetDir:355},
  {name:"San Marcos Pass",station:"MPWC1",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10},
  {name:"Montecito",station:"MTIC1",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20},
  {name:"Carpinteria",station:"CXPC1",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25}
];
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576],iza:[34.6068,-120.0756],vbg:[34.7373,-120.5843]};
const SURF=["relative_humidity_2m","wind_speed_10m","wind_direction_10m","wind_gusts_10m","shortwave_radiation"];
const G=9.80665, MPH_TO_MS=0.44704, KAPPA=0.2854;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sig=x=>1/(1+Math.exp(-x));
const logit=p=>{p=clamp(p,.001,.999);return Math.log(p/(1-p));};
const rad=x=>x*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;};

async function text(url,attempts=4){
  let last;
  for(let i=0;i<attempts;i++){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
    try{
      const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Richardson-CV/1.0"}});
      clearTimeout(timer);
      if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,200)} URL=${url}`);
      return await r.text();
    }catch(e){
      clearTimeout(timer); last=e;
      if(i+1<attempts)await new Promise(res=>setTimeout(res,1500*(i+1)));
    }
  }
  throw last;
}
async function json(url){return JSON.parse(await text(url));}
function csvRows(source){
  const lines=source.trim().split(/\r?\n/); if(lines.length<2)return[];
  const h=lines[0].split(",");
  return lines.slice(1).map(line=>{const v=line.split(","),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});
}
function dateChunks(start,end){
  const out=[]; let s=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);
  while(s<=last){let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));if(e>last)e=last;out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);s=new Date(e.getTime()+86400000);}
  return out;
}
async function hads(station,start,end){
  const out=new Map();
  for(const[a,b]of dateChunks(start,end)){
    const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");
    u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${a}T00:00Z`,ets:`${b}T23:59Z`,what:"txt",delim:"comma"});
    for(const r of csvRows(await text(u))){
      const speed=Number(r.USIRGZZ),gust=Number(r.UPHRGZZ),dir=Number(r.UDIRGZZ);
      if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;
      const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);
      out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});
    }
  }
  return out;
}
function prev(v){return `${v}_previous_day1`;}
async function previous(lat,lon,vars,start,end){
  const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};
  for(const[a,b]of dateChunks(start,end)){
    const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");
    u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,hourly:vars.map(prev).join(","),wind_speed_unit:"mph",timezone:"GMT",models:"gfs_hrrr"});
    const j=await json(u),times=j.hourly?.time||[]; merged.time.push(...times);
    for(const v of vars)merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));
  }
  return merged;
}
function indexTimes(j){return new Map(j.time.map((t,i)=>[t.slice(0,13),i]));}
function val(j,i,k){const n=Number(j.data[k]?.[i]);return Number.isFinite(n)?n:null;}
function loadUpper(){
  const x=JSON.parse(fs.readFileSync(UPPER_CACHE,"utf8"));
  if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION"||Number(x.forecast_lead_hours)!==24||Number(x.failure_count||0)!==0)throw Error("invalid frozen F24 upper cache");
  if(String(x.start)<"2024-01-01"||String(x.end)>"2025-12-31")throw Error("unexpected upper cache range");
  const m=new Map();
  for(const r of x.rows||[]){
    const t=String(r.valid_time||"").slice(0,13);
    if(t.startsWith("2024-")&&r.zone&&Array.isArray(r.profile))m.set(`${t}|${r.zone}`,r.profile);
  }
  return m;
}
function toProfile(p){
  return(p||[]).map(r=>({
    pressureHpa:Number(r.pressureHpa),heightM:Number(r.heightM),temperatureC:Number(r.temperatureC),
    windSpeed:Number(r.windSpeedMph),windDirection:Number(r.windDirectionDeg),relativeHumidityPct:Number(r.relativeHumidityPct)
  })).filter(r=>[r.pressureHpa,r.heightM,r.temperatureC,r.windSpeed,r.windDirection].every(Number.isFinite));
}
function upperDryness(profile){const a=profile.map(r=>Number(r.relativeHumidityPct)).filter(Number.isFinite);return a.length?clamp((55-mean(a))/45,0,1):.5;}
function baseline(v,z){
  const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east),
    surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34,0,1),dry=clamp((36-v.rh)/29,0,1),
    hour=Number(v.time.slice(11,13)),eve=(hour>=16||hour<=5)?1:0,tw=eve?1:clamp((350-v.sol)/350,0,1);
  return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);
}
function pressureSupport(v,z){
  const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),local=sig((-(v.iza??0)-1.3)/1);
  return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);
}
function baseFeatures(v,z,profile){
  const p0=baseline(v,z),ps=pressureSupport(v,z),wave=S.mountainWaveIndex(profile,z.targetDir),
    month=Number(v.time.slice(5,7)),phase=2*Math.PI*(month-1)/12,
    strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75,0,1),ud=upperDryness(profile);
  return{baseline:p0,wave,x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,ud,clamp((36-v.rh)/29,0,1),Math.sin(phase),Math.cos(phase)]};
}
function saturationVaporPressureHpa(tempC){return 6.112*Math.exp((17.67*tempC)/(tempC+243.5));}
function virtualPotentialTemperatureK(r){
  const t=Number(r.temperatureC),p=Number(r.pressureHpa),rh=Number(r.relativeHumidityPct);
  if(![t,p,rh].every(Number.isFinite)||p<=0||rh<0)return null;
  const es=saturationVaporPressureHpa(t),e=clamp(rh,0,100)/100*es;
  if(!Number.isFinite(e)||e<=0||e>=p)return null;
  const mix=0.622*e/(p-e),tv=(t+273.15)*(1+0.61*mix);
  return tv*Math.pow(1000/p,KAPPA);
}
function windUV(r){
  const sp=Number(r.windSpeed),d=Number(r.windDirection);
  if(![sp,d].every(Number.isFinite))return null;
  const m=sp*MPH_TO_MS,rr=rad(d);
  return{u:-m*Math.sin(rr),v:-m*Math.cos(rr)};
}
function richardsonDiagnostic(profile){
  const p=profile.slice().sort((a,b)=>a.heightM-b.heightM),layers=[];
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1],dz=Number(b.heightM)-Number(a.heightM),ta=virtualPotentialTemperatureK(a),tb=virtualPotentialTemperatureK(b),wa=windUV(a),wb=windUV(b);
    if(!(dz>0)||![ta,tb].every(Number.isFinite)||!wa||!wb)continue;
    const du=wb.u-wa.u,dv=wb.v-wa.v,shear2=du*du+dv*dv;
    if(!(shear2>1e-6))continue;
    const theta=.5*(ta+tb),ri=(G/theta)*((tb-ta)*dz)/shear2,shear=Math.sqrt(shear2)/dz;
    if(!Number.isFinite(ri)||!Number.isFinite(shear))continue;
    layers.push({bottomHpa:a.pressureHpa,topHpa:b.pressureHpa,bottomM:a.heightM,topM:b.heightM,ri,shearPerSec:shear});
  }
  if(layers.length<2)return null;
  const minRi=Math.min(...layers.map(x=>x.ri)),maxShear=Math.max(...layers.map(x=>x.shearPerSec));
  return{
    validLayers:layers.length,minRi,
    fracLe025:layers.filter(x=>x.ri<=.25).length/layers.length,
    fracLe050:layers.filter(x=>x.ri<=.50).length/layers.length,
    maxShearPerSec:maxShear,layers
  };
}
function candidateFeatures(base,ri){
  return [...base.x,clamp(ri.minRi,-1,4),ri.fracLe025,ri.fracLe050,Math.log1p(ri.maxShearPerSec*1000)];
}
function standardize(rows,key){
  const n=rows[0][key].length,mu=Array(n).fill(0),sd=Array(n).fill(1);
  for(let j=0;j<n;j++){mu[j]=mean(rows.map(r=>r[key][j]));sd[j]=Math.sqrt(mean(rows.map(r=>(r[key][j]-mu[j])**2)))||1;}
  return{mean:mu,sd};
}
function fit(rows,key){
  if(rows.length<350)throw Error(`insufficient rows ${rows.length}`);
  const sc=standardize(rows,key),n=rows[0][key].length,w=Array(n).fill(0);let b=0,lr=.035;
  for(let step=0;step<2200;step++){
    let gb=0,gw=Array(n).fill(0);
    for(const r of rows){const x=r[key].map((v,j)=>(v-sc.mean[j])/sc.sd[j]),q=sig(b+w.reduce((s,a,j)=>s+a*x[j],0)),e=q-r.y;gb+=e;for(let j=0;j<n;j++)gw[j]+=e*x[j];}
    b-=lr*gb/rows.length;for(let j=0;j<n;j++)w[j]-=lr*(gw[j]/rows.length+.002*w[j]);lr*=.9992;
  }
  return{intercept:b,weights:w,mean:sc.mean,sd:sc.sd};
}
function predict(m,x){let z=m.intercept;for(let j=0;j<x.length;j++)z+=m.weights[j]*((x[j]-m.mean[j])/m.sd[j]);return sig(z);}
function auc(rows,pf){
  const a=rows.slice().sort((a,b)=>pf(b)-pf(a)),pos=a.filter(r=>r.y).length,neg=a.length-pos;if(!pos||!neg)return null;
  let rank=0,tp=0;for(const r of a){if(r.y)tp++;else rank+=tp;}return rank/(pos*neg);
}
function brier(rows,pf){return mean(rows.map(r=>(pf(r)-r.y)**2));}
function cls(rows,pf,t){
  let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const yes=pf(r)>=t;if(yes&&r.y)tp++;else if(yes)fp++;else if(r.y)fn++;else tn++;}
  return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null};
}
function thresholdForPod(rows,pf,target=.5){
  const c=[...new Set(rows.map(pf))].sort((a,b)=>b-a);for(const t of c){const m=cls(rows,pf,t);if(Number.isFinite(m.pod)&&m.pod>=target)return t;}return c.at(-1);
}
function hardNeg(rows){return rows.filter(r=>S.hardNegativeFlag({pressureSupport:r.xBase[1],mountainWaveScore:r.wave.score,eventObserved:!!r.y}).isHardNegative);}
function eventEpisodes(rows,pf,t,truth){
  const by=new Map();for(const r of rows){if(!by.has(r.zone))by.set(r.zone,[]);by.get(r.zone).push(r);}
  const eps=[];for(const[z,a0]of by){const a=a0.slice().sort((x,y)=>x.time.localeCompare(y.time));let cur=null;for(const r of a){const yes=truth?!!r.y:pf(r)>=t;if(!yes){cur=null;continue;}const ms=Date.parse(`${r.time}:00:00Z`);if(!cur||ms-cur.last>2*3600000){cur={zone:z,start:r.time,end:r.time,last:ms};eps.push(cur);}else{cur.end=r.time;cur.last=ms;}}}
  return eps;
}
function eventMetrics(rows,pf,t){
  const truth=eventEpisodes(rows,pf,t,true),pred=eventEpisodes(rows,pf,t,false);
  const overlap=(a,b)=>a.zone===b.zone&&Date.parse(`${a.start}:00:00Z`)<=Date.parse(`${b.end}:00:00Z`)&&Date.parse(`${b.start}:00:00Z`)<=Date.parse(`${a.end}:00:00Z`);
  const hit=truth.filter(e=>pred.some(p=>overlap(e,p))).length,fp=pred.filter(p=>!truth.some(e=>overlap(e,p))).length;
  return{truth_events:truth.length,predicted_episodes:pred.length,hits:hit,pod:truth.length?hit/truth.length:null,false_alarm_episodes:fp,far:pred.length?fp/pred.length:null};
}
function metrics(rows,pf,t){
  const hn=hardNeg(rows),c=cls(rows,pf,t);
  return{
    n:rows.length,events:rows.filter(r=>r.y).length,brier:brier(rows,pf),auc:auc(rows,pf),
    classification:c,event:eventMetrics(rows,pf,t),
    hard_negative:{n:hn.length,brier:hn.length?brier(hn,pf):null,fpr:hn.length?hn.filter(r=>pf(r)>=t).length/hn.length:null},
    threshold:t
  };
}
function aggregate(a){
  return{
    n:a.reduce((s,x)=>s+x.n,0),events:a.reduce((s,x)=>s+x.events,0),
    brier:mean(a.map(x=>x.brier)),auc:mean(a.map(x=>x.auc)),event_pod:mean(a.map(x=>x.event.pod)),
    event_far:mean(a.map(x=>x.event.far)),hard_negative_brier:mean(a.map(x=>x.hard_negative.brier)),
    hard_negative_fpr:mean(a.map(x=>x.hard_negative.fpr)),spatial_zone_precision:mean(a.map(x=>x.classification.precision))
  };
}
async function dataset(){
  const upper=loadUpper(),pressureData={},pressureIdx={};
  for(const[k,[lat,lon]]of Object.entries(AIRPORTS)){pressureData[k]=await previous(lat,lon,["pressure_msl"],START,END);pressureIdx[k]=indexTimes(pressureData[k]);}
  const ap=(k,t)=>{const i=pressureIdx[k].get(t);return i==null?null:val(pressureData[k],i,"pressure_msl");},
    grad=(k,t)=>{const a=ap("sba",t),b=ap(k,t);return Number.isFinite(a)&&Number.isFinite(b)?a-b:null;};
  const rows=[];let eligibleBeforeRi=0;
  for(const z of PAIRS){
    const obs=await hads(z.station,START,END),surface=await previous(z.lat,z.lon,SURF,START,END),si=indexTimes(surface);
    for(const[time,o]of obs){
      if(!time.startsWith("2024-"))continue;
      const raw=upper.get(`${time}|${z.name}`),i=si.get(time);if(!raw||i==null)continue;
      const b=grad("bfl",time),s=grad("smx",time),iza=grad("iza",time),vbg=grad("vbg",time),rh=val(surface,i,"relative_humidity_2m"),g=val(surface,i,"wind_gusts_10m"),d=val(surface,i,"wind_direction_10m"),sol=val(surface,i,"shortwave_radiation");
      if(![b,s,iza,vbg,rh,g,d,sol].every(Number.isFinite))continue;
      const priorTime=new Date(Date.parse(`${time}:00:00Z`)-3*3600000).toISOString().slice(0,13),b0=grad("bfl",priorTime),s0=grad("smx",priorTime),
        cur=z.regime==="western"?s:z.regime==="eastern"?b:Math.min(b,s),pr=z.regime==="western"?s0:z.regime==="eastern"?b0:(Number.isFinite(b0)&&Number.isFinite(s0)?Math.min(b0,s0):null);
      const v={time,b,s,iza,vbg,rh,g,d,sol,pressureTrend3h:Number.isFinite(pr)?cur-pr:0},profile=toProfile(raw);if(profile.length<4)continue;
      const f=baseFeatures(v,z,profile);eligibleBeforeRi++;
      const ri=richardsonDiagnostic(profile);if(!ri)continue;
      rows.push({baseline:f.baseline,wave:f.wave,xBase:f.x,xCandidate:candidateFeatures(f,ri),ri,y:o.speed*dc(o.dir,z.targetDir)>=20?1:0,zone:z.name,regime:z.regime,time});
    }
  }
  return{rows,eligibleBeforeRi};
}

(async()=>{
  const data=await dataset(),rows=data.rows;
  const folds=[
    {name:"May-Jun",trainEnd:"2024-04-30T23",valStart:"2024-05-01T00",valEnd:"2024-06-30T23"},
    {name:"Jul-Sep",trainEnd:"2024-06-30T23",valStart:"2024-07-01T00",valEnd:"2024-09-30T23"},
    {name:"Oct-Dec",trainEnd:"2024-09-30T23",valStart:"2024-10-01T00",valEnd:"2024-12-31T23"}
  ],baseResults=[],candidateResults=[],regimeResults=[];
  for(const fold of folds){
    const tr=rows.filter(r=>r.time<=fold.trainEnd),va=rows.filter(r=>r.time>=fold.valStart&&r.time<=fold.valEnd),baseModels={},candidateModels={};
    for(const reg of["western","hybrid","eastern"]){baseModels[reg]=fit(tr.filter(r=>r.regime===reg),"xBase");candidateModels[reg]=fit(tr.filter(r=>r.regime===reg),"xCandidate");}
    const basePf=r=>predict(baseModels[r.regime],r.xBase),candPf=r=>predict(candidateModels[r.regime],r.xCandidate),
      baseT=thresholdForPod(tr,basePf,.5),candT=thresholdForPod(tr,candPf,.5);
    baseResults.push({fold:fold.name,...metrics(va,basePf,baseT)});
    candidateResults.push({fold:fold.name,...metrics(va,candPf,candT)});
    for(const reg of["western","hybrid","eastern"]){
      const vr=va.filter(r=>r.regime===reg);
      regimeResults.push({fold:fold.name,regime:reg,baseline:{brier:brier(vr,basePf),auc:auc(vr,basePf)},candidate:{brier:brier(vr,candPf),auc:auc(vr,candPf)},n:vr.length,events:vr.filter(r=>r.y).length});
    }
  }
  const baseAgg=aggregate(baseResults),candAgg=aggregate(candidateResults),coverage=data.eligibleBeforeRi?rows.length/data.eligibleBeforeRi:0;
  const regimeSafety={};
  for(const reg of["western","hybrid","eastern"]){
    const rr=regimeResults.filter(x=>x.regime===reg),bb=mean(rr.map(x=>x.baseline.brier)),cb=mean(rr.map(x=>x.candidate.brier)),
      ba=mean(rr.map(x=>x.baseline.auc)),ca=mean(rr.map(x=>x.candidate.auc));
    regimeSafety[reg]={baseline_brier:bb,candidate_brier:cb,baseline_auc:ba,candidate_auc:ca,
      passes_brier:Number.isFinite(bb)&&Number.isFinite(cb)&&cb<=bb*1.02,
      passes_auc:!Number.isFinite(ba)||!Number.isFinite(ca)||ca>=ba-.01};
  }
  const gates={
    event_pod_gain:Number.isFinite(candAgg.event_pod)&&Number.isFinite(baseAgg.event_pod)&&candAgg.event_pod>=baseAgg.event_pod+.05,
    event_far_no_worse:!Number.isFinite(baseAgg.event_far)||!Number.isFinite(candAgg.event_far)||candAgg.event_far<=baseAgg.event_far,
    overall_brier_no_worse:candAgg.brier<=baseAgg.brier,
    overall_auc_noninferior:candAgg.auc>=baseAgg.auc-.005,
    hard_negative_brier_no_worse:candAgg.hard_negative_brier<=baseAgg.hard_negative_brier,
    hard_negative_fpr_no_worse:!Number.isFinite(baseAgg.hard_negative_fpr)||candAgg.hard_negative_fpr<=baseAgg.hard_negative_fpr,
    spatial_precision_noninferior:!Number.isFinite(baseAgg.spatial_zone_precision)||candAgg.spatial_zone_precision>=baseAgg.spatial_zone_precision-.01,
    regime_safety:Object.values(regimeSafety).every(x=>x.passes_brier&&x.passes_auc),
    gust_noninferior_by_construction:true,
    diagnostic_coverage:coverage>=.90
  };
  const passesAll=Object.values(gates).every(Boolean);
  const out={
    status:"RESEARCH_ONLY_2024_DEVELOPMENT",generated:new Date().toISOString(),
    rules:{development_year:2024,holdout_2025_loaded:false,future_observations_label_only:true,fire_outcome_used:false,missing_values_fabricated:false,chronological_validation:true,predeclared_hypothesis_file:"research/SI4_RICHARDSON_WAVEBREAKING_PREDECLARED.md",production_change_authorized:false},
    diagnostic:{name:"coarse_bulk_richardson_wavebreaking_susceptibility_v1",interpretation:"susceptibility_only_not_proof",features:["clip(min_Ri_B,-1,4)","fraction_Ri_le_0.25","fraction_Ri_le_0.50","log1p(max_vector_shear_s^-1*1000)"]},
    promotion_gates:{event_pod_gain_absolute:.05,event_far_max_degradation_absolute:0,overall_brier_max_degradation:0,overall_auc_max_degradation_absolute:.005,hard_negative_brier_max_degradation:0,hard_negative_fpr_max_degradation_absolute:0,spatial_precision_max_degradation_absolute:.01,regime_brier_max_relative_degradation:.02,regime_auc_max_degradation_absolute:.01,diagnostic_coverage_min:.90},
    counts:{eligible_before_richardson:data.eligibleBeforeRi,rows:rows.length,coverage,events:rows.filter(r=>r.y).length},
    baseline:{aggregate:baseAgg,folds:baseResults},candidate:{aggregate:candAgg,folds:candidateResults},regime_results:regimeResults,regime_safety:regimeSafety,gates,passes_all_2024:passesAll,
    eligible_for_single_frozen_2025_score:passesAll
  };
  fs.mkdirSync("research",{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,baseline:baseAgg,candidate:candAgg,gates,passes_all_2024:passesAll},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
