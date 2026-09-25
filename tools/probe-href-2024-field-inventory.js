#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const BASE_FILE = 'https://data.nssl.noaa.gov/thredds/fileServer/FRDD/HREF/2024';
const BASE_NCSS = 'https://data.nssl.noaa.gov/thredds/ncss/grid/FRDD/HREF/2024';
const TIMEOUT_MS = 20000;
const RETRIES = 2;

// Frozen, outcome-blind representative sample: one current member from each
// operational HREF model family on the already-predeclared 2024-01-15 00Z issue.
const OBJECTS = [
  {id:'hrrr_current', path:'20240115/hrrr_ncep_2024011500f024.grib2'},
  {id:'hiresw_arw_current', path:'20240115/hiresw_conusarw_2024011500f024.grib2'},
  {id:'hiresw_fv3_current', path:'20240115/hiresw_conusfv3_2024011500f024.grib2'},
  {id:'hiresw_nssl_current', path:'20240115/hiresw_conusnssl_2024011500f024.grib2'},
  {id:'namnest_current', path:'20240115/nam_conusnest_2024011500f024.grib2'},
];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function certError(error){
  const s=String(error?.message||error||'').toLowerCase();
  return s.includes('unable to verify the first certificate') || s.includes('unable to get local issuer certificate') || s.includes('self signed certificate in certificate chain');
}
function reqOnce(url,tlsFallback=false){
  return new Promise(resolve=>{
    const req=https.request(url,{method:'GET',headers:{'User-Agent':'sundowner-intelligence-si4-href-field-inventory/1.0','Accept':'application/xml,text/xml,*/*'},timeout:TIMEOUT_MS,rejectUnauthorized:!tlsFallback},res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data',c=>{ if(body.length<5_000_000) body+=c; });
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
function extractNames(xml){
  const out=new Set();
  const pats=[/name=["']([^"']+)["']/gi,/vocabulary_name=["']([^"']+)["']/gi,/description=["']([^"']+)["']/gi];
  for(const re of pats){ let m; while((m=re.exec(xml))) out.add(m[1]); }
  return [...out].sort();
}
function classify(names){
  const hay=names.join('\n').toLowerCase();
  const tests={
    wind_10m: /(10.?m.*wind|wind.*10.?m|u-component.*10.?m|v-component.*10.?m)/i,
    gust: /gust/i,
    temperature_2m: /(2.?m.*temperature|temperature.*2.?m)/i,
    humidity_2m: /(2.?m.*(relative humidity|dewpoint)|relative humidity.*2.?m|dewpoint.*2.?m)/i,
    surface_pressure: /(surface pressure|pressure.*surface)/i,
    wind_925: /(925.*wind|wind.*925|u-component.*925|v-component.*925)/i,
    wind_850: /(850.*wind|wind.*850|u-component.*850|v-component.*850)/i,
    wind_700: /(700.*wind|wind.*700|u-component.*700|v-component.*700)/i,
    wind_500: /(500.*wind|wind.*500|u-component.*500|v-component.*500)/i,
    temperature_850: /(850.*temperature|temperature.*850)/i,
    temperature_700: /(700.*temperature|temperature.*700)/i,
    temperature_500: /(500.*temperature|temperature.*500)/i,
    height_850: /(850.*geopotential|geopotential.*850|850.*height|height.*850)/i,
    height_700: /(700.*geopotential|geopotential.*700|700.*height|height.*700)/i,
    height_500: /(500.*geopotential|geopotential.*500|500.*height|height.*500)/i,
  };
  return Object.fromEntries(Object.entries(tests).map(([k,re])=>[k,re.test(hay)]));
}

(async()=>{
  const reports=[];
  for(const obj of OBJECTS){
    const fileUrl=`${BASE_FILE}/${obj.path}`;
    const ncssUrl=`${BASE_NCSS}/${obj.path}/dataset.xml`;
    const r=await request(ncssUrl);
    const names=r.status===200?extractNames(r.body||''):[];
    reports.push({
      member_id:obj.id,
      path:obj.path,
      file_url:fileUrl,
      ncss_dataset_xml:ncssUrl,
      status:r.status,
      error:r.error||null,
      tls_mode:r.tls_mode,
      attempt:r.attempt,
      bytes:Buffer.byteLength(r.body||'','utf8'),
      discovered_name_count:names.length,
      field_flags:classify(names),
      sample_names:names.slice(0,250),
    });
  }
  const endpointReachable=reports.filter(x=>x.status===200).length;
  const common={};
  const keys=Object.keys(reports[0]?.field_flags||{});
  for(const k of keys) common[k]=reports.every(r=>r.field_flags[k]===true);
  const status = endpointReachable===OBJECTS.length ? 'HREF_FAMILY_FIELD_INVENTORY_REPRODUCIBLE' : 'HREF_NCSS_FIELD_INVENTORY_INCOMPLETE';
  const report={
    candidate:'initial_condition_ensemble_downslope_v1',
    phase:'0d_outcome_blind_field_inventory',
    phase0d_status:status,
    science_scoring_performed:false,
    observations_or_outcomes_used:false,
    future_observations_used:false,
    fire_association_used:false,
    queried_years:[2024],
    issuance_time:'2024-01-15T00:00:00Z',
    target_valid_time:'2024-01-16T00:00:00Z',
    representative_family_count:OBJECTS.length,
    reachable_ncss_dataset_count:endpointReachable,
    common_field_flags:common,
    reports,
    notes:[
      'This probe inventories archive metadata only; it does not load event labels or observations.',
      'Missing fields remain false/missing and are not inferred from outcomes.',
      'A successful endpoint inventory does not authorize science scoring until extraction points/variables and full 2024 coverage are frozen.',
      'Transient 5xx/timeouts are infrastructure evidence only.'
    ]
  };
  fs.mkdirSync('research',{recursive:true});
  fs.writeFileSync('research/href-2024-field-inventory-probe.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({phase0d_status:status,reachable_ncss_dataset_count:endpointReachable,common_field_flags:common},null,2));
})();
