# SI-4 Transition/Onset Candidate — F24 Archive Availability Adaptation

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — DO NOT LOAD IN PRODUCTION**

This note is frozen before the first successful scientific score of the transition/onset candidate. The initial workflow attempt at commit `e2db2e4bec3676ccf37bdf8a27b3d2d87f8a2391` produced **zero eligible rows** and therefore exposed no 2024 outcome metrics. The failure was caused by an archive-cadence mismatch: the authoritative fixed-24-h HRRR upper-air artifact contains valid profiles at 00/06/12/18 UTC only, while the implementation requested a profile exactly 3 h earlier.

No 2025 holdout rows, missed events, or candidate performance metrics were inspected to make this correction.

## Availability-only adaptation

The physical hypothesis and all promotion gates in `SI4_TRANSITION_ONSET_2024_PREDECLARED.md` remain unchanged. The only adaptation is:

- vertical-profile stability, ridge-normal momentum, and mean-state critical-level tendency use the immediately preceding **available fixed-24-h profile, 6 h earlier**;
- upstream valley temperature/shortwave transition and pressure-gradient tendency remain **3 h** issuance-time forecast tendencies;
- all candidate thresholds, logit boost, atmospheric support cutoffs, transition-count requirement, labels, folds, gates, and event definitions remain unchanged;
- missing values remain missing;
- future observations remain label-only;
- fire association remains outcome-only;
- 2025 remains completely unopened by this development workstream.

This is an archive/plumbing adaptation, not a coefficient or threshold search. The resulting candidate is labeled `transition_onset_v1a_archive6h` so it cannot be confused with the unrealizable exact-3-h-profile specification.

If this corrected 2024 chronological-CV candidate fails any predeclared gate, it is rejected and must not be scored on 2025.