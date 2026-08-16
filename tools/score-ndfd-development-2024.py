#!/usr/bin/env python3
"""Score 2024-only NDFD development rows without touching the 2025 holdout.

This is NOT a Sundowner-event benchmark. It evaluates deterministic NDFD gust
threshold guidance against same-time independent HADS gust observations and
checks whether the 2024 development sample is large enough to freeze a strong-
wind threshold rule. Sundowner occurrence thresholds remain separate and require
the independently verified meteorological event labels specified in the benchmark
design.
"""
import json
import os
from pathlib import Path

SRC = Path(os.environ.get("SRC", "research/ndfd-development-range-2024.json"))
OUT = Path(os.environ.get("SCORE_OUT", "research/ndfd-development-strong-wind-2024.json"))
OBS_THRESHOLDS = [30, 35, 40, 45]
FORECAST_THRESHOLDS = list(range(15, 61))
MIN_POSITIVES_TO_FREEZE = 30


def safe_div(a, b):
    return a / b if b else None


def confusion(rows, obs_thr, fcst_thr):
    tp = fp = tn = fn = 0
    for r in rows:
        obs = r.get("observation") or {}
        og = obs.get("gust_mph")
        fg = r.get("ndfd_gust_mph")
        if og is None or fg is None:
            continue
        y = og >= obs_thr
        p = fg >= fcst_thr
        if p and y:
            tp += 1
        elif p and not y:
            fp += 1
        elif not p and y:
            fn += 1
        else:
            tn += 1
    return {
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "pod": safe_div(tp, tp + fn),
        "far": safe_div(fp, tp + fp),
        "precision": safe_div(tp, tp + fp),
        "csi": safe_div(tp, tp + fp + fn),
        "specificity": safe_div(tn, tn + fp),
    }


def choose_threshold(rows, obs_thr):
    candidates = []
    for fthr in FORECAST_THRESHOLDS:
        m = confusion(rows, obs_thr, fthr)
        if m["csi"] is None:
            continue
        # Predeclared development objective: maximize CSI; then lower FAR;
        # then prefer threshold closest to the verifying strong-wind level.
        candidates.append((m["csi"], -(m["far"] if m["far"] is not None else 1.0), -abs(fthr - obs_thr), fthr, m))
    if not candidates:
        return None
    _, _, _, fthr, metrics = max(candidates)
    positives = metrics["tp"] + metrics["fn"]
    return {
        "observed_gust_threshold_mph": obs_thr,
        "selected_ndfd_gust_threshold_mph": fthr,
        "selection_objective": "maximize CSI; tie-break lower FAR; then closest threshold",
        "metrics": metrics,
        "observed_positive_rows": positives,
        "freeze_eligible": positives >= MIN_POSITIVES_TO_FREEZE,
    }


def by_regime(rows, obs_thr, fthr):
    out = {}
    for regime in sorted({r.get("regime") for r in rows if r.get("regime")}):
        subset = [r for r in rows if r.get("regime") == regime]
        out[regime] = {"n": len(subset), **confusion(subset, obs_thr, fthr)}
    return out


def main():
    x = json.loads(SRC.read_text())
    assert x["rules"]["2024_only"] is True
    assert x["rules"]["2025_holdout_untouched"] is True
    rows = [r for r in x.get("rows", []) if str(r.get("target_valid_utc", "")).startswith("2024-")]
    results = []
    for obs_thr in OBS_THRESHOLDS:
        chosen = choose_threshold(rows, obs_thr)
        if chosen:
            chosen["regime_metrics"] = by_regime(rows, obs_thr, chosen["selected_ndfd_gust_threshold_mph"])
            results.append(chosen)

    freezeable = [r for r in results if r["freeze_eligible"]]
    out = {
        "status": "RESEARCH_ONLY_2024_DEVELOPMENT_NOT_2025_SKILL",
        "source": str(SRC),
        "rows": len(rows),
        "exact_f24_cases": len(x.get("cases", [])),
        "missing_targets": len(x.get("missing_targets", [])),
        "rules": {
            "2024_only": True,
            "2025_holdout_untouched": True,
            "future_observation_leakage": False,
            "fire_outcome_used": False,
            "not_a_sundowner_event_score": True,
            "minimum_observed_positive_rows_to_freeze": MIN_POSITIVES_TO_FREEZE,
            "threshold_scan_predeclared_before_2025": True,
            "missing_values_preserved": True,
        },
        "strong_wind_threshold_diagnostics": results,
        "freeze_decision": {
            "eligible_rules": len(freezeable),
            "status": "ENOUGH_2024_SUPPORT_TO_FREEZE" if freezeable else "INSUFFICIENT_2024_POSITIVE_SUPPORT_DO_NOT_FREEZE",
            "note": "Sundowner event-rule thresholds remain unfrozen until matched independent meteorological event labels are available; these are strong-wind diagnostics only."
        },
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps({
        "rows": out["rows"],
        "exact_f24_cases": out["exact_f24_cases"],
        "freeze_status": out["freeze_decision"]["status"],
        "diagnostics": [{
            "obs_mph": r["observed_gust_threshold_mph"],
            "ndfd_mph": r["selected_ndfd_gust_threshold_mph"],
            "positives": r["observed_positive_rows"],
            "csi": r["metrics"]["csi"],
            "far": r["metrics"]["far"],
            "freeze_eligible": r["freeze_eligible"],
        } for r in results],
    }, indent=2))


if __name__ == "__main__":
    main()
