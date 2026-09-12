# SI-4 Final Ablation — Frozen 2025 Decision

Status: **RESEARCH ONLY — DO NOT LOAD IN PRODUCTION**

Authoritative evidence: `SI-4 All-Season Frozen Holdout` run 107, run id `32161555227`, head `9cbe18edf31dbd57c49dc766ab960150ed23c2b0`. The final ablation was predeclared, fit only on 2024 development data where fitting was required, and scored once on the already-frozen 2025 holdout. No coefficient or threshold was retuned from 2025 outcomes.

## Frozen full SI-4 versus SI-3

On 7,279 frozen 2025 rows:

- overall Brier: SI-3 `0.0795132` -> full SI-4 `0.0524935`;
- pooled AUC: SI-3 `0.767001` -> full SI-4 `0.937080`;
- thresholded POD: `0.479881` -> `0.467958`;
- thresholded FAR: `0.728956` -> `0.522796`;
- hard-negative FPR at 2024-frozen matched-POD thresholds: `0.588101` -> `0.229596`;
- hard-negative negative-only Brier: `0.0259841` -> `0.0403595`.

The full SI-4 model therefore retains a large independent probabilistic-skill and false-alarm improvement, but does not clear the recall/calibration promotion gate because POD is lower and aggregate hard-negative negative-only Brier is worse than SI-3, driven primarily by western calibration.

## Feature-block ablation

Interpretation is diagnostic only. A feature removal that scores better on 2025 does not authorize post-holdout architecture retuning; any architecture change based on this ablation would require new independent confirmation.

- Removing **pressure evolution** materially worsened overall Brier (`+0.0055552`), AUC (`-0.0139081`), event POD (`-0.0372578`) and FAR (`+0.0445689`) versus full SI-4. Pressure-evolution information is independently supported and should be retained in the research architecture.
- Removing **wave / critical-level features** slightly improved Brier (`-0.0003757`) and POD (`+0.0163934`) but worsened AUC (`-0.0025544`), FAR (`+0.0506945`) and hard-negative FPR (`+0.0663616`). This is not a clean promotion case for removal; retain the block pending genuinely independent confirmation.
- Removing **dryness features** slightly improved Brier (`-0.0006620`), AUC (`+0.0027977`) and POD (`+0.0223547`) but materially worsened FAR (`+0.0664671`) and hard-negative FPR (`+0.0922960`). Do not remove based on the frozen holdout diagnostic.
- Removing **season terms** was nearly neutral on Brier/AUC and slightly improved POD, but worsened FAR and hard-negative FPR. No evidence-backed reason exists to change the frozen architecture from this diagnostic alone.
- A **baseline-logit-only** SI-4 recalibration lost substantial Brier/AUC skill versus full SI-4 and reproduced the SI-3 thresholded recall/FAR behavior; it is not a superior replacement.

## Frozen western surface-coupling candidate

The already-frozen western coupling lane was evaluated exactly once as a predeclared surviving candidate; its coefficients were not refit after 2025 exposure.

Compared with full SI-4 it improved:

- overall Brier `0.0524935` -> `0.0511251`;
- pooled AUC `0.937080` -> `0.942497`;
- western Brier `0.114589` -> `0.111168`;
- western AUC `0.878473` -> `0.890656`;
- aggregate hard-negative negative-only Brier `0.0403595` -> `0.0372955`;
- aggregate hard-negative FPR `0.229596` -> `0.225019`;
- western hard-negative negative-only Brier `0.323643` -> `0.296684`;
- western hard-negative FPR `0.664430` -> `0.624161`.

But it degraded the predeclared recall/FAR preservation gates:

- overall POD `0.467958` -> `0.453055` (`-0.014903` absolute);
- overall FAR `0.522796` -> `0.534456` (`+0.011660` absolute);
- western POD `0.470305` -> `0.454254`.

**Decision:** do **not** promote the western surface-coupling candidate into production SI-4. Retain it as research evidence because it improves calibration/discrimination, but it fails the required recall/FAR preservation gate.

## Promotion decision after final ablation

The final ablation does not rescue the existing frozen SI-4 candidate from its event-recall deficit. Earlier 2024-only recall-recovery candidates failed their predeclared development gates before any 2025 scoring, so there is no leakage-safe evidence-backed recall correction available to substitute now.

**Current production decision: NO PROMOTION.** Preserve SI-3.1 on `main`, keep PR #6 draft/unmerged, and do not change production coefficients. The SI-4 research lane remains scientifically valuable and materially better on several independent probabilistic, false-alarm, gust, timing and spatial metrics, but it has not satisfied the full operational promotion gate.

Remaining required work is limited to independent evidence that can legitimately change that decision: final-QC SWEX ingestion when the already-requested NCAR/EOL file arrives, followed by any genuinely new 2024-only/independent-physics hypothesis justified by those observations. Release verification and browser QA are not useful promotion work until the science gate can be satisfied.
