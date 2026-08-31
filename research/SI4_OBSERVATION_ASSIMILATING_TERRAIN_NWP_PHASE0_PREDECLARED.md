# SI-4 Observation-Assimilating Terrain NWP — Phase 0 Predeclaration

Date: 2026-08-31
Status: **RESEARCH ONLY / PHASE 0 FEASIBILITY — NO SCIENCE SCORE, NO 2025 EXPOSURE, NO PRODUCTION CHANGE**

## Candidate concept

Working name: `observation_assimilating_terrain_nwp_v1`.

This concept is materially different from the rejected SI-4 coarse HRRR pressure-level proxy family and from post-processing-only candidates. The architecture changes the forecast initial state itself by assimilating issuance-time observations into a terrain-resolving nonhydrostatic model before the fixed-F24 forecast is run.

The scientific motivation is independent and primary-source based:

1. SWEX observations show that Sundowner evolution depends on vertically structured lee/upstream flow, nocturnal lee jets, mountain waves/wave breaking, boundary-layer stratification, marine-layer transitions and rapid changes around sunset. These are state variables/structures that are not fully represented by a few coarse pressure-level scalar proxies.
2. Peer-reviewed data-assimilation studies show that assimilating surface observations and wind-profile information can improve lower-atmospheric analyses and near-surface wind forecasts, including with WRF/ensemble systems.
3. WRFDA is an open-source, auditable implementation path for 3DVAR/4DVAR-style observation assimilation; an ensemble DA implementation may also be considered only if its full configuration is frozen before any outcome scoring.

Primary sources supporting the architecture (not evidence of SI-4 improvement yet):
- Carvalho et al. (2020), SWEX pilot study, Monthly Weather Review, DOI 10.1175/MWR-D-19-0207.1.
- Carvalho et al. (2024), SWEX overview, Bulletin of the American Meteorological Society, BAMS-D-22-0171.1.
- Janiszeski & Crippa (2025), multiscale terrain-resolving WRF Sundowner simulations, DOI 10.1029/2024JD042972.
- Hacker et al. (2014), surface-observation assimilation with WRF/DART EnKF, DOI 10.1175/MWR-D-13-00108.1.
- Wang et al. (2015), WRF-3DVAR near-surface wind forecast impact, DOI 10.1175/MWR-D-14-00038.1.
- WRFDA documentation: https://www2.mmm.ucar.edu/wrf/site/users_guide/wrfda.html

## Why this is not a near-duplicate HRRR proxy

The rejected SI-4 proxy candidates all transform or condition already-produced coarse forecast fields. This path instead tests whether the missing event-recall information is recoverable by changing the analyzed initial atmospheric state with real issuance-time observations and then resolving its terrain/ABL evolution dynamically.

No manual scalar probability uplift, no post-hoc threshold rescue, and no reuse of the rejected coarse-proxy family is authorized under this concept.

## Phase 0 only — archive/reproducibility feasibility

Before any 2024 event labels or probability scores are inspected, phase 0 must establish all of the following:

1. **Issuance-time observation archive:** identify reproducible 2024 archives for observations that would actually have been available at each forecast issuance time. Permitted families for feasibility review include METAR/ASOS, mesonet/MADIS-like surface observations, radiosonde/profiler/wind-profile sources with documented latency, and other public meteorological observations with verifiable timestamps and provenance.
2. **Latency-safe contract:** an observation may be assimilated only if its observation time and documented/archived availability time are <= the forecast issuance cutoff. If operational availability cannot be established, that observation is excluded.
3. **Fixed forecast contract:** preserve the existing exact F24 target. No changing lead time after feasibility inspection.
4. **Terrain-resolving model reproducibility:** freeze model version, domains, grid spacing, terrain source, vertical levels, PBL/LSM/microphysics/radiation schemes, boundary-condition source, DA method, observation errors/QC, spin-up, assimilation window, and output diagnostics before outcome scoring.
5. **Outcome blindness:** phase 0 may inspect archive existence, timestamp coverage, variable availability, model stability, runtime, and deterministic reproducibility only. It may not use Sundowner labels, fire outcomes, 2025 outcomes, missed-event lists, or gate metrics to choose observations/configuration.
6. **Missing stays missing:** unavailable observations are not fabricated or backfilled with future data. A predeclared fallback must be used or the issuance excluded according to an outcome-blind completeness rule.
7. **No SWEX leakage:** SWEX final-QC observations, if/when delivered, are independent mechanistic evidence and may be used to validate representation of vertical structures in explicitly historical SWEX periods. SWEX IOP membership is not a predictor, non-IOP periods are not automatic negatives, and SWEX data do not authorize tuning on the frozen 2025 holdout.

## If phase 0 passes

Only after phase 0 proves a complete leakage-safe 2024 archive/model workflow may a separate chronological-CV experiment be predeclared.

Any 2024 chronological science experiment must preserve the existing frozen promotion gates exactly:
- event POD >= baseline +0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Failure of any gate rejects the candidate before 2025. If every gate passes, all transforms/model configuration/coefficients/thresholds are frozen before exactly one score-only 2025 evaluation.

## Explicit prohibitions

- No 2025 feature selection, hyperparameter tuning, threshold tuning, model-physics selection or DA-window tuning.
- No future observations as predictors or assimilated inputs.
- No reanalysis/analysis fields that would not have been available operationally at issuance unless used solely as non-predictive research reference.
- No fire association predictor; fire remains outcome-only.
- No retrospective replacement of failed archive periods with hand-selected successful cases.
- No treating runner/archive failures as scientific failures.
- No promotion merely because model wind/gust RMSE improves; every frozen probability/event/safety gate still applies.

## Current decision

This document authorizes **phase-0 feasibility research only**. It does not authorize a 2024 science score, 2025 exposure, production changes, or PR #6 merge.

SI-3.1 on `main` remains production. PR #6 must remain draft/open/unmerged. Current promotion status remains **NO PROMOTION**.