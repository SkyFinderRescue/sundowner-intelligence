# SI-4 Matched NWS/NDFD Benchmark Design

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This document locks the comparison rules before any NWS/NDFD result is scored. The goal is a fair, reproducible comparison between Sundowner Predictor and archived official National Weather Service digital forecasts without hindsight, forecast-revision leakage, or mismatched verification.

## Authoritative forecast source

Use the NOAA National Digital Forecast Database (NDFD) archive. NDFD contains gridded forecasts prepared by NWS Weather Forecast Offices in collaboration with NCEP and is the official digital forecast database used for NWS products.

Primary archive paths:
- NOAA NDFD Open Data bucket: `s3://noaa-ndfd-pds/`
- Historical WMO organization: `wmo/<parameter>/<year>/<month>/<day>/<wmo-file-name>`
- NCEI NDFD archive/product documentation.

Do not substitute current XML forecasts, reanalyses, RTMA analyses, or hindsight products for archived forecast grids.

## Fixed-lead rule

The primary comparison lead is **24 hours** because the SI-4 frozen holdout is fixed at F24.

For each verifying valid time:
1. identify only NDFD grids whose forecast reference/issuance time was available at or before the fixed 24-hour cutoff;
2. use the forecast projection corresponding to that valid time;
3. never use a later NDFD revision that became available inside the 24-hour window;
4. persist the exact source object key, reference time, projection, valid time, and checksum used for every scored row.

If an exact F24 projection is unavailable, the row must either use a predeclared nearest-lead tolerance or remain missing. The tolerance must be fixed before aggregate scoring and may not be tuned against results.

## Spatial matching

Compare NDFD to the **same independent verifying stations** used by the SI-4 validation wherever possible. For each station:
- sample the nearest valid NDFD grid point or a predeclared small spatial interpolation;
- do not select the strongest nearby NDFD grid cell after seeing the verifying observation;
- retain station, zone, grid coordinates and distance in the audit record.

Zone summaries are calculated only after station-level matching.

## What NDFD can fairly benchmark

NDFD is primarily a deterministic sensible-weather forecast. Therefore the official NWS/NDFD lane will score quantities that actually exist in NDFD, including as available:
- wind speed;
- wind direction;
- wind gust;
- timing of forecast wind/gust peaks;
- threshold exceedance forecasts derived directly from those archived fields.

Primary metrics:
- peak-gust MAE and bias;
- hourly wind/gust MAE where matching data exist;
- wind-direction error with circular statistics;
- POD, FAR, precision, CSI and specificity for predeclared wind/gust thresholds;
- onset/peak-time error;
- useful fixed-lead warning time;
- zone/spatial correctness;
- strong-event performance.

## Probability comparison rule

Do **not** manufacture a probabilistic NWS Sundowner forecast from deterministic NDFD and then report a Brier score as though NWS issued that probability.

Sundowner Predictor probability Brier/reliability remains directly comparable to:
- the frozen SI-3 probability baseline;
- climatology;
- persistence/simple declared probability baselines;
- an official probabilistic NWS product only if a suitable archived product is identified and matched at the same fixed lead.

A deterministic NDFD threshold forecast may be scored as yes/no event guidance, but it must be labeled **derived from official NDFD wind fields**, not “NWS Sundowner probability.”

## Sundowner-event comparison

For event occurrence skill, use the same independently verified meteorological event labels used by SI-4. An NDFD-derived event signal may be constructed only from forecast variables available at issuance (for example forecast wind direction and gust) using thresholds fixed before the 2025 score is viewed.

Any threshold-selection or calibration must use **2024 only**. The 2025 holdout is score-only.

Fire association remains an outcome field and may never define a Sundowner event or enter forecast predictors.

## Verification observations

Use the same independent RAWS/HADS and curated event truth sources used in the SI-4 validation. Future observations are labels only and never enter fixed-lead predictors.

Missing observations, missing NDFD fields, missing archive files, and ambiguous matches remain missing. Do not infer or fabricate values to complete the table.

## Required output tables

The final benchmark must contain:
1. overall metrics;
2. western / hybrid / eastern regime metrics;
3. station and zone metrics;
4. event vs hard-negative/no-event metrics;
5. strong-wind threshold metrics;
6. timing metrics;
7. source-coverage/missingness report;
8. exact archive provenance and checksums;
9. uncertainty/confidence intervals where sample size permits.

## Promotion / claim rule

No statement that Sundowner Predictor is more accurate than NWS is permitted until the matched benchmark has enough independent 2025 coverage to support the claim and the result is not driven by one zone, one event, or one metric.

A defensible conclusion may be one of:
- Sundowner Predictor demonstrates materially better matched skill;
- performance is statistically/operationally comparable;
- NWS/NDFD is better on one or more important dimensions;
- available archived data are insufficient for a defensible superiority claim.

The result must be reported exactly as measured, including adverse findings.

## Current implementation sequence

1. Discover and freeze exact NDFD archive parameter paths and coverage.
2. Decode a small source-verified sample and validate scanning/geolocation.
3. Build fixed-F24 station matcher with exact provenance.
4. Run a small blinded pilot period and inspect only data integrity, not candidate tuning.
5. Freeze thresholds/rules using 2024 only.
6. Score the full 2025 holdout.
7. Generate matched SI-3 / SI-4 / NDFD tables.
8. Only then issue a comparative conclusion.
