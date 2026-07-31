# Sundowner Intelligence

Experimental hyperlocal Sundowner decision-support beta for Santa Barbara County.

## Public beta

Primary deployment target: GitHub Pages from `main`.

Once Pages is enabled for this public repository, the expected URL is:

`https://skyfinderrescue.github.io/sundowner-intelligence/`

A no-configuration CDN preview is also possible from the public `main` branch after `index.html` is pushed:

`https://raw.githack.com/SkyFinderRescue/sundowner-intelligence/main/index.html`

## Architecture

- Live NOAA HRRR/GFS seamless atmospheric fields
- KSBA–KBFL and KSBA–KSMX pressure gradients
- Western/eastern/hybrid Sundowner regimes
- Live Santa Barbara County DCP/RAWS weather observations
- Upstream Cuyama / interior / southern Kern precursor observations
- Terrain-relative 850/700 hPa wind support
- Boundary-layer, low-cloud/marine proxy, stability, RH and solar/time signals
- Separate fire-weather consequence score
- Central `calibration.json` generated from archived model fields with observed RAWS labels
- Weekly calibration refresh via GitHub Actions

## Calibration targets

- Western: Refugio Hills RAWS (`RHWC1`)
- Eastern: Montecito RAWS #2 (`MOIC1`)
- Training years: 2022–2024
- Holdout year: 2025
- Observed target wind is used only as the label and is excluded from model predictors.

## Important

Experimental only. Does not replace NWS watches/warnings, Red Flag Warnings, spot forecasts, IMET products, or field observations.
