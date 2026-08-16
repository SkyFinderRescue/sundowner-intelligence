#!/usr/bin/env python3
import json
import math
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(os.environ.get("OUT", "research/ndfd-development-range-2024.json"))
TARGETS = [x.strip() for x in os.environ.get("TARGETS", "").split(",") if x.strip()]
CHILD = Path(__file__).with_name("run-ndfd-pilot-range.py")

if not TARGETS:
    raise RuntimeError("TARGETS is empty")
if any(not t.startswith("2024-") for t in TARGETS):
    raise RuntimeError("Development wrapper is hard-guarded to predeclared 2024 targets only")

cases = []
rows = []
missing_targets = []
transfer = {
    "source_superfile_bytes": 0,
    "range_scan_bytes": 0,
    "target_grib_bytes": 0,
}
base_rules = None

with tempfile.TemporaryDirectory(prefix="si4-ndfd-dev-") as td:
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
        cases.extend(child.get("cases", []))
        rows.extend(child.get("rows", []))
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

rules = base_rules or {
    "2024_only": True,
    "2025_holdout_untouched": True,
    "latest_revision_after_cutoff_forbidden": True,
    "exact_valid_time_required": True,
    "range_request_full_file_fallback_forbidden": True,
    "future_observation_leakage": False,
    "diagnostic_metrics_not_skill_claim": True,
    "production_change": False,
}
rules["predeclared_missing_targets_preserved"] = True

out = {
    "status": "RESEARCH_ONLY_PIPELINE_PILOT_NOT_SKILL_EVIDENCE",
    "generated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "purpose": "2024-only predeclared NDFD range-development sample. Unavailable exact pre-cutoff archive targets remain explicitly missing; no date substitution and no 2025 access are permitted.",
    "targets": [t.replace("+00:00", "Z") for t in TARGETS],
    "cases": cases,
    "rows": rows,
    "missing_targets": missing_targets,
    "transfer": transfer,
    "pilot_diagnostics": {
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
