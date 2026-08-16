#!/usr/bin/env python3
import hashlib
import json
import math
import os
import urllib.request
from pathlib import Path

import numpy as np
import grib2io

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


def attr(msg, name):
    try:
        value = getattr(msg, name)
        if callable(value):
            return None
        if isinstance(value, (np.integer, np.floating)):
            return value.item()
        if hasattr(value, "isoformat"):
            return value.isoformat()
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)
    except Exception:
        return None


def lon180(lon):
    a = np.asarray(lon, dtype=float)
    return ((a + 180.0) % 360.0) - 180.0


def nearest(lats, lons, target_lat, target_lon):
    lons180 = lon180(lons)
    # Small-domain nearest-neighbor distance approximation; selection is fixed by station coordinates only.
    scale = math.cos(math.radians(target_lat))
    d2 = (np.asarray(lats) - target_lat) ** 2 + ((lons180 - target_lon) * scale) ** 2
    idx = np.unravel_index(np.nanargmin(d2), d2.shape)
    return idx, float(np.asarray(lats)[idx]), float(lons180[idx]), float(math.sqrt(float(d2[idx])))


def inspect(parameter, key):
    path = Path("/tmp") / f"ndfd-{parameter}.grb2"
    url = BASE + key
    urllib.request.urlretrieve(url, path)
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    f = grib2io.open(path, "r", save_index=False, use_index=False)
    messages = []
    for n, msg in enumerate(f, start=1):
        if n > 12:
            break
        meta = {name: attr(msg, name) for name in [
            "shortName", "name", "fullName", "units", "level", "refDate", "validDate",
            "forecastTime", "leadTime", "duration", "discipline", "parameterCategory",
            "parameterNumber", "gridDefinitionTemplateNumber", "nx", "ny", "shape"
        ]}
        try:
            lats, lons = msg.latlons()
            data = np.asarray(msg.data)
            station_values = {}
            for station, (lat, lon) in STATIONS.items():
                idx, glat, glon, dd = nearest(lats, lons, lat, lon)
                val = data[idx]
                station_values[station] = {
                    "grid_lat": glat,
                    "grid_lon": glon,
                    "grid_distance_deg_approx": dd,
                    "value": None if np.ma.is_masked(val) or not np.isfinite(float(val)) else float(val),
                }
            meta["station_values"] = station_values
            meta["grid_min"] = float(np.nanmin(data))
            meta["grid_max"] = float(np.nanmax(data))
        except Exception as exc:
            meta["decode_error"] = str(exc)
        messages.append(meta)
    f.close()
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
    "samples": {},
    "rules": {
        "production_change": False,
        "station_coordinates_selected_before_values": True,
        "future_observation_leakage": False,
        "hindsight_selection": False,
    },
}
for parameter, key in SAMPLES.items():
    out["samples"][parameter] = inspect(parameter, key)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({p: {"messages": s["messages_sampled"], "sha256": s["sha256"]} for p, s in out["samples"].items()}, indent=2))
