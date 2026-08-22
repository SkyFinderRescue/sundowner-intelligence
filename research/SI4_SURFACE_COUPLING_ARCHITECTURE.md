# SI-4 Surface-Coupling Architecture

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This workstream implements the SWEX-informed distinction between (1) an atmosphere that supports a Sundowner/mountain-wave event and (2) whether the downslope jet actually couples to the surface in a specific Santa Barbara County zone.

## Architecture

The candidate path is intentionally two-stage:

`Atmospheric Sundowner Support -> Regime Expert -> Mountain-Wave / Jet State -> Surface Coupling -> Zone Event / Gust / Timing`

Stage 1 answers: **Is the larger-scale atmosphere supportive of a Sundowner?**

Stage 2 answers: **Given that supportive environment, how likely is the downslope jet to reach the surface in this zone rather than remain elevated, become marine-blocked, or be disrupted by hydraulic-jump / rotor structure?**

The production SI-3.1 path is unchanged while this is evaluated.

## New research primitives

Implemented in `research/si4-science.js`:

- `inversionAndJetStructure()`
  - height of the strongest low-level cross-barrier jet;
  - jet height relative to the Santa Ynez ridge;
  - difference between jet strength and the lowest resolved profile level;
  - coarse temperature-inversion strength;
  - maximum low-level potential-temperature gradient;
  - reversed low-level flow beneath strong cross-barrier flow aloft.

- `hydraulicJumpRotorSusceptibility()`
  - Froude proximity to the critical transition range;
  - vertical cross-barrier shear;
  - low-level reversal beneath stronger downslope flow;
  - stable-layer support.
  - This is explicitly a **susceptibility diagnostic**, not proof that a hydraulic jump or rotor exists.

- extended `marineLayerResistance()`
  - original low-cloud / RH / boundary-layer / coastal saturation evidence;
  - optional inversion strength;
  - optional marine-intrusion score;
  - optional Channel-eddy score.

- `surfaceCouplingIndex()`
  - separates atmospheric support from surface realization;
  - uses regime-specific weighting for western, hybrid, and eastern regimes;
  - reports jet access, mixing, resistance, marine resistance, rotor susceptibility, and combined surface-event support.

- `hardNegativeFlag()`
  - can now identify physically blocked hard negatives when atmospheric support is strong but surface coupling is low.

## Regime experts

The SI-4 calibration builder already fits independent `western`, `hybrid`, and `eastern` models. The surface-coupling layer preserves that separation rather than forcing one universal response.

Research emphasis:

- **Western:** stronger marine-layer / Point Conception coastal-jet influence; surface decoupling receives greater weight.
- **Hybrid:** balanced marine, wave, and transition behavior.
- **Eastern:** greater emphasis on wave/rotor structure, upstream blocking, and terrain response while retaining marine resistance.

These weightings are candidate physics priors only. They do not earn promotion unless independent validation improves.

## SWEX negative controls

`data/swex-2022-negative-windows.json` contains the three independently documented SWEX EOP calm-control periods. They remain validation-only controls.

Rules:

- only documented EOP windows are negatives;
- non-IOP campaign time is **not** automatically negative;
- fire association is never an event label or predictor;
- missing observations remain null;
- SWEX IOP/EOP observations are independent event-level validation evidence, not training labels to memorize.

## Direct data still to add

The current profile-only coupling diagnostic deliberately treats missing direct marine inputs as neutral. The next data layer must add, when archive provenance and fixed-lead timing are valid:

1. GOES-West nighttime low-cloud / fog-stratus evidence over the Santa Barbara south coast and Channel.
2. Coastal ceiling, RH, dewpoint depression, and marine intrusion/erosion trend.
3. Forecast boundary-layer depth and 925-hPa moisture.
4. Channel-eddy / low-level circulation evidence only when it can be derived reproducibly from information available at forecast issuance.
5. Point Conception / offshore observations as western-regime independent diagnostics where source timing and station continuity are adequate.

No hindsight satellite or surface observation may enter a fixed-lead predictor row.

## Frozen evaluation order

1. **2024 training-only physics screen**
   - measure surface-coupling, jet-height, jet-surface-drop, rotor-susceptibility and inversion contrasts between real events, ordinary negatives, and western hard negatives;
   - select or reject candidate feature forms using 2024 only.

2. **SWEX IOP/EOP event-level check**
   - verify that physically blocked or elevated-jet cases receive lower surface coupling without suppressing well-coupled real events;
   - use final-QC observations when available.

3. **Freeze candidate rules**
   - feature definitions, transformations, regime handling, missing-data behavior, and thresholds are frozen before the 2025 score-only holdout.

4. **2025 frozen holdout**
   - compare against frozen SI-3.1 and the current SI-4 candidate;
   - report Brier, AUC, POD, FAR, precision, hard-negative false alarms, regime-specific performance, gust MAE/bias/RMSE, timing, and spatial correctness.

5. **Matched NWS/NDFD comparison**
   - identical observations, valid times, and zones;
   - no fabricated NDFD Sundowner probability.

6. **Ablation**
   - remove coupling, rotor, marine, regime, terrain, and cycle-agreement components one at a time;
   - keep only independently useful components.

## Promotion requirements

The surface-coupling architecture cannot enter production unless it:

- reduces or clearly improves hard-negative false-alarm behavior;
- preserves or improves real-event detection;
- improves overall Brier score or provides a clearly documented operational gain without material regime degradation;
- does not materially degrade western/eastern AUC without an accepted tradeoff;
- keeps gust MAE/bias non-inferior;
- improves or preserves onset/peak timing and spatial-zone correctness;
- passes SWEX independent IOP/EOP validation;
- passes matched NWS/NDFD evaluation;
- passes final ablation;
- passes release verification plus desktop 1440x1000 and iPhone 390x844 browser QA.

## Current checkpoint

- Science primitives: **implemented**.
- Local syntax/unit tests: **passed before commit**.
- 2024-only western hard-negative coupling diagnostic: **running through GitHub Actions**.
- Direct GOES-West / marine intrusion / Channel-eddy inputs: **not yet integrated**.
- 2025 coupling candidate: **not tuned or promoted**.
- Production `main`: **unchanged**.
