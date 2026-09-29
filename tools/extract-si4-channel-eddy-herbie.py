#!/usr/bin/env python3
"""Research-only fixed-F24 HRRR surface extractor for SI-4 channel-eddy testing.

The extractor is locked to 2024 development, frozen geography and issuance-time fields.
It never reads observations, event labels, fire outcomes, or the frozen 2025 holdout.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
from herbie import Herbie

RUN_HOURS = (0, 6, 12, 18)
POINTS = {
    "western_channel": (34.300, -120.350),
    "central_channel": (34.300, -119.850),
    "eastern_channel": (34.300, -119.450),
    "santa_barbara_coast": (34.410, -119.700),
    "goleta_coast": (34.430, -119.850),
}
REQUIRED_SEARCHES = {
    "t2m": r":TMP:2 m above ground:",
    "td2m": r":DPT:2 m above ground:",
    "u10": r":UGRD:10 m above ground:",
    "v10": r":VGRD:10 m above ground:",
}
OPTIONAL_SEARCHES = {
    "pblh": r":HPBL:surface:",
    "mslp": r":MSLMA:mean sea level:",
}


def iter_runs(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        for hour in RUN_HOURS:
            yield dt.datetime(day.year, day.month, day.day, hour)
        day += dt.timedelta(days=1)


def _single_data_var(ds):
    names = list(ds.data_vars)
    if len(names) != 1:
        candidates = [n for n in names if ds[n].attrs.get("GRIB_shortName")]
        if len(candidates) == 1:
            return candidates[0]
        raise RuntimeError(f"expected one GRIB data variable, got {names}")
    return names[0]


def _point_scalar(picked, point_index):
    name = _single_data_var(picked)
    da = picked[name]
    for dim in tuple(da.dims):
        if dim == "point":
            da = da.isel(point=point_index)
        elif da.sizes.get(dim, 1) == 1:
            da = da.isel({dim: 0})
    value = np.asarray(da.values).squeeze()
    if np.size(value) != 1 or not np.isfinite(value):
        return None
    return float(value)


def _pick_field(h: Herbie, search: str, points_df: pd.DataFrame):
    ds = h.xarray(search, remove_grib=True, verbose=False)
    if isinstance(ds, list):
        if len(ds) != 1:
            raise RuntimeError(f"selector {search!r} returned {len(ds)} datasets")
        ds = ds[0]
    return ds.herbie.pick_points(points_df, method="nearest")


def _wind(u: float, v: float):
    speed_mph = math.hypot(u, v) * 2.2369362921
    direction = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    return speed_mph, direction


def extract(start: dt.date, end: dt.date, fxx: int, save_dir: Path):
    rows, failures = [], []
    optional_failures = []
    points_df = pd.DataFrame({
        "latitude": [POINTS[k][0] for k in POINTS],
        "longitude": [POINTS[k][1] for k in POINTS],
        "stid": list(POINTS),
    })
    for run in iter_runs(start, end):
        valid = run.replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=fxx)
        try:
            h = Herbie(run, model="hrrr", product="sfc", fxx=fxx,
                       priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
            required = {k: _pick_field(h, s, points_df) for k, s in REQUIRED_SEARCHES.items()}
            optional = {}
            for key, search in OPTIONAL_SEARCHES.items():
                try:
                    optional[key] = _pick_field(h, search, points_df)
                except Exception as exc:
                    optional[key] = None
                    optional_failures.append({
                        "run": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                        "field": key,
                        "error": repr(exc),
                    })
            for i, point in enumerate(POINTS):
                t_k = _point_scalar(required["t2m"], i)
                td_k = _point_scalar(required["td2m"], i)
                u = _point_scalar(required["u10"], i)
                v = _point_scalar(required["v10"], i)
                if None in (t_k, td_k, u, v):
                    raise RuntimeError(f"non-finite required channel field at {point}")
                speed, direction = _wind(u, v)
                pblh = _point_scalar(optional["pblh"], i) if optional.get("pblh") is not None else None
                mslp_pa = _point_scalar(optional["mslp"], i) if optional.get("mslp") is not None else None
                rows.append({
                    "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "forecast_lead_hours": fxx,
                    "point": point,
                    "requested_latitude": POINTS[point][0],
                    "requested_longitude": POINTS[point][1],
                    "temperature2mC": t_k - 273.15,
                    "dewpoint2mC": td_k - 273.15,
                    "dewpointDepressionC": t_k - td_k,
                    "u10Mps": u,
                    "v10Mps": v,
                    "wind10SpeedMph": speed,
                    "wind10DirectionDeg": direction,
                    "pblHeightM": pblh,
                    "mslpHpa": None if mslp_pa is None else mslp_pa / 100.0,
                })
        except Exception as exc:
            failures.append({
                "run": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                "error": repr(exc),
            })
    return rows, failures, optional_failures


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", default="2024-04-01")
    p.add_argument("--end", default="2024-04-01")
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", default="research/si4-channel-eddy-herbie-smoke.json")
    p.add_argument("--save-dir", default=None)
    args = p.parse_args()
    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")
    if start.year != 2024 or end.year != 2024:
        raise SystemExit("channel_eddy_marine_reentry_v1 development extractor is locked to 2024")
    if args.fxx != 24:
        raise SystemExit("this research gate is frozen to F24")
    # F24 from Dec 31 verifies in 2025 and is outside the frozen 2024 development boundary.
    if end > dt.date(2024, 12, 30):
        raise SystemExit("initialization end must be <= 2024-12-30 so valid time stays in 2024")

    with tempfile.TemporaryDirectory(prefix="si4-channel-eddy-") as tmp:
        rows, failures, optional_failures = extract(start, end, args.fxx, Path(args.save_dir or tmp))

    payload = {
        "status": "RESEARCH_ONLY_2024_DEVELOPMENT",
        "candidate_family": "channel_eddy_marine_reentry_v1",
        "source": "NOAA HRRR archived surface GRIB2 subsets via Herbie indexed range requests",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
        "required_searches": REQUIRED_SEARCHES,
        "optional_searches": OPTIONAL_SEARCHES,
        "points": POINTS,
        "rules": {
            "holdout_2025_loaded": False,
            "future_observations_label_only": True,
            "fire_association_outcome_only": True,
            "production_change_authorized": False,
            "predeclared_hypothesis": True,
            "missing_values_stay_null": True,
        },
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures[:100],
        "optional_failure_count": len(optional_failures),
        "optional_failures": optional_failures[:100],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"rows": len(rows), "failures": len(failures),
                      "optional_failures": len(optional_failures), "out": str(out)}, indent=2))
    expected = ((end - start).days + 1) * len(RUN_HOURS) * len(POINTS)
    if failures or len(rows) != expected:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
