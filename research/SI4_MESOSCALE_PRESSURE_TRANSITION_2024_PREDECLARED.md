# SI-4 Mesoscale Pressure-Transition Phase — 2024 Predeclaration

Status: **RESEARCH ONLY — PREDECLARED — NO 2025 EXPOSURE**

## Independent physical basis

This hypothesis is motivated by published Sundowner process studies and is formulated without inspecting frozen-2025 misses.

Primary sources:
- Smith et al. (2018), *Journal of Geophysical Research: Atmospheres*, DOI `10.1029/2018JD029065`: the offshore north-northwesterly jet and synoptically forced near-surface pressure gradients are primary controls on upstream wind/stability profiles and Sundowner magnitude/location.
- Smith et al. (2018), *Journal of Applied Meteorology and Climatology*, DOI `10.1175/JAMC-D-17-0162.1`: offshore pressure gradients were skillful while the Bakersfield–Santa Barbara operational rubric alone was not; strong events showed west-to-east evolution and limited downstream extent.
- Carvalho et al. (2020), *Monthly Weather Review*, DOI `10.1175/MWR-D-19-0207.1`: the SWEX pilot event showed strong low-level pressure gradients and rapid mesoscale evolution accompanying lee-slope-jet onset/intensification.

This is materially different from the existing SI-4 scalar `pressure_support` and single-regime `pressure_strengthening_3h` features. The candidate tests the **spatial phase and temporal coherence of the mesoscale pressure field** across the coast, Santa Ynez Valley, Point Conception/Vandenberg sector, Santa Maria sector, and inland Bakersfield sector rather than another scalar pressure threshold.

## Frozen causal hypothesis

At fixed 24-h lead, an otherwise favorable Sundowner setup should be more likely to verify when the forecast pressure field evolves coherently toward the documented offshore/cross-barrier configuration over several consecutive forecast-valid hours. A scalar favorable gradient that is spatially inconsistent or transient should receive less support.

`mesoscale_pressure_transition_v1` may act only as a bounded probability/onset modifier. It must not create an event from a weak baseline state, and it may not use verifying observations to determine the transition phase.

## Issuance-time predictors only

Use archived fixed-F24 forecast fields from the authoritative SI-4 forecast-cycle policy. Prefer existing SI-4 surface-pressure points where already frozen:

- Santa Barbara/coastal reference;
- Santa Maria/western-valley reference;
- Santa Ynez/IZA valley reference;
- Vandenberg/Point Conception sector reference;
- Bakersfield inland reference.

No new station is selected based on 2024 or 2025 event outcomes.

For each valid hour, derive only from forecast pressure fields available at issuance:

1. `west_gradient_hpa`: SBA minus SMX pressure.
2. `east_gradient_hpa`: SBA minus BFL pressure.
3. `valley_gradient_hpa`: SBA minus IZA pressure.
4. `point_conception_gradient_hpa`: SBA minus VBG pressure.
5. `gradient_vector_coherence`: bounded score rewarding physically consistent offshore/cross-barrier signs across the frozen gradient set; exact sign/orientation convention is fixed before scoring.
6. `gradient_strengthening_3h` and `gradient_strengthening_6h`: forecast-time changes in the above gradients over the preceding forecast-valid hours, never observed future pressure changes.
7. `transition_coherence_6h`: bounded score requiring persistence/coherent evolution across at least two independent gradient components rather than a one-hour excursion.
8. `west_to_east_phase`: diagnostic comparing western-gradient strengthening with inland/eastern-gradient strengthening to test the published west-to-east evolution hypothesis. This is a phase/susceptibility diagnostic, not proof of propagation.

Any missing constituent remains null. No missing gradient component is replaced with zero or climatology.

## Candidate family and selection

The 2024 chronological-development selector may choose only among a small predeclared bounded family:

- no adjustment;
- positive modifier for coherent strengthening/persistence only when frozen SI-4 baseline probability is already >= 0.20;
- asymmetric western/hybrid/eastern bounded modifiers reflecting the published continuum of upstream direction/regime behavior;
- optional onset-phase modifier based on `west_to_east_phase`, capped so it cannot change event probability by more than 0.10 absolute in either direction.

All exact thresholds, bounds, and coefficients are selected using 2024 chronological CV only. The selector must include a zero-adjustment candidate. No 2025 row, miss, outcome, or error may be inspected for selection.

## Data and leakage rules

- Development period: 2024-01-01 through 2024-12-31 only.
- Frozen evaluation: 2025 remains unavailable unless every development gate below passes.
- Forecast lead: exact fixed 24 h under the same issuance-cycle contract as the authoritative SI-4 baseline.
- Future HADS/RAWS wind observations are label-only.
- `fire_associated` remains outcome-only and is excluded from predictors and target definition.
- Missing remains null; no forecast pressure value is fabricated.
- Archive 5xx/timeouts/missing keys are infrastructure/availability outcomes, never forecast/model evidence.
- Case/time/station selection may not depend on observations or event outcomes.

## Frozen chronological-CV promotion gates

The candidate may receive one score-only 2025 evaluation **only if every gate passes in 2024 chronological CV** against the frozen SI-4 baseline:

- event POD >= baseline + `0.05` absolute;
- event FAR <= baseline;
- overall Brier <= baseline;
- AUC >= baseline - `0.005`;
- hard-negative Brier <= baseline;
- hard-negative FPR <= baseline;
- spatial precision >= baseline - `0.01`;
- no material regime-specific safety failure;
- gust MAE/RMSE/bias non-inferior because this candidate must not alter the frozen gust path;
- missing/degraded behavior remains fail-closed.

If any gate fails, reject `mesoscale_pressure_transition_v1` and do not expose it to 2025. If every gate passes, freeze all transforms, coefficients, thresholds, point definitions, and archive provenance before exactly one score-only 2025 evaluation.

## Production restriction

This predeclaration does not change the current **NO PROMOTION** decision. SI-3.1 on `main` remains production and PR #6 stays draft/unmerged.