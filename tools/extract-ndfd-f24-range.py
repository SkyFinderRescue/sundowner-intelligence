#!/usr/bin/env python3
import hashlib
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from eccodes import codes_get, codes_grib_find_nearest, codes_grib_new_from_file, codes_release

BASE = "https://noaa-ndfd-pds.s3.amazonaws.com/"
OUT = Path(os.environ.get("OUT", "research/ndfd-range-f24-sample.json"))
TARGET_VALID = datetime.fromisoformat(os.environ.get("TARGET_VALID", "2025-01-16T01:00:00+00:00")).astimezone(timezone.utc)
SPECS = {
    "wdir": {"key": "wmo/wdir/2025/01/15/YBUZ98_KWBN_202501150047", "heading_prefix": "YBU"},
    "wspd": {"key": "wmo/wspd/2025/01/15/YCUZ98_KWBN_202501150047", "heading_prefix": "YCU"},
    "wgust": {"key": "wmo/wgust/2025/01/15/YWUZ98_KWBN_202501150047", "heading_prefix": "YWU"},
}
STATIONS = {
    "Gaviota": (34.48, -120.23),
    "Refugio": (34.49, -120.07),
    "San Marcos Pass": (34.51, -119.80),
    "Montecito": (34.45, -119.63),
    "Carpinteria": (34.42, -119.52),
}
CHUNK = 65536
HEADER_RE = re.compile(rb"([A-Z0-9]{6})\s+KWBN\s+(\d{6})")


def source_calendar_date(key):
    stamp = key.split("_KWBN_", 1)[-1]
    return datetime.strptime(stamp[:8], "%Y%m%d").date()


def target_bulletin(spec):
    # Verified against the official NDFDelem lookup AND the actual embedded
    # bulletin sequence in YBUZ98_KWBN_202501150047. The source/reference day
    # uses code B (e.g. B02 is valid Jan 15 02Z); the next calendar day is C,
    # then D, etc. Thus Jan 16 01Z inside a Jan 15 super-file is ...C01.
    delta = (TARGET_VALID.date() - source_calendar_date(spec["key"])).days
    if delta < 0 or delta > 6:
        raise RuntimeError(f"Target day offset {delta} is outside supported NDFD WMO heading range")
    day_code = chr(ord("B") + delta)
    return f"{spec['heading_prefix']}{day_code}{TARGET_VALID.hour:02d}"


