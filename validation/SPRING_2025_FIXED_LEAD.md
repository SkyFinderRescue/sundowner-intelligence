# Spring 2025 fixed-lead validation

Validation period: March 1 through May 31, 2025.

This test uses independent Santa Barbara County HADS/RAWS observations as the verifying data. Forecast predictors come from Open-Meteo Previous Runs so the values are those available before the valid hour rather than a reanalysis. The 24-hour test uses HRRR. The 48-hour test uses the seamless GFS/HRRR source because HRRR by itself is short range. Live-observation assimilation and production-only upper-air enhancements are excluded from this test to avoid observation leakage.

## Ranking skill (ROC AUC) and gust error

| Zone / verifying station | 24h event AUC | 24h strong AUC | 24h gust MAE | 48h event AUC | 48h strong AUC | 48h gust MAE |
|---|---:|---:|---:|---:|---:|---:|
| Gaviota / GVTC1 | 0.806 | 0.897 | 7.1 mph | 0.769 | 0.874 | 12.3 mph |
| Refugio / RHWC1 | 0.874 | 0.912 | 6.6 mph | 0.794 | 0.856 | 15.2 mph |
| San Marcos Pass / MPWC1 | 0.850 | 0.906 | 6.5 mph | 0.812 | 0.819 | 9.5 mph |
| Montecito / MTIC1 | 0.844 | 0.932 | 4.9 mph | 0.742 | 0.796 | 7.8 mph |
| Carpinteria / CXPC1 | N/A* | 0.934 | 4.5 mph | N/A* | 0.768 | 4.6 mph |

\*No events meeting the general 20 mph terrain-relative sustained-wind verification definition occurred at CXPC1 during this test window, so general-event AUC is undefined there.

Each station contributed about 2,200 matched hourly verification records at each lead. The event score is meaningfully discriminative at 24 hours in the four zones where both classes occurred; the strong-event score is especially discriminative at 24 hours. Skill declines at 48 hours, as expected, but remains useful as a ranking signal. This table validates the forecast core, not the full production system, whose live station assimilation cannot be evaluated without contaminating a retrospective fixed-lead test.

## Calibration study

A separate 2024 spring training / 2025 spring holdout study tested whether a simple two-parameter probability recalibration should be deployed. It improved Brier score for western and eastern general-event probabilities, but the rare-event hybrid and strong-event fits were unstable and did not generalize reliably. Those unstable fits were deliberately **not** put into production. The production app retains the physically constrained score, research-based strong-event thresholds, and independent validation rather than overfitting a limited seasonal sample.

## What this does and does not prove

This validation demonstrates independent fixed-lead skill against RAWS observations and provides a reproducible harness for future tests. It does **not** prove that Sundowner Intelligence is more accurate than every NWS product. A fair superiority claim requires matched archived NWS forecasts and the same independent observations over the same cases. The live application therefore shows NWS grid guidance side-by-side while keeping its own localized forecast separate.
