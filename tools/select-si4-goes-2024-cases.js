"use strict";

// Development-only selector for a bounded set of 2024 western event and hard-negative
// cases suitable for direct GOES nighttime feature screening. This deliberately uses
// 2024 labels because it is feature-development data. It must never inspect 2025.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const OUT=process.env.OUT||"research/goes-marine-2024-case-manifest.json";
const PER_CLASS=Number(process.env.PER_CLASS||12);
const source=fs.readFileSync(BUILDER,"utf8");
const marker="\n(async()=>{";
const idx=source.indexOf(marker);
if(idx<0)throw Error("unable to isolate SI-4 builder definitions");
const defs=source.slice(0,idx);

const main=String.raw`
function hourDate(value){
  const s=String(value||"");
  const iso=/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(s)?s+":00:00Z":s;
  const d=new Date(iso);
  if(!Number.isFinite(d.getTime()))throw Error("invalid hourly timestamp: "+s);
  return d;
}
function solarElevationDeg(iso,latDeg=34.42,lonDeg=-119.80){
  const t=hourDate(iso);
  const y=t.getUTCFullYear(), start=Date.UTC(y,0,0), n=Math.floor((Date.UTC(y,t.getUTCMonth(),t.getUTCDate())-start)/86400000);
  const hour=t.getUTCHours()+t.getUTCMinutes()/60+t.getUTCSeconds()/3600;
  const gamma=2*Math.PI/365*(n-1+(hour-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
  const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
  const tst=((hour*60+eq+4*lonDeg)%1440+1440)%1440;
  const ha=(tst/4-180)*Math.PI/180, lat=latDeg*Math.PI/180;
  const cosz=Math.max(-1,Math.min(1,Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha)));
  return 90-Math.acos(cosz)*180/Math.PI;
}
function issueForValid(valid){return new Date(hourDate(valid).getTime()-24*3600e3).toISOString();}
function nightWindow(issue){
  const offsets=[0,1,3,6];
  const solar=Object.fromEntries(offsets.map(h=>{
    const t=new Date(hourDate(issue).getTime()-h*3600e3).toISOString();
    const elev=solarElevationDeg(t);
    return [String(h),{time:t,solar_elevation_deg:elev,night_eligible:Number.isFinite(elev)&&elev<=-6}];
  }));
  // Current and 1-h satellite state are required. 3-h/6-h trends are optional and
  // stay missing when they would cross into daylight; this avoids biasing the case
  // set toward predawn events merely to obtain a six-hour nighttime history.
  return {eligible:solar["0"].night_eligible&&solar["1"].night_eligible,solar};
}
function laParts(iso){
  const d=hourDate(iso), fmt=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});
  const p=Object.fromEntries(fmt.formatToParts(d).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return {date:p.year+"-"+p.month+"-"+p.day,hour:Number(p.hour)};
}
function localPeriod(hour){if(hour>=18&&hour<=21)return"evening";if(hour>=22||hour<=2)return"night";if(hour>=3&&hour<=6)return"predawn";return"other";}
function monthKey(iso){return hourDate(iso).toISOString().slice(5,7);}
function rankRows(rows,kind){
  const out=[];
  for(const r of rows){
    const issue=issueForValid(r.time), nw=nightWindow(issue), lp=laParts(r.time), period=localPeriod(lp.hour);
    if(!nw.eligible||period==="other")continue;
    out.push({
      kind,zone:r.zone,valid_time:r.time,forecast_issuance_time:issue,
      development_label:r.y,
      local_night_date:lp.date,local_hour:lp.hour,local_period:period,month_utc:monthKey(r.time),
      baseline_probability:r.baseline,
      pressure_support:r.x[1],mountain_wave_index:r.wave?.score,
      model_gust_mph:r.modelGust,model_direction_deg:r.modelDir,
      solar_window:nw.solar
    });
  }
  out.sort((a,b)=>{
    const sa=(Number(a.pressure_support)||0)+(Number(a.mountain_wave_index)||0);
    const sb=(Number(b.pressure_support)||0)+(Number(b.mountain_wave_index)||0);
    return sb-sa||String(a.valid_time).localeCompare(String(b.valid_time))||String(a.zone).localeCompare(String(b.zone));
  });
  return out;
}
function choose(candidates,n){
  const chosen=[],dates=new Set(),diversity=new Set();
  // First pass forces coverage across zone + local-night period + month when possible.
  for(const r of candidates){
    const key=r.month_utc+"|"+r.zone+"|"+r.local_period;
    if(dates.has(r.local_night_date)||diversity.has(key))continue;
    chosen.push(r);dates.add(r.local_night_date);diversity.add(key);
    if(chosen.length>=n)return chosen;
  }
  for(const r of candidates){
    if(dates.has(r.local_night_date))continue;
    chosen.push(r);dates.add(r.local_night_date);
    if(chosen.length>=n)return chosen;
  }
  return chosen;
}
(async()=>{
  if(TRAIN_START!=="2024-01-01"||TRAIN_END!=="2024-12-31")throw Error("GOES case selector must remain 2024-only");
  const upper=loadUpperCache();
  const train=await dataset(TRAIN_START,TRAIN_END,upper);
  const rows=train.byReg.western;
  const hard=hardNegativeRows(rows), events=rows.filter(r=>r.y===1);
  const eventCandidates=rankRows(events,"event"), hardCandidates=rankRows(hard,"hard_negative");
  const selected={events:choose(eventCandidates,PER_CLASS),hard_negatives:choose(hardCandidates,PER_CLASS)};
  if(selected.events.length<8||selected.hard_negatives.length<8)throw Error("insufficient independent nighttime cases: "+JSON.stringify({events:selected.events.length,hard:selected.hard_negatives.length}));
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"Bounded deterministic 2024-only western GOES Nighttime Microphysics development case set: distinct Santa Barbara civil nights, event vs hard-negative labels, with realistic evening/night/predawn coverage.",
    source:{upper_air:upper.meta,regime:"western",zones:["Gaviota","Refugio"]},
    rules:{development_year:2024,holdout_2025_loaded:false,forecast_lead_hours:24,required_goes_snapshot_offsets_hours:[0,1],optional_goes_snapshot_offsets_hours:[3,6],maximum_solar_elevation_deg:-6,distinct_nights_within_class:true,fire_association_used:false,production_change_authorized:false},
    candidate_counts:{event_nighttime:eventCandidates.length,hard_negative_nighttime:hardCandidates.length},
    selected_counts:{events:selected.events.length,hard_negatives:selected.hard_negatives.length},
    selected
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({candidate_counts:out.candidate_counts,selected_counts:out.selected_counts,events:selected.events.map(x=>({zone:x.zone,valid:x.valid_time,issue:x.forecast_issuance_time,date:x.local_night_date,hour:x.local_hour,period:x.local_period})),hard_negatives:selected.hard_negatives.map(x=>({zone:x.zone,valid:x.valid_time,issue:x.forecast_issuance_time,date:x.local_night_date,hour:x.local_hour,period:x.local_period}))},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
`;

eval(defs+"\n"+main);
