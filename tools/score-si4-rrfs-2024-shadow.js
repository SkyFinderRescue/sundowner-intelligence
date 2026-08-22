"use strict";

// Deterministic 2024-only RRFS F24 shadow benchmark against the same independent
// HADS observations and the same archived F24-ish HRRR surface comparator used by
// the SI-4 research builder. Evidence only: no 2025 data, fitting, threshold tuning,
// blending, probability manufacture, or production changes.
const fs=require("fs");

const INPUT=process.env.INPUT||"research/si4-rrfs-f24-2024-shadow-sample.json";
const OUT=process.env.OUT||"research/si4-rrfs-f24-2024-shadow-score.json";
const PAIRS={
  Gaviota:{station:"GVTC1",lat:34.48,lon:-120.23,targetDir:345,regime:"western"},
  Refugio:{station:"RHWC1",lat:34.49,lon:-120.07,targetDir:355,regime:"western"},
  "San Marcos Pass":{station:"MPWC1",lat:34.51,lon:-119.80,targetDir:10,regime:"hybrid"},
  Montecito:{station:"MTIC1",lat:34.45,lon:-119.63,targetDir:20,regime:"eastern"},
  Carpinteria:{station:"CXPC1",lat:34.42,lon:-119.52,targetDir:25,regime:"eastern"}
};
const VARS=["wind_speed_10m","wind_direction_10m","wind_gusts_10m"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rad=x=>x*Math.PI/180;
const dc=(d,t)=>Math.max(0,Math.cos(rad((((Number(d)-t)+540)%360)-180)));
const circErr=(a,b)=>Math.abs((((Number(a)-Number(b)+540)%360)-180));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;

async function text(url,attempts=4){
  let last;
  for(let i=0;i<attempts;i++){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
    try{
      const r=await fetch(url,{signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-RRFS-Shadow/1.0"}});
      clearTimeout(timer);
      if(!r.ok)throw Error(`${r.status} ${(await r.text()).slice(0,180)} URL=${url}`);
      return await r.text();
    }catch(e){
      clearTimeout(timer);last=e;
      if(i+1<attempts)await new Promise(resolve=>setTimeout(resolve,1000*(2**i)));
    }
  }
  throw last;
}
async function json(url){return JSON.parse(await text(url));}
function csvRows(source){
  const lines=source.trim().split(/\r?\n/);if(lines.length<2)return[];
  const h=lines[0].split(",");
  return lines.slice(1).map(line=>{const v=line.split(","),o={};h.forEach((k,i)=>o[k]=v[i]??"");return o;});
}
async function hads(station,start,end){
  const u=new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py");
  u.search=new URLSearchParams({stations:station,network:"CA_DCP",sts:`${start}T00:00Z`,ets:`${end}T23:59Z`,what:"txt",delim:"comma"});
  const out=new Map();
  for(const r of csvRows(await text(u))){
    const speed=Number(r.USIRGZZ),gust=Number(r.UPHRGZZ),dir=Number(r.UDIRGZZ);
    if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;
    const t=new Date(r.utc_valid.replace(" ","T")+"Z").toISOString().slice(0,13);
    out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});
  }
  return out;
}
function prev(v){return `${v}_previous_day1`;}
async function hrrrSurface(lat,lon,start,end){
  const u=new URL("https://previous-runs-api.open-meteo.com/v1/forecast");
  u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:start,end_date:end,hourly:VARS.map(prev).join(","),wind_speed_unit:"mph",timezone:"GMT",models:"gfs_hrrr"});
  const j=await json(u),times=j.hourly?.time||[],out=new Map();
  for(let i=0;i<times.length;i++){
    const speed=Number(j.hourly?.[prev("wind_speed_10m")]?.[i]);
    const dir=Number(j.hourly?.[prev("wind_direction_10m")]?.[i]);
    const gust=Number(j.hourly?.[prev("wind_gusts_10m")]?.[i]);
    out.set(String(times[i]).slice(0,13),{
      speed:Number.isFinite(speed)?speed:null,
      dir:Number.isFinite(dir)?dir:null,
      gust:Number.isFinite(gust)?gust:null
    });
  }
  return out;
}
function metricRows(rows,prefix){
  const matched=rows.filter(r=>Number.isFinite(r.obs_gust_mph)&&Number.isFinite(r[`${prefix}_gust_mph`]));
  const drows=rows.filter(r=>Number.isFinite(r.obs_direction_deg)&&Number.isFinite(r[`${prefix}_direction_deg`]));
  const erows=rows.filter(r=>typeof r.observed_event==="boolean"&&typeof r[`${prefix}_event`]==="boolean");
  let tp=0,fp=0,tn=0,fn=0;
  for(const r of erows){const p=r[`${prefix}_event`],y=r.observed_event;if(p&&y)tp++;else if(p&&!y)fp++;else if(!p&&y)fn++;else tn++;}
  return {
    matched_gust_rows:matched.length,
    gust_mae_mph:matched.length?mean(matched.map(r=>Math.abs(r[`${prefix}_gust_mph`]-r.obs_gust_mph))):null,
    gust_bias_mph:matched.length?mean(matched.map(r=>r[`${prefix}_gust_mph`]-r.obs_gust_mph)):null,
    matched_direction_rows:drows.length,
    direction_mae_deg:drows.length?mean(drows.map(r=>circErr(r[`${prefix}_direction_deg`],r.obs_direction_deg))):null,
    matched_event_rows:erows.length,
    event:{tp,fp,tn,fn,pod:tp+fn?tp/(tp+fn):null,far:tp+fp?fp/(tp+fp):null,precision:tp+fp?tp/(tp+fp):null}
  };
}

