# SI-4 HRRR Forecast-Cycle Agreement 2024 Chronological CV Decision

Status: **RESEARCH ONLY — cycle-agreement candidate rejected for promotion at this stage.**

Evidence source: GitHub Actions `SI-4 HRRR Cycle Agreement 2024 CV` run `32016212412`, based on `si4-research` commit `11c9b2bb0ef41fc8bcb307ca7a305f9c7c4b28b2` and NOAA archived HRRR issuance-time pressure-level guidance.

## Frozen development design

- Development data only: 2024.
- 2025 holdout was not loaded.
- Fixed-lead archived HRRR cycle features were derived from issuance-time F18/F24/F30/F36 profile guidance.
- 11,712 upper-air rows were available in the 2024 development set.
- Chronological H2-early / H2-mid / H2-late test folds were scored by western, hybrid, and eastern regime.
- Candidate features were `wave_agreement_score`, `cross_barrier_agreement_score`, `bounded_wave_spread`, and `bounded_cross_barrier_spread`.
- Missing cycle features were not imputed.
- Future observations remained label-only and fire association was not used.

## Pooled chronological-CV result

Across 3,672 pooled 2024 test rows with 338 events:

Baseline:
- Brier: `0.05812500989051322`
- AUC: `0.9209436219265023`
- POD: `0.39349112426035504`
- hard-negative Brier: `0.07147660253625163`
- hard-negative FPR at train-matched POD: `0.3973509933774834`

Cycle-agreement candidate:
- Brier: `0.05777320139498584`
- AUC: `0.9237051997884447`
- POD: `0.40828402366863903`
- hard-negative Brier: `0.07335275490565911`
- hard-negative FPR at train-matched POD: `0.3730684326710817`

Predeclared gates:
- overall Brier improves: **PASS**
- AUC non-inferior: **PASS**
- POD non-inferior: **PASS**
- hard-negative FPR non-inferior: **PASS**
- hard-negative Brier non-inferior: **FAIL**

`eligible_for_one_time_2025_freeze = false`.

## Decision

Do **not** expose the 2025 holdout to this HRRR cycle-agreement candidate and do **not** add the candidate to the SI-4 production path. The small overall Brier/AUC/POD gains are insufficient because the predeclared hard-negative Brier gate failed. This negative result is evidence and must not be tuned away using 2025.

The cycle-history extraction infrastructure remains valid for diagnostics, event analysis, and future materially different hypotheses, but any new cycle candidate must be justified from 2024-only development or independent physical evidence before another frozen holdout decision is considered.

The already independently validated non-satellite surface-coupling candidate remains the research leader. Production `main` remains unchanged.
