#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const DATES = [
  '20240115','20240215','20240315','20240415','20240515','20240615',
  '20240715','20240815','20240915','20241015','20241115','20241215',
];
const ISSUANCE_HOURS = [0, 12];
const BASE = 'https://data.nssl.noaa.gov/thredds/fileServer/FRDD/HREF/2024';
const TIMEOUT_MS = 20000;
const RETRIES = 2;

const MEMBERS = [
  {id:'hrrr_current', family:'HRRR', init_offset_h:0, native_lead_h:24, stem:'hrrr_ncep'},
  {id:'hrrr_lag6', family:'HRRR', init_offset_h:-6, native_lead_h:30, stem:'hrrr_ncep'},
  {id:'hiresw_arw_current', family:'HIRESW_ARW', init_offset_h:0, native_lead_h:24, stem:'hiresw_conusarw'},
  {id:'hiresw_arw_lag12', family:'HIRESW_ARW', init_offset_h:-12, native_lead_h:36, stem:'hiresw_conusarw'},
  {id:'hiresw_fv3_current', family:'HIRESW_FV3', init_offset_h:0, native_lead_h:24, stem:'hiresw_conusfv3'},
  {id:'hiresw_fv3_lag12', family:'HIRESW_FV3', init_offset_h:-12, native_lead_h:36, stem:'hiresw_conusfv3'},
  {id:'hiresw_nssl_current', family:'HIRESW_NSSL_ARW2', init_offset_h:0, native_lead_h:24, stem:'hiresw_conusnssl'},
  {id:'hiresw_nssl_lag12', family:'HIRESW_NSSL_ARW2', init_offset_h:-12, native_lead_h:36, stem:'hiresw_conusnssl'},
  {id:'namnest_current', family:'NAM_CONUS_NEST', init_offset_h:0, native_lead_h:24, stem:'nam_conusnest'},
  {id:'namnest_lag12', family:'NAM_CONUS_NEST', init_offset_h:-12, native_lead_h:36, stem:'nam_conusnest'},
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pad2(n) { return String(n).padStart(2,'0'); }
function parseDate(date, hour) {
  return new Date(Date.UTC(Number(date.slice(0,4)), Number(date.slice(4,6))-1, Number(date.slice(6,8)), hour));
}
function ymdh(d) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}`;
}
function ymd(d) { return ymdh(d).slice(0,8); }
function iso(d) { return d.toISOString(); }
function certError(error) {
  const s = String(error?.message || error || '').toLowerCase();
  return s.includes('unable to verify the first certificate') ||
    s.includes('unable to get local issuer certificate') ||
    s.includes('self signed certificate in certificate chain');
}
function reqOnce(url, tlsFallback = false) {
  return new Promise(resolve => {
    const req = https.request(url, {
      method:'GET',
      headers:{
        'User-Agent':'sundowner-intelligence-si4-href-member-alignment/1.0',
        'Accept':'*/*',
        'Range':'bytes=0-0',
      },
      timeout:TIMEOUT_MS,
      rejectUnauthorized:!tlsFallback,
    }, res => {
      let bytes = 0;
      res.on('data', c => { bytes += c.length; });
      res.on('end', () => resolve({
        status:res.statusCode,
        content_range:res.headers['content-range'] || null,
        content_length:res.headers['content-length'] || null,
        accept_ranges:res.headers['accept-ranges'] || null,
        bytes,
        tls_mode:tlsFallback ? 'nssl_cert_chain_fallback' : 'strict',
      }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', error => resolve({status:null,error:String(error.message||error),raw_error:error,tls_mode:tlsFallback?'nssl_cert_chain_fallback':'strict'}));
    req.end();
  });
}
async function request(url) {
  for (let attempt=0; attempt<=RETRIES; attempt++) {
    let r = await reqOnce(url,false);
    // NSSL's archive occasionally surfaces TLS/socket failures as AggregateError,
    // which hides the underlying certificate-chain message from certError().
    // For this single known NOAA archive host, any transport-level strict-TLS
    // failure gets one immediate fallback request before it is treated as an
    // archive gap. This changes plumbing only; member identity/date/lead remain frozen.
    if (!r.status) r = await reqOnce(url,true);
    delete r.raw_error;
    if ((r.status && ![429,500,502,503,504].includes(r.status)) || attempt===RETRIES) {
      r.attempt=attempt; return r;
    }
    await sleep(1000*(attempt+1));
  }
}
function expectedObject(issuance, member) {
  const init = new Date(issuance.getTime() + member.init_offset_h*3600e3);
  const valid = new Date(init.getTime() + member.native_lead_h*3600e3);
  const lead = String(member.native_lead_h).padStart(3,'0');
  const path = `${ymd(init)}/${member.stem}_${ymdh(init)}f${lead}.grib2`;
  return {
    member_id:member.id,
    family:member.family,
    init_time:iso(init),
    native_lead_h:member.native_lead_h,
    issuance_relative_init_h:member.init_offset_h,
    valid_time:iso(valid),
    expected_valid_time:iso(new Date(issuance.getTime()+24*3600e3)),
    path,
    url:`${BASE}/${path}`,
  };
}

(async () => {
  const startedAt = new Date().toISOString();
  const issuanceReports = [];
  let tlsFallbackUsed = false;

  for (const date of DATES) {
    for (const hour of ISSUANCE_HOURS) {
      const issuance = parseDate(date,hour);
      const rows = [];
      for (const member of MEMBERS) {
        const row = expectedObject(issuance,member);
        const r = await request(row.url);
        tlsFallbackUsed ||= r.tls_mode === 'nssl_cert_chain_fallback';
        const validAligned = row.valid_time === row.expected_valid_time;
        const objectVerified = r.status === 206 || (r.status === 200 && Number(r.content_length)>0);
        rows.push({...row, valid_time_aligned:validAligned, object_verified:objectVerified, http:r});
      }
      issuanceReports.push({
        issuance_time:iso(issuance),
        target_valid_time:iso(new Date(issuance.getTime()+24*3600e3)),
        expected_member_count:MEMBERS.length,
        verified_member_count:rows.filter(x=>x.object_verified).length,
        aligned_member_count:rows.filter(x=>x.valid_time_aligned).length,
        members:rows,
      });
    }
  }

  const expectedObjects = issuanceReports.length * MEMBERS.length;
  const verifiedObjects = issuanceReports.reduce((n,x)=>n+x.verified_member_count,0);
  const alignedObjects = issuanceReports.reduce((n,x)=>n+x.aligned_member_count,0);
  const allIssuancesComplete = issuanceReports.every(x=>x.verified_member_count===MEMBERS.length && x.aligned_member_count===MEMBERS.length);
  const status = allIssuancesComplete ? 'OFFICIAL_HREF_10_MEMBER_F24_VALID_ALIGNMENT_REPRODUCIBLE' : 'MEMBER_ALIGNMENT_ARCHIVE_INCOMPLETE';

  const report = {
    candidate:'initial_condition_ensemble_downslope_v1',
    phase:'0c_official_href_member_identity_and_valid_time_freeze',
    phase0c_status:status,
    science_scoring_performed:false,
    observations_or_outcomes_used:false,
    queried_years:[2024],
    future_observations_used:false,
    fire_association_used:false,
    predeclared_dates:DATES,
    predeclared_issuance_hours_utc:ISSUANCE_HOURS,
    target_issuance_to_valid_lead_h:24,
    official_member_contract_source_notes:[
      'NOAA/NCEP HREF uses current and time-lagged convection-allowing forecasts; CONUS membership includes HRRR, NAM CONUS Nest, HiResW ARW/ARW2(NSSL), and HiResW FV3 families.',
      'Operational HREF CONUS composition is 10 members: five current and five time-lagged members; HRRR is lagged 6 h and the HiResW/NAM families are lagged 12 h.',
      'This probe freezes member identity and exact common valid-time alignment only. It does not score observations or outcomes.',
    ],
    member_contract:MEMBERS,
    issuance_count:issuanceReports.length,
    expected_object_count:expectedObjects,
    verified_object_count:verifiedObjects,
    valid_time_aligned_object_count:alignedObjects,
    tls_fallback_used:tlsFallbackUsed,
    started_at:startedAt,
    completed_at:new Date().toISOString(),
    issuance_reports:issuanceReports,
    notes:[
      'For a HREF issuance T and target valid time T+24, current members use native F24. Official lagged members use the native lead required to reach that same target valid time (HRRR F30 from T-6; HiResW/NAM F36 from T-12).',
      'No member is inferred from outcomes. Missing archive objects remain explicit failures and are not replaced based on event evidence.',
      'Transient 5xx/timeouts/archive gaps are infrastructure only.',
    ],
  };
  fs.mkdirSync('research',{recursive:true});
  fs.writeFileSync('research/href-2024-member-alignment-probe.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({
    phase0c_status:status,
    issuance_count:report.issuance_count,
    expected_object_count:expectedObjects,
    verified_object_count:verifiedObjects,
    valid_time_aligned_object_count:alignedObjects,
    tls_fallback_used:tlsFallbackUsed,
  },null,2));
})();
