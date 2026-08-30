#!/usr/bin/env node
'use strict';

// Research-only 2024 archive for initial_condition_ensemble_downslope_v1.
// No observations, outcomes, fire association, reanalysis, or 2025 science data are read.
const fs=require('fs');
const https=require('https');

const BASE='https://data.nssl.noaa.gov/thredds/ncss/grid/FRDD/HREF/2024';
const TIMEOUT_MS=30000;
const RETRIES=3;
const CONCURRENCY=10;
const ISSUANCE_HOURS=[0,12];
const WIND_VARS=['u-component_of_wind_height_above_ground','v-component_of_wind_height_above_ground'];
const SURFACE_VARS=['Wind_speed_gust_surface','Pressure_surface'];
const POINTS={
  santa_ynez_valley:[34.665,-120.015],
  cuyama_interior:[34.950,-119.680],
  bakersfield_synoptic:[35.434,-119.057],
  santa_barbara_lee:[34.426,-119.840],
  western_channel:[34.350,-120.400],
};
const MEMBERS=[
  {id:'hrrr_current',family:'HRRR',init_offset_h:0,native_lead_h:24,stem:'hrrr_ncep'},
  {id:'hrrr_lag6',family:'HRRR',init_offset_h:-6,native_lead_h:30,stem:'hrrr_ncep'},
  {id:'hiresw_arw_current',family:'HIRESW_ARW',init_offset_h:0,native_lead_h:24,stem:'hiresw_conusarw'},
  {id:'hiresw_arw_lag12',family:'HIRESW_ARW',init_offset_h:-12,native_lead_h:36,stem:'hiresw_conusarw'},
  {id:'hiresw_fv3_current',family:'HIRESW_FV3',init_offset_h:0,native_lead_h:24,stem:'hiresw_conusfv3'},
  {id:'hiresw_fv3_lag12',family:'HIRESW_FV3',init_offset_h:-12,native_lead_h:36,stem:'hiresw_conusfv3'},
  {id:'hiresw_nssl_current',family:'HIRESW_NSSL_ARW2',init_offset_h:0,native_lead_h:24,stem:'hiresw_conusnssl'},
  {id:'hiresw_nssl_lag12',family:'HIRESW_NSSL_ARW2',init_offset_h:-12,native_lead_h:36,stem:'hiresw_conusnssl'},
  {id:'namnest_current',family:'NAM_CONUS_NEST',init_offset_h:0,native_lead_h:24,stem:'nam_conusnest'},
  {id:'namnest_lag12',family:'NAM_CONUS_NEST',init_offset_h:-12,native_lead_h:36,stem:'nam_conusnest'},
];

