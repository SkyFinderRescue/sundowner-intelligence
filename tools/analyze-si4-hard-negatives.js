"use strict";

const fs = require("fs");
const INPUT = process.env.INPUT || "/tmp/si4-holdout-summary.json";
const OUT = process.env.OUT || "research/si4-hard-negative-gate.json";
const x = JSON.parse(fs.readFileSync(INPUT, "utf8"));

if (x.status !== "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION") throw new Error("research-only guard missing");
if (Number(x.frozen_design?.holdout?.forecast_lead_hours) !== 24) throw new Error("holdout is not fixed F24");

const regimes = {};
let totalN = 0, baseBrierWeighted = 0, candBrierWeighted = 0;
for (const [regime, r] of Object.entries(x.regimes || {})) {
  if (regime === "terrain_response") continue;
  const h = r.hard_negative_analysis;
  if (!h?.baseline || !h?.candidate) throw new Error(`hard-negative evidence missing for ${regime}`);
  const n = Number(h.candidate.n || 0);
  const bb = Number(h.baseline.brier_negative_only);
  const cb = Number(h.candidate.brier_negative_only);
  const bf = Number(h.baseline.fpr_at_train_matched_pod);
  const cf = Number(h.candidate.fpr_at_train_matched_pod);
  const enough = n >= 30;
  const brierNonInferior = Number.isFinite(bb) && Number.isFinite(cb) && cb <= bb + 1e-12;
  const matchedPodFprNonInferior = Number.isFinite(bf) && Number.isFinite(cf) && cf <= bf + 1e-12;
  const pass = enough && brierNonInferior && matchedPodFprNonInferior;
  regimes[regime] = {
    n,
    baseline_negative_brier: bb,
    candidate_negative_brier: cb,
    negative_brier_delta: cb - bb,
    baseline_fpr_at_train_matched_pod: bf,
    candidate_fpr_at_train_matched_pod: cf,
    fpr_delta_at_train_matched_pod: cf - bf,
    enough_samples: enough,
    negative_brier_non_inferior: brierNonInferior,
    matched_pod_fpr_non_inferior: matchedPodFprNonInferior,
    gate_pass: pass
  };
  if (n > 0 && Number.isFinite(bb) && Number.isFinite(cb)) {
    totalN += n;
    baseBrierWeighted += n * bb;
    candBrierWeighted += n * cb;
  }
}

const aggregate = {
  n: totalN,
  baseline_negative_brier: totalN ? baseBrierWeighted / totalN : null,
  candidate_negative_brier: totalN ? candBrierWeighted / totalN : null,
};
aggregate.negative_brier_delta = Number.isFinite(aggregate.baseline_negative_brier) && Number.isFinite(aggregate.candidate_negative_brier)
  ? aggregate.candidate_negative_brier - aggregate.baseline_negative_brier : null;
aggregate.gate_pass = Object.values(regimes).every(r => r.gate_pass);

const out = {
  status: "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
  generated: new Date().toISOString(),
  source: INPUT,
  frozen_design: x.frozen_design,
  rule: "Hard-negative promotion requires candidate negative-only Brier and false-positive rate at the training-selected matched-POD threshold to be non-inferior to SI-3 in every regime with >=30 independent 2025 hard-negative rows. No coefficient changes are made by this analysis.",
  aggregate,
  regimes,
  promotion_gate: aggregate.gate_pass ? "PASS" : "FAIL"
};
fs.mkdirSync(require("path").dirname(OUT), {recursive:true});
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
