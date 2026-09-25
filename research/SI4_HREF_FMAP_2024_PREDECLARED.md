# SI-4 HREF Flow-Matching Spatial Postprocessing — 2024 Predeclaration

Date: 2026-09-08
Status: **RESEARCH ONLY / PHASE 0 / 2024-ONLY / NO PROMOTION AUTHORITY**
Candidate: `href_fmap_spatial_v1`

## Why this is materially different

The corrected exact-F24 HREF initial-condition ensemble is the first SI-4 candidate to produce the required event-POD gain, but it failed FAR, hard-negative FPR, spatial precision, and regime-safety gates. Existing SI-4 HREF EMOS and EMOS+ECC lanes calibrate marginal distributions and/or restore the raw ensemble rank dependence. They do not learn a new multivariate spatial dependence structure.

This candidate tests a distinct generative architecture: Flow MAtching Postprocessing (FMAP), as described by Landry, Monteleoni & Charantonis (QJRMS, first published 2025-10-26; DOI 10.1002/qj.70055). FMAP uses a spatial-attention transformer inside a flow-matching generative model to generate spatially coherent multivariate station forecasts. The published wind-gust experiments on EUPPBench report improved marginal skill while representing observation correlation structures better than competing postprocessing approaches. Unlike ECC, FMAP is not constrained to preserve the raw ensemble's dependence template and can learn a new spatial dependence structure from historical forecast/observation pairs.

Primary references:
- https://doi.org/10.1002/qj.70055
- https://arxiv.org/abs/2504.03463
- https://eupp-benchmark.github.io/

## Scientific hypothesis

The raw HREF result indicates real convection-allowing ensemble recall signal but excessive spatial/regime false positives. A joint spatial generative postprocessor may preserve useful member-agreement/initial-condition signal while learning historically supported cross-zone dependence that suppresses spatially incoherent false alarms. This is a hypothesis only; no accuracy gain is claimed by this predeclaration.

## Phase-0 feasibility constraints

Before any 2024 Sundowner outcome scoring:

1. **Inputs frozen:** exact-F24, source-QC-corrected 2024 HREF members only, plus static zone/station/terrain metadata available without outcome information. No new HRRR scalar proxy family is authorized.
2. **Architecture frozen:** one FMAP-style spatial-attention + flow-matching design, fixed hidden dimensions, attention topology, optimizer, loss, random-seed policy, and sampling count before outcome scoring.
3. **Chronology:** training/validation splits must be strictly chronological. For each scored issuance, all fitted parameters may use only historical verification data strictly earlier than that issuance.
4. **No future observations:** observations at or after forecast issuance cannot be predictors. Historical observations are training targets only under the chronological rule.
5. **No 2025 exposure:** 2025 remains sealed unless every frozen 2024 promotion gate passes.
6. **No threshold rescue:** the existing chronological training-only event-threshold rule remains unchanged. FMAP cannot be used to tune a post-hoc global threshold after holdout inspection.
7. **No outcome-conditioned station/zone pruning:** station set, zone geometry, member mapping, and missing-data policy are frozen before scoring.
8. **Missing stays missing:** no later cycle, reanalysis, neighboring-date, or outcome-informed imputation.
9. **Fire association outcome-only:** fire occurrence/association cannot enter model inputs, training target definition, spatial masks, calibration, or candidate selection.
10. **Compute feasibility gate:** Phase 0 must demonstrate deterministic/reproducible training and inference for the full frozen chronology within available CI/research compute. If not feasible, reject before outcome scoring.

## Frozen promotion gates

All existing gates remain unchanged:
- event POD >= baseline +0.05 absolute;
- FAR no worse than baseline;
- Brier no worse;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety passes;
- gust non-inferiority passes.

Failure of any gate => **REJECT**, no retuning rescue and no 2025 exposure.

## Phase order

**Phase 0:** reproduce the FMAP mechanics on synthetic/non-outcome data, confirm deterministic chronology-safe data construction, verify exact-F24 HREF feature availability, and estimate full-year compute cost. No Sundowner occurrence outcomes may be inspected to alter the frozen architecture.

**Phase 1:** only if Phase 0 passes, run one frozen full-2024 chronological evaluation against SI-3.1 baseline, corrected raw HREF, EMOS-only, and EMOS+ECC where available.

**Phase 2:** only if every frozen 2024 gate passes, authorize independent 2025 holdout evaluation. Production/release/browser QA remains prohibited until an independently passing candidate clears all promotion rules.

## Production status

**NO PROMOTION.** SI-3.1 on `main` remains untouched. PR #6 must remain draft/open/unmerged.
