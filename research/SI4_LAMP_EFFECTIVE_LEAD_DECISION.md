# SI-4 LAMP effective-lead decision

Date: 2026-08-29 UTC
Candidate: `issuance_time_lamp_assim_v1`
Status: **REJECTED UNDER FROZEN FIXED-24H DESIGN; NO 2025 EXPOSURE; NO PROMOTION**

## Decision basis

The earlier archive-feasibility pilot established reproducible access to the 2024 NOAA LAMP annual archive and the presence of 25 standard hourly UTC/WDR/WSP/WGS slots. It did **not** independently establish that slot index 23 has an effective lead of exactly 24.0 hours.

A dedicated plumbing-only effective-lead probe was therefore run before any science scoring or verifying observations were read:

- workflow: `SI-4 LAMP Effective Lead Probe`
- run: `33241736440`
- isolated branch: `si4-lamp-assim-review`
- head: `0342c91be4c2150cb1e97e1c0bc5d052bccd9a54`
- source member: `lmp_lavtxt.202401.0030z.gz`
- member SHA-256: `7f42a8292509cfdf103c517fa77627302552e5dc7445c0959aeb8c2d7444db99`
- station: `KSBA`
- `science_scoring_performed=false`
- `verifying_observations_read=false`

The archived standard 00:30 UTC LAMP bulletin is issued at `:30`, while its `UTC` guidance row is valid on whole UTC hours. For every inspected daily KSBA block, the 25 standard slots therefore have effective leads:

`0.5, 1.5, 2.5, ..., 23.5, 24.5 h`

Exact findings:

- exact effective 24.0 h slot present: **false**
- slot index 23 effective lead: **23.5 h**
- slot index 24 effective lead: **24.5 h**
- no observations, outcomes, thresholds, labels, coefficients, 2025 rows, or event misses were consulted in reaching this result.

## Frozen-contract consequence

The predeclared experiment requires **exact fixed 24 h wherever the archived bulletin supplies that projection**. The archive does not supply an exact 24.0 h effective lead on this standard issuance/validity grid. Recasting 23.5 h or 24.5 h guidance as exact F24, interpolating between them, or changing the fixed-lead rule after archive inspection would violate the frozen design and would make comparison with the existing SI-4 fixed-lead evidence non-identical.

Therefore `issuance_time_lamp_assim_v1` is rejected **before scientific scoring**. No 2024 outcome evaluation and no 2025 score are authorized for this candidate under the current fixed-24h contract.

This is an experimental-design/provenance rejection, not evidence that LAMP lacks meteorological skill. A future materially different experiment could predeclare a 24.5 h LAMP lead or another issue-time alignment, but it must be treated as a new protocol rather than used to rescue this frozen candidate.

## Production status

- SI-3.1 on `main`: unchanged.
- PR #6: remain draft/open/unmerged.
- SI-4 production promotion: **NO**.
- This decision does not authorize any change to production or any 2025 retuning.
