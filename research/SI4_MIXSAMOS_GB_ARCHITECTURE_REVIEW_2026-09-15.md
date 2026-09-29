# SI-4 architecture review — MIXSAMOS-GB — 2026-09-15

Status: **LITERATURE-SUPPORTED PHASE-0 LEAD ONLY / NOT SCORED / NO 2025 EXPOSURE / NO PROMOTION**

## Why reviewed

The corrected 2024 HREF initial-condition ensemble candidate established a real event-recall signal but failed FAR, hard-negative FPR, spatial precision, and regime-safety gates. The next architecture must therefore be materially different from the rejected fixed HREF rule and must not rescue-tune that candidate.

## New primary-source lead

Jobst (2026), *Environmetrics*, DOI 10.1002/env.70145, published 2026-09-06, introduces gradient-boosted mixture regression for ensemble postprocessing (MIXMOS / MIXSAMOS / MIXSAMOS-GB). The architecture explicitly represents exchangeable ensemble groups as mixture components, permits covariate-dependent mixture weights and component parameters, uses standardized anomalies to remove location/season effects, and adds non-cyclic gradient boosting for automatic covariate selection. The paper reports substantial improvement over state-of-the-art comparators in a 24-h ensemble temperature case study. The implementation is associated with the R package `mixnhreg`.

## Material distinction from rejected HREF rule

This is not a threshold change and does not reduce HREF to a single agreement scalar. Its hypothesis is that ensemble-member/group structure can be multimodal and that a conditional mixture can separate physically distinct forecast regimes while calibrating their probabilities. That is relevant to the observed SI-4 pattern where member information improves event recall but creates excess false alarms.

## Important limitation

The published case study is 2-m temperature, not Sundowner occurrence or wind gust. Therefore the paper is architecture evidence only. It does **not** justify outcome scoring until Phase 0 confirms a frozen, issuance-safe HREF mapping and an appropriate response distribution for the SI-4 target. No claim of expected gate passage is made.

## Phase-0 requirements before any 2024 outcome scoring

1. Freeze exact-F24 2024 HREF source/member mapping and exchangeability groups before reading outcomes.
2. Freeze whether the response is modeled directly as occurrence probability or via an issuance-safe gust/flow intermediate; no post-hoc switching.
3. Freeze mixture component count/families, standardized-anomaly construction, covariate inventory, boosting step length, stopping/CV rule, and random seeds before scoring.
4. Chronological training/validation only; no random folds that leak future seasonal information.
5. No member pruning, threshold rescue, outcome-conditioned feature selection, future observations/cycles, reanalysis substitution, fire predictors, or imputation. Missing stays missing.
6. 2025 remains sealed unless **all** frozen 2024 gates pass.
7. Existing promotion gates remain unchanged: event POD >= baseline +0.05 absolute; FAR no worse; Brier no worse; AUC >= baseline-0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline-0.01; regime safety; gust non-inferiority.

## Decision

Retain as a **Phase-0 feasibility lead**, not a candidate result. It is materially distinct enough to inspect, but there is no notification milestone because it has not passed any 2024 gate set.

Production remains **NO PROMOTION**. SI-3.1 on `main` is untouched; PR #6 must remain draft/unmerged.