# SI-4 NBM probabilistic wind/gust review and 2024 archive probe

Status: RESEARCH ONLY / 2024 DEVELOPMENT ONLY. This lane is isolated on `si4-nbm-probabilistic`; it does not modify `si4-research`, PR #6, or production `main`.

## Why this is materially different

The completed SI-4 2024 evidence rejects further near-duplicate coarse HRRR pressure-level proxy searches. A different architecture is therefore required before another candidate is justified.

NOAA's National Blend of Models (NBM) is a materially different operational architecture: it blends NWS and non-NWS deterministic and ensemble NWP guidance and applies calibrated post-processing. NBM v4.2, implemented operationally 15 May 2024, added probabilistic/percentile 10-m sustained-wind and wind-gust guidance. NOAA documents quantile-mapped wind/gust inputs as a multi-model ensemble with a rolling archive used for calibration. This is not another transformation of the existing single-HRRR pressure-level feature set.

Primary sources reviewed before this lane was frozen:
- NOAA/MDL NBM documentation: https://vlab.noaa.gov/web/mdl/nbm-documentation
- NOAA/MDL NBM data download/archive documentation: https://vlab.noaa.gov/web/mdl/nbm-download
- NOAA Open Data Registry, NBM: https://registry.opendata.aws/noaa-nbm/
- NOAA NBM v4.2 operational upgrade notice (probabilistic wind/gust): https://vlab.noaa.gov/web/mdl/-/nbm-upgraded-to-version-4.2
- NOAA NBM v4.2 quantile-mapped model inputs for probabilistic 10-m wind speed/gust guidance.

The immediate goal is only to establish exact 2024 archive availability and transport characteristics for official NBM F024 CONUS core/QMD files. No observations, labels, event outcomes, 2025 data, thresholds, or SI coefficients are consulted by this probe.

## Frozen archive-availability probe

Calendar-selected development dates (chosen without observations/outcomes):
- 2024-06-01 00Z
- 2024-07-01 00Z
- 2024-08-01 00Z
- 2024-09-01 00Z
- 2024-10-01 00Z
- 2024-11-01 00Z
- 2024-12-01 00Z

Forecast lead is exactly F024. Probe both official CONUS `core` and `qmd` object paths under NOAA's public NBM AWS archive. Record HTTP status, content length, ETag if exposed, and byte-range support. Missing objects stay missing/null; the probe must not substitute another date based on forecast skill or observations.

## Scientific use is NOT authorized by this probe

Archive availability alone does not make NBM a candidate. If the 2024 archive is viable, a later, separately frozen 2024-only development design must specify exact NBM fields, extraction/grid mapping, thresholds and promotion gates before any scoring. No NWS/NBM Sundowner probability may be invented. Official NBM wind/gust probabilities/percentiles may only be used according to their documented meaning. 2025 remains untouched until a 2024 development candidate clears every frozen SI-4 promotion gate.

Existing SI-4 gates remain unchanged: event POD >= baseline +0.05 absolute; event FAR no worse; overall Brier no worse; AUC >= baseline -0.005; hard-negative Brier and FPR no worse; spatial precision >= baseline -0.01; regime safety; gust non-inferiority. Fire association stays outcome-only, future observations label-only, and missing values remain missing.
