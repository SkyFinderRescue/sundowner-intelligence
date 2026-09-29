# SI-4 Upstream Thermal / Subsidence Hypothesis — 2024 Predeclared Development Gate

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

This document freezes the next SI-4 hypothesis **before any candidate scoring**. It is intentionally distinct from the already-rejected local transition/onset, persistence, static inversion/refined-coupling, GOES marine-layer, HRRR cycle-agreement, and terrain/gust candidates.

## Primary-source physical basis

The July 2026 SWEX IOP2 study (Seto et al., Atmospheric Research 337, 108920; DOI 10.1016/j.atmosres.2026.108920) reports that the eastern Sundowner setup included: (1) cold-air advection in the lower troposphere upstream of the Santa Ynez/San Rafael Mountains, (2) strong north-to-south pressure forcing, (3) an elevated stable layer near ridge height, and (4) enhanced upper-level subsidence associated with an amplifying ridge. The same study emphasizes that surface pressure difference alone does not reliably determine onset, duration, or magnitude and that upstream thermodynamic structure modulates downstream mountain-wave behavior.

This motivates testing whether **spatially resolved upstream thermal forcing and synoptic subsidence support** can identify true Sundowner setups that the current SI-4 probability model misses without simply increasing probability everywhere.

## Hypothesis

A true event that is undercalled by the current research model is more likely when the following occur together at the fixed forecast lead:

1. **Upstream 850-mb cold-pool support** north/northeast of the Santa Ynez Mountains relative to the lee/coastal side.
2. **Cross-barrier thermal contrast** consistent with lower-tropospheric cold-air advection into the upstream side of the terrain.
3. **Northerly / ridge-normal momentum at 850 mb** sufficient to force the stable layer over the range.
4. **Synoptic subsidence / ridge support aloft**, represented only by reproducible forecast fields available at issuance time (for example 700/500-mb vertical velocity and/or height-field diagnostics if archive availability is reliable).
5. A regime-specific interaction with the existing pressure and mountain-wave state; the new signal must not be used as a generic additive probability boost.

The candidate will be called `upstream_thermal_subsidence_v1` unless archive constraints require a documented availability-only adaptation before scoring.

## Data / leakage rules

- Development period: **2024-01-01 through 2024-12-31 only**.
- Forecast lead: **fixed 24 h**.
- HRRR fields must come from archived NOAA HRRR forecast files and must be available at issuance time.
- 2025 observations/outcomes must not be loaded, searched, summarized, or inspected by the development workflow.
- Future observations remain label-only.
- Fire association remains outcome-only and is not a meteorological predictor or target.
- Missing archive fields remain missing; no fabrication or imputation solely to increase coverage.
- Any availability-only adaptation must be documented before candidate scoring and cannot use event labels or observations to select cases/fields.

## Proposed spatial points

At minimum, preserve separate fixed points for:

- Santa Ynez Valley / north side of the Santa Ynez Mountains,
- Cuyama / interior upstream air mass,
- Bakersfield / southern San Joaquin Valley synoptic reference,
- Santa Barbara lee/coastal side,
- western Santa Barbara Channel / Point Conception-side marine reference where archive geometry supports it.

Exact coordinates must be frozen in source before scoring.

## Predeclared 2024 chronological-CV promotion gates

The candidate is eligible for **one frozen 2025 score-only evaluation** only if all gates pass in chronological 2024 development:

1. **Event recall / POD:** improve by at least **+0.05 absolute** versus the exact baseline used by the same evaluator.
2. **Event false-alarm rate:** **no worse than baseline**.
3. **Overall Brier score:** **no worse than baseline**.
4. **Overall AUC:** no worse than **baseline - 0.005**.
5. **Hard-negative calibration:** hard-negative negative-only Brier **no worse than baseline**, and hard-negative FPR **no worse than baseline** at the matched threshold.
6. **Spatial precision:** no worse than **baseline - 0.01 absolute** using the evaluator's predeclared zone/event definition.
7. **Regime safety:** no material regime collapse; western, hybrid, and eastern results must be reported separately when sample size permits.
8. **Gust safety:** if the candidate changes gust output, gust MAE/RMSE must be non-inferior; if it changes probability only, gust output must remain bit-for-bit unchanged.

No gate may be relaxed after results are seen.

## Decision rule

- If all gates pass: freeze the exact extractor, spatial points, transforms, coefficients/thresholds, and hashes; then permit **one** 2025 score-only run.
- If any gate fails: mark the candidate rejected and do **not** expose it to 2025.
- A workflow success is not a science pass.
- No result here authorizes a change to `main`, PR #6 merge, or production deployment.
