# SI-4 GOES-18 Nighttime Marine-Layer Trend Milestone — 2026-08-16

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

## What was validated

The direct GOES-18 research path now has a working issuance-safe numerical pipeline for the NOAA Nighttime Microphysics source channels:

- C07 (~3.9 µm)
- C13 (~10.3 µm)
- C15 (~12.3 µm)

The radiance-to-brightness-temperature formula and channel-difference ordering were verified against NOAA GOES-R primary documentation before this run.

A daylight-safety issue was caught during review of the first 00 UTC engineering pilot: C07 contains reflected solar radiation in daylight, so a 10.3-3.9 µm difference must not be interpreted as the NOAA nighttime fog/low-cloud signal while the sun is up. The new trend extractor therefore includes an explicit conservative solar-elevation gate.

## Authoritative run

- Workflow: `SI-4 GOES Marine Night Trends`
- Run: `31996278893`
- Result: **SUCCESS**
- Artifact: `si4-goes-marine-night-trends-2024`
- Artifact SHA-256: `42f6bca3d457eb7ed30525bcfef11d2b94a5ee9294a1f498c46e8ba8db4764e1`
- Masks: `goes-marine-masks-v1-2026-08-16`
- Development year: **2024 only**

## Guardrails passed

- all ABI scan end times <= the corresponding forecast issuance/snapshot time: **PASS**
- all 0 h / -1 h / -3 h / -6 h snapshots passed the Santa Barbara solar-elevation night gate (<= -6°): **PASS**
- future verifying winds loaded: **no**
- fire outcome used: **no**
- model coefficients changed: **no**
- 2025 satellite data used for feature selection: **no**
- thresholds frozen: **not yet**

## Pilot anchors

Two predeclared 2024 nighttime issuance anchors were used to prove the trend machinery:

- `2024-04-01T10:00:00Z`
- `2024-07-15T10:00:00Z`

For each anchor, exact NOAA ABI files were downloaded and hashed at 0 h, -1 h, -3 h and -6 h.

The pipeline now produces, for the fixed south-coast, Channel, western and eastern masks:

- C13 brightness temperature;
- C13-C07 nighttime spectral difference;
- C15-C13 cloud-thickness spectral difference;
- 1 h, 3 h and 6 h changes;
- coast-vs-Channel contrasts;
- west-vs-east contrasts;
- exact source object keys/times/ETags/SHA-256.

## Important interpretation

This run proves the **measurement pipeline**, not predictive skill. The raw values vary strongly between the April and July test nights, which is precisely why no universal sign or threshold will be assumed from physical intuition alone.

Next, candidate GOES marine-resistance features must be screened against **2024-only** western event and hard-negative cases. Only a feature that provides independent development evidence may be frozen for a one-time 2025 satellite score.

The current live SI-3 application remains unchanged.
