"use strict";

const fs=require("fs");
const S=require("../research/si4-science");

const TRAIN_START=process.env.TRAIN_START||"2024-01-01";
const TRAIN_END=process.env.TRAIN_END||"2024-12-31";
const TEST_START=process.env.TEST_START||"2025-01-01";
const TEST_END=process.env.TEST_END||"2025-12-31";
const UPPER_CACHE=process.env.UPPER_CACHE||"research/hrrr-upper-fixed-lead.json";
const OUT=process.env.OUT||"research/si4-calibration-candidate.json";

const PAIRS=[
  {name:"Gaviota",station:"GVTC1",lat:34.48,lon:-120.23,regime:"western",targetDir:345},
  {name:"Refugio",station:"RHWC1",lat:34.49,lon:-120.07,regime:"western",targetDir:355},
  {name:"San Marcos Pass",station:"MPWC1",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10},
  {name:"Montecito",station:"MTIC1",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20},
  {name:"Carpinteria",station:"CXPC1",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25}
];
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576],iza:[34.6068,-120.0756],vbg:[34.7373,-120.5843]};
const SURF=["relative_humidity_2m","wind_speed_10m","wind_direction_10m","wind_gusts_10m","shortwave_radiation"];
const FEATURE_NAMES=["baseline_logit","pressure_support","pressure_strengthening_3h","mountain_wave_index","critical_level_below_5km","upper_dryness","surface_dryness","season_sin","season_cos"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sig=x=>1/(1+Math.exp(-x));
const logit=p=>{p=clamp(p,.001,.999);return Math.log(p/(1-p));};
const rad=x=>x*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));

