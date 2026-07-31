# Sundowner Intelligence

Experimental hyperlocal Sundowner prediction and decision-support beta for the Santa Barbara County front country.

## Mission

Sundowner Intelligence is designed for one narrow problem: estimate **where a Sundowner is likely, when it may begin, how strong it may become, how long the threat window may persist, and how confident the system is**. It does not replace official National Weather Service watches, warnings, Red Flag Warnings, spot forecasts, IMET products, agency policy, or field observations.

## Operational zones

The map uses eight separated forecast polygons: Gaviota, Refugio, Goleta, San Marcos Pass, Mission Canyon, Montecito, Toro Canyon, and Carpinteria. Green/yellow/orange/red fill represents low/elevated/high/extreme model probability. Clicking a zone moves the detailed evidence into the sidebar so the default map remains clean.

## Live forecast architecture

- **NOAA HRRR 3-km guidance is the primary short-range source** (`gfs_hrrr` via Open-Meteo); GFS seamless guidance extends/falls back across the 48-hour horizon.
- NOAA NBM supplies an independent high-resolution surface-wind/gust blend when available.
- Western, eastern, and hybrid regimes are scored separately.
- Terrain-relative wind is evaluated at 925, 850, and 700 hPa; 500-hPa flow helps identify wind-reversal/critical-level structure.
- The model includes stability, boundary-layer depth, vertical motion, wind shear, dry-air and marine-layer erosion proxies.
- A Point Conception HRRR reference represents western coastal-jet support.
- Live county DCP/RAWS observations localize current surface response and gust guidance.
- Stale observations are displayed but excluded from forecast weighting.

## Pressure-gradient intelligence

SBA–BFL and SBA–SMX remain the historical anchors, but the live model also uses SBA relative to:

- Santa Ynez (`KIZA`)
- Vandenberg (`KVBG`)
- Lompoc (`KLPC`)

Observed pressure is read from NWS station observations. The model uses the **gradient and its approximate 3-hour tendency**, then blends current observations into the first six forecast hours. This is intended to distinguish a static gradient from a rapidly strengthening or weakening cross-mountain pressure field.

## Upstream precursor intelligence

Cuyama and interior observations are core predictors, not optional display data. The discovery envelope includes Santa Barbara County plus the Santa Ynez Valley, upstream ridges, New Cuyama, North County, and relevant southern Kern stations. The Upstream Precursor Index uses fresh wind direction/speed and dryness to detect favorable interior flow before strong winds are already established in the front country.

## Historical Sundowner truth set

`data/known-sundowner-events.json` is **Sundowner-first, not fire-first**. It contains peer-reviewed and strongly documented historical events with provenance. Fire association is stored only as an outcome field.

The event library includes:

- fire-associated Sundowners such as Gap, Tea, Jesusita, Sherpa, and other historical cases;
- non-fire Sundowners documented in the scientific literature;
- western, eastern, and other documented cases;
- older case studies retained for analog/event-level reconstruction when the observations support it.

Continuous training also requires ordinary non-Sundowner hours and near-miss setups so the model learns false-alarm conditions rather than only positive events.

## Calibration and leakage control

`calibration.json` is the central probability/bias artifact used by the browser. `tools/build-calibration.js` builds a chronological fixed-lead calibration from forecasts that existed before the verifying hour and independent RAWS observations.

Current automated calibration design:

- training: calendar year 2024;
- independent holdout: calendar year 2025;
- forecast lead: 24 hours;
- source: NOAA HRRR through Open-Meteo Previous Runs;
- targets: terrain-relative observed wind and strong-gust occurrence;
- fire association: **not used to define the target**;
- observed verifying wind: label only, never a predictor of the same historical forecast target;
- regime-specific Platt probability calibration;
- station/zone gust-bias correction where supported by the training data.

The curated historical event set remains separate from the continuous hourly labels so documented events can be used for event-level truth/analog validation without contaminating predictor inputs.

## Independent validation already completed

`validation/SPRING_2025_FIXED_LEAD.md` records an independent March–May 2025 test using archived fixed-lead model guidance and HADS/RAWS verification. At 24 hours, general-event ROC AUC was approximately **0.81–0.87**, strong-event ROC AUC **0.90–0.93**, and raw gust MAE **4.5–7.1 mph** across stations where the metric was defined. Skill declined at 48 hours, as expected. These results validate the forecast core; they do **not** prove superiority over NWS.

## Quality assurance

GitHub Actions checks JavaScript syntax, the historical calibration builder, model/architecture invariants, a mocked end-to-end browser flow, the public live upstream APIs, and static historical/calibration artifacts. A separate workflow can rebuild the chronological calibration.

## Deployment

Primary deployment target: GitHub Pages from `main`.

Expected production URL once the repository Pages source is enabled for GitHub Actions:

`https://skyfinderrescue.github.io/sundowner-intelligence/`

The repository is public and the production deployment workflow is `.github/workflows/pages.yml`.

## Safety / scope

This is experimental local decision support. It is not an official warning system. No claim that Sundowner Intelligence outperforms NWS should be made until matched archived NWS forecasts are scored against the same independent observations and cases.
