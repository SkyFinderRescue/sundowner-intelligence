# SI-4 Score-Based Data Assimilation Phase-0 Predeclaration

Date: 2026-09-11
Lane: `score_da_hrrr_state_v1`
Status: PHASE 0 FEASIBILITY ONLY / NO 2024 OUTCOME SCORING / NO 2025 EXPOSURE

## Why this lane is materially different

This lane tests score-based generative data assimilation (SDA) of issuance-time observations into a regional HRRR-like atmospheric state. It is not another scalar HRRR proxy, not a rescue-tune of the rejected HREF rule, and not a marginal probability calibration layer. The hypothesis is that correcting the mesoscale state with observations already available at issuance can preserve genuine convection-allowing ensemble recall signal while reducing false alarms caused by misplaced or incorrectly structured low-level flow.

Primary evidence:
- Manshausen et al. (2025), JAMES, DOI 10.1029/2024MS004505, "Generative Data Assimilation of Sparse Weather Station Observations at Kilometer Scales." The study trained a diffusion prior on 3-km HRRR analysis states and assimilated sparse station observations at inference time. With 40 stations, withheld-station wind RMSE improved by about 10% relative to HRRR analysis, and generated fields retained physically plausible mesoscale structures.
- Public implementation lineage is available through NVIDIA PhysicsNeMo (archived publication state DOI 10.5281/zenodo.15083507) and the open SDA framework of Rozet & Louppe.

## Frozen Phase-0 questions

Phase 0 must be completed outcome-blind. Before any 2024 Sundowner occurrence labels are inspected for this lane, verify all of the following:

1. An issuance-safe historical observation archive can be reconstructed for 2024 with observation availability/latency known well enough to exclude reports that were not available by the frozen issue time.
2. The regional HRRR-state training archive can be constructed without ERA5/reanalysis substitution, later-cycle substitution, or future-observation leakage.
3. The exact state variables, regional domain, grid/projection, observation network, QC policy, observation-error model, diffusion/SDA architecture, training period, seeds, sampling steps, and inference settings are frozen before scoring.
4. Missing observations remain missing. No outcome-conditioned station selection, member pruning, imputation, or retrospective station cleanup is allowed.
5. Compute feasibility is demonstrated for a full-year 2024 chronological experiment using the frozen configuration.
6. Exact-F24 compatibility is preserved: assimilation may use only observations actually available at the issuance cutoff, and the downstream Sundowner predictor must be evaluated at the existing frozen forecast-valid time convention.
7. SWEX 2022 remains independent physics/QC validation only and is never used as a 2024 predictor or for threshold fitting.

If any Phase-0 requirement fails, reject this lane before scoring.

## Evaluation boundary if Phase 0 passes

Use the existing frozen 2024 chronological CV design and existing baselines. No threshold rescue or post-hoc architecture modification after outcome scoring begins.

Promotion gates remain unchanged:
- event POD >= baseline +0.05 absolute
- FAR no worse than baseline
- Brier no worse than baseline
- AUC >= baseline - 0.005
- hard-negative Brier no worse
- hard-negative FPR no worse
- spatial precision >= baseline - 0.01
- regime safety
- gust non-inferiority

No 2025 exposure unless every 2024 gate passes independently.

## Current decision

PHASE 0 ONLY. NO PROMOTION. SI-3.1 on main remains authoritative production. PR #6 must remain draft/unmerged.
