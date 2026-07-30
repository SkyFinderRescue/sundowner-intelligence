# Sundowner Intelligence

Santa Barbara County terrain-localized Sundowner forecasting app — SI 2.1.

## Production model
- 48-hour NOAA GFS/HRRR seamless guidance, with explicit HRRR overlay where available and NBM surface-gust blending when available.
- Observed and forecast SBA–BFL / SBA–SMX pressure gradients.
- Full Santa Barbara County CA_DCP station-catalog discovery without an `only_online` filter. Every discovered county station remains visible; every fresh wind-capable station can contribute to localization. The latest live integration QA discovered 147 Santa Barbara County stations by catalog metadata.
- Explicit fallback coverage now includes all nine Santa Barbara County Fire RAWS locations: Gaviota, Refugio, San Marcos Pass, Mission Canyon/Santa Barbara Botanic Garden, Carpinteria foothills, Santa Ynez Valley, Burton Mesa, Tepusquet, and Cuyama Valley. Partner/other county RAWS fallbacks include Los Prietos, Figueroa Mountain, Montecito, Montecito #2, Vandenberg, and Santa Rosa Island. Dynamically discovered additional county stations are retained automatically.
- Three-hour observation freshness gate, distance/freshness weighting, extra RAWS weighting, and terrain-relative wind components.
- Western, eastern, and hybrid Sundowner regimes from Gaviota through Carpinteria.
- Research-based strong-event anchors: western SBA–SMX gradient near −3.4 hPa, eastern SBA–BFL near −4.2 hPa, and a significant-gust anchor near 35 mph.
- 18% elevated-event and 17% strong-event research signal thresholds for earlier guidance rather than arbitrary 50% onset logic.
- NWS grid forecast reference for side-by-side comparison.
- Built-in source-health monitoring, self-tests, retries/timeouts, stale-data rejection, and degraded operation when one feed fails.

## Validation and QA
- JavaScript syntax checks, model/architecture unit tests, a mocked full-app end-to-end test, and live upstream integration tests cover NOAA/Open-Meteo, IEM CA_DCP/RAWS, HADS historical observations, NWS grid guidance, and airport pressure observations.
- A real headless browser has rendered the publicly shareable build through Git-Forge HTML Preview and reached `Live forecast complete` while loading the Santa Barbara County observation network.
- Independent fixed-lead Spring 2025 verification uses HADS/RAWS observations and forecast values available 24 or 48 hours before valid time. At 24 hours, general-event ROC AUC is 0.81–0.87 in the verifying zones where both event classes occurred, strong-event AUC is 0.90–0.93, and raw gust MAE is 4.5–7.1 mph. At 48 hours, event AUC is 0.74–0.81 and strong-event AUC is 0.77–0.87. Full details are in `validation/SPRING_2025_FIXED_LEAD.md`.
- An on-demand `Sundowner Historical Validation` workflow can rerun the independent 24h/48h validation for another date range.
- A 2024-training / 2025-holdout probability-calibration study was also run. Some general-event Brier scores improved, but rare-event hybrid/strong fits were unstable; those unstable calibrations were deliberately rejected rather than overfit into production.

## NWS comparison
The product is intentionally more local and Sundowner-specific than a broad public forecast: it combines terrain regimes, pressure gradients, upper-air flow, marine-layer suppression, dense county observations, and local gust correction at eight front-country zones. The app also loads the focused-zone NWS grid gust forecast beside its own result.

That architecture and the independent RAWS validation support the goal of outperforming broad guidance, but they do **not** prove that SI 2.1 is more accurate than every NWS forecast product. A scientifically valid superiority claim requires matched archived NWS forecasts and identical verifying observations over the same cases. The application does not fabricate that result.

## Safety
Experimental local decision support. Official NWS watches/warnings, spot forecasts, IMET products, agency policy, and field observations remain authoritative for public-safety and incident decisions.
