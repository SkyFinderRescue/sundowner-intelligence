#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const BASE_NCSS = 'https://data.nssl.noaa.gov/thredds/ncss/grid/FRDD/HREF/2024';
const TIMEOUT_MS = 25000;
const RETRIES = 2;

// Frozen physical reference points inherited from the already-frozen SI-4
// upstream archive design. These were not selected from event outcomes.
const POINTS = {
  santa_ynez_valley: [34.665, -120.015],
  cuyama_interior: [34.950, -119.680],
  bakersfield_synoptic: [35.434, -119.057],
  santa_barbara_lee: [34.426, -119.840],
  western_channel: [34.350, -120.400],
};

// One predeclared issuance already used by the Phase 0c/0d outcome-blind gates.
const ISSUANCE_TIME = '2024-01-15T00:00:00Z';
const TARGET_VALID_TIME = '2024-01-16T00:00:00Z';

// Frozen operational 10-member HREF construction established by Phase 0c.
const MEMBERS = [
  {id:'hrrr_current', family:'HRRR', path:'20240115/hrrr_ncep_2024011500f024.grib2', native_lead_h:24, init_offset_h:0},
  {id:'hrrr_lag6', family:'HRRR', path:'20240114/hrrr_ncep_2024011418f030.grib2', native_lead_h:30, init_offset_h:-6},
  {id:'hiresw_arw_current', family:'HIRESW_ARW', path:'20240115/hiresw_conusarw_2024011500f024.grib2', native_lead_h:24, init_offset_h:0},
  {id:'hiresw_arw_lag12', family:'HIRESW_ARW', path:'20240114/hiresw_conusarw_2024011412f036.grib2', native_lead_h:36, init_offset_h:-12},
  {id:'hiresw_fv3_current', family:'HIRESW_FV3', path:'20240115/hiresw_conusfv3_2024011500f024.grib2', native_lead_h:24, init_offset_h:0},
  {id:'hiresw_fv3_lag12', family:'HIRESW_FV3', path:'20240114/hiresw_conusfv3_2024011412f036.grib2', native_lead_h:36, init_offset_h:-12},
  {id:'hiresw_nssl_current', family:'HIRESW_NSSL_ARW2', path:'20240115/hiresw_conusnssl_2024011500f024.grib2', native_lead_h:24, init_offset_h:0},
  {id:'hiresw_nssl_lag12', family:'HIRESW_NSSL_ARW2', path:'20240114/hiresw_conusnssl_2024011412f036.grib2', native_lead_h:36, init_offset_h:-12},
  {id:'namnest_current', family:'NAM_CONUS_NEST', path:'20240115/nam_conusnest_2024011500f024.grib2', native_lead_h:24, init_offset_h:0},
  {id:'namnest_lag12', family:'NAM_CONUS_NEST', path:'20240114/nam_conusnest_2024011412f036.grib2', native_lead_h:36, init_offset_h:-12},
];

// Phase 0d demonstrated these fields are represented in every HREF model family.
// Keep the frozen science fields unchanged, but query height-above-ground and
// surface variables in separate NCSS requests. THREDDS NCSS applies vertCoord
// to the entire request, so mixing 10 m and surface variables caused a 400
// "illegal member name" response even though the fields exist in dataset.xml.
const WIND_VARS = [
  'u-component_of_wind_height_above_ground',
  'v-component_of_wind_height_above_ground',
];
const SURFACE_VARS = [
  'Wind_speed_gust_surface',
  'Pressure_surface',
];
const VARS = [...WIND_VARS, ...SURFACE_VARS];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function certError(error){
  const s=String(error?.message||error||'').toLowerCase();
  return s.includes('unable to verify the first certificate') || s.includes('unable to get local issuer certificate') || s.includes('self signed certificate in certificate chain');
}
function reqOnce(url,tlsFallback=false){
  return new Promise(resolve=>{
    const req=https.request(url,{method:'GET',headers:{'User-Agent':'sundowner-intelligence-si4-href-point-probe/1.0','Accept':'text/csv,*/*'},timeout:TIMEOUT_MS,rejectUnauthorized:!tlsFallback},res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data',c=>{ if(body.length<2_000_000) body+=c; });
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body,tls_mode:tlsFallback?'nssl_cert_chain_fallback':'strict'}));
    });
    req.on('timeout',()=>req.destroy(new Error('timeout')));
    req.on('error',error=>resolve({status:null,error:String(error.message||error),raw_error:error,body:'',headers:{},tls_mode:tlsFallback?'nssl_cert_chain_fallback':'strict'}));
    req.end();
  });
}
async function request(url){
  for(let attempt=0;attempt<=RETRIES;attempt++){
    let r=await reqOnce(url,false);
    if(!r.status && certError(r.raw_error)) r=await reqOnce(url,true);
    delete r.raw_error;
    if((r.status && ![429,500,502,503,504].includes(r.status)) || attempt===RETRIES){ r.attempt=attempt; return r; }
    await sleep(1000*(attempt+1));
  }
}
function numericCount(text){
  const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2) return 0;
  let n=0;
  for(const line of lines.slice(1)){
    for(const token of line.split(',')){
      const v=Number(String(token).replace(/^"|"$/g,''));
      if(Number.isFinite(v)) n++;
    }
  }
  return n;
}
function makeUrl(member, lat, lon, vars, vertCoord=null){
  const p=new URLSearchParams();
  for(const v of vars) p.append('var',v);
  p.set('latitude',String(lat));
  p.set('longitude',String(lon));
  if(vertCoord!==null) p.set('vertCoord',String(vertCoord));
  p.set('accept','csv');
  return `${BASE_NCSS}/${member.path}?${p.toString()}`;
}
function summarizeResponse(r,url){
  const bytes=Buffer.byteLength(r.body||'','utf8');
  const numerics=numericCount(r.body||'');
  return {
    ncss_url:url,
    http_status:r.status,
    error:r.error||null,
    tls_mode:r.tls_mode,
    attempt:r.attempt,
    response_bytes:bytes,
    numeric_token_count:numerics,
    csv_header:String(r.body||'').split(/\r?\n/)[0]||null,
  };
}

