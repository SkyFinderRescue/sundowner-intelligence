# SI-4 NDFD archive benchmark status

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

Checked against the official NOAA NDFD Open Data archive and `NDFDelem_fullres_202206.xls` during the 2026-08-15 research pass.

## Verified operational 2.5-km CONUS wind products

| Field | NDFD parameter path | Operational CONUS WMO super heading | Individual F24 heading in official lookup |
|---|---|---|---|
| Wind direction | `wmo/wdir/` | `YBUZ98` | `YBUB00` |
| Wind speed | `wmo/wspd/` | `YCUZ98` | `YCUB00` |
| Wind gust speed | `wmo/wgust/` | `YWUZ98` | `YWUB00` |

The official lookup identifies all three as CONUS, WFO-originated, operational fields. Wind speed and gust are encoded in m/s in GRIB; wind direction is degrees compass.

## Archive behavior verified on 2025-01-15

The public S3 archive contains the WMO **super files**, not separately archived individual F24 objects under the individual headings. The exact-F24 object probe found zero standalone `YBUB00`, `YCUB00`, or `YWUB00` files for the sample date, while the corresponding super-file streams were present throughout the day.

Observed sample-date archive inventory:

- `wdir/YBUZ98`: 44 archived snapshots; early sample objects about 32.6–32.7 MB.
- `wspd/YCUZ98`: 45 archived snapshots; early sample objects about 56.7–56.8 MB.
- `wgust/YWUZ98`: 45 archived snapshots; early sample objects about 57.8 MB.

This means the matched benchmark must:

1. choose an archived super-file snapshot whose issuance/archive time obeys the predeclared fixed-lead cutoff;
2. decode the F24 projection from inside that super file;
3. sample the predeclared Santa Barbara verification coordinates without looking at verifying observations;
4. persist the exact S3 key, checksum, forecast metadata and grid distance used for every scored row.

It must **not** pick a later super-file revision that became available after the fixed-lead cutoff.

## Important rejected path

An earlier exploratory probe selected the alphabetically first `wdir/wspd/wgust` WMO files and landed on an Alaska sector. That path was rejected before benchmark scoring because nearest grid points were thousands of kilometers from Santa Barbara. No result from that wrong-sector sample is valid benchmark evidence.

The benchmark now uses only the exact operational CONUS headings above and has explicit Santa Barbara grid-distance guards.

## Next gate

Decode a source-verified CONUS super-file snapshot with ecCodes, confirm a usable F24 message for all three fields, require nearest-grid distance under 20 km for Gaviota, Refugio, San Marcos Pass, Montecito and Carpinteria, then build the fixed-cutoff selector for 2024 threshold development and untouched 2025 scoring.
