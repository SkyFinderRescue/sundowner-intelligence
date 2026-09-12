# SI-4 San Rafael Orographic Blocking v1 — 2024-Only Predeclaration

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — 2025 FORBIDDEN**

Candidate: `srm_orographic_blocking_v1`

This document predeclares a materially different physical hypothesis before any candidate scoring. It does not reopen or alter the rejected upstream thermal/subsidence, upstream ABL reservoir, Richardson/wave-breaking, lee-jet vertical phase, coastal-jet, coastal adiabatic lift-off, channel-eddy/marine re-entry, mesoscale pressure-transition, GOES, HRRR-cycle, transition-onset, inversion-coupling, terrain/gust, or western surface-coupling candidates. It does not authorize any change to `main`, PR #6, production coefficients, thresholds, or the frozen 2025 holdout.

## Independent primary-source basis

Duine et al. (2021), *Journal of Geophysical Research: Atmospheres*, DOI `10.1029/2020JD033791`, used semi-idealized WRF terrain-removal experiments to isolate the role of the San Rafael Mountains (SRM) upstream of the Santa Ynez Mountains (SYM). The study found that late-afternoon lee-slope onset was most strongly tied to northeasterly lower-tropospheric flow that first encountered the substantially higher SRM. Progressive removal of the SRM produced much stronger lee winds throughout the day and removed much of the characteristic late-afternoon onset. The paper also found that the SRM effect is direction/regime dependent and is much weaker when approaching flow reaches the SYM through the relatively open northwestern valley geometry.

The paper therefore supports testing a **directional upstream-orography interaction** rather than another generic pressure, thermal, ABL-depth, stability, or wave-breaking term.

## Why this is distinct from prior rejected candidates

Previously rejected upstream candidates asked whether absolute free-tropospheric thermal/subsidence structure or low-level ABL reservoir contrasts added skill. The rejected Richardson candidate asked whether coarse-layer shear/stability susceptibility added skill. The rejected mesoscale pressure-transition candidate tested timing in pressure-gradient evolution.

` srm_orographic_blocking_v1 ` instead asks whether the existing issuance-time forecast contains useful information in the **spatially coherent direction, speed deficit, and turning of flow as it approaches the higher SRM and then the Santa Ynez Valley**. It is a geometry-conditioned transport/blocking hypothesis. No new feature may be selected from 2025 misses.

## Data and leakage rules

- Development/scoring year: **2024 only**.
- Forecast lead: exact **F24** only.
- Forecast source: archived NOAA HRRR forecast fields available at issuance time.
- Reuse the immutable 2024 upstream archive wherever possible; do not reacquire 2025.
- Future verifying observations are label-only.
- Fire association remains outcome-only.
- Missing forecast values remain null; no observation/reanalysis/climatology fill is allowed.
- No candidate coefficient, threshold, transform, case, point, or direction window may be selected using 2025 data.
- Archive 4xx/5xx, timeouts, missing members, and runner failures are infrastructure evidence only and may change plumbing, not science.

## Frozen geographic anchors

Use the already-audited upstream archive anchors:

- `cuyama_interior`: 34.950, -119.680
- `santa_ynez_valley`: 34.665, -120.015
- `santa_barbara_lee`: 34.426, -119.840 only as an existing downstream consistency anchor; it may not supply verifying observations.

No point may be added or moved after outcome scoring. A future archive-smoke step may add a single SRM crest point only if the existing archive is shown, before scoring, to be physically incapable of representing the documented higher-barrier interaction. If added, its coordinates and required fields must be frozen from geography/physics before any labels are loaded.

## Frozen forecast fields and levels

Primary candidate inputs are the already archived issuance-time wind vectors at **850 and 700 mb** at `cuyama_interior` and `santa_ynez_valley`, plus already archived temperature/geopotential fields only where required for an independently defined stability consistency check. No new observed surface wind or post-event trajectory product may enter the predictor.

## Predeclared directional/orographic transforms