(async()=>{
  const reports=[];
  for(const member of MEMBERS){
    for(const [point,[lat,lon]] of Object.entries(POINTS)){
      const windUrl=makeUrl(member,lat,lon,WIND_VARS,10);
      const surfaceUrl=makeUrl(member,lat,lon,SURFACE_VARS,null);
      const wind=await request(windUrl);
      const surface=await request(surfaceUrl);
      const windSummary=summarizeResponse(wind,windUrl);
      const surfaceSummary=summarizeResponse(surface,surfaceUrl);
      const ok=wind.status===200 && surface.status===200 &&
        windSummary.response_bytes>0 && surfaceSummary.response_bytes>0 &&
        windSummary.numeric_token_count>=2 && surfaceSummary.numeric_token_count>=2;
      reports.push({
        member_id:member.id,
        family:member.family,
        path:member.path,
        native_lead_h:member.native_lead_h,
        issuance_relative_init_h:member.init_offset_h,
        point,
        latitude:lat,
        longitude:lon,
        wind_request:windSummary,
        surface_request:surfaceSummary,
        numeric_token_count:windSummary.numeric_token_count+surfaceSummary.numeric_token_count,
        extraction_ok:ok,
      });
    }
  }

  const expected=MEMBERS.length*Object.keys(POINTS).length;
  const passed=reports.filter(x=>x.extraction_ok).length;
  const status=passed===expected?'HREF_10_MEMBER_5_POINT_EXTRACTION_REPRODUCIBLE':'HREF_POINT_EXTRACTION_INCOMPLETE';
  const report={
    candidate:'initial_condition_ensemble_downslope_v1',
    phase:'0e_outcome_blind_point_extraction',
    phase0e_status:status,
    science_scoring_performed:false,
    observations_or_outcomes_used:false,
    future_observations_used:false,
    fire_association_used:false,
    queried_years:[2024],
    issuance_time:ISSUANCE_TIME,
    target_valid_time:TARGET_VALID_TIME,
    issuance_to_valid_lead_h:24,
    member_count:MEMBERS.length,
    point_count:Object.keys(POINTS).length,
    expected_extraction_count:expected,
    successful_extraction_count:passed,
    variables:VARS,
    vertical_coordinate_m:10,
    ncss_level_request_strategy:{
      height_above_ground_vars:WIND_VARS,
      height_above_ground_vertCoord_m:10,
      surface_vars:SURFACE_VARS,
      surface_vertCoord:null,
    },
    points:POINTS,
    reports,
    notes:[
      'This is archive/extraction plumbing only; no event labels, observations, fire outcomes, or 2025 science data are read.',
      'Member identities, fields, points, and valid-time alignment remain exactly frozen by the preceding Phase 0c/0d gates.',
      'The only change is NCSS request plumbing: 10 m height-above-ground fields and surface fields are requested separately so vertCoord is not incorrectly applied to surface variables.',
      'Transient 5xx/timeouts/certificate-chain behavior is infrastructure evidence only, not model evidence.',
      'A successful Phase 0e authorizes only broader 2024 archive extraction design; it does not authorize science scoring by itself.'
    ]
  };
  fs.mkdirSync('research',{recursive:true});
  fs.writeFileSync('research/href-2024-point-extraction-probe.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({phase0e_status:status,successful_extraction_count:passed,expected_extraction_count:expected},null,2));
})();
