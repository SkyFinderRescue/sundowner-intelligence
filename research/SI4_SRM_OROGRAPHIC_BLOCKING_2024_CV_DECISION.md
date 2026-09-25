# SI-4 SRM Orographic-Blocking 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`srm_orographic_blocking_v1`

This candidate was predeclared before scoring and tested an eastern-regime-only orographic-blocking/SRM augmentation using issuance-time fixed-F24 HRRR predictors. Western and hybrid probabilities were required to remain baseline-identical. Verifying observations were label-only; 2025 was not loaded.

## Immutable provenance

- Frozen SI-4 baseline upper-air artifact: authoritative all-season run `31925677059`.
- Immutable upstream archive: run `32552410978`, archive head `ac2adebf2c29b045bfb6954e4c86ff2c0f30dd23`.
- Upstream archive rows: **7,300**; extraction failures: **0**.
- Chronological-CV workflow: `SI-4 SRM Orographic Blocking 2024 Chronological CV` run `33095141828`.
- Workflow head: `fc9d6887775d5f65dddda4930111cb124861db7d`.
- Artifact digest: `sha256:a2cc5ea65301875ab0e0ce400c68f59ea23c7225017657cd5dad93e9b2d39c2d`.
- Scored rows: **7,276**; events: **628**; eastern feature coverage: **100%**.

## 2024 chronological-CV result

Pooled score-only folds:

| Metric | Frozen baseline | SRM candidate |
|---|---:|---:|
| Brier | 0.0549097266 | 0.0548577132 |
| ROC AUC | 0.9313447043 | 0.9317283058 |
| Event POD | 0.5828791479 | 0.5959510433 |
| Event FAR | 0.2040142405 | 0.2162773397 |
| Hard-negative Brier | 0.0646035117 | 0.0662892012 |
| Hard-negative FPR | 0.1222816135 | 0.1315408727 |
| Spatial-zone precision | 0.6156251410 | 0.6114647428 |

The candidate produced a small Brier/AUC improvement and a modest POD increase, but it did **not** achieve the predeclared +0.05 absolute event-POD requirement and degraded FAR plus both hard-negative metrics.

Eastern-only diagnostics also showed the intended signal was not operationally safe: eastern Brier improved slightly (0.0156917584 -> 0.0155617248) and eastern AUC improved (0.8851896031 -> 0.8911573616), but eastern hard-negative Brier worsened (0.0108275551 -> 0.0147393875), eastern hard-negative FPR increased from 0 to 0.0251572327, and eastern event FAR was 0.6666666667. Western/hybrid probabilities remained exactly unchanged as required.

## Frozen gates

Passed:
- overall Brier no worse;
- overall AUC non-inferior;
- spatial precision non-inferior;
- western/hybrid unchanged;
- eastern Brier safety;
- eastern AUC safety;
- gust non-inferiority (gust output unchanged);
- feature coverage.

Failed:
- event POD gain >= +0.05 absolute;
- event FAR no worse;
- hard-negative Brier no worse;
- hard-negative FPR no worse.

`passes_all = false`.

## Decision

**Reject `srm_orographic_blocking_v1`. Do not expose it to the frozen 2025 holdout.**

The 2024 evidence suggests the predeclared eastern SRM/orographic-blocking geometry contains some probabilistic discrimination, but the tested formulation converts too much of that signal into false alarms and does not recover enough event recall to satisfy the operational gate. Do not rescue this formulation by retuning direction center, coefficients, thresholds, transforms or gates after seeing these results. Any successor must be a materially different independently justified physical hypothesis or use independent final-QC SWEX evidence.

## Leakage/provenance statement

- 2024 development only.
- Fixed F24 issuance-time predictors only.
- Chronological validation only.
- Future HADS/RAWS observations label-only.
- Fire association outcome-only.
- Missing values remain missing.
- No 2025 development exposure.
- Infrastructure failures are not model evidence.
