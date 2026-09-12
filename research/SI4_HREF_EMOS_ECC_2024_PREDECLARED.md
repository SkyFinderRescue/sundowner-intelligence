# SI-4 HREF EMOS + Ensemble Copula Coupling — 2024 Predeclaration

Date: 2026-09-01
Status: **RESEARCH ONLY / 2024-ONLY / NO PROMOTION AUTHORITY**
Candidate: `href_emos_ecc_v1`

## Why this is materially different

The corrected raw-HREF experiment achieved the required event-POD gain but failed FAR, hard-negative FPR, spatial precision, and regime-safety gates. The already predeclared `href_emos_calibration_v1` addresses marginal calibration of wind/gust probabilities, but independent pointwise calibration alone can destroy or fail to restore the spatial/temporal dependence structure needed for geographically coherent Sundowner forecasts.

This candidate adds a distinct multivariate postprocessing architecture: Ensemble Copula Coupling (ECC). ECC first calibrates the univariate predictive margins, then restores the raw ensemble's multivariate rank-dependence structure by reordering calibrated samples according to the raw ensemble member ranks. This is not another HRRR pressure-level proxy, another physics feature, or a threshold change.

The architecture has direct fire-weather precedent. Worsnop, Scheuerer & Hamill (2020, Monthly Weather Review) combined EMOS with ECC to generate locally calibrated and spatially coherent probabilistic forecasts of the hot-dry-windy index and its components over CONUS. Foundational ECC work (Schefzik, Thorarinsdottir & Gneiting, 2013) formalized the method and demonstrated it for wind and other meteorological variables. A newer 2026 open-source COBASE implementation provides an independently reproducible copula-shuffling reference architecture, and public Neighborhood-ECC code also exists.

Primary/open-source references:
- https://doi.org/10.1175/MWR-D-19-0217.1
- https://doi.org/10.1214/13-STS443
- https://github.com/elisaperrone/COBASE_github
- https://github.com/btrotta-bom/necc-paper-code

## Scientific hypothesis

If chronological EMOS can preserve the corrected HREF event-recall gain while reducing marginal overforecasting, ECC may retain or restore the member-level spatial dependence needed to avoid the raw candidate's spatial-precision/regime-safety regression. This is a hypothesis only; no improvement is claimed by this predeclaration.

## Frozen design constraints

1. **2024 only.** 2025 remains sealed unless every existing 2024 gate passes.
2. **Inputs:** only the already accepted exact-F24, source-QC-corrected HREF members plus the frozen chronological EMOS predictive distributions and static zone/terrain metadata available at issuance time.
3. **No new physics features.** No additional coarse HRRR pressure-level proxy or outcome-derived feature is authorized.
4. **No future observations as predictors.** Historical verification observations may enter chronological EMOS fitting only when strictly prior to the issuance being scored.
5. **ECC variant frozen before scoring:** primary implementation is deterministic ECC-Q using equally spaced quantiles and the raw HREF member rank structure. No post-hoc switching among ECC-Q/ECC-R/ECC-T, Schaake shuffle, COBASE, or Neighborhood-ECC to rescue gates.
6. **Raw-member dependence only.** The copula/rank template must come from the same issuance-time HREF ensemble being calibrated; no future-date observation ranks or outcome-selected analog dates.
7. **No outcome-driven member pruning or spatial mask tuning.** Member grouping and zone geometry remain frozen from provenance/production definitions.
8. **No threshold cheating.** Event thresholds remain governed by the existing chronological training-only rule. ECC cannot be used to retune the global 2024 threshold after holdout inspection.
9. **Missing stays missing.** No future-cycle/member substitution.
10. **Fire association remains outcome-only.** It cannot enter calibration or dependence reconstruction.

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

Phase 0: implement deterministic ECC-Q against synthetic/non-outcome data and verify that univariate EMOS marginals are preserved exactly while the raw HREF rank structure is restored reproducibly.

Phase 1: only after `href_emos_calibration_v1` itself is reproducible, run one frozen full-2024 chronological evaluation of EMOS+ECC against baseline, corrected raw HREF, and EMOS-only outputs. The ECC candidate is not allowed to alter the EMOS fit or event threshold.

Phase 2: only if every frozen 2024 gate passes, authorize independent 2025 holdout evaluation. Production/release/browser QA remains prohibited until an independently passing candidate clears all promotion rules.

## Production status

**NO PROMOTION.** SI-3.1 on `main` remains untouched. PR #6 must remain draft/open/unmerged.
