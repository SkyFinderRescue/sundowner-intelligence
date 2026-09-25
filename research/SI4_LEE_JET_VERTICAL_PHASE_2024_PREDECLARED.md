# SI-4 lee-jet vertical-phase / wave-lift diagnostic — 2024 predeclaration

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — DO NOT SCORE ON 2025**

The verified SI-3.1 release on `main` remains the production baseline. PR #6 remains draft/unmerged. This document does not authorize any production change.

## Independent physical basis

This hypothesis is materially different from the rejected `upstream_thermal_subsidence_v1` and `upstream_abl_reservoir_v1` candidates. It is motivated by primary SWEX evidence that near-surface Sundowner intensity can weaken when the lee-slope jet is lifted by mountain-wave vertical motion, even while synoptic pressure support remains strong. de Orla-Barile et al. (2025, *Monthly Weather Review*, MWR-D-25-0015.1) documented positive vertical velocities near the eastern Santa Ynez foothills associated with lifting of the lee-slope jet and concurrent weakening of near-ground winds during the 12–13 May 2022 SWEX event. Carvalho et al. (2024, *BAMS*, BAMS-D-22-0171.1) likewise describes sharp temporal changes, double lee-slope jets, and marine/continental ABL interaction as controls on surface-wind expression.

The candidate therefore tests **vertical phase / lee-jet coupling**, not generic mean subsidence. The rejected upstream thermal candidate averaged 700/500-hPa vertical velocity over interior points as one component of a broad support index; it did not test the spatial sign/phase contrast between lee/channel ascent and upstream/ridge motion as a dedicated surface-coupling mechanism.

## Frozen candidate family

`lee_jet_vertical_phase_v1`

Use only issuance-time exact-F24 2024 predictors already present in the immutable, provenance-locked 2024 upstream archive and frozen SI-4 baseline inputs. No new observation-derived predictor is permitted.

Required spatial diagnostics at the valid hour:

- 850/700-hPa vertical-motion sign and magnitude at `santa_barbara_lee`;
- 850/700-hPa vertical-motion sign and magnitude at `western_channel`;
- 850/700-hPa vertical-motion at `santa_ynez_valley` and `cuyama_interior`;
- lee-minus-upstream vertical-motion contrast;
- channel-minus-lee vertical-motion contrast;
- binary/continuous **wave-lift suppression** diagnostic when lee/channel ascent is present against otherwise supported cross-barrier flow;
- binary/continuous **downward-coupling support** diagnostic when lee vertical motion is downward or materially less upward than upstream/channel motion;
- interaction only with pre-existing issuance-time pressure support, mountain-wave score, regime, and target-direction alignment.

Hydraulic-jump/rotor behavior remains a susceptibility interpretation only; the model must not claim direct observation of a rotor or hydraulic jump from HRRR vertical velocity.

## Leakage and provenance rules

- Development interval: `2024-01-01` through `2024-12-31` only.
- Exact forecast lead: 24 h.
- Chronological folds only; no random split.
- Frozen 2025 holdout must not be loaded, queried, inspected, or used to choose transforms, coefficients, thresholds, cases, signs, or gates.
- Future surface observations are labels only.
- `fire_associated` is outcome-only and cannot enter occurrence labels or predictors.
- Missing archive fields remain missing and fail closed; no interpolation from future valid times.
- Use the immutable upstream archive provenance already accepted by the full-year upstream-thermal workflow; do not silently substitute a later archive.

## Candidate fitting constraints

1. Derive all vertical-phase features deterministically from the frozen archive before fitting.
2. Select coefficient magnitude/sign using training folds only.
3. Candidate probability modifications must be capped and monotone with the fitted development evidence; no arbitrary case-specific boosts.
4. Operating threshold is selected from each training fold only and then applied unchanged to its chronological validation fold.
5. Report zero-uplift/null selection explicitly if training evidence does not support the feature.

## Predeclared 2024 promotion gates

The candidate may become eligible for **one** frozen score-only 2025 evaluation only if every gate below passes across chronological 2024 validation folds:

- event POD >= frozen SI-4 development baseline + **0.05 absolute**;
- event FAR no worse than baseline;
- overall Brier no worse than baseline;
- ROC AUC >= baseline - 0.005;
- hard-negative Brier no worse than baseline;
- hard-negative FPR no worse than baseline;
- spatial zone precision >= baseline - 0.01;
- no material regime-specific safety failure;
- gust error non-inferior/unchanged because this candidate modifies occurrence coupling rather than gust correction;
- missing-data behavior remains fail closed.

If any gate fails, reject `lee_jet_vertical_phase_v1` in 2024 development and **do not expose it to 2025**. Do not adjust coefficients, feature signs, thresholds, or gates after seeing the result merely to obtain a pass.

## Decision discipline

A passing 2024 result would only authorize freezing the entire transform/coefficient/threshold definition for one score-only 2025 test. It would not authorize promotion to production by itself. Current SI-4 production decision remains **NO PROMOTION** until all promotion gates are independently satisfied.
