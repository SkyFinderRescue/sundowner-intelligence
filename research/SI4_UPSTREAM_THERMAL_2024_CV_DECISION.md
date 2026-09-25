# SI-4 upstream thermal/subsidence 2024 chronological-CV decision

Status: **REJECTED IN 2024 DEVELOPMENT — DO NOT SCORE ON 2025 / DO NOT PROMOTE**

Candidate family: `upstream_thermal_subsidence_v1`

This decision is based only on leakage-safe 2024 chronological development evidence. The frozen 2025 holdout was not loaded or inspected for this candidate.

## Provenance

- SI-4 research PR: #6, draft/unmerged.
- Evaluated PR head: `0786d0cfa87390eb62b2cd82b14e808bf090808a`.
- SI-4 Upstream Thermal 2024 Chronological CV: run `32560527434`, run #2, completed successfully.
- Immutable upstream archive source: run `32552410978`, head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`.
- Upstream archive contract: 7,300 rows, zero extraction failures, exact F24, 2024 only, no production authorization.
- Frozen baseline upper-air source: authoritative all-season run `31925677059`.
- CV evaluator: `tools/evaluate-si4-upstream-thermal-2024-cv.js`.
- Candidate score artifact: `si4-upstream-thermal-2024-cv` from run `32560527434` (artifact ID `9472669993`; artifact ZIP SHA-256 `ed9ff334384b6644d4a78130b30507d182a6cb4e94ea3ea7402444cc3722be53`).

## 2024 chronological-CV result

Evaluator input contained 7,276 matched rows and 628 event rows. The scored chronological folds contained 4,880 rows and 439 events.

| Metric | Frozen SI-4 baseline | upstream_thermal_subsidence_v1 |
|---|---:|---:|
| Brier | 0.0549097 | 0.0557131 |
| AUC | 0.931345 | 0.932493 |
| Event POD | 0.582879 | 0.533350 |
| Event FAR | 0.204014 | 0.160391 |
| Hard-negative Brier | 0.0646035 | 0.0619031 |
| Hard-negative FPR | 0.122282 | 0.121133 |
| Spatial zone precision | 0.615625 | 0.617886 |

## Frozen gate result

- Event POD >= baseline +0.05 absolute: **FAIL**. POD decreased by about 0.0495 rather than increasing by >=0.05.
- Event FAR no worse: **PASS**.
- Overall Brier no worse: **FAIL**.
- AUC >= baseline -0.005: **PASS**.
- Hard-negative Brier no worse: **PASS**.
- Hard-negative FPR no worse: **PASS**.
- Spatial precision >= baseline -0.01: **PASS**.
- Regime safety: **FAIL**.
- Gust non-inferiority: **PASS / unchanged**.

Overall predeclared decision: `passes_all=false`.

## Scientific disposition

The full-year upstream thermal/subsidence evidence reduced false alarms and modestly improved hard-negative and spatial metrics, but it materially reduced event recall, slightly worsened Brier score, and failed regime safety. Under the predeclared promotion rules, this candidate is rejected before any 2025 exposure.

Do not alter its coefficients, transforms, thresholds, labels, case selection, or gates to make it pass. Do not score this candidate on the frozen 2025 holdout. A future upstream-physics hypothesis requires genuinely new independent physical evidence and a new 2024-only predeclaration.

The verified SI-3.1 production baseline on `main` remains untouched. PR #6 stays draft and unmerged. Current SI-4 promotion status remains **NO PROMOTION**.
