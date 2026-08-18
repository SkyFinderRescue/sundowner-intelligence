# SI-4 Promotion Gate Status

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

The verified SI-3.1 release on `main` remains the production baseline. PR #6 stays draft and unmerged.

## Independently measured gates

- **All-season fixed-24h frozen holdout:** **COMPLETE / OVERALL SKILL IMPROVES.** Training 2024-01-01..2024-12-31 and score-only holdout 2025-01-01..2025-12-31 use 23,392 archived NOAA HRRR pressure-profile rows. On 7,279 frozen 2025 rows, overall Brier improved 0.0795132 -> 0.0524935 and pooled AUC improved 0.767001 -> 0.937080, but thresholded POD decreased 0.479881 -> 0.467958 and aggregate hard-negative negative-only Brier worsened 0.0259841 -> 0.0403595.
- **Matched archived NWS/NDFD benchmark:** **COMPLETE FOR THE FROZEN MATCHED SAMPLE.** Deterministic NDFD was scored only on observable deterministic quantities and threshold skill; no NWS Sundowner probability was manufactured. SI-4 improved matched Brier/AUC and had lower peak-gust MAE than both SI-3 and NDFD on the validated matched sample, while NDFD retained lower overall direction error. No blanket superiority claim is authorized.
- **Western hard-negative calibration:** **FINAL ABLATION REJECTS PRODUCTION INCLUSION.** The already-frozen western surface-coupling candidate improved overall/western Brier and AUC plus western hard-negative Brier/FPR, but failed the required recall/FAR preservation gate: overall POD fell 0.467958 -> 0.453055 and overall FAR worsened 0.522796 -> 0.534456 versus full SI-4. Retain as research evidence only; do not promote.
- **RRFS retrospective shadow benchmark:** **COMPLETE / REMAINS SHADOW ONLY.** Full predeclared 16-case 2024 sample completed. On 80 matched observed zone rows, RRFS gust MAE was 5.5816 mph vs HRRR 6.2150 mph and direction MAE 68.6509° vs 80.6875°, but both systems missed all six event-threshold positives and RRFS was not consistently superior by regime. No replacement of HRRR is authorized.
- **Event-recall recovery development:** **NO CANDIDATE PASSED.** Three physically predeclared 2024-only chronological-CV rescue candidates (persistence, onset, combined) all failed promotion gates before any 2025 score. Best development event POD was 0.6176 vs baseline 0.6087, below the required +0.05 absolute gain, and hard-negative Brier also failed for the combined candidate.
- **Terrain/gust refinement:** **NO NEW CANDIDATE PASSED.** 2024 chronological CV found small RMSE improvements from stability-conditioned refinements but neither achieved the predeclared >=1% MAE improvement. Retain the existing SI-4 terrain correction; neither refinement is eligible for 2025 scoring.
- **Explicit inversion-base / refined coupling:** **DIAGNOSTIC RETAINED; PROBABILITY CANDIDATES REJECTED.** The reproducible inversion-base diagnostic is retained as research evidence, but inversion-only, refined-coupling and full-physics hybrid/eastern candidates all failed 2024 predeclared gates. The already-frozen western surface-coupling coefficients were not refit.
- **Frozen 2025 event timing / spatial correctness:** **COMPLETE WITH MATERIAL TRADEOFF; RECALL GATE FAILS.** Across 671 observed episodes, SI-4 reduced event FAR from 0.6549 to 0.4686 and improved onset MAE 3.834 -> 3.303 h and peak-time MAE 4.039 -> 3.769 h. Mean zone-set Jaccard improved 0.1952 -> 0.2552 and zone precision 0.2710 -> 0.4655. However event POD fell 0.6110 -> 0.5171 and zone recall 0.4799 -> 0.4531. Do not tune on 2025 misses.
- **HRRR forecast-cycle agreement candidate:** **REJECTED UNDER ITS PREDECLARED 2024 GATE.** Keep the descriptive cycle-agreement diagnostics; do not promote the failed candidate without a materially different 2024-only/independent-physics hypothesis.
- **Direct GOES-West marine-layer candidate:** **REJECTED UNDER ITS PREDECLARED 2024 GATE.** Keep validated archive/plumbing and diagnostic evidence; do not reopen merely to clear a gate. A materially different independent-physics hypothesis is required.
- **Final frozen feature-block ablation:** **COMPLETE / CURRENT SI-4 DOES NOT EARN PRODUCTION PROMOTION.** Run 107 (`32161555227`) completed the predeclared score-only ablation on head `9cbe18edf31dbd57c49dc766ab960150ed23c2b0`. Pressure-evolution removal materially degraded skill. Other removals produced mixed 2025 tradeoffs and are diagnostic only, not permission to post-holdout retune. The surviving western coupling candidate improved calibration/discrimination but failed recall/FAR preservation. See `research/SI4_FINAL_ABLATION_2025_DECISION.md`.

## Work in progress / external dependency

- **Full quality-controlled SWEX ingestion:** pending NCAR/EOL delivery of the already-accepted one-file final-QC profiler order for dataset 600.034. Do not submit duplicate orders. Final-QC observations and independently verified matched negative windows are required; non-IOP time is not automatically a negative.

## Current production-promotion decision

**NO PROMOTION.** The frozen SI-4 research candidate demonstrates substantial independent gains in probabilistic skill, false-alarm reduction, gust error, timing and spatial precision, but the operational event-recall gate remains unsatisfied. Earlier leakage-safe 2024-only recall-recovery candidates failed before 2025 exposure, and the final ablation does not provide an evidence-backed rescue.

Preserve SI-3.1 on `main` and keep PR #6 draft/unmerged. Do not use the frozen 2025 holdout to invent or retune a recall correction.

## What could legitimately reopen the science decision

- obtain and ingest the pending final-QC SWEX observations and complete independent event-window feature validation;
- use those independent observations, or another genuinely new primary-source physical hypothesis, to formulate a new 2024-only development candidate with predeclared gates before any future independent score;
- only after a science candidate clears the promotion gates should production data-health/degraded-mode verification, release verification, and desktop 1440x1000 / iPhone 390x844 browser QA be run for promotion.

No result in this document authorizes changes to `main` or production deployment.