async function text(url,attempts=3){let last;for(let i=0;i<attempts;i++){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Research/1.1"}});clearTimeout(timer);if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,240)} URL=${url}`);return await r.text();}catch(e){clearTimeout(timer);last=e;if(i+1<attempts)await new Promise(resolve=>setTimeout(resolve,1000*(i+1)));}}throw last;}
async function json(url){return JSON.parse(await text(url));}
function csvRows(source){const lines=source.trim().split(/\r?\n/);if(lines.length<2)return[];const h=lines[0].split(",");return lines.slice(1).map(line=>{const v=line.split(","),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});}
function dateChunks(start,end){const out=[];let s=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);while(s<=last){let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));if(e>last)e=last;out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);s=new Date(e.getTime()+86400000);}return out;}
async function hads(station,start,end){const out=new Map();for(const[a,b]of dateChunks(start,end)){const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${a}T00:00Z`,ets:`${b}T23:59Z`,what:"txt",delim:"comma"});for(const r of csvRows(await text(u))){const speed=Number(r.USIRGZZ),gust=Number(r.UPHRGZZ),dir=Number(r.UDIRGZZ);if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});}}return out;}
function prev(v){return `${v}_previous_day1`;}
async function previous(lat,lon,vars,start,end){const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};for(const[a,b]of dateChunks(start,end)){const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,hourly:vars.map(prev).join(","),wind_speed_unit:"mph",timezone:"GMT",models:"gfs_hrrr"});const j=await json(u),times=j.hourly?.time||[];merged.time.push(...times);for(const v of vars)merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));}return merged;}
function indexTimes(j){return new Map(j.time.map((t,i)=>[t.slice(0,13),i]));}
function val(j,i,k){const n=Number(j.data[k]?.[i]);return Number.isFinite(n)?n:null;}
function median(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mean(values){const a=values.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;}

function loadUpperCache(){
  if(!fs.existsSync(UPPER_CACHE))throw Error(`UPPER_CACHE not found: ${UPPER_CACHE}`);
  const x=JSON.parse(fs.readFileSync(UPPER_CACHE,"utf8"));
  if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw Error("upper-air cache missing research-only guard");
  if(Number(x.forecast_lead_hours)!==24)throw Error(`upper-air cache must be F24, got ${x.forecast_lead_hours}`);
  if(Number(x.failure_count||0)!==0)throw Error(`upper-air cache contains ${x.failure_count} extraction failures`);
  const m=new Map();
  for(const r of x.rows||[]){
    const t=String(r.valid_time||"").slice(0,13);
    if(t&&r.zone&&Array.isArray(r.profile)&&r.profile.length>=4)m.set(`${t}|${r.zone}`,r.profile);
  }
  if(!m.size)throw Error("upper-air cache contains no usable rows");
  return {meta:{source:x.source,start:x.start,end:x.end,rows:m.size},map:m};
}
function toScienceProfile(p){return(p||[]).map(r=>({pressureHpa:Number(r.pressureHpa),heightM:Number(r.heightM),temperatureC:Number(r.temperatureC),windSpeed:Number(r.windSpeedMph),windDirection:Number(r.windDirectionDeg),relativeHumidityPct:Number(r.relativeHumidityPct)})).filter(r=>[r.pressureHpa,r.heightM,r.temperatureC,r.windSpeed,r.windDirection].every(Number.isFinite));}
function upperDryness(profile){const a=profile.map(r=>Number(r.relativeHumidityPct)).filter(Number.isFinite);return a.length?clamp((55-mean(a))/45,0,1):.5;}
function baseline(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east),surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34,0,1),dry=clamp((36-v.rh)/29,0,1),hour=Number(v.time.slice(11,13)),eve=(hour>=16||hour<=5)?1:0,tw=eve?1:clamp((350-v.sol)/350,0,1);return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);}
function pressureSupport(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),local=sig((-(v.iza??0)-1.3)/1);return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);}
function featureRow(v,z,profile){const p0=baseline(v,z),ps=pressureSupport(v,z),wave=S.mountainWaveIndex(profile,z.targetDir),month=Number(v.time.slice(5,7)),phase=2*Math.PI*(month-1)/12,strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75,0,1),ud=upperDryness(profile);return{baseline:p0,wave,upperDryness:ud,x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,ud,clamp((36-v.rh)/29,0,1),Math.sin(phase),Math.cos(phase)]};}

function standardize(rows){const n=rows[0]?.x.length||0,mu=Array(n).fill(0),sd=Array(n).fill(1);for(let j=0;j<n;j++){mu[j]=rows.reduce((s,r)=>s+r.x[j],0)/rows.length;const variance=rows.reduce((s,r)=>s+(r.x[j]-mu[j])**2,0)/rows.length;sd[j]=Math.sqrt(variance)||1;}return{mean:mu,sd,apply:x=>x.map((v,j)=>(v-mu[j])/sd[j])};}
function fit(rows,target="y"){if(rows.length<350)throw Error(`insufficient rows ${rows.length}`);const sc=standardize(rows),n=rows[0].x.length,w=Array(n).fill(0);let b=0,lr=.035;for(let step=0;step<2200;step++){let gb=0,gw=Array(n).fill(0);for(const r of rows){const x=sc.apply(r.x),q=sig(b+w.reduce((s,a,j)=>s+a*x[j],0)),e=q-r[target];gb+=e;for(let j=0;j<n;j++)gw[j]+=e*x[j];}b-=lr*gb/rows.length;for(let j=0;j<n;j++)w[j]-=lr*(gw[j]/rows.length+.002*w[j]);lr*=.9992;}return{intercept:b,weights:w,mean:sc.mean,sd:sc.sd};}
function predict(model,x){let z=model.intercept;for(let j=0;j<x.length;j++)z+=model.weights[j]*((x[j]-model.mean[j])/model.sd[j]);return sig(z);}
function auc(rows,pf,target="y"){const a=rows.slice().sort((x,y)=>pf(y)-pf(x)),pos=a.filter(x=>x[target]).length,neg=a.length-pos;if(!pos||!neg)return null;let rank=0,tp=0;for(const r of a){if(r[target])tp++;else rank+=tp;}return rank/(pos*neg);}
function brier(rows,pf,target="y"){return rows.length?rows.reduce((s,r)=>s+(pf(r)-r[target])**2,0)/rows.length:null;}
function classificationMetrics(rows,pf,target="y",threshold=.5){let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const yes=pf(r)>=threshold,actual=!!r[target];if(yes&&actual)tp++;else if(yes&&!actual)fp++;else if(!yes&&actual)fn++;else tn++;}return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null};}
function metrics(rows,pf,target="y"){return{n:rows.length,events:rows.filter(r=>r[target]).length,auc:auc(rows,pf,target),brier:brier(rows,pf,target),at50:classificationMetrics(rows,pf,target,.5)};}
function directionSector(dir){return Math.round((((Number(dir)%360)+360)%360)/45)%8;}
function terrainKey(row){return`${row.zone}|${directionSector(row.modelDir)}|${row.wave.score>=.55?"wave":"plain"}`;}
function fitTerrain(rows){const groups=new Map(),byZone=new Map();for(const r of rows){if(!Number.isFinite(r.gustResidual)||!Number.isFinite(r.modelDir))continue;const k=terrainKey(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r.gustResidual);if(!byZone.has(r.zone))byZone.set(r.zone,[]);byZone.get(r.zone).push(r.gustResidual);}const corrections={};for(const[k,a]of groups)if(a.length>=20)corrections[k]={n:a.length,biasMph:clamp(median(a),-12,12)};const zoneFallback={};for(const[z,a]of byZone)zoneFallback[z]={n:a.length,biasMph:clamp(median(a),-10,10)};return{corrections,zoneFallback};}
function terrainCorrection(model,row){const exact=model.corrections[terrainKey(row)]?.biasMph;return Number.isFinite(exact)?exact:Number(model.zoneFallback[row.zone]?.biasMph)||0;}
function terrainMetrics(rows,model){const a=rows.filter(r=>Number.isFinite(r.obsGust)&&Number.isFinite(r.modelGust));if(!a.length)return{n:0};const raw=a.map(r=>r.modelGust-r.obsGust),corrected=a.map(r=>r.modelGust+terrainCorrection(model,r)-r.obsGust);return{n:a.length,raw_mae_mph:mean(raw.map(Math.abs)),corrected_mae_mph:mean(corrected.map(Math.abs)),raw_bias_mph:mean(raw),corrected_bias_mph:mean(corrected)};}

async function loadPressure(start,end){const data={},indices={};for(const[key,[lat,lon]]of Object.entries(AIRPORTS)){data[key]=await previous(lat,lon,["pressure_msl"],start,end);indices[key]=indexTimes(data[key]);}return{data,indices};}
function airportPressure(p,key,time){const i=p.indices[key].get(time);return i==null?null:val(p.data[key],i,"pressure_msl");}
function gradientAt(p,key,time){const sba=airportPressure(p,"sba",time),other=airportPressure(p,key,time);return Number.isFinite(sba)&&Number.isFinite(other)?sba-other:null;}

async function dataset(start,end,upper){
  const pressure=await loadPressure(start,end),byReg={western:[],hybrid:[],eastern:[]},hard={western:0,hybrid:0,eastern:0};
  for(const z of PAIRS){
    const obs=await hads(z.station,start,end),surface=await previous(z.lat,z.lon,SURF,start,end),si=indexTimes(surface);
    for(const[time,o]of obs){
      const profileRaw=upper.map.get(`${time}|${z.name}`); if(!profileRaw)continue;
      const i=si.get(time); if(i==null)continue;
      const b=gradientAt(pressure,"bfl",time),s=gradientAt(pressure,"smx",time),iza=gradientAt(pressure,"iza",time),vbg=gradientAt(pressure,"vbg",time),rh=val(surface,i,"relative_humidity_2m"),g=val(surface,i,"wind_gusts_10m"),d=val(surface,i,"wind_direction_10m"),sol=val(surface,i,"shortwave_radiation");
      if(![b,s,iza,vbg,rh,g,d,sol].every(Number.isFinite))continue;
      const priorTime=new Date(new Date(`${time}:00:00Z`).getTime()-3*3600000).toISOString().slice(0,13),bPrior=gradientAt(pressure,"bfl",priorTime),sPrior=gradientAt(pressure,"smx",priorTime),current=z.regime==="western"?s:z.regime==="eastern"?b:Math.min(b,s),prior=z.regime==="western"?sPrior:z.regime==="eastern"?bPrior:(Number.isFinite(bPrior)&&Number.isFinite(sPrior)?Math.min(bPrior,sPrior):null),pressureTrend3h=Number.isFinite(prior)?current-prior:0;
      const v={time,b,s,iza,vbg,rh,g,d,sol,pressureTrend3h},profile=toScienceProfile(profileRaw); if(profile.length<4)continue;
      const f=featureRow(v,z,profile),y=o.speed*dc(o.dir,z.targetDir)>=20?1:0,sy=Math.max(o.gust||0,o.speed)>=35&&dc(o.dir,z.targetDir)>.5?1:0,obsGust=Number.isFinite(o.gust)?o.gust:o.speed;
      const row={...f,y,sy,zone:z.name,time,modelDir:d,modelGust:g,obsGust,gustResidual:Number.isFinite(obsGust)?obsGust-g:null};byReg[z.regime].push(row);
      const hn=S.hardNegativeFlag({pressureSupport:f.x[1],mountainWaveScore:f.wave.score,eventObserved:!!y});if(hn.isHardNegative)hard[z.regime]++;
    }
  }
  return{byReg,hard};
}

(async()=>{
  fs.mkdirSync("research",{recursive:true});const upper=loadUpperCache(),train=await dataset(TRAIN_START,TRAIN_END,upper),test=await dataset(TEST_START,TEST_END,upper),models={},report={};
  const allTrain=Object.values(train.byReg).flat(),allTest=Object.values(test.byReg).flat(),terrain=fitTerrain(allTrain);
  for(const regime of["western","hybrid","eastern"]){const tr=train.byReg[regime],te=test.byReg[regime],m=fit(tr);models[regime]=m;report[regime]={baseline:metrics(te,r=>r.baseline),candidate:metrics(te,r=>predict(m,r.x)),hard_negatives_train:train.hard[regime],hard_negatives_holdout:test.hard[regime]};}
  report.terrain_response=terrainMetrics(allTest,terrain);
  const out={version:`SI-4-research-${new Date().toISOString().slice(0,10)}`,generated:new Date().toISOString(),status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",feature_names:FEATURE_NAMES,upper_air_cache:upper.meta,train:{start:TRAIN_START,end:TRAIN_END,forecast_lead_hours:24},holdout:{start:TEST_START,end:TEST_END,forecast_lead_hours:24},method:"Chronological fixed-lead candidate. SI-3-compatible archived F24 surface/pressure predictors are combined with direct public HRRR Zarr F24 pressure-level profiles. HADS/RAWS verifying wind is label-only. Fire association is excluded from the Sundowner target. Terrain corrections are fit only on training residuals.",models,terrain_response:terrain,report};
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
