# SI-4 Upstream ABL Reservoir 2024 Chronological-CV Decision

Status: **REJECTED — RESEARCH ONLY — DO NOT SCORE ON 2025**

## Frozen experiment

Candidate family: `upstream_abl_reservoir_v1`.

The candidate used only the immutable 2024 upstream ABL archive (4,380 exact-F24 rows; zero extraction failures) and the authoritative frozen SI-4 baseline upper-air artifact. Development was chronological and 2024-only. The frozen 2025 holdout was not loaded. Fire association remained outcome-only, future observations remained label-only, gust output was unchanged, and missing values were not fabricated.

Authoritative workflow: `SI-4 Upstream ABL Reservoir 2024 Chronological CV` run `32757815680` on PR #6 head `bae43385c13c19fee9ecd42465e79233308d5943` (merge ref used by Actions).

Immutable ABL archive provenance: run `32585722096`, archive head `92bc3fcc22f87a8b068503f08145e8b0fefbf584`, 4,380 rows, PBL height present for all 4,380 rows.

Artifact: `si4-upstream-abl-2024-cv`, artifact ID `9531597456`, ZIP SHA-256 `e923bc52324e1a9682fd2883438cbe37537803d90b315620207a0e46de13beb9`.

## Aggregate 2024 chronological-CV result

Baseline:
- Brier: `0.0549097266`
- AUC: `0.9313447043`
- event POD: `0.5828791479`
- event FAR: `0.2040142405`
- hard-negative Brier: `0.0646035117`
- hard-negative FPR: `0.1222816135`
- spatial zone precision: `0.6156251410`

Candidate:
- Brier: `0.0549097266`
- AUC: `0.9313447043`
- event POD: `0.5959510433`
- event FAR: `0.2092379505`
- hard-negative Brier: `0.0646035117`
- hard-negative FPR: `0.1222816135`
- spatial zone precision: `0.6123207682`

## Frozen promotion-gate decision

The candidate failed the required development gates:
- event POD did not improve by the required `+0.05` absolute (gain was only about `+0.0131`);
- event FAR worsened (`0.2040` to `0.2092`).

Overall Brier and AUC were unchanged, hard-negative Brier/FPR were unchanged, spatial precision stayed within the non-inferiority allowance, regime safety passed, gust was unchanged, and missing-data behavior remained fail-closed. However, every frozen development gate must pass before a candidate may receive one score-only 2025 evaluation.

The fitted feature coefficients were effectively zero in all chronological folds/regimes, so the observed threshold-level change does not constitute enough independent development evidence to justify 2025 exposure.

Therefore `upstream_abl_reservoir_v1` is **REJECTED** and must not be exposed to the frozen 2025 holdout. It does not alter the current `NO PROMOTION` decision and does not authorize any change to `main` or SI-3.1 production.
