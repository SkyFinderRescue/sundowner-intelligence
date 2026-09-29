# Sundowner Forecast Archive

This directory is the immutable, pre-event forecast ledger for Sundowner Intelligence.

## Purpose
Each forecast snapshot records only information available at the snapshot time. Later observations, event confirmation, fire outcomes, and verification results must never be written back into an existing snapshot.

## Required snapshots
For each local forecast day, preserve snapshots near:
- 06:00 PDT/PST
- 12:00 PDT/PST
- 15:00 PDT/PST
- the last forecast issued before event onset, when different

## Snapshot identity
Use `YYYY-MM-DD/HHMM-local.json`. Never overwrite an existing snapshot. A correction creates a new file with a later capture time and a `supersedes` field.

## Minimum schema
```json
{
  "schema_version": "1.0",
  "forecast_date_local": "YYYY-MM-DD",
  "captured_at_local": "ISO-8601 with offset",
  "model_version": null,
  "calibration_version": null,
  "source_commit": null,
  "zones": {
    "zone_name": {
      "sundowner_probability_percent": null,
      "predicted_onset_local": null,
      "predicted_peak_window_local": null,
      "predicted_end_local": null,
      "predicted_peak_gust_mph": null,
      "predicted_temperature_f": null,
      "predicted_min_rh_percent": null,
      "regime": null
    }
  },
  "inputs_as_known_at_capture": {
    "pressure_gradients": null,
    "upstream_conditions": null,
    "model_upper_air_context": null
  },
  "fire_association": null
}
```

`fire_association` is intentionally null in forecasts and is never a meteorological predictor.

## Verification
Post-event observations belong in `validation/forecast-verification/`, not here. Verification links to snapshot paths and computes, where evidence permits: probability/Brier error, event hit/miss, onset error, peak-window error, peak-gust error, zone hit/miss, false positives and false negatives.

Missing observations remain null and are not scored. Validation must remain chronological/source-disjoint and may not use observations issued after a snapshot to reconstruct that snapshot.

## September 28, 2026
No retrospective model snapshot is created for 2026-09-28 because the application did not preserve one before the event. Reconstructing it from later information would create future-observation leakage.
