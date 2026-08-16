#!/usr/bin/env python3
import hashlib
import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

from eccodes import CodesInternalError, codes_get, codes_grib_find_nearest, codes_grib_new_from_file, codes_release

OUT = Path(os.environ.get("OUT", "research/ndfd-grib-sample.json"))
BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
TARGET_VALID = datetime.fromisoformat(os.environ.get("TARGET_VALID", "2025-01-16T01:00:00+00:00")).astimezone(timezone.utc)
CUTOFF = TARGET_VALID - timedelta(hours=24)
ARCHIVE_DATE = CUTOFF.strftime("%Y/%m/%d")
SAMPLES = {
    "wdir": {"wmo_super": "YBUZ98", "element": "Wind Direction"},
    "wgust": {"wmo_super": "YWUZ98", "element": "Wind Gust Speed"},
    "wspd": {"wmo_super": "YCUZ98", "element": "Wind Speed"},
}
STATIONS = {
    "Gaviota": (34.48, -120.23),
    "Refugio": (34.49, -120.07),
    "San Marcos Pass": (34.51, -119.80),
    "Montecito": (34.45, -119.63),
    "Carpinteria": (34.42, -119.52),
}
META_KEYS = [
    "shortName", "name", "units", "typeOfLevel", "level", "dataDate", "dataTime",
    "step", "stepRange", "startStep", "endStep", "validityDate", "validityTime",
    "forecastTime", "indicatorOfUnitOfTimeRange", "centre", "subCentre", "gridType",
    "Ni", "Nj", "numberOfPoints", "typeOfGeneratingProcess",
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees"
]


def safe_get(gid, key):
    try:
        v = codes_get(gid, key)
        if isinstance(v, (str, int, float, bool)) or v is None:
            return v
        return str(v)
    except Exception:
        return None


def parse_iso(s):
    return datetime.fromisoformat(str(s).replace("Z", "+00:00")).astimezone(timezone.utc)


def s3_objects(prefix):
    qs = urllib.parse.urlencode({"list-type": "2", "prefix": prefix, "max-keys": 1000})
    with urllib.request.urlopen(BASE + "?" + qs, timeout=30) as r:
        xml = r.read()
    root = ET.fromstring(xml)
    ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
    out = []
    for c in root.findall("s:Contents", ns):
        key = c.findtext("s:Key", default="", namespaces=ns)
        lm = c.findtext("s:LastModified", default="", namespaces=ns)
        size = c.findtext("s:Size", default="", namespaces=ns)
        if key and lm:
            out.append({"key": key, "last_modified": lm, "last_modified_dt": parse_iso(lm), "size": int(size or 0)})
    return out


def archive_inventory(parameter, spec):
    prefix = f"wmo/{parameter}/{ARCHIVE_DATE}/{spec['wmo_super']}_KWBN_"
    rows = s3_objects(prefix)
    if not rows:
        raise RuntimeError(f"No NOAA NDFD archive objects found for {prefix}")
    by_suffix = {}
    for row in rows:
        suffix = row["key"].split("_KWBN_", 1)[-1]
        by_suffix[suffix] = row
    return {"prefix": prefix, "objects": rows, "by_suffix": by_suffix}


def lon_for_eccodes(lon):
    return lon % 360.0


def lon180(lon):
    return ((float(lon) + 180.0) % 360.0) - 180.0


def grib_valid_datetime(gid):
    date = int(codes_get(gid, "validityDate"))
    tm = int(codes_get(gid, "validityTime"))
    hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def grib_reference_datetime(gid):
    date = int(codes_get(gid, "dataDate"))
    tm = int(codes_get(gid, "dataTime"))
    hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def station_sample(gid):
    out = {}
    for station, (lat, lon) in STATIONS.items():
        nearest = codes_grib_find_nearest(gid, lat, lon_for_eccodes(lon))[0]
        value = float(nearest.value)
        out[station] = {
            "grid_lat": float(nearest.lat),
            "grid_lon": lon180(nearest.lon),
            "distance_km": float(nearest.distance),
            "grid_index": int(nearest.index),
            "value": None if value >= 9998.0 else value,
        }
    return out


def download(parameter, obj):
    local = Path("/tmp") / f"ndfd-{parameter}-{obj['key'].split('_KWBN_')[-1]}.grb2"
    if not local.exists():
        urllib.request.urlretrieve(BASE + obj["key"], local)
    return local


