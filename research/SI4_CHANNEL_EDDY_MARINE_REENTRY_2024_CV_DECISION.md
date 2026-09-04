# SI-4 Channel-Eddy / Marine Re-entry 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`channel_eddy_marine_reentry_v1`

This candidate was predeclared before scoring and tested whether issuance-time HRRR Santa Barbara Channel near-surface turning/shear and coast-offshore contrasts could identify a marine-boundary-layer re-entry configuration that suppresses false Sundowner alarms. It used fixed-F24 2024 forecast predictors only. Verifying observations were label-only; 2025 was not loaded.

## Immutable input provenance

- Frozen SI-4 baseline upper-air artifact: authoritative all-season run `31925677059`.
- Frozen channel-eddy archive: run `32833922569`, head `ce9c525271a8cdd7ff2930e07415dd6cfed2c2af`.
- Channel archive rows: **7,300**; extraction failures: **0**.
- PBL height present: **7,300/7,300**.
- MSLP present: **7,300/7,300**.
- Chronological-CV workflow: `SI-4 Channel Eddy 2024 Chronological CV` run `32844397052`.
- Scored rows: **7,276**; events: **628**; missing channel predictors: **0**.

## 2024 chronological-CV result

The training folds selected a zero channel-eddy adjustment (`alpha = 0`) in every reported validation fold. Consequently candidate probabilities were identical to the frozen baseline on the pooled score-only folds.

Baseline and candidate were therefore exactly equal on the reported pooled metrics:

- Rows: **4,880**
- Events: **439**
- Brier: **0.0549097266116447**
- ROC AUC: **0.9313447043127121**
- Event POD: **0.5828791478985421**
- Event FAR: **0.20401424046197403**
- Hard-negative Brier: **0.06460351174791679**
- Hard-negative FPR: **0.12228161345619626**
- Spatial-zone precision: **0.6156251410441671**

## Predeclared gates

Passed:

- event POD no worse;
- overall Brier no worse;
- overall AUC non-inferior;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision non-inferior;
- regime safety;
- gust non-inferiority (unchanged probability-only candidate);
- missing-data fail-closed requirement.

Failed:

- **Event FAR improvement gate.** The predeclared requirement was candidate FAR `<= baseline FAR - 0.02 absolute`. Because the training procedure selected the allowed zero adjustment, candidate FAR remained **0.20401424046197403**, identical to baseline rather than improving by at least 0.02.

`passes_all = false`.

## Decision

**Reject `channel_eddy_marine_reentry_v1`. Do not expose it to the frozen 2025 holdout.**

The scientifically useful result is that, under the frozen geography, fields, deterministic transforms, bounded suppression role, chronological training procedure and gates, 2024 development evidence did not support a non-zero channel-eddy suppression adjustment. The explicit zero-adjustment option behaved as intended and prevented degradation, but it also means the tested formulation supplied no measurable operational benefit.

Do not rescue this candidate by changing the frozen points, transformation family, suppression thresholds, weights or FAR gate after seeing the result. A future Channel-related hypothesis must be materially different and independently justified rather than a retune of this formulation.

## Leakage/provenance statement

- 2024 development only.
- Fixed F24 issuance-time predictors only.
- Chronological CV only.
- Future HADS/RAWS observations label-only.
- Fire association outcome-only.
- Missing values remain missing.
- No 2025 development exposure.
- Runner/archive failures are infrastructure only and were not interpreted as model evidence.
