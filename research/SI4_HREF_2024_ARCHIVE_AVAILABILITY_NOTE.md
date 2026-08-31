# SI-4 HREF 2024 Archive Availability Decision

Date: 2026-08-30
Candidate: `initial_condition_ensemble_downslope_v1`
Status: INFRASTRUCTURE / AVAILABILITY ONLY — NO SCIENCE RESULT
Production status: NO PROMOTION; SI-3.1 on `main` remains authoritative.

## Verified archive issue

During the full 2024 HREF member archive on PR #6, all Phase-0 HREF feasibility, field-inventory, exact-F24, member-alignment and point-extraction probes passed. Subsequent full-year extraction attempts identified nine persistently incomplete exact-F24 issuances under the frozen member/point/field contract:

- `2024-11-27T00:00:00.000Z`
- `2024-11-27T12:00:00.000Z`
- `2024-11-28T00:00:00.000Z`
- `2024-11-28T12:00:00.000Z`
- `2024-12-01T00:00:00.000Z`
- `2024-12-01T12:00:00.000Z`
- `2024-12-02T00:00:00.000Z`
- `2024-12-08T12:00:00.000Z`
- `2024-12-09T00:00:00.000Z`

The failures were repeated HTTP 404 responses for required frozen HREF member data after bounded retries. The newest failure was `2024-12-09T00:00:00.000Z`: the required `hiresw_arw_lag12` member returned 404 for `u10`, `v10`, surface gust and surface pressure through all five inner retries, and the December monthly job reproduced the failure across all three outer attempts at multiple frozen points. This occurred after hundreds of earlier December extraction tasks had succeeded.

No observations, labels, event outcomes, fire association, 2025 data or forecast errors were inspected to identify or select any of these issuances. This is archive availability evidence only.

## Frozen availability rule

Consistent with the existing Phase-0 predeclaration and decision, the archive excludes each affected issuance in full from every member and point so retained rows remain matched 10-member x 5-point ensembles at exact F24.

This changes only archive/plumbing availability handling. It does **not** change:

- HREF member identities;
- the 00Z/12Z issuance schedule except the nine explicit availability exclusions;
- exact F24 valid-time alignment;
- five frozen points;
- authorized fields (`u10`, `v10`, surface gust, surface pressure);
- any feature transform, model coefficient, probability mapping or threshold;
- labels or evaluation gates;
- the 2025 firewall.

The affected issuances are not replaced with label-selected dates and are not imputed. Missing stays missing. Full-year retained row expectation is therefore `36,050` rather than `36,500`.

## Science authorization

If the complete archive passes with this frozen outcome-blind availability rule, 2024-only chronological development may proceed under the already-predeclared gates. Any gate failure rejects the candidate before 2025 exposure.
