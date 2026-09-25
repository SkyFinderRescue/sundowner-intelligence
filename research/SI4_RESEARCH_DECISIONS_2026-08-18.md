# SI-4 Research Decisions — 2026-08-18

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This record preserves the strict-order SI-4 decisions completed after the authoritative frozen holdout. The verified SI-3 production baseline on `main` is unchanged. PR #6 remains draft/unmerged.

## 1. RRFS 2024 shadow benchmark — COMPLETE, REMAINS SHADOW ONLY

Authoritative successful full 16-case run: `32145071828` at/after research head `b4cb106bf624892f4793c709f1144b3f54878861`.

Artifact: `si4-rrfs-f24-2024-shadow-sample`, SHA-256 `0fb82128b97a1a1db9515e6b02b3c579ffce9e4f618462e0d1edf7e62e313e75`.

Matched 2024 evidence (80 observed zone rows):

- RRFS gust MAE: **5.5816 mph** vs HRRR **6.2150 mph** (RRFS -0.6334 mph).
- RRFS direction MAE: **68.6509 deg** vs HRRR **80.6875 deg** (RRFS -12.0366 deg).
- Event-threshold POD: RRFS **0/6 = 0.0**, HRRR **0/6 = 0.0**.
- Western gust MAE: RRFS **8.3546** vs HRRR **10.1969 mph**; direction MAE **52.3973** vs **75.4375 deg**.
- Hybrid gust MAE: RRFS **5.0814** vs HRRR **3.8063 mph**; direction MAE **64.6334** vs **88.25 deg**.
- Eastern gust MAE: RRFS **3.0588** vs HRRR **3.4375 mph**; direction MAE **86.9132** vs **82.1563 deg**.

Decision: RRFS has useful deterministic gust/direction evidence overall, but does not independently improve event recall and is not consistently superior by regime. **Keep RRFS shadow-only.** No model coefficients changed from this benchmark.

## 2. Event-recall recovery — 2024 chronological CV only, ALL CANDIDATES REJECTED

Run: `32150557438`. Artifact: `si4-event-recall-2024-cv`, SHA-256 `f5fe66e330748df7f5f5b0d9c1905a4a13db2d8aa8b5c71aa39761ff8100861c`.

Development-only baseline across chronological folds: event POD **0.6087**, event FAR **0.3844**, Brier **0.05341**, AUC **0.93490**, hard-negative Brier **0.06485**, hard-negative FPR **0.12228**.

Predeclared physical candidates:

- Persistence boost: event POD **0.6096**; failed material-recall and hard-negative-Brier gates.
- Onset boost: event POD **0.6120**; failed material-recall, FAR, hard-negative-Brier and spatial-precision gates.
- Combined physical boost: event POD **0.6176**; failed the predeclared +0.05 absolute event-POD gate and hard-negative-Brier gate.

Decision: **reject all three; no 2025 scoring is permitted.** No individual 2025 missed-event row was inspected and no 2025 outcome was used for tuning.

## 3. Terrain/gust refinement — 2024 chronological CV only, CANDIDATES REJECTED

Run: `32151013585`. Artifact: `si4-terrain-gust-2024-cv`, SHA-256 `7fcb0e8f3efd494553020eb200a83f3d3a7a9610bf640ed31508a2e3e4dc3a8b`.

Current SI-4 terrain correction: MAE **4.8609 mph**, RMSE **6.9987 mph**, bias **+0.4018 mph**.

- Stability-conditioned shrunk correction: MAE **4.8386**, RMSE **6.9083**, bias **+0.4730 mph**. RMSE/bias gates passed, but the predeclared >=1% MAE improvement gate failed.
- Stability+wave shrunk correction: MAE **4.8498**, RMSE **6.9228**, bias **+0.3487 mph**. RMSE/bias gates passed, but the >=1% MAE improvement gate failed.

Decision: **retain the current SI-4 terrain correction; do not expose either candidate to 2025.** Event probabilities were unchanged by this test.

## 4. Explicit inversion-base and refined surface-coupling refinement — 2024 chronological CV only, CANDIDATES REJECTED

Run: `32151578920`. Artifact: `si4-inversion-coupling-2024-cv`, SHA-256 `478ee40bcc97af1113e7e235b5919f89e79adbf2d527d0bc1f51ce9bf3ebe780`.

A reproducible inversion-base diagnostic was added in `research/si4-inversion-coupling.js`: the inversion base is the lowest pressure-level layer below 3 km whose temperature increases by >=0.5 C and whose positive temperature gradient is >=0.5 C/km. When no such layer exists, inversion height/strength stay null/absent; no missing value is fabricated. Hydraulic-jump/rotor output remains explicitly susceptibility-only.

The refinement was deliberately limited to hybrid/eastern regimes so the already frozen and one-time-2025-tested western surface-coupling candidate was not refit or altered.

Chronological 2024 baseline (hybrid/eastern): Brier **0.0109643**, AUC **0.90085**, POD **0.56825**, FAR **0.81056**, hard-negative Brier **0.0064370**, hard-negative FPR **0.21973**.

- Inversion-only candidate: Brier **0.0108862**, AUC **0.90296**, POD **0.53651**. Failed >=1% Brier improvement, POD, FAR and spatial-precision gates.
- Refined-coupling candidate: Brier **0.0109211**, AUC **0.89946**, POD **0.53651**. Failed >=1% Brier improvement and POD gates.
- Full-physics candidate: Brier **0.0108844**, AUC **0.89916**, POD **0.40952**. Failed >=1% Brier improvement, POD, FAR and spatial-precision gates.

Decision: **retain the inversion-base diagnostic as an auditable research diagnostic, but reject all three probability candidates and do not score them on 2025.** The existing western frozen coupling candidate remains unchanged.

## Integrity / promotion state

- SI-3 production on `main`: unchanged.
- PR #6: must remain draft/unmerged.
- Future observations: label-only.
- Fire association: outcome-only, excluded from Sundowner occurrence training target.
- Missing predictors: not fabricated by the new inversion diagnostic.
- 2025 tuning from these workstreams: none.
- RRFS: shadow-only.
- No new work in this record authorizes production promotion.