def find_target_message(parameter, obj, sample_stations=False):
    local = download(parameter, obj)
    raw = local.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    count = 0
    target = None
    first = None
    with local.open("rb") as fh:
        while True:
            gid = codes_grib_new_from_file(fh)
            if gid is None:
                break
            count += 1
            try:
                meta = {k: safe_get(gid, k) for k in META_KEYS}
                meta["valid_time_utc"] = grib_valid_datetime(gid).isoformat().replace("+00:00", "Z")
                meta["reference_time_utc"] = grib_reference_datetime(gid).isoformat().replace("+00:00", "Z")
                if first is None:
                    first = meta
                if grib_valid_datetime(gid) == TARGET_VALID:
                    target = dict(meta)
                    if sample_stations:
                        target["station_values"] = station_sample(gid)
                    break
            finally:
                codes_release(gid)
    return {"found": target is not None, "message_count_scanned": count, "target_message": target, "first_message": first, "sha256": sha, "bytes": len(raw)}


inventories = {p: archive_inventory(p, s) for p, s in SAMPLES.items()}
common_suffixes = set.intersection(*(set(v["by_suffix"]) for v in inventories.values()))
candidates = []
for suffix in common_suffixes:
    objs = {p: inventories[p]["by_suffix"][suffix] for p in SAMPLES}
    available = max(o["last_modified_dt"] for o in objs.values())
    if available <= CUTOFF:
        candidates.append((available, suffix, objs))
candidates.sort(reverse=True, key=lambda x: x[0])
if not candidates:
    raise SystemExit("No common CONUS NDFD archive snapshot was available by the fixed-24h cutoff")

selected = None
selection_attempts = []
try:
    # Use direction as the validity-time probe because all three fields share the same WMO snapshot cadence.
    for available, suffix, objs in candidates:
        probe = find_target_message("wdir", objs["wdir"], sample_stations=False)
        selection_attempts.append({
            "suffix": suffix,
            "available_utc": available.isoformat().replace("+00:00", "Z"),
            "wdir_key": objs["wdir"]["key"],
            "target_valid_found": probe["found"],
            "message_count_scanned": probe["message_count_scanned"],
        })
        if probe["found"]:
            selected = (available, suffix, objs)
            break

    if selected is None:
        raise SystemExit("No pre-cutoff common NDFD snapshot contained the exact target valid time")

    available, suffix, objs = selected
    samples = {}
    for parameter, spec in SAMPLES.items():
        decoded = find_target_message(parameter, objs[parameter], sample_stations=True)
        if not decoded["found"]:
            raise SystemExit(f"Selected common snapshot lacks exact target time for {parameter}")
        samples[parameter] = {
            "element": spec["element"],
            "wmo_super": spec["wmo_super"],
            "source_key": objs[parameter]["key"],
            "source_last_modified": objs[parameter]["last_modified"],
            "source_size": objs[parameter]["size"],
            "sha256": decoded["sha256"],
            "bytes": decoded["bytes"],
            "target_message": decoded["target_message"],
        }
except CodesInternalError as exc:
    raise SystemExit(f"ecCodes decode failure: {exc}")

lead_hours_by_availability = (TARGET_VALID - available).total_seconds() / 3600.0
all_station_rows = [v for s in samples.values() for v in s["target_message"]["station_values"].values()]
max_distance = max(v["distance_km"] for v in all_station_rows)

out = {
    "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    "purpose": "Validate a no-hindsight NDFD fixed-lead selection rule: choose the newest common archived CONUS wind snapshot actually available by target-minus-24h, backing up only when needed to obtain the exact valid time, then sample fixed Santa Barbara verification coordinates.",
    "source_bucket": "noaa-ndfd-pds",
    "wmo_lookup_source": "https://noaa-ndfd-pds.s3.amazonaws.com/NDFDelem_fullres_202206.xls",
    "target_valid_utc": TARGET_VALID.isoformat().replace("+00:00", "Z"),
    "fixed_lead_cutoff_utc": CUTOFF.isoformat().replace("+00:00", "Z"),
    "archive_date": ARCHIVE_DATE,
    "selected_snapshot_suffix": suffix,
    "selected_snapshot_available_utc": available.isoformat().replace("+00:00", "Z"),
    "effective_minimum_lead_hours_from_archive_availability": lead_hours_by_availability,
    "selection_attempts": selection_attempts,
    "samples": samples,
    "max_nearest_station_distance_km": max_distance,
    "rules": {
        "production_change": False,
        "latest_archive_revision_after_cutoff_forbidden": True,
        "target_valid_time_must_match_exactly": True,
        "common_snapshot_across_wdir_wspd_wgust": True,
        "future_observation_leakage": False,
        "hindsight_selection": False,
        "station_coordinates_selected_before_values": True,
        "wrong_geographic_sector_rejected": True,
    },
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({
    "target_valid_utc": out["target_valid_utc"],
    "cutoff_utc": out["fixed_lead_cutoff_utc"],
    "selected_suffix": suffix,
    "available_utc": out["selected_snapshot_available_utc"],
    "effective_lead_hours": lead_hours_by_availability,
    "attempts": selection_attempts,
    "max_station_distance_km": max_distance,
    "values": {p: s["target_message"]["station_values"] for p, s in samples.items()},
}, indent=2))
