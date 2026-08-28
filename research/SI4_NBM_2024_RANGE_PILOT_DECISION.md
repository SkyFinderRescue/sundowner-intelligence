# SI-4 NBM 2024 range-pilot decision

Status: **PASS — ARCHIVE/PLUMBING ONLY; SCIENCE NOT SCORED**

Candidate lane: `nbm_probabilistic_surface_ensemble_v1`
Branch: `si4-nbm-probabilistic`
Authoritative workflow run: `33217376673` (`SI-4 NBM 2024 Range Pilot`, run #1)
Head: `bfb722531dc68c9222cb2639719be01cc200c11a`

## Result

The predeclared multi-cycle archive pilot completed successfully for all **28/28** 2024 F024 cases:

- calendar dates: 2024-06-01, 07-01, 08-01, 09-01, 10-01, 11-01, 12-01;
- issuance cycles: 00Z, 06Z, 12Z, 18Z;
- exact forecast lead: F024;
- five frozen SI-4 points per case;
- official NOAA NBM `core` and `qmd` CONUS objects;
- exact `.idx` descriptor matching and HTTP byte-range extraction;
- per-message SHA-256 provenance persisted;
- grid-distance contract <3 km;
- observations loaded: **false**;
- outcomes loaded: **false**;
- 2025 holdout loaded: **false**.

The workflow summary required the complete 28-case matrix and passed only after every extraction job succeeded.

## Interpretation

This establishes that the official NBM deterministic/probabilistic surface-wind archive can be sampled repeatably across multiple 2024 cycles with the frozen field/geometry contract. It is infrastructure evidence only. It does not demonstrate forecast skill and does not authorize any 2025 exposure or production change.

## Next gate

Proceed only under `SI4_NBM_PROBABILISTIC_2024_PREDECLARED.md`:

1. expand the 2024 development archive using calendar/predeclared availability rules independent of observations/outcomes;
2. match issuance-time NBM F024 features to the established 2024 chronological development rows;
3. fit/score the predeclared low-dimensional probabilistic surface-ensemble candidate chronologically using strictly earlier 2024 data;
4. compare with frozen SI-4 and simple baselines on identical rows;
5. require every frozen POD/FAR/Brier/AUC/hard-negative/spatial/regime/gust gate to pass before exactly one score-only 2025 evaluation.

If any development gate fails, reject without 2025 exposure.

## Isolation

This decision does not modify `si4-research`, PR #6, or production `main`. SI-3.1 remains the verified production baseline and the SI-4 production decision remains **NO PROMOTION**.
