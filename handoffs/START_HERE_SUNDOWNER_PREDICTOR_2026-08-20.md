# SUNDOWNER PREDICTOR — CURRENT VERIFIED AI HANDOFF

Checkpoint: 2026-08-20 22:36 PDT  
Purpose: authoritative continuity package for the next ChatGPT/AI engineering session.

## IMPORTANT CONTINUITY RULE
Do not restart, rebuild, or reinterpret this project from screenshots or older prose. GitHub is the source of truth for code/data. This handoff explains the verified state and exact resume point. Newer verified GitHub state supersedes older Drive handoffs, SHA references, and research milestones.

## 1. AUTHORITATIVE LOCATIONS
GitHub repository:  
https://github.com/SkyFinderRescue/sundowner-intelligence

Live production app:  
https://skyfinderrescue.github.io/sundowner-intelligence/

Google Drive project root:  
Sundowner Intelligence

New handoff folder created in Drive:  
Sundowner Predictor - Complete AI Handoff - 2026-08-20

Older handoff retained for history:  
START HERE - Sundowner Predictor Complete AI Handoff - 2026-08-13

## 2. CURRENT PRODUCTION STATE — PROTECT THIS
Production branch: `main`

Current main head verified during this handoff:  
`e4338d6794b0a1e814c5d630a7470db753086461`  
Commit message: `Record release verification [skip ci]`

The current main head is a bot-generated release-status record. The content/data commit that was actually release-verified is:  
`658a90167bc5ed0f5a569f4b6c18b30f20893c98`  
Commit message: `Reconstruct Aug 18-19 confirmed Sundowner with explicit nulls`

`validation/release-status.json` currently records:
- verified_at: 2026-08-21T02:06:08.016Z (2026-08-20 evening PDT)
- verified content commit: `658a90167bc5ed0f5a569f4b6c18b30f20893c98`
- code_and_live_api_qa: success
- browser_ui_qa: success
- pages_probe: success
- desktop viewport: 1440x1000
- iPhone viewport: 390x844
- both approved Esri map layers tested
- all eight forecast zones and core UI/data-health functions tested
- model_version: SI-3.0.0
- calibration_version: SI-3.1-cal-2026-08-13

The release_gate string still contains legacy wording saying “57 historical reconstructions.” Treat that literal count as documentation debt; inspect the current datasets rather than trusting that old phrase.

**PRODUCTION RULE:** Preserve verified SI-3.1 on main unless a research candidate clears the scientific promotion gates AND the full production release/browser gate is rerun successfully. Do not merge SI-4 merely because its overall statistical metrics are better.

## 3. NEW OPERATIONAL EVENT SINCE THE AUGUST 13 HANDOFF
A new western Sundowner episode covering August 18-19, 2026 has been added and reconstructed in production data.

Current operational reconstruction record:
- event id: `2026-08-18-19-sba-western-sundowner`
- regime: western
- fire_associated: false
- NWS evidence documented lingering northerly winds gusting to about 35 mph across southern Santa Barbara County at 07:59 PDT August 19
- unsupported pressure, upstream, zone-specific thermodynamic, and upper-air values remain explicit nulls rather than being fabricated
- operational reconstruction library increased from 2 to 3 events, 3 reconstructed, 0 failed

Fire association remains a separate outcome field and must not define a Sundowner meteorological event.

## 4. PROTECTED PRODUCT / UI FACTS
Public product name: Sundowner Predictor

Protected forecast zones:
- Gaviota
- Refugio
- Goleta
- San Marcos Pass
- Mission Canyon
- Montecito
- Toro Canyon
- Carpinteria

Protected behavior/preferences already established:
- imperial units only
- free hosting unless explicitly approved otherwise
- current approved mountain/fog/sunrise logo
- map default: Esri World Topographic
- optional Topographic / Satellite toggle
- Satellite uses Esri World Imagery plus labels
- iPhone map-first layout
- official-weather disclaimer remains
- contact: Sky Bonillo · sky.bonillo@gmail.com
- do not alter forecast logic when a request is UI-only

