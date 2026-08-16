#!/usr/bin/env python3
import csv
import hashlib
import io
import json
import math
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

from eccodes import codes_get, codes_grib_find_nearest, codes_grib_new_from_file, codes_release

BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
OUT = Path(os.environ.get("OUT", "research/ndfd-pilot-2024.json"))
TARGETS = [
    datetime.fromisoformat(x).astimezone(timezone.utc)
    for x in os.environ.get("TARGETS", "2024-01-15T01:00:00+00:00,2024-07-15T01:00:00+00:00").split(",")
]
FIELDS = {
    "wdir": {"wmo": "YBUZ98", "units": "degrees"},
    "wspd": {"wmo": "YCUZ98", "units": "m/s"},
    "wgust": {"wmo": "YWUZ98", "units": "m/s"},
}
STATIONS = {
    "Gaviota": {"id": "GVTC1", "lat": 34.48, "lon": -120.23, "regime": "western"},
    "Refugio": {"id": "RHWC1", "lat": 34.49, "lon": -120.07, "regime": "western"},
    "San Marcos Pass": {"id": "MPWC1", "lat": 34.51, "lon": -119.80, "regime": "hybrid"},
    "Montecito": {"id": "MTIC1", "lat": 34.45, "lon": -119.63, "regime": "eastern"},
    "Carpinteria": {"id": "CXPC1", "lat": 34.42, "lon": -119.52, "regime": "eastern"},
}
MPS_TO_MPH = 2.2369362920544


def fetch_bytes(url, timeout=45):
    req = urllib.request.Request(url, headers={"User-Agent": "Sundowner-Intelligence-SI4-NDFD-Pilot/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_iso(s):
    return datetime.fromisoformat(str(s).replace("Z", "+00:00")).astimezone(timezone.utc)


def s3_objects(parameter, wmo, archive_date):
    prefix = f"wmo/{parameter}/{archive_date}/{wmo}_KWBN_"
    qs = urllib.parse.urlencode({"list-type": "2", "prefix": prefix, "max-keys": 1000})
    root = ET.fromstring(fetch_bytes(BASE + "?" + qs))
    ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
    out = []
    for c in root.findall("s:Contents", ns):
        key = c.findtext("s:Key", default="", namespaces=ns)
        lm = c.findtext("s:LastModified", default="", namespaces=ns)
        size = c.findtext("s:Size", default="", namespaces=ns)
        if key and lm:
            out.append({"key": key, "last_modified": lm, "available": parse_iso(lm), "size": int(size or 0)})
    return out


def suffix(key):
    return key.split("_KWBN_", 1)[-1]


def valid_datetime(gid):
    date = int(codes_get(gid, "validityDate"))
    tm = int(codes_get(gid, "validityTime"))
    hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def reference_datetime(gid):
    date = int(codes_get(gid, "dataDate"))
    tm = int(codes_get(gid, "dataTime"))
    hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def lon360(lon):
    return lon % 360.0


def lon180(lon):
    return ((float(lon) + 180.0) % 360.0) - 180.0


def download_obj(parameter, obj, cache_dir):
    p = cache_dir / f"{parameter}-{suffix(obj['key'])}.grb2"
    if not p.exists():
        p.write_bytes(fetch_bytes(BASE + obj["key"], timeout=90))
    return p


def has_valid_time(parameter, obj, target, cache_dir):
    p = download_obj(parameter, obj, cache_dir)
    with p.open("rb") as fh:
        while True:
            gid = codes_grib_new_from_file(fh)
            if gid is None:
                return False
            try:
                if valid_datetime(gid) == target:
                    return True
            finally:
                codes_release(gid)


def sample_target(parameter, obj, target, cache_dir):
    p = download_obj(parameter, obj, cache_dir)
    raw = p.read_bytes()
    with p.open("rb") as fh:
        while True:
            gid = codes_grib_new_from_file(fh)
            if gid is None:
                break
            try:
                if valid_datetime(gid) != target:
                    continue
                station_values = {}
                for name, s in STATIONS.items():
                    near = codes_grib_find_nearest(gid, s["lat"], lon360(s["lon"]))[0]
                    value = float(near.value)
                    if value >= 9998:
                        value = None
                    station_values[name] = {
                        "value": value,
                        "grid_lat": float(near.lat),
                        "grid_lon": lon180(near.lon),
                        "distance_km": float(near.distance),
                    }
                return {
                    "source_key": obj["key"],
                    "source_last_modified": obj["last_modified"],
                    "sha256": hashlib.sha256(raw).hexdigest(),
                    "bytes": len(raw),
                    "reference_time_utc": reference_datetime(gid).isoformat().replace("+00:00", "Z"),
                    "valid_time_utc": target.isoformat().replace("+00:00", "Z"),
                    "units": str(codes_get(gid, "units")),
                    "station_values": station_values,
                }
            finally:
                codes_release(gid)
    raise RuntimeError(f"{parameter}: selected object lacks target {target.isoformat()}")


def select_snapshot(target, cache_dir):
    cutoff = target - timedelta(hours=24)
    archive_date = cutoff.strftime("%Y/%m/%d")
    inventories = {p: s3_objects(p, spec["wmo"], archive_date) for p, spec in FIELDS.items()}
    maps = {p: {suffix(o["key"]): o for o in rows} for p, rows in inventories.items()}
    common = set.intersection(*(set(m) for m in maps.values()))
    candidates = []
    for sf in common:
        objs = {p: maps[p][sf] for p in FIELDS}
        available = max(o["available"] for o in objs.values())
        if available <= cutoff:
            candidates.append((available, sf, objs))
    candidates.sort(reverse=True, key=lambda x: x[0])
    attempts = []
    for available, sf, objs in candidates:
        found = has_valid_time("wdir", objs["wdir"], target, cache_dir)
        attempts.append({"suffix": sf, "available_utc": available.isoformat().replace("+00:00", "Z"), "target_found": found})
        if found:
            return cutoff, available, sf, objs, attempts
    raise RuntimeError(f"No pre-cutoff common snapshot contains {target.isoformat()}")


def hads_rows(station_id, target):
    start = target - timedelta(hours=1)
    end = target + timedelta(hours=1)
    u = "https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py?" + urllib.parse.urlencode({
        "stations": station_id,
        "network": "CA_DCP",
        "sts": start.strftime("%Y-%m-%dT%H:%MZ"),
        "ets": end.strftime("%Y-%m-%dT%H:%MZ"),
        "what": "txt",
        "delim": "comma",
    })
    text = fetch_bytes(u).decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(text)))


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) and x > -9000 else None
    except Exception:
        return None


