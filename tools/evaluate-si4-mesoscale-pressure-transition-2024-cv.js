"use strict";

// SI-4 research only: mesoscale_pressure_transition_v1.
// Development is strictly 2024 chronological CV. No 2025 observation/outcome path exists.
const fs=require("fs");
const S=require("../research/si4-science");
const START="2024-01-01", END="2024-12-31";
const UPPER_CACHE=process.env.UPPER_CACHE||"research/hrrr-upper-fixed-lead-all-season.json";
const OUT=process.env.OUT||"research/si4-mesoscale-pressure-transition-2024-cv.json";
const PAIRS=[
  {name:"Gaviota",station:"GVTC1",lat:34.48,lon:-120.23,regime:"western",targetDir:345},
  {name:"Refugio",station:"RHWC1",lat:34.49,lon:-120.07,regime:"western",targetDir:355},
  {name:"San Marcos Pass",station:"MPWC1",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10},
  {name:"Montecito",station:"MTIC1",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20},
  {name:"Carpinteria",station:"CXPC1",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25}
];
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576],iza:[34.6068,-120.0756],vbg:[34.7373,-120.5843]};
const SURF=["relative_humidity_2m","wind_speed_10m","wind_direction_10m","wind_gusts_10m","shortwave_radiation"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sig=x=>1/(1+Math.exp(-x));
const logit=p=>{p=clamp(p,.001,.999);return Math.log(p/(1-p));};
const rad=x=>x*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;};

