#!/usr/bin/env python3
"""Targeted issuance-safe HRRR multi-cycle profile extraction for 2024 SI-4 development cases.

Consumes a development-only case manifest containing valid_time + zone and retrieves
only the archived pressure-profile runs needed to compare multiple forecast cycles for
the same valid time. No observations or 2025 data are read by this extractor.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import math
import tempfile
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from herbie import Herbie

LEVELS = (925, 850, 700, 600, 500)
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


def parse_utc(s: str) -> dt.datetime:
    s = s.strip()
    if len(s) == 13:
        s += ":00:00Z"
    elif len(s) == 16:
        s += ":00Z"
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    x = dt.datetime.fromisoformat(s)
    if x.tzinfo is None:
        x = x.replace(tzinfo=dt.timezone.utc)
    return x.astimezone(dt.timezone.utc)


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
        raise RuntimeError(f"missing expected variables {missing}; data_vars={list(ds.data_vars)}")
    profile = []
    for pressure in LEVELS:
        li = min(range(len(available)), key=lambda i: abs(available[i] - pressure))
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


def load_targets(manifest_path: Path, leads):
    x = json.loads(manifest_path.read_text())
    if x.get("status") != "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION":
        raise SystemExit("manifest research-only guard missing")
    rules = x.get("rules") or {}
    if int(rules.get("development_year", 0)) != 2024 or rules.get("holdout_2025_loaded") is not False:
        raise SystemExit("target manifest must be 2024 development-only with 2025 unloaded")
    cases = []
    for group in ("events", "hard_negatives"):
        for r in (x.get("selected") or {}).get(group, []):
            vt = parse_utc(str(r["valid_time"]))
            if vt.year != 2024:
                raise SystemExit(f"non-2024 target leaked into manifest: {vt.isoformat()}")
            zone = str(r["zone"])
            if zone not in POINTS:
                raise SystemExit(f"unknown zone {zone}")
            cases.append({"case_kind": r.get("kind") or group, "zone": zone, "valid_time": vt})
    groups = defaultdict(set)
    for c in cases:
        for lead in leads:
            run = c["valid_time"] - dt.timedelta(hours=lead)
            # HRRR archive runs are hourly, but this design deliberately compares 6-hour-spaced
            # cycles around F24: F18/F24/F30/F36 for the same valid time.
            groups[(run, lead)].add(c["zone"])
    return x, cases, groups


def one_group(item, save_root: str):
    (run, lead), zones = item
    zones = sorted(zones)
    points = pd.DataFrame({
        "latitude": [POINTS[z][0] for z in zones],
        "longitude": [POINTS[z][1] for z in zones],
        "stid": zones,
    })
    save_dir = Path(save_root) / f"f{lead:02d}" / run.strftime("%Y%m%d%H")
    save_dir.mkdir(parents=True, exist_ok=True)
    h = Herbie(run.replace(tzinfo=None), model="hrrr", product="prs", fxx=lead,
               priority=["aws", "google", "azure"], save_dir=save_dir, verbose=False)
    ds = h.xarray(SEARCH, remove_grib=True, verbose=False)
    if isinstance(ds, list):
        import xarray as xr
        ds = xr.merge(ds, compat="override", join="exact")
    picked = ds.herbie.pick_points(points, method="nearest")
    valid = run + dt.timedelta(hours=lead)
    rows = []
    for i, zone in enumerate(zones):
        rows.append({
            "run_time": run.isoformat().replace("+00:00", "Z"),
            "valid_time": valid.isoformat().replace("+00:00", "Z"),
            "forecast_lead_hours": lead,
            "zone": zone,
            "profile": profile_from_point(picked, i),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out", default="research/hrrr-cycle-2024-targets.json")
    ap.add_argument("--leads", default="18,24,30,36")
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()
    leads = tuple(int(x) for x in args.leads.split(",") if x.strip())
    if leads != (18, 24, 30, 36):
        raise SystemExit("predeclared cycle design requires exact leads 18,24,30,36")
    manifest, cases, groups = load_targets(Path(args.manifest), leads)
    rows, failures = [], []
    with tempfile.TemporaryDirectory(prefix="si4-cycle-targets-") as tmp:
        with cf.ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
            futs = {ex.submit(one_group, item, tmp): item for item in groups.items()}
            for fut in cf.as_completed(futs):
                (run, lead), zones = futs[fut]
                try:
                    rows.extend(fut.result())
                except Exception as exc:
                    failures.append({
                        "run_time": run.isoformat().replace("+00:00", "Z"),
                        "forecast_lead_hours": lead,
                        "zones": sorted(zones),
                        "error": repr(exc),
                    })
    rows.sort(key=lambda r: (r["valid_time"], r["zone"], r["forecast_lead_hours"]))
    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "generated": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "purpose": "Targeted 2024-only HRRR cycle-consistency development extraction; no 2025 data or observations are loaded here.",
        "source": "NOAA HRRR archived pressure GRIB2 subset by Herbie index/range requests",
        "rules": {
            "development_year": 2024,
            "holdout_2025_loaded": False,
            "future_observations_used": False,
            "fire_outcome_used": False,
            "leads_hours": list(leads),
            "production_change_authorized": False,
        },
        "manifest_generated": manifest.get("generated"),
        "target_case_count": len(cases),
        "request_group_count": len(groups),
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"cases": len(cases), "groups": len(groups), "rows": len(rows), "failures": len(failures)}, indent=2))
    if failures:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
