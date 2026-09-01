# SI-4 Phase-0 Predeclaration: 3D Terrain Neural Operator

Status: **FEASIBILITY ONLY — NO PROMOTION AUTHORITY**

Parent research head: `ff90b985ddcec3279735c026b93b0aa19f697898`

## Why this lane is materially different

This lane tests a 3D geometry-aware neural-operator surrogate for terrain-flow interaction, rather than another coarse HRRR pressure-level proxy, scalar post-processing term, or deterministic threshold adjustment. The architecture is motivated by the July 2026 Communications Physics paper and open-source implementation, *Transformer-based neural operators for 3D wind field prediction over complex mountainous terrain* (Zhang et al., 2026). The published system learns full 3D wind fields from CFD-generated complex-terrain simulations using point/graph transformer neural operators; the authors report zero-shot transfer to unseen real-world mountainous terrain and additional error reduction when sparse observations are supplied.

This is distinct from the previously proposed terrain-emulator lane because the target is not a 2D/local statistical correction to HRRR or a direct imitation of historical WRF surface fields. It is a 3D terrain-flow surrogate trained against PDE/CFD solutions, with terrain geometry represented explicitly and with optional sparse, issuance-time observation conditioning.

## Phase-0 questions only

No Sundowner outcome scoring is authorized in Phase 0. Establish, before any 2024 occurrence labels are inspected:

1. Whether the public implementation and demo data reproduce the published inference path deterministically enough for SI-4 research.
2. Whether Santa Ynez Mountains terrain can be represented in the model's mesh/point format without outcome-aware domain edits.
3. Whether physically valid boundary-condition inputs can be derived solely from issuance-time operational forecast state at fixed F24.
4. Whether a CFD training library appropriate to Santa Barbara terrain can be generated or licensed reproducibly without using 2024/2025 outcomes.
5. Whether sparse observational conditioning can be restricted to observations that genuinely existed by forecast issuance time; otherwise sparse-observation input is disabled.
6. Whether steady-state CFD assumptions are too restrictive for Sundowner mechanisms involving transient mountain waves, marine-layer erosion, hydraulic jumps/rotors, stability transitions, and critical layers. Failure here rejects the lane before event scoring.
7. Compute feasibility and reproducibility on available research infrastructure.

## Hard anti-leakage constraints

- No 2025 exposure for tuning, architecture selection, calibration, thresholds, feature selection, case selection, or model choice.
- No future observations. Observation inputs must be timestamped and available by forecast issuance.
- No fire association as predictor; fire remains outcome-only.
- Missing stays missing; no target-informed imputation.
- No post-hoc member/case pruning based on 2024 skill.
- No threshold rescue after validation.
- HRRR/other NWP inputs must use the same fixed-lead issuance-time contract as the frozen SI-4 evaluation.
- CFD/terrain training data must be independent of 2024/2025 Sundowner occurrence labels.

## Advancement rule

Only if Phase 0 demonstrates reproducible, leakage-free, physically defensible operation may a separate 2024-only chronological science experiment be frozen. Before that experiment, architecture, inputs, training corpus, terrain domain, loss, calibration procedure, and decision threshold must be locked without inspecting validation outcomes.

The existing SI-4 frozen gates remain unchanged:

- event POD >= baseline +0.05 absolute;
- FAR no worse;
- Brier no worse;
- AUC >= baseline -0.005;
- hard-negative Brier/FPR no worse;
- spatial precision >= baseline -0.01;
- regime safety;
- gust non-inferiority.

Failure of any gate means rejection and no 2025 exposure. Passing Phase 0 is not evidence of forecast improvement and carries no production-promotion authority.

## Primary evidence

- Zhang, Y. et al. (2026), *Transformer-based neural operators for 3D wind field prediction over complex mountainous terrain*, Communications Physics, published 20 July 2026, DOI 10.1038/s42005-026-02770-w.
- Public code: `https://github.com/ZjuMachine/Transformer-based-Neural-Operators-for-3D-Wind-Field-Prediction-over-Complex-Mountainous-Terrain`.
- Janiszeski et al. (2025), multiscale WRF/LES Sundowner analysis, documenting transient hydraulic-jump, near-surface critical-layer, rotor and coastal adiabatic-layer structure that must be represented or explicitly treated as a limitation before this surrogate can advance.

Current production status remains **NO PROMOTION**. SI-3.1 on `main` is not modified by this feasibility lane.