def nearest_hads(station_id, target):
    best = None
    for r in hads_rows(station_id, target):
        if not r.get("utc_valid"):
            continue
        try:
            t = datetime.fromisoformat(r["utc_valid"].replace(" ", "T") + "+00:00").astimezone(timezone.utc)
        except Exception:
            continue
        speed, gust, direction = num(r.get("USIRGZZ")), num(r.get("UPHRGZZ")), num(r.get("UDIRGZZ"))
        if speed is None or direction is None:
            continue
        delta = abs((t - target).total_seconds())
        if delta <= 45 * 60 and (best is None or delta < best[0]):
            best = (delta, {
                "time_utc": t.isoformat().replace("+00:00", "Z"),
                "minutes_from_target": delta / 60.0,
                "speed_mph": speed,
                "gust_mph": gust,
                "direction_deg": direction,
            })
    return best[1] if best else None


def circular_error(a, b):
    if a is None or b is None:
        return None
    return abs(((a - b + 180.0) % 360.0) - 180.0)


def mean(xs):
    a = [x for x in xs if x is not None and math.isfinite(x)]
    return sum(a) / len(a) if a else None


cache = Path("/tmp/ndfd-pilot-cache")
cache.mkdir(parents=True, exist_ok=True)
cases = []
rows = []
for target in TARGETS:
    cutoff, available, sf, objs, attempts = select_snapshot(target, cache)
    forecasts = {p: sample_target(p, objs[p], target, cache) for p in FIELDS}
    case = {
        "target_valid_utc": target.isoformat().replace("+00:00", "Z"),
        "cutoff_utc": cutoff.isoformat().replace("+00:00", "Z"),
        "snapshot_suffix": sf,
        "snapshot_available_utc": available.isoformat().replace("+00:00", "Z"),
        "effective_lead_hours": (target - available).total_seconds() / 3600.0,
        "selection_attempts": attempts,
        "sources": {p: {k: forecasts[p][k] for k in ("source_key", "source_last_modified", "sha256", "bytes", "reference_time_utc", "units")} for p in FIELDS},
    }
    cases.append(case)
    for name, s in STATIONS.items():
        obs = nearest_hads(s["id"], target)
        fv = {p: forecasts[p]["station_values"][name] for p in FIELDS}
        row = {
            "target_valid_utc": case["target_valid_utc"],
            "station_name": name,
            "station_id": s["id"],
            "regime": s["regime"],
            "ndfd_grid_distance_km": max(v["distance_km"] for v in fv.values()),
            "ndfd_wind_direction_deg": fv["wdir"]["value"],
            "ndfd_wind_speed_mph": None if fv["wspd"]["value"] is None else fv["wspd"]["value"] * MPS_TO_MPH,
            "ndfd_gust_mph": None if fv["wgust"]["value"] is None else fv["wgust"]["value"] * MPS_TO_MPH,
            "observation": obs,
        }
        if obs:
            observed_gust = obs["gust_mph"] if obs["gust_mph"] is not None else obs["speed_mph"]
            row["diagnostic_gust_error_mph"] = None if row["ndfd_gust_mph"] is None else row["ndfd_gust_mph"] - observed_gust
            row["diagnostic_direction_error_deg"] = circular_error(row["ndfd_wind_direction_deg"], obs["direction_deg"])
        rows.append(row)

matched = [r for r in rows if r["observation"] is not None]
out = {
    "status": "RESEARCH_ONLY_PIPELINE_PILOT_NOT_SKILL_EVIDENCE",
    "generated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "purpose": "Verify the complete no-hindsight NDFD archive-selection, exact-valid-time, Santa Barbara grid matching, unit conversion and independent HADS observation join on predeclared 2024 pilot times. Diagnostic errors are plumbing checks only and are not a model/NWS skill conclusion.",
    "targets": [t.isoformat().replace("+00:00", "Z") for t in TARGETS],
    "cases": cases,
    "rows": rows,
    "pilot_diagnostics": {
        "rows_total": len(rows),
        "rows_with_hads": len(matched),
        "mean_abs_gust_error_mph": mean([abs(r.get("diagnostic_gust_error_mph")) for r in matched if r.get("diagnostic_gust_error_mph") is not None]),
        "mean_direction_error_deg": mean([r.get("diagnostic_direction_error_deg") for r in matched]),
        "max_grid_distance_km": max(r["ndfd_grid_distance_km"] for r in rows) if rows else None,
        "minimum_effective_lead_hours": min(c["effective_lead_hours"] for c in cases) if cases else None,
    },
    "rules": {
        "2024_only": True,
        "2025_holdout_untouched": True,
        "latest_revision_after_cutoff_forbidden": True,
        "exact_valid_time_required": True,
        "future_observation_leakage": False,
        "diagnostic_metrics_not_skill_claim": True,
        "production_change": False,
    },
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out["pilot_diagnostics"], indent=2))
