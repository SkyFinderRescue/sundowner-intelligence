# SI-4 Score-Based HRRR State Assimilation Phase-0 Decision

Date: 2026-09-12
Lane: `score_da_hrrr_state_v1`
Status: **REJECTED IN PHASE 0 — NO 2024 OUTCOME SCORING — NO 2025 EXPOSURE — NO PRODUCTION CHANGE**

## Decision

`score_da_hrrr_state_v1` does not advance beyond Phase 0 under the frozen predeclaration.

## Exact-F24 compatibility finding

The cited score-based data-assimilation architecture is a single-time atmospheric-state estimator. It learns a prior over regional HRRR-like analysis states and assimilates sparse station observations into that state at inference time. The published architecture does not provide a physical forecast-time dimension or an independently validated mechanism to propagate the corrected state to the frozen SI-4 exact-F24 valid time.

Using a separate numerical or ML forecast model after the score-based analysis would create a different architecture and therefore cannot be treated as completion or rescue of this lane.

Because exact-F24 compatibility is a frozen Phase-0 requirement, the lane fails before any 2024 Sundowner occurrence labels are scored.

## Compute/reproducibility finding

The published proof of concept also requires a large learned HRRR-state prior and GPU-heavy training/inference. A complete 2024 chronological, issuance-safe, exact-F24 replay with frozen observation-latency reconstruction has not been demonstrated in the present SI-4 execution environment.

This is independently sufficient to fail the frozen full-year compute/reproducibility requirement.

## Consequence

No 2024 occurrence scoring is authorized for this lane. No threshold tuning, architecture rescue, downstream forecast-model substitution, partial-calendar scoring, ERA5/reanalysis substitution, later-cycle substitution, future-observation use, or 2025 exposure is permitted.

Any future candidate that combines score-based analysis with a separate forecast propagator must be predeclared as a new materially different architecture before outcome inspection.

## Production isolation

- SI-3.1 on `main` remains untouched and authoritative.
- PR #6 remains open, draft, and unmerged.
- Current production decision remains **NO PROMOTION**.
