# SI-4 Wave-Momentum Descent 2024 Chronological-CV Plan

Status: **PREDECLARED — 2024 DEVELOPMENT ONLY — NOT ELIGIBLE FOR PRODUCTION**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. This plan does not authorize any 2025 exposure or production change.

## Independent physical hypothesis

Candidate name: `wave_momentum_descent_v1`.

The hypothesis is materially different from the previously rejected upstream thermal/subsidence, Richardson/wave-breaking susceptibility, SRM blocking, channel-eddy, ABL-reservoir, lee-jet phase, coastal-jet phase, coastal adiabatic lift-off, mesoscale-pressure-transition, GOES marine, and cycle-agreement candidates.

Primary-source motivation comes from SWEX: the campaign was designed to resolve how high-amplitude mountain waves, critical layers, boundary-layer structure and surface winds interact across the Santa Ynez Mountains. The 2026 SWEX IOP2 analysis reports a large-amplitude lee wave evolving into hydraulic-jump/wave-breaking behavior and a downslope jet, with descending waves and rotor circulations associated with enhanced surface winds. This candidate therefore tests whether **issuance-time vertical coherence between cross-barrier momentum and descending pressure-vertical motion** contains incremental event-recall information beyond the frozen SI-4 baseline.

Primary references:
- Carvalho et al. (2024), *BAMS*, DOI `10.1175/BAMS-D-22-0171.1`.
- SWEX project science objectives, NSF NCAR/EOL: `https://www.eol.ucar.edu/field_projects/swex`.
- Duine et al. (2026), *Atmospheric Research* 337, 108920, DOI `10.1016/j.atmosres.2026.108920`.

Hydraulic jump, rotor and wave breaking remain **susceptibility mechanisms, not inferred proof** from HRRR pressure-level fields.

## Frozen data/provenance boundary

Use only the already-completed immutable 2024 fixed-F24 upstream archive and the existing frozen SI-4 2024 development rows.

Allowed predictors are issuance-time HRRR fields already archived at the frozen five points and pressure levels:
- 850/700/500-hPa `u` and `v` wind;
- 850/700/500-hPa wind speed;
- 850/700/500-hPa pressure vertical velocity (`VVEL` / omega);
- terrain/regime/zone metadata already available at issuance;
- existing frozen SI-4 baseline probability and issuance-time diagnostics only for comparison/augmentation.

Forbidden:
- any 2025 row, label, miss, error analysis or coefficient selection;
- verifying HADS/RAWS winds as predictors;
- fire association as predictor/target;
- post-event reports or famous-event selection;
- replacing missing values with fabricated values;
- choosing folds/cases from outcomes.

Verifying 2024 observations remain label-only.

## Frozen feature definition

For each archived point and pressure level, pressure vertical velocity follows the GRIB convention used in the archive. The evaluator must confirm units/sign metadata before scoring; if sign cannot be verified, fail closed rather than infer it from labels.

Define cross-barrier wind using the same frozen zone/terrain orientation convention already used by SI-4 terrain diagnostics. Do not optimize orientation against labels in this experiment.

For each valid row, compute:

1. `downward_omega_850` and `downward_omega_700`: positive-only downward pressure vertical velocity after metadata-verified sign normalization.
2. `xb_850` and `xb_700`: positive cross-barrier wind components toward the south-coast lee side under the frozen terrain orientation.
3. `momentum_descent_850 = downward_omega_850 * max(0, xb_850)`.
4. `momentum_descent_700 = downward_omega_700 * max(0, xb_700)`.
5. `vertical_coherence`: 1 only when 850- and 700-hPa cross-barrier components have the same lee-directed sign and both downward-omega terms are positive; otherwise 0.
6. `descent_coherence_index = vertical_coherence * sqrt(max(0,momentum_descent_850) * max(0,momentum_descent_700))`.
7. `midlevel_release_guard`: a diagnostic flag requiring that the 500-hPa cross-barrier flow does not reverse strongly against the 700-hPa lee-directed flow. This is a fixed physical guard, not a label-tuned threshold.

Aggregation across the five frozen points must be predeclared in code before any score is produced. Default allowed summaries are median and maximum only; the evaluator may compare these two summaries within training folds, but the choice must be made independently inside each chronological training fold and then applied untouched to that fold's score period.

## Candidate form and tuning boundary

The baseline SI-4 probability remains the anchor. The candidate may add only one monotonic bounded adjustment derived from `descent_coherence_index`, with sign fixed positive by hypothesis.

Within each chronological training fold only, the evaluator may choose from this predeclared bounded coefficient grid:

`[0.00, 0.02, 0.04, 0.06, 0.08]`

and from the two predeclared aggregation summaries (`median`, `maximum`). No other coefficient, threshold, transform, orientation, level, point subset or interaction may be introduced after scoring begins.

If the selector repeatedly chooses zero adjustment, the hypothesis is treated as no incremental value and rejected.

## Chronological development design

Use the repository's established 2024 chronological fold construction and exact same independent labels/metrics as other SI-4 promotion candidates. No random split.

All selector choices are fitted on the training side of each fold only. Score periods remain untouched until their fold-specific model is frozen.

## Predeclared gates

The candidate passes development only if **every** gate below passes on pooled score-only 2024 folds:

- event POD >= frozen baseline POD + **0.05 absolute**;
- event FAR no worse than frozen baseline;
- overall Brier no worse than frozen baseline;
- ROC AUC >= frozen baseline - **0.005**;
- hard-negative Brier no worse than frozen baseline;
- hard-negative FPR no worse than frozen baseline;
- spatial-zone precision >= frozen baseline - **0.01**;
- no material regime safety failure;
- gust output non-inferior (candidate does not alter gust unless separately predeclared, which this v1 does not);
- sufficient feature coverage is reported, with missing inputs remaining missing.

A statistically/operationally interesting submetric does not override a failed gate.

## Decision rule

- If **any** 2024 gate fails: reject `wave_momentum_descent_v1`; persist the evidence; **do not expose it to 2025**.
- If **all** 2024 gates pass: freeze feature transforms, aggregation choice logic, coefficient grid outcome and all thresholds, then permit exactly one score-only 2025 evaluation.
- Never retune from 2025 results.

## Infrastructure policy

Archive 404/5xx/timeouts, runner failures, package failures or metadata-read failures are infrastructure failures. Retry with bounded backoff or repair plumbing only. Never alter coefficients, fields, labels, transforms or gates to clear infrastructure.

## Audit requirements

Persist:
- exact branch/head and workflow run;
- immutable archive run/digest;
- row counts and missingness by predictor/point/level;
- verified VVEL units/sign metadata;
- chronological fold boundaries;
- per-fold selector choices;
- pooled and regime-specific baseline/candidate metrics;
- hard-negative, event-recall and spatial metrics;
- explicit pass/fail for every frozen gate;
- statement that 2025 was not loaded during development.
