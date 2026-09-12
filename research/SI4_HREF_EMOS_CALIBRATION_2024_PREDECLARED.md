# SI-4 HREF EMOS Calibration — 2024 Predeclaration

Date: 2026-09-01
Status: **RESEARCH ONLY / 2024-ONLY / NO PROMOTION AUTHORITY**
Candidate: `href_emos_calibration_v1`

## Why this is materially different

The corrected HREF initial-condition ensemble experiment demonstrated a meaningful 2024 event-POD gain but failed safety/calibration gates because FAR and hard-negative FPR worsened. This candidate does **not** add another HRRR pressure-level proxy and does not alter HREF member physics. It applies a proper probabilistic ensemble-postprocessing architecture (Ensemble Model Output Statistics, EMOS) to the already frozen issuance-time HREF member forecasts.

EMOS has independent peer-reviewed support for calibrating biased/underdispersive wind ensembles. Thorarinsdottir & Gneiting (2010) introduced heteroskedastic censored-regression EMOS for wind speed and reported substantial improvement relative to raw mesoscale ensembles. Odak Plenkovic et al. (2020) evaluated EMOS/analog postprocessing for wind in complex terrain, using censored logistic regression for nonnegative wind. Open-source R `ensembleMOS` implements truncated-normal/lognormal EMOS fits and exchangeable-member handling.

Primary/open-source references:
- https://stat.uw.edu/research/tech-reports/probabilistic-forecasts-wind-speed-ensemble-model-output-statistics-using-heteroskedastic-censored
- https://doi.org/10.1002/qj.3769
- https://search.r-project.org/CRAN/refmans/ensembleMOS/html/fitMOS.html
- https://search.r-project.org/CRAN/refmans/ensembleMOS/html/fitMOStruncnormal.html

## Scientific hypothesis

A leakage-safe chronological EMOS layer may preserve the raw HREF ensemble's demonstrated event-recall improvement while correcting ensemble bias/dispersion sufficiently to restore FAR, Brier, and hard-negative performance. This is a hypothesis only; no improvement is claimed by this predeclaration.

## Frozen design constraints

1. **2024 only.** 2025 remains sealed unless every existing 2024 promotion gate passes.
2. **Inputs:** only the already accepted exact-F24, source-QC-corrected HREF member forecasts and static zone/terrain metadata available at issuance time.
3. **No future observations as predictors.** Historical verification observations may enter model fitting only when their valid time is strictly earlier than the issuance being scored.
4. **Chronological fitting only.** Each scored issuance uses parameters fit only to prior eligible 2024 data. No random CV.
5. **No outcome-driven member pruning.** Exchangeability/member grouping must be fixed from HREF provenance, not performance.
6. **Distribution family frozen before scoring:** primary family is zero-truncated normal EMOS for wind/gust. A censored-logistic sensitivity implementation may be run only as a predeclared secondary diagnostic; it cannot be chosen post hoc to rescue gates.
7. **No threshold cheating.** Event-probability threshold selection, if needed, occurs inside each chronological training fold under the same rule for all scored dates; no global 2024 holdout threshold rescue.
8. **Missing stays missing.** No imputation using future cycles/observations; existing source-QC exclusions remain unchanged.
9. **Fire association remains outcome-only.** It is excluded from occurrence prediction and calibration inputs.
10. **No feature expansion during scoring.** This experiment calibrates the frozen HREF ensemble; it does not add new coarse HRRR physics proxies.

## Frozen promotion gates

The candidate must clear **all** existing gates, unchanged:
- event POD >= baseline +0.05 absolute;
- FAR no worse than baseline;
- Brier no worse;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety passes;
- gust non-inferiority passes.

Failure of any gate => **REJECT**, no 2025 exposure and no retuning rescue.

## Phase order

Phase 0: reproduce the corrected HREF archive/member provenance and confirm deterministic chronological EMOS fitting on a non-outcome smoke subset.

Phase 1: run one frozen full-2024 chronological evaluation against the existing baseline and corrected raw-HREF candidate.

Phase 2: only if every frozen 2024 gate passes, authorize independent 2025 holdout evaluation. Production/release/browser QA remains prohibited until that independent holdout also passes required promotion rules.

## Production status

**NO PROMOTION.** SI-3.1 on `main` remains untouched. PR #6 must remain draft/open/unmerged.