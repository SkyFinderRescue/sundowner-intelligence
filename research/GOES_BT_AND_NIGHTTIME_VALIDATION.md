# SI-4 GOES ABI Brightness-Temperature and Nighttime-Microphysics Validation

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This note closes two source-contract questions before GOES-18 marine-layer features are allowed into any SI-4 candidate: (1) the radiance-to-brightness-temperature equation and (2) the literal sign/order of the nighttime channel differences.

## NOAA source validation

Primary NOAA sources:

- GOES-R Series Product Definition and Users' Guide (PUG), Volume 3: Level 1b Products: `https://www.goes-r.gov/users/docs/PUG-L1b-vol3.pdf`
- NOAA/NCEI ABI Level 1b Radiances metadata: `https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01501`
- NOAA/NESDIS/STAR GOES-West Nighttime Microphysics description: `https://www.star.nesdis.noaa.gov/GOES/conus_band.php?band=NightMicrophysics&sat=G18`
- GOES-R ABI band definitions: `https://goes-r.noaa.gov/mission/ABI-bands-quick-info.html`

### Radiance -> brightness temperature

The NOAA PUG explicitly gives the emissive-band conversion as:

`T = [ fk2 / ln((fk1 / L) + 1) - bc1 ] / bc2`

where `L` is ABI radiance and `fk1`, `fk2`, `bc1`, and `bc2` are stored in each ABI Level-1b file as `planck_fk1`, `planck_fk2`, `planck_bc1`, and `planck_bc2`.

`tools/extract-goes-marine-features.py` implements that equation exactly using the coefficients from each downloaded file rather than hard-coded nominal constants.

### Band identity

NOAA identifies:

- C07: ~3.9 µm, shortwave IR window; it has a reflected-solar component in daylight.
- C13: ~10.3 µm, clean longwave IR window.
- C15: ~12.3 µm, dirty longwave IR window.

### Nighttime Microphysics sign convention

NOAA/NESDIS/STAR describes the traditional fog/low-cloud difference literally as **10.4 µm minus 3.9 µm**, and the cloud-thickness proxy as **12.4 µm minus 10.4 µm**.

Therefore SI-4's raw differences are intentionally defined as:

- `btd_c13_minus_c07_k = BT(C13) - BT(C07)`
- `btd_c15_minus_c13_k = BT(C15) - BT(C13)`

A negative raw C13-C07 value is **not** by itself evidence of a sign bug. The raw numerical value depends on surface/cloud emissivity, atmospheric state, and—for C07—solar reflection when sunlight is present. No sign-based event threshold is allowed until it is developed on 2024-only evidence.

## Critical daylight guard discovered during pilot review

The first numerical extraction pilot used 00 UTC test times to prove archive access, calibration, geolocation, masks, provenance, and issuance-time safety. Around Santa Barbara, 00 UTC can still be daylight, especially in spring/summer.

That means the 00 UTC C13-C07 numbers are valid **brightness-temperature differences**, but they must **not** be interpreted as the NOAA nighttime fog/low-cloud diagnostic because C07 has a reflected-solar component during daylight.

Accordingly:

1. The original 00 UTC artifact remains valid only as an engineering/calibration proof.
2. Nighttime-Microphysics feature development must be gated by solar geometry and use only nighttime scans.
3. Daytime marine-cloud evidence must use a separate daytime-safe feature path; it may not reuse nighttime C13-C07 thresholds.
4. If a fixed-lead issuance time is neither safely nighttime nor supported by an independently validated daytime feature, the direct GOES marine feature is missing/neutral and the system falls back to the non-satellite SI-4 path.

## Next frozen development order

1. Add an explicit Santa Barbara solar-elevation/day-night gate.
2. Re-run the numerical pilot at predeclared nighttime 2024 issuance times.
3. Add 1 h / 3 h / 6 h nighttime persistence/erosion trends using scans ending no later than issuance.
4. Screen those features against 2024-only western events and hard negatives.
5. Freeze feature definitions/transforms before any 2025 satellite score.

No production change is authorized by this validation note.
