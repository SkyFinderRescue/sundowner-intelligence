# SI-4 Primary-Source Literature / Open-Source Architecture Review

Date: 2026-08-28
Status: RESEARCH ONLY — no 2025 exposure, no production change

## Purpose

The 2024 development record now rejects a large family of incremental coarse-HRRR pressure-level proxy adjustments. This review therefore asks a narrower question: **is there a materially different, independently supported forecast architecture that has not already been tested in SI-4 and is practical to evaluate without touching the frozen 2025 holdout?**

## Primary-source findings

### 1. Terrain-resolving microscale dynamics are materially different from the rejected coarse-profile proxy family

Janiszeski & Crippa (2025), *JGR: Atmospheres*, DOI 10.1029/2024JD042972, used realistically forced multiscale WRF with high-resolution terrain and an inner ~150-m domain for SWEX Sundowner cases. Their results emphasize explicit interaction among summit-level stability, mountain waves, hydraulic-jump/critical-layer behavior, turbulence, the coastal adiabatic layer, and fine terrain. The paper reports that the highest-resolution domain most realistically reproduced event structure and provides WRF namelists/processing code (Zenodo DOI 10.5281/zenodo.14736178).

This is not equivalent to adding another scalar 850/700/500-mb proxy to HRRR. It is a different model architecture because the terrain/ABL response is explicitly resolved rather than inferred from coarse predictors.

Evidence:
- https://doi.org/10.1029/2024JD042972
- https://doi.org/10.5281/zenodo.14736178

### 2. Simple mechanical WindNinja downscaling is not sufficient by itself for the high-wind downslope problem

Seto et al. (2025), *Weather and Forecasting*, DOI 10.1175/WAF-D-24-0013.1, evaluated HRRR-driven WindNinja during six Southern California Santa Ana events. WindNinja improved overall sustained-wind accuracy by about 13% and improved a majority of stations, but skill degraded at stronger observed winds and lee-slope canyon biases could worsen. The authors identify the lack of thermal/mountain-wave dynamics in the mass-conserving solver as a key limitation for downslope windstorms.

Decision implication: do **not** treat plain WindNinja as a new SI-4 promotion candidate. It can be retained as a terrain diagnostic/reference, but the published evidence does not justify expecting it to solve the measured event-recall problem while preserving high-wind skill.

Evidence / open source:
- https://doi.org/10.1175/WAF-D-24-0013.1
- https://github.com/firelab/windninja
- https://github.com/iSnobal/katana (example HRRR-to-WindNinja automation)

### 3. Analog Ensemble is a genuinely different, proven probabilistic post-processing architecture

Delle Monache et al. (2013), *Monthly Weather Review*, DOI 10.1175/MWR-D-12-00281.1, introduced Analog Ensemble (AnEn) probabilistic post-processing using historical NWP forecast states and verifying observations. The method has a substantial literature for 10-m wind prediction, including complex-terrain and extreme-wind extensions, and is designed to correct systematic model error while returning an empirical predictive distribution rather than another deterministic coefficient tweak.

Open-source Parallel Analog Ensemble (PAnEn / RAnEn / CAnEn) provides an auditable implementation path:
- https://github.com/uga-gaim/AnalogEnsemble
- Zenodo DOI 10.5281/zenodo.3384321

Additional primary literature:
- Delle Monache et al. (2013): https://doi.org/10.1175/MWR-D-12-00281.1
- Alessandrini et al. (2019), improved Analog Ensemble wind-speed forecasts: https://doi.org/10.1175/MWR-D-19-0006.1
- Yang et al. (2018), analog technique for storm wind speed: https://doi.org/10.1175/MWR-D-17-0198.1
- Vannitsem et al. (2021), statistical post-processing review: https://doi.org/10.1175/BAMS-D-19-0308.1

This is materially different from every rejected SI-4 candidate to date: it changes the forecast architecture from hand-designed additive physics adjustments to **historical forecast-state similarity + empirical conditional outcome distributions**.

### 4. Operational Southern California systems support calibrated/model-guidance approaches rather than one raw model field

