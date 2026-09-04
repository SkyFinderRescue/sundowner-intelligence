#!/usr/bin/env python3
"""Extract leakage-safe F24 HRRR pressure-level point features from the public Zarr archive.

Reads only Santa Barbara grid points from the public HRRR Zarr pressure forecast archive.
Output is research-only and intended to feed SI-4 calibration/validation.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from pathlib import Path

import numpy as np
import pyproj
import s3fs
import zarr

BUCKET = "hrrrzarr"
LEVELS = (925, 850, 700, 600, 500)
VARS = ("UGRD", "VGRD", "TMP", "HGT", "RH")
RUN_HOURS = (0, 6, 12, 18)
FXX = 24

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

PROJ = pyproj.Proj(
    proj="lcc", lat_1=38.5, lat_2=38.5, lat_0=38.5, lon_0=-97.5,
    a=6371229, b=6371229, units="m"
)
X0 = -2697520.142522
Y0 = -1587306.152557
DX = DY = 3000.0
NX, NY = 1799, 1059


def grid_index(lat: float, lon: float) -> tuple[int, int]:
    x, y = PROJ(lon, lat)
    i = int(round((x - X0) / DX))
    j = int(round((y - Y0) / DY))
    if not (0 <= i < NX and 0 <= j < NY):
        raise ValueError(f"point outside HRRR grid: {lat},{lon} -> {i},{j}")
    return j, i


def array_root(run: dt.datetime, pressure: int, var: str) -> str:
    day = run.strftime("%Y%m%d")
    cycle = run.strftime("%H")
    return f"s3://{BUCKET}/prs/{day}/{day}_{cycle}z_fcst.zarr/{pressure}mb/{var}/{pressure}mb/{var}"


def open_array(fs: s3fs.S3FileSystem, run: dt.datetime, pressure: int, var: str):
    store = s3fs.S3Map(root=array_root(run, pressure, var), s3=fs, check=False)
    return zarr.open_array(store=store, mode="r")


def wind(u: float | None, v: float | None):
    if u is None or v is None:
        return None, None
    speed_mps = math.hypot(u, v)
    direction = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    return speed_mps * 2.2369362921, direction


def iter_runs(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        for hour in RUN_HOURS:
            yield dt.datetime(day.year, day.month, day.day, hour, tzinfo=dt.timezone.utc)
        day += dt.timedelta(days=1)


def clean(value):
    return None if np.ma.is_masked(value) or not np.isfinite(value) else float(value)


def extract(start: dt.date, end: dt.date, fxx: int):
    fs = s3fs.S3FileSystem(anon=True, default_fill_cache=False)
    indices = {name: grid_index(*latlon) for name, latlon in POINTS.items()}
    rows, failures = [], []

    for run in iter_runs(start, end):
        valid = run + dt.timedelta(hours=fxx)
        k = fxx - 1
        arrays = {}
        try:
            for pressure in LEVELS:
                for var in VARS:
                    arr = open_array(fs, run, pressure, var)
                    if arr.ndim != 3 or k >= arr.shape[0]:
                        raise RuntimeError(f"unexpected/short array {pressure}mb/{var}: shape={arr.shape}")
                    arrays[(pressure, var)] = arr
        except Exception as exc:
            failures.append({"run": run.isoformat(), "zone": "ALL", "pressure_hpa": None, "error": str(exc)})
            continue

        for zone, (j, i) in indices.items():
            profile = []
            failed = False
            for pressure in LEVELS:
                try:
                    u = clean(arrays[(pressure, "UGRD")][k, j, i])
                    v = clean(arrays[(pressure, "VGRD")][k, j, i])
                    tmp = clean(arrays[(pressure, "TMP")][k, j, i])
                    hgt = clean(arrays[(pressure, "HGT")][k, j, i])
                    rh = clean(arrays[(pressure, "RH")][k, j, i])
                except Exception as exc:
                    failures.append({"run": run.isoformat(), "zone": zone, "pressure_hpa": pressure, "error": str(exc)})
                    failed = True
                    break
                speed, direction = wind(u, v)
                profile.append({
                    "pressureHpa": pressure,
                    "heightM": hgt,
                    "temperatureC": None if tmp is None else tmp - 273.15,
                    "relativeHumidityPct": rh,
                    "uMps": u,
                    "vMps": v,
                    "windSpeedMph": speed,
                    "windDirectionDeg": direction,
                })
            if not failed:
                rows.append({
                    "run_time": run.isoformat().replace("+00:00", "Z"),
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "forecast_lead_hours": fxx,
                    "zone": zone,
                    "grid_j": j,
                    "grid_i": i,
                    "profile": profile,
                })
    return rows, failures


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", default="2024-04-01")
    p.add_argument("--end", default="2024-04-01")
    p.add_argument("--fxx", type=int, default=24)
    p.add_argument("--out", default="research/hrrr-upper-zarr-smoke.json")
    args = p.parse_args()
    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")
    rows, failures = extract(start, end, args.fxx)
    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "source": "HRRR Zarr public archive (hrrrzarr), pressure forecast",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
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
