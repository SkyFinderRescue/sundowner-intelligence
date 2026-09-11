# Del Playa Bluff Risk Predictor

Experimental address-level coastal bluff decision-support model for Del Playa Drive, Isla Vista, California.

## Scope
Version 0.1 covers the 32 Del Playa properties identified by Santa Barbara County/IVCSD in the February 11, 2025 bluff-erosion notice.

## Dynamic forcing
- 7-day antecedent precipitation and 7-day forecast precipitation: Open-Meteo weather API
- Wave height, period, direction and swell: Open-Meteo Marine API, with NDBC Harvest buoy 46218 attempted as a live observational source
- Tide predictions: NOAA CO-OPS Santa Barbara station 9411340
- Active coastal/flood hazards: National Weather Service alerts API

## Property susceptibility
Each address has a susceptibility component based on the strongest documented public information currently loaded:
- prior bluff/deck failure
- known or reported building setback
- deck/patio setback where documented
- recent cutback/demolition history
- County monitoring status
- confidence grade reflecting how current/precise the parcel data are

Unknown setbacks are not fabricated. They receive lower confidence until current survey, orthophoto, or geotechnical data are loaded.

## Calibration anchors
- January 2017: 6653/6663 Del Playa. Reported 10–15 ft surf and roughly 15–16 ft localized bluff loss.
- February 2024: 6741/6743/6745/6747 cluster. 6745 deck collapse after prolonged heavy rain; all four had been reported within 20 ft of the bluff.
- 6747: 2025 approved cutback geometry documents about 19.6 ft building setback and 2 ft deck setback after work.
- 6761: 2026 approved cutback intended to restore about 30 ft building setback; completion must be verified before treating that as current.

## Threat levels
Low / Elevated / High / Severe / Extreme are screening categories. They are not engineering determinations, evacuation orders, red tags, or guarantees of failure.

The app also shows a scenario retreat range. That range is conditional on a localized failure initiating at the selected parcel and is intended for planning, not parcel surveying.

## Next calibration work
1. Replace approximate marker coordinates with parcel-accurate centroids/bluff transects.
2. Load newest bluff-edge-to-foundation measurements for all 32 monitored properties.
3. Add foundation type, caissons/grade beams, drainage, bluff geology, and prior cutback dates.
4. Reconstruct historical weather/surf/tide forcing for 2017, 2019, 2023–24, 2024–25, and earlier El Niño winters.
5. Validate predicted rank order against post-storm drone orthomosaics and County inspection outcomes.
