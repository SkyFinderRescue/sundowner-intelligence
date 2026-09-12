# SI-4 Terrain/Regime Analog Ensemble — 2024 Predeclared Experiment

Date: 2026-08-28
Status: RESEARCH ONLY — 2024 development only; 2025 is forbidden unless every gate below passes.
Candidate: `terrain_regime_analog_ensemble_v1`

## Why this is materially different

This experiment follows the Analog Ensemble architecture identified in the primary-source review rather than adding another scalar/coarse-HRRR physics proxy. The current forecast state is matched to historical issuance-time forecast states and the corresponding **historical outcomes that were already known before the current issuance** form an empirical conditional predictive distribution.

Primary methodological basis:
- Delle Monache et al. (2013), MWR, DOI 10.1175/MWR-D-12-00281.1.
- Alessandrini et al. (2019), MWR, DOI 10.1175/MWR-D-19-0006.1.
- Open-source Parallel Analog Ensemble: https://github.com/uga-gaim/AnalogEnsemble and DOI 10.5281/zenodo.3384321.

This is **not** a claim that AnEn will improve Sundowner prediction. It authorizes one prospective-style 2024 chronological test.

## Frozen data boundary and anti-leakage rule

- Development and scoring rows: 2024 only.
- Forecast lead: fixed F24.
- For a row valid at `T`, issuance is defined as `T - 24 h`.
- An analog outcome is eligible only when its verifying valid time is **strictly earlier than that issuance time**.
- Current-row/future HADS observations are labels only and may never enter the current predictor vector.
- Fire association is outcome-only and unused here.
- No 2025 file, observation, score, threshold, model coefficient, or diagnostic may be loaded.
- Missing values remain missing. If the analog evidence contract is not met, the candidate falls back to the frozen baseline for that row; it does not synthesize evidence.

## Frozen predictor state and distance

Analog search is restricted to the **same zone** to preserve terrain identity/orientation. No post-hoc cross-zone rescue is allowed in v1.

The distance vector uses only issuance-time quantities already admitted to SI-4:
1. frozen baseline logit probability;
2. regime-appropriate pressure support;
3. 3-hour pressure-strengthening index;
4. mountain-wave score;
5. upper-profile dryness;
6. directionally projected F24 surface gust;
7. F24 surface dryness;
8. annual phase sine/cosine;
9. UTC hour phase sine/cosine.

All quantities are transformed to predeclared dimensionless ranges in code. No validation-fold standardization or future-distribution normalization is permitted.

Frozen squared-distance weights:
- baseline logit: 1.50
- pressure support: 1.25
- pressure strengthening: 0.75
- mountain-wave score: 1.00
- upper dryness: 0.75
- projected gust: 1.50
- surface dryness: 0.75
- annual sine/cosine: 0.35 each
- hour sine/cosine: 0.25 each

## Frozen analog construction

- same-zone minimum eligible historical library: 180 rows;
- nearest analog count: 60;
- Gaussian adaptive kernel bandwidth: distance to the 60th analog, floor 0.15;
- minimum effective sample size: 20;
- baseline prior/shrinkage weight: 12 equivalent kernel-weight units;
- empirical event probability: weighted historical event outcomes plus the frozen baseline prior;
- empirical gust mean is recorded as a diagnostic from historical observed gust outcomes with the same kernel and prior, but **v1 does not alter the operational gust output**. This isolates the event-probability architecture and therefore leaves the frozen gust forecast unchanged for the promotion gate.

No neighbor count, distance weight, prior strength, minimum sample count, or bandwidth may be changed after this file is committed based on the resulting scores.

## Chronological folds

Three forward validation periods are used with a 24-hour embargo before each first validation issuance:
- May–June validation; fixed training ends 2024-04-29 23Z.
- July–September validation; fixed training ends 2024-06-29 23Z.
- October–December validation; fixed training ends 2024-09-29 23Z.

Within a validation period the analog library may grow only with historical outcomes whose valid times have become available strictly before each later issuance. This reproduces the intended operational expanding historical library without allowing future observations.

Baseline statistical models and candidate threshold selection use only each fold's prior training window. Candidate threshold selection uses the existing SI-4 constraint rule: maximize training event POD subject to no-worse training event FAR, no-worse hard-negative FPR, and <=0.01 loss of classification precision.

## Frozen promotion gates

The candidate may be exposed exactly once to frozen 2025 only if **all** complete-2024 chronological gates pass:
- event POD >= baseline +0.05 absolute;
- event FAR no worse than baseline;
- overall Brier no worse than baseline;
- overall AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial/classification precision >= baseline -0.01;
- regime safety: within every scored fold/regime, candidate AUC >= baseline AUC -0.03 where AUC is defined;
- gust non-inferiority: operational gust forecast unchanged in v1.

If any gate fails, `terrain_regime_analog_ensemble_v1` is rejected with **no 2025 exposure and no rescue tuning**.

## Production status

**NO PROMOTION.** SI-3.1 on `main` remains untouched; PR #6 remains draft/unmerged.