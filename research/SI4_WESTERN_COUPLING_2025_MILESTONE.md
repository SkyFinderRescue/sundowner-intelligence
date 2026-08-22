# SI-4 Western Surface-Coupling Frozen 2025 Milestone — 2026-08-16

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This records the one-time 2025 score-only test of the western surface-coupling candidate frozen after 2024-only expanding-window development.

## Provenance

- 2024 development CV run: `31995138187`
- Frozen rules: `research/SI4_WESTERN_COUPLING_2024_FROZEN_RULES.json`
- One-time 2025 score run: `31995814861`
- 2025 artifact: `si4-western-coupling-frozen-2025`
- Artifact SHA-256: `c8f75951811de3f0e21f3af0a53fb3574bca663c650ac3df8d62f452e69bc56d`
- Forecast lead: fixed 24 h
- Training: 2024 only
- Holdout: 2025 score-only
- Western zones: Gaviota and Refugio
- 2025 western rows: **2,912**
- 2025 observed event rows: **623**
- 2025 hard negatives: **149**

## Frozen candidate features

The feature set was fixed before the 2025 run and was not changed afterward:

1. `surface_cross_barrier_gust_mph`
2. `critical_below_3km`
3. `wave_mean_cross_barrier_mph`

No GOES/satellite feature was included in this candidate.

## 2025 score-only result

| Metric | Current SI-4 western model | Frozen coupling candidate | Change |
|---|---:|---:|---:|
| Brier | 0.1145886 | **0.1111680** | **-0.0034206** |
| AUC | 0.8784731 | **0.8906565** | **+0.0121833** |
| Hard-negative negative-only Brier | 0.3236434 | **0.2966841** | **-0.0269593** |
| POD at 2024-frozen matched threshold | 0.4703050 | 0.4542536 | -0.0160514 |
| Hard-negative FPR at 2024-frozen matched threshold | 0.6644295 | **0.6241611** | **-0.0402685** |

The candidate's overall FAR at its own 2024-frozen matched-POD threshold was slightly worse (`0.32938` vs `0.31382`), so this is retained as an explicit tradeoff rather than hidden. The predeclared gate used hard-negative FPR, not overall FAR, because this workstream was specifically designed to reduce the western hard-negative failure mode while protecting event detection.

## Predeclared one-time gate

All five criteria passed:

- western Brier non-inferior: **PASS**
- hard-negative Brier improves at least 5%: **PASS**
- AUC no worse than -0.01: **PASS**
- event POD no worse than -0.02: **PASS**
- hard-negative FPR not worse: **PASS**

Decision: **CANDIDATE SURVIVES ONE-TIME 2025 GATE**.

This does **not** authorize production promotion. The candidate now earns continued SI-4 research and ablation.

## Integrity

- future observations used only as labels: **yes**
- 2025 used for tuning after the freeze: **no**
- fire association used: **no**
- missing values fabricated: **no**
- production changed: **no**

## Next work

1. Add direct GOES-18 marine-layer numerical features using issuance-time-or-earlier imagery only.
2. Test GOES features on 2024-only hard negatives before any 2025 satellite scoring.
3. Use SWEX final-QC IOP/EOP observations as independent event-level checks when delivered.
4. Continue HRRR cycle consistency, RRFS/REFS shadow, terrain response, timing/spatial scoring and final ablation.
5. Keep the live SI-3 application untouched until every SI-4 promotion gate passes.
