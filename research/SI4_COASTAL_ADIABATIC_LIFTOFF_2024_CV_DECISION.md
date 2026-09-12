# SI-4 Coastal Adiabatic Lift-Off 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`coastal_adiabatic_liftoff_v1`

This candidate was predeclared before scoring and tested a materially different physical hypothesis using issuance-time forecast fields only: whether offshore/north-side air approaching the Santa Ynez crest possessed sufficient thermodynamic lift-off potential relative to the south-coast air mass to support downslope transition despite marine resistance. The frozen evaluator used the immutable 2024 coastal lift-off archive and the authoritative fixed-F24 upper-air baseline artifact. No 2025 observations or outcomes were loaded.

## 2024 chronological-CV result

- Total development rows: **7,276**
- Total development events: **628**
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

Across every chronological fold, the training selector chose `alpha = 0`. The physically constrained lift-off adjustment therefore earned no weight over the existing SI-4 baseline. This is a fail-closed null result rather than evidence of improvement.

## Failed predeclared gate

The mandatory recall gate required event POD to improve by at least **+0.05 absolute** over baseline. Observed gain was **0.00**. All non-recall protections were non-inferior only because the selector correctly collapsed the candidate adjustment to zero.

## Decision

**Reject `coastal_adiabatic_liftoff_v1`.**

Do not:

- retune the theta tolerance, alpha grid, points, transforms, or thresholds after this result;
- expose this formulation to the frozen 2025 holdout;
- relax the +0.05 event-recall promotion requirement;
- interpret the null result as proof that adiabatic lift-off processes are absent in real Sundowners.

The result means only that this predeclared archive representation and transform supplied no incremental 2024 chronological-CV skill beyond the existing SI-4 baseline. Any future attempt must be materially different and independently justified, preferably by final-QC SWEX observations or other primary-source physical evidence rather than by inspecting frozen 2025 misses.

## Provenance and leakage guards

- Candidate family: `coastal_adiabatic_liftoff_v1`.
- Development year: 2024 only.
- Exact fixed lead: F24.
- Immutable coastal archive: workflow run `33016117269`, 5,840 rows, 12 source artifacts, SHA-256 `652c66429dd5942c4e498d628cae48a60c1c5da38aa0bf7585f5d0f49b638fd9`.
- Chronological-CV workflow: run `33031429639`.
- Authoritative frozen baseline upper-air artifact: all-season run `31925677059`.
- Future HADS/RAWS observations remain label-only.
- Fire association remains outcome-only.
- Missing physical inputs remain missing.
- `holdout_2025_loaded = false`.
- No production change authorized.
