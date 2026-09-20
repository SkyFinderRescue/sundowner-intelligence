# SI-4 dualGNN Phase-0 feasibility — 2026-09-20

Status: **FEASIBLE TO REPRODUCE FROM PUBLISHED METHOD, BUT NOT YET A FROZEN/SCORABLE CANDIDATE / NO 2025 EXPOSURE / NO PROMOTION**

## Current-head prerequisite

This assessment follows the current PR #6 head architecture review. PR #6 must remain draft/unmerged and SI-3.1 on `main` remains untouched.

## Primary-source reproducibility check

Lakatos (2026), QJRMS, DOI 10.1002/qj.70119, gives enough implementation detail to reproduce the method independently with standard PyTorch Geometric primitives: GraphSAGE with mean aggregation; fixed undirected distance-threshold graph; node-wise ensemble outputs; composite energy-score plus variogram-score loss; rolling training windows; batch normalization/ReLU/dropout; early stopping. The paper reports hyperparameter work on a single NVIDIA RTX 3060, so the architecture itself does not require datacenter-scale compute.

However, no official public source-code repository was located in the paper's data-availability statement or targeted public search. The published datasets are also not directly reusable for Sundowner occurrence. Therefore SI-4 must treat this as an independent implementation from the paper, not a byte-identical upstream reproduction.

## Outcome-blind constraints before scoring

The published study selected graph distance thresholds and ES/VS weights using its own task data. SI-4 must not optimize analogous choices against 2024 Sundowner outcomes. Before any outcome scoring, freeze:

1. exact-F24 2024 HREF source/member mapping and source-QC behavior;
2. station/zone node inventory and graph edge rule from geography/topography only, not Sundowner labels;
3. predictor inventory and target representation;
4. GraphSAGE depth/width, normalization, activation, dropout, optimizer, learning rate, early-stopping rule and random seeds;
5. ES/VS weighting without searching 2024 Sundowner outcomes;
6. ensemble output size and missing-data behavior (missing stays missing);
7. chronological training/validation calendar and full-year compute budget.

No threshold rescue, member/station pruning, future observations/cycles, reanalysis substitution, fire predictors, random future-leaking folds, or 2025 exposure.

## Feasibility decision

**Phase 0 remains open rather than rejected.** The published architecture is technically reproducible with common open-source components and its reported compute scale is practical. The unresolved item is a defensible outcome-blind freeze of the Santa Barbara graph and ES/VS weighting. Until those are frozen, no 2024 outcome scoring is permitted and no gate result is claimed.

Frozen promotion gates remain unchanged: event POD >= baseline +0.05 absolute; FAR no worse; Brier no worse; AUC >= baseline-0.005; hard-negative Brier/FPR no worse; spatial precision >= baseline-0.01; regime safety; gust non-inferiority.

SWEX 600.034 remains pending official delivery/acquisition; no bytes/checksum are claimed here.

Production remains **NO PROMOTION**.