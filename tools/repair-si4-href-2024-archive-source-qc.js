'use strict';

// Plumbing-only source QC for the frozen 2024 HREF archive.
// This script MUST NOT read observations, outcomes, fire association, or 2025 data.
// It removes an entire matched issuance when any required member/point contains an
// objectively invalid numeric sentinel / impossible archive decode. No imputation.

const fs=require('fs');
const crypto=require('crypto');

const INPUT=process.env.INPUT||process.argv[2]||'si4-href-ensemble-2024-full.json';
const OUTPUT=process.env.OUTPUT||process.argv[3]||'si4-href-ensemble-2024-source-qc.json';
const MANIFEST=process.env.MANIFEST||process.argv[4]||'si4-href-ensemble-2024-source-qc-manifest.json';
const EXPECTED_SOURCE_RUN='33415242408';
const EXPECTED_SOURCE_ROWS=35850;

function finite(x){return Number.isFinite(Number(x));}
function invalidReason(r){
  const checks=[
    ['u10_mps',r.u10_mps,-150,150],
    ['v10_mps',r.v10_mps,-150,150],
    ['wind_speed_10m_mps',r.wind_speed_10m_mps,0,200],
    ['wind_direction_10m_deg',r.wind_direction_10m_deg,0,360],
    ['gust_surface_mps',r.gust_surface_mps,0,200],
    ['pressure_surface_pa',r.pressure_surface_pa,40000,120000],
  ];
  for(const [name,val,lo,hi] of checks){
    if(!finite(val)) return `${name}:nonfinite`;
    const n=Number(val);
    if(n<lo||n>hi) return `${name}:out_of_source_qc_range:${n}`;
  }
  if(Number(r.wind_speed_10m_mps)>Math.hypot(Number(r.u10_mps),Number(r.v10_mps))+1e-6 ||
     Math.abs(Number(r.wind_speed_10m_mps)-Math.hypot(Number(r.u10_mps),Number(r.v10_mps)))>1e-5){
    return 'wind_speed_uv_inconsistent';
  }
  return null;
}

const raw=fs.readFileSync(INPUT);
const x=JSON.parse(raw);
if(x.status!=='RESEARCH_ONLY_2024_DEVELOPMENT'||x.candidate_family!=='initial_condition_ensemble_downslope_v1'||x.phase!=='full_2024_href_member_archive') throw Error('source archive identity mismatch');
if(String(x.provenance?.github_run_id)!==EXPECTED_SOURCE_RUN||Number(x.row_count)!==EXPECTED_SOURCE_ROWS||Number(x.failure_count)!==0) throw Error('unexpected source archive provenance/shape');
if(x.science_scoring_performed!==false||x.observations_or_outcomes_used!==false||x.holdout_2025_loaded!==false||x.production_change_authorized!==false) throw Error('source archive leakage/firewall contract mismatch');

const invalid=[];
const badIssuances=new Set();
for(const r of x.rows||[]){
  if(!String(r.issuance_time).startsWith('2024-')||!String(r.valid_time).startsWith('2024-')||Number(r.issuance_to_valid_lead_h)!==24) throw Error('non-2024/non-F24 row');
  const reason=invalidReason(r);
  if(reason){invalid.push({issuance_time:r.issuance_time,valid_time:r.valid_time,member_id:r.member_id,point:r.point,field_reason:reason});badIssuances.add(r.issuance_time);}
}
if(!invalid.length) throw Error('source-QC repair expected at least one objectively invalid archive decode; none found');

// Matched-ensemble fail-closed rule: if one required member/point is invalid, remove
// all 50 rows (10 members x 5 points) for that issuance. This selection uses only
// issuance-time model archive values, never observations/outcomes.
const rows=(x.rows||[]).filter(r=>!badIssuances.has(r.issuance_time));
for(const t of badIssuances){
  const removed=(x.rows||[]).filter(r=>r.issuance_time===t);
  if(removed.length!==50) throw Error(`unexpected matched issuance shape ${t}: ${removed.length}/50`);
}
const expected=EXPECTED_SOURCE_ROWS-badIssuances.size*50;
if(rows.length!==expected) throw Error(`repaired row count mismatch ${rows.length}/${expected}`);
const inherited=[...(x.excluded_issuances||[])];
const excluded=[...new Set([...inherited,...badIssuances])].sort();

const sourceSha=crypto.createHash('sha256').update(raw).digest('hex');
const out={
  ...x,
  phase:'full_2024_href_member_archive_source_qc_repaired',
  row_count:rows.length,
  excluded_issuances:excluded,
  source_qc:{
    type:'plumbing_only_outcome_blind_numeric_sentinel_repair',
    source_archive_run:EXPECTED_SOURCE_RUN,
    source_archive_sha256:sourceSha,
    source_archive_rows:EXPECTED_SOURCE_ROWS,
    invalid_row_count:invalid.length,
    newly_excluded_issuances:[...badIssuances].sort(),
    inherited_excluded_issuances:inherited,
    matched_rows_removed:badIssuances.size*50,
    rules:{u10_mps:[-150,150],v10_mps:[-150,150],wind_speed_10m_mps:[0,200],wind_direction_10m_deg:[0,360],gust_surface_mps:[0,200],pressure_surface_pa:[40000,120000],wind_speed_must_equal_uv_hypot:true},
    observations_or_outcomes_used:false,
    fire_association_used:false,
    holdout_2025_loaded:false,
    imputation_used:false,
    science_interpretation_authorized:false,
    invalid_rows:invalid,
  },
  rows,
};
out.provenance={...x.provenance,source_qc_head_sha:process.env.GITHUB_SHA||null,source_qc_run_id:process.env.GITHUB_RUN_ID||null};
const outRaw=Buffer.from(JSON.stringify(out));
fs.writeFileSync(OUTPUT,outRaw);
const manifest={status:'PASS',candidate_family:out.candidate_family,phase:out.phase,source_archive_run:EXPECTED_SOURCE_RUN,source_archive_sha256:sourceSha,repaired_sha256:crypto.createHash('sha256').update(outRaw).digest('hex'),source_rows:EXPECTED_SOURCE_ROWS,repaired_rows:rows.length,invalid_row_count:invalid.length,newly_excluded_issuances:[...badIssuances].sort(),all_excluded_issuances:excluded,observations_or_outcomes_used:false,holdout_2025_loaded:false,production_change_authorized:false};
fs.writeFileSync(MANIFEST,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
