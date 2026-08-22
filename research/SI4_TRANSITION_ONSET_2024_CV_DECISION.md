# SI-4 Transition/Onset 2024 Chronological-CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate scored

`transition_onset_v1a_archive6h`

This is the archive-cadence adaptation of the predeclared transition/onset hypothesis. The frozen F24 upper-air archive could not support the original shorter vertical-profile tendency, so the implementation used **6 h vertical-profile tendency plus 3 h surface tendency**. This adaptation was fixed before scoring and did not use 2025 observations or outcomes.

## 2024-only chronological-CV result

- Rows: **6,098**
- Triggered rows: **143**
- Baseline event POD: **0.3742938**
- Candidate event POD: **0.3870056**
- Absolute POD change: **+0.0127118**
- Baseline event FAR: **0.6889671**
- Candidate event FAR: **0.6903955**
- `winner_eligible_for_single_frozen_2025_score = false`

The predeclared recall gate required an absolute event-level POD improvement of at least `0.05`. The candidate improved POD by only about `0.0127`, so it fails the gate even though FAR remained within the stated non-inferiority tolerance.

## Decision

**Reject `transition_onset_v1a_archive6h`.**

Do not:

- rerun the unchanged candidate seeking a favorable split/result;
- relax the predeclared gates;
- inspect individual 2025 missed-event rows to rescue or retune it;
- expose this candidate to the frozen 2025 score-only holdout;
- alter thresholds or coefficients based on this failed development result.

The result remains useful negative evidence: broad vertical-profile tendency plus surface evening-transition signals, at the cadence supported by the frozen archive, did not recover enough independent 2024 event recall to justify holdout exposure.

## Leakage/provenance statement

- Development period: 2024 only.
- Chronological CV only.
- Future verifying observations remained label-only.
- Fire association remained outcome-only.
- Missing values were not converted into event-favorable values.
- No 2025 candidate tuning or row-level rescue was performed.