async function text(url,attempts=4){let last;for(let i=0;i<attempts;i++){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Pressure-Transition-CV/1.0"}});clearTimeout(timer);if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,200)} URL=${url}`);return await r.text();}catch(e){clearTimeout(timer);last=e;if(i+1<attempts)await new Promise(res=>setTimeout(res,1500*(i+1)));}}throw last;}
async function json(url){return JSON.parse(await text(url));}
function csvRows(source){const lines=source.trim().split(/\r?\n/);if(lines.length<2)return[];const h=lines[0].split(",");return lines.slice(1).map(line=>{const v=line.split(","),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});}
function dateChunks(start,end){const out=[];let s=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);while(s<=last){let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));if(e>last)e=last;out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);s=new Date(e.getTime()+86400000);}return out;}
async function hads(station,start,end){const out=new Map();for(const[a,b]of dateChunks(start,end)){const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${a}T00:00Z`,ets:`${b}T23:59Z`,what:"txt",delim:"comma"});for(const r of csvRows(await text(u))){const speed=Number(r.USIRGZZ),gust=Number(r.UPHRGZZ),dir=Number(r.UDIRGZZ);if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});}}return out;}
function prev(v){return `${v}_previous_day1`;}
async function previous(lat,lon,vars,start,end){const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};for(const[a,b]of dateChunks(start,end)){const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,hourly:vars.map(prev).join(","),wind_speed_unit:"mph",timezone:"GMT",models:"gfs_hrrr"});const j=await json(u),times=j.hourly?.time||[];merged.time.push(...times);for(const v of vars)merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));}return merged;}
function indexTimes(j){return new Map(j.time.map((t,i)=>[t.slice(0,13),i]));}
function val(j,i,k){const n=Number(j.data[k]?.[i]);return Number.isFinite(n)?n:null;}
function loadUpper(){const x=JSON.parse(fs.readFileSync(UPPER_CACHE,"utf8"));if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION"||Number(x.forecast_lead_hours)!==24||Number(x.failure_count||0)!==0)throw Error("invalid frozen F24 upper cache");const m=new Map();for(const r of x.rows||[]){const t=String(r.valid_time||"").slice(0,13);if(t.startsWith("2024-")&&r.zone&&Array.isArray(r.profile))m.set(`${t}|${r.zone}`,r.profile);}if(!m.size)throw Error("no 2024 upper-air rows");return m;}
function toProfile(p){return(p||[]).map(r=>({pressureHpa:Number(r.pressureHpa),heightM:Number(r.heightM),temperatureC:Number(r.temperatureC),windSpeed:Number(r.windSpeedMph),windDirection:Number(r.windDirectionDeg),relativeHumidityPct:Number(r.relativeHumidityPct)})).filter(r=>[r.pressureHpa,r.heightM,r.temperatureC,r.windSpeed,r.windDirection].every(Number.isFinite));}
function upperDryness(profile){const a=profile.map(r=>Number(r.relativeHumidityPct)).filter(Number.isFinite);return a.length?clamp((55-mean(a))/45,0,1):.5;}
function baseline(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east),surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34,0,1),dry=clamp((36-v.rh)/29,0,1),hour=Number(v.time.slice(11,13)),eve=(hour>=16||hour<=5)?1:0,tw=eve?1:clamp((350-v.sol)/350,0,1);return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);}
function pressureSupport(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),local=sig((-(v.iza??0)-1.3)/1);return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);}
function features(v,z,profile){const p0=baseline(v,z),ps=pressureSupport(v,z),wave=S.mountainWaveIndex(profile,z.targetDir),month=Number(v.time.slice(5,7)),phase=2*Math.PI*(month-1)/12,strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75,0,1),ud=upperDryness(profile);return{baseline:p0,wave,x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,ud,clamp((36-v.rh)/29,0,1),Math.sin(phase),Math.cos(phase)]};}
function standardize(rows){const n=rows[0].x.length,mu=Array(n).fill(0),sd=Array(n).fill(1);for(let j=0;j<n;j++){mu[j]=mean(rows.map(r=>r.x[j]));sd[j]=Math.sqrt(mean(rows.map(r=>(r.x[j]-mu[j])**2)))||1;}return{mean:mu,sd};}
function fit(rows){if(rows.length<350)throw Error(`insufficient rows ${rows.length}`);const sc=standardize(rows),n=rows[0].x.length,w=Array(n).fill(0);let b=0,lr=.035;for(let step=0;step<2200;step++){let gb=0,gw=Array(n).fill(0);for(const r of rows){const x=r.x.map((v,j)=>(v-sc.mean[j])/sc.sd[j]),q=sig(b+w.reduce((s,a,j)=>s+a*x[j],0)),e=q-r.y;gb+=e;for(let j=0;j<n;j++)gw[j]+=e*x[j];}b-=lr*gb/rows.length;for(let j=0;j<n;j++)w[j]-=lr*(gw[j]/rows.length+.002*w[j]);lr*=.9992;}return{intercept:b,weights:w,mean:sc.mean,sd:sc.sd};}
function predict(m,x){let z=m.intercept;for(let j=0;j<x.length;j++)z+=m.weights[j]*((x[j]-m.mean[j])/m.sd[j]);return sig(z);}
function auc(rows,pf){const a=rows.slice().sort((a,b)=>pf(b)-pf(a)),pos=a.filter(r=>r.y).length,neg=a.length-pos;if(!pos||!neg)return null;let rank=0,tp=0;for(const r of a){if(r.y)tp++;else rank+=tp;}return rank/(pos*neg);}
function brier(rows,pf){return mean(rows.map(r=>(pf(r)-r.y)**2));}
function cls(rows,pf,t=.5){let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const yes=pf(r)>=t;if(yes&&r.y)tp++;else if(yes)fp++;else if(r.y)fn++;else tn++;}return{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null};}
function hardNeg(rows){return rows.filter(r=>S.hardNegativeFlag({pressureSupport:r.x[1],mountainWaveScore:r.wave.score,eventObserved:!!r.y}).isHardNegative);}
function eventEpisodes(rows,pf,t=.5,truth=false){const by=new Map();for(const r of rows){if(!by.has(r.zone))by.set(r.zone,[]);by.get(r.zone).push(r);}const out=[];for(const[zone,a0]of by){const a=a0.slice().sort((x,y)=>x.time.localeCompare(y.time));let cur=null;for(const r of a){const yes=truth?!!r.y:pf(r)>=t;if(!yes){cur=null;continue;}const ms=Date.parse(`${r.time}:00:00Z`);if(!cur||ms-cur.last>2*3600000){cur={zone,start:r.time,end:r.time,last:ms};out.push(cur);}else{cur.end=r.time;cur.last=ms;}}}return out;}
function eventMetrics(rows,pf,t=.5){const truth=eventEpisodes(rows,pf,t,true),pred=eventEpisodes(rows,pf,t,false),overlap=(a,b)=>a.zone===b.zone&&Date.parse(`${a.start}:00:00Z`)<=Date.parse(`${b.end}:00:00Z`)&&Date.parse(`${b.start}:00:00Z`)<=Date.parse(`${a.end}:00:00Z`);const hits=truth.filter(e=>pred.some(p=>overlap(e,p))).length,fp=pred.filter(p=>!truth.some(e=>overlap(e,p))).length;return{truth_events:truth.length,predicted_episodes:pred.length,hits,pod:truth.length?hits/truth.length:null,false_alarm_episodes:fp,far:pred.length?fp/pred.length:null};}
function metrics(rows,pf){const hn=hardNeg(rows),c=cls(rows,pf,.5);return{n:rows.length,events:rows.filter(r=>r.y).length,brier:brier(rows,pf),auc:auc(rows,pf),row:c,event:eventMetrics(rows,pf,.5),hard_negative:{n:hn.length,brier:hn.length?mean(hn.map(r=>pf(r)**2)):null,fpr:hn.length?hn.filter(r=>pf(r)>=.5).length/hn.length:null}};}
function pressureScore(g,center,scale){return sig((-(g)-center)/scale);}
function transitionDiagnostics(cur,p3,p6,regime){if(!cur||!p3||!p6)return null;const comps=["s","b","iza","vbg"];
  const support=o=>({s:pressureScore(o.s,1.8,.8),b:pressureScore(o.b,1.2,1.0),iza:pressureScore(o.iza,1.3,1.0),vbg:pressureScore(o.vbg,1.6,.9)});
  const a=support(cur),b=support(p3),c=support(p6),coherence=mean(comps.map(k=>a[k])),persistence=mean(comps.map(k=>mean([a[k],b[k],c[k]])));
  const ds=(-(cur.s-p3.s)),db=(-(cur.b-p3.b)),di=(-(cur.iza-p3.iza)),dv=(-(cur.vbg-p3.vbg));
  const strengthening=clamp(mean([ds,db,di,dv])/.9+.5,0,1);
  const westLead=ds-db; const phase=regime==="western"?clamp(.5+westLead/2,0,1):regime==="eastern"?clamp(.5-westLead/2,0,1):clamp(1-Math.abs(westLead)/2,0,1);
  return{coherence,persistence,strengthening,west_to_east_phase:phase,components_current:a,delta3h_hpa:{s:cur.s-p3.s,b:cur.b-p3.b,iza:cur.iza-p3.iza,vbg:cur.vbg-p3.vbg}};
}
const CANDIDATES=[
 {name:"zero_adjustment",apply:(r,p)=>p},
 {name:"coherent_persistent_plus_006",apply:(r,p)=>p>=.20&&r.pt.coherence>=.60&&r.pt.persistence>=.55?clamp(p+.06,0,1):p},
 {name:"coherent_persistent_plus_010",apply:(r,p)=>p>=.20&&r.pt.coherence>=.70&&r.pt.persistence>=.60?clamp(p+.10,0,1):p},
 {name:"coherent_strengthening_plus_006",apply:(r,p)=>p>=.20&&r.pt.coherence>=.55&&r.pt.strengthening>=.60?clamp(p+.06,0,1):p},
 {name:"phase_coherent_plus_006",apply:(r,p)=>p>=.20&&r.pt.coherence>=.55&&r.pt.west_to_east_phase>=.60?clamp(p+.06,0,1):p},
 {name:"asymmetric_coherent_plus_006",apply:(r,p)=>{const th=r.regime==="western"?.55:r.regime==="hybrid"?.60:.65;return p>=.20&&r.pt.coherence>=th&&r.pt.persistence>=.55?clamp(p+.06,0,1):p;}}
];
function acceptableTraining(base,cand){return cand.event.far<=base.event.far+1e-12&&cand.brier<=base.brier+1e-12&&cand.auc>=base.auc-.005&&cand.hard_negative.brier<=base.hard_negative.brier+1e-12&&cand.hard_negative.fpr<=base.hard_negative.fpr+1e-12&&cand.row.precision>=base.row.precision-.01;}
function selectCandidate(train,pf){const base=metrics(train,pf);let best=CANDIDATES[0],bestM=base;for(const c of CANDIDATES.slice(1)){const cp=r=>c.apply(r,pf(r)),m=metrics(train,cp);if(!acceptableTraining(base,m))continue;if((m.event.pod??-1)>(bestM.event.pod??-1)+1e-12||((m.event.pod??-1)===(bestM.event.pod??-1)&&(m.brier??9)<(bestM.brier??9))){best=c;bestM=m;}}return{candidate:best,training_baseline:base,training_candidate:bestM};}

async function dataset(){const upper=loadUpper(),pdata={},pidx={};for(const[k,[lat,lon]]of Object.entries(AIRPORTS)){pdata[k]=await previous(lat,lon,["pressure_msl"],START,END);pidx[k]=indexTimes(pdata[k]);}
 const ap=(k,t)=>{const i=pidx[k].get(t);return i==null?null:val(pdata[k],i,"pressure_msl");};const gradients=t=>{const sba=ap("sba",t),o={};if(!Number.isFinite(sba))return null;for(const k of["smx","bfl","iza","vbg"]){const q=ap(k,t);if(!Number.isFinite(q))return null;o[k==="smx"?"s":k==="bfl"?"b":k]=sba-q;}return o;};const rows=[];
 for(const z of PAIRS){const obs=await hads(z.station,START,END),surface=await previous(z.lat,z.lon,SURF,START,END),si=indexTimes(surface);for(const[time,o]of obs){if(!time.startsWith("2024-"))continue;const raw=upper.get(`${time}|${z.name}`),i=si.get(time);if(!raw||i==null)continue;const g0=gradients(time),t3=new Date(Date.parse(`${time}:00:00Z`)-3*3600000).toISOString().slice(0,13),t6=new Date(Date.parse(`${time}:00:00Z`)-6*3600000).toISOString().slice(0,13),g3=gradients(t3),g6=gradients(t6);if(!g0||!g3||!g6)continue;const rh=val(surface,i,"relative_humidity_2m"),g=val(surface,i,"wind_gusts_10m"),d=val(surface,i,"wind_direction_10m"),sol=val(surface,i,"shortwave_radiation");if(![rh,g,d,sol].every(Number.isFinite))continue;const trend=(z.regime==="western"?g0.s:z.regime==="eastern"?g0.b:Math.min(g0.b,g0.s))-(z.regime==="western"?g3.s:z.regime==="eastern"?g3.b:Math.min(g3.b,g3.s));const v={time,b:g0.b,s:g0.s,iza:g0.iza,vbg:g0.vbg,rh,g,d,sol,pressureTrend3h:trend},profile=toProfile(raw);if(profile.length<4)continue;const f=features(v,z,profile),pt=transitionDiagnostics(g0,g3,g6,z.regime);if(!pt)continue;rows.push({...f,pt,time,zone:z.name,regime:z.regime,y:o.speed*dc(o.dir,z.targetDir)>=20?1:0,obsGust:Number.isFinite(o.gust)?o.gust:o.speed,modelGust:g});}}
 return rows.sort((a,b)=>a.time.localeCompare(b.time)||a.zone.localeCompare(b.zone));
}

(async()=>{const rows=await dataset();if(rows.length<4000)throw Error(`insufficient 2024 rows ${rows.length}`);const folds=[
 {name:"Q2",trainEnd:"2024-03-31T23",valStart:"2024-04-01T00",valEnd:"2024-06-30T23"},
 {name:"Q3",trainEnd:"2024-06-30T23",valStart:"2024-07-01T00",valEnd:"2024-09-30T23"},
 {name:"Q4",trainEnd:"2024-09-30T23",valStart:"2024-10-01T00",valEnd:"2024-12-31T23"}
 ];const foldReports=[],oof=[];
 for(const f of folds){const tr=rows.filter(r=>r.time<=f.trainEnd),va=rows.filter(r=>r.time>=f.valStart&&r.time<=f.valEnd);const models={};for(const reg of["western","hybrid","eastern"])models[reg]=fit(tr.filter(r=>r.regime===reg));const pf=r=>predict(models[r.regime],r.x);const sel=selectCandidate(tr,pf),cpf=r=>sel.candidate.apply(r,pf(r));for(const r of va)oof.push({...r,p_base:pf(r),p_candidate:cpf(r),fold:f.name,selected:sel.candidate.name});foldReports.push({fold:f.name,train_rows:tr.length,validation_rows:va.length,selected_candidate:sel.candidate.name,training_baseline:sel.training_baseline,training_candidate:sel.training_candidate,validation_baseline:metrics(va,pf),validation_candidate:metrics(va,cpf)});}
 const bpf=r=>r.p_base,cpf=r=>r.p_candidate,base=metrics(oof,bpf),cand=metrics(oof,cpf),regimes={};for(const reg of["western","hybrid","eastern"]){const a=oof.filter(r=>r.regime===reg);regimes[reg]={baseline:metrics(a,bpf),candidate:metrics(a,cpf)};}
 const gates={event_pod_plus_005:(cand.event.pod??-1)>=(base.event.pod??0)+.05,event_far_no_worse:(cand.event.far??1)<=(base.event.far??1),overall_brier_no_worse:(cand.brier??1)<=(base.brier??1),auc_noninferior:(cand.auc??0)>=(base.auc??0)-.005,hard_negative_brier_no_worse:(cand.hard_negative.brier??1)<=(base.hard_negative.brier??1),hard_negative_fpr_no_worse:(cand.hard_negative.fpr??1)<=(base.hard_negative.fpr??1),spatial_precision_noninferior:(cand.row.precision??0)>=(base.row.precision??0)-.01,regime_safety:Object.values(regimes).every(x=>(x.candidate.brier??1)<=(x.baseline.brier??1)+.002&&(x.candidate.auc??0)>=(x.baseline.auc??0)-.01),gust_noninferior:true};const pass=Object.values(gates).every(Boolean);
 const out={status:"RESEARCH_ONLY_2024_DEVELOPMENT",candidate_family:"mesoscale_pressure_transition_v1",generated:new Date().toISOString(),rules:{development_year_only:2024,holdout_2025_loaded:false,future_observations_label_only:true,fire_association_outcome_only:true,missing_values_remain_null:true,forecast_lead_hours:24,chronological_validation:true,predeclared_hypotheses:true,predeclared_gates:true,production_change_authorized:false,gust_path_unchanged:true},candidate_family_definition:CANDIDATES.map(x=>x.name),folds:foldReports,counts:{rows:rows.length,oof_rows:oof.length,events:oof.filter(r=>r.y).length},oof:{baseline:base,candidate:cand,regimes},gates,winner_eligible_for_single_frozen_2025_score:pass,decision:pass?"PASS_2024_GATES_FREEZE_BEFORE_ONE_2025_SCORE":"REJECT_DO_NOT_EXPOSE_TO_2025"};fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");console.log(JSON.stringify({counts:out.counts,baseline:base,candidate:cand,gates,decision:out.decision,selected:foldReports.map(f=>[f.fold,f.selected_candidate])},null,2));})().catch(e=>{console.error(e.stack||e);process.exit(1);});
