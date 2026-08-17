#!/usr/bin/env python3
"""Research-only GOES-18 ABI numerical marine-layer extractor for SI-4.

Uses only scans whose end time is <= the declared forecast issuance time.
Downloads NOAA GOES-18 ABI-L1b-RadC Bands 7/13/15, converts radiance to
brightness temperature from file Planck coefficients, and summarizes fixed
Santa Barbara masks. No verifying winds or fire data are read here.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import tempfile
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from netCDF4 import Dataset
from pyproj import CRS, Transformer

BUCKET = "https://noaa-goes18.s3.amazonaws.com"
PRODUCT = "ABI-L1b-RadC"
BANDS = (7, 13, 15)
UA = "Sundowner-Intelligence-SI4-GOES-Numeric/1.0"
KEY_RE = re.compile(r"OR_ABI-L1b-RadC-M\dC(?P<band>\d{2})_G18_s(?P<s>\d{14})_e(?P<e>\d{14})_c(?P<c>\d{14})\.nc$")


def parse_yyyyddd_hhmmss(token: str) -> dt.datetime:
    year = int(token[:4]); doy = int(token[4:7]); hh = int(token[7:9]); mm = int(token[9:11]); ss = int(token[11:13])
    tenth = int(token[13:14]) if len(token) >= 14 else 0
    base = dt.datetime(year, 1, 1, hh, mm, ss, tenth * 100000, tzinfo=dt.timezone.utc)
    return base + dt.timedelta(days=doy - 1)


def parse_key(key: str):
    m = KEY_RE.search(key)
    if not m:
        return None
    return {
        "key": key,
        "band": int(m.group("band")),
        "start": parse_yyyyddd_hhmmss(m.group("s")),
        "end": parse_yyyyddd_hhmmss(m.group("e")),
        "created": parse_yyyyddd_hhmmss(m.group("c")),
    }


def doy(d: dt.datetime) -> str:
    return f"{d.timetuple().tm_yday:03d}"


def hour_prefix(d: dt.datetime) -> str:
    return f"{PRODUCT}/{d.year}/{doy(d)}/{d.hour:02d}/"


def fetch_text(url: str, timeout=45) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def list_prefix(prefix: str) -> list[str]:
    url = f"{BUCKET}/?list-type=2&prefix={urllib.parse.quote(prefix)}&max-keys=1000"
    root = ET.fromstring(fetch_text(url))
    ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
    keys = [x.text for x in root.findall("s3:Contents/s3:Key", ns) if x.text]
    if not keys:
        keys = [x.text for x in root.findall(".//Key") if x.text]
    return keys


def select_scans(issue: dt.datetime, max_age_min: float = 25.0):
    keys = []
    for offset in (0, -1):
        keys.extend(list_prefix(hour_prefix(issue + dt.timedelta(hours=offset))))
    parsed = [p for k in keys if (p := parse_key(k)) and p["band"] in BANDS and p["end"] <= issue]
    by_band = {}
    for band in BANDS:
        cand = [p for p in parsed if p["band"] == band]
        cand.sort(key=lambda p: p["end"], reverse=True)
        if not cand:
            raise RuntimeError(f"no issuance-safe C{band:02d} scan found before {issue.isoformat()}")
        best = cand[0]
        age = (issue - best["end"]).total_seconds() / 60.0
        if age > max_age_min:
            raise RuntimeError(f"C{band:02d} scan is {age:.1f} min old > {max_age_min} min")
        by_band[band] = best
    ends = [p["end"] for p in by_band.values()]
    span = (max(ends)-min(ends)).total_seconds()/60.0
    if span > 5:
        raise RuntimeError(f"band scan-end span {span:.1f} min exceeds 5 min")
    return by_band


def http_head(url: str):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return {k.lower(): v for k, v in r.headers.items()}


def download(url: str, path: Path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    h = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk); h.update(chunk); total += len(chunk)
    return h.hexdigest(), total


def scalar(ds: Dataset, name: str) -> float:
    v = ds.variables[name][:]
    return float(np.asarray(v).reshape(-1)[0])


def brightness_temperature(ds: Dataset) -> np.ndarray:
    rad = np.asarray(ds.variables["Rad"][:], dtype=np.float64)
    fk1 = scalar(ds, "planck_fk1"); fk2 = scalar(ds, "planck_fk2")
    bc1 = scalar(ds, "planck_bc1"); bc2 = scalar(ds, "planck_bc2")
    with np.errstate(divide="ignore", invalid="ignore"):
        teff = fk2 / np.log((fk1 / rad) + 1.0)
        bt = (teff - bc1) / bc2
    bt[(rad <= 0) | ~np.isfinite(rad)] = np.nan
    return bt


def grid_latlon(ds: Dataset):
    proj = ds.variables["goes_imager_projection"]
    attrs = {a: getattr(proj, a) for a in proj.ncattrs()}
    h = float(attrs["perspective_point_height"])
    a = float(attrs["semi_major_axis"]); b = float(attrs["semi_minor_axis"])
    lon0 = float(attrs["longitude_of_projection_origin"])
    sweep = str(attrs.get("sweep_angle_axis", "x"))
    crs_geos = CRS.from_proj4(f"+proj=geos +h={h} +lon_0={lon0} +sweep={sweep} +a={a} +b={b} +units=m +no_defs")
    transformer = Transformer.from_crs(crs_geos, CRS.from_epsg(4326), always_xy=True)
    x = np.asarray(ds.variables["x"][:], dtype=np.float64) * h
    y = np.asarray(ds.variables["y"][:], dtype=np.float64) * h
    xx, yy = np.meshgrid(x, y)
    lon, lat = transformer.transform(xx, yy)
    lon = np.asarray(lon); lat = np.asarray(lat)
    invalid = ~np.isfinite(lon) | ~np.isfinite(lat) | (np.abs(lat) > 90) | (np.abs(lon) > 180)
    lon[invalid] = np.nan; lat[invalid] = np.nan
    return lat, lon


def q(values, p):
    a = np.asarray(values, dtype=np.float64)
    a = a[np.isfinite(a)]
    return None if a.size == 0 else float(np.quantile(a, p))


def summary(values):
    a = np.asarray(values, dtype=np.float64)
    total = a.size
    a = a[np.isfinite(a)]
    if a.size == 0:
        return {"n": 0, "valid_fraction": 0.0, "median": None, "p25": None, "p75": None, "p90": None}
    return {
        "n": int(a.size), "valid_fraction": float(a.size/total) if total else 0.0,
        "median": float(np.median(a)), "p25": q(a,.25), "p75": q(a,.75), "p90": q(a,.90)
    }


def box_mask(lat, lon, box):
    return np.isfinite(lat) & np.isfinite(lon) & (lat >= box["lat_min"]) & (lat <= box["lat_max"]) & (lon >= box["lon_min"]) & (lon <= box["lon_max"])


def extract_one(issue: dt.datetime, masks, tmpdir: Path):
    scans = select_scans(issue)
    arrays = {}; provenance = {}
    lat = lon = None
    grid_x = grid_y = None
    for band in BANDS:
        meta = scans[band]
        url = f"{BUCKET}/{meta['key']}"
        head = http_head(url)
        path = tmpdir / f"C{band:02d}.nc"
        digest, size = download(url, path)
        with Dataset(path, "r") as ds:
            bt = brightness_temperature(ds)
            if lat is None:
                lat, lon = grid_latlon(ds)
                grid_x = np.asarray(ds.variables["x"][:], dtype=np.float64)
                grid_y = np.asarray(ds.variables["y"][:], dtype=np.float64)
            else:
                ref_shape = arrays[next(iter(arrays))].shape
                if bt.shape != ref_shape:
                    raise RuntimeError("band grid shape mismatch")
                if not (np.allclose(np.asarray(ds.variables["x"][:]), grid_x) and np.allclose(np.asarray(ds.variables["y"][:]), grid_y)):
                    raise RuntimeError("band fixed-grid coordinates mismatch")
            arrays[band] = bt
        provenance[f"C{band:02d}"] = {
            "key": meta["key"], "start": meta["start"].isoformat(), "end": meta["end"].isoformat(),
            "created": meta["created"].isoformat(), "age_minutes_at_issue": (issue-meta["end"]).total_seconds()/60.0,
            "etag": head.get("etag"), "content_length": int(head.get("content-length", size)), "sha256": digest
        }
    btd_13_07 = arrays[13] - arrays[7]
    btd_15_13 = arrays[15] - arrays[13]
    domains = {}
    for name, box in masks["domains"].items():
        m = box_mask(lat, lon, box)
        domains[name] = {
            "pixels": int(np.count_nonzero(m)),
            "bt_c07_k": summary(arrays[7][m]),
            "bt_c13_k": summary(arrays[13][m]),
            "bt_c15_k": summary(arrays[15][m]),
            "btd_c13_minus_c07_k": summary(btd_13_07[m]),
            "btd_c15_minus_c13_k": summary(btd_15_13[m]),
        }
    def med(domain, key):
        return domains[domain][key]["median"]
    contrasts = {
        "coast_minus_channel_btd_c13_c07_k": None,
        "coast_minus_channel_btd_c15_c13_k": None,
        "western_minus_eastern_btd_c13_c07_k": None,
        "western_minus_eastern_bt_c13_k": None,
    }
    pairs = [
        ("coast_minus_channel_btd_c13_c07_k","south_coast_strip","santa_barbara_channel","btd_c13_minus_c07_k"),
        ("coast_minus_channel_btd_c15_c13_k","south_coast_strip","santa_barbara_channel","btd_c15_minus_c13_k"),
        ("western_minus_eastern_btd_c13_c07_k","western_sector","eastern_sector","btd_c13_minus_c07_k"),
        ("western_minus_eastern_bt_c13_k","western_sector","eastern_sector","bt_c13_k"),
    ]
    for out, a, b, key in pairs:
        va, vb = med(a,key), med(b,key)
        contrasts[out] = None if va is None or vb is None else va-vb
    return {
        "issuance_time": issue.isoformat(),
        "latest_scan_end": max(p["end"] for p in scans.values()).isoformat(),
        "rules": {"all_scan_end_times_lte_issuance": all(p["end"] <= issue for p in scans.values()), "future_imagery_used": False},
        "provenance": provenance,
        "domains": domains,
        "contrasts": contrasts,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--masks", default="research/GOES_MARINE_MASKS_V1.json")
    ap.add_argument("--times", default=os.environ.get("GOES_FEATURE_TIMES","2024-04-01T00:00:00Z,2024-07-15T00:00:00Z"))
    ap.add_argument("--out", default=os.environ.get("OUT","research/goes-marine-numeric-pilot-2024.json"))
    args = ap.parse_args()
    masks = json.load(open(args.masks))
    if masks.get("status") != "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION":
        raise RuntimeError("mask research-only guard missing")
    times = [dt.datetime.fromisoformat(s.strip().replace("Z","+00:00")).astimezone(dt.timezone.utc) for s in args.times.split(",") if s.strip()]
    if not times or any(t.year != 2024 for t in times):
        raise RuntimeError("numeric pilot is frozen to predeclared 2024 development times only")
    rows=[]
    with tempfile.TemporaryDirectory(prefix="si4-goes-") as td:
        for i,t in enumerate(times):
            sub=Path(td)/str(i); sub.mkdir()
            rows.append(extract_one(t,masks,sub))
    out={
        "status":"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "generated":dt.datetime.now(dt.timezone.utc).isoformat(),
        "purpose":"2024-only GOES-18 ABI numerical marine-layer pilot. Direct satellite resistance evidence; not a Sundowner label.",
        "source":{"provider":"NOAA/NESDIS","bucket":BUCKET,"product":PRODUCT,"satellite":"GOES-18","bands":list(BANDS)},
        "mask_version":masks.get("version"),
        "rules":{"development_year":2024,"future_imagery_used":False,"verifying_winds_loaded":False,"fire_outcome_used":False,"model_coefficients_changed":False,"thresholds_frozen":False},
        "rows":rows,
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out,open(args.out,"w"),indent=2); open(args.out,"a").write("\n")
    print(json.dumps({"times":len(rows),"mask_version":out["mask_version"],"rows":[{"issuance_time":r["issuance_time"],"latest_scan_end":r["latest_scan_end"],"contrasts":r["contrasts"]} for r in rows]},indent=2))

if __name__ == "__main__":
    main()
