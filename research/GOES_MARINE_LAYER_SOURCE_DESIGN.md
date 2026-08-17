# SI-4 GOES-West Marine-Layer Source Design

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

## Purpose

Add direct GOES-West evidence for whether the Santa Barbara south-coast marine layer is likely to resist or decouple a supportive Sundowner downslope jet from the surface.

This is a resistance / surface-coupling input. It is **not** a Sundowner label.

## Authoritative source

NOAA/NESDIS/NCEI GOES-R ABI archive, GOES-18 for the 2024-2025 frozen development/holdout period.

Primary archive family:

- NOAA GOES-18 public object store: `noaa-goes18`
- ABI Level 1b CONUS radiances: `ABI-L1b-RadC`
- NetCDF files, fixed-grid geolocation, instrument calibration/navigation metadata retained in each file.

The source is public NOAA operational satellite data. STAR imagery pages may be used for human interpretation documentation, but model predictors must come from archived numerical ABI data with exact timestamps and provenance.

## Nighttime low-cloud physics

Candidate raw channels for a reproducible numerical feature:

- ABI Band 7, approximately 3.9 μm
- ABI Band 13, approximately 10.3/10.4 μm
- ABI Band 15, approximately 12.3/12.4 μm

NOAA's Nighttime Microphysics description identifies the 10.4-3.9 μm difference as useful for low-cloud/fog discrimination and the 12.4-10.4 μm difference as a proxy for cloud thickness, with the 10.4 μm thermal channel helping emphasize warm/low cloud.

We will not reverse-engineer rendered RGB colors. We will derive numerical brightness-temperature/radiance features from the source NetCDFs.

## Spatial domains

All metrics will be computed separately over fixed polygons defined before holdout scoring:

1. Santa Barbara south-coast strip.
2. Santa Barbara Channel immediately offshore.
3. Western / Point Conception coastal sector.
4. Optional eastern Santa Barbara / Carpinteria coastal sector.

The exact masks must be versioned and fixed before 2025 score-only testing.

## Candidate features

Research candidates:

- low-cloud/fog spectral-difference fraction over each polygon;
- median and upper-quantile 10.4-3.9 μm brightness-temperature difference;
- median and upper-quantile 12.4-10.4 μm cloud-thickness proxy;
- warm-low-cloud thermal fraction from Band 13;
- coast-to-Channel contrast;
- west-to-east marine-layer contrast;
- 1 h / 3 h / 6 h erosion or intrusion trend;
- persistence of low-cloud resistance;
- missing/quality-controlled fraction.

No threshold is frozen yet. Thresholds and transformations may be developed using 2024 only, then frozen before any 2025 score-only result is viewed.

## Timing / leakage rules

For a forecast issued at time `T`:

- satellite inputs must have observation/end time `<= T`;
- no satellite image or product after issuance may enter a predictor;
- verifying future surface winds remain label-only;
- no fire occurrence/outcome may be used as a predictor or target;
- unavailable satellite data remains missing; it is never backfilled from future imagery;
- a missing satellite feature must fall back to the existing non-satellite SI-4 path rather than silently imputing an event-favorable value.

For the fixed-24h retrospective gate, direct GOES observations at the verifying valid time are **not** allowed as predictors. Satellite predictors must be anchored to forecast issuance or earlier. Separate nowcasting experiments may use current satellite data, but they must be scored and labeled as a different lead-time product.

## Satellite identity

The research pipeline must record:

- satellite/platform (GOES-18);
- ABI product family;
- band;
- scan mode;
- start/end/creation timestamps from filename and NetCDF metadata;
- object key;
- object ETag or cryptographic digest when downloaded;
- source archive URL/bucket;
- extraction software version;
- spatial mask version.

Fail closed on unexpected platform/product/band/time drift.

## Initial implementation gates

1. Archive listing probe proves Bands 7/13/15 exist for predeclared 2024 and 2025 issuance times.
2. NetCDF extractor converts radiance to calibrated brightness temperature using file-provided Planck coefficients and navigation metadata.
3. Synthetic/unit test verifies equations, timestamp rules, and mask behavior.
4. 2024-only pilot tests whether the direct satellite feature separates western hard negatives from real events.
5. Freeze transforms/thresholds.
6. 2025 score-only comparison.
7. Ablation against the profile-only surface-coupling candidate.

No direct GOES feature may be merged into production solely because it is physically plausible.
