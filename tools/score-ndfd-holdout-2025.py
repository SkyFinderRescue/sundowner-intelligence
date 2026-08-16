#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path

INPUT = Path(os.environ.get("INPUT", "research/ndfd-holdout-range-2025.json"))
RULES = Path(os.environ.get("RULES", "research/NDFD_2024_FROZEN_RULES.json"))
OUT = Path(os.environ.get("SCORE_OUT", "research/ndfd-holdout-strong-wind-2025.json"))

x = json.load(open(INPUT))
rules = json.load(open(RULES))
fr = rules["frozen_strong_wind_rule"]
obs_thr = float(fr["verification_observed_gust_threshold_mph"])
fcst_thr = float(fr["ndfd_forecast_gust_threshold_mph"])

if x.get("status") != "RESEARCH_ONLY_2025_SCORE_ONLY_NOT_FOR_TUNING":
    raise RuntimeError("input is not the guarded 2025 score-only sample")
if rules.get("holdout_policy", {}).get("2025_is_score_only") is not True:
    raise RuntimeError("frozen rules do not authorize score-only 2025 use")
if rules.get("holdout_policy", {}).get("no_2025_tuning") is not True:
    raise RuntimeError("frozen rules missing no-2025-tuning guard")


def finite(v):
    return isinstance(v, (int, float)) and math.isfinite(v)


def metrics(rows):
    tp = fp = tn = fn = 0
    gust_err = []
    direction_err = []
    for r in rows:
        obs = r.get("observation")
        fg = r.get("ndfd_gust_mph")
        if not obs or not finite(fg):
            continue
        og = obs.get("gust_mph")
        if not finite(og):
            og = obs.get("speed_mph")
        if not finite(og):
            continue
        pred = fg >= fcst_thr
        truth = og >= obs_thr
        if pred and truth: tp += 1
        elif pred and not truth: fp += 1
        elif not pred and truth: fn += 1
        else: tn += 1
        gust_err.append(fg - og)
        de = r.get("diagnostic_direction_error_deg")
        if finite(de): direction_err.append(de)
    den_pos = tp + fn
    den_pred = tp + fp
    den_csi = tp + fp + fn
    den_neg = tn + fp
    return {
        "n_scored": tp + fp + tn + fn,
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "pod": tp / den_pos if den_pos else None,
        "far": fp / den_pred if den_pred else None,
        "precision": tp / den_pred if den_pred else None,
        "csi": tp / den_csi if den_csi else None,
        "specificity": tn / den_neg if den_neg else None,
        "gust_mae_mph": sum(abs(e) for e in gust_err) / len(gust_err) if gust_err else None,
        "gust_bias_mph": sum(gust_err) / len(gust_err) if gust_err else None,
        "mean_direction_error_deg": sum(direction_err) / len(direction_err) if direction_err else None,
    }

rows = x.get("rows", [])
regimes = {}
for regime in ("western", "hybrid", "eastern"):
    regimes[regime] = metrics([r for r in rows if r.get("regime") == regime])

out = {
    "status": "RESEARCH_ONLY_FROZEN_2025_NDFD_SCORE_NOT_SUNDOWNER_PROBABILITY",
    "source": str(INPUT),
    "frozen_rules_source": str(RULES),
    "frozen_rule": {
        "observed_gust_threshold_mph": obs_thr,
        "ndfd_gust_threshold_mph": fcst_thr,
        "selected_from": "2024-only development",
        "selection_objective": rules.get("rules", {}).get("threshold_selection_objective"),
    },
    "guards": {
        "2025_score_only": True,
        "no_2025_tuning": True,
        "thresholds_selected_before_2025_score": True,
        "future_observation_leakage": False,
        "fire_outcome_used": False,
        "not_a_sundowner_probability": True,
        "missing_values_preserved": True,
    },
    "overall": metrics(rows),
    "regimes": regimes,
    "archive_coverage": {
        "predeclared_targets": len(x.get("targets", [])),
        "exact_f24_cases": len(x.get("cases", [])),
        "missing_targets": len(x.get("missing_targets", [])),
        "station_rows": len(rows),
        "rows_with_hads": sum(1 for r in rows if r.get("observation") is not None),
        "transfer": x.get("transfer"),
    },
    "interpretation_rule": "This scores deterministic NDFD strong-wind guidance only. It does not create or imply an NWS Sundowner probability or event forecast.",
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
