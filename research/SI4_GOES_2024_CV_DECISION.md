# SI-4 GOES-West 2024 Chronological CV Decision

Status: **RESEARCH ONLY — satellite candidate rejected for promotion at this stage.**

Evidence source: GitHub Actions `SI-4 GOES 2024 Chronological CV` run `32003204983`, isolated branch `si4-goes-chronological-cv`, based on the coherent-scan GOES-18 extraction plumbing validated on `si4-research` head `330626d9f9c109d2d2daa1f643f9d20d674cd445`.

## Frozen development design

- Development data only: 2024.
- 2025 holdout was not loaded.
- 40 event cases and 40 independently selected hard-negative cases were extracted; 60 rows were pooled across 3 chronological test folds.
- GOES-18 ABI-L1b-RadC, mask version `goes-marine-masks-v2-2026-08-16`.
- Required issuance-safe night offsets were 0 h and 1 h; longer offsets remained optional and missing values were not imputed.
- Future imagery and fire outcome were not used.
- Candidate set was intentionally small and physically grounded; the bounded discovery screen was not itself treated as independent skill.

## Chronological CV result

Frozen baseline on pooled test rows:
- Brier: 0.3607809259580026
- AUC: 0.6522222222222223
- hard-negative Brier: 0.02143216098939949
- POD: 0.6333333333333333
- hard-negative FPR: 0.43333333333333335

Tested GOES candidates:

1. `channel_cloud_trend_1h` (`local_channel_bt13_change_1h`)
   - Brier 0.2235810738556693
   - AUC 0.67
   - hard-negative Brier 0.2286435274045772
   - POD 0.5
   - hard-negative FPR 0.36666666666666664
   - Failed the predeclared hard-negative-Brier and POD non-inferiority gates.

2. `coast_microphysics_level` (`local_coast_btd13_07`)
   - Brier 0.2304978254125806
   - AUC 0.6377777777777778
   - hard-negative Brier 0.25340680696343304
   - POD 0.6333333333333333
   - hard-negative FPR 0.4666666666666667
   - Failed AUC, hard-negative-Brier, and hard-negative-FPR gates.

3. `coast_channel_microphysics_contrast` (`local_coast_minus_channel_btd13_07`)
   - Brier 0.23189354828811248
   - AUC 0.6244444444444445
   - hard-negative Brier 0.2421486940041507
   - POD 0.6
   - hard-negative FPR 0.4666666666666667
   - Failed AUC, hard-negative-Brier, and hard-negative-FPR gates.

4. `compact_marine_state` (`local_coast_btd13_07`, `local_coast_minus_channel_btd13_07`, `local_channel_bt13_change_1h`)
   - Brier 0.2266847737055252
   - AUC 0.6466666666666666
   - hard-negative Brier 0.22778785423076572
   - POD 0.5333333333333333
   - hard-negative FPR 0.36666666666666664
   - Failed the predeclared hard-negative-Brier and POD non-inferiority gates.

No candidate passed all predeclared chronological-CV gates. `eligible_for_one_time_2025_freeze` was empty and no preferred satellite candidate was selected.

## Decision

Do **not** expose the 2025 holdout to these GOES candidates and do **not** add a GOES marine-layer feature to SI-4 production based on this experiment. Retain the already independently validated non-satellite surface-coupling candidate as the current research leader. The GOES extraction/mask/plumbing remains useful research infrastructure and may be revisited only with a materially different, physically justified hypothesis or improved independent data design; it must not be tuned against 2025.

This negative result is evidence, not a failure to be tuned away.
