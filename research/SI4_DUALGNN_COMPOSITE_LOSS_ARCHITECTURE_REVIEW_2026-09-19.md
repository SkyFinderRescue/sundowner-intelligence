# SI-4 architecture review — dualGNN composite-loss multivariate postprocessing — 2026-09-19

Status: **LITERATURE-SUPPORTED PHASE-0 LEAD ONLY / NOT SCORED / NO 2025 EXPOSURE / NO PROMOTION**

## Why reviewed

The corrected 2024 HREF initial-condition ensemble candidate established real event-recall signal but failed FAR, hard-negative FPR, spatial precision, and regime-safety gates. Any follow-on architecture must be materially different from the rejected fixed HREF rule and must not rescue-tune that candidate.

## Primary-source lead

Lakatos (2026), *Quarterly Journal of the Royal Meteorological Society*, DOI 10.1002/qj.70119, introduces a dual graph neural network (dualGNN) for multivariate ensemble postprocessing. The model is trained with a composite loss combining the energy score and variogram score so that calibration and multivariate/spatial dependence are optimized jointly. In published WRF solar-irradiance and ECMWF visibility experiments, dualGNN outperformed empirical-copula postprocessing and networks trained only with CRPS or energy score on the evaluated multivariate verification metrics; for WRF, its learned rank-order structure restored spatial relationships better than raw-ensemble or historical-observation ranks.

## Material distinction from rejected HREF rule

This is not a threshold change, scalar proxy, member-pruning rule, or marginal-only recalibration. The hypothesis is that HREF's demonstrated recall information can be retained while false alarms and spatial-precision failures are reduced by learning graph-structured cross-location/member dependencies under an explicit dependence-sensitive loss. That is materially distinct from the rejected fixed HREF agreement rule, MIXSAMOS-GB conditional mixtures, FMAP flow matching, and marginal distributional approaches.

## Important limitation

The published applications are solar irradiance and visibility, not Sundowner occurrence or wind gust. The paper is architecture evidence only. It does not justify 2024 outcome scoring until an outcome-blind Phase 0 freezes an issuance-safe graph, target formulation, training chronology, and compute plan. No expected gate passage is claimed.

## Phase-0 requirements before any 2024 outcome scoring

1. Freeze exact-F24 2024 HREF source/member mapping and source QC before reading outcomes.
2. Freeze graph nodes/edges, station/zone geometry, member representation, predictor inventory, target formulation, hidden dimensions/layers, ES/VS weighting, optimizer, stopping rule, seeds, ensemble sample count, and missing-data behavior before scoring.
3. Chronological training/validation only; no random folds that leak future seasonal information.
4. No member/station pruning, threshold rescue, outcome-conditioned graph construction or feature selection, future observations/cycles, reanalysis substitution, fire predictors, or imputation. Missing stays missing.
5. Preserve exact-F24 timing and the existing 2024 evaluation calendar. No 2025 exposure unless every frozen 2024 gate passes.
6. Existing promotion gates remain unchanged: event POD >= baseline +0.05 absolute; FAR no worse; Brier no worse; AUC >= baseline-0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline-0.01; regime safety; gust non-inferiority.
7. Phase 0 must first confirm reproducible implementation and full-year compute feasibility. If either fails, reject before outcome scoring.

## Decision

Retain as a **Phase-0 feasibility lead**, not a candidate result. No notification milestone is reached because it has not passed the frozen 2024 gate set.

SWEX 600.034 remains on the official public OPeNDAP/EOL acquisition path; no final bytes/checksum are claimed here.

Production remains **NO PROMOTION**. SI-3.1 on `main` is untouched; PR #6 must remain draft/unmerged.