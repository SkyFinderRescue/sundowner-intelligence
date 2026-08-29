# SI-4 terrain-resolving WRF downscale evidence and predeclaration

Date: 2026-08-29 UTC
Candidate: `terrain_resolving_wrf_downscale_v1`
Status: **MATERIALLY DIFFERENT EVIDENCE-BACKED PATH; FEASIBILITY/2024 DEVELOPMENT ONLY; NO 2025 EXPOSURE; NO PROMOTION**

## Why this path is materially different

The completed SI-4 2024 evidence rejects repeated coarse HRRR pressure-level proxy adjustments as a productive search direction. This candidate instead changes the forecast architecture: dynamically downscale an issuance-time operational NWP state through Santa Ynez terrain at convection-permitting/terrain-resolving resolution, then derive Sundowner occurrence/gust evidence from the locally resolved forecast. This is not another coefficient tweak to existing HRRR pressure-level features.

## Primary-source evidence

1. Duine et al. (2019), *Simulating Sundowner Winds in Coastal Santa Barbara: Model Validation and Sensitivity*, tested 1-km WRF for Sundowner events and found that land-surface roughness and PBL/LSM choice materially control wind bias and the horizontal extent of strong lee-side winds. The paper specifically supports TKE-based/hybrid PBL formulations and sufficiently high effective roughness for downslope windstorms interacting with the marine boundary layer.

2. Janiszeski & Crippa (2025), *Multiscale WRF Modeling of Meso- to Micro-Scale Flows During Sundowner Events*, used nested WRF domains down to 150 m/30 m and showed that higher-resolution topography more realistically represents Sundowner mountain-wave structure, near-surface critical layers, hydraulic-jump behavior, lee-wave/rotor signatures, and coastal ABL interaction. Their namelists/processing code are published for reproducibility.

3. Rolinski et al. (2016), *The Santa Ana Wildfire Threat Index: Methodology and Operational Implementation*, documents an operational Southern California system that dynamically downscales issuance-time NAM forecasts with WRF to 3 km for wind/moisture guidance. It demonstrates that an operational fixed-lead, terrain-aware WRF architecture is feasible and distinct from purely statistical post-processing.

4. A public SDG&E/WIFIRE historical 2-km WRF ensemble dataset exists for Southern California, confirming that high-resolution historical ensemble/downscaling workflows have been operationally maintained in the region, although that dataset is not automatically suitable as leakage-safe SI-4 predictors.

## Frozen candidate protocol

### Forecast inputs

- Use **issuance-time only** operational NWP initial/lateral boundary data archived for the selected forecast cycle.
- Exact target is the existing SI-4 fixed-24h valid-time contract.
- No ERA5/reanalysis fields that assimilate future observations may be used as predictors for scientific scoring.
- Historical observations may be used only as labels in chronological development folds and must remain unavailable to each forecast until verification.
- Fire association remains outcome-only.
- Missing stays missing.

### Architecture

- WRF-ARW dynamic downscaling centered on Santa Barbara County / Santa Ynez Mountains.
- Outer boundary sufficient to represent synoptic/coastal forcing; inner terrain-resolving domain target <=1 km for the first scientific candidate.
- A higher-resolution nest may be explored only as a separately predeclared feasibility extension; it may not be introduced after seeing outcome scores to rescue a failed candidate.
- PBL/LSM/roughness options must be selected **before outcome scoring**, using published Sundowner/downslope-wind evidence and plumbing stability only.
- No physics-suite search against event outcomes.
- Forecast spin-up duration, domain geometry, topography source, vertical levels, and extraction points must be frozen before scientific scoring.

### Feasibility gate before science

Before any event scoring, prove on a predeclared 2024 archive/plumbing sample that:

1. exact issuance and F24 valid-time provenance are reproducible;
2. all boundary/input objects have archived keys and hashes;
3. WRF completes deterministically with bounded infrastructure retry;
4. target surface wind/gust/direction plus the needed vertical diagnostics are extractable at frozen Santa Barbara/Santa Ynez points;
5. no future-valid or reanalysis information leaks into predictors;
6. runtime/storage are practical enough to support chronological 2024 CV without silently reducing the sample after outcomes are known.

If feasibility fails, fix only model setup/archive/plumbing. Do not consult event outcomes to choose replacement dates or physics.

## 2024-only chronological development gates

Only after feasibility passes, run chronological 2024 CV under the already frozen SI-4 promotion gates:

- event POD >= baseline + 0.05 absolute;
- event FAR no worse than baseline;
- overall Brier no worse;
- AUC >= baseline - 0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - 0.01;
- regime safety passes;
- gust MAE/RMSE improve or remain non-inferior with non-inferior bias.

The candidate must also show that any improvement is not confined to one physics-sensitive case or one regime.

## 2025 firewall

- **No 2025 exposure** unless every frozen 2024 development gate passes.
- If any 2024 gate fails, reject this candidate and do not tune physics, thresholds, coefficients, domains, or feature transforms using 2025.
- If every gate passes, freeze the complete WRF configuration and downstream transforms, then permit exactly one score-only 2025 evaluation.

## Production status

- SI-3.1 on `main`: unchanged.
- PR #6: remain draft/open/unmerged.
- RRFS: shadow-only.
- Previously rejected SI-4 candidates remain rejected.
- Current SI-4 production promotion status: **NO PROMOTION**.

## Immediate next work

1. Audit publicly reproducible 2024 operational boundary archives (prefer archived GFS/NAM/HRRR-compatible issuance-time data) for exact F24 downscaling.
2. Reproduce a minimal WRF Sundowner-domain run using literature-supported physics without reading verifying observations.
3. Estimate compute/storage cost for a leakage-safe 2024 chronological CV.
4. Do not begin scientific outcome scoring until the feasibility contract above is satisfied.
