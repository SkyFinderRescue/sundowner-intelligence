# SI-4 Initial-Condition Ensemble Downslope Path — 2024 Predeclaration

Status: RESEARCH-ONLY / NO 2025 EXPOSURE AUTHORIZED
Candidate: `initial_condition_ensemble_downslope_v1`
Production status: NO PROMOTION; SI-3.1 on `main` remains authoritative.

## Why this path is materially different

The completed SI-4 2024 experiments show that repeated deterministic/coarse pressure-level transforms are not recovering the required event recall without violating other gates. This candidate therefore does **not** add another scalar HRRR proxy or retune any rejected coefficient family.

The hypothesis is instead that a principal source of Sundowner forecast uncertainty is **initial-condition / state uncertainty interacting nonlinearly with terrain-resolving downslope dynamics**. Published downslope-wind studies show very large member-to-member intensity differences even when synoptic patterns are similar, while convection-allowing ensembles initialized through ensemble data assimilation provide a direct way to represent that uncertainty. Sundowner-specific WRF work independently shows strong sensitivity to terrain resolution, PBL/land-surface treatment, mountain-wave breaking, marine-layer erosion, and upstream terrain. This supports an ensemble/state-uncertainty experiment as a distinct architecture rather than another deterministic feature transform.

Primary evidence reviewed before this predeclaration includes:

- `Downslope Windstorm Forecasting: Easier with a Critical Level, but Still Challenging for High-Resolution Ensembles` (Weather and Forecasting, 2023): convection-allowing WRF ensemble initialized from an EnKF; member spread remained operationally important for downslope-wind intensity.
- `Initial-Condition Sensitivities and the Predictability of Downslope Winds` (JAS, 2009): prototypical downslope-wind ensembles produced very large wind-speed divergence from small initial-condition perturbations.
- `Simulating Sundowner Winds in Coastal Santa Barbara: Model Validation and Sensitivity` (Atmosphere, 2019): multi-physics 1-km WRF Sundowner simulations show sensitivity to roughness length, PBL treatment, wave breaking and marine-layer erosion.
- `Multiscale WRF Modeling of Meso- to Micro-Scale Flows During Sundowner Events` (JGR Atmospheres, 2025): SWEX-based multiscale WRF/LES shows strong terrain/stability/mountain-wave/critical-layer/turbulence control, with published namelists and processing code.
- NOAA HREF/HIRESW documentation: HREF aggregates multiple convection-allowing deterministic members and time-lagged forecasts to produce ensemble guidance; NOAA GEFS provides a separate archived perturbation ensemble suitable for initial/boundary-condition uncertainty experiments when exact operational HREF archive coverage is unavailable.

## Frozen research question

Can **issuance-time ensemble state spread and member agreement** at fixed lead recover Sundowner event POD by at least +0.05 absolute versus the frozen SI-4 baseline while preserving every existing safety/calibration/spatial/gust gate?

The experiment is about forecast-state uncertainty and member agreement, not a new Sundowner probability manufactured from NWS products.

## Phase 0 — archive / reproducibility feasibility gate (NO outcome scoring)

Before looking at any observation outcomes for candidate selection:

1. Establish whether an official 2024 archived convection-allowing ensemble (prefer HREF/HIRESW or an equivalent NOAA archive) can reproducibly supply a predeclared exact fixed-24h set over Santa Barbara County.
2. If HREF member-level 2024 archive access cannot be established reproducibly, a GEFS-driven limited-area WRF ensemble is the allowed fallback **only if** all boundary-condition members, run times, model version, WRF namelist, domains, physics, static terrain and extraction points are frozen before scoring observations.
3. Predeclare calendar times without using event labels/outcomes. Archive availability may replace a missing date only if availability is established before observation scoring and the replacement rule is deterministic.
4. Persist exact object keys/URLs, hashes where available, initialization times, valid times, forecast hour, member IDs, grid spacing, nearest-grid distances, variables and byte-range/full-transfer provenance.
5. No 2025 archive/object may be queried during Phase 0 except metadata necessary to verify that no 2025 science data were consumed; the scientific candidate remains 2024-only.
6. Transient 5xx/timeouts/archive gaps are infrastructure only and must not influence science conclusions.

