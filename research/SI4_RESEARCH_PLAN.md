# Sundowner Intelligence SI-4 — Research and Validation Plan

Status: **RESEARCH ONLY**. The validated SI-3.1 release on `main` remains the production baseline. Nothing in this branch may be loaded by production until the promotion gates below pass.

## Non-negotiable rules

1. Sundowner occurrence is meteorological. `fire_associated` remains a separate outcome field and is never a target definition or predictor of event occurrence.
2. Verifying future wind observations are label-only in fixed-lead experiments. No target leakage.
3. Chronological splits are required. No random train/test mixing across forecast time.
4. Existing SI-3.1 is the benchmark. A new feature is promoted only if it improves independent skill or provides a clearly demonstrated operational benefit without materially degrading other regimes/zones.
5. A science/model change cannot reach `main` until fixed-lead validation, event validation, release verification, and production browser QA all pass.
6. Missing data remains missing. Never fabricate a sounding, observation, pressure value, satellite feature, or fire outcome.

## Workstream order

### SI4-1 — Mountain-wave and mean-state critical-level physics

Build explicit profile diagnostics rather than the SI-3.1 coarse 850/700/500-hPa reversal proxy.

Candidate predictors:
- cross-barrier wind profile at 925/850/700/600/500 hPa and finer levels when available;
- interpolated mean-state critical-level altitude;
- indicator for critical level below 5 km and below 3 km;
- potential-temperature profile and ridge-layer Brunt–Vaisala frequency;
- cross-barrier Froude-like parameter;
- wind reversal/critical-level structure;
- mountain-wave amplification index;
- regime/zone-specific terrain orientation.

Primary science basis:
- Duine et al. (2025), *Weather and Forecasting*, DOI 10.1175/WAF-D-24-0084.1.
- Carvalho et al. (2024), *BAMS*, DOI 10.1175/BAMS-D-22-0171.1.
- NCAR/EOL SWEX: https://www.eol.ucar.edu/field_projects/swex

### SI4-2 — Full SWEX observational mining

The existing `data/swex-2022-events.json` is an IOP truth-window catalog, not a vertical-observation dataset. Build an independent SWEX feature/reconstruction layer from public quality-controlled observations.

Inventory:
- ISS1, Santa Barbara County Offices: 449-MHz wind profiler, Windcube 200S lidar, CL61 ceilometer, surface met;
- ISS2, Rancho Alegre/Lake Cachuma: 915-MHz wind profiler, RS41 radiosondes, CL51 ceilometer, surface met;
- ISS3, Sedgwick Reserve: 915-MHz wind profiler + RASS, RS41 radiosondes, CL31 ceilometer, surface met;
- ISFS surface/flux network;
- mobile/aircraft observations where practical and quality-controlled.

Extract by IOP and matched non-event windows:
- upstream and downstream wind profiles;
- critical-level height/evolution;
- inversion/stability structure;
- mountain-wave signatures;
- marine-layer depth/erosion/intrusion;
- onset/peak/decay timing and west-to-east evolution;
- surface wind, temperature, RH, pressure response.

SWEX data policy states final QC data became public domain no later than 16 July 2023: https://www.eol.ucar.edu/content/swex-data-policy

### SI4-3 — All-season hard-negative calibration

Replace spring-only research comparison with all-season chronological candidate training and holdout.

Initial frozen design:
- training: 2024-01-01 through 2024-12-31;
- holdout: 2025-01-01 through 2025-12-31;
- forecast lead: fixed 24 h;
- archived HRRR predictors only from information available at forecast issuance;
- HADS/RAWS verifying winds label-only.

Explicitly tag hard negatives: strong pressure/wave precursor setup but no verifying Sundowner. Subclassify likely marine-blocked, direction-misaligned, weak-wave, and timing-failure cases where evidence supports it.

### SI4-4 — Event-state / propagation model

Add a research-only event evolution layer:

`NONE -> WESTERN -> HYBRID -> EASTERN -> DECAY`

Do not force every event through every state. Estimate zone onset, transition, peak, and decay separately. Test whether state-transition features improve onset-time error and spatial/zone correctness beyond independent hourly zone probabilities.

