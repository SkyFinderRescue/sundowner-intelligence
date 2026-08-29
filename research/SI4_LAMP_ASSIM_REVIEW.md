# SI-4 issuance-time LAMP assimilation review

Date: 2026-08-28 PDT
Base research head: `a8c2aa40874701ed4adc5ebd29b6d79a6841abc9`
Status: research-only predeclaration; **NO PROMOTION**; no 2025 exposure authorized.

## Why this path is materially different

The exhausted/rejected SI-4 search space has mainly involved transformations or nonlinear post-processing of HRRR/NBM/upstream pressure-level guidance. NOAA/NWS LAMP is structurally different: station-based LAMP is generated using the most recent station observations available at cycle time, analyses of those observations, simple model output, and MOS/model guidance. Since 2023, NOAA documents that LAMP wind speed/direction/gust guidance incorporates both redeveloped GFS MOS and HRRR input. It therefore provides an operational issuance-time observation-assimilation/statistical-correction pathway rather than another coarse pressure-level physics proxy.

Primary NOAA references:
- https://vlab.noaa.gov/web/mdl/lamp-card-2.6.0
- https://vlab.noaa.gov/web/mdl/lamp-change-log
- https://vlab.noaa.gov/web/mdl/lamp-archived-bulletins
- https://vlab.noaa.gov/web/mdl/lamp-archived-bulletins-year
- https://vlab.noaa.gov/web/mdl/lamp

NOAA states that archived hourly station LAMP bulletins are available back through August 2006, including 2024, so a chronological 2024-only fixed-lead experiment is reproducible. LAMP v2.5 (operational during most of 2024) supplies 10-m wind speed, direction and gust guidance through the needed fixed-24h horizon; v2.6 became operational 2024-09-30. Version provenance therefore must be retained exactly and version boundaries must be tested for regime safety rather than normalized away.

## Candidate

Candidate ID: `issuance_time_lamp_assim_v1`

This candidate is not a fabricated NWS Sundowner probability. It may use archived LAMP issuance-time wind speed/direction/gust guidance as additional predictors or a comparator inside the existing SI-4 2024 chronological framework. Only guidance actually available at/before the selected issue time is eligible. The target remains the independently defined Sundowner outcome; future observations are labels only.

## Frozen experiment design before outcomes are inspected

1. Development year: 2024 only. No 2025 rows, event misses, thresholds or diagnostics may be inspected.
2. Lead: exact fixed 24 h wherever the archived bulletin supplies that projection. Preserve cycle timestamp, forecast valid timestamp, station identifier, NOAA product/version, source URL/archive key and file hash.
3. Inputs: archived LAMP WSP/WDR/WGS at predeclared Santa Barbara-area stations that can be mapped independently to the existing validation network. Missing guidance stays null; no nearest-time substitution across issue cycles.
4. Candidate architecture: a chronological training-only local nonlinear combiner may add LAMP WSP/WDR/WGS and LAMP-minus-HRRR disagreement terms to the already frozen issuance-time feature set. No future observation, fire association or post-valid-time variable is permitted.
5. Simple comparators: frozen SI-3.1, current frozen SI-4 research baseline, LAMP deterministic wind/gust/direction alone, HRRR alone, and the predeclared simple logistic comparator.
6. Chronology: nested/forward chronological selection only. Any hyperparameter, transform, threshold or feature selection must be fit exclusively on prior 2024 training folds.
7. Version boundary: report pre-2024-09-30 and post-2024-09-30 results separately because LAMP v2.6 changed operationally on that date. A candidate cannot pass by exploiting a product-version discontinuity.

## Frozen promotion gates

Every existing SI-4 development gate remains mandatory:
- event POD >= baseline +0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Additional LAMP-specific gates:
- no material degradation on either side of the 2024-09-30 LAMP v2.6 implementation boundary;
- improvement must not disappear when LAMP-minus-HRRR disagreement terms are removed in ablation unless the disagreement itself is stable across chronological folds;
- archive gaps are infrastructure/missing-data outcomes, never model evidence.

If any 2024 gate fails, reject `issuance_time_lamp_assim_v1` and do not expose it to 2025. If every gate passes, freeze all transforms/coefficients/thresholds and permit exactly one score-only 2025 evaluation under the existing SI-4 contract.

## Current decision

**Evidence-backed path identified; experiment not yet executed. NO PROMOTION.** Keep `main` on SI-3.1 and PR #6 draft/unmerged. This review is isolated from `si4-research` while the current-head all-season workflow is active.