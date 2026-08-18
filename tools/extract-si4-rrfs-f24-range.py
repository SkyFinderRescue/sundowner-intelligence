#!/usr/bin/env python3
"""Range-extract fixed-24h RRFS retrospective fields for SI-4 shadow evaluation.

Research-only plumbing. Reads NOAA's authoritative RRFS retrospective GRIB2 `.idx`
files, transfers only the exact required GRIB messages with HTTP byte-range requests,
and samples the same Santa Barbara zone points used by the SI-4 HRRR upper-air lane.
No 2025 outcomes, future observations, fire association, model fitting, or production
changes are used here.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import cfgrib
import numpy as np

BASE = "https://noaa-rrfs-pds.s3.amazonaws.com"
FXX = 24
CASES = (
    ("20240502", "12"),
    ("20240512", "12"),
)
LEVELS = (925, 850, 700, 600, 500)
FIELDS = ("UGRD", "VGRD", "TMP", "HGT", "RH")
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
USER_AGENT = "Sundowner-Intelligence-SI4-RRFS-Range/1.0"


def key_for(date: str, cycle: str) -> str:
    return f"retro_output_final/spring/rrfs.{date}/{cycle}/rrfs.t{cycle}z.prslev.f024.conus.grib2"


def request(url: str, *, method: str = "GET", headers: dict | None = None, attempts: int = 4, timeout: int = 30):
    hdr = {"User-Agent": USER_AGENT, **(headers or {})}
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, method=method, headers=hdr)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = b"" if method == "HEAD" else resp.read()
                return {
                    "ok": True,
                    "status": int(getattr(resp, "status", 200)),
                    "headers": {k.lower(): v for k, v in resp.headers.items()},
                    "body": body,
                }
        except urllib.error.HTTPError as exc:
            last = {"ok": False, "status": int(exc.code), "error": str(exc)}
            if exc.code < 500 or exc.code >= 600:
                return last
        except Exception as exc:  # bounded retry for transient transport failures only
            last = {"ok": False, "status": 0, "error": repr(exc)}
        if attempt + 1 < attempts:
            time.sleep(0.75 * (2 ** attempt))
    return last or {"ok": False, "status": 0, "error": "unknown request failure"}


def parse_idx(text: str, content_length: int):
    raw = [line for line in text.splitlines() if line.strip()]
    out = []
    for line in raw:
        parts = line.split(":", 2)
        if len(parts) < 3:
            continue
        try:
            msg = int(parts[0])
            start = int(parts[1])
        except ValueError:
            continue
        out.append({"message": msg, "start": start, "descriptor": parts[2], "line": line})
    out.sort(key=lambda x: x["start"])
    for i, row in enumerate(out):
        row["end"] = (out[i + 1]["start"] - 1) if i + 1 < len(out) else (content_length - 1)
    return out


def exact_tokens():
    tokens = []
    for level in LEVELS:
        for field in FIELDS:
            tokens.append(f"{field}:{level} mb:")
    tokens += ["GUST:surface:", "UGRD:10 m above ground:", "VGRD:10 m above ground:"]
    return tokens


def select_messages(index_rows):
    selected = []
    for token in exact_tokens():
        matches = [r for r in index_rows if token in r["descriptor"] and "24 hour fcst" in r["descriptor"]]
        if len(matches) != 1:
            raise RuntimeError(f"expected exactly one RRFS F24 index message for {token!r}; found {len(matches)}")
        selected.append({**matches[0], "token": token})
    return selected


def range_fetch(url: str, start: int, end: int):
    result = request(url, headers={"Range": f"bytes={start}-{end}"})
    if not result["ok"]:
        raise RuntimeError(f"range request failed {start}-{end}: {result}")
    if result["status"] != 206:
        raise RuntimeError(f"server did not honor byte range {start}-{end}; status={result['status']}")
    expected = end - start + 1
    body = result["body"]
    if len(body) != expected:
        raise RuntimeError(f"range length mismatch {start}-{end}: got={len(body)} expected={expected}")
    return body, result["headers"]


def short_name(da, fallback: str) -> str:
    return str(da.attrs.get("GRIB_shortName") or fallback).lower()


def normalize_short(name: str) -> str:
    n = name.lower()
    aliases = {
        "ugrd": "u", "vgrd": "v", "tmp": "t", "hgt": "gh", "rh": "r", "gust": "gust",
        "u10": "u", "v10": "v", "10u": "u", "10v": "v",
    }
    return aliases.get(n, n)


def all_arrays(datasets):
    arrays = []
    for ds in datasets:
        for name, da in ds.data_vars.items():
            arrays.append((normalize_short(short_name(da, name)), name, da))
    return arrays


def pressure_coord(da):
    for name in ("isobaricInhPa", "pressure", "level"):
        if name in da.coords:
            return name
    return None


def select_pressure(arrays, wanted_short: str, level: int):
    target = normalize_short(wanted_short)
    for short, name, da in arrays:
        if short != target:
            continue
        coord = pressure_coord(da)
        if coord is None:
            continue
        vals = np.asarray(da.coords[coord].values, dtype=float).reshape(-1)
        if vals.size == 0:
            continue
        idx = int(np.argmin(np.abs(vals - level)))
        if abs(float(vals[idx]) - level) > 0.5:
            continue
        if coord in da.dims:
            return da.isel({coord: idx})
        return da
    raise RuntimeError(f"decoded pressure field missing: {wanted_short} {level} mb")


def select_surface(arrays, wanted: str, height_m: int | None = None):
    target = normalize_short(wanted)
    for short, name, da in arrays:
        if short != target:
            continue
        if pressure_coord(da) is not None:
            continue
        if height_m is not None:
            hcoord = next((c for c in ("heightAboveGround", "height") if c in da.coords), None)
            if hcoord is not None:
                vals = np.asarray(da.coords[hcoord].values, dtype=float).reshape(-1)
                idx = int(np.argmin(np.abs(vals - height_m)))
                if abs(float(vals[idx]) - height_m) > 0.5:
                    continue
                if hcoord in da.dims:
                    return da.isel({hcoord: idx})
        return da
    raise RuntimeError(f"decoded surface field missing: {wanted} height={height_m}")


def lon_delta(a, b):
    return ((a - b + 180.0) % 360.0) - 180.0


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon_delta(lon2, lon1))
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def sample_nearest(da, lat: float, lon: float):
    if "latitude" not in da.coords or "longitude" not in da.coords:
        raise RuntimeError(f"latitude/longitude coordinates missing from {da.name}; coords={list(da.coords)}")
    lats = np.asarray(da.coords["latitude"].values, dtype=float)
    lons = np.asarray(da.coords["longitude"].values, dtype=float)
    if lats.shape != lons.shape:
        raise RuntimeError(f"lat/lon shape mismatch {lats.shape} vs {lons.shape}")
    dl = ((lons - lon + 180.0) % 360.0) - 180.0
    metric = (lats - lat) ** 2 + (dl * math.cos(math.radians(lat))) ** 2
    flat = int(np.nanargmin(metric))
    ij = np.unravel_index(flat, metric.shape)
    lat0, lon0 = float(lats[ij]), float(lons[ij])
    lat_dims = da.coords["latitude"].dims
    if len(lat_dims) != len(ij):
        raise RuntimeError(f"unexpected RRFS coordinate dims {lat_dims} for shape {lats.shape}")
    indexers = {dim: int(pos) for dim, pos in zip(lat_dims, ij)}
    value = np.asarray(da.isel(indexers).values).squeeze()
    if np.size(value) != 1 or not np.isfinite(value):
        return None, lat0, lon0, haversine_km(lat, lon, lat0, lon0)
    return float(value), lat0, lon0, haversine_km(lat, lon, lat0, lon0)


def wind(u: float, v: float):
    speed_mph = math.hypot(u, v) * 2.2369362921
    direction = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    return speed_mph, direction


def decode_case(subset_path: Path, date: str, cycle: str):
    datasets = cfgrib.open_datasets(str(subset_path), backend_kwargs={"indexpath": ""})
    arrays = all_arrays(datasets)
    p = {}
    for level in LEVELS:
        p[level] = {
            "u": select_pressure(arrays, "u", level),
            "v": select_pressure(arrays, "v", level),
            "t": select_pressure(arrays, "t", level),
            "gh": select_pressure(arrays, "gh", level),
            "r": select_pressure(arrays, "r", level),
        }
    gust_da = select_surface(arrays, "gust")
    u10_da = select_surface(arrays, "u", 10)
    v10_da = select_surface(arrays, "v", 10)

    run = dt.datetime.strptime(date + cycle, "%Y%m%d%H").replace(tzinfo=dt.timezone.utc)
    valid = run + dt.timedelta(hours=FXX)
    rows = []
    for zone, (lat, lon) in POINTS.items():
        profile = []
        distances = []
        for level in LEVELS:
            vals = {}
            grid_lat = grid_lon = None
            for k, da in p[level].items():
                value, la, lo, distance = sample_nearest(da, lat, lon)
                vals[k] = value
                grid_lat, grid_lon = la, lo
                distances.append(distance)
            if any(vals[k] is None for k in ("u", "v", "t", "gh", "r")):
                raise RuntimeError(f"non-finite RRFS pressure field for {zone} {level} mb")
            speed, direction = wind(vals["u"], vals["v"])
            profile.append({
                "pressureHpa": level,
                "heightM": vals["gh"],
                "temperatureC": vals["t"] - 273.15,
                "relativeHumidityPct": vals["r"],
                "uMps": vals["u"],
                "vMps": vals["v"],
                "windSpeedMph": speed,
                "windDirectionDeg": direction,
            })
        gust_mps, gla, glo, gd = sample_nearest(gust_da, lat, lon)
        u10, ula, ulo, ud = sample_nearest(u10_da, lat, lon)
        v10, vla, vlo, vd = sample_nearest(v10_da, lat, lon)
        distances += [gd, ud, vd]
        if None in (gust_mps, u10, v10):
            raise RuntimeError(f"non-finite RRFS surface field for {zone}")
        s10, d10 = wind(u10, v10)
        rows.append({
            "run_time": run.isoformat().replace("+00:00", "Z"),
            "valid_time": valid.isoformat().replace("+00:00", "Z"),
            "forecast_lead_hours": FXX,
            "zone": zone,
            "target_lat": lat,
            "target_lon": lon,
            "grid_lat": gla,
            "grid_lon": glo,
            "grid_distance_km": max(distances),
            "profile": profile,
            "surface": {
                "gustMph": gust_mps * 2.2369362921,
                "u10Mps": u10,
                "v10Mps": v10,
                "wind10SpeedMph": s10,
                "wind10DirectionDeg": d10,
            },
        })
    return rows


def extract_case(date: str, cycle: str, temp_dir: Path):
    key = key_for(date, cycle)
    url = f"{BASE}/{key}"
    head = request(url, method="HEAD")
    if not head["ok"]:
        raise RuntimeError(f"RRFS source HEAD failed for {key}: {head}")
    length = int(head["headers"].get("content-length") or 0)
    if length <= 0:
        raise RuntimeError(f"RRFS source content length missing for {key}")
    idx_res = request(url + ".idx")
    if not idx_res["ok"]:
        raise RuntimeError(f"RRFS idx failed for {key}: {idx_res}")
    idx_text = idx_res["body"].decode("utf-8", errors="replace")
    index_rows = parse_idx(idx_text, length)
    selected = select_messages(index_rows)

    chunks = []
    provenance = []
    transferred = 0
    for msg in sorted(selected, key=lambda x: x["start"]):
        body, headers = range_fetch(url, msg["start"], msg["end"])
        transferred += len(body)
        chunks.append(body)
        provenance.append({
            "token": msg["token"],
            "message": msg["message"],
            "start_byte": msg["start"],
            "end_byte": msg["end"],
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "descriptor": msg["descriptor"],
            "content_range": headers.get("content-range"),
        })
    subset = b"".join(chunks)
    subset_path = temp_dir / f"rrfs-{date}-{cycle}-f024-subset.grib2"
    subset_path.write_bytes(subset)
    rows = decode_case(subset_path, date, cycle)
    return rows, {
        "date": date,
        "cycle": cycle,
        "forecast_hour": FXX,
        "key": key,
        "url": url,
        "etag": (head["headers"].get("etag") or "").strip('"') or None,
        "last_modified": head["headers"].get("last-modified"),
        "source_bytes": length,
        "idx_etag": (idx_res["headers"].get("etag") or "").strip('"') or None,
        "idx_sha256": hashlib.sha256(idx_res["body"]).hexdigest(),
        "range_bytes_transferred": transferred,
        "range_fraction_of_source": transferred / length,
        "subset_sha256": hashlib.sha256(subset).hexdigest(),
        "selected_message_count": len(selected),
        "messages": provenance,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="research/si4-rrfs-f24-range-pilot.json")
    args = ap.parse_args()
    rows, cases, failures = [], [], []
    with tempfile.TemporaryDirectory(prefix="si4-rrfs-range-") as tmp:
        td = Path(tmp)
        for date, cycle in CASES:
            try:
                case_rows, provenance = extract_case(date, cycle, td)
                rows.extend(case_rows)
                cases.append(provenance)
            except Exception as exc:
                failures.append({"date": date, "cycle": cycle, "error": repr(exc)})

    payload = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": "RESEARCH_ONLY_SHADOW_GUIDANCE",
        "purpose": "Range-based deterministic RRFS fixed-24h retrospective extraction pilot; plumbing/provenance only, not forecast-skill evidence.",
        "source": {
            "provider": "NOAA Open Data Dissemination",
            "bucket": "s3://noaa-rrfs-pds/",
            "lane": "retro_output_final/spring/",
            "product": "prslev CONUS GRIB2",
        },
        "rules": {
            "development_year": 2024,
            "holdout_2025_loaded": False,
            "forecast_hour_fixed": 24,
            "future_observations_label_only": True,
            "fire_outcome_used": False,
            "missing_files_remain_missing": True,
            "rrfs_shadow_only": True,
            "model_tuning_from_2025_forbidden": True,
            "production_change_authorized": False,
        },
        "points": POINTS,
        "required_pressure_levels_hpa": LEVELS,
        "required_pressure_fields": FIELDS,
        "required_surface_fields": ["GUST", "UGRD 10m", "VGRD 10m"],
        "cases": cases,
        "rows": rows,
        "failure_count": len(failures),
        "failures": failures,
        "summary": {
            "cases_requested": len(CASES),
            "cases_completed": len(cases),
            "rows": len(rows),
            "max_grid_distance_km": max((r["grid_distance_km"] for r in rows), default=None),
            "total_source_bytes": sum(c["source_bytes"] for c in cases),
            "total_range_bytes_transferred": sum(c["range_bytes_transferred"] for c in cases),
            "weighted_range_fraction": (sum(c["range_bytes_transferred"] for c in cases) / sum(c["source_bytes"] for c in cases)) if cases else None,
        },
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload["summary"], indent=2))
    if failures or len(rows) != len(CASES) * len(POINTS):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
