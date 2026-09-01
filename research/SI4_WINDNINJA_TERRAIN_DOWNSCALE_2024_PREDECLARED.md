# SI-4 WindNinja terrain diagnostic downscaling — 2024-only predeclaration

Status: RESEARCH ONLY / PHASE 0 FEASIBILITY. Do not load in production. Do not expose 2025 outcomes.

## Why this is materially different

This candidate uses the USDA Forest Service WindNinja diagnostic mass-conserving terrain-flow solver to dynamically redistribute an issuance-time mesoscale forecast over substantially finer terrain. It is not another coarse HRRR pressure-level proxy, coefficient tweak, analog selector, or deterministic WRF re-run.

Direct Southern California evidence exists: Seto et al. (Weather and Forecasting, 2025, DOI 10.1175/WAF-D-24-0013.1) evaluated HRRR-driven WindNinja during six Santa Ana events, downscaling 3-km HRRR to 500-m grids. Mean wind-speed accuracy improved by about 13% and 71.6% of stations improved, but skill degraded at the strongest observed winds and at some wind-prone lee-canyon sites. That limitation is a mandatory safety concern, not a reason to retune around failures.

Open-source implementation: https://github.com/firelab/windninja

## Frozen Phase-0 questions

1. Can an exact-F24 2024 HRRR input archive required by WindNinja be reproduced without future-observation leakage?
2. Can WindNinja run deterministically and reproducibly for the Santa Barbara domain at <=500 m using fixed topography/roughness inputs and a version pinned before outcome scoring?
3. Does a small outcome-blind engineering sample show stable execution, complete spatial coverage, and no hidden use of verification-time observations?
4. Can outputs be aligned to the existing frozen SI-4 station/zone geometry without changing occurrence labels or thresholds?

No 2024 event scoring is authorized until all four feasibility questions pass and the configuration is frozen.

## Frozen science contract if Phase 0 passes

- Development/evaluation data: 2024 only, chronological CV exactly consistent with existing SI-4 development protocol.
- Forecast lead: exact fixed F24 only.
- Inputs: issuance-time operational HRRR fields required by WindNinja plus static terrain/land-surface descriptors only.
- WindNinja version, solver, horizontal resolution, DEM source/resolution, surface roughness treatment, domain, boundary treatment, interpolation and station/zone aggregation must be frozen before outcome scoring.
- No future observations, ERA5/reanalysis predictors, fire association predictors, verification-time surface observations, post-hoc member/case filtering, threshold rescue, or 2025 tuning.
- Missing remains missing.
- Fire association remains outcome-only and excluded from Sundowner occurrence training/prediction.

## Frozen promotion gates

A candidate can advance only if every existing gate passes simultaneously:

- event POD >= baseline +0.05 absolute;
- FAR no worse than baseline;
- Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety passes;
- gust performance is non-inferior.

Because published Santa Ana testing found degradation at high winds and some lee-canyon sites, the existing gust, hard-negative, spatial and regime gates are especially binding. No special exception or retuning is allowed.

## Decision rule

Failure of any frozen 2024 gate => REJECT, no 2025 exposure. Only an independently passing 2024 candidate may unlock the existing production/release/browser QA sequence. SI-3.1 on main remains untouched and PR #6 must remain draft/unmerged until all promotion requirements are met.
