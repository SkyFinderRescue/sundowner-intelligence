#!/usr/bin/env python3
import csv
import hashlib
import io
import json
import math
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

from eccodes import codes_get, codes_grib_find_nearest, codes_grib_new_from_file, codes_release

BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
OUT = Path(os.environ.get("OUT", "research/ndfd-pilot-range-2024.json"))
TARGETS = [datetime.fromisoformat(x).astimezone(timezone.utc) for x in os.environ.get("TARGETS", "2024-01-15T01:00:00+00:00,2024-07-15T01:00:00+00:00").split(",")]
FIELDS = {
    "wdir": {"wmo": "YBUZ98", "heading_prefix": "YBU", "units": "degrees"},
    "wspd": {"wmo": "YCUZ98", "heading_prefix": "YCU", "units": "m/s"},
    "wgust": {"wmo": "YWUZ98", "heading_prefix": "YWU", "units": "m/s"},
}
STATIONS = {
    "Gaviota": {"id": "GVTC1", "lat": 34.48, "lon": -120.23, "regime": "western"},
    "Refugio": {"id": "RHWC1", "lat": 34.49, "lon": -120.07, "regime": "western"},
    "San Marcos Pass": {"id": "MPWC1", "lat": 34.51, "lon": -119.80, "regime": "hybrid"},
    "Montecito": {"id": "MTIC1", "lat": 34.45, "lon": -119.63, "regime": "eastern"},
    "Carpinteria": {"id": "CXPC1", "lat": 34.42, "lon": -119.52, "regime": "eastern"},
}
MPS_TO_MPH = 2.2369362920544
CHUNK = 65536
HEADER_RE = re.compile(rb"([A-Z0-9]{6})\s+KWBN\s+(\d{6})")


