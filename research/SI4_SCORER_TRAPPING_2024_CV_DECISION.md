# SI-4 Scorer Trapping 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`scorer_trapping_proxy_v1`

This candidate was predeclared before scoring and tested a materially different wave-ducting hypothesis using issuance-time forecast fields only: a coarse Scorer-type trapping proxy derived from five frozen upstream points, 850/700/500-hPa potential-temperature stability, signed barrier-normal wind, and nonuniform 700-hPa wind curvature. It represents trapping susceptibility only; it is not proof of a rotor or hydraulic jump.

The evaluator used the immutable 2024 upstream archive from workflow run `32552410978` and the authoritative fixed-F24 upper-air baseline artifact from all-season run `31925677059`. No 2025 observations or outcomes were loaded.

## 2024 chronological-CV result

- Total development rows: **7,276**
- Total development events: **628**
- Scored chronological-CV rows: **4,880**
- Scored events: **439**
- Feature coverage: **100%**
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

Across every chronological fold, the training-only selector chose coefficient `0`. The candidate therefore collapsed exactly to baseline and supplied no independently measurable incremental skill.

## Failed predeclared gates

The mandatory event-recall gate required event POD to improve by at least **+0.05 absolute** over baseline. Observed gain was **0.00**. The separate nonzero-incremental-value gate also failed. All safety metrics remained non-inferior only because the selector correctly rejected every nonzero coefficient.

## Decision

**Reject `scorer_trapping_proxy_v1`.**

Do not:

- retune the coefficient grid, aggregation rule, wind threshold, upstream points, transforms, or operating threshold after this result;
- expose this formulation to the frozen 2025 holdout;
- relax the +0.05 event-recall requirement;
- interpret the null result as evidence that atmospheric wave trapping is absent from real Sundowner events.

The result means only that this coarse pressure-level Scorer-trapping representation did not add 2024 chronological-CV skill beyond the existing SI-4 baseline. A future attempt must be materially different and independently justified, ideally by final-QC SWEX observations or another primary-source physical diagnostic rather than by inspecting frozen 2025 misses.

## Provenance and leakage guards

- Candidate family: `scorer_trapping_proxy_v1`.
- Development year: 2024 only.
- Exact fixed lead: F24.
- Immutable upstream archive: workflow run `32552410978`, head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`, 7,300 rows, zero failures.
- Chronological-CV workflow: run `33142910620`.
- Workflow head: `70643cde3f0d61a9576a95f1b23d19a5b5a6b48b`.
- Artifact digest: `sha256:863977872730fdc1446f4c381925d571393cf9c77e2ab9804a3f38067495e6ce`.
- Authoritative frozen baseline upper-air artifact: all-season run `31925677059`.
- Future HADS/RAWS observations remain label-only.
- Fire association remains outcome-only.
- Missing physical inputs remain missing.
- `holdout_2025_loaded = false`.
- No production change authorized.
