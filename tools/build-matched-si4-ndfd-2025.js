"use strict";

const fs=require("fs");
const S=require("../research/si4-science");

const NDFD=process.env.NDFD||"/tmp/ndfd/ndfd-holdout-range-2025.json";
const CANDIDATE=process.env.CANDIDATE||"/tmp/si4/si4-calibration-candidate.json";
const UPPER=process.env.UPPER||"/tmp/si4/hrrr-upper-fixed-lead-all-season.json";
const OUT=process.env.OUT||"/tmp/matched-si4-ndfd-2025.json";

const PAIRS={
  GVTC1:{name:"Gaviota",lat:34.48,lon:-120.23,regime:"western",targetDir:345},
  RHWC1:{name:"Refugio",lat:34.49,lon:-120.07,regime:"western",targetDir:355},
  MPWC1:{name:"San Marcos Pass",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10},
  MTIC1:{name:"Montecito",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20},
  CXPC1:{name:"Carpinteria",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25}
};
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576],iza:[34.6068,-120.0756],vbg:[34.7373,-120.5843]};
const SURF=["relative_humidity_2m","wind_speed_10m","wind_direction_10m","wind_gusts_10m","shortwave_radiation"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sig=x=>1/(1+Math.exp(-x));
const logit=p=>{p=clamp(p,.001,.999);return Math.log(p/(1-p));};
const rad=x=>x*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));
const mean=a=>{const b=a.filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:null;};

