#!/usr/bin/env python3
import json
import math
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(os.environ.get("OUT", "research/ndfd-holdout-range-2025.json"))
TARGETS = [x.strip() for x in os.environ.get("TARGETS", "").split(",") if x.strip()]
CHILD = Path(__file__).with_name("run-ndfd-pilot-range.py")

if not TARGETS:
    raise RuntimeError("TARGETS is empty")
if any(not t.startswith("2025-") for t in TARGETS):
    raise RuntimeError("Holdout wrapper is hard-guarded to predeclared 2025 targets only")


def step_hours(step):
    """Normalize ecCodes step strings without changing benchmark rules."""
    s = str(step).strip().lower()
    if s.endswith("m"):
        try:
            return float(s[:-1]) / 60.0
        except ValueError:
            return None
    if s.endswith("h"):
        try:
            return float(s[:-1])
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


cases = []
rows = []
missing_targets = []
transfer = {
    "source_superfile_bytes": 0,
    "range_scan_bytes": 0,
    "target_grib_bytes": 0,
}
base_rules = None

with tempfile.TemporaryDirectory(prefix="si4-ndfd-holdout-") as td:
    td = Path(td)
    for i, target in enumerate(TARGETS):
        child_out = td / f"case-{i:03d}.json"
        env = os.environ.copy()
        env["TARGETS"] = target
        env["OUT"] = str(child_out)
        proc = subprocess.run(
            [sys.executable, str(CHILD)],
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if proc.returncode != 0:
            combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
            if "No pre-cutoff common snapshot contains" in combined:
                missing_targets.append({
                    "target_valid_utc": target.replace("+00:00", "Z"),
                    "reason": "ARCHIVE_TARGET_UNAVAILABLE_PRE_CUTOFF",
                    "observed_steps": [],
                    "source_keys": {},
                })
                continue
            raise RuntimeError(
                f"NDFD range child failed for {target} with exit {proc.returncode}; "
                f"not classified as an archive-missing target.\n{combined[-4000:]}"
            )

        child = json.load(open(child_out))
        if base_rules is None:
            base_rules = dict(child.get("rules", {}))

        child_cases = child.get("cases", [])
        child_rows = child.get("rows", [])
        if len(child_cases) != 1:
            raise RuntimeError(f"Expected exactly one child case for {target}, got {len(child_cases)}")

        case = child_cases[0]
        observed_steps = {p: case.get("sources", {}).get(p, {}).get("step") for p in ("wdir", "wspd", "wgust")}
        exact_f24 = all(step_hours(v) == 24.0 for v in observed_steps.values())
        if not exact_f24:
            # This is archive/plumbing availability, not model evidence. The 2025
            # score-only benchmark requires the same exact F24 definition frozen
            # before holdout access, so a 24h30m (e.g. 1470m) bulletin is missing,
            # not a substitute case.
            missing_targets.append({
                "target_valid_utc": target.replace("+00:00", "Z"),
                "reason": "EXACT_F24_BULLETIN_UNAVAILABLE",
                "observed_steps": observed_steps,
                "source_keys": {
                    p: case.get("sources", {}).get(p, {}).get("source_key")
                    for p in ("wdir", "wspd", "wgust")
                },
            })
        else:
            cases.append(case)
            rows.extend(child_rows)

        tr = child.get("transfer", {})
        for key in ("source_superfile_bytes", "range_scan_bytes", "target_grib_bytes"):
            transfer[key] += int(tr.get(key) or 0)

transfer["approx_bytes_transferred"] = transfer["range_scan_bytes"] + transfer["target_grib_bytes"]
transfer["fraction_of_full_superfiles"] = (
    transfer["approx_bytes_transferred"] / transfer["source_superfile_bytes"]
    if transfer["source_superfile_bytes"] else None
)

matched = [r for r in rows if r.get("observation") is not None]


def mean(vals):
    vals = [v for v in vals if isinstance(v, (int, float)) and math.isfinite(v)]
    return sum(vals) / len(vals) if vals else None


rules = base_rules or {}
rules.update({
    "2025_score_only": True,
    "2024_thresholds_frozen_before_access": True,
    "future_observation_leakage": False,
    "fire_outcome_used": False,
    "missing_values_preserved": True,
    "predeclared_missing_targets_preserved": True,
    "range_request_full_file_fallback_forbidden": True,
    "exact_step_24_required": True,
    "non_exact_step_is_missing_not_substituted": True,
    "no_2025_tuning": True,
    "not_a_sundowner_probability": True,
})

out = {
    "status": "RESEARCH_ONLY_2025_SCORE_ONLY_NOT_FOR_TUNING",
    "generated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "purpose": "Predeclared 2025 score-only NDFD F24 sample using rules frozen from 2024 development. Missing or non-exact-F24 archive targets remain missing; no target substitution or coefficient/threshold tuning is permitted.",
    "targets": [t.replace("+00:00", "Z") for t in TARGETS],
    "cases": cases,
    "rows": rows,
    "missing_targets": missing_targets,
    "transfer": transfer,
    "diagnostics": {
        "rows_total": len(rows),
        "rows_with_hads": len(matched),
        "mean_abs_gust_error_mph": mean([
            abs(r.get("diagnostic_gust_error_mph"))
            for r in matched if r.get("diagnostic_gust_error_mph") is not None
        ]),
        "mean_direction_error_deg": mean([
            r.get("diagnostic_direction_error_deg") for r in matched
        ]),
        "max_grid_distance_km": max(
            (r["ndfd_grid_distance_km"] for r in rows if r.get("ndfd_grid_distance_km") is not None),
            default=None,
        ),
        "minimum_effective_lead_hours": min(
            (c["effective_lead_hours"] for c in cases), default=None
        ),
    },
    "rules": rules,
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({
    "targets": len(TARGETS),
    "cases": len(cases),
    "missing_targets": len(missing_targets),
    "rows": len(rows),
    "transfer": transfer,
}, indent=2))
