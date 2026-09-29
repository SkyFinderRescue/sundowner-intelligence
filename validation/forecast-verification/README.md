# Forecast Verification

This directory stores post-event scorecards linked to immutable files in `data/forecast-archive/`.

Rules:
1. Never modify a forecast snapshot during verification.
2. Use only trusted observed evidence for actuals; keep forecast/advisory values separate.
3. Leave unavailable actuals null and exclude them from numerical scoring.
4. Fire association is an outcome-only field and is excluded from Sundowner prediction/calibration features.
5. Preserve chronological validation: a forecast may only contain data timestamped at or before its capture time.
6. Preserve source-disjoint validation where independent observations are available.
7. Catalog growth alone cannot promote a calibration/model version.

Recommended metrics: Brier score for event probability; event hit/miss; zone hit/miss; onset error in minutes; peak-window error; peak-gust MAE; false-positive and false-negative counts.

The 2026-09-28 event is marked unscoreable against an exact Sundowner Intelligence probability snapshot because no immutable pre-event application snapshot was archived. Do not backfill one retrospectively.
