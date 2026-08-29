# SI-4 Primary-Source Literature / Open-Source Architecture Review

Date: 2026-08-28
Status: **RESEARCH ONLY** — no 2025 exposure, no production change

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
- https://github.com/iSnobal/katana

### 3. Analog Ensemble is a genuinely different, proven probabilistic post-processing architecture

Delle Monache et al. (2013), *Monthly Weather Review*, DOI 10.1175/MWR-D-12-00281.1, introduced Analog Ensemble (AnEn) probabilistic post-processing using historical NWP forecast states and verifying observations. The method has a substantial literature for 10-m wind prediction, including complex-terrain and extreme-wind extensions, and is designed to correct systematic model error while returning an empirical predictive distribution rather than another deterministic coefficient tweak.

Open-source Parallel Analog Ensemble (PAnEn / RAnEn / CAnEn) provides an auditable implementation path:
- https://github.com/uga-gaim/AnalogEnsemble
- Zenodo DOI 10.5281/zenodo.3384321

Additional primary literature:
- Delle Monache et al. (2013): https://doi.org/10.1175/MWR-D-12-00281.1
- Alessandrini et al. (2019): https://doi.org/10.1175/MWR-D-19-0006.1
- Yang et al. (2018): https://doi.org/10.1175/MWR-D-17-0198.1
- Vannitsem et al. (2021): https://doi.org/10.1175/BAMS-D-19-0308.1

This is materially different from every rejected SI-4 candidate to date: it changes the forecast architecture from hand-designed additive physics adjustments to **historical forecast-state similarity + empirical conditional outcome distributions**.

### 4. Operational Southern California systems support calibrated/model-guidance approaches rather than one raw model field

The Santa Ana Wildfire Threat Index operational framework combines calibrated model weather guidance with fuel state and climatological context for fire-potential categorization. It is not a direct Sundowner probability benchmark and fire/fuel information must remain outcome-only/outside our meteorological occurrence target, but it reinforces the operational use of calibrated guidance rather than raw deterministic model output.

Evidence:
- Rolinski et al. (2016), SAWTI: https://doi.org/10.1175/WAF-D-15-0141.1
- 2026 California Fire Weather Annual Operating Plan: https://www.weather.gov/media/wrh/cafw/2026_CA_FIRE_AOP.pdf

### 5. Local nonlinear post-processing has independent evidence specifically for unresolved complex-terrain wind and nonconvective high-wind hazards

A second literature pass after the Analog/NBM experiments identified a materially different architecture that is not another scalar HRRR physics proxy and is not nearest-neighbor Analog Ensemble.

Steeneveld et al. (2021), *Weather and Forecasting*, DOI 10.1175/WAF-D-21-0054.1, used an artificial neural network to post-process operational WRF wind forecasts in a 1–2-km-wide unresolved valley. Inputs were forecast-time wind and near-surface stability; the study reported directional accuracy improving from 56% to 79%, including improvement across stability classes. The relevance to SI-4 is architectural: nonlinear local mapping can learn terrain/stability-conditioned surface response that a coarser NWP grid does not resolve.

Brothers et al. (2022/2023), *Weather and Forecasting*, DOI 10.1175/WAF-D-21-0215.1, developed random-forest classifiers for nonconvective high winds in complex terrain in southeast Wyoming. Verification over two winters found operational benefit relative to existing forecast tools, including localized gap-wind and downslope/high-wind settings. Again, this supports the architecture, not transfer of Wyoming thresholds to Santa Barbara.

Schulz & Lerch et al. (2022), *Monthly Weather Review*, DOI 10.1175/MWR-D-21-0150.1, systematically compared statistical and machine-learning ensemble post-processing methods for wind gusts. All tested post-processors calibrated raw ensemble errors; locally adaptive neural approaches using additional meteorological predictors produced the strongest skill and learned physically consistent diurnal/PBL-transition behavior. This is directly relevant to the SI-4 recall problem because the measured misses cluster around transition/coupling behavior while simple additive physics candidates have repeatedly failed.

