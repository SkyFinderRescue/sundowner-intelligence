# SI-4 NDFD 2025 Frozen Score-Only Status

Status: **RESEARCH ONLY — ISOLATED NDFD BENCHMARK LANE — NOT FOR PRODUCTION**

This record persists the first successful 2025 score-only evaluation of the deterministic NDFD strong-wind rule after thresholds were frozen entirely from 2024 development. It does **not** claim NWS/NDFD superiority or infer a Sundowner probability from NDFD.

## Frozen provenance

- Branch: `si4-ndfd-benchmark`.
- 2024 rule source: `research/NDFD_2024_FROZEN_RULES.json`.
- 2024 selected rule: observed gust >= 30 mph; NDFD forecast gust >= 28 mph.
- Selection objective: maximize CSI on 2024 only; tie-break lower FAR, then closest threshold.
- 2025 workflow: **SI-4 NDFD 2025 Frozen Score-Only Benchmark** run #3, run id `31970887477`, attempt 2.
- Successful head: `da1e7b0ff3b0333448d74b10669e6a1160c0bf2e`.
- Artifact: `si4-ndfd-frozen-score-2025`, artifact id `9270975678`, SHA-256 `bf64cffed9994bbf30f40d505b8edf83d7a3bcc7ca7366ab09eb407cd49a4974`.
- 2025 thresholds/coefficient tuning: **forbidden and not performed**.

## Independent 2025 score-only result

Scored rows: **195** exact-F24 NDFD/station matches.

Overall deterministic strong-wind skill:

- TP 15; FP 6; TN 156; FN 18.
- POD **0.4545**.
- FAR **0.2857**.
- Precision **0.7143**.
- CSI **0.3846**.
- Specificity **0.9630**.
- Gust MAE **6.0046 mph**.
- Gust bias **-2.0831 mph**.
- Mean circular wind-direction error **50.22 deg**.

Regime diagnostics:

- Western: n=78, POD 0.6087, FAR 0.2632, CSI 0.5000, gust MAE 7.3163 mph.
- Hybrid: n=39, POD 0.2000, FAR 0.5000, CSI 0.1667, gust MAE 6.4646 mph.
- Eastern: n=78, POD 0.0000, no false positives, CSI 0.0000, gust MAE 4.4628 mph.

The eastern zero-POD result is adverse evidence and must remain visible. It may reflect deterministic NDFD gust underforecast and/or the limitations of this frozen strong-wind threshold lane; it may not be tuned away using 2025.

## Guardrails preserved

- NDFD remains deterministic guidance; no NWS Sundowner probability is manufactured.
- Exact F24 is required. Non-exact archive steps remain missing rather than substituted.
- Future HADS observations are verification labels only.
- Fire association is not used.
- Missing rows remain missing.
- Transient upstream child-process/data-service failures were retried without changing thresholds, scoring, observations, or model coefficients.
- This branch remains isolated and must not be merged into `si4-research` until the matched SI-3/SI-4/NDFD tables are complete and reviewed.

## Next benchmark gate

Generate the matched SI-3 / SI-4 / NDFD table on these **identical 195 station-valid-time observations**, preserving the frozen 2024 threshold policy. NDFD probability/Brier comparisons remain prohibited unless a real archived official probabilistic NWS product is identified. Comparative conclusions must include regime/station coverage, gust error, direction error, strong-wind threshold skill, and uncertainty where sample size permits.
