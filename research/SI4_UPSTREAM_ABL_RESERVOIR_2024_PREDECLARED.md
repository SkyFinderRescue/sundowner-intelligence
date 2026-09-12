# SI-4 Upstream ABL Reservoir v1 — 2024-Only Predeclaration

Status: **RESEARCH ONLY — 2025 FORBIDDEN DURING DEVELOPMENT**

Candidate: `upstream_abl_reservoir_v1`

This document predeclares a genuinely different physical hypothesis before any candidate scoring. It does not reopen or alter the rejected `upstream_thermal_subsidence_v1`, GOES marine-layer, HRRR-cycle, transition/onset, inversion-coupling, coastal-jet, terrain/gust, or western surface-coupling candidates. It does not authorize any change to `main`, PR #6, production coefficients, thresholds, or the frozen 2025 holdout.

## Independent physical basis

The hypothesis is that part of Sundowner onset/intensity depends on a **low-level upstream continental boundary-layer reservoir and its contrast with the cool/stable coastal boundary layer**, rather than only on the free-tropospheric 850/700/500-mb thermal/subsidence structure already tested and rejected.

Primary-source basis:

- Carvalho et al. (2024), *Bulletin of the American Meteorological Society*, DOI `10.1175/BAMS-D-22-0171.1`: SWEX describes Sundowner spatiotemporal variability as an interaction between the dry continental ABL north of the Santa Ynez Mountains and the cool, stable marine ABL south of the range; the campaign specifically targeted ABL evolution, winds, and thermodynamic structure on both sides of the mountains.
- Carvalho et al. (2020), *Monthly Weather Review*, DOI `10.1175/MWR-D-19-0207.1`: the SWEX pilot identified boundary-layer stratification, lee-jet intermittency, MBL influence on jet elevation, and upstream/downstream mountain-flow interaction as controlling mechanisms.
- Smith et al. / dynamically downscaled Sundowner climatology (JAMC 2018, DOI `10.1175/JAMC-D-17-0162.1`) discusses a plausible mechanism in which northwesterly flow entering the Santa Ynez Valley is modified by local sea-breeze transport and afternoon surface heating before crossing the ridge.

These mechanisms are physically distinct from the already-rejected `upstream_thermal_subsidence_v1`, which was frozen to 850/700/500-mb temperature, geopotential height, wind, and VVEL at five points.

## Forecast-information rule

All predictors must come from archived **NOAA HRRR native forecast fields available at issuance time**. Development is restricted to calendar-year 2024 valid times. Future verifying observations remain label-only. Fire association remains outcome-only. Missing values remain null and may not be imputed with observations or hindsight products.

Initial forecast lead remains **fixed F24**. No 2025 forecast, observation, candidate score, event miss, or hard-negative row may be inspected to choose variables, transforms, coefficients, thresholds, cases, or archive geometry.

## Frozen physical geometry for the first archive smoke

Use the same already-audited geographic anchors where applicable:

- `santa_ynez_valley`: 34.665, -120.015
- `santa_barbara_lee`: 34.426, -119.840
- `western_channel`: 34.350, -120.400

The first smoke test may add one eastern upstream point only if required to represent the V-shaped Santa Ynez/San Rafael geometry, but its coordinates must be frozen from geography/physics before any observation or outcome scoring. Archive availability may change extraction plumbing only; it may not change case selection using outcomes.

## Predeclared field families

The smoke extractor should resolve the exact HRRR GRIB labels without looking at outcomes for these forecast quantities:

1. 2-m temperature at upstream valley, lee, and channel points.
2. 2-m dewpoint (or native 2-m RH if dewpoint is unavailable) at those same points.
3. Planetary boundary-layer height / mixed-layer depth at the same points when present in the native HRRR surface product.
4. 10-m wind vector only as a physical consistency diagnostic; it is not a new target or verifying observation.
5. Surface or mean-sea-level pressure may be retained for provenance/consistency checks but may not duplicate or refit the already-frozen pressure-gradient model block.

If a native field is unavailable for the full 2024 archive, it stays missing or the corresponding transform is dropped for archive-availability reasons before outcome scoring. Do not substitute a non-authoritative/reanalysis value simply to fill gaps.

## Predeclared transforms

Only physically interpretable low-level ABL contrasts are eligible in v1:

- `valley_lee_temp_contrast = T2m(santa_ynez_valley) - T2m(santa_barbara_lee)`
- `valley_channel_temp_contrast = T2m(santa_ynez_valley) - T2m(western_channel)`
- `valley_dewpoint_depression = T2m - Td2m` at the upstream valley
- `lee_dewpoint_depression = T2m - Td2m` at Santa Barbara lee
- `valley_lee_dryness_contrast = valley_dewpoint_depression - lee_dewpoint_depression`
- `valley_pblh` when native PBL height is available
- `valley_lee_pblh_contrast = PBLH(valley) - PBLH(lee)` when both are available
- `valley_channel_pblh_contrast = PBLH(valley) - PBLH(channel)` when both are available

No transform may use future observed wind, temperature, humidity, fire occurrence, known event identity, or 2025 residuals.

## Candidate role

`upstream_abl_reservoir_v1` is a **research-only probability modifier** intended to test whether an issuance-time deep/dry/warm upstream ABL relative to the coastal layer can recover otherwise missed 2024 events without reintroducing the false alarms removed by SI-4.

The modifier must be monotonic and bounded. It may increase probability only when the low-level ABL reservoir signal is physically supportive; it may not invent an event in the absence of the existing SI-4 pressure/wave support. Exact scaling/coefficients must be fit using chronological 2024 development folds only and frozen before any independent score.

## Chronological development design

- Development/scoring year: **2024 only**.
- Use chronological folds; no random mixing across time.
- Use the same independent HADS/RAWS verifying observations and event definitions already established for SI-4 2024 development.
- Hard-negative definitions remain unchanged.
- Non-event time is not automatically a matched negative if independent observation coverage is absent.
- No famous-event/manual-case coefficient adjustment.

## Frozen promotion gates before any 2025 exposure

Relative to the existing 2024 SI-4 development baseline, the candidate must satisfy **every** gate:

1. Event POD/recall improves by at least **+0.05 absolute**.
2. Event FAR is **no worse**.
3. Overall Brier is **no worse**.
4. Overall AUC is at least baseline minus **0.005**.
5. Hard-negative negative-only Brier is **no worse**.
6. Hard-negative FPR at the frozen/matched operating threshold is **no worse**.
7. Spatial precision is at least baseline minus **0.01**.
8. No material regime safety failure; a recall gain in one regime may not be purchased by a clearly adverse degradation in another.
9. Gust MAE/RMSE/bias are non-inferior; this probability candidate may not silently change the frozen terrain/gust correction.
10. Missing-data behavior remains fail-closed/neutral and does not manufacture supportive evidence.

If any gate fails, reject `upstream_abl_reservoir_v1` and **do not score it on 2025**. If all gates pass, freeze archive geometry, transforms, coefficients, thresholds, and missing-data behavior before exactly one score-only 2025 evaluation.

## Infrastructure vs science

NOAA archive 4xx/5xx responses, timeouts, missing GRIB members, range-index failures, and runner failures are infrastructure evidence only. Use bounded retry and plumbing fixes without changing the hypothesis or gates. Do not alter coefficients or case selection to clear infrastructure.

## Current relationship to promotion

Current SI-4 gate status remains **NO PROMOTION**. This predeclaration creates a new independent-physics development lane while the accepted NCAR/EOL SWEX final-QC profiler order remains pending; it does not itself constitute model evidence or a promotion milestone.
