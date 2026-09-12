# SI-4 Local Nonlinear Terrain Postprocessor — 2024 Predeclaration

Status: **RESEARCH ONLY / 2024 DEVELOPMENT ONLY**
Candidate: `local_nonlinear_terrain_postprocessor_v1`
Frozen before candidate scoring: 2026-08-28
Production baseline: SI-3.1 on `main`

## Scientific basis

This experiment is intentionally different from the rejected additive HRRR pressure-level proxy family, the rejected terrain/regime Analog Ensemble candidate, and the rejected NBM probabilistic candidate.

Primary evidence supporting the architecture:
- Steeneveld et al. (2021), *Weather and Forecasting*, DOI 10.1175/WAF-D-21-0054.1: nonlinear ANN post-processing materially improved local surface-wind direction in a narrow unresolved complex-terrain valley using forecast wind and stability inputs.
- Brothers et al. (2022/2023), *Weather and Forecasting*, DOI 10.1175/WAF-D-21-0215.1: random-forest classification improved nonconvective high-wind guidance in complex terrain.
- Schulz et al. (2022), *Monthly Weather Review*, DOI 10.1175/MWR-D-21-0150.1: locally adaptive nonlinear ensemble post-processing improved probabilistic wind-gust skill and learned physically consistent PBL-transition relations.
- Metz & Durran (2023), *Weather and Forecasting*, DOI 10.1175/WAF-D-22-0135.1: downslope-wind predictability is regime dependent and benefits from probabilistic ensemble treatment.

These references justify testing a nonlinear local mapping. They do **not** justify transferring thresholds, coefficients, event definitions, or results from other regions into Santa Barbara.

## Hypothesis

A compact nonlinear post-processor can recover part of the measured 2024 event recall loss by learning interactions among already-authorized issuance-time wind, pressure, stability, terrain orientation, season, and diurnal-transition predictors that repeated one-dimensional/additive candidate adjustments cannot represent, while preserving false-alarm and hard-negative safety.

## Data boundary and anti-leakage rules

- Development/scoring period: 2024-01-01 through 2024-12-31 only.
- Forecast lead: exact fixed 24 h.
- 2025 is forbidden for feature selection, architecture selection, hyperparameters, calibration, thresholds, early stopping, debugging based on outcomes, or candidate rescue.
- For every scored issuance, training examples must have verifying valid times strictly earlier than that forecast's issuance time.
- Future HADS/RAWS observations are labels only.
- Fire association is outcome-only and never a predictor/target definition.
- SWEX IOP identity is not a predictor.
- Missing values remain missing. Model-native missing handling is allowed only if fixed before scoring; otherwise fall back to the frozen baseline.
- No random train/test split. Use expanding-window chronological folds.

## Allowed predictor families

Only predictors already archived or derivable at issuance time from existing SI-4 data paths may be used:

1. **Local forecast wind state**
   - 10-m wind speed;
   - 10-m wind direction encoded as sine/cosine;
   - forecast gust;
   - cross-barrier/projected wind relative to frozen zone orientation.

2. **Pressure / synoptic forcing**
   - existing frozen SBA/BFL, SBA/SMX and local pressure-gradient terms;
   - issuance-time pressure tendency already available to SI-4.

3. **Vertical-profile / stability context**
   - existing frozen ridge-layer stability metric;
   - mountain-wave index and mean-state critical-level diagnostics already admitted to SI-4;
   - profile wind direction/speed summaries already in the fixed-F24 archive;
   - no new coarse scalar proxy invented after viewing candidate outcomes.

4. **Surface coupling context**
   - issuance-time 2-m RH;
   - existing marine-resistance value when genuinely available;
   - solar/diurnal-transition context available at issuance.

5. **Static/local context**
   - zone/station identity;
   - frozen terrain orientation;
   - month encoded cyclically;
   - hour encoded cyclically;
   - regime label determined from the existing forecast-context logic, not verifying observations.

No predictor may encode verifying event status, future wind, later forecast cycles, fire activity, or post-valid-time information.

