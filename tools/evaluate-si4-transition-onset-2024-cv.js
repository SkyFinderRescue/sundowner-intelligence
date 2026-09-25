"use strict";

// SI-4 research only. 2024 chronological development only.
// Predeclared design: research/SI4_TRANSITION_ONSET_2024_PREDECLARED.md
// This file MUST NOT read or score 2025 observations/outcomes.

const fs=require("fs");
const S=require("../research/si4-science");

const START="2024-01-01", END="2024-12-31";
const UPPER_CACHE=process.env.UPPER_CACHE||"research/hrrr-upper-fixed-lead-all-season.json";
const OUT=process.env.OUT||"research/si4-transition-onset-2024-cv.json";
const PAIRS=[
  {name:"Gaviota",station:"GVTC1",lat:34.48,lon:-120.23,regime:"western",targetDir:345},
  {name:"Refugio",station:"RHWC1",lat:34.49,lon:-120.07,regime:"western",targetDir:355},
  {name:"San Marcos Pass",station:"MPWC1",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10},
  {name:"Montecito",station:"MTIC1",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20},
  {name:"Carpinteria",station:"CXPC1",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25}
];
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576],iza:[34.6068,-120.0756]};
const KIZA={lat:34.6068,lon:-120.0756};
const SURF=["relative_humidity_2m","wind_gusts_10m","wind_direction_10m","shortwave_radiation"];
const UPSTREAM=["temperature_2m","shortwave_radiation","wind_speed_10m","wind_direction_10m"];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sig=x=>1/(1+Math.exp(-x));
const logit=p=>{p=clamp(p,.001,.999);return Math.log(p/(1-p));};
const rad=x=>Number(x)*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-Number(t))+540)%360)-180)));
const mean=a=>{const b=a.filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:null;};