Meteorological wind direction is the direction **from which** the wind blows. All angular differences use circular arithmetic.

1. `ne_approach_850`: cosine directional alignment of the 850-mb wind-from direction at `cuyama_interior` with 045 degrees, clipped at zero so non-NE approach contributes no positive support.
2. `ne_approach_700`: the same alignment at 700 mb.
3. `ne_vertical_coherence`: geometric mean of `ne_approach_850` and `ne_approach_700`; null if either required wind is missing.
4. `upstream_speed_deficit_850`: when `ne_vertical_coherence > 0`, positive part of `speed850(cuyama_interior) - speed850(santa_ynez_valley)`; otherwise zero. This is a forecast blocking/deflection proxy, not an observed blockage measurement.
5. `upstream_speed_deficit_700`: analogous 700-mb quantity.
6. `cuyama_to_valley_turning_850`: absolute circular direction change between Cuyama and Santa Ynez Valley at 850 mb, capped at 90 degrees and scaled to 0–1.
7. `cuyama_to_valley_turning_700`: analogous 700-mb quantity.
8. `srm_interaction_index`: `ne_vertical_coherence * mean(zscore_train_only(upstream_speed_deficit_850), zscore_train_only(upstream_speed_deficit_700))`, with z-score location/scale estimated inside each chronological training fold only and the positive part retained.

No alternative direction center, angular width, pressure level, transform, cap, or interaction may be chosen after validation scores are seen. The 045-degree direction is fixed from the primary-source eastern-regime northeasterly-flow mechanism, not optimized from data.

## Candidate role

The candidate is probability-only. It may add support only when the existing SI-4 predictor already indicates a physically plausible Sundowner environment and the forecast flow is coherently northeasterly upstream. It must not create events from a weak base state, must not change the frozen gust correction, and must remain neutral when required directional evidence is missing.

Because Duine et al. found the SRM influence to be strongest in the eastern regime, the candidate may modify only eastern-regime rows in v1. Western and hybrid rows remain numerically identical to baseline. This regime restriction is fixed before scoring and is itself subject to the regime-safety gate.

Within each chronological training fold, fit the same regularized logistic model used by the established SI-4 2024 development evaluator with the candidate features appended only for eastern rows. Threshold selection remains training-fold-only. Validation labels never select coefficients or thresholds.

## Chronological development folds

Use the established SI-4 2024 folds:

- train through 2024-04-30, validate May–June;
- train through 2024-06-30, validate July–September;
- train through 2024-09-30, validate October–December.

Do not inspect individual frozen 2025 misses, false alarms, residuals, or regime rows during development.

## Frozen promotion gates before any 2025 exposure

Relative to the established SI-4 2024 chronological-CV baseline, **every** gate must pass:

1. Event POD/recall >= baseline **+0.05 absolute**.
2. Event FAR <= baseline.
3. Overall Brier <= baseline.
4. Overall AUC >= baseline AUC - **0.005**.
5. Hard-negative Brier <= baseline.
6. Hard-negative FPR <= baseline.
7. Spatial/zone precision >= baseline - **0.01**.
8. Regime safety: western and hybrid outputs must remain unchanged by construction; eastern Brier may not worsen by more than 2% relative and eastern AUC may not fall by more than 0.01 where both classes permit calculation.
9. Gust MAE/RMSE/bias must be numerically identical to baseline because the candidate is forbidden from changing gust output.
10. Required candidate-feature coverage among otherwise eligible eastern rows >= **90%**; missingness may not create apparent skill by selectively dropping difficult cases.

If any gate fails, reject `srm_orographic_blocking_v1` in 2024 and **do not score it on 2025**. Passing the development gate would authorize only one frozen score-only 2025 evaluation after all transforms, coefficients, thresholds, missing-data behavior, and archive provenance are frozen.

## Production rule

Current SI-4 status remains **NO PROMOTION**. PR #6 remains draft/unmerged and SI-3.1 on `main` remains the verified production baseline. This predeclaration is research plumbing only and is not evidence of improved accuracy.
