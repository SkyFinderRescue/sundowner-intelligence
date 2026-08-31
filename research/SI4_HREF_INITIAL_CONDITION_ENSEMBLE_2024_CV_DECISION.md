# SI-4 HREF Initial-Condition Ensemble 2024 CV Decision

Status: **INITIAL SCORE SUPERSEDED BY SOURCE-QC; CORRECTED 2024 RERUN REQUIRED — DO NOT EXPOSE TO 2025**

Candidate: `initial_condition_ensemble_downslope_v1`

Initial science run: GitHub Actions `33432036871` on `si4-research` head `9545a99eb7fa91ba43338f57703fdfb138938fe9`.

Original frozen HREF archive source: run `33415242408`, 35,850 exact-F24 member rows, 10 members, five frozen points, 2024 only, zero science scoring at archive construction time. Initial CV artifact digest: `sha256:691207a4b557d4a371d1406430cce2c058d9f5edab01c28773178bc9388debb4`.

## Source-QC supersession

After the initial CV completed, the already-existing outcome-blind source-QC repair was inspected. The original archive contained 10 objectively impossible NOAA/NCSS gust decodes across two issuances (`2024-10-15T12Z` and `2024-10-22T00Z`). Because the frozen candidate uses HREF gust mean/spread among its issuance-time predictors, the initial science score cannot be treated as authoritative even though the operational gust output itself was unchanged.

The plumbing-only source-QC repair run `33432036786` had already removed each affected issuance as a whole matched ensemble (100 rows total), with no observations, outcomes, fire association, imputation, or 2025 data used. Its repaired artifact contains 35,750 exact-F24 rows and passes the declared physical numeric-range checks.

A corrected workflow now reruns the **unchanged frozen science logic** against that repaired artifact. The hypothesis, predictors, transforms, calibration procedure, threshold selection, labels, chronological folds, and promotion gates are unchanged. Only the archive plumbing input is corrected.

Until the corrected rerun completes, the metrics below are retained strictly as superseded diagnostic evidence and **must not** authorize a scientific decision or 2025 exposure.

## Superseded initial 2024 chronological-CV metrics

Aggregate validation metrics from the contaminated-source run (2,380 scored validation rows, 187 event rows):

| Metric | Baseline | HREF candidate | Initial gate result |
|---|---:|---:|---|
| Event POD | 0.516779 | 0.592003 | PASS (+0.075224 absolute) |
| Event FAR | 0.297582 | 0.353086 | FAIL |
| Overall Brier | 0.0511564 | 0.0492236 | PASS |
| Overall AUC | 0.935130 | 0.939781 | PASS |
| Hard-negative Brier | 0.0490913 | 0.0457136 | PASS |
| Hard-negative FPR | 0.119808 | 0.132081 | FAIL |
| Spatial zone precision | 0.557847 | 0.532852 | FAIL |
| Regime safety | — | — | FAIL |
| Gust non-inferiority | unchanged baseline gust | unchanged baseline gust | PASS |

These values are not final because two outcome-blind archive issuances were invalid at source decode and are now removed fail-closed.

## Current decision

No 2025 score is authorized. Do not retune HREF coefficients, thresholds, member-fraction rules, case selection, or feature transforms using 2025 data. Wait for the corrected source-QC 2024 chronological-CV result and apply the original frozen all-gates rule exactly.

SI-3.1 on `main` remains production. PR #6 must remain draft and unmerged. Current production-promotion decision remains **NO PROMOTION**.
