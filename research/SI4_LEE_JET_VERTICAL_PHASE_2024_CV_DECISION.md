# SI-4 Lee-Jet Vertical Phase 2024 Chronological-CV Decision

Status: **REJECTED — RESEARCH ONLY — DO NOT SCORE ON 2025**

## Frozen experiment

Candidate family: `lee_jet_vertical_phase_v1`.

The candidate used only predeclared issuance-time lee/channel/upstream vertical-phase diagnostics from the immutable 2024 upstream archive, with per-regime regularized logistic fitting and threshold selection performed strictly inside each prior chronological training window. The frozen 2025 holdout was not loaded. Fire association remained outcome-only, future observations remained label-only, gust output was unchanged, and missing values were not fabricated.

Authoritative workflow: `SI-4 Lee-Jet Vertical Phase 2024 Chronological CV` run `32739697328` on `si4-research` head `22bb2f65a498263cfa1ac28433eb621d064bf7c4`.

Artifact: `si4-lee-jet-vertical-phase-2024-cv`, SHA-256 `a5820a142a162aa7eac25aacd80e2f9e1420a5abeb70a69b9d606ff1c23b193a`.

## Aggregate 2024 chronological-CV result

Baseline:
- Brier: `0.0549097266`
- AUC: `0.9313447043`
- event POD: `0.5828791479`
- event FAR: `0.2040142405`
- hard-negative Brier: `0.0646035117`
- hard-negative FPR: `0.1222816135`
- spatial zone precision: `0.6156251410`

Candidate:
- Brier: `0.0550178278`
- AUC: `0.9308770073`
- event POD: `0.5545772611`
- event FAR: `0.2098699764`
- hard-negative Brier: `0.0639957623`
- hard-negative FPR: `0.1263368905`
- spatial zone precision: `0.6168812104`

## Frozen promotion-gate decision

The candidate failed the required development gates:
- event POD did not improve by the required `+0.05` absolute; it decreased instead;
- event FAR worsened;
- overall Brier worsened;
- hard-negative FPR worsened.

AUC remained within the non-inferiority allowance, hard-negative Brier improved slightly, spatial precision was non-inferior, regime safety passed, and gust was unchanged, but the candidate must pass **every** frozen gate to become eligible for one score-only 2025 evaluation.

Therefore `lee_jet_vertical_phase_v1` is **REJECTED** and must not be exposed to the frozen 2025 holdout. It does not alter the current `NO PROMOTION` decision and does not authorize any change to `main` or SI-3.1 production.