def fetch_bytes(url, timeout=45, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "Sundowner-Intelligence-SI4-NDFD-Pilot-Range/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), getattr(r, "status", None), r.headers.get("Content-Range")


def parse_iso(s):
    return datetime.fromisoformat(str(s).replace("Z", "+00:00")).astimezone(timezone.utc)


def s3_objects(parameter, wmo, archive_date):
    prefix = f"wmo/{parameter}/{archive_date}/{wmo}_KWBN_"
    qs = urllib.parse.urlencode({"list-type": "2", "prefix": prefix, "max-keys": 1000})
    raw, _, _ = fetch_bytes(BASE + "?" + qs)
    root = ET.fromstring(raw)
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


def source_date(key):
    return datetime.strptime(suffix(key)[:8], "%Y%m%d").date()


def target_heading(spec, key, target):
    delta = (target.date() - source_date(key)).days
    if delta < 0 or delta > 6:
        return None
    return f"{spec['heading_prefix']}{chr(ord('B') + delta)}{target.hour:02d}"


def range_get(url, start, end):
    data, status, cr = fetch_bytes(url, timeout=45, headers={"Range": f"bytes={start}-{end}"})
    if status not in (200, 206):
        raise RuntimeError(f"unexpected status {status}")
    if status == 200 and len(data) > end - start + 1:
        raise RuntimeError("Range ignored; refusing full super-file fallback")
    return data, cr


def remote_size(url):
    data, cr = range_get(url, 0, 0)
    if cr and "/" in cr:
        return int(cr.rsplit("/", 1)[1])
    if len(data) > 1:
        raise RuntimeError("Range ignored while sizing object")
    raise RuntimeError("No Content-Range size")


def locate_bulletin(url, heading, fetch_target=True):
    size = remote_size(url)
    offset = 0
    messages = 0
    scan_bytes = 0
    wanted = heading.encode("ascii")
    while offset < size and messages < 500:
        chunk, _ = range_get(url, offset, min(size - 1, offset + CHUNK - 1))
        scan_bytes += len(chunk)
        idx = chunk.find(b"GRIB")
        if idx < 0:
            raise RuntimeError(f"No GRIB marker near {offset}")
        head = chunk[idx:idx + 16]
        if len(head) < 16:
            head, _ = range_get(url, offset + idx, min(size - 1, offset + idx + 31)); head = head[:16]
        if len(head) < 16 or head[:4] != b"GRIB" or head[7] != 2:
            raise RuntimeError(f"Invalid GRIB2 indicator at {offset + idx}")
        length = int.from_bytes(head[8:16], "big")
        pre = chunk[max(0, idx - 160):idx]
        ms = list(HEADER_RE.finditer(pre))
        bulletin = ms[-1].group(1).decode("ascii") if ms else None
        grib_start = offset + idx
        messages += 1
        if bulletin and bulletin.encode("ascii") == wanted:
            raw = None; cr = None
            if fetch_target:
                raw, cr = range_get(url, grib_start, grib_start + length - 1)
                if len(raw) != length or raw[:4] != b"GRIB":
                    raise RuntimeError("Target range incomplete")
            return {"found": True, "remote_size": size, "messages_scanned": messages, "scan_bytes": scan_bytes, "grib_start": grib_start, "grib_length": length, "content_range": cr, "raw": raw}
        offset = grib_start + length
    return {"found": False, "remote_size": size, "messages_scanned": messages, "scan_bytes": scan_bytes}


def dt_from_grib(gid, date_key, time_key):
    date = int(codes_get(gid, date_key)); tm = int(codes_get(gid, time_key)); hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def lon360(lon): return lon % 360.0

def lon180(lon): return ((float(lon) + 180.0) % 360.0) - 180.0


def decode_range(parameter, spec, obj, target):
    heading = target_heading(spec, obj["key"], target)
    if not heading:
        raise RuntimeError(f"Cannot derive heading for {parameter} {target}")
    located = locate_bulletin(BASE + obj["key"], heading, fetch_target=True)
    if not located["found"]:
        raise RuntimeError(f"{parameter}: bulletin {heading} absent from {obj['key']}")
    raw = located.pop("raw")
    tmp = Path("/tmp") / f"ndfd-pilot-range-{parameter}.grb2"; tmp.write_bytes(raw)
    with tmp.open("rb") as fh:
        gid = codes_grib_new_from_file(fh)
        if gid is None: raise RuntimeError(f"decode failed {parameter}")
        try:
            valid = dt_from_grib(gid, "validityDate", "validityTime")
            ref = dt_from_grib(gid, "dataDate", "dataTime")
            if valid != target:
                raise RuntimeError(f"{parameter} heading {heading} valid {valid}, expected {target}")
            stations = {}
            for name, s in STATIONS.items():
                near = codes_grib_find_nearest(gid, s["lat"], lon360(s["lon"]))[0]
                value = float(near.value)
                stations[name] = {"value": None if value >= 9998 else value, "grid_lat": float(near.lat), "grid_lon": lon180(near.lon), "distance_km": float(near.distance)}
            return {
                "source_key": obj["key"], "source_last_modified": obj["last_modified"], "source_size": obj["size"],
                "target_heading": heading, "sha256_grib_message": hashlib.sha256(raw).hexdigest(), "grib_bytes": len(raw),
                "reference_time_utc": ref.isoformat().replace("+00:00", "Z"), "valid_time_utc": valid.isoformat().replace("+00:00", "Z"),
                "units": str(codes_get(gid, "units")), "step": str(codes_get(gid, "step")), "station_values": stations,
                "scan_bytes": located["scan_bytes"], "messages_scanned": located["messages_scanned"], "remote_size": located["remote_size"],
            }
        finally:
            codes_release(gid)


def select_snapshot(target):
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
        heading = target_heading(FIELDS["wdir"], objs["wdir"]["key"], target)
        if not heading:
            continue
        loc = locate_bulletin(BASE + objs["wdir"]["key"], heading, fetch_target=False)
        attempts.append({"suffix": sf, "available_utc": available.isoformat().replace("+00:00", "Z"), "heading": heading, "target_found": loc["found"], "messages_scanned": loc["messages_scanned"], "scan_bytes": loc["scan_bytes"]})
        if loc["found"]:
            return cutoff, available, sf, objs, attempts
    raise RuntimeError(f"No pre-cutoff common snapshot contains {target.isoformat()}")


def hads_rows(station_id, target):
    start = target - timedelta(hours=1); end = target + timedelta(hours=1)
    u = "https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py?" + urllib.parse.urlencode({"stations": station_id, "network": "CA_DCP", "sts": start.strftime("%Y-%m-%dT%H:%MZ"), "ets": end.strftime("%Y-%m-%dT%H:%MZ"), "what": "txt", "delim": "comma"})
    text, _, _ = fetch_bytes(u); return list(csv.DictReader(io.StringIO(text.decode("utf-8", errors="replace"))))


def num(v):
    try:
        x = float(v); return x if math.isfinite(x) and x > -9000 else None
    except Exception: return None


def nearest_hads(station_id, target):
    best = None
    for r in hads_rows(station_id, target):
        if not r.get("utc_valid"): continue
        try: t = datetime.fromisoformat(r["utc_valid"].replace(" ", "T") + "+00:00").astimezone(timezone.utc)
        except Exception: continue
        speed, gust, direction = num(r.get("USIRGZZ")), num(r.get("UPHRGZZ")), num(r.get("UDIRGZZ"))
        if speed is None or direction is None: continue
        delta = abs((t - target).total_seconds())
        if delta <= 45 * 60 and (best is None or delta < best[0]): best = (delta, {"time_utc": t.isoformat().replace("+00:00", "Z"), "minutes_from_target": delta / 60.0, "speed_mph": speed, "gust_mph": gust, "direction_deg": direction})
    return best[1] if best else None


def circular_error(a, b):
    if a is None or b is None: return None
    return abs(((a - b + 180.0) % 360.0) - 180.0)


def mean(xs):
    a = [x for x in xs if x is not None and math.isfinite(x)]; return sum(a) / len(a) if a else None


cases=[]; rows=[]; transfer={"source_superfile_bytes":0,"range_scan_bytes":0,"target_grib_bytes":0}
for target in TARGETS:
    cutoff, available, sf, objs, attempts = select_snapshot(target)
    forecasts = {p: decode_range(p, FIELDS[p], objs[p], target) for p in FIELDS}
    transfer["source_superfile_bytes"] += sum(f["remote_size"] for f in forecasts.values())
    transfer["range_scan_bytes"] += sum(f["scan_bytes"] for f in forecasts.values()) + sum(a.get("scan_bytes",0) for a in attempts)
    transfer["target_grib_bytes"] += sum(f["grib_bytes"] for f in forecasts.values())
    case={"target_valid_utc":target.isoformat().replace("+00:00","Z"),"cutoff_utc":cutoff.isoformat().replace("+00:00","Z"),"snapshot_suffix":sf,"snapshot_available_utc":available.isoformat().replace("+00:00","Z"),"effective_lead_hours": (target-available).total_seconds()/3600.0,"selection_attempts":attempts,"sources":{p:{k:forecasts[p][k] for k in ("source_key","source_last_modified","source_size","target_heading","sha256_grib_message","grib_bytes","reference_time_utc","valid_time_utc","units","step")} for p in FIELDS}}
    cases.append(case)
    for name,s in STATIONS.items():
        obs=nearest_hads(s["id"],target); fv={p:forecasts[p]["station_values"][name] for p in FIELDS}
        row={"target_valid_utc":case["target_valid_utc"],"station_name":name,"station_id":s["id"],"regime":s["regime"],"ndfd_grid_distance_km":max(v["distance_km"] for v in fv.values()),"ndfd_wind_direction_deg":fv["wdir"]["value"],"ndfd_wind_speed_mph":None if fv["wspd"]["value"] is None else fv["wspd"]["value"]*MPS_TO_MPH,"ndfd_gust_mph":None if fv["wgust"]["value"] is None else fv["wgust"]["value"]*MPS_TO_MPH,"observation":obs}
        if obs:
            og=obs["gust_mph"] if obs["gust_mph"] is not None else obs["speed_mph"]
            row["diagnostic_gust_error_mph"]=None if row["ndfd_gust_mph"] is None else row["ndfd_gust_mph"]-og
            row["diagnostic_direction_error_deg"]=circular_error(row["ndfd_wind_direction_deg"],obs["direction_deg"])
        rows.append(row)
matched=[r for r in rows if r["observation"] is not None]
transfer["approx_bytes_transferred"]=transfer["range_scan_bytes"]+transfer["target_grib_bytes"]
transfer["fraction_of_full_superfiles"]=transfer["approx_bytes_transferred"]/transfer["source_superfile_bytes"] if transfer["source_superfile_bytes"] else None
out={"status":"RESEARCH_ONLY_PIPELINE_PILOT_NOT_SKILL_EVIDENCE","generated":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"purpose":"Range-optimized equivalence run for the validated 2024 NDFD/HADS pipeline pilot. It must reproduce the full-file pilot values while transferring only WMO headers and target GRIB messages.","targets":[t.isoformat().replace("+00:00","Z") for t in TARGETS],"cases":cases,"rows":rows,"transfer":transfer,"pilot_diagnostics":{"rows_total":len(rows),"rows_with_hads":len(matched),"mean_abs_gust_error_mph":mean([abs(r.get("diagnostic_gust_error_mph")) for r in matched if r.get("diagnostic_gust_error_mph") is not None]),"mean_direction_error_deg":mean([r.get("diagnostic_direction_error_deg") for r in matched]),"max_grid_distance_km":max(r["ndfd_grid_distance_km"] for r in rows) if rows else None,"minimum_effective_lead_hours":min(c["effective_lead_hours"] for c in cases) if cases else None},"rules":{"2024_only":True,"2025_holdout_untouched":True,"latest_revision_after_cutoff_forbidden":True,"exact_valid_time_required":True,"range_request_full_file_fallback_forbidden":True,"future_observation_leakage":False,"diagnostic_metrics_not_skill_claim":True,"production_change":False}}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(out,indent=2)+"\n");print(json.dumps({"diagnostics":out["pilot_diagnostics"],"transfer":transfer},indent=2))
