# SI-4 Scorer Trapping Proxy — Frozen 2024 Chronological CV Plan

Status: **PREDECLARED — 2024 DEVELOPMENT ONLY — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 stays draft/unmerged. This experiment must not load the frozen 2025 holdout unless every gate below passes in 2024 chronological CV.

## Independent physical hypothesis

Primary mountain-wave theory and Santa Barbara downslope-wind literature identify vertical decreases in the Scorer parameter as a condition favoring trapped lee-wave energy. The Scorer parameter is

`l^2 = N^2/U^2 - Uzz/U`,

where `N` is Brunt–Vaisala frequency and `U` is barrier-normal wind. SWEX literature independently establishes that mountain-wave structure, upstream stability, critical layers and lee-wave/hydraulic-jump behavior affect Sundowner surface winds. This experiment tests a **coarse pressure-level trapping proxy**, not a claim that operational HRRR resolves the rotor or hydraulic jump itself.

This is materially different from the rejected `wave_momentum_descent_v1`: it does not use HRRR pressure vertical velocity. It tests vertical wave-ducting structure from thermodynamic stability and cross-barrier wind curvature.

Primary/authoritative basis:
- Scorer (1949) trapped-wave criterion as summarized and applied in peer-reviewed mountain-wave literature.
- Carvalho et al. (2024), *BAMS*, DOI 10.1175/BAMS-D-22-0171.1: SWEX identifies upstream stability, mountain waves, critical layers and coastal boundary-layer interaction as key Sundowner controls.
- Janiszeski et al. (2025), *JGR Atmospheres*, DOI 10.1029/2024JD042972: multiscale SWEX modeling identifies increasing mountaintop stability and mountain-wave/near-surface critical-layer behavior as major drivers.

## Frozen inputs

- Development year: **2024 only**.
- Exact forecast lead: **F24**.
- Frozen five-point upstream archive: GitHub Actions run `32552410978`, head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`.
- Upstream pressure levels: 850, 700 and 500 hPa with temperature, geopotential height and wind.
- Existing frozen SI-4 upper-air baseline artifact from all-season run `31925677059`.
- HADS/RAWS verifying winds are label-only.
- Fire association remains outcome-only.
- Missing inputs remain missing.
- No 2025 rows may be loaded.

## Frozen feature

For each of the five upstream points and each exact-F24 valid time:

1. Convert temperature to potential temperature at 850/700/500 hPa.
2. Estimate layer `N^2 = g * d(ln theta)/dz` for 850–700 and 700–500 hPa, clipped only at zero for the stable-wave term.
3. Resolve signed barrier-normal wind `U` for each SI-4 zone orientation.
4. Estimate the nonuniform-grid second vertical derivative `Uzz` at 700 hPa from the three geopotential heights.
5. Form a finite-resolution Scorer-curvature term at 700 hPa and layer stability terms `N^2/U^2` using a fixed minimum absolute barrier-normal wind of 2 m/s only to prevent singular division. Cases whose 700-hPa signed barrier-normal wind is <=0 remain zero-support rather than having their sign fabricated.
6. Define a trapping-support proxy from (a) a positive lower-minus-upper stability-term contrast and (b) curvature contribution that lowers the effective Scorer parameter aloft/midlevel in the trapping-favorable sense. The two components are nonnegative and combined geometrically.
7. Aggregate the five frozen points using only the predeclared choices `median` or `maximum`.

No thresholds are selected from 2025. No individual 2025 miss is inspected.

## Frozen candidate search

Only additive probability coefficients `[0.00, 0.02, 0.04, 0.06, 0.08]` and aggregation choice `{median, maximum}` may be selected, independently inside each chronological **training** fold.

The adjustment is bounded as:

`candidate = baseline + coef * (1 - exp(-proxy / training_fold_positive_scale))`

with probability clipped to `[0.001, 0.999]`. The baseline train-only event threshold remains unchanged for candidate scoring.

Chronological validation folds remain the established May–June, July–September and October–December 2024 score folds with expanding prior-time training.

## Frozen promotion gates

Every gate must pass before a single 2025 score-only exposure is authorized:

- event POD >= baseline + **0.05 absolute**;
- event FAR no worse;
- overall Brier no worse;
- overall AUC >= baseline - **0.005**;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline - **0.01**;
- regime safety: no regime Brier > 1.02x baseline and no regime AUC degradation > 0.01 when defined;
- gust output unchanged/non-inferior;
- feature coverage >= 90%;
- at least one chronological training-fold selector must choose a nonzero coefficient.

If any gate fails, reject `scorer_trapping_proxy_v1`, persist the rejection, and **do not expose it to 2025**. Do not retune levels, orientations, denominator floor, coefficient grid, transforms, labels or gates after seeing the result.
