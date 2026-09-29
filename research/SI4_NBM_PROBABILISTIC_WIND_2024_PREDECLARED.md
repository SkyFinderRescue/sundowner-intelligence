# SI-4 NBM Probabilistic Wind 2024 — Predeclared Feasibility Lane

Status: RESEARCH ONLY — NO PROMOTION — NO 2025 EXPOSURE

## Why this lane is materially different

This lane evaluates NOAA's operational National Blend of Models (NBM) as an issuance-time probabilistic multi-model post-processing architecture rather than another single-model HRRR pressure-level proxy. NBM blends NWS and non-NWS deterministic and ensemble NWP guidance, applies bias correction / quantile mapping / weighting, and produces calibrated wind and wind-gust guidance on the ~2.5-km CONUS grid.

NBM v4.1 already provided CONUS quantile-mapped 24-hour peak wind / gust percentile guidance. NBM v4.2 entered operations 2024-05-15 and added instantaneous quantile-mapped 10-m wind speed and gust probabilistic products, so 2024 contains a known operational-version boundary that must be handled explicitly and cannot be ignored or tuned around.

## Phase 0 only

Before any outcome scoring, establish reproducible 2024 archival access and exact issuance/lead provenance for the candidate fields. Preferred source order:

1. official NOAA/NODD/NBM GRIB2 archive if historical 2024 objects are reproducibly available;
2. independently archived immutable NBM GRIB2 only if object provenance, cycle time, model version, checksum, and field metadata can be verified against NOAA documentation.

No scientific scoring is permitted until the archive source and field semantics are frozen.

## Candidate data contract

Potential issuance-time fields are limited to NBM wind/gust products that existed operationally at the relevant 2024 date and can be reproduced at the frozen forecast lead. Candidate families may include deterministic 10-m wind/gust, ensemble spread, percentile guidance, and probability-of-exceedance guidance where available.

The 2024-05-15 v4.1 -> v4.2 transition is a mandatory regime boundary. The experiment must either use a field family demonstrably consistent across both versions or predeclare a version-safe handling strategy before labels/outcomes are inspected. No backfilling newer-v4.2-only products into earlier 2024 dates.

## Leakage and safety rules

- issuance-time forecast guidance only;
- no URMA or other verifying analysis values used as predictors;
- no future observations;
- no fire association predictors (outcome only);
- missing remains missing;
- no threshold rescue or post-hoc percentile selection;
- no 2025 access for tuning, selection, or feasibility decisions;
- no retuning of already rejected SI-4 candidates.

## Frozen promotion gates

A future 2024-only candidate may proceed only if it is frozen before scoring and must satisfy all existing gates:

- event POD >= baseline +0.05 absolute;
- FAR no worse than baseline;
- Brier no worse than baseline;
- AUC >= baseline -0.005;
- hard-negative Brier and FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Failure of any gate = REJECTED and 2025 remains sealed.

## Primary-source basis

- NOAA/NWS NBM documentation: NBM is a calibrated blend of NWS/non-NWS NWP and post-processed guidance with bias correction and probabilistic output.
- NOAA NBM v4.2 operational upgrade, effective 2024-05-15: added instantaneous quantile-mapped 10-m wind speed and gust probabilistic products and improved wind/gust guidance.
- NOAA Open Data Dissemination publishes NBM GRIB2 through the noaa-nbm-grib2-pds bucket.

This file authorizes archive/reproducibility investigation only. It does not authorize 2024 occurrence scoring until provenance and the version boundary are frozen and verified.