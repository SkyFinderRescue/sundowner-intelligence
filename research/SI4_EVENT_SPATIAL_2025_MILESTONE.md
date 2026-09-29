# SI-4 Frozen 2025 Event Timing and Spatial Milestone — 2026-08-18

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This records the frozen 2025 score-only event timing and spatial-correctness evidence produced by the successful `SI-4 All-Season Frozen Holdout` run `32151804989` on research head `15b613e38c3ffbcc42b06e4315be200fd295459e`.

Artifact: `si4-all-season-frozen-holdout`
Artifact SHA-256: `7ad1e1fe3bd5ba86e5bf485897657dac75e790a8a01f16d5f783700444fd544f`

## Integrity

- Training and all fitted thresholds: 2024 only.
- 2025: score-only.
- Western candidate: already-frozen surface-coupling feature set; no refit after its one-time 2025 gate.
- Hybrid/eastern: current SI-4 candidate.
- Future observations: label-only.
- Fire association: not used.
- Missing values: not fabricated.
- No feature, coefficient, threshold, episode rule, or model parameter was tuned from these 2025 results.
- Production change authorized: no.

## Frozen 2025 event evidence

Observed event episodes: **671**.

| Metric | Frozen SI-3 baseline | SI-4 research candidate | Delta |
|---|---:|---:|---:|
| Predicted episodes | 1,188 | 653 | -535 |
| Matched episodes | 410 | 347 | -63 |
| Event POD | 0.6110 | 0.5171 | -0.0939 |
| Event FAR | 0.6549 | 0.4686 | -0.1863 |
| Onset MAE | 3.834 h | 3.303 h | -0.532 h |
| Peak-time MAE | 4.039 h | 3.769 h | -0.270 h |

Interpretation: SI-4 substantially reduces false event episodes and modestly improves onset/peak timing among matched episodes, but loses too much event recall. The event-recall promotion gate therefore remains **unmet**. This is consistent with the separate 2024-only recall-recovery CV in which all three predeclared rescue candidates were rejected before any 2025 exposure.

## Frozen 2025 spatial evidence

| Metric | Frozen SI-3 baseline | SI-4 research candidate | Delta |
|---|---:|---:|---:|
| Mean active-hour zone-set Jaccard | 0.1952 | 0.2552 | +0.0600 |
| Exact zone-set rate | 0.0892 | 0.1283 | +0.0391 |
| Zone precision | 0.2710 | 0.4655 | +0.1945 |
| Zone recall | 0.4799 | 0.4531 | -0.0268 |

Interpretation: spatial precision and set correctness improve materially, while spatial recall decreases slightly. This is useful evidence but does not offset the event-POD loss.

## Decision

**Do not promote on event/timing/spatial evidence yet.** Preserve the current frozen research state. Do not retune on individual 2025 misses. Any future recall remedy must originate from 2024-only development or independent physical evidence (including final-QC SWEX when delivered), pass predeclared development gates, and only then earn a single score-only frozen holdout evaluation.

SI-3 production on `main` remains unchanged and PR #6 remains draft/unmerged.