def request_range(url, start, end):
    req = urllib.request.Request(url, headers={"User-Agent": "Sundowner-Intelligence-SI4-NDFD-Range/1.2", "Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = r.read(); status = getattr(r, "status", None); cr = r.headers.get("Content-Range")
    if status not in (200, 206): raise RuntimeError(f"Unexpected HTTP status {status} for {url}")
    return data, cr


def total_size(url):
    data, cr = request_range(url, 0, 0)
    if cr and "/" in cr: return int(cr.rsplit("/", 1)[1])
    if len(data) > 1: raise RuntimeError("Range request was ignored; refusing full-file fallback")
    raise RuntimeError("Could not determine remote object size")


def scan_target(url, heading):
    size = total_size(url); offset = 0; messages = 0; bytes_scanned = 0; trace = []; wanted = heading.encode("ascii")
    while offset < size and messages < 500:
        end = min(size - 1, offset + CHUNK - 1); chunk, _ = request_range(url, offset, end); bytes_scanned += len(chunk)
        idx = chunk.find(b"GRIB")
        if idx < 0: raise RuntimeError(f"No GRIB marker found within {CHUNK} bytes after offset {offset}")
        if idx + 16 > len(chunk):
            extra, _ = request_range(url, offset + idx, min(size - 1, offset + idx + 31)); header16 = extra[:16]; bytes_scanned += len(extra)
        else: header16 = chunk[idx:idx + 16]
        if len(header16) < 16 or header16[:4] != b"GRIB" or header16[7] != 2: raise RuntimeError(f"Invalid GRIB2 indicator at remote offset {offset + idx}")
        length = int.from_bytes(header16[8:16], "big")
        if length < 16 or offset + idx + length > size + 8: raise RuntimeError(f"Implausible GRIB message length {length} at {offset + idx}")
        pre = chunk[max(0, idx - 160):idx]; matches = list(HEADER_RE.finditer(pre))
        bulletin = matches[-1].group(1).decode("ascii") if matches else None; issue = matches[-1].group(2).decode("ascii") if matches else None
        grib_start = offset + idx; messages += 1
        trace.append({"message": messages, "bulletin": bulletin, "issue_ddhhmm": issue, "grib_start": grib_start, "grib_length": length})
        if bulletin and bulletin.encode("ascii") == wanted:
            raw, cr = request_range(url, grib_start, grib_start + length - 1)
            if len(raw) != length or raw[:4] != b"GRIB": raise RuntimeError(f"Target range fetch incomplete: {len(raw)} vs {length}")
            return {"remote_size": size, "messages_scanned": messages, "bytes_scanned_for_headers": bytes_scanned, "target_bulletin": bulletin, "target_issue_ddhhmm": issue, "target_grib_start": grib_start, "target_grib_length": length, "target_content_range": cr, "target_bytes": raw, "trace": trace}
        offset = grib_start + length
    raise RuntimeError(f"Target bulletin {heading} not found after scanning {messages} messages; seen={[t['bulletin'] for t in trace]}")


def dt_from_grib(gid, date_key, time_key):
    date = int(codes_get(gid, date_key)); tm = int(codes_get(gid, time_key)); hour, minute = divmod(tm, 100)
    return datetime.strptime(str(date), "%Y%m%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)


def lon360(lon): return lon % 360.0

def lon180(lon): return ((float(lon) + 180.0) % 360.0) - 180.0


def decode(parameter, spec):
    url = BASE + spec["key"]; heading = target_bulletin(spec); scan = scan_target(url, heading); raw = scan.pop("target_bytes")
    tmp = Path("/tmp") / f"ndfd-range-{parameter}.grb2"; tmp.write_bytes(raw)
    with tmp.open("rb") as fh:
        gid = codes_grib_new_from_file(fh)
        if gid is None: raise RuntimeError(f"ecCodes could not decode {parameter} target bulletin")
        try:
            valid = dt_from_grib(gid, "validityDate", "validityTime"); ref = dt_from_grib(gid, "dataDate", "dataTime"); stations = {}
            for name, (lat, lon) in STATIONS.items():
                near = codes_grib_find_nearest(gid, lat, lon360(lon))[0]; value = float(near.value)
                stations[name] = {"value": None if value >= 9998 else value, "grid_lat": float(near.lat), "grid_lon": lon180(near.lon), "distance_km": float(near.distance)}
            meta = {"shortName": str(codes_get(gid, "shortName")), "name": str(codes_get(gid, "name")), "units": str(codes_get(gid, "units")), "reference_time_utc": ref.isoformat().replace("+00:00", "Z"), "valid_time_utc": valid.isoformat().replace("+00:00", "Z"), "forecastTime": codes_get(gid, "forecastTime"), "step": str(codes_get(gid, "step")), "stepRange": str(codes_get(gid, "stepRange")), "endStep": str(codes_get(gid, "endStep"))}
        finally: codes_release(gid)
    return {"source_key": spec["key"], "source_url": url, "expected_target_bulletin": heading, "sha256_grib_message": hashlib.sha256(raw).hexdigest(), "decoded": meta, "station_values": stations, **scan}


results = {p: decode(p, spec) for p, spec in SPECS.items()}
max_dist = max(v["distance_km"] for r in results.values() for v in r["station_values"].values())
total_remote = sum(r["remote_size"] for r in results.values()); total_header_scan = sum(r["bytes_scanned_for_headers"] for r in results.values()); total_target = sum(r["target_grib_length"] for r in results.values())
out = {"status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION", "generated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "purpose": "Validate range-based extraction of the exact official NDFD valid-day/hour WMO bulletin from each CONUS super-file, selected from a snapshot already constrained by the fixed-24h availability cutoff.", "target_valid_utc": TARGET_VALID.isoformat().replace("+00:00", "Z"), "results": results, "transfer": {"full_superfile_bytes": total_remote, "header_scan_bytes": total_header_scan, "target_grib_bytes": total_target, "approx_bytes_transferred": total_header_scan + total_target, "fraction_of_full_superfiles": (total_header_scan + total_target) / total_remote}, "max_nearest_station_distance_km": max_dist, "rules": {"production_change": False, "official_wmo_valid_day_hour_heading_required": True, "range_request_full_file_fallback_forbidden": True, "future_observation_leakage": False, "station_coordinates_selected_before_values": True}}
OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({"target_valid_utc": out["target_valid_utc"], "transfer": out["transfer"], "max_distance_km": max_dist, "parameters": {p: {"heading": r["target_bulletin"], "expected": r["expected_target_bulletin"], "messages_scanned": r["messages_scanned"], "valid": r["decoded"]["valid_time_utc"], "step": r["decoded"]["step"], "target_bytes": r["target_grib_length"]} for p, r in results.items()}}, indent=2))
