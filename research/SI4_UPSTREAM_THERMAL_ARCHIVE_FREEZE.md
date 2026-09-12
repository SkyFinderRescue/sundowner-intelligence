# SI-4 Upstream Thermal/Subsidence v1 — Frozen Archive Geometry

Status: RESEARCH ONLY. This freezes the archive geometry already validated by SI-4 Upstream Thermal Archive Smoke run 32209977340 before full 2024 candidate scoring.

Candidate: `upstream_thermal_subsidence_v1`

Forecast source: archived NOAA HRRR pressure-level GRIB2, fixed F24, indexed/range subset access only.

Frozen points, unchanged from the validated smoke extractor:
- santa_ynez_valley: 34.665, -120.015
- cuyama_interior: 34.950, -119.680
- bakersfield_synoptic: 35.434, -119.057
- santa_barbara_lee: 34.426, -119.840
- western_channel: 34.350, -120.400

Frozen pressure levels: 850, 700, and 500 mb.

Frozen fields at every pressure level: temperature, geopotential height, U wind, V wind, derived speed/direction, and pressure vertical velocity (VVEL).

Frozen GRIB search expression: `:(?:HGT|TMP|VVEL|UGRD|VGRD):(?:850|700|500) mb:`

Development archive is 2024 only. Four issuance cycles per UTC day: 00Z, 06Z, 12Z, 18Z. Forecast lead exactly 24 h. To preserve the predeclared prohibition on any 2025 development exposure, the immutable F24 archive uses 2024-01-01 through 2024-12-30 initialization times, which verify 2024-01-02 through 2024-12-31. The 2024-12-31 initialization is excluded solely because its F24 valid time is 2025-01-01. This is a deterministic year-boundary plumbing rule established before scientific scoring; it does not use observations, labels, outcomes, candidate scores, or any 2025 data.

Expected immutable archive size is therefore exactly 365 initialization days x 4 cycles x 5 frozen points = 7,300 rows. December contributes exactly 30 x 4 x 5 = 600 rows. The January 1, 2024 valid-time case is not backfilled from a 2023 initialization because the frozen archive is issuance-year 2024 only; no case is added or removed based on observations or outcomes.

Archive failures, missing required fields, duplicate keys, point drift, lead-time drift, a 2025 run time, or a 2025 valid time must fail closed. No case may be selected or dropped based on observations, labels, fire outcomes, or eventual candidate score. 2025 is forbidden during development.

Validated smoke milestone: run 32209977340, 20/20 rows, zero failures, artifact digest `38204e27187fa5019bdf2e08fa19f19683c32899eef41551b9918bf412ef81b4`.

Full-year infrastructure note: run 32530256793 successfully extracted January-November and extracted all 620 December rows with zero source failures, but its fail-closed contract correctly rejected the final 20 rows because 2024-12-31 F24 verifies on 2025-01-01. The boundary rule above fixes only that deterministic archive-plumbing contradiction; the candidate hypothesis, points, fields, transforms, thresholds, labels, and scientific gates remain unchanged.

The predeclared scientific gates in `SI4_UPSTREAM_THERMAL_SUBSIDENCE_2024_PREDECLARED.md` remain unchanged. This document freezes archive geometry only and does not authorize any scoring-rule, coefficient, threshold, holdout, production, or merge change.