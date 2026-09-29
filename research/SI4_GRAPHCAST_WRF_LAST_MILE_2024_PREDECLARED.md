# SI-4 GraphCast → WRF Last-Mile Downscaling — 2024-Only Predeclaration

Status: **RESEARCH ONLY — PHASE 0 FEASIBILITY — DO NOT LOAD IN PRODUCTION**

## Why this lane exists

The completed 2024 SI-4 evidence rejects further near-duplicate coarse HRRR pressure-level proxy searches. This lane is materially different: it changes the forecast architecture from direct coarse-model post-processing to a hybrid machine-learning global forecast plus terrain-resolving dynamical downscaling.

Primary literature basis: Fovell et al. (2025), *Hybrid Numerical Weather Prediction: Downscaling GraphCast AI Forecasts for Downslope Windstorms*, Weather and Forecasting 40(1), 187–206, DOI 10.1175/WAF-D-24-0097.1. In the Marshall Fire downslope-windstorm case, GraphCast-forced WRF last-mile simulations were competitive with operational-model-forced WRF and the GraphCast/ECMWF-operational configuration produced the highest score among the non-reanalysis configurations studied. The paper also publishes the WRF/GraphCast preprocessing approach and cites open WRF and ECMWF ai-models tooling.

This is **not** evidence that the architecture will pass Santa Barbara Sundowner gates; the published result is a case study and explicitly calls for validation on additional downslope-wind cases.

## Frozen architecture concept

Candidate name: `graphcast_wrf_last_mile_v1`.

1. Use only atmospheric state information that was operationally available at the forecast issuance time.
2. Generate a GraphCast forecast from a reproducible, issuance-safe operational initialization source.
3. At a predeclared lead before the local threat window, initialize a terrain-resolving WRF last-mile domain covering the Santa Ynez Mountains and Santa Barbara south coast.
4. Use the resulting WRF fields as forecast predictors; never use verifying observations, ERA5/reanalysis, fire outcomes, or later-cycle model information as predictors.
5. Maintain the existing SI-4 occurrence definition, event construction, threshold, baseline, frozen metrics, and gate logic.

## Phase 0: required before any 2024 outcome scoring

No occurrence labels or event scores may be inspected during Phase 0. Demonstrate all of the following first:

- exact identification of an operationally reproducible 2024 initialization source for GraphCast that existed by each issuance time;
- archived availability sufficient for chronological 2024 reconstruction without silent reanalysis substitution;
- deterministic GraphCast preprocessing and version pinning;
- deterministic WRF/WPS configuration and topography/land-surface inputs;
- an exact-F24-equivalent forecast timing convention compatible with the frozen SI-4 verification design;
- no use of future observations, future model cycles, ERA5/reanalysis, or hindsight-selected source substitutions;
- successful reconstruction of a small, outcome-blind set of 2024 dates selected by calendar rule rather than event status;
- documented compute/runtime feasibility for a complete 2024 chronological experiment.

If a valid 2024 GraphCast initialization archive cannot be reproduced without reanalysis or future information, this lane is rejected before scoring.

## Frozen 2024 science test, only if Phase 0 passes

The complete 2024 experiment must be chronological and must not use 2025 for training, tuning, architecture choice, calibration, member selection, source selection, or threshold choice. No event-based cherry-picking is allowed.

The production baseline and all existing gates remain unchanged:

- event POD >= baseline + 0.05 absolute;
- event FAR no worse than baseline;
- Brier no worse than baseline;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety must pass;
- gust non-inferiority must pass.

Failure of any gate = **REJECTED / NO 2025 EXPOSURE**.

No threshold rescue, coefficient retuning after test inspection, candidate-family switching after outcomes, or selective date/member pruning is permitted.

## SWEX role

SWEX profiler/lidar/radiosonde observations may be used only as independent physics validation or outcome-blind diagnostic evidence. They may not become future-observation predictors for a forecast issued before those observations existed.

## Production isolation

- Preserve SI-3.1 on `main`.
- Keep PR #6 draft and unmerged.
- Do not merge, release, or alter production until an independently passing candidate clears every frozen gate and subsequent production/release/browser QA passes.

## Promotion state

**NO PROMOTION.** This document authorizes feasibility work only.