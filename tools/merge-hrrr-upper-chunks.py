#!/usr/bin/env python3
"""Merge monthly SI-4 HRRR F24 upper-air chunks with fail-closed provenance checks."""
from __future__ import annotations

import argparse
import datetime as dt
import glob
import json
from pathlib import Path

EXPECTED_ZONES = {
    "Gaviota", "Refugio", "Goleta", "San Marcos Pass",
    "Mission Canyon", "Montecito", "Toro Canyon", "Carpinteria",
}
RUN_HOURS = {0, 6, 12, 18}


def zulu(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="Directory or glob for monthly JSON chunks")
    p.add_argument("--start", required=True)
    p.add_argument("--end", required=True)
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    pattern = args.input
    files = sorted(glob.glob(pattern if any(c in pattern for c in "*?[") else str(Path(pattern) / "**" / "*.json"), recursive=True))
    if not files:
        raise SystemExit(f"no chunk files found: {args.input}")

    start = dt.date.fromisoformat(args.start)
    end = dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")

    rows = []
    sources = []
    seen = set()
    failures = []
    for file in files:
        x = json.load(open(file))
        if x.get("status") != "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION":
            failures.append({"file": file, "error": "missing research-only guard"})
            continue
        if int(x.get("forecast_lead_hours", -1)) != args.fxx:
            failures.append({"file": file, "error": f"lead mismatch {x.get('forecast_lead_hours')}"})
            continue
        if int(x.get("failure_count", 0)) != 0:
            failures.append({"file": file, "error": f"source extraction failures={x.get('failure_count')}"})
            continue
        sources.append({
            "file": Path(file).name,
            "start": x.get("start"),
            "end": x.get("end"),
            "source": x.get("source"),
            "rows": len(x.get("rows") or []),
        })
        for r in x.get("rows") or []:
            key = (r.get("run_time"), r.get("zone"))
            if key in seen:
                failures.append({"file": file, "error": f"duplicate row {key}"})
                continue
            seen.add(key)
            rows.append(r)

    if failures:
        raise SystemExit(json.dumps({"merge_failures": failures[:50]}, indent=2))

    expected_runs = []
    d = start
    while d <= end:
        for h in sorted(RUN_HOURS):
            expected_runs.append(dt.datetime(d.year, d.month, d.day, h, tzinfo=dt.timezone.utc))
        d += dt.timedelta(days=1)
    expected = {(t.isoformat().replace("+00:00", "Z"), z) for t in expected_runs for z in EXPECTED_ZONES}
    actual = set(seen)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        raise SystemExit(json.dumps({
            "coverage_error": True,
            "expected_rows": len(expected),
            "actual_rows": len(actual),
            "missing_count": len(missing),
            "extra_count": len(extra),
            "missing_sample": missing[:20],
            "extra_sample": extra[:20],
        }, indent=2))

    rows.sort(key=lambda r: (r["run_time"], r["zone"]))
    for r in rows:
        rt = zulu(r["run_time"])
        vt = zulu(r["valid_time"])
        if int((vt - rt).total_seconds() // 3600) != args.fxx:
            raise SystemExit(f"valid/run time lead mismatch: {r['run_time']} {r['valid_time']}")
        if len(r.get("profile") or []) != 5:
            raise SystemExit(f"profile completeness failure: {r['run_time']} {r['zone']}")

    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "source": "Merged monthly NOAA HRRR archived pressure GRIB2 subsets; Herbie index/range requests",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
        "expected_zones": sorted(EXPECTED_ZONES),
        "run_hours_utc": sorted(RUN_HOURS),
        "source_chunks": sources,
        "rows": rows,
        "failure_count": 0,
        "rules": {
            "exact_fixed_lead_required": True,
            "missing_rows_allowed": False,
            "future_observation_leakage": False,
            "fire_outcome_used": False,
        },
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(json.dumps({"out": str(out), "chunks": len(sources), "rows": len(rows), "expected_rows": len(expected)}, indent=2))


if __name__ == "__main__":
    main()
