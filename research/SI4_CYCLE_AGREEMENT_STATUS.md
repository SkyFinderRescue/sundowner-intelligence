# SI-4 HRRR Forecast-Cycle Agreement Evidence

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This note records the first completed archived-HRRR forecast-cycle agreement diagnostic. It is descriptive evidence only; it does not establish forecast-skill improvement and it does not modify any model coefficient.

## Method

The research workflow compared four archived NOAA HRRR pressure-level forecasts verifying at identical valid times, using issuance leads F18, F24, F30, and F36 over 2025-04-14 through 2025-04-16. The same SI-4 mountain-wave and cross-barrier diagnostics were computed for each cycle. No verifying future observations were used as predictors or for fitting.

## Completed smoke evidence

- Valid-time/zone groups: **104**
- Groups with at least three matching forecast cycles: **88**
- Mountain-wave score spread: mean **11.2315 points**, median **2.6373**, 90th percentile **29.1766**
- Cross-barrier wind spread: mean **0.6713 mph**, median **0.2641 mph**, 90th percentile **2.1594 mph**

These results confirm that cycle-to-cycle spread is measurable and sometimes substantial enough to be an operational confidence signal candidate. They do **not** prove that the spread improves Sundowner prediction. Promotion requires a larger retrospective sample and independent verification showing Brier/false-alarm/timing benefit or clear non-inferiority under the SI-4 gate.

## Guardrails

- HRRR cycle agreement remains research-only.
- No 2025 verifying observation may be used to tune a coefficient after inspecting the frozen holdout.
- Any candidate confidence rule must be defined from training-only evidence or an independent mechanistic rule, then tested once on independent data.
- Missing cycles remain missing; no cycle is fabricated or back-filled with a later forecast.
- Fire association remains an outcome only and is not part of the meteorological target.

Source artifact: GitHub Actions `SI-4 HRRR Cycle Agreement` run 1, artifact `si4-hrrr-cycle-agreement`, generated from archived NOAA HRRR guidance.
