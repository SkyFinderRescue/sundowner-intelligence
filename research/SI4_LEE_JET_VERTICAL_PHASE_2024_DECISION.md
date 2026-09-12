# SI-4 lee-jet vertical-phase 2024 decision

Status: **REJECTED IN 2024 DEVELOPMENT — DO NOT SCORE ON 2025 — NO PRODUCTION CHANGE**

Candidate: `lee_jet_vertical_phase_v1`

Authoritative chronological-CV workflow: **SI-4 Lee-Jet Vertical Phase 2024 Chronological CV run #4**, run id `32712603655`, on `si4-research` head `06440d691c2834ceb2f9f5ea0a18f98c9b80202e`.

The workflow completed successfully after plumbing-only corrections. The scientific result therefore represents the predeclared 2024-only candidate, not a runner/archive failure. The immutable upstream archive remained run `32552410978`, head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`, exact F24, with no 2025 holdout exposure.

## Frozen 2024 chronological-CV result

Validation aggregate covered 4,880 scored rows and 439 event rows across the three chronological validation folds. The source dataset contained 7,276 rows and 628 event rows.

| Metric | Frozen SI-4 development baseline | `lee_jet_vertical_phase_v1` |
| --- | ---: | ---: |
| Brier | 0.0549097266 | 0.0550178278 |
| ROC AUC | 0.9313447043 | 0.9308770073 |
| Event POD | 0.5828791479 | 0.5545772611 |
| Event FAR | 0.2040142405 | 0.2098699764 |
| Hard-negative Brier | 0.0646035117 | 0.0639957623 |
| Hard-negative FPR | 0.1222816135 | 0.1263368905 |
| Spatial zone precision | 0.6156251410 | 0.6168812104 |

## Predeclared gate decisions

- Event POD gain >= +0.05 absolute: **FAIL**; POD decreased by about 0.0283.
- Event FAR no worse: **FAIL**.
- Overall Brier no worse: **FAIL**.
- Overall AUC >= baseline - 0.005: **PASS**.
- Hard-negative Brier no worse: **PASS**.
- Hard-negative FPR no worse: **FAIL**.
- Spatial precision >= baseline - 0.01: **PASS**.
- Regime safety: **PASS** under the frozen evaluator.
- Gust non-inferiority: **PASS / unchanged** because this occurrence candidate does not alter gust output.

Because multiple predeclared 2024 gates failed, `passes_all=false` and `winner_eligible_for_single_frozen_2025_score=null`. Per the frozen protocol, this candidate is rejected and **must not be exposed to or tuned against the 2025 holdout**.

The modest hard-negative Brier and spatial-precision improvements are retained as research evidence but do not override the failed POD, FAR, overall Brier, and hard-negative FPR gates. No transform, coefficient, threshold, label, or gate is changed after seeing this result.

SI-3.1 on `main` remains the production baseline. PR #6 remains draft/unmerged. Current production-promotion decision remains **NO PROMOTION**.