(async()=>{
  const src=JSON.parse(fs.readFileSync(INPUT,"utf8"));
  if(src.status!=="RESEARCH_ONLY_SHADOW_GUIDANCE")throw Error("RRFS input lacks shadow-only guard");
  if(src.rules?.development_year!==2024||src.rules?.holdout_2025_loaded!==false||src.rules?.forecast_hour_fixed!==24)throw Error("RRFS input violates frozen development rules");
  const sourceRows=(src.rows||[]).filter(r=>PAIRS[r.zone]);
  if(!sourceRows.length)throw Error("no benchmark zones in RRFS input");
  if(sourceRows.some(r=>!String(r.valid_time||"").startsWith("2024-")))throw Error("non-2024 RRFS valid time encountered");
  const times=sourceRows.map(r=>String(r.valid_time).slice(0,10)).sort();
  const start=times[0],end=times[times.length-1];
  const obsMaps={},hrrrMaps={};
  for(const [zone,z] of Object.entries(PAIRS)){
    obsMaps[zone]=await hads(z.station,start,end);
    hrrrMaps[zone]=await hrrrSurface(z.lat,z.lon,start,end);
  }
  const rows=[];
  for(const r of sourceRows){
    const z=PAIRS[r.zone],t=String(r.valid_time).slice(0,13),o=obsMaps[r.zone].get(t)||null,h=hrrrMaps[r.zone].get(t)||null;
    const rrfsSpeed=Number(r.surface?.wind10SpeedMph),rrfsDir=Number(r.surface?.wind10DirectionDeg),rrfsGust=Number(r.surface?.gustMph);
    const obsGust=o?(Number.isFinite(o.gust)?o.gust:o.speed):null;
    const observedEvent=o?o.speed*dc(o.dir,z.targetDir)>=20:null;
    const rrfsEvent=Number.isFinite(rrfsSpeed)&&Number.isFinite(rrfsDir)?rrfsSpeed*dc(rrfsDir,z.targetDir)>=20:null;
    const hrrrEvent=h&&Number.isFinite(h.speed)&&Number.isFinite(h.dir)?h.speed*dc(h.dir,z.targetDir)>=20:null;
    rows.push({
      run_time:r.run_time,valid_time:r.valid_time,forecast_lead_hours:24,zone:r.zone,regime:z.regime,station:z.station,target_direction_deg:z.targetDir,
      rrfs_grid_distance_km:Number.isFinite(Number(r.grid_distance_km))?Number(r.grid_distance_km):null,
      obs_speed_mph:o?.speed??null,obs_gust_mph:Number.isFinite(obsGust)?obsGust:null,obs_direction_deg:o?.dir??null,observed_event:typeof observedEvent==="boolean"?observedEvent:null,
      rrfs_speed_mph:Number.isFinite(rrfsSpeed)?rrfsSpeed:null,rrfs_gust_mph:Number.isFinite(rrfsGust)?rrfsGust:null,rrfs_direction_deg:Number.isFinite(rrfsDir)?rrfsDir:null,rrfs_event:typeof rrfsEvent==="boolean"?rrfsEvent:null,
      hrrr_speed_mph:h?.speed??null,hrrr_gust_mph:h?.gust??null,hrrr_direction_deg:h?.dir??null,hrrr_event:typeof hrrrEvent==="boolean"?hrrrEvent:null
    });
  }
  const rrfs=metricRows(rows,"rrfs"),hrrr=metricRows(rows,"hrrr");
  const byRegime={};
  for(const regime of["western","hybrid","eastern"]){const a=rows.filter(r=>r.regime===regime);byRegime[regime]={n:a.length,rrfs:metricRows(a,"rrfs"),hrrr:metricRows(a,"hrrr")};}
  const out={
    status:"RESEARCH_ONLY_SHADOW_GUIDANCE",
    generated:new Date().toISOString(),
    purpose:"Predeclared 2024-only deterministic RRFS F24 shadow sample scored against the same independent HADS stations and archived HRRR surface comparator. Pilot evidence only; no production or 2025 use.",
    provenance:{rrfs_input:INPUT,rrfs_source:src.source||null,rrfs_cases:(src.cases||[]).map(c=>({date:c.date,cycle:c.cycle,key:c.key,etag:c.etag,idx_etag:c.idx_etag,idx_sha256:c.idx_sha256,subset_sha256:c.subset_sha256}))},
    rules:{development_year:2024,holdout_2025_loaded:false,forecast_hour_fixed:24,predeclared_cases:true,future_observations_label_only:true,fire_outcome_used:false,missing_values_fabricated:false,event_definition:"observed/model 10m wind projected onto fixed zone target direction >=20 mph; no tuned threshold",probability_manufactured:false,rrfs_shadow_only:true,refs_not_scored_without_official_product:false,model_tuning_performed:false,production_change_authorized:false},
    counts:{rrfs_source_rows:(src.rows||[]).length,benchmark_zone_rows:rows.length,rows_with_observation:rows.filter(r=>Number.isFinite(r.obs_speed_mph)&&Number.isFinite(r.obs_direction_deg)).length,rows_with_hrrr:rows.filter(r=>Number.isFinite(r.hrrr_gust_mph)&&Number.isFinite(r.hrrr_direction_deg)).length},
    overall:{rrfs,hrrr,delta_rrfs_minus_hrrr:{gust_mae_mph:Number.isFinite(rrfs.gust_mae_mph)&&Number.isFinite(hrrr.gust_mae_mph)?rrfs.gust_mae_mph-hrrr.gust_mae_mph:null,direction_mae_deg:Number.isFinite(rrfs.direction_mae_deg)&&Number.isFinite(hrrr.direction_mae_deg)?rrfs.direction_mae_deg-hrrr.direction_mae_deg:null,event_far:Number.isFinite(rrfs.event.far)&&Number.isFinite(hrrr.event.far)?rrfs.event.far-hrrr.event.far:null,event_pod:Number.isFinite(rrfs.event.pod)&&Number.isFinite(hrrr.event.pod)?rrfs.event.pod-hrrr.event.pod:null}},
    by_regime:byRegime,rows,
    interpretation:"Small predeclared 2024 shadow sample. Retain RRFS as shadow-only regardless of outcome; expand only with identical leakage/provenance rules."
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,overall:out.overall,by_regime:out.by_regime},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
