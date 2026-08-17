#!/usr/bin/env python3
"""Extract exact HRRR F24 upper-air profiles only for valid times present in a frozen benchmark file.

This is benchmark plumbing only. It preserves the existing extractor/science logic and simply
limits archived HRRR retrievals to the exact valid times already present in the supplied rows.
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import tempfile
from pathlib import Path


def load_base():
    path = Path(__file__).with_name("extract-hrrr-upper-herbie.py")
    spec = importlib.util.spec_from_file_location("si4_hrrr_base", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load base HRRR extractor")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--targets", required=True, help="JSON containing rows with target_valid_utc")
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    src = json.loads(Path(args.targets).read_text())
    valid_times = sorted({str(r.get("target_valid_utc")) for r in src.get("rows", []) if r.get("target_valid_utc")})
    if not valid_times:
        raise SystemExit("no target_valid_utc rows found")

    runs = []
    for value in valid_times:
        valid = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        run = (valid - dt.timedelta(hours=args.fxx)).astimezone(dt.timezone.utc).replace(tzinfo=None)
        runs.append(run)
    runs = sorted(set(runs))

    base = load_base()
    base.iter_runs = lambda _start, _end: iter(runs)
    with tempfile.TemporaryDirectory(prefix="si4-herbie-targets-") as tmp:
        rows, failures = base.extract(runs[0].date(), runs[-1].date(), args.fxx, Path(tmp))

    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "source": "NOAA HRRR archived pressure GRIB2 subset by Herbie index/range requests",
        "forecast_lead_hours": args.fxx,
        "target_source": args.targets,
        "requested_valid_times": valid_times,
        "requested_run_times": [r.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z") for r in runs],
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures[:100],
        "rules": {
            "exact_target_valid_times_only": True,
            "future_observations_used_as_predictors": False,
            "model_coefficients_changed": False,
        },
    }
    Path(args.out).write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"requested_valid_times": len(valid_times), "runs": len(runs), "rows": len(rows), "failure_count": len(failures)}, indent=2))
    if not rows or failures:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
