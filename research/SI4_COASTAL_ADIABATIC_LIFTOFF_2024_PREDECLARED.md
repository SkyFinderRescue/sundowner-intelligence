# SI-4 Coastal Adiabatic-Layer Lift-Off — 2024 Predeclaration

Status: **RESEARCH ONLY — PREDECLARED — NO 2025 EXPOSURE**

## Independent physical basis

This hypothesis is motivated by independent SWEX analyses rather than the frozen 2025 misses.

Primary sources:
- Janiszeski et al. (2025), *Journal of Geophysical Research: Atmospheres*, DOI `10.1029/2024JD042972`: realistically forced multiscale WRF/LES of two SWEX events found that strong downslope flow warms/dries the coastal air adiabatically, deepening a turbulent adiabatic layer to roughly 0.4–1 km, while the downslope jet can ascend over that turbulent coastal layer instead of remaining surface-coupled.
- de Orla-Barile et al. (2025), *Monthly Weather Review*, DOI `10.1175/MWR-D-25-0015.1`: SWEX lidar observations showed strong upward motion associated with lifting of the lee-slope jet and concurrent near-surface weakening, demonstrating that vertical displacement of the jet can materially control surface wind timing/intensity.

This mechanism is materially different from the rejected `upstream_abl_reservoir_v1`, which tested the upstream ABL reservoir/PBL state. This candidate is explicitly **downstream/coastal** and tests whether forecast-time evidence of a deepening near-adiabatic coastal mixed layer plus jet lift-off can distinguish surface-coupled Sundowner flow from elevated/decoupled flow.

## Frozen causal hypothesis

At fixed 24-h lead, otherwise favorable Sundowner forcing should produce weaker surface verification when the forecast shows the lee jet lifting above a deep turbulent/near-adiabatic coastal layer. Conversely, stronger surface coupling is physically favored when the low-level cross-barrier jet remains close to the surface/ridgetop layer and the coastal mixed layer does not strongly displace it upward.

`coastal_adiabatic_liftoff_v1` may therefore act only as a bounded probability/coupling modifier. It must not create a Sundowner event from an otherwise weak baseline state.

## Issuance-time predictors only

Archive/extract exact fixed-F24 forecast fields from the same forecast cycle policy used by the authoritative SI-4 development lane, at frozen coastal/foothill points already used by SI-4 where possible:

- 2-m temperature and dew point;
- 10-m u/v wind;
- PBL height;
- 925/900/875/850-hPa temperature, geopotential height, u/v wind when available;
- vertical velocity/omega at the same low levels when archive availability supports it;
- surface pressure / terrain height needed for valid AGL conversion.

Derived diagnostics are predeclared as:

1. `coastal_near_adiabatic_depth_m`: deepest contiguous forecast layer above ground through which potential-temperature increase is <= a frozen tolerance per 100 m; missing when the required vertical levels are insufficient.
2. `coastal_jet_height_agl_m`: height of the strongest cross-barrier wind in the available 925–850-hPa layer, converted to AGL; missing if no valid vertical profile exists.
3. `coastal_jet_surface_ratio`: 10-m cross-barrier speed divided by low-level jet speed, bounded only for numerical stability.
4. `coastal_liftoff_gap_m`: `jet_height_agl - near_adiabatic_depth`; positive values indicate an elevated jet above the turbulent/near-adiabatic layer.
5. `coastal_liftoff_susceptibility`: a bounded transform of large positive lift-off gap, weak surface/jet ratio, and ascending low-level motion where available. This is a **susceptibility diagnostic, not proof of a rotor or hydraulic jump**.

Exact tolerances, clipping bounds, and combination coefficients must be selected and frozen using 2024 chronological development only. No 2025 row, miss, outcome, or error may be inspected for their selection.

## Data and leakage rules

- Development period: 2024-01-01 through 2024-12-31 only.
- Frozen evaluation: 2025 remains completely unavailable until every development gate below passes.
- Forecast lead: exact fixed 24 h.
- Future HADS/RAWS observations are label-only.
- `fire_associated` remains outcome-only and is excluded from predictors/targets.
- Missing remains null; no vertical level or surface field may be fabricated/interpolated across unavailable archive products beyond explicitly documented vertical interpolation between bracketing forecast levels.
- Archive 5xx/timeouts/missing keys are infrastructure/availability outcomes, never model evidence.
- Case/time selection may not depend on observations or event outcomes.

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
- gust MAE/RMSE/bias non-inferior (candidate must not degrade the existing frozen gust path);
- missing/degraded behavior remains fail-closed.

If any gate fails, reject `coastal_adiabatic_liftoff_v1` and do not expose it to 2025. If every gate passes, freeze all transforms, coefficients, thresholds, archive keys, and field definitions before exactly one score-only 2025 run.

## Production restriction

This predeclaration does not alter the current **NO PROMOTION** decision. SI-3.1 on `main` remains production. PR #6 stays draft/unmerged.