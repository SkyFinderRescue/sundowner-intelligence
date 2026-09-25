# SI-4 Richardson / Wave-Breaking Susceptibility — 2024 Chronological-CV Decision

Status: **REJECTED IN 2024 DEVELOPMENT — NOT ELIGIBLE FOR 2025 — NO PRODUCTION CHANGE**

Authoritative evidence:

- PR: #6 (`si4-research` -> `main`), draft/open/unmerged.
- Evaluated head: `f10f43106f55c533c2018e69f01616224dc2bed9`.
- Workflow: **SI-4 Richardson Wave-Breaking 2024 CV**, run `32891379122` / run #1, conclusion `success`.
- Artifact: `si4-richardson-wavebreaking-2024-cv`, artifact id `9579585314`, SHA-256 `8fae34396b0bdc41f1efd3222b0997bb6f3af42ed4a39d6eeeea20fc7896c51d`.
- Predeclaration: `research/SI4_RICHARDSON_WAVEBREAKING_PREDECLARED.md`.
- Development year: 2024 only; frozen 2025 holdout was not loaded.

## Result

The predeclared coarse bulk-Richardson / shear susceptibility candidate **failed the frozen 2024 promotion gate** and is rejected without any 2025 score.

Aggregate chronological-CV comparison (4,880 validation rows; 439 event rows):

| Metric | Baseline | Richardson candidate | Gate |
|---|---:|---:|---|
| Event POD | 0.608714 | 0.613964 | **FAIL** — required +0.05 absolute |
| Event FAR | 0.384375 | 0.386878 | **FAIL** — no degradation allowed |
| Brier | 0.0534131 | 0.0536223 | **FAIL** — no degradation allowed |
| AUC | 0.934899 | 0.933476 | PASS |
| Hard-negative Brier | 0.0648545 | 0.0643592 | PASS |
| Hard-negative FPR | 0.122282 | 0.122282 | PASS |
| Spatial/zone precision | 0.615625 | 0.613122 | PASS |
| Diagnostic coverage | 1.000 | 1.000 | PASS |

Regime safety passed under the predeclared tolerance, and gust skill was non-inferior by construction because the candidate was forbidden from changing the frozen gust correction. However, failure of any one frozen gate requires rejection; this candidate failed event-POD gain, event-FAR, and overall-Brier gates.

## Interpretation

The coarse pressure-level Richardson/shear features provided a very small recall increase and slightly better hard-negative Brier, but the gain was far below the required operational recall recovery and came with small degradations in FAR and overall calibration. The diagnostic therefore does not justify a score-only 2025 exposure.

This does **not** disprove wave breaking or Richardson-number physics in Sundowner events. The predeclared diagnostic intentionally treated HRRR coarse pressure-level bulk Richardson number as **susceptibility only, not proof** of turbulence, rotor formation, hydraulic jump, or wave breaking. A materially different future hypothesis would require independent physical justification and a new 2024-only predeclaration before evaluation.

## Frozen decision

- Do not tune this candidate after seeing the 2024 result.
- Do not score this candidate on the frozen 2025 holdout.
- Do not alter SI-3.1 production on `main`.
- Keep PR #6 draft/unmerged.
- Prior rejected candidates remain rejected.
- RRFS remains shadow-only.
- SWEX final-QC dataset 600.034 remains pending; do not duplicate the accepted order.

The SI-4 production-promotion decision remains **NO PROMOTION** pending independent evidence that clears every frozen gate plus release/degraded-mode and desktop/mobile browser QA requirements.
