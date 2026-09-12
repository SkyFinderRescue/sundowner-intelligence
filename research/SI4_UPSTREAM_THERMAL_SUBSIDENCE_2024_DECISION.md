# SI-4 Upstream Thermal / Subsidence v1 — 2024 Chronological-CV Decision

Status: **REJECTED — RESEARCH ONLY — DO NOT EXPOSE TO 2025 — DO NOT LOAD IN PRODUCTION**

## Provenance

- Candidate: `upstream_thermal_subsidence_v1`
- Immutable upstream archive workflow run: `32552410978`
- Immutable upstream archive head: `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`
- Immutable full-year archive artifact digest: `sha256:2b4e5042339348595b3fb1586468e4df978a9ed7482f3435bde87d8b5a07be30`
- Chronological-CV workflow run: `32560287753`
- Evaluator head: `667110b9406580468987684170e886f1e2bd9bb7`
- CV artifact digest: `sha256:078d4926b03349bf0e31851b41a9332821773bc69c7c5612798e65b372b6652a`
- Development year: 2024 only
- Forecast lead: exact F24
- 2025 observations/outcomes loaded by evaluator: **no**
- Fire association used as predictor: **no**
- Gust output changed: **no**

## Frozen evidence

The evaluator used 7,276 eligible 2024 development rows, with 4,880 rows across the three chronological validation folds and 439 positive validation rows.

| Metric | Baseline | Candidate | Gate |
| --- | ---: | ---: | --- |
| Event POD | 0.582879 | 0.533350 | **FAIL** — required candidate >= baseline + 0.05 |
| Event FAR | 0.204014 | 0.160391 | PASS |
| Overall Brier | 0.054910 | 0.055713 | **FAIL** — no degradation permitted |
| Overall AUC | 0.931345 | 0.932493 | PASS |
| Hard-negative Brier | 0.064604 | 0.061903 | PASS |
| Hard-negative FPR | 0.122282 | 0.121133 | PASS |
| Spatial precision | 0.615625 | 0.617886 | PASS |
| Gust safety | unchanged | unchanged | PASS |
| Regime safety | baseline | candidate | **FAIL** |

The candidate improved false-alarm behavior, hard-negative calibration, pooled AUC, and spatial precision, but it **reduced event recall by about 0.0495 absolute instead of improving it by the required +0.05**, slightly worsened pooled Brier score, and failed the predeclared regime-safety check. These failures are decisive under the frozen promotion contract.

## Decision

`upstream_thermal_subsidence_v1` is **rejected**. It is not eligible for the single frozen 2025 score-only evaluation. No 2025 candidate score will be run, no threshold or coefficient will be retuned from this result, and no production or PR #6 merge change is authorized.

The physically useful finding is narrower: spatially resolved upstream thermal/subsidence information appears capable of reducing false alarms and hard-negative error, but this v1 formulation suppresses too many true-event episodes. Any future successor must be a materially different hypothesis justified from independent 2024-only or SWEX final-QC physical evidence and must be predeclared before scoring.

SI-3.1 on `main` remains the verified production baseline. Current SI-4 gate status remains **NO PROMOTION**.
