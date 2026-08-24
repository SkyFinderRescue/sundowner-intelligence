# SI-4 Channel-Eddy / Marine Re-entry 2024 Predeclared Experiment

Status: **PREDECLARED — 2024 DEVELOPMENT ONLY — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. This experiment cannot authorize a production change by itself.

## Independent physical hypothesis

This is a materially different hypothesis from the rejected direct-GOES marine-layer gate and the rejected Point Conception coastal-jet phase candidate. It tests whether **issuance-time Santa Barbara Channel horizontal shear and mesoscale turning imply a dynamically favored marine-boundary-layer re-entry pathway that suppresses or interrupts near-surface Sundowner coupling**, even when upstream pressure/wave precursors are favorable.

The physical basis is independent of the frozen 2025 holdout. Carvalho et al. (2024, BAMS, DOI 10.1175/BAMS-D-22-0171.1) describes SWEX evidence and prior simulations in which enhanced offshore winds create horizontal shear over the Santa Barbara Channel, mesoscale eddies can advect the marine ABL inland, and marine/continental ABL interaction contributes to abrupt spatial/temporal changes in surface winds. Carvalho et al. (2020, MWR, DOI 10.1175/MWR-D-19-0207.1) likewise identifies marine-boundary-layer interaction and offshore coastal-flow interaction as relevant Sundowner mechanisms. No SWEX final-QC profiler data are used here; that external dataset remains pending.

## Data boundary

- Development period: **2024-01-01 through 2024-12-31 only**.
- Forecast lead: **fixed F24**.
- Predictor source: archived NOAA HRRR fields available at forecast issuance only.
- Verifying HADS/RAWS observations: **label-only** and never used to choose archive availability, valid times, geographic points, or predictor transforms.
- Fire association: outcome-only and excluded from predictors/target definition.
- 2025 observations and missed-event rows: **forbidden during development**.
- Missing physical inputs remain `null`; no imputation from future observations.

## Frozen geography before scoring

Use a compact fixed set of Channel/coastal points selected from geography and the published mechanism, not outcomes:

1. western Channel / Point Conception-side marine inflow point;
2. central Santa Barbara Channel offshore point;
3. eastern Channel / Montecito offshore point;
4. Santa Barbara coastal plain point;
5. western coastal plain / Goleta point.

Exact latitude/longitude coordinates must be persisted in the extraction manifest **before any observation-based scoring** and must not be moved after results are seen.

## Frozen predictor family

At F24, extract only issuance-time near-surface fields needed to diagnose the channel-flow geometry and marine re-entry susceptibility:

- 10-m U and V wind components;
- 2-m temperature;
- 2-m dewpoint or RH when directly archived;
- mean sea-level pressure when directly archived;
- planetary-boundary-layer height if available from the same surface archive.

Derived predictors are deterministic transforms of those fields only:

- cross-channel and along-channel wind components at each frozen point;
- west-to-east channel turning angle;
- channel horizontal-shear magnitude between western/central/eastern offshore points;
- coastal-versus-offshore wind-vector contrast;
- offshore-to-coastal temperature and dewpoint-depression contrast;
- signed low-level convergence/turning proxy along the frozen west-central-east transect;
- optional PBL-height contrast only when PBLH is natively present; otherwise `null`.

No candidate may treat this diagnostic as proof that a physical eddy exists. It is a **susceptibility proxy** for a marine re-entry configuration.

## Candidate role

The candidate may act only as a bounded **suppression/resistance adjustment** on rows that already have meaningful baseline Sundowner probability. It may not create an event from a low-probability baseline and may not globally increase probability to rescue recall.

Training must select any transform/weight from 2024 training folds only. A zero adjustment must be an allowed outcome; if training evidence does not support an adjustment, the candidate is rejected.

## Chronological validation

Use the same leakage-safe chronological-CV framework and independent 2024 observations used by prior SI-4 development experiments. All hyperparameters/weights are selected within training folds; validation folds are score-only.

Report at minimum:

- overall Brier and ROC AUC;
- event POD/recall and FAR;
- hard-negative Brier and FPR;
- western, hybrid and eastern regime breakdown;
- zone/spatial precision and recall where the event scorer supports them;
- gust MAE/RMSE/bias to ensure the probability gate does not corrupt gust guidance;
- number of rows with missing channel predictors and fail-closed behavior.

## Predeclared promotion gates

A candidate is eligible for exactly one frozen 2025 score only if **every** 2024 gate passes:

1. event POD >= baseline (no recall loss permitted for a suppression-only feature);
2. event FAR <= baseline - 0.02 absolute;
3. overall Brier <= baseline;
4. AUC >= baseline - 0.005;
5. hard-negative Brier <= baseline;
6. hard-negative FPR <= baseline;
7. spatial precision >= baseline - 0.01;
8. no regime suffers both worse Brier and worse POD;
9. gust MAE/RMSE non-inferior and absolute bias not materially worse;
10. missing-data rows are fail-closed to the unadjusted baseline.

If any gate fails, reject the candidate and **do not expose it to 2025**. Do not change geography, thresholds, transforms, weights or gates after seeing 2024 results merely to clear the test.

## Distinction from prior rejected candidates

- **GOES marine candidate:** satellite cloud/brightness-temperature resistance; rejected. This experiment instead tests modeled near-surface **flow geometry and shear** across the Channel.
- **Coastal-jet phase candidate:** Point Conception jet alignment/transfer toward the mountains; rejected. This experiment instead tests **within-Channel turning/shear and marine re-entry susceptibility** downstream of that jet.
- **Upstream ABL reservoir / thermal candidates:** upstream Santa Ynez/San Rafael structure; rejected. This experiment is downstream/coastal and does not reuse their failed coefficients.

## Decision discipline

No 2025 scoring is allowed unless the 2024 chronological-CV report explicitly states that all ten gates pass. A runner/archive failure is infrastructure, not model evidence. Transient 5xx/timeouts receive bounded retry without changing science. A failed scientific gate is final for this formulation.

Primary references:
- Carvalho et al. (2024), *Bulletin of the American Meteorological Society*, DOI 10.1175/BAMS-D-22-0171.1.
- Carvalho et al. (2020), *Monthly Weather Review*, DOI 10.1175/MWR-D-19-0207.1.