function arg(name,def=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:def;}
const START=arg('start'); const END=arg('end'); const OUT=arg('out','research/si4-href-ensemble-2024.json');
if(!START||!END) throw new Error('usage: --start YYYY-MM-DD --end YYYY-MM-DD [--out path]');
if(!START.startsWith('2024-')||!END.startsWith('2024-')) throw new Error('2024-only archive contract');
if(END>'2024-12-30') throw new Error('end must be <= 2024-12-30 so F24 valid times remain in 2024');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pad2=n=>String(n).padStart(2,'0');
const iso=d=>d.toISOString();
const ymdh=d=>`${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}`;
const ymd=d=>ymdh(d).slice(0,8);
function parseDay(s,h){const [Y,M,D]=s.split('-').map(Number);return new Date(Date.UTC(Y,M-1,D,h));}
function days(a,b){const out=[];for(let d=parseDay(a,0),e=parseDay(b,0);d<=e;d=new Date(d.getTime()+86400000))out.push(d.toISOString().slice(0,10));return out;}
function certError(error){const s=String(error?.message||error||'').toLowerCase();return s.includes('unable to verify the first certificate')||s.includes('unable to get local issuer certificate')||s.includes('self signed certificate in certificate chain');}
function reqOnce(url,tlsFallback=false){return new Promise(resolve=>{const req=https.request(url,{method:'GET',headers:{'User-Agent':'sundowner-intelligence-si4-href-archive/1.0','Accept':'text/csv,*/*'},timeout:TIMEOUT_MS,rejectUnauthorized:!tlsFallback},res=>{let body='';res.setEncoding('utf8');res.on('data',c=>{if(body.length<200000)body+=c;});res.on('end',()=>resolve({status:res.statusCode,body,headers:res.headers,tls_mode:tlsFallback?'nssl_cert_chain_fallback':'strict'}));});req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',error=>resolve({status:null,error:String(error.message||error),raw_error:error,body:'',headers:{},tls_mode:tlsFallback?'nssl_cert_chain_fallback':'strict'}));req.end();});}
async function request(url){for(let attempt=0;attempt<=RETRIES;attempt++){let r=await reqOnce(url,false);if(!r.status&&certError(r.raw_error))r=await reqOnce(url,true);delete r.raw_error;if(r.status===200){r.attempt=attempt;return r;}if(r.status&&![429,500,502,503,504].includes(r.status)){r.attempt=attempt;return r;}if(attempt===RETRIES){r.attempt=attempt;return r;}await sleep(1000*(attempt+1));}}
function objectFor(issuance,member){const init=new Date(issuance.getTime()+member.init_offset_h*3600e3);const valid=new Date(init.getTime()+member.native_lead_h*3600e3);const lead=String(member.native_lead_h).padStart(3,'0');const path=`${ymd(init)}/${member.stem}_${ymdh(init)}f${lead}.grib2`;return{path,init,valid};}
function makeUrl(path,lat,lon,vars,vertCoord=null){const p=new URLSearchParams();for(const v of vars)p.append('var',v);p.set('latitude',String(lat));p.set('longitude',String(lon));if(vertCoord!==null)p.set('vertCoord',String(vertCoord));p.set('accept','csv');return `${BASE}/${path}?${p}`;}
function splitCsv(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){q=!q;continue;}if(c===','&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;}
function parseCsvOne(body){const lines=String(body||'').trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)throw new Error('CSV response missing data row');const h=splitCsv(lines[0]),v=splitCsv(lines[1]);const o={};h.forEach((k,i)=>o[k]=v[i]);return o;}
function getPrefix(o,prefix){for(const [k,v] of Object.entries(o))if(k.startsWith(prefix)){const n=Number(v);return Number.isFinite(n)?n:null;}return null;}
async function extractTask(task){const {issuance,member,point,lat,lon}=task;const obj=objectFor(issuance,member);const expectedValid=new Date(issuance.getTime()+24*3600e3);if(iso(obj.valid)!==iso(expectedValid))throw new Error(`valid-time alignment error ${member.id} ${iso(issuance)}`);const windUrl=makeUrl(obj.path,lat,lon,WIND_VARS,10);const surfaceUrl=makeUrl(obj.path,lat,lon,SURFACE_VARS,null);const [wr,sr]=await Promise.all([request(windUrl),request(surfaceUrl)]);if(wr.status!==200||sr.status!==200)throw new Error(`archive/extraction failure ${iso(issuance)} ${member.id} ${point}: wind=${wr.status} surface=${sr.status}`);const w=parseCsvOne(wr.body),s=parseCsvOne(sr.body);const u=getPrefix(w,'u-component_of_wind_height_above_ground');const v=getPrefix(w,'v-component_of_wind_height_above_ground');const gust=getPrefix(s,'Wind_speed_gust_surface');const pressure=getPrefix(s,'Pressure_surface');if(![u,v,gust,pressure].every(Number.isFinite))throw new Error(`nonfinite extraction ${iso(issuance)} ${member.id} ${point}`);const speed=Math.hypot(u,v);const direction=(Math.atan2(-u,-v)*180/Math.PI+360)%360;return{
  issuance_time:iso(issuance),valid_time:iso(expectedValid),issuance_to_valid_lead_h:24,
  member_id:member.id,family:member.family,member_init_time:iso(obj.init),member_native_lead_h:member.native_lead_h,
  point,latitude:lat,longitude:lon,object_path:obj.path,
  u10_mps:u,v10_mps:v,wind_speed_10m_mps:speed,wind_direction_10m_deg:direction,gust_surface_mps:gust,pressure_surface_pa:pressure,
  provenance:{wind_request:windUrl,surface_request:surfaceUrl,wind_tls:wr.tls_mode,surface_tls:sr.tls_mode,wind_attempt:wr.attempt,surface_attempt:sr.attempt}
};}
async function pool(tasks){const rows=new Array(tasks.length);let next=0,fail=null;async function worker(){while(true){const i=next++;if(i>=tasks.length||fail)return;try{rows[i]=await extractTask(tasks[i]);if((i+1)%250===0)console.log(`completed ${i+1}/${tasks.length}`);}catch(e){fail=e;return;}}}await Promise.all(Array.from({length:Math.min(CONCURRENCY,tasks.length)},worker));if(fail)throw fail;return rows;}

(async()=>{
  const started=new Date().toISOString();
  const tasks=[];
  for(const day of days(START,END))for(const h of ISSUANCE_HOURS){const issuance=parseDay(day,h);const valid=new Date(issuance.getTime()+24*3600e3);if(!iso(valid).startsWith('2024-'))throw new Error(`non-2024 valid time ${iso(valid)}`);for(const member of MEMBERS)for(const [point,[lat,lon]] of Object.entries(POINTS))tasks.push({issuance,member,point,lat,lon});}
  const rows=await pool(tasks);
  rows.sort((a,b)=>a.issuance_time.localeCompare(b.issuance_time)||a.member_id.localeCompare(b.member_id)||a.point.localeCompare(b.point));
  const report={
    status:'RESEARCH_ONLY_2024_DEVELOPMENT',candidate_family:'initial_condition_ensemble_downslope_v1',phase:'full_2024_href_member_archive',
    science_scoring_performed:false,observations_or_outcomes_used:false,future_observations_used:false,fire_association_used:false,holdout_2025_loaded:false,production_change_authorized:false,
    start:START,end:END,issuance_hours_utc:ISSUANCE_HOURS,forecast_lead_hours:24,member_count:MEMBERS.length,point_count:Object.keys(POINTS).length,
    expected_row_count:tasks.length,row_count:rows.length,failure_count:0,fields:['u10_mps','v10_mps','wind_speed_10m_mps','wind_direction_10m_deg','gust_surface_mps','pressure_surface_pa'],
    points:POINTS,members:MEMBERS,started_at:started,completed_at:new Date().toISOString(),rows,
    notes:['Deterministic calendar coverage: every day in the requested 2024 interval at 00Z and 12Z only, matching the Phase 0 member-alignment gate.','Missing stays missing: any unavailable object/field causes the monthly job to fail closed; no case is replaced based on observations or outcomes.','Transient 5xx/timeouts are retried only as infrastructure.','The archive contains issuance-time model forecasts only and performs no science scoring.']
  };
  fs.mkdirSync(require('path').dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report));
  console.log(JSON.stringify({status:report.status,start:START,end:END,rows:rows.length,failures:0},null,2));
})().catch(e=>{console.error(e?.stack||e);process.exit(1);});
