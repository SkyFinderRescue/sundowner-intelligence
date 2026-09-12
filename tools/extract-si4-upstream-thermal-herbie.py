#!/usr/bin/env python3
"""Research-only fixed-F24 HRRR extractor for SI-4 upstream thermal/subsidence testing.

This is deliberately separate from the frozen all-season SI-4 pressure-profile cache.
It extracts only forecast fields available at issuance time and does not read event
labels, observations, fire outcomes, or the 2025 holdout.
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

LEVELS = (850, 700, 500)
RUN_HOURS = (0, 6, 12, 18)
# Frozen before candidate scoring. These are physical reference points, not selected
# from event outcomes.
POINTS = {
    "santa_ynez_valley": (34.665, -120.015),
    "cuyama_interior": (34.950, -119.680),
    "bakersfield_synoptic": (35.434, -119.057),
    "santa_barbara_lee": (34.426, -119.840),
    "western_channel": (34.350, -120.400),
}
SEARCH = ":(?:HGT|TMP|VVEL|UGRD|VGRD):(?:850|700|500) mb:"


def iter_runs(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        for hour in RUN_HOURS:
            yield dt.datetime(day.year, day.month, day.day, hour)
        day += dt.timedelta(days=1)


def var_map(ds):
    out = {}
    for name, da in ds.data_vars.items():
        short = str(da.attrs.get("GRIB_shortName") or name).lower().replace("_", "")
        long = str(da.attrs.get("GRIB_name") or da.attrs.get("long_name") or "").lower()
        if short in ("u", "ugrd") or "u component" in long:
            out["u"] = name
        elif short in ("v", "vgrd") or "v component" in long:
            out["v"] = name
        elif short in ("t", "tmp", "temperature") or long == "temperature":
            out["t"] = name
        elif short in ("gh", "hgt", "z", "geopotentialheight") or "geopotential height" in long:
            out["gh"] = name
        elif short in ("w", "vvel", "verticalvelocitypressure") or "vertical velocity" in long:
            out["vvel"] = name
    return out


def pressure_dim(ds):
    return next((d for d in ("isobaricInhPa", "pressure", "level") if d in ds.coords), None)


def scalar(da, level_index, point_index):
    x = da
    for dim in tuple(x.dims):
        if dim in ("isobaricInhPa", "pressure", "level"):
            x = x.isel({dim: level_index})
        elif dim == "point":
            x = x.isel(point=point_index)
        elif x.sizes.get(dim, 1) == 1:
            x = x.isel({dim: 0})
    value = np.asarray(x.values).squeeze()
    if np.size(value) != 1 or not np.isfinite(value):
        return None
    return float(value)


def wind(u, v):
    speed = math.hypot(u, v)
    direction = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    return speed * 2.2369362921, direction


def point_profile(ds, point_index):
    pdim = pressure_dim(ds)
    if not pdim:
        raise RuntimeError(f"pressure coordinate missing; coords={list(ds.coords)}")
    available = [float(x) for x in np.asarray(ds.coords[pdim].values).tolist()]
    vm = var_map(ds)
    missing = [k for k in ("u", "v", "t", "gh", "vvel") if k not in vm]
    if missing:
        raise RuntimeError(f"missing variables {missing}; mapped={vm}; data_vars={list(ds.data_vars)}")
    out = []
    for pressure in LEVELS:
        li = min(range(len(available)), key=lambda i: abs(available[i] - pressure))
        if abs(available[li] - pressure) > 0.5:
            raise RuntimeError(f"pressure level {pressure} missing; available={available}")
        u = scalar(ds[vm["u"]], li, point_index)
        v = scalar(ds[vm["v"]], li, point_index)
        t = scalar(ds[vm["t"]], li, point_index)
        gh = scalar(ds[vm["gh"]], li, point_index)
        vv = scalar(ds[vm["vvel"]], li, point_index)
        if None in (u, v, t, gh, vv):
            raise RuntimeError(f"non-finite field at {pressure} mb")
        speed, direction = wind(u, v)
        out.append({
            "pressureHpa": pressure,
            "temperatureC": t - 273.15,
            "heightM": gh,
            "uMps": u,
            "vMps": v,
            "windSpeedMph": speed,
            "windDirectionDeg": direction,
            "vvelPaS": vv,
        })
    return out


def extract(start: dt.date, end: dt.date, fxx: int, save_dir: Path):
    rows, failures = [], []
    points_df = pd.DataFrame({
        "latitude": [POINTS[k][0] for k in POINTS],
        "longitude": [POINTS[k][1] for k in POINTS],
        "stid": list(POINTS),
    })
    for run in iter_runs(start, end):
        valid = run.replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=fxx)
        try:
            h = Herbie(
                run, model="hrrr", product="prs", fxx=fxx,
                priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False,
            )
            ds = h.xarray(SEARCH, remove_grib=True, verbose=False)
            if isinstance(ds, list):
                import xarray as xr
                ds = xr.merge(ds, compat="override", join="exact")
            picked = ds.herbie.pick_points(points_df, method="nearest")
            for point_index, point in enumerate(POINTS):
                rows.append({
                    "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "forecast_lead_hours": fxx,
                    "point": point,
                    "latitude": POINTS[point][0],
                    "longitude": POINTS[point][1],
                    "profile": point_profile(picked, point_index),
                })
        except Exception as exc:
            failures.append({
                "run": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                "error": repr(exc),
            })
    return rows, failures


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", default="2024-04-01")
    p.add_argument("--end", default="2024-04-01")
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", default="research/si4-upstream-thermal-herbie-smoke.json")
    p.add_argument("--save-dir", default=None)
    args = p.parse_args()
    start = dt.date.fromisoformat(args.start)
    end = dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")
    if args.fxx != 24:
        raise SystemExit("this research gate is frozen to F24")
    with tempfile.TemporaryDirectory(prefix="si4-upstream-thermal-") as tmp:
        rows, failures = extract(start, end, args.fxx, Path(args.save_dir or tmp))
    payload = {
        "status": "RESEARCH_ONLY_2024_DEVELOPMENT",
        "candidate_family": "upstream_thermal_subsidence_v1",
        "source": "NOAA HRRR archived pressure GRIB2 subset via Herbie indexed range requests",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
        "search": SEARCH,
        "points": POINTS,
        "rules": {
            "holdout_2025_loaded": False,
            "future_observations_label_only": True,
            "fire_association_outcome_only": True,
            "production_change_authorized": False,
            "predeclared_hypothesis": True,
        },
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures[:100],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"rows": len(rows), "failures": len(failures), "out": str(out)}, indent=2))
    expected = ((end - start).days + 1) * len(RUN_HOURS) * len(POINTS)
    if failures or len(rows) != expected:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