## 5. SI-4 RESEARCH — AUTHORITATIVE CURRENT BRANCH
Current research pull request:  
PR #6 — SI-4 research: mountain-wave physics and all-season validation

State: OPEN, DRAFT, UNMERGED  
Production base: `main`  
Research branch: `si4-research`

Current research head verified during this handoff:  
`59b5cdb2035f549319a0046d37ea9b18fb7074bf`  
Commit message: `Retrigger frozen SI-4 2024 upstream thermal archive`

**Do NOT merge PR #6 yet.**

At this head, the PR-triggered validation matrix completed successfully, including all-season frozen holdout, RRFS shadow, event-recall CV, upstream-thermal smoke, terrain/gust CV, inversion-coupling CV, transition-onset CV, coastal-jet CV, general research validation, NDFD archive probe, SWEX acquisition probe, and ordinary QA.

Important limitation of this handoff check: the GitHub connector exposed the PR-triggered jobs but did not provide a reliable direct listing of the separate push-only full-year `SI-4 Upstream Thermal 2024 Archive` run. Therefore the next session MUST inspect that specific full-year workflow and all twelve monthly artifacts before claiming the archive is complete.

## 6. FROZEN SI-4 HOLDOUT RESULTS — WHY SI-4 IS NOT IN PRODUCTION
The frozen SI-4 work has real independent gains, but the recall gate is still the blocker.

All-season fixed-24h frozen 2025 holdout, 7,279 rows:
- Brier: SI-3 0.0795132 → SI-4 0.0524935
- pooled AUC: 0.767001 → 0.937080
- threshold POD: 0.479881 → 0.467958
- FAR: 0.728956 → 0.522796
- hard-negative FPR at frozen matched-POD thresholds: 0.588101 → 0.229596
- hard-negative negative-only Brier: 0.0259841 → 0.0403595

Earlier regime-specific frozen evidence also showed substantial AUC gains and gust improvement; one milestone measured gust MAE roughly 5.78 → 4.90 mph and mean gust bias about -2.60 → -0.04 mph.

Matched archived NDFD 2025 sample, 195 exact common station-valid-time rows:
- SI-3 probability: Brier 0.0720533; AUC 0.809319
- SI-4 probability: Brier 0.0559864; AUC 0.916722
- SI-3 gust MAE 5.6749 mph; SI-4 5.0621 mph; NDFD 6.0046 mph
- SI fixed-lead direction MAE 54.25°; NDFD 50.22°
- no NDFD Sundowner probability was invented
- do not make a blanket claim that Sundowner Predictor beats NWS/NDFD; regime and variable-specific caveats remain

Frozen 2025 event timing/spatial evaluation across 671 observed event episodes:
- predicted episodes: 1,188 → 653
- event FAR: 0.6549 → 0.4686
- onset MAE: 3.834 h → 3.303 h
- peak-time MAE: 4.039 h → 3.769 h
- mean zone-set Jaccard: 0.1952 → 0.2552
- exact zone-set rate: 0.0892 → 0.1283
- zone precision: 0.2710 → 0.4655
- event POD: 0.6110 → 0.5171
- zone recall: 0.4799 → 0.4531

This is the central scientific problem: SI-4 reduces false alarms and improves calibration/timing/spatial precision, but it misses too many genuine events.

## 7. REJECTED / RETIRED RESEARCH LANES — DO NOT REPEAT WITHOUT NEW EVIDENCE
The following have already been tested under leakage-safe, predeclared rules and did not earn promotion:
- simple event-recall rescue via persistence/onset/combined candidates
- transition/onset tendency candidate
- Point Conception coastal-jet phase candidate
- GOES-West marine-layer probability candidates
- HRRR forecast-cycle agreement candidate
- stability-conditioned terrain/gust refinements
- inversion-only / refined surface-coupling probability candidates for hybrid/eastern regimes
- final frozen western surface-coupling inclusion candidate

