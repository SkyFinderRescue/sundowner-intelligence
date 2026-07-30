# Sundowner Intelligence

Santa Barbara County terrain-localized Sundowner forecasting app.

## Production model
- 48-hour HRRR guidance with NBM surface-gust blending when available.
- Observed and forecast SBA–BFL / SBA–SMX pressure gradients.
- Full Santa Barbara County CA_DCP station catalog discovery (not `only_online`) with all fresh wind-capable stations available for localization and explicit RAWS retention.
- Three-hour observation freshness gate, distance/freshness weighting, and RAWS weighting.
- Western, eastern, and hybrid Sundowner regimes for Gaviota through Carpinteria.
- NWS grid forecast reference for side-by-side comparison.
- Built-in source-health monitoring, self-tests, and degraded operation when a feed fails.

## Validation
Published SWEX metrics are displayed only as research benchmarks and are not represented as this application's own skill. The app also calculates a current model-only gust cross-check against fresh county observations. Prospective forecast verification should be used to establish whether the application beats any external forecast source over time.

## Safety
Experimental local decision support. Official NWS watches/warnings, spot forecasts, IMET products, agency policy, and field observations remain authoritative for public safety and incident decisions.
