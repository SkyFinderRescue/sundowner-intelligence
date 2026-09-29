# SI-4 Transition/Onset Physics Candidate — 2024 Predeclared Development Gate

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — DO NOT LOAD IN PRODUCTION**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. The frozen 2025 holdout is not development data and must not be read by this workstream unless a candidate first passes every gate below and is then frozen for one score-only evaluation.

## Independent physical hypothesis

This candidate is motivated by primary Sundowner literature, not by inspection of 2025 misses.

Primary sources:

- Carvalho et al. (2020), *Monthly Weather Review*, DOI `10.1175/MWR-D-19-0207.1`: observed transition from daytime humid/onshore flow to evening offshore flow; rapid collapse of the upstream Santa Ynez Valley convective mixed layer near onset; strengthening boundary-layer stability around sunset; nocturnal lee-jet evolution; changes in stability/Richardson number; possible interaction with the offshore coastal jet.
- Smith et al. (2018), *Journal of Applied Meteorology and Climatology*, DOI `10.1175/JAMC-D-17-0162.1`: precursor environment includes a strong NNW alongshore jet; the alongshore jet and pressure forcing alone do not explain diurnal variability; the jet may be advected into the Santa Ynez Valley, modified by afternoon heating, then advected over the ridge; Sundowners often initiate west and propagate east during late afternoon/evening.
- Carvalho et al. (2024), *BAMS*, DOI `10.1175/BAMS-D-22-0171.1`: Sundowner timing/intensity depend on interactions between upstream continental boundary-layer evolution, mountain-wave dynamics, and the downstream stable marine boundary layer.
- Duine et al. (2025), *Weather and Forecasting*, DOI `10.1175/WAF-D-24-0084.1`: a mean-state critical level below 5 km can permit comparable lee-slope jet strength under weaker atmospheric forcing, so critical-level evolution may modulate transition susceptibility.

### Candidate mechanism

Test whether **time evolution**, rather than static state alone, carries independent onset information at fixed 24 h lead. The candidate uses only issuance-time forecast information available by the forecast issuance:

1. **Ridge-layer stability tendency (3 h):** change in 925–700-hPa Brunt–Vaisala/stability diagnostic from the prior valid hour sequence to the target valid time.
2. **Cross-barrier momentum tendency (3 h):** change in low-level mean ridge-normal flow from the prior fixed-lead profile to the target fixed-lead profile.
3. **Mean-state critical-level evolution (3 h):** descent/emergence of the first cross-barrier wind reversal below 5 km; absence remains absent/null, never fabricated.
4. **Upstream Santa Ynez Valley cooling transition (3 h):** forecast 2-m temperature tendency together with shortwave collapse at/after the afternoon-to-evening transition.
5. **Alongshore-jet support:** NNW low-level flow upstream/near Point Conception, treated as a precursor/support term rather than a Sundowner label.
6. **Joint transition susceptibility:** a monotonic combination requiring atmospheric support plus at least two transition signals. Hydraulic-jump/rotor language remains susceptibility-only, not proof of occurrence.

These are materially distinct from prior rejected candidates, which used static wave score/pressure support, projected-gust persistence, pressure-gradient strengthening, static inversion/refined coupling, HRRR cycle agreement, GOES marine state, or terrain/gust corrections. This test specifically asks whether **vertical-profile and upstream-boundary-layer tendencies** add event-onset information.

## Leakage and provenance rules

- Development interval is exactly `2024-01-01` through `2024-12-31`.
- Chronological cross-validation only; no random train/test shuffling.
- 2025 observations/outcomes are forbidden in this workstream.
- HADS/RAWS future verifying winds are labels only.
- Fire association is outcome-only and excluded from all predictors/targets.
- Missing transition inputs stay missing. A candidate row requiring a missing transition feature is not silently imputed with event-favorable values.
- A 3-h prior fixed-lead profile is allowed only because its forecast issuance predates the target row issuance; no later model cycle may be used.

## Predeclared candidate

A single candidate family is allowed before scoring:

`transition_onset_v1`

The candidate may add a bounded positive logit adjustment only when the baseline is below the event threshold and the following physically interpretable support is present:

- baseline atmospheric pressure/wave support is nontrivial;
- evening-transition condition is present (shortwave collapse and/or upstream cooling);
- at least two of: increasing ridge stability, strengthening ridge-normal momentum, critical-level descent/emergence below 5 km, NNW alongshore-jet support.

No post-result coefficient search is permitted. The implementation constants must be fixed in code before the first 2024 score is run.

## Predeclared 2024 chronological-CV gates

The candidate is eligible for one frozen score-only 2025 evaluation only if **all** gates pass on concatenated out-of-fold 2024 predictions:

1. **Event recall/POD:** absolute event-level POD improvement `>= 0.05` versus the current SI-4 development baseline.
2. **False-alarm episodes:** event-level FAR must be non-inferior (`candidate FAR <= baseline FAR + 0.01`).
3. **Hard-negative calibration:** hard-negative Brier must be non-inferior (`<= baseline * 1.01`).
4. **Hard-negative FPR:** must be non-inferior (`<= baseline + 0.01`).
5. **Overall Brier:** must be non-inferior (`<= baseline * 1.005`).
6. **Overall AUC:** must be non-inferior (`>= baseline - 0.005`).
7. **Regime Brier/AUC:** no regime may degrade beyond the same Brier/AUC tolerances.
8. **Spatial precision:** zone-level precision must be non-inferior (`>= baseline - 0.01`).
9. **Gust skill:** unchanged by construction; the candidate is probability-only. If any implementation changes gust output, the candidate automatically fails this workstream.

If any gate fails, reject `transition_onset_v1`, document the failure, and **do not score it on 2025**. No threshold, coefficient, feature cutoff, or regime rule may be changed after seeing the 2024 CV result merely to clear a failed gate.
