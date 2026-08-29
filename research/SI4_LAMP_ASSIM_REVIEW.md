# SI-4 issuance-time LAMP assimilation review

Date: 2026-08-28 PDT
Base research head: `a8c2aa40874701ed4adc5ebd29b6d79a6841abc9`
Status: research-only predeclaration; **NO PROMOTION**; no 2025 exposure authorized.

## Why this path is materially different

The exhausted/rejected SI-4 search space has mainly involved transformations or nonlinear post-processing of HRRR/NBM/upstream pressure-level guidance. NOAA/NWS LAMP is structurally different: station-based LAMP is generated using the most recent station observations available at cycle time, analyses of those observations, simple model output, and MOS/model guidance. Since 2023, NOAA documents that LAMP wind speed/direction/gust guidance incorporates both redeveloped GFS MOS and HRRR input. It therefore provides an operational issuance-time observation-assimilation/statistical-correction pathway rather than another coarse pressure-level physics proxy.

Primary NOAA references:
- https://vlab.noaa.gov/web/mdl/lamp-card-2.5.0
- https://vlab.noaa.gov/web/mdl/lamp-card-2.6.0
- https://vlab.noaa.gov/web/mdl/lamp-change-log
- https://vlab.noaa.gov/web/mdl/lamp-archived-bulletins
- https://vlab.noaa.gov/web/mdl/lamp-archived-bulletins-year
- https://vlab.noaa.gov/web/mdl/lamp

NOAA states that archived hourly station LAMP bulletins are available back through August 2006, including 2024, so a chronological 2024-only fixed-lead experiment is reproducible. The exact NOAA annual 2024 archive link exposed by the MDL archive index is:

`https://lamp.mdl.nws.noaa.gov/lamp/Data/archives/lmp_lavtxt.2024.tar`

The archive index describes the annual object as a tar containing the hourly compressed all-station bulletins. Preserve the annual archive URL plus extracted member name, cycle timestamp, station identifier, and SHA-256 of every extracted member used in scoring. Do not silently replace an unavailable member with a nearby cycle.

LAMP v2.5 (operational during most of 2024) supplies 10-m wind speed, direction and gust guidance through the needed fixed-24h horizon; v2.6 became operational 2024-09-30. NOAA's v2.5 and v2.6 product cards document standard hourly guidance through 25 h and WDR/WSP/WGS availability through 38 h. Version provenance therefore must be retained exactly and version boundaries must be tested for regime safety rather than normalized away.

## Candidate

Candidate ID: `issuance_time_lamp_assim_v1`

This candidate is not a fabricated NWS Sundowner probability. It may use archived LAMP issuance-time wind speed/direction/gust guidance as additional predictors or a comparator inside the existing SI-4 2024 chronological framework. Only guidance actually available at/before the selected issue time is eligible. The target remains the independently defined Sundowner outcome; future observations are labels only.

## Frozen experiment design before outcomes are inspected

1. Development year: 2024 only. No 2025 rows, event misses, thresholds or diagnostics may be inspected.
2. Lead: exact fixed 24 h wherever the archived bulletin supplies that projection. Preserve cycle timestamp, forecast valid timestamp, station identifier, NOAA product/version, source URL/archive key and file hash.
3. Inputs: archived LAMP WSP/WDR/WGS at predeclared Santa Barbara-area stations that can be mapped independently to the existing validation network. Missing guidance stays null; no nearest-time substitution across issue cycles.
4. Candidate architecture: a chronological training-only local nonlinear combiner may add LAMP WSP/WDR/WGS and LAMP-minus-HRRR disagreement terms to the already frozen issuance-time feature set. No future observation, fire association or post-valid-time variable is permitted.
5. Simple comparators: frozen SI-3.1, current frozen SI-4 research baseline, LAMP deterministic wind/gust/direction alone, HRRR alone, and the predeclared simple logistic comparator.
6. Chronology: nested/forward chronological selection only. Any hyperparameter, transform, threshold or feature selection must be fit exclusively on prior 2024 training folds.
7. Version boundary: report pre-2024-09-30 and post-2024-09-30 results separately because LAMP v2.6 changed operationally on that date. A candidate cannot pass by exploiting a product-version discontinuity.
8. Archive pilot before scoring: inspect a small predeclared set of 2024 cycle members solely for archive/member naming, parser correctness, station coverage, exact F24 availability, and version provenance. Do not read verifying observations while choosing or repairing archive cases.

