# SI-4 HREF Initial-Condition Ensemble 2024 CV Decision

Status: **REJECTED UNDER FROZEN 2024 GATES — DO NOT EXPOSE TO 2025**

Candidate: `initial_condition_ensemble_downslope_v1`

Frozen science run: GitHub Actions `33432036871` on `si4-research` head `9545a99eb7fa91ba43338f57703fdfb138938fe9`.

Frozen HREF archive source: run `33415242408`, 35,850 exact-F24 member rows, 10 members, five frozen points, 2024 only, zero science scoring at archive construction time. CV artifact digest: `sha256:691207a4b557d4a371d1406430cce2c058d9f5edab01c28773178bc9388debb4`.

## Independent 2024 chronological-CV result

The candidate produced the first material event-recall recovery from this independent architecture, but it failed multiple mandatory safety gates and is therefore rejected before any 2025 exposure.

Aggregate frozen validation metrics (2,380 scored validation rows, 187 event rows):

| Metric | Baseline | HREF candidate | Gate result |
|---|---:|---:|---|
| Event POD | 0.516779 | 0.592003 | **PASS** (+0.075224 absolute; required >= +0.05) |
| Event FAR | 0.297582 | 0.353086 | **FAIL** |
| Overall Brier | 0.0511564 | 0.0492236 | **PASS** |
| Overall AUC | 0.935130 | 0.939781 | **PASS** |
| Hard-negative Brier | 0.0490913 | 0.0457136 | **PASS** |
| Hard-negative FPR | 0.119808 | 0.132081 | **FAIL** |
| Spatial zone precision | 0.557847 | 0.532852 | **FAIL** (degradation exceeds frozen tolerance) |
| Regime safety | — | — | **FAIL** |
| Gust non-inferiority | unchanged baseline gust | unchanged baseline gust | **PASS** |
| Exact HREF member provenance | frozen | frozen | **PASS** |

The simple frozen comparator reached event POD 0.551501 with event FAR 0.283547, Brier/AUC identical to the baseline probability model, hard-negative FPR 0.129067, and spatial precision 0.572970. It also does not authorize promotion.

## Decision

`passes_all=false`; `winner_eligible_for_single_frozen_2025_score=null`.

No 2025 score is authorized. Do not retune HREF coefficients, thresholds, member-fraction rules, case selection, or feature transforms using 2025 data. The recall gain is retained as important independent evidence that ensemble initial-condition/member-agreement information contains useful Sundowner onset signal, but the present candidate trades too much false-alarm, hard-negative, spatial, and regime safety for that recall.

This result does **not** authorize a near-duplicate rescue candidate. A future HREF-derived candidate is legitimate only if supported by materially different independent physics/architecture and predeclared entirely on 2024 development evidence before any new holdout exposure.

SI-3.1 on `main` remains production. PR #6 must remain draft and unmerged. Current production-promotion decision remains **NO PROMOTION**.
