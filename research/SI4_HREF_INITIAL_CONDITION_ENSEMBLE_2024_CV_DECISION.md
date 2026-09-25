# SI-4 HREF Initial-Condition Ensemble 2024 CV Decision

Status: **CORRECTED 2024 CV COMPLETE — REJECTED UNDER FROZEN GATES — DO NOT EXPOSE TO 2025**

Candidate: `initial_condition_ensemble_downslope_v1`

Authoritative corrected science run: GitHub Actions `33437155754` on `si4-research` head `1c738d7881bcdc50765c2060cfaafafc8130fe82`.

Corrected CV artifact digest: `sha256:3c23cfd9d4ae65d49d6ebdf978f828b7ffe39d6dfbca1e81e6377c81205c2d6f`.

Original frozen HREF archive: run `33415242408`, 35,850 exact-F24 member rows, 10 members, five frozen points, 2024 only, zero science scoring at archive construction time.

Outcome-blind source-QC repair: run `33432036786`. It identified 10 objectively impossible NOAA/NCSS gust decodes at two issuances (`2024-10-15T12Z` and `2024-10-22T00Z`) and removed each issuance as a whole matched 10-member x 5-point ensemble. The repaired archive contains 35,750 exact-F24 rows. No observations, outcomes, fire association, imputation, or 2025 data were used to make these exclusions.

The corrected run used the **unchanged frozen science logic**. No hypothesis, predictor, transform, calibration, threshold-selection rule, label, chronological fold, or promotion gate changed.

## Authoritative corrected 2024 chronological-CV result

Aggregate frozen validation metrics (2,370 scored validation rows, 187 event rows):

| Metric | Baseline | HREF candidate | Gate result |
|---|---:|---:|---|
| Event POD | 0.516779 | 0.592003 | **PASS** (+0.075224 absolute; required >= +0.05) |
| Event FAR | 0.297582 | 0.338750 | **FAIL** |
| Overall Brier | 0.0513451 | 0.0491535 | **PASS** |
| Overall AUC | 0.935020 | 0.940484 | **PASS** |
| Hard-negative Brier | 0.0491642 | 0.0456611 | **PASS** |
| Hard-negative FPR | 0.119982 | 0.132249 | **FAIL** |
| Spatial zone precision | 0.557847 | 0.536115 | **FAIL** |
| Regime safety | — | — | **FAIL** |
| Gust non-inferiority | unchanged baseline gust | unchanged baseline gust | **PASS** |
| Exact member provenance | frozen/repaired outcome-blind | frozen/repaired outcome-blind | **PASS** |

The simple frozen comparator reached event POD 0.551501 with event FAR 0.283547, Brier/AUC identical to its baseline probability model, hard-negative FPR 0.129242, and spatial precision 0.572970. It also does not authorize promotion.

## Decision

`passes_all=false`; `winner_eligible_for_single_frozen_2025_score=null`.

This is the first independently measured 2024 SI-4 candidate in this research sequence to clear the required **+0.05 absolute event-POD recovery gate**: +0.075224. That is retained as important evidence that convection-allowing ensemble initial-condition/member-agreement information contains real Sundowner recall signal.

However, the candidate simultaneously worsened event FAR, hard-negative FPR, spatial precision, and regime safety. Under the predeclared all-gates contract, it is therefore **rejected** and must not be exposed to 2025.

Do not rescue-tune HREF coefficients, thresholds, member-fraction rules, case selection, or feature transforms on this result or on 2025. Any future ensemble-derived experiment must be materially different and independently justified before scoring, not a near-duplicate search for a passing combination.

SI-3.1 on `main` remains production. PR #6 remains draft and unmerged. Current production-promotion decision remains **NO PROMOTION**.