async function text(url,attempts=3){let last;for(let i=0;i<attempts;i++){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Matched-Benchmark/1.0"}});clearTimeout(timer);if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,200)} URL=${url}`);return await r.text();}catch(e){clearTimeout(timer);last=e;if(i+1<attempts)await new Promise(r=>setTimeout(r,1500*(i+1)));}}throw last;}
async function json(url){return JSON.parse(await text(url));}
function dateChunks(start,end){const out=[];let s=new Date(`${start}T00:00:00Z`),last=new Date(`${end}T00:00:00Z`);while(s<=last){let e=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()+1,0));if(e>last)e=last;out.push([s.toISOString().slice(0,10),e.toISOString().slice(0,10)]);s=new Date(e.getTime()+86400000);}return out;}
function prev(v){return `${v}_previous_day1`;}
async function previous(lat,lon,vars,start,end){const merged={time:[],data:Object.fromEntries(vars.map(v=>[v,[]]))};for(const[a,b]of dateChunks(start,end)){const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:a,end_date:b,hourly:vars.map(prev).join(","),wind_speed_unit:"mph",timezone:"GMT",models:"gfs_hrrr"});const j=await json(u),times=j.hourly?.time||[];merged.time.push(...times);for(const v of vars)merged.data[v].push(...(j.hourly?.[prev(v)]||Array(times.length).fill(null)));}return merged;}
function indexTimes(j){return new Map(j.time.map((t,i)=>[t.slice(0,13),i]));}
function val(j,i,k){const n=Number(j.data[k]?.[i]);return Number.isFinite(n)?n:null;}
function loadUpper(){const x=JSON.parse(fs.readFileSync(UPPER,"utf8"));if(x.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION"||Number(x.minimum_forecast_lead_hours)!==24||Number(x.failure_count||0)!==0)throw Error("authoritative exact-time upper cache guard failed");if(x.rules?.exact_target_valid_times_only!==true||x.rules?.future_observations_used_as_predictors!==false)throw Error("upper cache leakage guard failed");const m=new Map();for(const r of x.rows||[]){const t=String(r.valid_time||"").slice(0,13);if(t&&r.zone)m.set(`${t}|${r.zone}`,{profile:r.profile,lead:Number(r.forecast_lead_hours),run:r.run_time});}return m;}
function toScienceProfile(p){return(p||[]).map(r=>({pressureHpa:Number(r.pressureHpa),heightM:Number(r.heightM),temperatureC:Number(r.temperatureC),windSpeed:Number(r.windSpeedMph),windDirection:Number(r.windDirectionDeg),relativeHumidityPct:Number(r.relativeHumidityPct)})).filter(r=>[r.pressureHpa,r.heightM,r.temperatureC,r.windSpeed,r.windDirection].every(Number.isFinite));}
function upperDryness(profile){const a=profile.map(r=>Number(r.relativeHumidityPct)).filter(Number.isFinite);return a.length?clamp((55-mean(a))/45,0,1):.5;}
function baseline(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),press=z.regime==="western"?west:z.regime==="eastern"?east:Math.max(west,east),surf=clamp((v.g*dc(v.d,z.targetDir)-12)/34,0,1),dry=clamp((36-v.rh)/29,0,1),hour=Number(v.time.slice(11,13)),eve=(hour>=16||hour<=5)?1:0,tw=eve?1:clamp((350-v.sol)/350,0,1);return sig(-4.05+1.9*press+.72*surf+.52*dry+.52*tw+.28*eve);}
function pressureSupport(v,z){const west=sig((-v.s-1.8)/.8),east=sig((-v.b-1.2)/1),local=sig((-(v.iza??0)-1.3)/1);return z.regime==="western"?Math.max(west,.65*local):z.regime==="eastern"?Math.max(east,.55*local):Math.max(west,east,.6*local);}
function featureRow(v,z,profile){const p0=baseline(v,z),ps=pressureSupport(v,z),wave=S.mountainWaveIndex(profile,z.targetDir),month=Number(v.time.slice(5,7)),phase=2*Math.PI*(month-1)/12,strengthening=clamp((-(v.pressureTrend3h||0)+.25)/1.75,0,1),ud=upperDryness(profile);return{baseline:p0,wave,x:[logit(p0),ps,strengthening,wave.score,wave.critical.below5km?1:0,ud,clamp((36-v.rh)/29,0,1),Math.sin(phase),Math.cos(phase)]};}
function predict(model,x){let z=model.intercept;for(let j=0;j<x.length;j++)z+=model.weights[j]*((x[j]-model.mean[j])/model.sd[j]);return sig(z);}
function directionSector(dir){return Math.round((((Number(dir)%360)+360)%360)/45)%8;}
function terrainKey(row){return`${row.zone}|${directionSector(row.modelDir)}|${row.wave.score>=.55?"wave":"plain"}`;}
function terrainCorrection(model,row){const exact=model.corrections[terrainKey(row)]?.biasMph;return Number.isFinite(exact)?exact:Number(model.zoneFallback[row.zone]?.biasMph)||0;}
async function loadPressure(start,end){const data={},indices={};for(const[key,[lat,lon]]of Object.entries(AIRPORTS)){data[key]=await previous(lat,lon,["pressure_msl"],start,end);indices[key]=indexTimes(data[key]);}return{data,indices};}
function airportPressure(p,key,time){const i=p.indices[key].get(time);return i==null?null:val(p.data[key],i,"pressure_msl");}
function gradientAt(p,key,time){const sba=airportPressure(p,"sba",time),other=airportPressure(p,key,time);return Number.isFinite(sba)&&Number.isFinite(other)?sba-other:null;}

(async()=>{
  const ndfd=JSON.parse(fs.readFileSync(NDFD,"utf8")),candidate=JSON.parse(fs.readFileSync(CANDIDATE,"utf8"));
  if(candidate.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw Error("candidate research guard failed");
  const sourceRows=ndfd.rows||[];if(sourceRows.length!==195)throw Error(`expected frozen 195 NDFD rows, got ${sourceRows.length}`);
  const dates=sourceRows.map(r=>String(r.target_valid_utc).slice(0,10)).sort(),start=dates[0],end=dates[dates.length-1],upper=loadUpper(),pressure=await loadPressure(start,end),surface={};
  for(const [station,z] of Object.entries(PAIRS)){const j=await previous(z.lat,z.lon,SURF,start,end);surface[station]={j,index:indexTimes(j)};}
  const rows=[],missing=[];
  for(const n of sourceRows){
    const z=PAIRS[n.station_id];if(!z){missing.push({key:n.station_id,reason:"unknown_station"});continue;}
    const time=String(n.target_valid_utc).slice(0,13),upperEntry=upper.get(`${time}|${z.name}`),profile=toScienceProfile(upperEntry?.profile);if(profile.length<4){missing.push({key:`${time}|${z.name}`,reason:"missing_upper"});continue;}
    const ss=surface[n.station_id],i=ss.index.get(time);if(i==null){missing.push({key:`${time}|${z.name}`,reason:"missing_surface"});continue;}
    const b=gradientAt(pressure,"bfl",time),s=gradientAt(pressure,"smx",time),iza=gradientAt(pressure,"iza",time),vbg=gradientAt(pressure,"vbg",time),rh=val(ss.j,i,"relative_humidity_2m"),g=val(ss.j,i,"wind_gusts_10m"),d=val(ss.j,i,"wind_direction_10m"),sol=val(ss.j,i,"shortwave_radiation");
    if(![b,s,iza,vbg,rh,g,d,sol].every(Number.isFinite)){missing.push({key:`${time}|${z.name}`,reason:"missing_predictor"});continue;}
    const priorTime=new Date(new Date(`${time}:00:00Z`).getTime()-3*3600000).toISOString().slice(0,13),bPrior=gradientAt(pressure,"bfl",priorTime),sPrior=gradientAt(pressure,"smx",priorTime),current=z.regime==="western"?s:z.regime==="eastern"?b:Math.min(b,s),prior=z.regime==="western"?sPrior:z.regime==="eastern"?bPrior:(Number.isFinite(bPrior)&&Number.isFinite(sPrior)?Math.min(bPrior,sPrior):null),pressureTrend3h=Number.isFinite(prior)?current-prior:0;
    const f=featureRow({time,b,s,iza,vbg,rh,g,d,sol,pressureTrend3h},z,profile),obs=n.observation||{},obsSpeed=Number(obs.speed_mph),obsDir=Number(obs.direction_deg),obsGust=Number(obs.gust_mph),event=Number.isFinite(obsSpeed)&&Number.isFinite(obsDir)&&obsSpeed*dc(obsDir,z.targetDir)>=20?1:0;
    const tr={zone:z.name,modelDir:d,wave:f.wave};const corr=terrainCorrection(candidate.terrain_response,tr);
    rows.push({valid_time:n.target_valid_utc,zone:z.name,station_id:n.station_id,regime:z.regime,observed_event:event,observed_speed_mph:Number.isFinite(obsSpeed)?obsSpeed:null,observed_gust_mph:Number.isFinite(obsGust)?obsGust:null,observed_direction_deg:Number.isFinite(obsDir)?obsDir:null,observation_time_utc:obs.time_utc||null,si3_probability:f.baseline,si4_probability:predict(candidate.models[z.regime],f.x),si3_gust_mph:g,si4_gust_mph:g+corr,si_model_direction_deg:d,si_hrrr_run_time:upperEntry.run,si_hrrr_lead_hours:upperEntry.lead,ndfd_gust_mph:n.ndfd_gust_mph??null,ndfd_wind_speed_mph:n.ndfd_wind_speed_mph??null,ndfd_wind_direction_deg:n.ndfd_wind_direction_deg??null,ndfd_grid_distance_km:n.ndfd_grid_distance_km??null,hard_negative:S.hardNegativeFlag({pressureSupport:f.x[1],mountainWaveScore:f.wave.score,eventObserved:!!event}).isHardNegative});
  }
  const out={status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",generated:new Date().toISOString(),purpose:"Exact-row 2025 SI-3/SI-4/NDFD matched benchmark construction. NDFD receives no fabricated probability.",provenance:{authoritative_si4_run_id:31925677059,authoritative_si4_head:"764dd885590970bfc272a0dbd0a2e8ae691cb3ed",ndfd_frozen_score_run_id:31970887477,ndfd_rule_source:"research/NDFD_2024_FROZEN_RULES.json",predictor_source:"Open-Meteo previous-runs gfs_hrrr previous_day1, same SI-4 builder logic",upper_air_source:"NOAA HRRR extended-cycle archive at exact frozen NDFD valid times; minimum lead 24h"},rules:{future_observations_label_only:true,fire_association_used:false,missing_values_fabricated:false,ndfd_probability_invented:false,model_coefficients_changed:false,ndfd_rows_or_thresholds_changed:false},source_rows:sourceRows.length,matched_rows:rows.length,missing,rows};
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");console.log(JSON.stringify({source_rows:sourceRows.length,matched_rows:rows.length,missing:missing.length},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
