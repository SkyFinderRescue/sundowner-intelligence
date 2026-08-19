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

Development period: 2024-01-01 through 2024-12-31 only. Four issuance cycles per UTC day: 00Z, 06Z, 12Z, 18Z. Forecast lead exactly 24 h.

Archive failures, missing required fields, duplicate keys, point drift, or lead-time drift must fail closed. No case may be selected or dropped based on observations, labels, fire outcomes, or eventual candidate score. 2025 is forbidden during development.

Validated smoke milestone: run 32209977340, 20/20 rows, zero failures, artifact digest `38204e27187fa5019bdf2e08fa19f19683c32899eef41551b9918bf412ef81b4`.

The predeclared scientific gates in `SI4_UPSTREAM_THERMAL_SUBSIDENCE_2024_PREDECLARED.md` remain unchanged. This document freezes archive geometry only and does not authorize any scoring-rule, coefficient, threshold, holdout, production, or merge change.
