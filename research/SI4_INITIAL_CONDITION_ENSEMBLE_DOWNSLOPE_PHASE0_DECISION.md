# SI-4 Initial-Condition Ensemble Downslope — Phase 0 Decision

Status: PHASE 0 ARCHIVE/REPRODUCIBILITY GATE PASSED; 2024 SCIENCE SCORING NOT YET PERFORMED
Candidate: `initial_condition_ensemble_downslope_v1`
Production status: NO PROMOTION; SI-3.1 on `main` remains authoritative.

## Decision

The predeclared outcome-blind Phase 0 archive/reproducibility gate is satisfied sufficiently to authorize construction of the broader 2024-only HREF extraction/archive needed for chronological development. This decision does **not** authorize 2025 exposure and does **not** claim forecast skill.

## Verified Phase 0 evidence

All checks were run without observations/outcomes, future observations, fire association, or 2025 science data.

- Exact-F24 discovery: 12/12 predeclared 2024 dates were reachable with exact +24 h objects; 168 exact-F24 objects were found and byte-range/object verified.
- Official member identity / valid-time alignment: the frozen 10-member HREF construction was reproducible on 24 predeclared issuance samples; 240/240 expected member objects were verified and all 240/240 aligned to the exact +24 h valid time.
- Representative field metadata: NCSS metadata was reachable for all five frozen HREF model families. The fields consistently common across families are 10-m u/v wind, surface gust, and surface pressure. Temperature/humidity and pressure-level fields were not consistently common and therefore are **not** authorized as cross-member predictors under the current HREF path unless a separate predeclared availability gate is completed before any science scoring.
- Point extraction: the frozen 10-member x 5-point contract produced 50/50 successful extractions. Height-above-ground wind fields and surface gust/pressure are queried separately because NCSS applies `vertCoord` request-wide; this was a plumbing correction only and did not alter the scientific hypothesis, members, points, fields, lead, labels, transforms, thresholds, or gates.

## Frozen source contract for the next stage

Broader 2024 extraction must preserve:

1. Official HREF 10-member identities and exact valid-time alignment established by Phase 0c.
2. Exact F24 only.
3. The same five frozen physical points used by Phase 0e.
4. Cross-member predictors limited to fields demonstrated common in Phase 0d: 10-m u/v wind, surface gust, and surface pressure.
5. Separate NCSS requests for 10-m height-above-ground fields vs surface fields; this is extraction plumbing, not a science degree of freedom.
6. Exact issuance time, valid time, member ID/family, object/dataset provenance, extraction URL/request parameters, and missingness retained per row.
7. Missing stays missing. No imputation using future observations or retrospective analyses.
8. 2024 only until every frozen chronological-development gate passes.

## Next authorized work

Build the full 2024 HREF archive/extraction with deterministic calendar coverage independent of outcomes, then run the already-predeclared 2024 chronological development. Any archive gaps may be handled only through a deterministic availability rule established without observing labels/outcomes. Infrastructure failures remain infrastructure evidence only.

The frozen development gates remain unchanged: event POD >= baseline +0.05 absolute; FAR no worse; overall Brier no worse; AUC >= baseline-0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline-0.01; regime safety; gust MAE/RMSE and bias non-inferiority; exact provenance/leakage contract.

If any 2024 gate fails, reject the candidate and do not expose it to 2025.
