# SI-4 RRFS / REFS Shadow-Only Data Manifest

Status: **RESEARCH ONLY — SHADOW GUIDANCE ONLY — NOT AUTHORIZED FOR PRODUCTION.**

Purpose: define the authoritative provenance and transition rules for the SI-4 RRFS/REFS workstream before any Santa Barbara retrospective or live shadow scoring is built.

## Authoritative NOAA sources checked 2026-08-17

1. NOAA/NCEP Central Operations RRFS product inventory
   - https://www.nco.ncep.noaa.gov/pmb/products/rrfs/
   - Published CONUS pressure-level naming: `rrfs.tCCz.prslev.3km.fFFF.conus.grib2`.
   - Published CONUS 2-D naming: `rrfs.tCCz.2dfld.3km.fFFF.conus.grib2`.
   - NCO explicitly labels the inventory preliminary and subject to change.

2. NOAA/NCEP EMC RRFS/REFSv1 official evaluation
   - https://www.emc.ncep.noaa.gov/users/meg/rrfsv1/index.html
   - Official evaluation page reports IT/pre-implementation testing beginning August 11, 2026 and implementation scheduled for October 6, 2026.
   - NOAA directs users to the RRFS AWS S3 data source for evaluation/parallel data.

3. NOAA Open Data Dissemination / AWS Registry RRFS dataset
   - https://registry.opendata.aws/noaa-rrfs/
   - Bucket: `s3://noaa-rrfs-pds/` (`us-east-1`, anonymous public access).
   - Registry states the prototype real-time feed stopped updating when pre-implementation parallel began in August 2026; users should transition to the new operational/pre-implementation structure.
   - `rrfs_a/` contains fuller prototype/developer products.
   - `rrfs_public/` is structured to approximate the operational product set.
   - Final retrospective output exists under `retro_output_final/`, including winter 2024 and other official evaluation periods.

## Verified retrospective availability gate — 2026-08-17

The automated RRFS retrospective inventory/provenance probe completed successfully on `si4-research` at commit `ad8eacd71e47dd487f10003ee7dd76b0d2fa96d7` (workflow run `32076517756`). This is an availability/provenance milestone only; it is **not** forecast-skill evidence.

- NOAA bucket: `s3://noaa-rrfs-pds/`
- Retrospective lane observed: `retro_output_final/spring/`
- Spring-2024 nodes observed: 119
- Pressure-level retrospective objects observed by the inventory probe: 35,366
- Exact fixed-24h test cases predeclared in 2024: 2024-05-02 12Z and 2024-05-12 12Z
- Both exact F24 cases contained all required pressure fields at 925/850/700/600/500 hPa: UGRD, VGRD, TMP, HGT, RH
- Both exact F24 `prslev` objects also contained the required surface fields: GUST, UGRD 10 m, VGRD 10 m
- Surface and pressure records therefore can be extracted from the same issuance-safe `prslev` object for these verified cases, avoiding cross-product timing ambiguity.
- Example verified key: `retro_output_final/spring/rrfs.20240502/12/rrfs.t12z.prslev.f024.conus.grib2`
- The probe preserves S3 object ETag, content length, last-modified time, `.idx` ETag, exact message offsets, cycle and valid time.

This result authorizes the next research step: build a range-based deterministic RRFS F24 extractor and a **2024-only** shadow-development sample using the same independent observations and exact valid times as the HRRR comparator. It does not authorize use of 2025 outcomes for tuning, blending RRFS into SI-4, or any production change.

## Shadow evaluation policy

- RRFS and REFS remain shadow-only regardless of individual case performance.
- Do not replace or blend the validated HRRR/SI-3 baseline unless a separately frozen retrospective and live parallel benchmark demonstrates independent improvement for Santa Barbara Sundowner prediction.
- Never train against 2025 frozen SI-4 holdout outcomes after seeing them.
- Use issuance-time RRFS/REFS only; future observations are verification labels only.
- Missing model cycles/files remain missing; do not interpolate a missing run into existence.
- Preserve exact S3 key, object ETag/checksum when available, cycle initialization time, forecast hour, model/version lane, and retrieval timestamp for every matched record.
- Keep prototype, retrospective, pre-implementation parallel, and operational records explicitly separated because model configuration and file structure may differ.
- Do not treat NOAA prototype/parallel availability failures as forecast failures.

## First retrospective design

Use only NOAA-hosted official evaluation/retrospective data that can be tied to a documented RRFSv1 configuration. Before scoring:

- predeclare the RRFS product family and variables used;
- predeclare Santa Barbara stations/zones and valid times;
- match the same independent observations used by the HRRR/SI-4 comparison;
- preserve the HRRR fixed-24h comparator;
- score deterministic RRFS on gust/wind/direction, event-threshold skill, timing, and spatial correctness;
- score REFS probabilistic products only where an official probability/product definition exists; never manufacture a probability from unavailable members;
- keep development thresholds entirely outside the frozen 2025 SI-4 holdout.

## Promotion constraint

No RRFS/REFS feature is eligible for production merely because RRFS is NOAA's next-generation system or is transitioning to operations. It must independently win the documented Santa Barbara benchmark and remain stable in live shadow operation.