## Frozen promotion gates

Every existing SI-4 development gate remains mandatory:
- event POD >= baseline +0.05 absolute;
- event FAR no worse;
- overall Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier no worse;
- hard-negative FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Additional LAMP-specific gates:
- no material degradation on either side of the 2024-09-30 LAMP v2.6 implementation boundary;
- improvement must not disappear when LAMP-minus-HRRR disagreement terms are removed in ablation unless the disagreement itself is stable across chronological folds;
- archive gaps are infrastructure/missing-data outcomes, never model evidence.

If any 2024 gate fails, reject `issuance_time_lamp_assim_v1` and do not expose it to 2025. If every gate passes, freeze all transforms/coefficients/thresholds and permit exactly one score-only 2025 evaluation under the existing SI-4 contract.

## 2024 archive-feasibility milestone — PASSED

Workflow: `SI-4 LAMP 2024 Archive Pilot` run `33237000510`, isolated branch `si4-lamp-assim-review`, head `06ded65dc751201b88f38e6dd0911e711821999d`.

The pilot was archive/parser validation only. It explicitly recorded `science_scoring_performed=false` and `verifying_observations_read=false`; no 2025 data were used. The exact NOAA annual archive had:
- content length `4,082,995,200` bytes;
- ETag `"f35d9000-63c2ad031c235"`;
- Last-Modified `Tue, 12 Aug 2025 13:13:59 GMT`;
- `1,152` TAR members.

A sparse TAR index plus six predeclared standard 00:30 UTC monthly members transferred `77,977,732` bytes total (`~1.91%` of the annual archive). Exact members were January, April, July, September, October and December 2024. Every KSBA daily bulletin in those selected members contained 25 standard UTC/WDR/WSP/WGS slots, establishing exact fixed-24h availability without future observations. Counts were 31/31, 30/30, 31/31, 30/30, 31/31 and 31/31 respectively, with zero partial KSBA blocks.

Selected member SHA-256 values:
- `lmp_lavtxt.202401.0030z.gz`: `7f42a8292509cfdf103c517fa77627302552e5dc7445c0959aeb8c2d7444db99`
- `lmp_lavtxt.202404.0030z.gz`: `3f9d867cdff82748937c7eac498a7c8d268e5a16b3a646e711d2ee997be60119`
- `lmp_lavtxt.202407.0030z.gz`: `a55bd06822923fdb5da6c4e7ee80181f2f5541be66d2650b2aec6602a81c71a0`
- `lmp_lavtxt.202409.0030z.gz`: `376b070f59dea22541811d04101311192f9f80a2f570e74029090e6271f05f39`
- `lmp_lavtxt.202410.0030z.gz`: `59abdd46c4548741c2d42891f1eb0ea1b8ac65e9ef03c4f8c9ecc349b6cd35f8`
- `lmp_lavtxt.202412.0030z.gz`: `60f31953159a1b67bdd00c312ab76e49f629fe1fa99ad5acf2bada699624bb85`

The initial pilot parser incorrectly expected an explicit `HR` row inside each archived station block. Primary NOAA v2.5 documentation plus the archive itself established that the 2024 monthly standard bulletin carries 25 fixed-width hourly guidance slots even when an `HR` row is omitted. The corrected fail-closed parser identifies fixed lead 24 as the 24th standard slot (index 23) and requires the physical presence of UTC/WDR/WSP/WGS at that slot. This was a plumbing correction only; no hypothesis, thresholds, labels, observations or model coefficients changed.

## Current decision

**Evidence-backed path retained; 2024 archive/parser feasibility passed; science scoring has not yet been executed. NO PROMOTION.** Keep `main` on SI-3.1 and PR #6 draft/unmerged. The next permissible work is a 2024-only matched extraction/evaluator using the already frozen chronological design. No 2025 exposure is authorized unless every 2024 gate passes.