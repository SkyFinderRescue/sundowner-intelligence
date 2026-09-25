# SI-4 SWEX event-window matching status

Status: **research only**. This note documents validated guardrails in the SWEX observation lane; it does not complete the SWEX ingestion promotion gate.

## Implemented

`tools/match-swex-event-windows.py` attaches documented SWEX IOP membership to observation-feature rows using the UTC start/end windows in `data/swex-2022-events.json`.

It now also supports an independently sourced negative-window catalog, `data/swex-2022-negative-windows.json`. The initial verified negatives are SWEX EOP1, EOP2, and EOP3 from Witte et al. (2026) Table 1. That table lists each as an enhanced-observation period with no Sundowner regime assigned, while documenting substantial radiosonde/aircraft sampling. These windows are therefore suitable as campaign-specific validation negatives without treating every non-IOP hour as a non-event.

The matcher still deliberately **does not label observations outside documented IOP or verified-negative windows as negative Sundowner cases**. Those rows remain `other_campaign_time`. Missing or unparsable observation times remain `unknown_time`. Event/negative overlap or duplicate-window conflicts fail validation rather than being silently resolved.

The EOL sounding-composite extractor now preserves an auditable UTC `launch_time` when the source contains an explicit UTC/Z header timestamp or a compact source-filename timestamp. Ambiguous/local timestamps remain null; file modification time is never used. Exact source bytes remain SHA-256 hashed.

A fail-closed source-identity guard is now part of SI-4 CI. `tools/validate-swex-source-identities.js` compares the current authoritative NSF NCAR/EOL catalog identities against the expected SWEX dataset titles/DOIs before downstream ingestion is allowed. It explicitly requires the SWEX profiler archive DOI `10.26023/2659-AF70-3009` / dataset `600.034` and rejects the conflicting M2HATS DOI `10.26023/ZH7Z-GRWB-AV0F`. SI-4 Research Validation run 54 passed this identity check with 11/11 required dataset identities validated and zero failures on 2026-08-15. This is a provenance/infrastructure milestone only; it does not count as an accuracy promotion gate.

This preserves the SI-4 rules that fire association is never an occurrence target, missing values are not invented, and future observations are not introduced into fixed-24h predictors.

## Independently verified SWEX negative windows

- **EOP1:** 2022-04-17 17:00 UTC through 2022-04-18 14:00 UTC.
- **EOP2:** 2022-04-25 17:00 UTC through 2022-04-26 14:00 UTC.
- **EOP3:** 2022-05-04 17:00 UTC through 2022-05-05 14:00 UTC.

These are validation-only labels. They do not imply that all other campaign times were events or non-events.

## Primary-source basis checked 2026-08-14/15

- NSF NCAR/EOL SWEX project page: SWEX was designed to examine mountain-wave/critical-level mechanisms and boundary-layer/stability controls on Sundowner predictability.
- NSF NCAR/EOL DASH dataset 600.029 / DOI `10.26023/CM8F-TNHW-HX01`: Multi-Network 5 hPa Vertical Resolution Sounding Composite, campaign coverage 2022-03-17 through 2022-05-17, ASCII EOL Sounding Composite format, no access constraints.
- NSF NCAR/EOL ISS2 final-QC radiosondes / DOI `10.26023/J6P8-7SYD-XP0M`: Rancho Alegre, 2022-03-17 through 2022-05-13.
- NSF NCAR/EOL ISS3 final-QC radiosondes / DOI `10.26023/H5TV-Y54J-R010`: Sedgwick, 2022-03-17 through 2022-05-13.
- Witte et al. (2026), DOI `10.1002/gdj3.70074`: final quality-controlled ISS2/ISS3 radiosondes are CF-1.6 netCDF; Table 1 documents the 10 IOPs plus EOP1-EOP3 and leaves the Sundowner-regime field blank for those three EOPs.
- NSF NCAR/EOL current SWEX profiler catalog / DOI `10.26023/2659-AF70-3009`, alternate identifier `600.034`: authoritative SWEX ISS radar-wind-profiler products; identity is now checked automatically in CI before ingestion.

## Still required before SWEX gate can close

1. Acquire and hash the full final-QC ISS2/ISS3 radiosonde archives and the 5 hPa composite bytes.
2. Run the existing QC/composite feature extractors over the full campaign.
3. Add continuous profiler/lidar/ceilometer/surface layers for onset, peak, decay, marine-depth and wave-evolution validation.
4. Score candidate SI-4 diagnostics against SI-3.1 on documented IOPs and independently verified negative windows without using SWEX observations as fixed-24h predictors.