If a reproducible 2024 ensemble source cannot be established, mark this path `BLOCKED_ARCHIVE` and do not substitute observations, reanalysis, or retrospective analyses as predictors.

## Frozen predictors / transformations

Allowed inputs are issuance-time model forecast quantities only. Candidate features may summarize the predeclared ensemble at the same valid time/location and include:

- member median/mean and robust spread of 10-m wind speed, gust (if available), direction, temperature and humidity;
- cross-mountain and along-mountain wind components;
- pressure-gradient members using the same predeclared locations already used by SI-4;
- 925/850/700/500-mb wind, temperature, height and stability fields when available consistently across members;
- member fraction satisfying the already-defined physical Sundowner state (northerly/cross-ridge flow, stability/coupling/critical-level diagnostics) using frozen definitions only;
- ensemble disagreement in regime classification, onset timing and surface coupling;
- time-lagged member identity only if it is part of the official ensemble construction and valid-time alignment is exact.

Not allowed:

- future observations or any observation timestamp later than forecast issuance;
- ERA5/reanalysis predictors;
- fire occurrence as a predictor (fire remains outcome-only);
- post-hoc case exclusion based on forecast error;
- 2025 labels or missed-event inspection;
- threshold rescue after validation;
- changing previously rejected SI-4 coefficients.

## 2024 chronological development design

Use the same independent 2024 labels/stations and chronological folds used by the current SI-4 research contract wherever exact common valid times exist.

Within each fold:

- fit/calibrate using training chronology only;
- select any ensemble probability mapping, regularization or member-agreement threshold on the training portion only;
- score the held-out chronological block exactly once;
- retain explicit nulls where ensemble fields are unavailable; missing stays missing;
- compare against the frozen baseline on exact common rows and also report coverage.

A simple comparator must be included: frozen SI-4 baseline plus no ensemble adjustment. If a learned mapping is used, it must also be compared against a simple monotonic/member-fraction or logistic mapping trained on the same fold.

## Frozen promotion gates

Every gate must pass on 2024 chronological validation before **any** 2025 score is authorized:

- event POD/recall >= baseline + 0.05 absolute;
- event FAR no worse than baseline;
- overall Brier no worse than baseline;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety: no material western/eastern/hybrid collapse hidden by pooled improvement;
- gust MAE/RMSE non-inferior and bias non-inferior where ensemble gust is evaluated;
- exact valid-time/member/provenance contract passes with no leakage.

If **any** gate fails, reject `initial_condition_ensemble_downslope_v1` and do not expose it to 2025.

## 2025 firewall

Only if every frozen 2024 gate passes:

1. freeze source, member set, transforms, coefficients, calibration and thresholds;
2. create an immutable candidate artifact with hashes/provenance;
3. run exactly one score-only 2025 evaluation;
4. do not retune from any 2025 result.

A 2025 failure is final for this candidate family unless genuinely new independent physics/data are later introduced.

## Relationship to other SI-4 work

- All previously rejected HRRR/coarse proxy candidates remain rejected.
- RRFS remains shadow-only.
- NBM probabilistic candidate remains rejected under its 2024 gates.
- The deterministic terrain-resolving WRF path is complementary but must not be conflated with this ensemble uncertainty test; no result from either path may be used to tune the other after holdout exposure.
- SWEX final-QC 600.034 remains pending and may provide independent physical validation only after delivery; do not duplicate the accepted NCAR/EOL order.

## Decision at predeclaration

`initial_condition_ensemble_downslope_v1` is **authorized only for Phase 0 archive/reproducibility feasibility work and, if that passes, 2024-only chronological development**. Production remains SI-3.1 and PR #6 must remain draft/unmerged.