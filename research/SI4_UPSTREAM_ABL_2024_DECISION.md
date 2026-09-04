# SI-4 upstream ABL reservoir 2024 decision

Status: **REJECTED IN 2024 DEVELOPMENT — DO NOT SCORE ON 2025 — NO PRODUCTION CHANGE**

Candidate: `upstream_abl_reservoir_v1`

Authoritative chronological-CV workflow: **SI-4 Upstream ABL Reservoir 2024 Chronological CV run #10**, run id `32712968470`, evaluated on PR #6 after the immutable 2024 upstream ABL archive run `32585722096` (head `92bc3fcc22f87a8b068503f08145e8b0fefbf584`). The archive contained 4,380 exact-F24 rows, zero extraction failures, and complete PBL-height availability. The evaluator asserted 2024-only development, `holdout_2025_loaded=false`, future observations label-only, and fire association outcome-only.

## Frozen 2024 chronological-CV result

Validation aggregate covered 4,880 scored rows and 439 event rows across the frozen chronological folds; the source development set contained 7,276 rows and 628 event rows.

| Metric | Frozen SI-4 development baseline | `upstream_abl_reservoir_v1` |
| --- | ---: | ---: |
| Brier | 0.0549097266 | 0.0549097266 |
| ROC AUC | 0.9313447043 | 0.9313447043 |
| Event POD | 0.5828791479 | 0.5959510433 |
| Event FAR | 0.2040142405 | 0.2092379505 |
| Hard-negative Brier | 0.0646035117 | 0.0646035117 |
| Hard-negative FPR | 0.1222816135 | 0.1222816135 |
| Spatial zone precision | 0.6156251410 | 0.6123207682 |

## Predeclared gate decisions

- Event POD gain >= +0.05 absolute: **FAIL**; POD improved only about +0.0131.
- Event FAR no worse: **FAIL**.
- Overall Brier no worse: **PASS / unchanged**.
- Overall AUC >= baseline - 0.005: **PASS / unchanged**.
- Hard-negative Brier no worse: **PASS / unchanged**.
- Hard-negative FPR no worse: **PASS / unchanged**.
- Spatial precision >= baseline - 0.01: **PASS**.
- Regime safety: **PASS** under the frozen evaluator.
- Gust non-inferiority: **PASS / unchanged** because this occurrence candidate does not alter gust output.
- Missing-data fail-closed: **PASS**.

Because the required recall gain was not achieved and FAR worsened, `passes_all=false` and `winner_eligible_for_single_frozen_2025_score=null`. Per the frozen protocol, this candidate is rejected and **must not be exposed to or tuned against the 2025 holdout**.

The modest POD increase is retained as 2024 development evidence, but it does not satisfy the predeclared promotion gate and cannot override the FAR failure. No transform, coefficient, threshold, label, or gate is changed after seeing this result.

SI-3.1 on `main` remains the production baseline. PR #6 remains draft/unmerged. Current production-promotion decision remains **NO PROMOTION**.
