#!/usr/bin/env python3
import hashlib
import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from eccodes import CodesInternalError, codes_get, codes_grib_find_nearest, codes_grib_new_from_file, codes_release

OUT = Path(os.environ.get("OUT", "research/ndfd-grib-sample.json"))
BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
DATE = os.environ.get("SAMPLE_DATE", "2025/01/15")
# Exact operational 2.5-km CONUS WMO super headings from NOAA's NDFDelem_fullres_202206.xls.
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
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
    "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees"
]


def safe_get(gid, key):
    try:
        v = codes_get(gid, key)
        if isinstance(v, (str, int, float, bool)) or v is None:
            return v
        return str(v)
    except Exception:
        return None


def s3_keys(prefix):
    qs = urllib.parse.urlencode({"list-type": "2", "prefix": prefix, "max-keys": 1000})
    with urllib.request.urlopen(BASE + "?" + qs, timeout=30) as r:
        xml = r.read()
    root = ET.fromstring(xml)
    ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
    return [e.text for e in root.findall("s:Contents/s:Key", ns) if e.text]


def discover_key(parameter, wmo_super):
    prefix = f"wmo/{parameter}/{DATE}/{wmo_super}_KWBN_"
    keys = sorted(s3_keys(prefix))
    if not keys:
        raise RuntimeError(f"No NOAA NDFD archive object found for {prefix}")
    # Use the earliest archive object for this integrity-only sample; no verification observations are consulted.
    return keys[0], keys


def lon_for_eccodes(lon):
    return lon % 360.0


def lon180(lon):
    return ((float(lon) + 180.0) % 360.0) - 180.0


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


def inspect(parameter, spec):
    key, matching_keys = discover_key(parameter, spec["wmo_super"])
    path = Path("/tmp") / f"ndfd-conus-{parameter}.grb2"
    url = BASE + key
    urllib.request.urlretrieve(url, path)
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    messages = []
    with path.open("rb") as fh:
        while True:
            gid = codes_grib_new_from_file(fh)
            if gid is None:
                break
            try:
                meta = {k: safe_get(gid, k) for k in META_KEYS}
                meta["station_values"] = station_sample(gid)
                messages.append(meta)
            finally:
                codes_release(gid)
    step24 = [m for m in messages if m.get("endStep") == 24 or m.get("forecastTime") == 24 or str(m.get("stepRange")) == "24"]
    distances = [v["distance_km"] for m in messages for v in (m.get("station_values") or {}).values() if v.get("distance_km") is not None]
    return {
        "parameter": parameter,
        "element": spec["element"],
        "wmo_super": spec["wmo_super"],
        "source_url": url,
        "source_key": key,
        "archive_objects_with_same_prefix": matching_keys,
        "bytes": len(raw),
        "sha256": sha,
        "message_count": len(messages),
        "available_end_steps": sorted({m.get("endStep") for m in messages if isinstance(m.get("endStep"), (int, float))}),
        "max_nearest_station_distance_km": max(distances) if distances else None,
        "step24_messages": step24,
        "first_message": messages[0] if messages else None,
    }


out = {
    "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    "purpose": "Decode source-verified operational 2.5-km CONUS NOAA NDFD wind files and verify Santa Barbara coverage plus fixed-24h availability before building the matched benchmark.",
    "source_bucket": "noaa-ndfd-pds",
    "sample_date": DATE,
    "wmo_lookup_source": "https://noaa-ndfd-pds.s3.amazonaws.com/NDFDelem_fullres_202206.xls",
    "decoder": "ECMWF ecCodes Python interface",
    "samples": {},
    "rules": {
        "production_change": False,
        "station_coordinates_selected_before_values": True,
        "future_observation_leakage": False,
        "hindsight_selection": False,
        "wrong_geographic_sector_rejected": True,
    },
}
try:
    for parameter, spec in SAMPLES.items():
        out["samples"][parameter] = inspect(parameter, spec)
except CodesInternalError as exc:
    raise SystemExit(f"ecCodes decode failure: {exc}")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({p: {"source_key": s["source_key"], "message_count": s["message_count"], "steps": s["available_end_steps"], "max_distance_km": s["max_nearest_station_distance_km"], "step24_count": len(s["step24_messages"]), "sha256": s["sha256"]} for p, s in out["samples"].items()}, indent=2))
