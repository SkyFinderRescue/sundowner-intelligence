# SI-4 Richardson / Wave-Breaking Susceptibility Candidate — Predeclared 2024 Gate

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — DO NOT LOAD IN PRODUCTION**

## Independent physical basis

This candidate is motivated by published Santa Barbara Sundowner research rather than by inspection of 2025 misses.

- Carvalho et al. (2020), *Monthly Weather Review*, “The Sundowner Winds Experiment (SWEX) Pilot Study: Understanding Downslope Windstorms in the Santa Ynez Mountains, Santa Barbara, California,” DOI 10.1175/MWR-D-19-0207.1. The paper reports lee-jet / mountain-wave-breaking transitions accompanied by changes in stability and bulk Richardson number, and discusses self-induced critical layers associated with low Richardson number.
- Carvalho et al. (2024), *Bulletin of the American Meteorological Society*, “The Sundowner Winds Experiment (SWEX) in Santa Barbara, California: Advancing Understanding and Predictability of Downslope Windstorms in Coastal Environments,” DOI 10.1175/BAMS-D-22-0171.1. The field campaign emphasizes upstream/downstream boundary-layer structure, mountain waves, critical layers, stability, and wave breaking as relevant Sundowner processes.

This is materially different from the already rejected SI-4 upstream-thermal, upstream-ABL-reservoir, direct-GOES, HRRR-cycle, transition-onset, inversion-only, lee-jet-phase, coastal-jet-phase, and channel-eddy probability candidates. Those decisions remain frozen.

## Hypothesis

A coarse-layer, issuance-time bulk Richardson diagnostic may add independent information about whether a forecast mountain-wave / lee-jet environment is dynamically susceptible to shear instability and wave breaking. If useful, adding only these Richardson/shear features to the existing 2024 probability model should recover event recall without sacrificing false alarms, calibration, spatial precision, regime safety, or gust skill.

The diagnostic is **susceptibility only, not proof of turbulence, rotor formation, hydraulic jump, or wave breaking**. HRRR pressure-level spacing is much coarser than the radiosonde increments used in the SWEX paper, so numerical Richardson values are treated as model-scale predictors rather than direct observations of the theoretical critical threshold.

## Data and leakage rules

- Development year: **2024 only**.
- Forecast lead: **exact fixed F24** from the already frozen all-season HRRR upper-air archive.
- Independent verification: HADS station observations, used only as labels/scores after the forecast predictors exist.
- 2025 observations/outcomes must not be loaded by this development evaluator.
- Fire association is outcome-only and must not enter any predictor.
- Missing humidity/temperature/height/wind required for a Richardson layer stays missing; no climatological or future-observation fill is permitted.
- Transient upstream API failures are infrastructure failures and must be retried without changing the hypothesis or gates.

## Frozen diagnostic definition

For each adjacent valid pressure-level pair in the F24 profile:

1. Convert forecast wind speed/direction to meteorological zonal/meridional components in SI units.
2. Estimate saturation vapor pressure from forecast temperature, then vapor mixing ratio from forecast relative humidity and pressure.
3. Compute virtual potential temperature from forecast-only thermodynamic fields.
4. Compute bulk Richardson number:

`Ri_B = (g / theta_v_mean) * (delta_theta_v * delta_z) / (delta_u^2 + delta_v^2)`

Layers with nonpositive height separation, missing required fields, or effectively zero vector-wind shear are null and excluded rather than fabricated.

The **only new candidate features** are predeclared as:

- capped minimum valid layer Ri_B: `clip(min_Ri_B, -1, 4)`;
- fraction of valid layers with Ri_B <= 0.25;
- fraction of valid layers with Ri_B <= 0.50;
- maximum valid vector shear magnitude divided by layer depth, represented as `log1p(shear_s^-1 * 1000)`.

No post-score transform selection is allowed. The baseline uses the existing feature vector; the candidate appends exactly these four fields and refits the same regularized logistic model inside each chronological training fold.

## Chronological folds

Use the established SI-4 2024 folds:

- train through 2024-04-30, validate May–June;
- train through 2024-06-30, validate July–September;
- train through 2024-09-30, validate October–December.

Probability thresholds are selected using each fold's training data only. Validation labels never select coefficients, transforms, or thresholds.

## Frozen promotion gates

The Richardson candidate may be exposed exactly once to the frozen 2025 holdout **only if every 2024 gate passes**:

1. Event POD >= baseline event POD **+0.05 absolute**.
2. Event FAR <= baseline event FAR (**no degradation**).
3. Overall Brier <= baseline (**no degradation**).
4. Overall AUC >= baseline AUC - **0.005**.
5. Hard-negative Brier <= baseline (**no degradation**).
6. Hard-negative FPR <= baseline (**no degradation**).
7. Spatial/zone precision >= baseline - **0.01**.
8. Regime safety: for western, hybrid, and eastern subsets independently, Brier may not worsen by more than 2% relative and AUC may not fall by more than 0.01 where both classes permit AUC calculation.
9. Gust non-inferiority: this candidate is probability-only and is forbidden from changing the frozen gust correction; therefore gust predictions must remain byte-for-byte / numerically identical to baseline handling.
10. Diagnostic coverage >= 90% of otherwise eligible fixed-F24 rows so apparent skill cannot be created by selectively dropping difficult cases.

If any gate fails, the candidate is rejected in 2024 and **must not be scored on 2025**. No tuning after a failed gate is permitted unless a materially different independent-physics hypothesis is separately predeclared first.

## Production rule

Passing this development gate would authorize only one frozen, score-only 2025 evaluation. It would not authorize merge or production. PR #6 remains draft/unmerged and SI-3.1 on `main` remains the verified production baseline until every SI-4 promotion and release/QA gate passes.
