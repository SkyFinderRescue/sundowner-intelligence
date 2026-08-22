# SI-4 Validation Milestone — 2026-08-16

Status: **RESEARCH ONLY — NOT FOR PRODUCTION**

This record preserves the current independently measured SI-4 milestone while keeping `main` as the verified SI-3 production baseline. PR #6 remains draft and unmerged.

## Authoritative frozen holdout

- Branch/head evaluated: `si4-research` at `764dd885590970bfc272a0dbd0a2e8ae691cb3ed`.
- Workflow: **SI-4 All-Season Frozen Holdout #31**, run `31925677059`.
- Result: completed successfully.
- Training window: 2024 only.
- Holdout window: frozen 2025 only.
- Forecast lead: fixed 24 h.
- Independent holdout rows: 7,279.

### SI-4 vs frozen SI-3 baseline

- Weighted Brier: SI-3 `0.07951`; SI-4 `0.05249` (~34.0% reduction).
- Western AUC: `0.843 -> 0.878`.
- Hybrid AUC: `0.788 -> 0.819`.
- Eastern AUC: `0.847 -> 0.884`.
- Gust MAE: `5.78 -> 4.90 mph`.
- Mean gust bias: `-2.60 -> -0.04 mph`.

## Hard-negative promotion gate

Thresholds were selected from 2024 only and then frozen before 2025 scoring.

- Aggregate hard-negative false-positive rate: `58.8% -> 23.0%`.
- Aggregate negative-only Brier: `0.0260 -> 0.0404` (worse), driven by the western regime.

The negative-only Brier regression is a documented promotion concern. It must not be tuned away using 2025 holdout outcomes.

## NDFD benchmark isolation

NDFD development remains isolated on `si4-ndfd-benchmark` and is not merged into `si4-research` or `main`.

The range-extraction pilot-equivalence gate passed. The larger predeclared 2024-only development sample also completed successfully with exact archive provenance preserved and 2025 untouched.

Current development-only diagnostics from the 2024 exact-F24 range sample:

- exact-F24 HADS-matched rows: 100;
- mean absolute NDFD gust error: `5.2404438081603395 mph`;
- mean direction error: `50.73 deg`;
- max Santa Barbara grid distance: `1.2248563116335218 km`;
- minimum effective lead: `24.00777777777778 h`.

These are **development diagnostics only**, not matched NDFD-vs-SI skill evidence and not a superiority claim.

## Guardrails preserved

- No future-observation leakage.
- Fire association remains outcome-only and is excluded from Sundowner target definition.
- Missing data remains missing; unavailable NDFD exact-F24 targets are not substituted after the fact.
- Transient upstream service failures are infrastructure failures, not model evidence.
- RRFS/REFS remains shadow-only until it independently wins.
- No claim of superiority over NWS/NDFD until the matched archived benchmark is complete.

## Remaining promotion gates

- Full final-QC SWEX observation ingestion and feature extraction.
- Matched archived NWS/NDFD fixed-24h benchmark with thresholds frozen from 2024 and 2025 score-only.
- HRRR forecast-cycle agreement skill evaluation.
- RRFS/REFS retrospective/live shadow benchmark.
- Direct GOES-West marine-layer feature validation.
- Cross-validated direction/regime/stability-conditioned terrain/gust correction.
- Event onset/peak/decay and spatial correctness scoring.
- Final ablation.
- Production release verification.
- Desktop 1440x1000 and iPhone 390x844 browser QA.

No production-promotion decision has been made.
