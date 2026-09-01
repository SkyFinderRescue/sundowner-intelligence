# SI-4 Terrain-Resolving Multi-Physics Ensemble — 2024 Predeclaration

Status: **PREDECLARED / 2024-ONLY / NO PROMOTION AUTHORITY**

## Why this lane exists

The completed SI-4 evidence shows that repeated coarse HRRR pressure-level proxy additions do not satisfy the frozen all-gates contract. The corrected HREF initial-condition ensemble demonstrated that ensemble disagreement can materially raise event POD, but it failed FAR, hard-negative FPR, spatial precision, and regime safety. That result motivates testing a different source of forecast uncertainty rather than retuning the HREF lane.

A Sundowner-specific WRF sensitivity study (Duine et al., *Atmosphere*, 2019, doi:10.3390/atmos10030155) found that the horizontal extent of strong surface winds is sensitive to planetary-boundary-layer parameterization and surface roughness / land-surface treatment, with self-induced wave breaking and marine-layer erosion implicated. A later multiscale SWEX modeling study (Janiszeski & Crippa, JGR Atmospheres, 2025, doi:10.1029/2024JD042972) showed that realistically forced terrain-resolving WRF/LES captures hydraulic-jump, critical-layer, rotor, adiabatic-layer, and terrain-driven variability that are unresolved or misrepresented at coarser resolution.

This supports a **multi-physics terrain-resolving ensemble** as a materially different architecture: uncertainty comes from physically defensible boundary-layer / land-surface / roughness configurations at high terrain resolution, not merely from initial-condition perturbations or another coarse pressure-level diagnostic.

## Architecture label

`terrain_multiphysics_ensemble_v1`

## Hard separation from prior lanes

This candidate must not be implemented as:

- another HRRR pressure-level proxy;
- a retune of any rejected SI-4 feature;
- a threshold rescue of the HREF initial-condition ensemble;
- a single deterministic WRF nest with post-hoc correction;
- an ensemble whose members differ only by initial conditions.

The defining signal is **terrain-resolving physics-configuration spread and agreement**.

## Phase 0 — feasibility only

Before occurrence outcomes are scored, establish an auditable 2024 archive/reproduction path with:

1. issuance-time boundary/initial conditions available at the frozen forecast issuance and exact-F24 verification contract;
2. fixed terrain and domain geometry covering the existing Sundowner zones;
3. a small, literature-supported physics matrix frozen before event scoring;
4. reproducible member completion and deterministic member identity;
5. no ERA5, retrospective analysis, future observations, or outcome-derived member selection as predictors.

If a full-year 2024 run is not computationally/reproducibly feasible, stop this lane without science scoring.

## Frozen physics matrix rule

The physics matrix must be chosen from published Sundowner / complex-terrain evidence before looking at 2024 event metrics. It may vary only physically defensible PBL / surface-layer / land-surface / roughness treatments that are supported by the literature. The number of members and all configuration choices are frozen before chronological CV.

No member may be removed because it performs poorly on Sundowner outcomes. Technical failure handling must be outcome-blind and predeclared.

## Permitted predictors after Phase 0

Only issuance-time or model-predicted quantities are permitted, including:

- member-resolved near-surface wind/gust and direction;
- member-resolved ridge / lee-slope / coastal wind structure;
- member agreement, spread, upper quantiles, and exceedance fractions;
- member-resolved inversion / stability / critical-layer or rotor-related diagnostics where they are direct model outputs or deterministic transforms;
- fixed terrain descriptors.

Observed future winds, future profiler/lidar data, fire outcomes, and retrospective analyses remain labels/validation only.

## Role of SWEX

SWEX final-QC observations, including dataset 600.034 when acquired, may be used as **independent 2022 physics validation** of vertical structure, timing, rotor / lee-jet behavior, and model failure modes. They must not become predictors for 2024 or 2025 and must not be used to tune thresholds against the 2024 occurrence target.

## 2024 evaluation contract

If and only if Phase 0 passes, run the existing chronological 2024 CV / frozen holdout framework with no threshold cheating and no post-hoc member selection.

Promotion eligibility requires every existing gate:

- event POD >= baseline + 0.05 absolute;
- event FAR no worse than baseline;
- Brier no worse;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety pass;
- gust non-inferiority pass.

A single failed gate means **REJECT / NO 2025 EXPOSURE**.

## 2025 seal

2025 data remain sealed unless the independently executed 2024 candidate clears every frozen gate. No 2025 tuning, threshold selection, member pruning, calibration, or architecture changes are allowed.

## Production protection

SI-3.1 on `main` remains production. PR #6 must remain draft and unmerged. This predeclaration grants no authority to merge, alter production, or expose the candidate operationally.

## Decision rationale

This lane is authorized because it is directly supported by Sundowner-specific published sensitivity evidence and is materially different from the rejected coarse-proxy and HREF initial-condition-ensemble families. It is intended to test whether **physics uncertainty at terrain-resolving scale** can preserve the recall gain seen in ensemble guidance while avoiding the false-alarm and spatial-regime failures that blocked HREF promotion.
