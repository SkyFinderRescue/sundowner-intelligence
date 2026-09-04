# SI-4 Wave-Momentum Descent 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`wave_momentum_descent_v1`

This candidate was predeclared before scoring and tested whether issuance-time vertical coherence between lee-directed cross-barrier momentum and descending HRRR pressure vertical motion at 850/700 hPa adds event-recall information beyond the frozen SI-4 baseline. The candidate used only the immutable 2024 exact-F24 upstream archive and the established 2024 chronological-development labels. No 2025 observations or outcomes were loaded.

The feature used five frozen upstream reference points, positive HRRR pressure vertical velocity (`vvelPaS`, Pa s-1) as downward motion, lee-directed 850/700-hPa cross-barrier flow, a vertically coherent geometric-mean momentum-descent index, and a fixed 500-hPa strong-reversal guard. Candidate probability adjustments were limited to the predeclared nonnegative grid `[0.00, 0.02, 0.04, 0.06, 0.08]` and aggregation choices `median` or `maximum`, selected only on each chronological training fold.

## 2024 chronological-CV result

- Total development rows: **7,276**
- Total development events: **628**
- Feature coverage: **100%**
- Scored chronological-CV rows: **4,880**
- Scored events: **439**
- Baseline Brier: **0.0549097266**
- Candidate Brier: **0.0549097266**
- Baseline AUC: **0.9313447043**
- Candidate AUC: **0.9313447043**
- Baseline event POD: **0.5828791479**
- Candidate event POD: **0.5828791479**
- Baseline event FAR: **0.2040142405**
- Candidate event FAR: **0.2040142405**
- Baseline hard-negative Brier: **0.0646035117**
- Candidate hard-negative Brier: **0.0646035117**
- Baseline hard-negative FPR: **0.1222816135**
- Candidate hard-negative FPR: **0.1222816135**
- Baseline spatial-zone precision: **0.6156251410**
- Candidate spatial-zone precision: **0.6156251410**
- `passes_all = false`

Every chronological training fold selected coefficient **0.00**. The candidate therefore supplied no independently justified incremental probability adjustment. This is a fail-closed null result, not evidence of accuracy improvement.

## Failed predeclared gates

Two required gates failed:

- event POD did not improve by the required **+0.05 absolute**; observed gain was **0.00**;
- the required nonzero incremental-value gate failed because all three training-fold selectors chose coefficient **0.00**.

All other protection gates were non-inferior only because the candidate collapsed to the unchanged baseline.

## Decision

**Reject `wave_momentum_descent_v1`.**

Do not:

- expose this formulation to the frozen 2025 holdout;
- retune the coefficient grid, aggregation choice, vertical levels, points, orientation, reversal guard, transforms, thresholds, or labels after this result;
- weaken the +0.05 event-recall promotion gate;
- interpret the null result as proof that descending mountain-wave momentum or rotor/hydraulic-jump processes are absent in real Sundowners.

The result means only that this predeclared HRRR pressure-level representation did not add 2024 chronological-CV skill beyond the existing SI-4 baseline. Any future attempt must be materially different and independently justified by new physical evidence, preferably final-QC SWEX observations or another primary-source dataset rather than frozen 2025 miss inspection.

## Provenance and leakage guards

- Candidate family: `wave_momentum_descent_v1`.
- Development year: **2024 only**.
- Exact forecast lead: **F24**.
- Immutable upstream archive: workflow run `32552410978`, 7,300 rows, head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`.
- Chronological-CV workflow: run `33130479454`.
- Workflow artifact SHA-256: `6e4b484db24338cc5a4ea40e81239350c8d81f958c71f39c3b64ebe995094523`.
- Evaluator/workflow scoring head: `8cc9368da065b6586dff0cc68efdfb42a3a218fb`.
- Authoritative frozen baseline upper-air artifact: all-season run `31925677059`.
- Future observations remain label-only.
- Fire association remains outcome-only.
- Missing physical inputs remain missing.
- `holdout_2025_loaded = false`.
- No production change authorized.