Primary case-study basis includes SWEX IOP10 (May 12-13, 2022), where observed strong eastern flow preceded the maximum pressure gradient and the event evolved spatially.

### SI4-5 — Forecast-cycle agreement and RRFS shadow evaluation

Measure HRRR run-to-run consistency rather than treating the newest cycle as absolute truth. Candidate confidence features:
- preceding-cycle probability spread;
- gust spread;
- onset-time spread;
- monotonic strengthening/weakening trend;
- agreement of mountain-wave/critical-level diagnostics.

Add RRFS/REFS as **shadow guidance only**. Do not replace HRRR until retrospective and live parallel comparisons demonstrate better Santa Barbara Sundowner skill. NOAA's RRFS/REFS pre-implementation/operational transition must be tracked because filenames/availability can change.

### SI4-6 — Direct GOES-West marine-layer gate

Create a research Marine Layer Resistance Index using direct satellite and surface/model evidence:
- GOES-West nighttime microphysics / fog-low-stratus or suitable low-cloud product;
- low-cloud fraction around the south coast and Channel;
- coastal ceiling and dewpoint depression;
- 925-hPa RH;
- boundary-layer depth;
- observed/model erosion or intrusion trend.

The output is a gate/resistance feature, not a Sundowner label.

### SI4-7 — Learned terrain response / gust correction

Replace one static per-zone gust bias with cross-validated local response correction conditioned on:
- wind direction sector;
- regime;
- mountain-wave index;
- stability/marine state;
- season/time of day;
- station/zone.

Cap correction magnitude and require enough samples per bin. Fall back to the existing SI-3.1 zone bias when evidence is sparse.

### SI4-8 — Matched NWS benchmark

Build a fair archived comparison using NWS/NDFD guidance and the same independent verifying observations used for SI-4.

Score both systems on identical valid times/zones:
- Brier score and reliability;
- POD, FAR, precision/recall;
- peak-gust MAE and bias;
- onset/peak-time error;
- useful lead time;
- zone/spatial correctness;
- strong-event skill.

Do not claim superiority over NWS unless this matched benchmark demonstrates it.

## Promotion gates

A candidate can be considered for SI-4 production only when all of the following are true:

- all science unit tests pass;
- all-season 2025 frozen holdout is complete;
- Brier score improves overall and does not materially degrade any regime without a documented tradeoff;
- ROC AUC is non-inferior overall and materially better where the new feature is intended to help;
- false-alarm performance improves on the hard-negative subset;
- peak-gust MAE/bias is non-inferior after terrain correction;
- onset-time and spatial correctness are tested on the curated event set;
- SWEX IOPs remain independent event-level tests, not memorized target leakage;
- RRFS remains shadow-only until it wins a separate benchmark;
- NWS comparison uses matched archived guidance, not hindsight products;
- production data-health/degraded-mode behavior still works;
- existing release verification and desktop/mobile browser QA pass.

## Current implementation status

- [x] Preserve SI-3.1 production baseline.
- [x] Create isolated `si4-research` branch.
- [x] Add explicit critical-level interpolation and mountain-wave diagnostics.
- [x] Add ridge-layer stability / Brunt-Vaisala diagnostic.
- [x] Add marine-layer resistance function.
- [x] Add forecast-cycle agreement diagnostic.
- [x] Add event-state transition classifier.
- [x] Add hard-negative tagger.
- [x] Add terrain-response correction primitive.
- [x] Add all-season chronological candidate calibration builder.
- [x] Add research-only CI/smoke-validation workflow.
- [ ] Complete full SWEX QC observation ingestion and feature extraction.
- [ ] Complete all-season 2024/2025 candidate run and frozen holdout scoring.
- [ ] Build HRRR cycle-history ingestion and score confidence gains.
- [ ] Build RRFS retrospective/live shadow sampler and benchmark.
- [ ] Build direct GOES-West marine-layer feature extraction and validation.
- [ ] Fit cross-validated direction/stability-conditioned terrain response.
- [ ] Build archived NDFD matched benchmark.
- [ ] Run final ablation study and decide which features, if any, earn promotion.
