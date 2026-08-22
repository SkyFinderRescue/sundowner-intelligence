# SI-4 Coastal-Jet Phase / Expansion-Fan Transfer 2024 CV Decision

Status: **REJECTED — NOT ELIGIBLE FOR 2025 — RESEARCH ONLY**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. No production change is authorized by this result.

## Candidate

`coastal_jet_phase_v1`

This candidate was predeclared before scoring and tested a spatially distinct physical hypothesis: the phase/alignment of the approaching NNW Point Conception coastal jet, downstream Santa Barbara Channel turning/acceleration and pressure drop, and transfer toward the western Santa Ynez Mountains. It used issuance-time forecast data only and did not load 2025 observations/outcomes.

## 2024 chronological-CV result

- Rows: **6,098**
- Triggered rows: **193**
- Baseline event POD: **0.3742937853**
- Candidate event POD: **0.3884180791**
- Absolute overall POD change: **+0.0141242938**
- Baseline western+hybrid event POD: **0.3698630137**
- Candidate western+hybrid event POD: **0.3850837139**
- Absolute western+hybrid POD change: **+0.0152207002**
- Baseline event FAR: **0.6896955504**
- Candidate event FAR: **0.6875**
- Baseline overall Brier: **0.0949533749**
- Candidate overall Brier: **0.0943243306**
- Baseline overall AUC: **0.7779655776**
- Candidate overall AUC: **0.7826203054**
- `winner_eligible_for_single_frozen_2025_score = false`

The candidate modestly improved overall Brier, AUC and event FAR, but it failed the predeclared recall gates and hard-negative protections.

## Failed predeclared gates

- Overall event POD required `+0.03`; observed improvement was only about `+0.0141`.
- Western+hybrid event POD required `+0.05`; observed improvement was only about `+0.0152`.
- Hard-negative Brier worsened from **0.1220365207** to **0.1230813936**.
- Hard-negative FPR worsened from **0.4865424431** to **0.4927536232**.
- Western hard-negative Brier worsened from **0.1122446172** to **0.1144456653**.
- Western hard-negative FPR worsened from **0.3841463415** to **0.3902439024**.
- Hybrid regime Brier/AUC also failed the predeclared non-inferiority guard.

The candidate therefore does not earn 2025 exposure despite small improvements in aggregate Brier/AUC/FAR.

## Decision

**Reject `coastal_jet_phase_v1`.**

Do not:

- change the geographic points, thresholds, logit adjustment, or phase-score definition after seeing this result;
- relax the predeclared recall or hard-negative gates;
- inspect 2025 missed-event rows to rescue the hypothesis;
- expose this candidate to the frozen 2025 holdout;
- reinterpret the coastal-flow proxy as proof of an expansion fan or hydraulic feature.

The result is useful negative evidence: spatial Point Conception coastal-jet phase information appears physically relevant enough to produce small 2024 Brier/AUC/FAR gains, but the tested formulation does not recover enough true events and slightly harms hard-negative calibration. A future hypothesis must be materially different and independently justified rather than a retune of this formulation.

## Leakage/provenance statement

- 2024 development only.
- Chronological CV only.
- Fixed F24 upper-air artifact from the authoritative frozen all-season run.
- Future HADS/RAWS observations label-only.
- Fire association outcome-only.
- Missing physical inputs not fabricated.
- No 2025 development exposure.
