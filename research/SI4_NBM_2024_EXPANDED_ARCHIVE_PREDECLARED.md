# SI-4 NBM 2024 expanded archive sample — predeclared

Status: RESEARCH ONLY / ARCHIVE ACQUISITION ONLY / NO SCIENCE SCORED / NO 2025 EXPOSURE

Candidate lane: `nbm_probabilistic_surface_ensemble_v1`
Branch: `si4-nbm-probabilistic`

## Purpose

Expand the already-passed 28-case NOAA NBM F024 range pilot into a larger development-only archive before any NBM skill scoring. Case selection is calendar-based and frozen independently of observations, labels, outcomes, fire association, or forecast performance.

## Frozen case-selection rule

- Development window: 2024-06-01 through 2024-12-30 UTC.
- Select every third calendar day beginning 2024-06-01. This deterministically yields 71 dates, ending 2024-12-28.
- Issuance cycles on each selected date: 00Z, 06Z, 12Z, 18Z.
- Total expected cases: 284.
- Forecast lead: exact F024 only.
- Frozen five-point SI-4 geometry and frozen `core` / `qmd` field inventory from `SI4_NBM_PROBABILISTIC_2024_PREDECLARED.md`.
- Expected point rows: 1,420.

No case may be replaced or removed because of observations or forecast skill. If an official object is unavailable, persist the archive failure as infrastructure evidence and repair only transport/extraction logic when justified. Do not alter model coefficients, thresholds, labels, fields, geometry, or sampling dates to clear an archive failure.

## Provenance and fail-closed requirements

Every successful case must retain the exact NOAA object key, message descriptor, byte range, content-range response and SHA-256 hash already emitted by `tools/extract-si4-nbm-f24-range.py`.

The combined artifact must assert:

- exactly 284 unique `(run_time, valid_time)` cases;
- exactly 1,420 point rows;
- all run and valid times in 2024;
- exact forecast lead 24 hours;
- observations loaded = false;
- outcomes loaded = false;
- 2025 holdout loaded = false;
- production change authorized = false;
- no missing case silently dropped.

## Next gate

Only after this acquisition gate passes may the NBM predictors be matched to identical 2024 development rows and scored under chronological training-only folds. The already-frozen promotion gates remain unchanged. A development failure means rejection without any 2025 exposure.

This lane does not modify `si4-research`, PR #6, or production `main`.