#!/usr/bin/env python3
"""Range-extract frozen SI-4 NBM F24 surface-distribution fields.

Research-only 2024 plumbing for nbm_probabilistic_surface_ensemble_v1.
No observations, labels, outcomes, 2025 data, fitting, thresholds, or production
changes are used here.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import cfgrib
import numpy as np

BASE = "https://noaa-nbm-grib2-pds.s3.amazonaws.com"
FXX = 24
POINTS = {
    "santa_ynez_valley": (34.665, -120.015),
    "cuyama_interior": (34.950, -119.680),
    "bakersfield_synoptic": (35.434, -119.057),
    "santa_barbara_lee": (34.426, -119.840),
    "western_channel": (34.350, -120.400),
}
USER_AGENT = "Sundowner-Intelligence-SI4-NBM-Range/1.0"

FIELDS = {
    "core": {
        "wdir10": "WDIR:10 m above ground:24 hour fcst:",
        "gust_det": "GUST:10 m above ground:24 hour fcst:",
        "gust_std": "GUST:10 m above ground:24 hour fcst:ens std dev",
        "wind_det": "WIND:10 m above ground:24 hour fcst:",
        "wind_std": "WIND:10 m above ground:24 hour fcst:ens std dev",
    },
    "qmd": {
        "gust_p10": "GUST:10 m above ground:24 hour fcst:10% level",
        "gust_p25": "GUST:10 m above ground:24 hour fcst:25% level",
        "gust_p50": "GUST:10 m above ground:24 hour fcst:50% level",
        "gust_p75": "GUST:10 m above ground:24 hour fcst:75% level",
        "gust_p90": "GUST:10 m above ground:24 hour fcst:90% level",
        "gust_mean": "GUST:10 m above ground:24 hour fcst:ens mean",
        "gust_std_qmd": "GUST:10 m above ground:24 hour fcst:ens std dev",
        "gust_prob_gt17": "GUST:10 m above ground:24 hour fcst:prob >17:prob fcst 255/255",
        "gust_prob_gt21": "GUST:10 m above ground:24 hour fcst:prob >21:prob fcst 255/255",
        "gust_prob_gt24": "GUST:10 m above ground:24 hour fcst:prob >24:prob fcst 255/255",
        "gust_prob_gt28": "GUST:10 m above ground:24 hour fcst:prob >28:prob fcst 255/255",
        "gust_prob_gt32": "GUST:10 m above ground:24 hour fcst:prob >32:prob fcst 255/255",
        "wind_p10": "WIND:10 m above ground:24 hour fcst:10% level",
        "wind_p25": "WIND:10 m above ground:24 hour fcst:25% level",
        "wind_p50": "WIND:10 m above ground:24 hour fcst:50% level",
        "wind_p75": "WIND:10 m above ground:24 hour fcst:75% level",
        "wind_p90": "WIND:10 m above ground:24 hour fcst:90% level",
        "wind_mean": "WIND:10 m above ground:24 hour fcst:ens mean",
        "wind_std_qmd": "WIND:10 m above ground:24 hour fcst:ens std dev",
        "wind_prob_gt8": "WIND:10 m above ground:24 hour fcst:prob >8:prob fcst 255/255",
        "wind_prob_gt11": "WIND:10 m above ground:24 hour fcst:prob >11:prob fcst 255/255",
        "wind_prob_gt15": "WIND:10 m above ground:24 hour fcst:prob >15:prob fcst 255/255",
        "wind_prob_gt17": "WIND:10 m above ground:24 hour fcst:prob >17:prob fcst 255/255",
    },
}


def key_for(date: str, cycle: str, suite: str) -> str:
    return f"blend.{date}/{cycle}/{suite}/blend.t{cycle}z.{suite}.f024.co.grib2"


def request(url: str, *, method: str = "GET", headers: dict | None = None, attempts: int = 4, timeout: int = 35):
    hdr = {"User-Agent": USER_AGENT, **(headers or {})}
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, method=method, headers=hdr)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = b"" if method == "HEAD" else resp.read()
                return {"ok": True, "status": int(getattr(resp, "status", 200)), "headers": {k.lower(): v for k, v in resp.headers.items()}, "body": body}
        except urllib.error.HTTPError as exc:
            last = {"ok": False, "status": int(exc.code), "error": str(exc)}
            if exc.code < 500 or exc.code >= 600:
                return last
        except Exception as exc:
            last = {"ok": False, "status": 0, "error": repr(exc)}
        if attempt + 1 < attempts:
            time.sleep(0.75 * (2 ** attempt))
    return last or {"ok": False, "status": 0, "error": "unknown request failure"}


def parse_idx(text: str, content_length: int):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        parts = line.split(":", 2)
        if len(parts) < 3:
            continue
        try:
            msg, start = int(parts[0]), int(parts[1])
        except ValueError:
            continue
        rows.append({"message": msg, "start": start, "descriptor": parts[2], "line": line})
    rows.sort(key=lambda x: x["start"])
    for i, row in enumerate(rows):
        row["end"] = rows[i + 1]["start"] - 1 if i + 1 < len(rows) else content_length - 1
    return rows


def select_messages(index_rows, suite: str):
    out = []
    for name, token in FIELDS[suite].items():
        # Exact suffix matching is intentional: deterministic core rows are prefixes
        # of their ensemble-statistic neighbors, so substring matching is ambiguous.
        matches = [r for r in index_rows if r["descriptor"].startswith("d=") and r["descriptor"].endswith(token)]
        if len(matches) != 1:
            raise RuntimeError(f"expected exactly one {suite} message for {name} token={token!r}; found {len(matches)}")
        out.append({**matches[0], "field": name})
    return out


def range_fetch(url: str, start: int, end: int):
    r = request(url, headers={"Range": f"bytes={start}-{end}"})
    if not r["ok"]:
        raise RuntimeError(f"range request failed {start}-{end}: {r}")
    if r["status"] != 206:
        raise RuntimeError(f"range not honored {start}-{end}; status={r['status']}")
    expected = end - start + 1
    if len(r["body"]) != expected:
        raise RuntimeError(f"range length mismatch {start}-{end}: got={len(r['body'])} expected={expected}")
    return r["body"], r["headers"]


def lon_delta(a, b):
    return ((a - b + 180.0) % 360.0) - 180.0


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon_delta(lon2, lon1))
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def first_data_array(grib_path: Path):
    datasets = cfgrib.open_datasets(str(grib_path), backend_kwargs={"indexpath": ""})
    arrays = []
    for ds in datasets:
        arrays.extend(ds.data_vars.values())
    if len(arrays) != 1:
        raise RuntimeError(f"expected one data array in single-message GRIB; got {len(arrays)}")
    return arrays[0]


def sample_nearest(da, lat: float, lon: float):
    if "latitude" not in da.coords or "longitude" not in da.coords:
        raise RuntimeError(f"lat/lon missing; coords={list(da.coords)}")
    lats = np.asarray(da.coords["latitude"].values, dtype=float)
    lons = np.asarray(da.coords["longitude"].values, dtype=float)
    dl = ((lons - lon + 180.0) % 360.0) - 180.0
    metric = (lats - lat) ** 2 + (dl * math.cos(math.radians(lat))) ** 2
    flat = int(np.nanargmin(metric))
    ij = np.unravel_index(flat, metric.shape)
    lat0, lon0 = float(lats[ij]), float(lons[ij])
    dims = da.coords["latitude"].dims
    indexers = {dim: int(pos) for dim, pos in zip(dims, ij)}
    value = np.asarray(da.isel(indexers).values).squeeze()
    val = None if np.size(value) != 1 or not np.isfinite(value) else float(value)
    return val, lat0, lon0, haversine_km(lat, lon, lat0, lon0)


def unit_hint(da):
    return str(da.attrs.get("GRIB_units") or da.attrs.get("units") or "")


def extract_suite(date: str, cycle: str, suite: str, temp_dir: Path):
    key = key_for(date, cycle, suite)
    url = f"{BASE}/{key}"
    head = request(url, method="HEAD")
    if not head["ok"]:
        raise RuntimeError(f"NBM HEAD failed {key}: {head}")
    length = int(head["headers"].get("content-length") or 0)
    if length <= 0:
        raise RuntimeError(f"NBM content length missing {key}")
    idx = request(url + ".idx")
    if not idx["ok"]:
        idx = request(url + ".grib2.idx")
    if not idx["ok"]:
        raise RuntimeError(f"NBM index failed {key}: {idx}")
    index_rows = parse_idx(idx["body"].decode("utf-8", errors="replace"), length)
    selected = select_messages(index_rows, suite)
    sampled = {zone: {} for zone in POINTS}
    provenance = []
    transferred = 0
    max_distance = 0.0
    for msg in sorted(selected, key=lambda x: x["start"]):
        body, headers = range_fetch(url, msg["start"], msg["end"])
        transferred += len(body)
        p = temp_dir / f"{suite}-{msg['message']}-{msg['field']}.grib2"
        p.write_bytes(body)
        da = first_data_array(p)
        for zone, (lat, lon) in POINTS.items():
            value, glat, glon, distance = sample_nearest(da, lat, lon)
            sampled[zone][msg["field"]] = {"value": value, "units": unit_hint(da), "grid_lat": glat, "grid_lon": glon, "grid_distance_km": distance}
            max_distance = max(max_distance, distance)
        provenance.append({"suite": suite, "field": msg["field"], "message": msg["message"], "descriptor": msg["descriptor"], "start_byte": msg["start"], "end_byte": msg["end"], "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "content_range": headers.get("content-range")})
    return {"key": key, "content_length": length, "transferred_bytes": transferred, "transfer_fraction": transferred / length, "max_grid_distance_km": max_distance, "sampled": sampled, "provenance": provenance}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="20240601")
    ap.add_argument("--cycle", default="00", choices=["00", "06", "12", "18"])
    ap.add_argument("--out", default="research/si4-nbm-f24-range-smoke.json")
    args = ap.parse_args()
    run = dt.datetime.strptime(args.date + args.cycle, "%Y%m%d%H").replace(tzinfo=dt.timezone.utc)
    valid = run + dt.timedelta(hours=FXX)
    if run.year != 2024 or valid.year != 2024:
        raise SystemExit("2024-only fail-closed rule violated")
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        core = extract_suite(args.date, args.cycle, "core", td)
        qmd = extract_suite(args.date, args.cycle, "qmd", td)
    rows = []
    for zone in POINTS:
        rows.append({"run_time": run.isoformat().replace("+00:00", "Z"), "valid_time": valid.isoformat().replace("+00:00", "Z"), "forecast_lead_hours": FXX, "zone": zone, "core": core["sampled"][zone], "qmd": qmd["sampled"][zone]})
    result = {"status": "RESEARCH_ONLY_2024_NBM_F24_RANGE_SMOKE", "candidate": "nbm_probabilistic_surface_ensemble_v1", "rules": {"development_year": 2024, "holdout_2025_loaded": False, "observations_loaded": False, "outcomes_loaded": False, "forecast_hour": 24, "production_change_authorized": False}, "source": {"provider": "NOAA National Blend of Models via NOAA Open Data AWS", "base": BASE}, "rows": rows, "objects": {"core": {k: v for k, v in core.items() if k != "sampled"}, "qmd": {k: v for k, v in qmd.items() if k != "sampled"}}}
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2))
    print(json.dumps({"rows": len(rows), "core_fraction": core["transfer_fraction"], "qmd_fraction": qmd["transfer_fraction"], "max_grid_distance_km": max(core["max_grid_distance_km"], qmd["max_grid_distance_km"])}, indent=2))


if __name__ == "__main__":
    main()
