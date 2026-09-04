# SI-4 HREF 2024 Full-Ensemble Archive Decision

Status: PHASE-0 ARCHIVE / REPRODUCIBILITY GATE PASSED — 2024-ONLY CHRONOLOGICAL DEVELOPMENT AUTHORIZED
Candidate: `initial_condition_ensemble_downslope_v1`
Production status: NO PROMOTION; SI-3.1 on `main` remains authoritative. PR #6 must remain draft/unmerged.

## Decision

The frozen HREF 2024 full-member archive has completed successfully under the predeclared Phase-0 archive/reproducibility contract. This is infrastructure/provenance evidence only; no forecast outcomes were scored and no scientific accuracy conclusion is implied.

The completed workflow is GitHub Actions run `33415242408` (`SI-4 HREF 2024 Full Ensemble Archive`) on PR #6 head `fcfaa320988978823da6ff8173d20304b854a723`. All twelve monthly jobs and the final combine job completed successfully.

The immutable combined workflow artifact is:

- artifact: `si4-href-ensemble-2024-full`
- artifact id: `9768310410`
- GitHub artifact digest: `sha256:799b4b92c08e8dd0b47e6b84493066d02eb77c58d79d7108314ead05a82df08a`
- retained rows: `35,850`
- member count: `10`
- frozen points: `5`
- exact forecast lead: `24 h`
- issuance schedule: `00Z` and `12Z`, except the explicit pre-outcome archive-availability exclusions below
- failures in retained archive: `0`
- science scoring performed: `false`
- observations/outcomes used for archive selection: `false`
- 2025 holdout loaded: `false`
- production change authorized: `false`

## Frozen archive-availability exclusions

Thirteen exact-F24 issuances were excluded only after persistent required-member archive unavailability was established through bounded retries, without observing labels/outcomes:

- `2024-11-27T00:00:00.000Z`
- `2024-11-27T12:00:00.000Z`
- `2024-11-28T00:00:00.000Z`
- `2024-11-28T12:00:00.000Z`
- `2024-11-29T00:00:00.000Z`
- `2024-11-29T12:00:00.000Z`
- `2024-11-30T00:00:00.000Z`
- `2024-11-30T12:00:00.000Z`
- `2024-12-01T00:00:00.000Z`
- `2024-12-01T12:00:00.000Z`
- `2024-12-02T00:00:00.000Z`
- `2024-12-08T12:00:00.000Z`
- `2024-12-09T00:00:00.000Z`

These issuances are not replaced with outcome-selected cases and are not imputed. Missing stays missing. Transient null-status/5xx/timeout behavior remains infrastructure evidence only and is not interpreted as forecast evidence.

## Science authorization

Phase 0 is now closed as `PASS_ARCHIVE_REPRODUCIBILITY`. The candidate is authorized to proceed to the already-predeclared **2024-only chronological development/CV** on exact common valid times. This authorization does not permit any 2025 observation/outcome exposure.

The frozen gates remain unchanged and all must pass before any 2025 score is allowed:

- event POD/recall >= baseline +0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety with no material western/eastern/hybrid collapse;
- gust MAE/RMSE and bias non-inferior where ensemble gust is evaluated;
- provenance/exact-valid-time/member contract passes with no leakage.

Any failed 2024 gate rejects `initial_condition_ensemble_downslope_v1` before 2025 exposure. Previously rejected SI-4 candidates remain rejected, RRFS remains shadow-only, fire association remains outcome-only, and SWEX final-QC 600.034 remains a separate pending independent-evidence source.
