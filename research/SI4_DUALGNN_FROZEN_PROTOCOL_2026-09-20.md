# SI-4 dualGNN frozen Phase-0 protocol — 2026-09-20

Status: **FROZEN FOR IMPLEMENTATION / NOT YET SCORED / NO 2025 EXPOSURE / NO PROMOTION**

## Rationale

Lakatos (2026), QJRMS, DOI 10.1002/qj.70119, demonstrates a GraphSAGE ensemble postprocessor trained with a composite energy-score (ES) plus variogram-score (VS) objective. The method is materially distinct from the rejected HREF rule because it directly learns a multivariate spatial ensemble rather than applying a scalar/member-agreement occurrence rule. The published solar-irradiance case is the closest terrain/coastal analogue among the paper's two applications and therefore supplies outcome-blind defaults below.

## Frozen outcome-blind choices

These choices are fixed before any 2024 Sundowner outcome scoring and must not be altered in response to gate results.

1. **Forecast source/timing:** use only the already issuance-safe exact-F24 2024 HREF source/member archive and its frozen source-QC/member mapping. No later cycle, future observation, reanalysis, ERA5, fire field, or 2025 data may enter predictors.
2. **Graph nodes:** use the pre-existing SI-4 station/zone inventory available from the frozen exact-F24 evaluation geometry. Do not add/drop nodes based on 2024 outcomes.
3. **Edges:** fixed undirected geographic-distance graph with a **50 km** threshold, matching Lakatos's published northern-Chile terrain/coastal application. Distance is computed from fixed station coordinates only. No outcome-, climatology-, error-, or label-based graph optimization.
4. **Loss:** composite loss **0.9 ES + 0.1 normalized VS**, matching the published northern-Chile application. VS normalization is the paper's outcome-blind raw-ensemble scale ratio (mean raw-ensemble ES / mean raw-ensemble VS), computed only from forecast/observation values in each allowed training window and never from Sundowner labels or gate metrics.
5. **Variogram order:** p = **0.5**, as in the paper.
6. **Predictors:** only frozen HREF target-variable ensemble/member information and static node geography already present in the source/evaluation geometry. No newly searched HRRR scalar proxies and no outcome-derived covariates.
7. **Model family:** GraphSAGE with mean aggregation, ReLU, batch normalization and dropout; direct node-wise ensemble output. Architecture depth/width and optimizer settings must be copied from the paper's published northern-Chile configuration where explicitly reported. If a required value is not published, it must be chosen once from a deterministic implementation convention or non-outcome smoke test and documented before scoring; no 2024 Sundowner-label tuning is allowed.
8. **Output ensemble size:** preserve the frozen HREF effective member count; no member pruning or outcome-conditioned member weighting.
9. **Chronology:** strictly chronological rolling training/evaluation. Training for a valid time may use only observations that would have been available before that forecast issuance. No random folds or future leakage.
10. **Missingness:** missing stays missing. No outcome-informed imputation and no substitution from future cycles.
11. **Randomness:** freeze all implementation seeds before the first Sundowner outcome score and persist them with the run manifest.
12. **Thresholds:** use the existing frozen SI-4 occurrence threshold/evaluation protocol. No threshold rescue or post-score retuning.

## Phase-0 implementation gate

Before outcome scoring, an implementation smoke test must verify: deterministic graph reconstruction; exact-F24 source provenance; no 2025 rows; no future-cycle/observation leakage; stable tensor/member ordering; deterministic seeds; missing-data behavior; and a practical full-year compute/storage estimate. Failure of any item rejects this lane before scoring.

If implementation Phase 0 passes, run the frozen full-year 2024 CV once and evaluate every unchanged SI-4 promotion gate together: event POD >= baseline +0.05 absolute; FAR no worse; Brier no worse; AUC >= baseline-0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline-0.01; regime safety; gust non-inferiority.

Any failed gate => REJECTED, no rescue tuning and no 2025 exposure.

SWEX 600.034 remains independent physics validation only and is not a predictor for this candidate.

Production remains **NO PROMOTION**.