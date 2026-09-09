# SI-4 SWEX multi-instrument evidence review — 2026-08-31

Status: RESEARCH ONLY. NO PRODUCTION CHANGE. NO 2025 EXPOSURE AUTHORIZED.

## Newly verified primary-source evidence

A 2026 peer-reviewed Geoscience Data Journal paper describing NSF NCAR's In Situ Sensing Facility measurements during SWEX reports that the three ISS sites operated nearly continuously through the campaign and that most final profiling datasets have close to 100% availability. The observing network materially exceeds the single-profiler view represented by dataset 600.034 alone.

Key independent measurements relevant to SI-4 physics/architecture include:

- Santa Barbara Fire Dept ISS1: 449-MHz wind profiler with continuous tropospheric profiles of horizontal wind speed/direction, vertical velocity, and turbulence; 5-min and 30-min wind products are cataloged in 600.034.
- Rancho Alegre ISS2 and Sedgwick ISS3: 915-MHz profilers with roughly 60-m vertical range sampling and 30-min final wind products; Sedgwick also operated RASS virtual-temperature profiles.
- ISS1 scanning Doppler lidar (WindCube 200S): multiple scan geometries measured wind and aerosol backscatter out to roughly 10 km, providing horizontal/terrain-flow structure not available from a single vertical column.
- Ceilometers at all ISS sites measured cloud-base/backscatter structure relevant to marine-layer depth and erosion.
- Radiosondes at Rancho Alegre and Sedgwick provide independent vertical thermodynamic/wind profiles for stability and mountain-wave diagnostics.

Primary source: Witte et al. (2026), "NSF NCAR's In Situ Sensing Facility Measurement System During the Sundowner Wind Experiment (SWEX)", Geoscience Data Journal, DOI 10.1002/gdj3.70074. The paper cites the final profiler products through the NCAR/EOL DOI family associated with the SWEX radar-profiler archive and the WindCube lidar archive at DOI 10.26023/Q28P-EEBS-0Y0E. Dataset 600.034 remains independently identified in the UCAR/DASH catalog as ISS Radar Wind Profiler Products, v1.0, DOI 10.26023/2659-AF70-3009.

## 2026-09-09 QC interpretation freeze

The Witte et al. (2026) primary source provides processing/QC details that must be honored during the eventual outcome-blind ingestion of 600.034 rather than reverse-engineered from event outcomes:

- the 915-MHz profiler winds were formed from 30-second beam/spectral measurements and reprocessed with the NCAR Improved Moments Algorithm (NIMA), with final wind products averaged over 30 minutes;
- nominal profiler range sampling was about 60 m, typically covering roughly 0.2–2.4 km AGL at Rancho Alegre and 0.2–2.0 km AGL at Sedgwick;
- reported operating rates were about 90% at Rancho Alegre and 80% at Sedgwick, while usable wind-product rates were about 75% and 67%, respectively;
- NIMA applies spectral-image/fuzzy-logic processing to separate atmospheric echoes from clutter/interference and can recover weak/noisy echoes and unwrap velocities beyond Nyquist limits;
- the final-QC workflow also screened migration-bird contamination using anomalous directional/temporal signatures.

Frozen ingestion consequence: absence of a valid wind gate is not to be converted into a calm or neutral value. Missing remains missing. Dataset-native QC flags/availability masks are preserved before any event matching. Bird-contaminated or otherwise rejected gates are excluded using source QC only, never Sundowner labels or downstream forecast errors. No interpolation across vertically missing gates is permitted for the initial independent-physics validation unless a separate, predeclared source-agnostic sensitivity analysis is approved before outcome inspection.

The paper's availability statistics also mean that an apparent event/non-event difference in valid-gate count, maximum usable height, or profiler depth is treated first as an observing-system/QC covariate and not as physics. Those completeness fields may be reported for audit but cannot themselves become SI-4 occurrence predictors without a separate issuance-safety and leakage review.

## Research implication

This evidence supports using SWEX as an independent multi-instrument physics-validation set for the already distinct terrain-resolving / observation-assimilating architecture family. It does **not** justify creating another coarse HRRR pressure-level proxy candidate.

The highest-value outcome-blind next step is therefore to acquire/checksum the official final-QC archives without duplicating an order, then define pre-outcome diagnostics for:

1. lee-jet height, depth, and vertical shear from profilers;
2. low-level stability / RASS or radiosonde structure;
3. marine-layer depth/erosion from ceilometer backscatter;
4. cross-barrier and lee-side horizontal flow structure from scanning lidar;
5. whether a terrain-resolving model/assimilation configuration reproduces those structures before any 2024 occurrence scoring is permitted.

No 2024 thresholds, gates, labels, or outcomes may be altered from this review. Fire association remains outcome-only. Missing observations remain missing.

## Promotion state

NO PROMOTION. SI-3.1 on `main` remains production. PR #6 remains draft/open/unmerged. 2025 stays sealed until a 2024-only candidate independently clears every frozen gate.
