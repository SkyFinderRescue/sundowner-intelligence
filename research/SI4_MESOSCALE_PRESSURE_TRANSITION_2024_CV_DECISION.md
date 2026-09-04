# SI-4 Mesoscale Pressure-Transition 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`mesoscale_pressure_transition_v1`

This candidate was predeclared before scoring and tested a materially different pressure-evolution hypothesis: the spatial phase and temporal coherence of issuance-time fixed-F24 forecast pressure gradients across the Santa Barbara coast, Santa Ynez Valley, Point Conception/Vandenberg, Santa Maria and Bakersfield sectors. It was intended to distinguish persistent/coherent offshore and cross-barrier evolution from a transient scalar pressure signal. It used no future observations as predictors.

## 2024 chronological-CV result

Workflow run: `33152969236`

- Development rows: **7,276**
- Out-of-fold scored rows: **5,478**
- Scored event rows: **506**
- Baseline Brier: **0.0706391243**
- Candidate Brier: **0.0706391243**
- Baseline AUC: **0.8972212771**
- Candidate AUC: **0.8972212771**
- Baseline event POD: **0.5138339921**
- Candidate event POD: **0.5138339921**
- Baseline event FAR: **0.5298372514**
- Candidate event FAR: **0.5298372514**
- Baseline hard-negative Brier: **0.0909489667**
- Candidate hard-negative Brier: **0.0909489667**
- Baseline hard-negative FPR: **0.1346982759**
- Candidate hard-negative FPR: **0.1346982759**
- `passes_all = false`

The training-only chronological selector chose `zero_adjustment` in Q2, Q3 and Q4. The candidate therefore collapsed exactly to the frozen SI-4 development baseline and supplied no independently measurable incremental skill.

## Gate result

The mandatory recall gate required event POD >= baseline + **0.05 absolute**. Observed gain was **0.00**. All no-worse safety gates passed only because the training-only selector rejected every nonzero adjustment.

Decision: **REJECT `mesoscale_pressure_transition_v1` and do not expose it to the frozen 2025 holdout.**

Do not retune its coefficient family, point definitions, gradient orientation, coherence windows, probability bounds or operating threshold after seeing this result. A future pressure-evolution attempt must be materially different and independently justified by primary-source physical evidence rather than frozen-2025 misses.

## Provenance and leakage guards

- Development year: **2024 only**.
- Forecast lead: **exact F24** under the authoritative SI-4 forecast-cycle contract.
- Authoritative frozen baseline upper-air artifact: all-season workflow run `31925677059`.
- Chronological-CV workflow: run `33152969236`.
- Artifact: `si4-mesoscale-pressure-transition-2024-cv`.
- Artifact ZIP SHA-256: `66a7f1b071bf4d8271aa449a881a695ab7789da2b8e9d919870527809b0ff203`.
- Future HADS/RAWS observations remain label-only.
- Fire association remains outcome-only.
- Missing inputs remain missing.
- `holdout_2025_loaded = false`.
- `production_change_authorized = false`.
