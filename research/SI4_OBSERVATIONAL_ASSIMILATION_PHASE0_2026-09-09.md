# SI-4 observational-assimilation architecture review — 2026-09-09

Status: RESEARCH ONLY / NO PROMOTION / NO 2025 EXPOSURE

## Why this review exists

The corrected 2024 HREF initial-condition ensemble result showed real event-recall information but failed FAR, hard-negative FPR, spatial precision, and regime safety. This note therefore examines a materially different architecture family: assimilation of issuance-time local boundary-layer observations into a convection-permitting analysis/forecast, rather than another coarse HRRR scalar proxy or rescue tuning of the rejected HREF rule.

## Independent evidence

1. A 2025 Weather and Forecasting study assimilated Doppler-lidar-derived planetary-boundary-layer height into a convection-permitting WRF ensemble using DART. The reported experiments improved analyses and 6-h forecasts of potential temperature, water-vapor mixing ratio, and especially wind profiles / low-level jets relative to no-assimilation controls. This establishes that boundary-layer structural observations can alter dynamically consistent wind forecasts rather than act merely as an empirical scalar correction.
   - Primary citation: Assimilation of Doppler Lidar–Derived Planetary Boundary Layer Height Measurements Using an Ensemble Kalman Filter: Case Studies during the PECAN Field Campaign (Weather and Forecasting, 2025).

2. NOAA MADIS maintains a Multi-Agency Profiler dataset with vertically resolved profiler winds; the archive has existed since 2002 and observations are publicly accessible. MADIS documents that incoming profiler data are processed every 15 minutes, half-hourly files are reprocessed repeatedly, and the most complete file for a given hour is generally not available until roughly 2–3 hours after observation time. For example, an HH:00/HH:30 pair can be regenerated at approximately HH:19, HH:36, HH:53, HH+1:31, HH+1:42, HH+2:00, and HH+3:05. This is direct evidence that historical observation-valid timestamps alone are insufficient for leakage-safe reconstruction of what was actually available at issuance time.
   - NOAA source: https://madis.ncep.noaa.gov/madis_map.shtml

3. NOAA MADIS surface/mesonet documentation similarly states that many reports arrive asynchronously, with typical lags from about 8–45 minutes and late reports entering daily recovery processing after two hours. Therefore any surface-observation assimilation lane also requires historical arrival/version provenance, not merely archived final-QC files.
   - NOAA sources: https://madis.ncep.noaa.gov/madis_sfc.shtml and https://madis.ncep.noaa.gov/national_mesonet.shtml

4. The final SWEX observing-system paper documents precisely the kind of lower-tropospheric structure relevant to Sundowners: 915-MHz profiler winds at Rancho Alegre and Sedgwick, a 449-MHz profiler at Santa Barbara Fire, ceilometers, radiosondes, RASS, and surface flux observations. The source QC and missingness rules are already frozen separately in `SI4_SWEX_MULTIINSTRUMENT_EVIDENCE_2026-08-31.md`.
   - Witte et al. (2026), Geoscience Data Journal, DOI 10.1002/gdj3.70074.

## Phase-0 decision

**Do not formulate or score a 2024 candidate yet.** The architecture is scientifically distinct and literature-supported, but SI-4 does not yet have proof that an issuance-safe, outcome-blind 2024 observation archive exists with sufficient Santa Barbara-area vertical-boundary-layer coverage and historical arrival-time/version metadata for exact-F24 reconstruction.

The NOAA documentation materially strengthens this constraint: a final archived MADIS file cannot be treated as issuance-safe simply because its observations predate forecast issuance. SI-4 must be able to reconstruct the specific processing/version state that existed by the frozen issue time; otherwise later-arriving reports or later-QC file regeneration would create future-information leakage.

A candidate can be predeclared only if all of the following are verified before looking at 2024 Sundowner outcomes:

- identify specific 2024 Santa Barbara / south-coast profiler, lidar, ceilometer, radiosonde, and/or surface observation sources that were operationally available by the frozen forecast issue time;
- reconstruct data **availability time and file/version state**, not merely observation valid time, so delayed MADIS reports or later-QC products cannot leak future information;
- verify that the archive preserves enough historical processing provenance to reproduce the issuance-time subset without guessing;
- freeze the assimilation window, cycling schedule, observation-error model, vertical/horizontal localization, QC, background model, domains, terrain/land-use data, and deterministic software versions;
- demonstrate full-year compute feasibility before scoring;
- prohibit SWEX 2022 final-QC observations from becoming occurrence predictors for 2024 (SWEX remains independent physics validation only);
- keep missing observations missing; no calm/neutral substitution and no hindsight station selection;
- no ERA5/reanalysis substitution, future model cycles, 2025 data, fire-outcome predictors, threshold rescue, or post-result localization/observation shopping.

## Gate policy

If a later, fully predeclared assimilation candidate becomes feasible, every existing frozen gate remains mandatory: event POD >= baseline +0.05 absolute; FAR no worse; Brier no worse; AUC >= baseline -0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline -0.01; regime safety; gust non-inferiority.

Until issuance-safe 2024 observing availability, historical arrival/version provenance, and compute feasibility are independently established, this lane remains **Phase 0 evidence only — not a candidate**.
