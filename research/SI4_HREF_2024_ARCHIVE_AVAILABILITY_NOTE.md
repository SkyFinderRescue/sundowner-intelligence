# SI-4 HREF 2024 Archive Availability Decision

Date: 2026-08-30
Candidate: `initial_condition_ensemble_downslope_v1`
Status: INFRASTRUCTURE / AVAILABILITY ONLY — NO SCIENCE RESULT
Production status: NO PROMOTION; SI-3.1 on `main` remains authoritative.

## Verified archive issue

During the full 2024 HREF member archive on PR #6 head `dce037ac5712e9dd4b6305e6aa96ed0ab1bb90a9`, all Phase-0 HREF feasibility, field-inventory, exact-F24, member-alignment and point-extraction probes passed. The full-year run failed only because issuance `2024-11-27T00:00:00.000Z` repeatedly returned HTTP 404 for the frozen `hrrr_current` member at the frozen `cuyama_interior` point for all required fields (`u10`, `v10`, surface gust and surface pressure). The same failure persisted across the workflow's bounded extractor retries and three outer monthly attempts.

No observations, labels, event outcomes, fire association, 2025 data or forecast errors were inspected to identify or select this issuance. This is archive availability evidence only.

## Frozen availability rule

Consistent with the existing Phase-0 predeclaration and decision, the archive now excludes the entire affected issuance (`2024-11-27 00Z`) from every member and point so retained rows remain a matched 10-member x 5-point ensemble at exact F24.

This changes only archive/plumbing availability handling. It does **not** change:

- HREF member identities;
- 00Z/12Z issuance schedule except the single availability exclusion;
- exact F24 valid-time alignment;
- five frozen points;
- authorized fields (`u10`, `v10`, surface gust, surface pressure);
- any feature transform, model coefficient, probability mapping or threshold;
- labels or evaluation gates;
- the 2025 firewall.

The affected issuance is not replaced with a label-selected date and is not imputed. Missing stays missing. Full-year retained row expectation is therefore `36,450` rather than `36,500`.

## Science authorization

If the complete archive passes with this frozen outcome-blind availability rule, 2024-only chronological development may proceed under the already-predeclared gates. Any gate failure rejects the candidate before 2025 exposure.
