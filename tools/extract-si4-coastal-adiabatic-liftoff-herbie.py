#!/usr/bin/env python3
"""Research-only fixed-F24 HRRR extractor for coastal_adiabatic_liftoff_v1.

Locked to 2024 development. Reads issuance-time HRRR forecast fields only; it never
reads verifying observations, event labels, fire outcomes, or the frozen holdout.
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
LEVELS = (925, 900, 875, 850)
POINTS = {
    "Goleta": (34.44, -119.90),
    "Mission Canyon": (34.48, -119.71),
    "Montecito": (34.45, -119.63),
    "Carpinteria": (34.42, -119.52),
}
PRS_SEARCH = r":(?:UGRD|VGRD|TMP|HGT|VVEL):(?:925|900|875|850) mb:"
SFC_REQUIRED = {
    "t2m": r":TMP:2 m above ground:",
    "td2m": r":DPT:2 m above ground:",
    "u10": r":UGRD:10 m above ground:",
    "v10": r":VGRD:10 m above ground:",
}
SFC_OPTIONAL = {
    "pblh": r":HPBL:surface:",
    "surface_pressure": r":PRES:surface:",
    "terrain_height": r":HGT:surface:",
}


def iter_runs(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        for hour in RUN_HOURS:
            yield dt.datetime(day.year, day.month, day.day, hour)
        day += dt.timedelta(days=1)


def _pick(h: Herbie, search: str, points: pd.DataFrame):
    ds = h.xarray(search, remove_grib=True, verbose=False)
    if isinstance(ds, list):
        import xarray as xr
        ds = xr.merge(ds, compat="override", join="exact")
    return ds.herbie.pick_points(points, method="nearest")


def _var_map(ds):
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
        elif short in ("w", "vvel", "verticalvelocity") or "vertical velocity" in short:
            out["w"] = name
    for key, candidates in {
        "u": ("u",), "v": ("v",), "t": ("t", "temperature"),
        "gh": ("gh", "z", "geopotential_height"), "w": ("w", "omega"),
    }.items():
        if key not in out:
            for c in candidates:
                if c in ds.data_vars:
                    out[key] = c
                    break
    return out


def _scalar(da, point_index: int, level_index=None):
    x = da
    for dim in tuple(x.dims):
        if dim in ("isobaricInhPa", "pressure", "level") and level_index is not None:
            x = x.isel({dim: level_index})
        elif dim == "point":
            x = x.isel(point=point_index)
        elif x.sizes.get(dim, 1) == 1:
            x = x.isel({dim: 0})
    value = np.asarray(x.values).squeeze()
    if np.size(value) != 1 or not np.isfinite(value):
        return None
    return float(value)


def _single_var(ds):
    names = list(ds.data_vars)
    if len(names) == 1:
        return names[0]
    candidates = [n for n in names if ds[n].attrs.get("GRIB_shortName")]
    if len(candidates) == 1:
        return candidates[0]
    raise RuntimeError(f"expected one surface variable, got {names}")


def _surface_scalar(ds, point_index):
    return _scalar(ds[_single_var(ds)], point_index)


def _cross_barrier(u, v, normal_deg=180.0):
    # Positive is flow toward the south across the east-west Santa Ynez barrier.
    theta = math.radians(normal_deg)
    return u * math.sin(theta) + v * math.cos(theta)


def _pressure_profile(ds, point_index):
    dim = next((d for d in ("isobaricInhPa", "pressure", "level") if d in ds.coords), None)
    if not dim:
        raise RuntimeError(f"pressure coordinate missing; coords={list(ds.coords)}")
    available = [float(v) for v in np.asarray(ds.coords[dim].values).tolist()]
    vm = _var_map(ds)
    missing = [k for k in ("u", "v", "t", "gh") if k not in vm]
    if missing:
        raise RuntimeError(f"missing pressure variables {missing}; data_vars={list(ds.data_vars)}")
    profile = []
    for p in LEVELS:
        li = min(range(len(available)), key=lambda i: abs(available[i] - p))
        if abs(available[li] - p) > 0.5:
            raise RuntimeError(f"pressure {p} mb missing; available={available}")
        u = _scalar(ds[vm["u"]], point_index, li)
        v = _scalar(ds[vm["v"]], point_index, li)
        t = _scalar(ds[vm["t"]], point_index, li)
        h = _scalar(ds[vm["gh"]], point_index, li)
        w = _scalar(ds[vm["w"]], point_index, li) if "w" in vm else None
        if None in (u, v, t, h):
            raise RuntimeError(f"non-finite required pressure field at {p} mb")
        profile.append({
            "pressureHpa": p,
            "heightM": h,
            "temperatureC": t - 273.15,
            "potentialTemperatureK": t * (1000.0 / p) ** 0.2854,
            "uMps": u,
            "vMps": v,
            "crossBarrierMps": _cross_barrier(u, v),
            "omegaPaS": w,
        })
    return profile


def extract(start: dt.date, end: dt.date, fxx: int, save_dir: Path):
    points = pd.DataFrame({
        "latitude": [POINTS[k][0] for k in POINTS],
        "longitude": [POINTS[k][1] for k in POINTS],
        "stid": list(POINTS),
    })
    rows, failures, optional_failures = [], [], []
    for run in iter_runs(start, end):
        valid = run.replace(tzinfo=dt.timezone.utc) + dt.timedelta(hours=fxx)
        try:
            hp = Herbie(run, model="hrrr", product="prs", fxx=fxx,
                        priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
            hs = Herbie(run, model="hrrr", product="sfc", fxx=fxx,
                        priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
            prs = _pick(hp, PRS_SEARCH, points)
            sreq = {k: _pick(hs, q, points) for k, q in SFC_REQUIRED.items()}
            sopt = {}
            for key, query in SFC_OPTIONAL.items():
                try:
                    sopt[key] = _pick(hs, query, points)
                except Exception as exc:
                    sopt[key] = None
                    optional_failures.append({
                        "run": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                        "field": key, "error": repr(exc),
                    })
            for i, name in enumerate(POINTS):
                t2 = _surface_scalar(sreq["t2m"], i)
                td2 = _surface_scalar(sreq["td2m"], i)
                u10 = _surface_scalar(sreq["u10"], i)
                v10 = _surface_scalar(sreq["v10"], i)
                if None in (t2, td2, u10, v10):
                    raise RuntimeError(f"non-finite required surface field at {name}")
                rows.append({
                    "run_time": run.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
                    "valid_time": valid.isoformat().replace("+00:00", "Z"),
                    "forecast_lead_hours": fxx,
                    "zone": name,
                    "requested_latitude": POINTS[name][0],
                    "requested_longitude": POINTS[name][1],
                    "temperature2mC": t2 - 273.15,
                    "dewpoint2mC": td2 - 273.15,
                    "u10Mps": u10,
                    "v10Mps": v10,
                    "crossBarrier10Mps": _cross_barrier(u10, v10),
                    "pblHeightM": _surface_scalar(sopt["pblh"], i) if sopt.get("pblh") is not None else None,
                    "surfacePressurePa": _surface_scalar(sopt["surface_pressure"], i) if sopt.get("surface_pressure") is not None else None,
                    "terrainHeightM": _surface_scalar(sopt["terrain_height"], i) if sopt.get("terrain_height") is not None else None,
                    "profile": _pressure_profile(prs, i),
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
    p.add_argument("--out", default="research/si4-coastal-adiabatic-liftoff-smoke.json")
    p.add_argument("--save-dir", default=None)
    args = p.parse_args()
    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("end before start")
    if start.year != 2024 or end.year != 2024:
        raise SystemExit("coastal_adiabatic_liftoff_v1 extractor is locked to 2024 development")
    if args.fxx != 24:
        raise SystemExit("coastal_adiabatic_liftoff_v1 is frozen to exact F24")
    if end > dt.date(2024, 12, 30):
        raise SystemExit("initialization end must be <= 2024-12-30 so valid time remains in development year")
    with tempfile.TemporaryDirectory(prefix="si4-coastal-liftoff-") as tmp:
        rows, failures, optional_failures = extract(start, end, args.fxx, Path(args.save_dir or tmp))
    payload = {
        "status": "RESEARCH_ONLY_2024_DEVELOPMENT",
        "candidate_family": "coastal_adiabatic_liftoff_v1",
        "source": "NOAA HRRR archived pressure/surface GRIB2 subsets via Herbie indexed range requests",
        "forecast_lead_hours": args.fxx,
        "start": args.start,
        "end": args.end,
        "pressure_search": PRS_SEARCH,
        "surface_required_searches": SFC_REQUIRED,
        "surface_optional_searches": SFC_OPTIONAL,
        "points": POINTS,
        "rules": {
            "holdout_2025_loaded": False,
            "future_observations_label_only": True,
            "fire_association_outcome_only": True,
            "production_change_authorized": False,
            "predeclared_hypothesis": True,
            "missing_values_stay_null": True,
            "exact_f24": True,
        },
        "rows": rows,
        "row_count": len(rows),
        "failure_count": len(failures),
        "failures": failures[:100],
        "optional_failure_count": len(optional_failures),
        "optional_failures": optional_failures[:100],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"rows": len(rows), "failures": len(failures), "optional_failures": len(optional_failures), "out": str(out)}, indent=2))
    expected = ((end - start).days + 1) * len(RUN_HOURS) * len(POINTS)
    if failures or len(rows) != expected:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
