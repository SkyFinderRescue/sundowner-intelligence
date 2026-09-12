#!/usr/bin/env python3
"""Extract leakage-safe HRRR F24 pressure profiles using Herbie indexed GRIB subsetting.

Herbie reads NOAA's wgrib2 index and downloads only the requested GRIB messages from
NOAA Open Data. This avoids full-CONUS pressure-file downloads while preserving the
actual archived forecast run and lead time.
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

LEVELS = (925, 850, 700, 600, 500)
RUN_HOURS = (0, 6, 12, 18)
POINTS = {
    "Gaviota": (34.48, -120.23),
    "Refugio": (34.49, -120.07),
    "Goleta": (34.44, -119.90),
    "San Marcos Pass": (34.51, -119.80),
    "Mission Canyon": (34.48, -119.71),
    "Montecito": (34.45, -119.63),
    "Toro Canyon": (34.43, -119.56),
    "Carpinteria": (34.42, -119.52),
}
SEARCH = ":(?:UGRD|VGRD|TMP|HGT|RH):(?:925|850|700|600|500) mb:"


def iter_runs(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        for hour in RUN_HOURS:
            yield dt.datetime(day.year, day.month, day.day, hour)
        day += dt.timedelta(days=1)


def short_name_map(ds):
    out = {}
    for name, da in ds.data_vars.items():
        short = str(da.attrs.get("GRIB_shortName") or da.attrs.get("GRIB_name") or name).lower()
        if short in ("u", "ugrd") or "u component" in short:
            out["u"] = name
        elif short in ("v", "vgrd") or "v component" in short:
            out["v"] = name
        elif short in ("t", "tmp", "temperature"):
            out["t"] = name
        elif short in ("gh", "hgt", "geopotentialheight") or "geopotential height" in short:
            out["gh"] = name
        elif short in ("r", "rh", "relativehumidity") or "relative humidity" in short:
            out["r"] = name
    # cfgrib conventional short names if GRIB attributes were simplified.
    for key, candidates in {
        "u": ("u", "u_component_of_wind"),
        "v": ("v", "v_component_of_wind"),
        "t": ("t", "temperature"),
        "gh": ("gh", "z", "geopotential_height"),
        "r": ("r", "relative_humidity"),
    }.items():
        if key not in out:
            for candidate in candidates:
                if candidate in ds.data_vars:
                    out[key] = candidate
                    break
    return out


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
    if u is None or v is None:
        return None, None
    speed_mps = math.hypot(u, v)
    direction = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    return speed_mps * 2.2369362921, direction


def profile_from_point(ds, point_index):
    dim = next((d for d in ("isobaricInhPa", "pressure", "level") if d in ds.coords), None)
    if not dim:
        raise RuntimeError(f"pressure coordinate missing; coords={list(ds.coords)}")
    available = [float(v) for v in np.asarray(ds.coords[dim].values).tolist()]
    vars_ = short_name_map(ds)
    missing = [k for k in ("u", "v", "t", "gh", "r") if k not in vars_]
    if missing:
        raise RuntimeError(f"missing expected variables {missing}; data_vars={list(ds.data_vars)} attrs={vars_}")

    profile = []
    for pressure in LEVELS:
        try:
            li = min(range(len(available)), key=lambda i: abs(available[i] - pressure))
        except ValueError as exc:
            raise RuntimeError("no pressure levels in subset") from exc
        if abs(available[li] - pressure) > 0.5:
            raise RuntimeError(f"pressure {pressure} mb missing; available={available}")
        u = scalar(ds[vars_["u"]], li, point_index)
        v = scalar(ds[vars_["v"]], li, point_index)
        temp_k = scalar(ds[vars_["t"]], li, point_index)
        height_m = scalar(ds[vars_["gh"]], li, point_index)
        rh = scalar(ds[vars_["r"]], li, point_index)
        speed_mph, direction = wind(u, v)
        if None in (u, v, temp_k, height_m, speed_mph, direction):
            raise RuntimeError(f"non-finite required field at {pressure} mb")
        profile.append({
            "pressureHpa": pressure,
            "heightM": height_m,
            "temperatureC": temp_k - 273.15,
            "relativeHumidityPct": rh,
            "uMps": u,
            "vMps": v,
            "windSpeedMph": speed_mph,
            "windDirectionDeg": direction,
        })
    return profile


def extract(start: dt.date, end: dt.date, fxx: int, save_dir: Path):
    rows, failures = [], []
    points = pd.DataFrame({
        "latitude": [POINTS[k][0] for k in POINTS],
        "longitude": [POINTS[k][1] for k in POINTS],
        "stid": list(POINTS),
    })

    for run in iter_runs(start, end):
        valid = run.replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=fxx)
        try:
            h = Herbie(run, model="hrrr", product="prs", fxx=fxx, priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
            ds = h.xarray(SEARCH, remove_grib=True, verbose=False)
            if isinstance(ds, list):
                # The selected fields should form one compatible pressure-level hypercube.
                # Merge is safe only when the coordinate systems are identical.
                import xarray as xr
                ds = xr.merge(ds, compat="override", join="exact")
            picked = ds.herbie.pick_points(points, method="nearest")
            for point_index, zone in enumerate(POINTS):
                rows.append({
                    "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "forecast_lead_hours": fxx,
                    "zone": zone,
                    "profile": profile_from_point(picked, point_index),
                })
        except Exception as exc:
            failures.append({"run": run.replace(tzinfo=dt.timezone.utc).isoformat(), "error": repr(exc)})
    return rows, failures


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", default="2024-04-01")
    p.add_argument("--end", default="2024-04-01")
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", default="research/hrrr-upper-herbie-smoke.json")
    p.add_argument("--save-dir", default=None)
    args = p.parse_args()
    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")
    with tempfile.TemporaryDirectory(prefix="si4-herbie-") as tmp:
        save_dir = Path(args.save_dir or tmp)
        rows, failures = extract(start, end, args.fxx, save_dir)
    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "source": "NOAA HRRR archived pressure GRIB2 subset by Herbie index/range requests",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
        "search": SEARCH,
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures[:100],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"rows": len(rows), "failure_count": len(failures), "out": str(out)}, indent=2))
    if not rows or failures:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
