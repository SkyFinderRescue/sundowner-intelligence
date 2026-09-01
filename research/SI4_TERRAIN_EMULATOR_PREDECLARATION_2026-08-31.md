# SI-4 terrain-emulator feasibility predeclaration — 2026-08-31

Status: RESEARCH ONLY. NO PRODUCTION CHANGE. NO 2025 EXPOSURE AUTHORIZED.

## Why this is materially different

This lane is not another coarse HRRR pressure-level proxy and does not retune any rejected SI-4 candidate. It tests a terrain-aware learned downscaling architecture: use a high-resolution Sundowner-specific WRF climatology as a physics teacher, then learn the mapping from coarser issuance-time operational fields plus fixed high-resolution terrain descriptors to local wind fields relevant to Sundowner occurrence.

Independent published evidence supports the architecture class:

- Jones et al. produced a 32-year, hourly, 1-km WRF downscaled climatology over Santa Barbara County. A public Dryad archive (DOI 10.25349/D9S90S) exposes selected Sundowner cases and documents the full climatology; the full dataset is available from the authors/institution on request.
- Dupuy et al. (2023, Nonlinear Processes in Geophysics, DOI 10.5194/npg-30-553-2023) trained a U-Net-style CNN to downscale 9-km WRF surface winds to 1 km using high-resolution WRF as the target and static terrain/slope/aspect predictors. Reported wind-speed MAE fell from 1.02 to 0.69 m/s and direction MAE from 25.9° to 15.5°.
- Le Toumelin et al. (2024, Nonlinear Processes in Geophysics, DOI 10.5194/npg-31-75-2024) demonstrated a modular deep-learning correction plus terrain downscaling approach for mountain winds and released the implementation publicly on GitHub/Zenodo (louisletoumelin/neural_network_and_devine; Zenodo 10.5281/zenodo.10594273).
- SWEX observational papers show that 1-km WRF captures broad Sundowner spatial patterns but misses important temporal variability in highly turbulent lee-slope regions, motivating terrain-aware downscaling while requiring independent profiler/lidar validation before occurrence scoring.

## Phase 0 — acquisition and reproducibility only

No occurrence labels, event outcomes, 2024 gate metrics, fire association, or 2025 data may be inspected or used in this phase.

1. Verify exact accessible contents/checksums/licensing of the public Dryad Sundowner WRF cases.
2. Determine whether the full 32-year climatology can be obtained reproducibly from the authors/institution without creating an uncontrolled data dependency. Do not imply that the currently public 7.4-GB subset is the full 32-year archive.
3. Reproduce a minimal open-source terrain-downscaling baseline using only public code/data or an internally documented equivalent.
4. Define fixed static terrain inputs before outcome scoring: elevation, slope, aspect, land/sea mask, and coarse-to-fine terrain difference. No hand-picked post-outcome terrain masks.
5. Define issuance-time dynamic inputs before outcome scoring. Only predictors available at the exact operational issuance time are allowed. Reanalysis/ERA-based teacher data may be training targets for historical pre-2024 physics emulation but may never be used as 2024 or 2025 forecast predictors.
6. Validate the emulator first against withheld high-resolution WRF fields and, independently, against SWEX 2022 profiler/lidar/ceilometer/radiosonde structure where variables overlap.

If the archive or implementation cannot be made reproducible, this lane stops before any SI occurrence scoring.

## Frozen science contract if Phase 0 passes

Any later 2024-only experiment must be chronologically isolated and preserve all existing SI-4 promotion gates unchanged:

- event POD >= baseline +0.05 absolute;
- FAR no worse;
- Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier and FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Additional rules remain unchanged: no 2025 tuning or exposure before an all-gates 2024 pass; no threshold rescue; no future-observation predictors; fire association outcome-only; missing stays missing.

## Promotion state

NO PROMOTION. SI-3.1 on `main` remains production. PR #6 remains draft/open/unmerged. This isolated branch is a feasibility lane only and must not be merged into production.