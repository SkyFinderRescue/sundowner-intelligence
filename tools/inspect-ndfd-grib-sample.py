#!/usr/bin/env python3
import hashlib
import json
import os
import urllib.request
from pathlib import Path

from eccodes import (
    CodesInternalError,
    codes_get,
    codes_grib_find_nearest,
    codes_grib_new_from_file,
    codes_release,
)

OUT = Path(os.environ.get("OUT", "research/ndfd-grib-sample.json"))
BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
SAMPLES = {
    "wdir": "wmo/wdir/2025/01/15/YBAZ88_KWBN_202501150047",
    "wgust": "wmo/wgust/2025/01/15/YWAZ88_KWBN_202501150047",
    "wspd": "wmo/wspd/2025/01/15/YCAZ88_KWBN_202501150047",
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
    "forecastTime", "indicatorOfUnitOfTimeRange", "centre", "subCentre",
    "gridType", "Ni", "Nj", "numberOfPoints", "typeOfGeneratingProcess"
]


def safe_get(gid, key):
    try:
        v = codes_get(gid, key)
        if isinstance(v, (str, int, float, bool)) or v is None:
            return v
        return str(v)
    except Exception:
        return None


def inspect(parameter, key):
    path = Path("/tmp") / f"ndfd-{parameter}.grb2"
    url = BASE + key
    urllib.request.urlretrieve(url, path)
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    messages = []
    with path.open("rb") as fh:
        n = 0
        while True:
            gid = codes_grib_new_from_file(fh)
            if gid is None:
                break
            n += 1
            try:
                meta = {k: safe_get(gid, k) for k in META_KEYS}
                station_values = {}
                for station, (lat, lon) in STATIONS.items():
                    nearest = codes_grib_find_nearest(gid, lat, lon)[0]
                    station_values[station] = {
                        "grid_lat": float(nearest.lat),
                        "grid_lon": float(nearest.lon),
                        "distance_km": float(nearest.distance),
                        "grid_index": int(nearest.index),
                        "value": float(nearest.value),
                    }
                meta["station_values"] = station_values
                messages.append(meta)
            finally:
                codes_release(gid)
            if n >= 12:
                break
    return {
        "parameter": parameter,
        "source_url": url,
        "source_key": key,
        "bytes": len(raw),
        "sha256": sha,
        "messages_sampled": len(messages),
        "messages": messages,
    }


out = {
    "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    "purpose": "Decode source-verified NOAA NDFD WMO wind files and verify their message metadata/grid coverage at fixed Santa Barbara validation stations before building the matched benchmark.",
    "source_bucket": "noaa-ndfd-pds",
    "decoder": "ECMWF ecCodes Python interface",
    "samples": {},
    "rules": {
        "production_change": False,
        "station_coordinates_selected_before_values": True,
        "future_observation_leakage": False,
        "hindsight_selection": False,
    },
}
try:
    for parameter, key in SAMPLES.items():
        out["samples"][parameter] = inspect(parameter, key)
except CodesInternalError as exc:
    raise SystemExit(f"ecCodes decode failure: {exc}")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({p: {"messages": s["messages_sampled"], "sha256": s["sha256"], "first": s["messages"][0] if s["messages"] else None} for p, s in out["samples"].items()}, indent=2))