Key final-ablation result for western coupling:
- improved full-SI-4 Brier 0.0524935 → 0.0511251 and AUC 0.937080 → 0.942497
- improved western hard-negative Brier/FPR
- BUT overall POD fell 0.467958 → 0.453055 and FAR worsened 0.522796 → 0.534456
- decision: reject production inclusion

GOES note: validated extraction/plumbing remains useful research infrastructure, but failed probability candidates must not be retuned against 2025 merely to clear a gate.

RRFS note: in the completed 2024 16-case shadow sample, RRFS beat HRRR on overall gust/direction error but both missed all six event-threshold positives. RRFS remains shadow-only, not an HRRR replacement.

## 8. PENDING EXTERNAL DEPENDENCY
NCAR/EOL SWEX dataset 600.034 final-QC profiler data was already requested/accepted and remained pending in the latest verified research state. Do NOT submit a duplicate order.

SWEX final-QC data may provide a genuinely independent physical basis for future candidate design. Non-IOP time is not automatically a valid negative period.

## 9. EXACT CURRENT RESUME LANE — UPSTREAM THERMAL / SUBSIDENCE
The immediate scientific lane at timeout is the frozen candidate:  
`upstream_thermal_subsidence_v1`

Physical basis:
- upstream lower-tropospheric cold-air support / cold-air advection
- cross-barrier thermal contrast
- northerly/ridge-normal 850-mb momentum
- elevated stable layer / mountain-wave forcing context
- synoptic subsidence / ridge support aloft
- interaction with existing pressure and mountain-wave state, not a generic probability boost

**DEVELOPMENT LOCK:**
- 2024-01-01 through 2024-12-31 ONLY
- archived NOAA HRRR
- fixed lead exactly 24 h
- issuance cycles 00Z, 06Z, 12Z, 18Z
- 2025 MUST NOT be loaded, searched, summarized, inspected, or used for tuning during candidate development
- future observations are label-only
- fire association outcome-only
- fail closed on missing required archive fields, point drift, duplicate keys, or lead-time drift

Frozen points:
- santa_ynez_valley: 34.665, -120.015
- cuyama_interior: 34.950, -119.680
- bakersfield_synoptic: 35.434, -119.057
- santa_barbara_lee: 34.426, -119.840
- western_channel: 34.350, -120.400

Frozen levels:
- 850 mb
- 700 mb
- 500 mb

Frozen fields at each level:
- temperature
- geopotential height
- U wind
- V wind
- derived wind speed/direction
- pressure vertical velocity (VVEL)

Latest PR-head smoke test:
- workflow: SI-4 Upstream Thermal Archive Smoke
- run: 32404498214
- result: SUCCESS
- 20 rows
- 5 points
- zero failures
- all required fields finite
- profiles contained 850/700/500 mb
- holdout_2025_loaded = false
- production_change_authorized = false
- artifact id 9419757613
- artifact digest `848badb662e4b9129288433dd7517198235bcd5fdeb420270dfbbdcaa416d93b`

This proves the extractor and one-day archive plumbing work. It does NOT prove the full 2024 archive completed or that the science candidate passes.

## 10. FULL-YEAR UPSTREAM ARCHIVE EXPECTATION
Workflow: `SI-4 Upstream Thermal 2024 Archive`  
File: `.github/workflows/si4-upstream-thermal-2024-archive.yml`

It is configured as a Jan-Dec monthly matrix, up to three months in parallel, with a 120-minute timeout per job.

Expected complete 2024 geometry:
- leap year: 366 days
- 4 forecast cycles/day
- 5 frozen points/cycle
- expected total rows across all 12 artifacts: 7,320
- each row must have 3 pressure levels and the frozen required fields
- zero archive failures