## Model family

Use a compact tree-based nonlinear model because the hypothesis is interaction/nonlinearity rather than another hand-written coefficient.

### Event probability

Gradient-boosted decision-tree binary classifier with probabilistic output.

Frozen complexity envelope:
- maximum tree depth in `{2,3}`;
- number of boosting rounds in `{50,100}`;
- learning rate in `{0.03,0.06}`;
- minimum child/sample constraint chosen from a small fixed set appropriate to the implementation;
- L2 regularization enabled;
- no unrestricted hyperparameter search.

### Gust

Separate shallow gradient-boosted regression model using the same issuance-time predictor families. Gust output may replace the baseline gust only when chronological-training sample support meets the predeclared minimum; otherwise baseline gust is retained.

### Calibration

Probability calibration, if used, must be fitted **inside each chronological training fold only** using an inner chronological split. No calibration may see the outer validation fold.

## Chronological evaluation design

Use expanding-window folds with no future-training contamination. Minimum structure:
- initial training library must contain at least 60 days and at least the predeclared minimum number of positive event hours/episodes;
- subsequent validation blocks proceed chronologically through the remainder of 2024;
- training expands only forward in time;
- zones may be pooled only with explicit zone/regime/static predictors; zone-specific models require adequate positive and negative support.

Hyperparameter/architecture selection must occur by nested chronological training-only evaluation. The outer validation fold remains untouched until the selected candidate for that fold is frozen.

## Threshold policy

- The SI-3/SI-4 baseline threshold used for comparison is frozen from the existing 2024 development protocol.
- Candidate event threshold is selected on the chronological training data only.
- Primary threshold objective: meet or exceed baseline training-fold FAR while maximizing event POD; Brier is a simultaneous probabilistic constraint.
- No threshold may be selected using outer validation outcomes after scoring.
- No post-hoc 2024 rescue threshold after viewing aggregate validation results.

## Required baselines

Compare against:
1. frozen SI-3.1 production-equivalent baseline;
2. current frozen SI-4 baseline used by the existing 2024 development evaluators;
3. a simple regularized logistic model on the identical predictor matrix to demonstrate whether nonlinear interaction contributes skill beyond feature availability alone.

## Frozen promotion gates

`local_nonlinear_terrain_postprocessor_v1` advances to exactly one score-only 2025 evaluation **only if every gate below passes on complete 2024 chronological CV**:

- event POD >= baseline + 0.05 absolute;
- event FAR no worse than baseline;
- overall Brier no worse than baseline;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse than baseline;
- hard-negative FPR no worse than baseline;
- spatial precision >= baseline - 0.01;
- regime safety passes with no material western/hybrid/eastern degradation hidden by pooled metrics;
- gust MAE and RMSE non-inferior;
- gust bias non-inferior;
- no evidence of fallback/missingness selectively excluding difficult cases.

If any gate fails, reject the candidate and do not expose it to 2025.

## Evidence and audit outputs required

Persist:
- exact branch/head SHA;
- exact source files and hashes where practical;
- exact predictor list;
- chronological fold boundaries;
- hyperparameters chosen inside each training fold;
- fallback counts and missingness counts;
- baseline/logistic/nonlinear overall metrics;
- western/hybrid/eastern breakdown;
- event POD/FAR and episode counts;
- hard-negative Brier/FPR;
- spatial precision;
- gust MAE/RMSE/bias;
- explicit PASS/REJECT for every frozen gate.

## Stop conditions

Reject without 2025 exposure if:
- the nonlinear model merely reproduces the logistic/simple baseline;
- recall gain is obtained by materially increasing FAR;
- hard-negative safety worsens;
- one regime gains at the expense of unsafe degradation in another;
- improvement depends on leakage, future observations, event-specific/manual features, or post-hoc threshold adjustment.

## Production status

**NO PROMOTION.** This predeclaration authorizes only a 2024 chronological research experiment. SI-3.1 remains production and PR #6 remains draft/unmerged.