Additional downslope-wind predictability evidence also argues for probabilistic/nonlinear treatment rather than one deterministic correction. Metz & Durran (2023), *Weather and Forecasting*, DOI 10.1175/WAF-D-22-0135.1, found regime-dependent predictability in a high-resolution ensemble and evaluated downslope windstorms probabilistically with CRPS; earlier ensemble work showed very large intensity spread from small initial-condition differences. A local nonlinear post-processor can therefore be tested as a mapping from the existing issuance-time forecast state to local event/gust distributions without pretending the coarse deterministic state is exact.

Evidence:
- https://doi.org/10.1175/WAF-D-21-0054.1
- https://doi.org/10.1175/WAF-D-21-0215.1
- https://doi.org/10.1175/MWR-D-21-0150.1
- https://doi.org/10.1175/WAF-D-22-0135.1

Decision implication: a **strictly 2024-only, chronological, local nonlinear post-processing experiment** is scientifically justified. It must use only issuance-time meteorological predictors and static terrain/zone metadata, with observations used only as historical training targets after they are available. It must not use 2025 for feature selection, hyperparameters, thresholds, or early stopping.

## Architecture decision

Three genuinely different paths survive the literature review as research concepts:

1. **Terrain-resolving WRF/LES (research reference / longer-term path).** Strongest direct physics support for Sundowner spatial structure, but expensive and not currently backed by a leakage-safe full-2024 fixed-F24 archive at ~150 m. Do not launch an underpowered case-study-only promotion test that would overfit SWEX/famous events.

2. **Terrain/regime-aware Analog Ensemble.** Materially different and was appropriately tested under the frozen 2024 chronology, but its predeclared safety gate did not fully pass; it remains rejected and must not be rescued with 2025 tuning.

3. **Local nonlinear complex-terrain post-processing (`local_nonlinear_terrain_postprocessor_v1`).** Supported by independent complex-terrain operational wind, nonconvective high-wind, and probabilistic wind-gust post-processing literature. This is authorized only as a new 2024-only chronological development experiment under the unchanged SI-4 gates.

The third path is **not** evidence of improvement yet. It is authorization to test a materially different architecture without using the frozen 2025 misses.

## Frozen 2024-only candidate: `local_nonlinear_terrain_postprocessor_v1`

The detailed predeclaration is persisted separately in `research/SI4_LOCAL_NONLINEAR_TERRAIN_POSTPROCESSOR_2024_PREDECLARED.md` before scoring.

Key restrictions:
- predictors must exist at forecast issuance time;
- no future observations as predictors;
- historical observations may enter training only after their valid time is strictly earlier than the forecast issuance being scored;
- no fire association predictor;
- missing remains missing or uses a predeclared fallback;
- no 2025 exposure unless every frozen 2024 gate passes;
- candidate event thresholds are selected within each 2024 chronological training fold only;
- no post-hoc threshold rescue.

## Explicitly rejected shortcuts

- Do not create another near-duplicate scalar HRRR pressure-level proxy candidate.
- Do not promote plain WindNinja based on its average improvement; published high-wind/lee-slope limitations are directly relevant to the target hazard.
- Do not rescue the rejected Analog Ensemble or NBM candidates with 2025 tuning.
- Do not train a black-box ML model on 2024+2025 together.
- Do not use SWEX IOP membership as a predictor or assume non-IOP periods are negatives.
- Do not claim WRF-LES operational superiority from two SWEX cases.

## SWEX dependency

NCAR/EOL final-QC profiler dataset 600.034 remains pending. The already accepted order must not be duplicated. If delivered, it remains independent evidence for profile/ABL mechanisms and must not be folded into outcome labels in a leakage-producing way.

## Production decision

**NO PROMOTION.** SI-3.1 on `main` remains the verified production baseline and PR #6 remains draft/unmerged. This review only authorizes materially different 2024-only development experiments; none may reach 2025 unless every frozen development gate passes.