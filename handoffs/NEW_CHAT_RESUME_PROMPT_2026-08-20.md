# Sundowner Predictor — New Chat Resume Prompt — 2026-08-20

Continue the existing Sundowner Predictor project exactly from its current August 20, 2026 state. **DO NOT restart the project, rebuild it from scratch, repeat completed research, or revert to an older handoff.**

## FIRST — RECOVER THE CURRENT PROJECT

1. Read the current continuity handoff in GitHub:
- repository: `SkyFinderRescue/sundowner-intelligence`
- branch: `handoff-2026-08-20`
- file: `handoffs/START_HERE_SUNDOWNER_PREDICTOR_2026-08-20.md`

Also use the Google Drive project root `Sundowner Intelligence` and the folder `Sundowner Predictor - Complete AI Handoff - 2026-08-20` if accessible. The Drive folder was created, but Drive storage quota / Google Docs write permissions prevented writing the new handoff document there, so the GitHub handoff above is the authoritative new continuity document.

2. Then inspect the live GitHub repository directly. Newer verified GitHub state supersedes the handoff if anything has advanced.

Expected checkpoints at handoff creation:
- production main: `e4338d6794b0a1e814c5d630a7470db753086461` or newer
- verified production content commit: `658a90167bc5ed0f5a569f4b6c18b30f20893c98` or newer
- production: SI-3.1 protected and release-verified
- open draft PR #6: `SI-4 research: mountain-wave physics and all-season validation`
- research branch: `si4-research`
- research head: `59b5cdb2035f549319a0046d37ea9b18fb7074bf` or newer
- **DO NOT MERGE PR #6 yet**

## EXACT RESUME POINT

The immediate active lane is the frozen research candidate:  
`upstream_thermal_subsidence_v1`

Before doing any new model work, inspect the latest `SI-4 Upstream Thermal 2024 Archive` GitHub Actions run on `si4-research` and verify all 12 monthly jobs/artifacts. **Do NOT assume the full-year archive passed just because the separate smoke test passed.**

The smoke extractor is already verified on current state. The full archive must remain:
- 2024-01-01 through 2024-12-31 only
- archived NOAA HRRR
- fixed F24
- cycles 00Z / 06Z / 12Z / 18Z
- five frozen spatial points
- 850 / 700 / 500 mb
- required temperature, height, U/V wind, derived speed/direction, and VVEL fields
- fail closed
- 2025 forbidden during development

Expected complete geometry is **7,320 rows** across all 12 monthly artifacts.

If the full-year archive is incomplete because of infrastructure/plumbing, repair only the infrastructure without changing the frozen science design. Once the archive is complete, run the existing predeclared 2024 chronological-CV gate. Do not relax any gate after seeing results.

The candidate must achieve **ALL** existing gates, including at least +0.05 absolute event POD improvement with no worsening of event FAR, overall Brier, hard-negative Brier/FPR, spatial precision, regime safety, or gust safety as defined in the predeclared file.

If any 2024 gate fails: **REJECT** the candidate and **DO NOT expose it to 2025**.  
If all gates pass: freeze exact extractor/transforms/coefficients/thresholds/hashes and permit exactly one 2025 score-only evaluation. Do not retune from the result.

## DO NOT REPEAT ALREADY-FAILED LANES

Do not restart or retune the previously rejected persistence/onset recall rescue, transition-onset tendency, Point Conception coastal-jet phase, GOES marine-layer probability, HRRR cycle-agreement, terrain/gust refinement, inversion/refined-coupling, or frozen western-coupling inclusion candidates unless genuinely new independent evidence justifies a materially different hypothesis.

SI-4 already shows major independent gains in calibration, false-alarm reduction, gust error, timing, and spatial precision, but it still fails the operational event-recall gate. Preserving recall while retaining SI-4’s false-alarm improvements is the central blocker.

## AFTER THE UPSTREAM THERMAL/SUBSIDENCE LANE IS RESOLVED

Open and cite the exact primary Fovell/Brewer Sundowner research that the previous chat identified. Do not implement from the handoff summary alone and do not invent coefficients.

Create a new predeclared research lane called something like:  
`Fovell–Brewer Recall Benchmark`

Faithfully reproduce the published high-recall/logistic method on leakage-controlled 2024 development data, then compare on identical chronological folds:

`SI-3 → frozen SI-4 → published logistic/high-recall benchmark → published logistic + SI-4 physics/filtering/calibration → physics-informed XGBoost → optional Analog Ensemble if scientifically justified.`

The objective is to recover genuine-event recall without giving back the false-alarm, calibration, spatial-correctness, and gust gains already achieved by SI-4. Do not lower established gates to force a winner.

## PRODUCTION SAFETY

Keep SI-3.1 on `main` untouched during research. Fire association remains outcome-only. Future observations remain labels only. Missing fields stay null/unknown. Do not claim NWS superiority without exact matched evidence. A successful workflow run is not automatically a science pass.

Only after a candidate earns scientific promotion should you run production data-health/degraded-mode verification, release verification, live API checks, Pages probe, desktop 1440x1000 browser QA, and iPhone 390x844 browser QA before any merge/deployment.

Continue autonomously from this exact point and use connected GitHub/Drive tools directly wherever possible. Do not ask me to manually download, copy, paste, or shuttle routine files unless a genuine permission or physical-action blocker requires it.