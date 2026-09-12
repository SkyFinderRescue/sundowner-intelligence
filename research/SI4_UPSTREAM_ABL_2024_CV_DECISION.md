# SI-4 upstream ABL reservoir 2024 chronological-CV decision

Status: **REJECTED IN 2024 DEVELOPMENT — DO NOT SCORE ON 2025 / DO NOT PROMOTE**

Candidate family: `upstream_abl_reservoir_v1`

This decision is based only on leakage-safe 2024 chronological development evidence. The frozen 2025 holdout was not loaded or inspected for candidate tuning or scoring.

## Provenance

- SI-4 research PR: #6, draft/unmerged.
- Evaluated PR head: `2a3c60c20fb44c38ddfaa0e625e349730bf0e956`.
- SI-4 Upstream ABL Reservoir 2024 Chronological CV: run `32597946159`, run #1, completed successfully.
- Immutable ABL archive source: run `32585722096`, head `92bc3fcc22f87a8b068503f08145e8b0fefbf584`.
- ABL archive contract: 4,380 rows, zero extraction failures, exact F24, 2024 only, all 4,380 PBL-height values present, no production authorization.
- Frozen baseline upper-air source: authoritative all-season run `31925677059`.
- CV evaluator: `tools/evaluate-si4-upstream-abl-2024-cv.js`.
- Candidate score artifact: `si4-upstream-abl-2024-cv` from run `32597946159` (artifact ID `9482100958`; artifact ZIP SHA-256 `7cc4bf2bac61b54def41146f7db6c06e0676eaace070d57eb5c5ba2280f2747d`).

## Frozen hypothesis and fitting behavior

The candidate tested only the predeclared low-level upstream ABL reservoir contrasts derived from issuance-time HRRR F24 fields at Santa Ynez Valley, the Santa Barbara lee, and the western Channel. Its probability effect was constrained to a nonnegative, bounded logit uplift gated by existing pressure and mountain-wave support. Per-regime uplift coefficients were selected only inside prior chronological 2024 training windows, with alpha=0 available as the fail-closed option and hard-negative Brier protected during training.

In every chronological fold and every regime, the training-only selection chose **alpha = 0**. This is strong evidence that the available ABL reservoir modifier did not add robust probabilistic information beyond the existing SI-4 development baseline under its own predeclared constraints. The score remained identical in Brier/AUC/hard-negative probability metrics; a separately training-selected candidate operating threshold produced a small POD/FAR tradeoff but did not satisfy the promotion rules.

## 2024 chronological-CV result

Evaluator input contained 7,276 matched rows and 628 event rows. The scored chronological folds contained 4,880 rows and 439 events.

| Metric | Frozen SI-4 development baseline | upstream_abl_reservoir_v1 |
|---|---:|---:|
| Brier | 0.0549097 | 0.0549097 |
| AUC | 0.931345 | 0.931345 |
| Event POD | 0.582879 | 0.595951 |
| Event FAR | 0.204014 | 0.209238 |
| Hard-negative Brier | 0.0646035 | 0.0646035 |
| Hard-negative FPR | 0.122282 | 0.122282 |
| Spatial zone precision | 0.615625 | 0.612321 |

## Frozen gate result

- Event POD >= baseline +0.05 absolute: **FAIL**. Gain was about +0.0131, below the required +0.05.
- Event FAR no worse: **FAIL**. FAR increased from about 0.2040 to 0.2092.
- Overall Brier no worse: **PASS / identical**.
- AUC >= baseline -0.005: **PASS / identical**.
- Hard-negative Brier no worse: **PASS / identical**.
- Hard-negative FPR no worse: **PASS / identical**.
- Spatial precision >= baseline -0.01: **PASS**.
- Regime safety: **PASS**.
- Gust non-inferiority: **PASS / unchanged**.
- Missing-data fail-closed behavior: **PASS**.

Overall predeclared decision: `passes_all=false`.

## Scientific disposition

`upstream_abl_reservoir_v1` is rejected before any 2025 score. The chronological training process repeatedly chose a zero probability uplift, and the only observed aggregate event-recall change came from the training-selected operating threshold, which failed the no-worse FAR gate and did not approach the required +0.05 POD gain.

Do not change its coefficients, transforms, thresholds, labels, cases, or gates to make it pass. Do not score this candidate on the frozen 2025 holdout. The final-QC SWEX observation order remains the highest-value independent external evidence still pending; do not duplicate that accepted order.

The verified SI-3.1 production baseline on `main` remains untouched. PR #6 stays draft and unmerged. Current SI-4 promotion status remains **NO PROMOTION**.
