#!/usr/bin/env python3
"""Extract leakage-safe HRRR upper-air profiles at exact frozen benchmark valid times.

The frozen NDFD archive rows are valid at 01Z. HRRR F24 is not archived from 01Z
because only the 00/06/12/18Z extended HRRR cycles carry leads beyond 18 h.
For each exact frozen valid time this plumbing therefore selects the latest extended
HRRR cycle whose lead is >=24 h (01Z targets resolve to the prior 00Z F25 forecast).
No observations, thresholds, model coefficients, or benchmark valid times are changed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import tempfile
from pathlib import Path

import pandas as pd
from herbie import Herbie


def load_base():
    path = Path(__file__).with_name("extract-hrrr-upper-herbie.py")
    spec = importlib.util.spec_from_file_location("si4_hrrr_base", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load base HRRR extractor")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def extended_cycle_for(valid: dt.datetime, minimum_lead: int) -> tuple[dt.datetime, int]:
    """Latest 00/06/12/18Z HRRR cycle giving at least minimum_lead at exact valid time."""
    cutoff = valid - dt.timedelta(hours=minimum_lead)
    cutoff = cutoff.astimezone(dt.timezone.utc).replace(tzinfo=None)
    candidates = []
    for day_offset in range(0, 3):
        day = cutoff.date() - dt.timedelta(days=day_offset)
        for hour in (0, 6, 12, 18):
            run = dt.datetime(day.year, day.month, day.day, hour)
            if run <= cutoff:
                lead = int(round((valid.replace(tzinfo=None) - run).total_seconds() / 3600))
                if lead >= minimum_lead and lead <= 48:
                    candidates.append((run, lead))
    if not candidates:
        raise RuntimeError(f"no extended HRRR cycle found for {valid.isoformat()} lead>={minimum_lead}")
    return max(candidates, key=lambda x: x[0])


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--targets", required=True, help="JSON containing rows with target_valid_utc")
    p.add_argument("--minimum-lead", type=int, default=24)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    src = json.loads(Path(args.targets).read_text())
    valid_times = sorted({str(r.get("target_valid_utc")) for r in src.get("rows", []) if r.get("target_valid_utc")})
    if not valid_times:
        raise SystemExit("no target_valid_utc rows found")

    base = load_base()
    points = pd.DataFrame({
        "latitude": [base.POINTS[k][0] for k in base.POINTS],
        "longitude": [base.POINTS[k][1] for k in base.POINTS],
        "stid": list(base.POINTS),
    })
    rows, failures, requests = [], [], []

    with tempfile.TemporaryDirectory(prefix="si4-herbie-targets-") as tmp:
        save_dir = Path(tmp)
        for value in valid_times:
            valid = dt.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
            run, lead = extended_cycle_for(valid, args.minimum_lead)
            requests.append({
                "valid_time": valid.isoformat().replace("+00:00", "Z"),
                "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                "forecast_lead_hours": lead,
            })
            try:
                h = Herbie(run, model="hrrr", product="prs", fxx=lead,
                           priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
                ds = h.xarray(base.SEARCH, remove_grib=True, verbose=False)
                if isinstance(ds, list):
                    import xarray as xr
                    ds = xr.merge(ds, compat="override", join="exact")
                picked = ds.herbie.pick_points(points, method="nearest")
                for point_index, zone in enumerate(base.POINTS):
                    rows.append({
                        "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                        "valid_time": valid.isoformat().replace("+00:00", "Z"),
                        "forecast_lead_hours": lead,
                        "zone": zone,
                        "profile": base.profile_from_point(picked, point_index),
                    })
            except Exception as exc:
                failures.append({
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "run": run.replace(tzinfo=dt.timezone.utc).isoformat(),
                    "forecast_lead_hours": lead,
                    "error": repr(exc),
                })

    leads = sorted({r["forecast_lead_hours"] for r in requests})
    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "source": "NOAA HRRR archived pressure GRIB2 subset by Herbie index/range requests",
        "minimum_forecast_lead_hours": args.minimum_lead,
        "actual_forecast_lead_hours": leads,
        "target_source": args.targets,
        "requested_valid_times": valid_times,
        "requests": requests,
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures[:100],
        "rules": {
            "exact_target_valid_times_only": True,
            "minimum_lead_hours_enforced": True,
            "extended_cycles_only": True,
            "future_observations_used_as_predictors": False,
            "model_coefficients_changed": False,
            "ndfd_rows_or_thresholds_changed": False,
        },
    }
    Path(args.out).write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({
        "requested_valid_times": len(valid_times),
        "rows": len(rows),
        "failure_count": len(failures),
        "actual_leads": leads,
    }, indent=2))
    if not rows or failures:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