The Santa Ana Wildfire Threat Index operational framework combines calibrated model weather guidance with fuel state and climatological context for fire-potential categorization. It is not a direct Sundowner probability benchmark and fire/fuel information must remain outcome-only/outside our meteorological occurrence target, but it reinforces the operational use of calibrated guidance rather than raw deterministic model output.

Evidence:
- Rolinski et al. (2016), SAWTI: https://doi.org/10.1175/WAF-D-15-0141.1
- 2026 California Fire Weather Annual Operating Plan (NWS): https://www.weather.gov/media/wrh/cafw/2026_CA_FIRE_AOP.pdf

## Architecture decision

Two genuinely different paths survive the review:

1. **Terrain-resolving WRF/LES (research reference / longer-term path).** Strongest direct physics support for Sundowner spatial structure, but expensive and not currently backed by a leakage-safe full-2024 fixed-F24 archive at ~150 m. Do not launch an underpowered case-study-only promotion test that would overfit SWEX/famous events.

2. **Terrain/regime-aware Analog Ensemble (immediate 2024-only candidate).** This can be evaluated now using the existing archived issuance-time HRRR predictor state and independent verifying observations without altering the underlying NWP, without inventing probabilities, and without exposing 2025 during development.

The second path is therefore authorized for a **single predeclared 2024 chronological-development experiment**. This authorization is not evidence that the candidate will pass.

## Frozen 2024-only candidate: `terrain_regime_analog_ensemble_v1`

### Inputs allowed at issuance time

Use existing archived fixed-F24 HRRR predictors already admitted to SI-4, with no new future observations:
- zone/station static terrain identity/orientation;
- forecast wind speed/direction and cross-barrier components;
- pressure-gradient fields already available at issuance;
- ridge-layer stability / profile diagnostics already calculated at issuance;
- marine-resistance diagnostics only where the issuance-time value genuinely exists;
- regime/season/hour as forecast-context metadata.

Do not use verifying wind, later-cycle observations, fire occurrence, SWEX outcome labels, or any 2025 information as analog predictors.

### Chronological anti-leakage design

For every 2024 validation issuance, its analog library may contain only records whose verifying valid time is strictly earlier than the candidate issuance time. No random CV and no use of later-2024 observations to forecast earlier-2024 cases.

Use expanding-window chronological folds. If a fold lacks the predeclared minimum analog-library size, return the SI-3/SI-4 baseline unchanged rather than lowering the minimum post hoc.

### Outputs

For each zone/valid time, derive from the selected historical analog outcomes:
- empirical Sundowner occurrence probability;
- empirical gust median/mean and quantiles where sample size is adequate;
- analog sample count/effective sample size;
- analog-distance diagnostic.

Missing analog evidence remains missing/fallback. No synthetic probabilities outside the empirical/calibrated construction.

### Predictor weights / hyperparameters

Weights, distance metric, neighbor counts and minimum sample count must be selected inside 2024 chronological development only. Candidate selection must optimize a predeclared joint criterion dominated by event POD and Brier while enforcing the existing safety constraints; it may not optimize directly against any 2025 result.

### Frozen development gates before any 2025 exposure

The candidate advances only if the complete 2024 chronological CV satisfies all existing SI-4 gates:
- event POD >= baseline +0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety passes;
- gust MAE/RMSE non-inferior and bias non-inferior.

If any gate fails, reject `terrain_regime_analog_ensemble_v1` and do not expose it to 2025. No rescue tuning on 2025 is allowed.

## Explicitly rejected shortcuts

- Do not create another near-duplicate scalar HRRR pressure-level proxy candidate.
- Do not promote plain WindNinja based on its average improvement; published high-wind/lee-slope limitations are directly relevant to the target hazard.
- Do not train a black-box ML model on 2024+2025 together.
- Do not use SWEX IOP membership as a predictor or assume non-IOP periods are negatives.
- Do not claim WRF-LES operational superiority from two SWEX cases.

## SWEX dependency

NCAR/EOL final-QC profiler dataset 600.034 remains pending. The already accepted order must not be duplicated. If delivered, it remains independent evidence for profile/ABL mechanisms and must not be folded into outcome labels in a leakage-producing way.

## Production decision

**NO PROMOTION.** SI-3.1 on `main` remains the verified production baseline and PR #6 remains draft/unmerged. This review only authorizes a materially different 2024-only development experiment.