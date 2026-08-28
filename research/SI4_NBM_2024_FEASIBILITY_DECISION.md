# SI-4 NBM 2024 feasibility decision

Date: 2026-08-28
Status: VALIDATED FEASIBILITY / RESEARCH ONLY / NO PRODUCTION PROMOTION
Branch: `si4-nbm-probabilistic`

The official NOAA National Blend of Models (NBM) archive is viable for a materially different SI-4 research lane without touching 2025 or production.

Validated no-science archive probe results:
- Seven calendar-selected 2024 development dates were probed: 2024-06-01, 07-01, 08-01, 09-01, 10-01, 11-01, 12-01, all at 00Z and exact F024.
- Both CONUS `core` and `qmd` GRIB2 objects existed for every date: 14/14 HTTP 200, core 7/7, qmd 7/7.
- All probed objects advertised byte-range support, allowing selective extraction rather than whole-file transfer.
- No observations, labels, outcomes, 2025 data, or model coefficients were loaded or changed.

Validated field-inventory results from official 2024 F024 indexes:
- Core contains deterministic 10-m GUST, 10-m WIND and 10-m WDIR guidance.
- QMD contains calibrated 10-m WIND and GUST percentile distributions (1st through 99th percentiles), ensemble mean/std-dev, and official exceedance probabilities at multiple documented wind/gust thresholds.
- These are official NBM wind/gust probabilities/percentiles; they are not a manufactured NWS Sundowner probability.

Scientific decision:
NBM is materially different from the rejected coarse-HRRR proxy family because it is an operational calibrated multi-model blend with probabilistic wind/gust guidance. It is therefore eligible for a separately predeclared 2024-only development experiment after exact fields/grid mapping/range extraction and thresholds are frozen. 2025 remains untouched until that development experiment clears every existing SI-4 promotion gate.

The existing `terrain_regime_analog_ensemble_v1` 2024 chronological CV does not qualify for 2025 exposure: although it materially improved aggregate POD, Brier, AUC, hard-negative Brier and spatial precision, its aggregate hard-negative FPR worsened slightly (0.1247878791 to 0.1262395161), so the frozen all-gates contract failed.

Production `main` and PR #6 are not modified by this isolated lane. Current SI-4 gate remains NO PROMOTION.
