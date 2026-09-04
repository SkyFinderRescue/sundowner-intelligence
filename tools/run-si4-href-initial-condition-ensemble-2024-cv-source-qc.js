'use strict';

// Plumbing-only compatibility runner for the frozen SI-4 HREF 2024 CV.
// It does not change the hypothesis, features, transforms, thresholds, labels, gates,
// or any science logic. It only points the already-frozen evaluator at the outcome-blind
// source-QC-repaired HREF archive after invalid NOAA/NCSS numeric decodes were removed as
// whole matched issuances. No observations/outcomes/2025 data are used for this repair.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const hrefPath = process.env.HREF_CACHE;
if (!hrefPath) throw new Error('HREF_CACHE is required');
const x = JSON.parse(fs.readFileSync(hrefPath, 'utf8'));
if (x.status !== 'RESEARCH_ONLY_2024_DEVELOPMENT') throw new Error('unexpected HREF status');
if (x.candidate_family !== 'initial_condition_ensemble_downslope_v1') throw new Error('unexpected candidate family');
if (x.phase !== 'full_2024_href_member_archive_source_qc_repaired') throw new Error('source-QC repaired phase required');
if (Number(x.row_count) !== 35750 || (x.rows || []).length !== 35750) throw new Error('repaired HREF row count mismatch');
if (Number(x.failure_count || 0) !== 0) throw new Error('repaired archive failure count nonzero');
if (Number(x.forecast_lead_hours) !== 24 || Number(x.member_count) !== 10 || Number(x.point_count) !== 5) throw new Error('lead/member/point contract mismatch');
if (String(x.provenance?.github_run_id) !== '33415242408') throw new Error('unexpected frozen source archive run');
if (String(x.provenance?.source_qc_run_id) !== '33432036786') throw new Error('unexpected source-QC repair run');
if (Number(x.source_qc?.invalid_row_count) !== 10 || Number(x.source_qc?.matched_rows_removed) !== 100) throw new Error('unexpected source-QC repair shape');
const expectedExcluded = ['2024-10-15T12:00:00.000Z','2024-10-22T00:00:00.000Z'];
for (const t of expectedExcluded) if (!(x.source_qc?.newly_excluded_issuances || []).includes(t)) throw new Error(`missing source-QC exclusion ${t}`);
if (x.science_scoring_performed !== false || x.observations_or_outcomes_used !== false || x.holdout_2025_loaded !== false || x.production_change_authorized !== false) throw new Error('source-QC leakage/firewall contract failed');
if ((x.rows || []).some(r => !String(r.valid_time).startsWith('2024-') || Number(r.issuance_to_valid_lead_h) !== 24)) throw new Error('non-2024/non-F24 row in repaired archive');
if ((x.rows || []).some(r => !Number.isFinite(Number(r.gust_surface_mps)) || Number(r.gust_surface_mps) < 0 || Number(r.gust_surface_mps) > 200)) throw new Error('invalid gust remains after source-QC repair');

const originalPath = path.join(__dirname, 'evaluate-si4-href-initial-condition-ensemble-2024-cv.js');
let source = fs.readFileSync(originalPath, 'utf8');
const replacements = [
  ['const FROZEN_HREF_ROWS=35850;', 'const FROZEN_HREF_ROWS=35750;'],
  ['x.phase!=="full_2024_href_member_archive"', 'x.phase!=="full_2024_href_member_archive_source_qc_repaired"'],
];
for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`frozen evaluator compatibility token missing: ${from}`);
  source = source.replace(from, to);
}
if (source.includes('const FROZEN_HREF_ROWS=35850;')) throw new Error('row-count patch failed');
if (!source.includes('full_2024_href_member_archive_source_qc_repaired')) throw new Error('phase patch failed');

const runtimePath = path.join(__dirname, '.si4-href-cv-source-qc-runtime.js');
fs.writeFileSync(runtimePath, source);
try {
  const r = spawnSync(process.execPath, [runtimePath], { stdio: 'inherit', env: process.env });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status || 1);
} finally {
  try { fs.unlinkSync(runtimePath); } catch (_) {}
}
