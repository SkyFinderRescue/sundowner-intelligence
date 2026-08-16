# SI-4 Promotion Gate Status

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

The verified SI-3.1 release on `main` remains the production baseline. PR #6 stays draft and unmerged.

## Independently measured gates

- **All-season fixed-24h frozen holdout:** complete for training 2024-01-01..2024-12-31 and holdout 2025-01-01..2025-12-31 using 23,392 archived NOAA HRRR pressure-profile rows. Overall SI-4 holdout skill improved versus the frozen SI-3 baseline in the latest successful all-season evidence artifact; this does not by itself authorize promotion.
- **Hard-negative false-alarm gate:** **FAIL** on the frozen 2025 subset. Aggregate negative-only Brier worsened from 0.0259841 to 0.0403595. Hybrid and eastern regimes passed their non-inferiority checks, but western hard negatives did not: n=149, negative-only Brier 0.0216663 -> 0.3236434. Western FPR at the training-selected matched-POD threshold did improve (0.74497 -> 0.66443), so the blocker is probability overconfidence/calibration on western hard negatives rather than thresholded FPR.
- **Coefficient policy:** no coefficient/model adjustment is permitted merely to clear the failed western gate. Any remedy must be defined from training-only evidence or an independent mechanistic feature and then re-tested once on the frozen 2025 holdout.

## Work in progress

- HRRR forecast-cycle agreement ingestion/diagnostic has been added as a research-only workflow. It compares identical valid times across F18/F24/F30/F36 archived NOAA HRRR pressure guidance and produces descriptive mountain-wave/cross-barrier spread evidence without fitting or promotion claims.
- Full quality-controlled SWEX ingestion remains incomplete. Current authoritative NCAR/EOL metadata confirms several needed datasets are CODIAC-orderable; GET-only acquisition discovery is working, but the full observation payload has not yet been ingested.

## Gates still required before any production-promotion decision

- pass hard-negative false-alarm/calibration gate in every sufficiently sampled regime;
- complete and score HRRR cycle-history confidence evidence;
- full SWEX QC observation ingestion and event-window feature extraction;
- RRFS/REFS shadow-only retrospective/live benchmark;
- direct GOES-West marine-layer feature validation;
- cross-validated direction/regime/stability-conditioned terrain/gust correction;
- matched archived NWS/NDFD benchmark on identical valid times/zones/observations;
- event onset/peak/decay and spatial correctness;
- final ablation;
- production data-health/release verification and desktop/iPhone browser QA.
