# SI-4 NBM probabilistic surface ensemble v1 — 2024 predeclared development design

Status: RESEARCH ONLY / 2024 DEVELOPMENT ONLY / NO 2025 EXPOSURE AUTHORIZED

Branch: `si4-nbm-probabilistic`
Candidate: `nbm_probabilistic_surface_ensemble_v1`

## Rationale

The completed SI-4 2024 evidence rejects further near-duplicate coarse HRRR pressure-level proxy searches. NOAA's National Blend of Models (NBM) is materially different: it is an operational calibrated multi-model blend, and NBM v4.2 provides probabilistic/percentile 10-m wind and gust guidance. The archive-feasibility and field-inventory probes already passed using official NOAA Open Data objects and no observations/outcomes.

This experiment asks whether issuance-time calibrated surface wind/gust distributions add independent discrimination and gust skill beyond the frozen SI-4 baseline. It does **not** interpret any NBM field as a Sundowner probability.

## Frozen source geometry

- Authoritative source: NOAA NBM public archive (`noaa-nbm-grib2-pds.s3.amazonaws.com`).
- Development year only: 2024.
- Development initialization window: 2024-06-01 through 2024-12-30 inclusive. This starts after the operational NBM v4.2 probabilistic wind/gust upgrade and prevents any 2025 F24 valid time.
- Issuance cycles: 00Z, 06Z, 12Z, 18Z.
- Forecast lead: exactly F024.
- CONUS suites: `core` and `qmd` only.
- Frozen points, matching the established five-point SI-4 geometry:
  - `santa_ynez_valley`: 34.665, -120.015
  - `cuyama_interior`: 34.950, -119.680
  - `bakersfield_synoptic`: 35.434, -119.057
  - `santa_barbara_lee`: 34.426, -119.840
  - `western_channel`: 34.350, -120.400
- Missing official objects/fields remain missing/null and are never replaced based on observations or forecast skill.
- Archive transport uses official `.idx` indexes and HTTP byte ranges. Exact object keys, message descriptors, byte ranges and SHA-256 hashes are persisted.

## Frozen fields

Core deterministic/ensemble-summary surface guidance:
- 10-m `WDIR` deterministic.
- 10-m `WIND` deterministic and ensemble standard deviation.
- 10-m `GUST` deterministic and ensemble standard deviation.

QMD calibrated distribution fields:
- 10-m `WIND`: 10th, 25th, 50th, 75th and 90th percentiles; ensemble mean and standard deviation; official exceedance probabilities for >8, >11, >15 and >17 m/s.
- 10-m `GUST`: 10th, 25th, 50th, 75th and 90th percentiles; ensemble mean and standard deviation; official exceedance probabilities for >17, >21, >24, >28 and >32 m/s.

No other NBM field may be added after development scoring begins without declaring a new candidate/version.

## Frozen derived predictors

Only issuance-time arithmetic transforms of the fields above are allowed:
- gust spread = p90 - p10;
- wind spread = p90 - p10;
- upper-tail gust excess = p90 - p50;
- deterministic-minus-median gust residual;
- deterministic-minus-median wind residual;
- gust/wind median ratio when denominator is finite and >0;
- circular directional sector encoding from deterministic WDIR (sin/cos only);
- official exceedance probabilities used only with their documented thresholds, never relabeled as Sundowner probability.

Missing inputs propagate to null; no imputation from future observations.

## Development architecture

The candidate is evaluated only with chronological 2024 folds. For each scoring time, all fitted coefficients/normalizations/thresholds must come solely from earlier 2024 rows. The candidate may combine the frozen SI-4 issuance-time predictor vector with the frozen NBM predictors above using a regularized logistic event layer and a regularized linear/robust gust-correction layer. Hyperparameter choices must be selected inside training-only folds; no random row shuffling is allowed.

No event threshold may be selected from 2025. No NBM/NWS 'Sundowner probability' is manufactured. Fire association remains outcome-only. Future observations are labels only.

## Frozen promotion gates

A 2024 development candidate is eligible for exactly one score-only 2025 evaluation only if **every** gate passes against the frozen SI-4 development baseline:

- event POD >= baseline + 0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety: no material western/hybrid/eastern collapse under the documented SI-4 regime checks;
- gust MAE/RMSE non-inferior and mean bias non-inferior.

If any gate fails, reject the candidate and do not expose it to 2025. Passing archive extraction alone is infrastructure evidence, not science evidence.

## Production isolation

This lane does not modify `si4-research`, PR #6, or production `main`. SI-3.1 remains the verified production baseline. Current gate status remains NO PROMOTION.