**EXACT NEXT ACTION:** Open the latest full-year `SI-4 Upstream Thermal 2024 Archive` Actions run associated with current `si4-research` state. Inspect all 12 month jobs and artifacts. Do not infer success from the smoke test or from PR-level checks.

If the full-year archive is incomplete due infrastructure/plumbing only, repair the infrastructure without changing the scientific freeze, then rerun. Do not modify points, fields, dates, lead, or scientific gates based on labels/results.

## 11. PREDECLARED UPSTREAM THERMAL/SUBSIDENCE PROMOTION GATES
Once a complete fail-closed 2024 archive exists, construct the candidate and run chronological 2024 development CV against the exact baseline.

All gates must pass:
1. Event POD improves by at least +0.05 absolute.
2. Event FAR is no worse than baseline.
3. Overall Brier is no worse than baseline.
4. Overall AUC is no worse than baseline - 0.005.
5. Hard-negative negative-only Brier is no worse than baseline AND hard-negative FPR is no worse than baseline at matched threshold.
6. Spatial precision is no worse than baseline - 0.01 absolute.
7. No material collapse in western, hybrid, or eastern regime results.
8. If probability-only, gust output must remain bit-for-bit unchanged; if gust changes, gust MAE/RMSE must be non-inferior.

No gate may be relaxed after seeing results.

**IF ANY GATE FAILS:** Reject the candidate and DO NOT expose it to 2025.

**IF ALL GATES PASS:** Freeze exact extractor, points, transforms, coefficients/thresholds and hashes, then permit exactly one 2025 score-only evaluation. Do not retune from the result.

## 12. NEW RESEARCH CONCLUSION FROM THE TIMED-OUT CHAT — FOVELL/BREWER RECALL STRATEGY
The final conversation before timeout identified an important possible next direction after the upstream thermal/subsidence lane is resolved.

Published Fovell/Brewer work described in the prior session emphasizes a high-recall statistical Sundowner predictor and the threshold tradeoff between catching events and false alarms. Their pressure-gradient-only approach had strong detection but excessive false alarms; adding solar radiation and time-of-day greatly reduced unnecessary daytime alarms.

The insight for this project is not to throw away SI-4 physics. It is that SI-4 may have become too conservative while suppressing false alarms. A high-recall front-end detector may recover genuine events, while the richer SI-4 physics could act as the localization/calibration/false-alarm-control layer.

**IMPORTANT:** Before implementing this lane in the new session, reopen and cite the exact primary Fovell/Brewer paper and reproduce the published predictor faithfully. Do not implement from this prose summary alone and do not invent coefficients.

Proposed future locked research lane after the current upstream test:  
`Fovell–Brewer Recall Benchmark`

Suggested identical leakage-controlled 2024 comparisons:
- SI-3 baseline
- current frozen SI-4
- faithfully reproduced published logistic/high-recall benchmark
- published logistic + SI-4 physics filtering/calibration
- physics-informed XGBoost
- optional Analog Ensemble if justified

The desired winner must materially recover event recall while preserving false-alarm control, calibration, spatial correctness and gust performance. Do not lower the established release gates merely to make a candidate win.

## 13. RESEARCH ORDER — DO THIS IN SEQUENCE
A. Finish/verify full 2024 upstream thermal/subsidence archive.  
B. Run `upstream_thermal_subsidence_v1` through its already-frozen 2024 chronological-CV gates.  
C. If it passes, do one frozen 2025 score-only test; if it fails, reject without 2025 exposure.  
D. Then reopen the primary Fovell/Brewer source and formalize an exact predeclared benchmark/reproduction lane.  
E. Compare high-recall statistical front end versus SI-3/SI-4 and hybrid statistical+physics architectures using identical chronological folds.  
F. Do not merge PR #6 until an SI-4/next-generation candidate actually satisfies the science promotion criteria.  
G. Only after a candidate earns promotion, run full production data-health/degraded-mode verification, release verification, live API checks, Pages probe, desktop 1440x1000 browser QA and iPhone 390x844 browser QA.

