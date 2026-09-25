# SI-4 HREF 2024 Source-QC Incident

Status: **INFRASTRUCTURE / ARCHIVE-DECODE INVALIDATION — NOT SCIENCE**

Candidate: `initial_condition_ensemble_downslope_v1`

## Quarantined run

The first frozen 2024 chronological-CV execution, GitHub Actions run `33426707534` on head `629d73503451b7c79462ab6b20e03fa2498f2154`, completed mechanically but is **not an admissible scientific pass/fail result**.

A diagnostic in that run exposed objectively invalid NOAA NCSS numeric values in the frozen HREF `Wind_speed_gust_surface` archive. The problem is independent of observations/outcomes and is therefore treated strictly as archive/extraction plumbing.

Source-only inspection of the pre-outcome archive from run `33415242408` found 10 invalid gust rows concentrated in two matched ensemble issuances:

- `2024-10-16T12:00:00.000Z`: one `hrrr_lag6` member at all five frozen points, gust values approximately 428,044–526,879 m/s.
- `2024-10-23T00:00:00.000Z`: one `hiresw_arw_current` member at all five frozen points, gust values approximately 11.7–15.0 billion m/s.

These are numeric sentinel/decode failures, not atmospheric forecasts. The 10-m u/v-derived wind speeds at those records remained physically bounded, confirming that the anomaly is isolated to the archived gust field.

## Frozen repair rule

Before any scientific rerun, source-QC is performed without reading station observations, event labels, fire association, 2025 data, or model scores. The repair is fail-closed:

1. Check every required HREF row for finite and physically valid archive numerics: u/v each within ±150 m/s; 10-m speed 0–200 m/s; direction 0–360°; gust 0–200 m/s; surface pressure 40,000–120,000 Pa; 10-m speed consistent with the archived u/v components.
2. If any required member/point fails source-QC, exclude the **entire 10-member × 5-point issuance**. Do not replace or impute it.
3. Preserve every science field, point, member, lead, label definition, feature transform, training rule, threshold-selection rule, and promotion gate exactly as predeclared.
4. Rerun the 2024 chronological CV only against the repaired, provenance-locked archive.
5. The quarantined run `33426707534` must never be cited as candidate evidence and cannot authorize 2025 exposure.

Implementation is in `tools/repair-si4-href-2024-archive-source-qc.js` and `.github/workflows/si4-href-2024-source-qc-repair.yml`.

## Production / holdout status

- SI-3.1 on `main`: unchanged.
- PR #6: remains draft/unmerged.
- 2025 holdout exposure: **not authorized**.
- SI-4 promotion status: **NO PROMOTION**.
