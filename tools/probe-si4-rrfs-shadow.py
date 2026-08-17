#!/usr/bin/env python3
"""Inventory NOAA RRFS/REFS public retrospective/parallel data without model scoring.

Research-only plumbing. This script does not read verifying observations, fit coefficients,
or authorize RRFS/REFS use in production. It records exact S3 keys, sizes and ETags so a
later fixed-lead matched benchmark can be built reproducibly.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore import UNSIGNED
from botocore.config import Config

BUCKET = "noaa-rrfs-pds"
DEFAULT_ROOTS = ["retro_output_final/", "rrfs_public/"]
# Predeclared metadata-only probes. These are representative archive/configuration checks,
# not skill-selected cases and they do not load verifying observations.
TARGET_PREFIXES = [
    "retro_output_final/winter/rrfs.20240115/00/",
    "retro_output_final/winter/rrfs.20240201/00/",
    "retro_output_final/spring/rrfs.20240503/00/",
    "retro_output_final/spring/rrfs.20240515/00/",
    "rrfs_public/rrfs.20260811/00/",
    "rrfs_public/refs.20260811/00/",
]
MODEL_TOKENS = ("2dfld", "prslev", "enspost", "ensprod")
MODEL_SUFFIXES = (".grib2", ".grib2.idx")


def object_row(obj):
    return {
        "key": obj["Key"],
        "size": int(obj["Size"]),
        "etag": str(obj.get("ETag", "")).strip('"') or None,
        "last_modified": obj["LastModified"].astimezone(timezone.utc).isoformat(),
    }


def list_prefixes(s3, prefix: str, max_pages: int = 20):
    out = []
    token = None
    pages = 0
    while pages < max_pages:
        kwargs = {"Bucket": BUCKET, "Prefix": prefix, "Delimiter": "/", "MaxKeys": 1000}
        if token:
            kwargs["ContinuationToken"] = token
        r = s3.list_objects_v2(**kwargs)
        out.extend(x["Prefix"] for x in r.get("CommonPrefixes", []))
        pages += 1
        if not r.get("IsTruncated"):
            break
        token = r.get("NextContinuationToken")
    return sorted(set(out))


def sample_objects(s3, prefix: str, max_objects: int = 100):
    rows = []
    token = None
    while len(rows) < max_objects:
        kwargs = {"Bucket": BUCKET, "Prefix": prefix, "MaxKeys": min(1000, max_objects - len(rows))}
        if token:
            kwargs["ContinuationToken"] = token
        r = s3.list_objects_v2(**kwargs)
        for obj in r.get("Contents", []):
            rows.append(object_row(obj))
            if len(rows) >= max_objects:
                break
        if not r.get("IsTruncated") or len(rows) >= max_objects:
            break
        token = r.get("NextContinuationToken")
    return rows


def find_model_objects(s3, prefix: str, max_scan: int = 6000, max_keep: int = 250):
    """Scan bounded metadata and retain exact model/ensemble GRIB/index objects."""
    kept = []
    scanned = 0
    token = None
    truncated_by_cap = False
    while scanned < max_scan and len(kept) < max_keep:
        kwargs = {"Bucket": BUCKET, "Prefix": prefix, "MaxKeys": min(1000, max_scan - scanned)}
        if token:
            kwargs["ContinuationToken"] = token
        r = s3.list_objects_v2(**kwargs)
        contents = r.get("Contents", [])
        scanned += len(contents)
        for obj in contents:
            key = obj["Key"]
            if any(tok in key for tok in MODEL_TOKENS) and key.endswith(MODEL_SUFFIXES):
                kept.append(object_row(obj))
                if len(kept) >= max_keep:
                    break
        if not r.get("IsTruncated"):
            break
        token = r.get("NextContinuationToken")
        if scanned >= max_scan or len(kept) >= max_keep:
            truncated_by_cap = True
            break
    return {
        "prefix": prefix,
        "metadata_objects_scanned": scanned,
        "matched_object_count": len(kept),
        "bounded_scan_truncated": truncated_by_cap,
        "objects": kept,
    }


def walk_prefixes(s3, root: str, depth: int = 3, cap: int = 400):
    frontier = [root]
    visited = []
    for _ in range(depth):
        nxt = []
        for p in frontier:
            if len(visited) >= cap:
                break
            children = list_prefixes(s3, p)
            visited.append({"prefix": p, "children": children[:100]})
            nxt.extend(children)
        frontier = nxt[:cap]
        if not frontier or len(visited) >= cap:
            break
    return visited


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="research/si4-rrfs-shadow-inventory.json")
    ap.add_argument("--depth", type=int, default=3)
    ap.add_argument("--sample", type=int, default=150)
    args = ap.parse_args()

    s3 = boto3.client(
        "s3",
        region_name="us-east-1",
        config=Config(signature_version=UNSIGNED, retries={"max_attempts": 4, "mode": "standard"}),
    )
    payload = {
        "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "RRFS/REFS shadow-only archive/provenance inventory; no skill claim.",
        "source": {
            "provider": "NOAA NODD / AWS Open Data",
            "bucket": BUCKET,
            "region": "us-east-1",
            "access": "anonymous S3 ListObjectsV2",
            "official_registry": "https://registry.opendata.aws/noaa-rrfs/",
        },
        "rules": {
            "verifying_observations_loaded": False,
            "future_observations_used": False,
            "fire_association_used": False,
            "production_change_authorized": False,
            "rrfs_refs_shadow_only": True,
            "missing_data_fabricated": False,
            "target_prefixes_predeclared_for_metadata_probe": True,
        },
        "roots": {},
        "target_model_object_probes": [],
    }

    for root in DEFAULT_ROOTS:
        tree = walk_prefixes(s3, root, depth=args.depth)
        samples = sample_objects(s3, root, max_objects=args.sample)
        payload["roots"][root] = {
            "prefix_tree": tree,
            "object_samples": samples,
            "sample_count": len(samples),
        }

    for prefix in TARGET_PREFIXES:
        payload["target_model_object_probes"].append(find_model_objects(s3, prefix))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "out": str(out),
        "roots": {k: v["sample_count"] for k, v in payload["roots"].items()},
        "targets": {x["prefix"]: x["matched_object_count"] for x in payload["target_model_object_probes"]},
    }, indent=2))


if __name__ == "__main__":
    main()
