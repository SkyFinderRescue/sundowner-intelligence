# SI-4 Matched Archived NDFD 2025 Milestone — 2026-08-16

Status: **RESEARCH ONLY — DO NOT MERGE TO PRODUCTION**

This milestone records the first exact-row archived 2025 comparison between the frozen SI-3/SI-4 systems and deterministic NDFD guidance after all NDFD development rules were frozen on 2024 only.

## Authoritative provenance

- Frozen SI-4 source run: `31925677059`
- Frozen SI-4 source head: `764dd885590970bfc272a0dbd0a2e8ae691cb3ed`
- Frozen NDFD score/rule source run: `31970887477`
- Frozen NDFD rule file: `research/NDFD_2024_FROZEN_RULES.json`
- Exact matched 2025 benchmark run: `31985648424` (`SI-4 NDFD Exact Matched 2025 Benchmark` run #5)
- Isolated benchmark branch head: `6f9a05161e2753bbf14b59c1c2c1ba04113240ec`
- Artifact: `si4-ndfd-exact-matched-2025`
- Artifact SHA-256: `9bdc3025bf0e7cc844a39583d566604d0e25ed74d4076cc75c6d4af6ad0a02cb`
- Exact common station-valid-time rows: **195**
- HRRR upper-air extraction at those NDFD valid times used the NOAA archived extended-cycle source with **minimum forecast lead 24 h**; the realized source cycle in this run was 25 h.

## Frozen 2025 score-only results

### Meteorological Sundowner probability

NDFD is deterministic and receives **no fabricated Sundowner probability or Brier score**.

- SI-3 Brier: **0.0720533**
- SI-4 Brier: **0.0559864**
- SI-3 AUC: **0.809319**
- SI-4 AUC: **0.916722**

On these exact common 195 rows, SI-4 reduced Brier by about **22.3%** relative to SI-3 while increasing overall AUC.

Regime caveat: western AUC was slightly lower for SI-4 than SI-3 (**0.82964 vs 0.83367**) and eastern AUC was also lower (**0.67532 vs 0.71429**) on this small matched subset. The overall gain therefore does not erase regime-level caution.

### Peak-gust error on identical rows

- SI-3 MAE: **5.6749 mph**; bias **-0.7662 mph**; RMSE **7.4971 mph**
- SI-4 MAE: **5.0621 mph**; bias **+1.4662 mph**; RMSE **7.1687 mph**
- NDFD MAE: **6.0046 mph**; bias **-2.0831 mph**; RMSE **8.3704 mph**

SI-4 had the lowest overall gust MAE and RMSE on this matched sample. That is direct evidence on identical observations, but it is not a blanket claim that SI-4 is superior to NWS guidance across all forecast dimensions.

### Wind direction on identical rows

- SI fixed-lead surface direction mean absolute error: **54.25°**
- NDFD direction mean absolute error: **50.22°**

NDFD was better on overall direction error in this sample. SI was better than NDFD in the western regime but worse in hybrid/eastern direction error.

### Frozen deterministic NDFD strong-wind threshold skill

The threshold was selected on 2024 development only and remained frozen for 2025:

- Observed gust threshold: **30 mph**
- NDFD gust threshold: **28 mph**
- TP 15 / FP 6 / TN 156 / FN 18
- POD **0.455**
- FAR **0.286**
- Precision **0.714**
- CSI **0.385**
- Specificity **0.963**

This is strong-wind skill only; it is not treated as an NDFD Sundowner probability.

## Integrity checks

- Same rows used for all systems: **yes**
- Future observations used only as labels: **yes**
- Fire association used as predictor/target: **no**
- Missing values fabricated: **no**
- NDFD probability invented: **no**
- NDFD thresholds changed after viewing 2025: **no**
- SI model coefficients changed to clear infrastructure: **no**

## Promotion interpretation

This completes an important matched archived NDFD milestone and supports the claim that SI-4 has better gust error than NDFD on this exact 195-row score-only sample and better overall SI probability skill than frozen SI-3 on the same rows. It does **not** close the full NWS benchmark gate by itself and does **not** authorize production promotion.

Remaining work includes larger/event-level timing and spatial correctness, hard-negative/regime caveats, HRRR cycle agreement, RRFS/REFS shadow evaluation, direct GOES-West marine-layer validation, cross-validated terrain/gust correction, SWEX final-QC ingestion, final ablation, release verification, and desktop/iPhone browser QA.
