# SI-4 SWEX 600.034 public-availability checkpoint — 2026-08-31

Status: RESEARCH ONLY. NO PRODUCTION CHANGE. NO 2025 EXPOSURE AUTHORIZED.

## Independent source verification

NSF NCAR/UCAR DASH publicly indexes SWEX dataset **600.034 — ISS Radar Wind Profiler Products** as:

- resource version: **1.0**
- progress: **completed**
- DOI: **10.26023/2659-AF70-3009**
- temporal coverage: **2022-03-10 through 2022-05-20**
- asset size: approximately **1.15 GB**
- legal constraints: **none**
- access constraints: **none**

The public metadata enumerates the following profiler archives:

- `swex_iss2-ranchoalegre_prof915_moments_v1.tar.gz`
- `swex_iss2-ranchoalegre_prof915_winds_v1.tar.gz`
- `swex_iss3-sedgwick_prof915_moments_v1.tar.gz`
- `swex_iss3-sedgwick_prof915_rass_v1.tar.gz`
- `swex_iss3-sedgwick_prof915_winds_v1.tar.gz`
- `swex_iss1-sbfiredept_prof449_moments_v1.tar.gz`
- `swex_iss1-sbfiredept_prof449_winds_30min_v1.tar.gz`
- `swex_iss1-sbfiredept_prof449_winds_5min_v1.tar.gz`

The catalog describes 915-MHz profiler winds/moments at Rancho Alegre and Sedgwick, Sedgwick RASS virtual temperature, and 449-MHz profiler winds/moments at the Santa Barbara Fire Department site. 449-MHz winds are available at 5- and 30-minute averages.

Source catalog: `https://data.ucar.edu/dataset/iss-radar-wind-profiler-products`

## Corrected acquisition status — 2026-09-04

The prior assumption that an NCAR/EOL order for 600.034 had already been accepted is **withdrawn**.

On 2026-09-04, NCAR/EOL Data Support replied that they could not find an order for the project email address, could not find a recent order for dataset 600.034, and found no corresponding error in their logs. Support explicitly requested that the order be submitted again.

Therefore:

1. there is no verified existing order to preserve or wait on;
2. the public archive bytes have **not** yet been acquired or checksummed;
3. resubmission is now the correct next acquisition action and is not considered a duplicate;
4. no email address may be hard-coded into this public repository or CI configuration;
5. until a valid order contact can be supplied securely at submission time, acquisition remains blocked at the CODIAC form despite the dataset having no legal/access restrictions.

The GET-only acquisition probe remains valid for discovering authoritative endpoints and exact order controls. Its earlier CI message claiming an accepted order must not be treated as current truth.

## Science-use restrictions

These 2022 observations are independent historical evidence and may be used to:

1. verify physical mechanisms and vertical structures proposed by SWEX literature;
2. test whether candidate terrain-resolving/observation-assimilating architectures represent observed vertical wind/stability behavior;
3. define outcome-blind archive/QC rules before any 2024 scoring.

They must **not** be used as future-observation predictors for 2024 or 2025, to alter frozen promotion gates, to tune thresholds after seeing 2024 outcomes, or to authorize 2025 exposure by themselves.

## Promotion state

**NO PROMOTION.** SI-3.1 production on `main` remains the production baseline. PR #6 must remain draft/open/unmerged until an independently passing SI-4 candidate clears every frozen gate.