## 14. DATA / SCIENCE INTEGRITY RULES
- No 2025 holdout tuning after exposure.
- Future observations are labels, not forecast inputs.
- Fire association is outcome-only, never a Sundowner target or shortcut.
- Missing fields stay null/unknown; never fabricate them to complete a schema.
- A workflow SUCCESS only proves execution; it is not automatically a science PASS.
- Report overall and regime-level metrics.
- Maintain hard-negative evaluation, not just positive-event accuracy.
- Keep event timing and spatial correctness as explicit gates.
- Do not claim NWS superiority without exact matched evidence.
- Do not reopen rejected lanes simply to tune around their failed gate.
- Preserve hashes/artifacts/provenance for every frozen score.

## 15. IMPORTANT REPOSITORY RESEARCH FILES
On `si4-research`, prioritize reading:
- `research/SI4_GATE_STATUS.md`
- `research/SI4_FINAL_ABLATION_2025_DECISION.md`
- `research/SI4_RESEARCH_DECISIONS_2026-08-18.md`
- `research/SI4_UPSTREAM_THERMAL_SUBSIDENCE_2024_PREDECLARED.md`
- `research/SI4_UPSTREAM_THERMAL_ARCHIVE_FREEZE.md`
- `.github/workflows/si4-upstream-thermal-archive-smoke.yml`
- `.github/workflows/si4-upstream-thermal-2024-archive.yml`
- `tools/extract-si4-upstream-thermal-herbie.py`
- `research/SI4_EVENT_SPATIAL_2025_MILESTONE.md`
- `research/SI4_HRRR_CYCLE_2024_CV_DECISION.md`
- `research/SI4_GOES_2024_CV_DECISION.md`
- `research/SI4_COASTAL_JET_PHASE_2024_CV_DECISION.md`
- `research/SI4_TRANSITION_ONSET_2024_CV_DECISION.md`
- `research/SWEX_EVENT_MATCHING_STATUS.md`

Production:
- `README.md`
- `validation/release-status.json`
- `calibration.json`
- `data/known-sundowner-events.json`
- `data/historical-event-reconstructions.json`
- `data/operational-confirmed-events.json`
- `data/operational-event-reconstructions.json`

## 16. RECEIVING AGENT — FIRST COMMANDMENTS
1. Recover this handoff and inspect GitHub before editing anything.
2. Treat newer GitHub state as authoritative if any SHA/run has advanced.
3. Protect main and do not merge PR #6.
4. Resume from the upstream thermal/subsidence full-year archive, not from an older SI-4 experiment.
5. Do not repeat already-failed recall, GOES, terrain, inversion, coastal-jet, or cycle-agreement work without genuinely new evidence.
6. Never use frozen 2025 misses to tune a candidate.
7. Keep the app deployable and production SI-3.1 intact during research.
8. Test and verify before declaring anything finished.

## FINAL CURRENT STATUS
Production Sundowner Predictor remains live and release-verified on SI-3.1. Main is currently `e4338d6794b0a1e814c5d630a7470db753086461`, with verified content commit `658a90167bc5ed0f5a569f4b6c18b30f20893c98`. SI-4 remains research-only in open draft PR #6 on `si4-research` at `59b5cdb2035f549319a0046d37ea9b18fb7074bf`. SI-4 has major independent gains in calibration, false-alarm reduction, gust error, timing, and spatial precision, but still fails the operational event-recall gate. The exact immediate resume point is verification/completion of the full 2024 upstream thermal/subsidence archive followed by the predeclared 2024 chronological-CV science gate. After that lane is resolved, the next high-value research direction is a faithful Fovell/Brewer high-recall benchmark combined with SI-4 physics as a potential false-alarm/calibration layer.