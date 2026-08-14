# SI-4 SWEX event-window matching status

Status: **research only**. This note documents one completed guardrail in the SWEX validation lane; it does not complete the SWEX ingestion promotion gate.

## Implemented

`tools/match-swex-event-windows.py` now attaches documented SWEX IOP membership to observation-feature rows using the UTC start/end windows in `data/swex-2022-events.json`.

The matcher deliberately **does not label observations outside documented IOP windows as negative Sundowner cases**. Those rows are marked `other_campaign_time` and remain unsuitable for false-alarm/negative scoring until an independently verified negative-window catalog is built. Missing or unparsable observation times remain `unknown_time`.

This preserves the SI-4 rules that fire association is never an occurrence target, missing values are not invented, and future observations are not introduced into fixed-24h predictors.

## Primary-source basis checked 2026-08-14

- NSF NCAR/EOL SWEX project page: SWEX was designed to examine mountain-wave/critical-level mechanisms and boundary-layer/stability controls on Sundowner predictability.
- NSF NCAR/EOL DASH dataset 600.029 / DOI `10.26023/CM8F-TNHW-HX01`: Multi-Network 5 hPa Vertical Resolution Sounding Composite, campaign coverage 2022-03-17 through 2022-05-17, ASCII EOL Sounding Composite format, no access constraints.
- NSF NCAR/EOL ISS2 final-QC radiosondes / DOI `10.26023/J6P8-7SYD-XP0M`: Rancho Alegre, 2022-03-17 through 2022-05-13.
- NSF NCAR/EOL ISS3 final-QC radiosondes / DOI `10.26023/H5TV-Y54J-R010`: Sedgwick, 2022-03-17 through 2022-05-13.
- Witte et al. (2026), DOI `10.1002/gdj3.70074`: final quality-controlled ISS2/ISS3 radiosondes are CF-1.6 netCDF; this remains the preferred direct site-level QC source behind the harmonized composite.

## Still required before SWEX gate can close

1. Acquire and hash the full final-QC ISS2/ISS3 radiosonde archives and the 5 hPa composite bytes.
2. Run the existing QC/composite feature extractors over the full campaign.
3. Build independently verified matched negative windows; do not infer negatives from non-IOP time alone.
4. Add continuous profiler/lidar/ceilometer/surface layers for onset, peak, decay, marine-depth and wave-evolution validation.
5. Score candidate SI-4 diagnostics against SI-3.1 at the event level without using SWEX observations as fixed-24h predictors.
