# Sundowner Intelligence

Santa Barbara County terrain-localized Sundowner forecasting app.

## Production model
- 48-hour NOAA GFS/HRRR seamless guidance, with explicit 3-km HRRR overlay where available and 2.5-km NBM surface-gust blending when available.
- Observed and forecast SBA–BFL / SBA–SMX pressure gradients.
- Full Santa Barbara County CA_DCP station catalog discovery (not `only_online`) with a geographic fallback when county metadata is absent, all fresh wind-capable stations available for localization, and explicit RAWS retention.
- Known RAWS fallback coverage includes Gaviota, Refugio Hills, San Marcos Pass, Los Prietos, Santa Barbara Botanic Garden, Montecito, Montecito Hills, Carpinteria, Figueroa Mountain, Tepusquet, Vandenberg, and Santa Rosa Island; dynamically discovered additional county RAWS are retained automatically.
- Three-hour observation freshness gate, distance/freshness weighting, and extra RAWS weighting.
- Western, eastern, and hybrid Sundowner regimes for Gaviota through Carpinteria.
- NWS grid forecast reference for side-by-side comparison.
- Built-in source-health monitoring, self-tests, degraded operation when a feed fails, unit tests, and a mocked full-app end-to-end test.

## Validation
Published SWEX metrics are displayed only as research benchmarks and are not represented as this application's own skill. The app calculates a current model-only gust cross-check against fresh county observations and provides a same-zone NWS grid comparison. A scientifically valid claim that Sundowner Intelligence is more accurate than NWS requires independent out-of-sample verification over forecast/observation pairs; the application does not fabricate that result.

## Safety
Experimental local decision support. Official NWS watches/warnings, spot forecasts, IMET products, agency policy, and field observations remain authoritative for public safety and incident decisions.
