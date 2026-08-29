# SI-4 NBM probabilistic surface ensemble v1 — 2024 CV decision

Status: **REJECTED / NO 2025 EXPOSURE / NO PRODUCTION CHANGE**

Validated workflow: `SI-4 NBM Probabilistic 2024 Chronological CV` run `33227004369` (success).
Validated code head: `4b6a38422dc6eb6420e342eada7403bb39b31c33`.
Artifact digest: `sha256:3b4a3959bc078d7e16e53a74d333b8c8069b4304f47b9f654af4cc2dd50e22a4`.
Source archive: `SI-4 NBM 2024 Expanded Archive` run `33224477607`, 284 exact-F024 cases / 1,420 five-point rows, no observations/outcomes/2025 in the archive.

## Leakage-safe evaluation

The candidate was scored only in chronological 2024 development folds. It matched 1,418 rows and scored 800 held-forward rows (85 event rows; 157 frozen hard negatives). The NBM station mapping was frozen before outcome scoring using nearest frozen NBM point by great-circle distance. Thresholds were selected inside each training fold only to reach the same >=0.50 training POD rule. Future observations were label-only, fire association was outcome-only, and 2025 was not loaded.

## Aggregate evidence

| Metric | Frozen SI-4 development baseline | NBM candidate |
|---|---:|---:|
| Brier | 0.094495 | **0.087345** |
| AUC | 0.791016 | **0.834044** |
| Event POD | **0.469388** | 0.346939 |
| Event FAR | 0.630769 | **0.595238** |
| Hard-negative Brier | 0.169063 | **0.139755** |
| Hard-negative FPR | 0.515924 | **0.235669** |
| Spatial row precision | 0.292308 | **0.370370** |
| Gust MAE (mph) | **4.844431** | 4.960810 |
| Gust RMSE (mph) | **6.744220** | 6.814485 |
| Gust bias (mph) | -0.624868 | **0.064585** |

The NBM distribution materially improved calibration/discrimination, false-alarm behavior, hard-negative rejection, and spatial row precision. However, it reduced event POD by about 0.122 absolute rather than achieving the required +0.05 gain. Western AUC also declined from 0.875677 to 0.850417, failing regime safety. Gust metrics remained within the frozen non-inferiority allowance.

## Frozen gate result

Passed: event FAR, Brier, AUC, hard-negative Brier, hard-negative FPR, spatial precision, gust non-inferiority.

Failed: **event POD gain** and **regime safety**.

Because every gate is mandatory, `nbm_probabilistic_surface_ensemble_v1` is rejected. It must not be exposed to 2025, tuned against 2025, merged into `si4-research`, or promoted to production. NBM remains useful as independent probabilistic guidance/benchmark evidence, but this candidate formulation does not solve the measured SI-4 event-recall requirement.

SI-3.1 production remains unchanged. PR #6 remains draft/unmerged. Current SI-4 promotion status remains **NO PROMOTION**.
