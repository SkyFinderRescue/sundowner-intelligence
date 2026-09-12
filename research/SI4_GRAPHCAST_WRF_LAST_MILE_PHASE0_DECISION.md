# SI-4 GraphCast → WRF Last-Mile Phase-0 Decision

Status: **REJECTED IN PHASE 0 — NO 2024 OUTCOME SCORING — NO 2025 EXPOSURE — NO PRODUCTION CHANGE**

## Decision

`graphcast_wrf_last_mile_v1` does not advance beyond Phase 0 under the frozen predeclaration.

## Issuance-safe archive finding

The authoritative NOAA/NWS GraphCastGFS public archive is issuance-safe in concept because GraphCastGFS uses NCEP GDAS analysis states available at initialization time and runs at 00/06/12/18 UTC. However, NOAA documents that the public archive begins at **12Z 2024-02-05**, not 2024-01-01. NOAA also documents a 2024 model-lineage change: GraphCastGFS v1.0 was followed by the v2.0/EAGLE SOLO lineage beginning 06Z 2024-04-24.

Therefore a complete, outcome-blind, version-frozen 2024 replay cannot be formed solely from archived NOAA GraphCastGFS forecast products. Filling January would require reconstructing GraphCast from archived GDAS. Under the predeclaration, such reconstruction is acceptable only if the historical preprocessing, model weights/version, unit conversions, and output-generation chain can be reproduced deterministically. That exact full-year chain has not been independently demonstrated.

Primary archive reference: NOAA Open Data Registry entry for `noaa-nws-graphcastgfs-pds` (GraphCastGFS/EAGLE), which states that GraphCastGFS v1.0 products were uploaded beginning 12Z 2024-02-05 and describes the later v2.0/EAGLE lineage.

## Compute feasibility finding

The predeclaration also requires documented feasibility for a complete chronological 2024 terrain-resolving WRF experiment before any occurrence labels are inspected. No reproducible full-year compute path has been demonstrated in the present SI-4 execution environment. A small-case scientific demonstration is insufficient for the frozen complete-calendar requirement.

## Consequence

Because Phase 0 requires **all** feasibility checks before outcome scoring, failure to establish a complete deterministic initialization chain and full-year compute feasibility is sufficient to reject the lane before any 2024 event metrics are computed.

No ERA5/reanalysis substitution, future-cycle substitution, partial-calendar scoring, event-only case selection, retrospective source shopping, threshold rescue, or 2025 exposure is authorized.

The Fovell et al. (2025) GraphCast-forced WRF architecture remains scientifically relevant as literature evidence for hybrid AI-global + terrain-resolving downscaling, but it is not an SI-4 promotion candidate under the current frozen reproducibility requirements.

## Production isolation

- SI-3.1 on `main` remains untouched.
- PR #6 remains draft/open/unmerged.
- Current production decision remains **NO PROMOTION**.