async function text(url,attempts=4){let last;for(let i=0;i<attempts;i++){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Transition-CV/1.0"}});clearTimeout(timer);if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,160)} URL=${url}`);return await r.text();}catch(e){clearTimeout(timer);last=e;if(i+1<attempts)await new Promise(res=>setTimeout(res,1500*(i+1)));}}throw last;}
async function json(url){return JSON.parse(await text(url));}
function csvRows(source){const lines=source.trim().split(/\r?\n/);if(lines.length<2)return[];const h=lines[0].split(",");return lines.slice(1).map(line=>{const v=line.split(","),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});}
function dateChunks(start,end){const out=[];let s=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);while(s<=last){let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));if(e>last)e=last;out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);s=new Date(e.getTime()+86400000);}return out;}
async function hads(station){const out=new Map();for(const[a,b]of dateChunks(START,END)){const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${a}T00:00Z`,ets:`${b}T23:59Z`,what:"txt",delim:"comma"});for(const r of csvRows(await text(u))){const speed=Number(r.USIRGZZ),dir=Number(r.UDIRGZZ);if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);out.set(t,{speed,dir});}}return out;}
function prev(v){return `${v}_previous_day1`;}
async function previous(lat,lon,vars){const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};for(const[a,b]of dateChunks(START,END)){const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,hourly:vars.map(prev).join(","),wind_speed_unit:"mph",temperature_unit:"fahrenheit",timezone:"GMT",models:"gfs_hrrr"});const j=await json(u),times=j.hourly?.time||[];merged.time.push(...times);for(const v of vars)merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));}return merged;}
function indexTimes(j){return new Map(j.time.map((t,i)=>[t.slice(0,13),i]));}
function val(j,i,k){const n=Number(j.data[k]?.[i]);return Number.isFinite(n)?n:null;}
function prior(time,h=3){return new Date(Date.parse(`${time}:00:00Z`)-h*3600000).toISOString().slice(0,13);}

function loadUpper(){const x=JSON.parse(fs.readFileSync(UPPER_CACHE,"utf8"));if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION"||Number(x.forecast_lead_hours)!==24||Number(x.failure_count||0)!==0)throw Error("invalid frozen F24 upper cache");const m=new Map();for(const r of x.rows||[]){const t=String(r.valid_time||"").slice(0,13);if(t.startsWith("2024-")&&r.zone&&Array.isArray(r.profile))m.set(`${t}|${r.zone}`,r.profile);}return m;}
function profile(p){return(p||[]).map(r=>({pressureHpa:Number(r.pressureHpa),heightM:Number(r.heightM),temperatureC:Number(r.temperatureC),windSpeed:Number(r.windSpeedMph),windDirection:Number(r.windDirectionDeg),relativeHumidityPct:Number(r.relativeHumidityPct)})).filter(r=>[r.pressureHpa,r.heightM,r.temperatureC,r.windSpeed,r.windDirection].every(Number.isFinite));}
function upperDryness(p){const a=p.map(r=>Number(r.relativeHumidityPct)).filter(Number.isFinite);return a.length?clamp((55-mean(a))/45):.5;}
function criticalHeight(w){return w&&w.critical&&Number.isFinite(Number(w.critical.criticalHeightM))?Number(w.critical.criticalHeightM):null;}
function criticalTransition(now,old){const n=criticalHeight(now),o=criticalHeight(old);if(Number.isFinite(n)&&n<5000&&!Number.isFinite(o))return 1;if(Number.isFinite(n)&&Number.isFinite(o)&&o-n>=700)return 1;return 0;}
function lowNnwSupport(p){const rows=p.filter(r=>[925,850,800,700].includes(r.pressureHpa));const a=rows.map(r=>S.signedCrossBarrier(r.windSpeed,r.windDirection,330)).filter(Number.isFinite);return mean(a);}

function baseline(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east),surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34),dry=clamp((36-v.rh)/29),hour=Number(v.time.slice(11,13)),eve=(hour>=23||hour<=12)?1:0,tw=v.sol<=80?1:clamp((350-v.sol)/350);return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);}
function pressureSupport(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),local=sig((-(v.iza??0)-1.3)/1);return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);}
function baseFeatures(v,z,p){const p0=baseline(v,z),ps=pressureSupport(v,z),wave=S.mountainWaveIndex(p,z.targetDir),month=Number(v.time.slice(5,7)),phase=2*Math.PI*(month-1)/12,strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75),ud=upperDryness(p);return{p0,ps,wave,x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,ud,clamp((36-v.rh)/29),Math.sin(phase),Math.cos(phase)]};}
function transition(v,z,p,p3,up,up3){const w=S.mountainWaveIndex(p,z.targetDir),w3=S.mountainWaveIndex(p3,z.targetDir);const stabRise=Number.isFinite(w.nPerSec)&&Number.isFinite(w3.nPerSec)?w.nPerSec-w3.nPerSec:null;const momentumRise=Number.isFinite(w.meanCrossBarrier)&&Number.isFinite(w3.meanCrossBarrier)?w.meanCrossBarrier-w3.meanCrossBarrier:null;const cooling=Number.isFinite(up.temp)&&Number.isFinite(up3.temp)?up3.temp-up.temp:null;const shortwaveCollapse=(Number.isFinite(up.sol)&&Number.isFinite(up3.sol))?up3.sol-up.sol:null;const nnw=lowNnwSupport(p);const flags={stability_rise:Number.isFinite(stabRise)&&stabRise>=.001,momentum_rise:Number.isFinite(momentumRise)&&momentumRise>=3,critical_descent:!!criticalTransition(w,w3),nnw_jet:Number.isFinite(nnw)&&nnw>=12};const transitionCount=Object.values(flags).filter(Boolean).length;const evening=(Number.isFinite(up.sol)&&up.sol<=100)||(Number.isFinite(cooling)&&cooling>=2&&Number.isFinite(shortwaveCollapse)&&shortwaveCollapse>=100);return{stabRise,momentumRise,coolingF3h:cooling,shortwaveDrop3h:shortwaveCollapse,nnwSupportMph:nnw,flags,transitionCount,evening};}

function standardize(rows){const n=rows[0].x.length,mu=Array(n).fill(0),sd=Array(n).fill(1);for(let j=0;j<n;j++){mu[j]=mean(rows.map(r=>r.x[j]));sd[j]=Math.sqrt(mean(rows.map(r=>(r.x[j]-mu[j])**2)))||1;}return{mean:mu,sd};}
function fit(rows){if(rows.length<350)throw Error(`insufficient rows ${rows.length}`);const sc=standardize(rows),n=rows[0].x.length,w=Array(n).fill(0);let b=0,lr=.035;for(let step=0;step<1800;step++){let gb=0,gw=Array(n).fill(0);for(const r of rows){const x=r.x.map((v,j)=>(v-sc.mean[j])/sc.sd[j]),q=sig(b+w.reduce((s,a,j)=>s+a*x[j],0)),e=q-r.y;gb+=e;for(let j=0;j<n;j++)gw[j]+=e*x[j];}b-=lr*gb/rows.length;for(let j=0;j<n;j++)w[j]-=lr*(gw[j]/rows.length+.002*w[j]);lr*=.999;}return{intercept:b,weights:w,mean:sc.mean,sd:sc.sd};}
function predict(m,x){let z=m.intercept;for(let j=0;j<x.length;j++)z+=m.weights[j]*((x[j]-m.mean[j])/m.sd[j]);return sig(z);}
function auc(rows,pf){const a=rows.slice().sort((a,b)=>pf(b)-pf(a)),pos=a.filter(r=>r.y).length,neg=a.length-pos;if(!pos||!neg)return null;let rank=0,tp=0;for(const r of a){if(r.y)tp++;else rank+=tp;}return rank/(pos*neg);}
function brier(rows,pf){return mean(rows.map(r=>(pf(r)-r.y)**2));}
function cls(rows,pf,t){let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const yes=pf(r)>=t;if(yes&&r.y)tp++;else if(yes)fp++;else if(r.y)fn++;else tn++;}return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null,fpr:fp+tn?fp/(fp+tn):null};}
function thresholdForPod(rows,pf,target=.5){const c=[...new Set(rows.map(pf))].sort((a,b)=>b-a);for(const t of c){const m=cls(rows,pf,t);if(Number.isFinite(m.pod)&&m.pod>=target)return t;}return c.at(-1);}
function hardNeg(rows){return rows.filter(r=>S.hardNegativeFlag({pressureSupport:r.ps,mountainWaveScore:r.wave.score,eventObserved:!!r.y}).isHardNegative);}
function eventEpisodes(rows,pf,t,truth){const by=new Map();for(const r of rows){if(!by.has(r.zone))by.set(r.zone,[]);by.get(r.zone).push(r);}const eps=[];for(const[zone,a0]of by){const a=a0.slice().sort((x,y)=>x.time.localeCompare(y.time));let cur=null;for(const r of a){const yes=truth?!!r.y:pf(r)>=t;if(!yes){cur=null;continue;}const ms=Date.parse(`${r.time}:00:00Z`);if(!cur||ms-cur.last>2*3600000){cur={zone,start:r.time,end:r.time,last:ms};eps.push(cur);}else{cur.end=r.time;cur.last=ms;}}}return eps;}
function eventMetrics(rows,pf,t){const truth=eventEpisodes(rows,pf,t,true),pred=eventEpisodes(rows,pf,t,false),overlap=(a,b)=>a.zone===b.zone&&Date.parse(`${a.start}:00:00Z`)<=Date.parse(`${b.end}:00:00Z`)&&Date.parse(`${b.start}:00:00Z`)<=Date.parse(`${a.end}:00:00Z`);const hit=truth.filter(e=>pred.some(p=>overlap(e,p))).length,fp=pred.filter(p=>!truth.some(e=>overlap(e,p))).length;return{truth_events:truth.length,predicted_episodes:pred.length,hits:hit,pod:truth.length?hit/truth.length:null,false_alarm_episodes:fp,far:pred.length?fp/pred.length:null};}
function candidate(r,p,t){const near=p>=.08&&p<t,atmos=r.ps>=.38&&r.wave.score>=.30,trigger=near&&atmos&&r.transition.evening&&r.transition.transitionCount>=2;return trigger?sig(logit(p)+.45):p;}

async function dataset(){const upper=loadUpper(),pressureData={},pressureIdx={};for(const[k,[lat,lon]]of Object.entries(AIRPORTS)){pressureData[k]=await previous(lat,lon,["pressure_msl"]);pressureIdx[k]=indexTimes(pressureData[k]);}const upstream=await previous(KIZA.lat,KIZA.lon,UPSTREAM),ui=indexTimes(upstream);const ap=(k,t)=>{const i=pressureIdx[k].get(t);return i==null?null:val(pressureData[k],i,"pressure_msl");},grad=(k,t)=>{const a=ap("sba",t),b=ap(k,t);return Number.isFinite(a)&&Number.isFinite(b)?a-b:null;};const rows=[];
 for(const z of PAIRS){const obs=await hads(z.station),surface=await previous(z.lat,z.lon,SURF),si=indexTimes(surface);for(const[time,o]of obs){if(!time.startsWith("2024-"))continue;const raw=upper.get(`${time}|${z.name}`),raw3=upper.get(`${prior(time)}|${z.name}`),i=si.get(time),u=ui.get(time),u3=ui.get(prior(time));if(!raw||!raw3||i==null||u==null||u3==null)continue;const b=grad("bfl",time),s=grad("smx",time),iza=grad("iza",time),rh=val(surface,i,"relative_humidity_2m"),g=val(surface,i,"wind_gusts_10m"),d=val(surface,i,"wind_direction_10m"),sol=val(surface,i,"shortwave_radiation");if(![b,s,iza,rh,g,d,sol].every(Number.isFinite))continue;const t3=prior(time),b0=grad("bfl",t3),s0=grad("smx",t3),cur=z.regime==="western"?s:z.regime==="eastern"?b:Math.min(b,s),pr=z.regime==="western"?s0:z.regime==="eastern"?b0:(Number.isFinite(b0)&&Number.isFinite(s0)?Math.min(b0,s0):null);const v={time,b,s,iza,rh,g,d,sol,pressureTrend3h:Number.isFinite(pr)?cur-pr:0},p=profile(raw),p3=profile(raw3);if(p.length<4||p3.length<4)continue;const f=baseFeatures(v,z,p),up={temp:val(upstream,u,"temperature_2m"),sol:val(upstream,u,"shortwave_radiation")},up3={temp:val(upstream,u3,"temperature_2m"),sol:val(upstream,u3,"shortwave_radiation")},tr=transition(v,z,p,p3,up,up3),obsCross=o.speed*dc(o.dir,z.targetDir);rows.push({...f,transition:tr,time,zone:z.name,regime:z.regime,y:obsCross>=18?1:0});}}
 return rows.sort((a,b)=>a.time.localeCompare(b.time)||a.zone.localeCompare(b.zone));}

function summarize(rows,pf,t){const hn=hardNeg(rows),byRegime={};for(const rg of["western","hybrid","eastern"]){const rr=rows.filter(r=>r.regime===rg);byRegime[rg]={n:rr.length,brier:brier(rr,pf),auc:auc(rr,pf),classification:cls(rr,pf,t)};}return{n:rows.length,brier:brier(rows,pf),auc:auc(rows,pf),classification:cls(rows,pf,t),events:eventMetrics(rows,pf,t),hard_negative:{n:hn.length,brier:brier(hn,pf),classification:cls(hn,pf,t)},regimes:byRegime};}
function gates(base,cand){const rg={};for(const k of["western","hybrid","eastern"]){rg[k]={brier:cand.regimes[k].brier<=base.regimes[k].brier*1.005,auc:cand.regimes[k].auc>=base.regimes[k].auc-.005};}return{
 event_pod: cand.events.pod>=base.events.pod+.05,
 event_far: cand.events.far<=base.events.far+.01,
 hard_negative_brier: cand.hard_negative.brier<=base.hard_negative.brier*1.01,
 hard_negative_fpr: cand.hard_negative.classification.fpr<=base.hard_negative.classification.fpr+.01,
 overall_brier: cand.brier<=base.brier*1.005,
 overall_auc: cand.auc>=base.auc-.005,
 spatial_precision: cand.classification.precision>=base.classification.precision-.01,
 gust_skill_unchanged:true,
 regime:rg
 };}

(async()=>{const rows=await dataset();if(rows.length<1000)throw Error(`insufficient 2024 rows ${rows.length}`);const folds=[
 {trainEnd:"2024-02-29T23",testStart:"2024-03-01T00",testEnd:"2024-04-30T23"},
 {trainEnd:"2024-04-30T23",testStart:"2024-05-01T00",testEnd:"2024-06-30T23"},
 {trainEnd:"2024-06-30T23",testStart:"2024-07-01T00",testEnd:"2024-09-30T23"},
 {trainEnd:"2024-09-30T23",testStart:"2024-10-01T00",testEnd:"2024-12-31T23"}
 ];const oof=[],foldOut=[];for(const f of folds){const tr=rows.filter(r=>r.time<=f.trainEnd),te=rows.filter(r=>r.time>=f.testStart&&r.time<=f.testEnd);const m=fit(tr),bp=r=>predict(m,r.x),t=thresholdForPod(tr,bp,.5);for(const r of te){const p=bp(r);oof.push({...r,p_base:p,p_candidate:candidate(r,p,t),threshold:t});}foldOut.push({...f,train_n:tr.length,test_n:te.length,threshold:t});}
 const bp=r=>r.p_base,cp=r=>r.p_candidate;const threshold=mean(oof.map(r=>r.threshold)),base=summarize(oof,bp,threshold),cand=summarize(oof,cp,threshold),g=gates(base,cand);const flat=[g.event_pod,g.event_far,g.hard_negative_brier,g.hard_negative_fpr,g.overall_brier,g.overall_auc,g.spatial_precision,g.gust_skill_unchanged,...Object.values(g.regime).flatMap(x=>[x.brier,x.auc])];const eligible=flat.every(Boolean);const trig=oof.filter(r=>r.p_candidate!==r.p_base);const out={status:"RESEARCH_ONLY_2024_DEVELOPMENT",candidate:"transition_onset_v1",rules:{holdout_2025_loaded:false,future_observations_label_only:true,fire_association_outcome_only:true,chronological_validation:true,predeclared_hypothesis:true,predeclared_gates:true,production_change_authorized:false,missing_not_fabricated:true,hydraulic_jump_rotor_susceptibility_only:true},implementation:{logit_boost:.45,near_probability_floor:.08,pressure_support_min:.38,wave_score_min:.30,transition_flags_required:2,stability_rise_n_per_sec:.001,momentum_rise_mph:3,critical_descent_m:700,nnw_support_mph:12},counts:{rows:oof.length,events:oof.filter(r=>r.y).length,triggered_rows:trig.length,triggered_events:trig.filter(r=>r.y).length},folds:foldOut,baseline:base,candidate_metrics:cand,gates:g,winner_eligible_for_single_frozen_2025_score:eligible};fs.writeFileSync(OUT,JSON.stringify(out,null,2));console.log(JSON.stringify({rows:oof.length,triggered:trig.length,baseline_event_pod:base.events.pod,candidate_event_pod:cand.events.pod,baseline_event_far:base.events.far,candidate_event_far:cand.events.far,eligible},null,2));if(!eligible)process.exitCode=0;})().catch(e=>{console.error(e.stack||e);process.exit(2);});
