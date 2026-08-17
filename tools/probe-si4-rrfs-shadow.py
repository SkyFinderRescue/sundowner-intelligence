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
            rows.append({
                "key": obj["Key"],
                "size": int(obj["Size"]),
                "etag": str(obj.get("ETag", "")).strip('"') or None,
                "last_modified": obj["LastModified"].astimezone(timezone.utc).isoformat(),
            })
            if len(rows) >= max_objects:
                break
        if not r.get("IsTruncated") or len(rows) >= max_objects:
            break
        token = r.get("NextContinuationToken")
    return rows


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

    s3 = boto3.client("s3", region_name="us-east-1", config=Config(signature_version=UNSIGNED, retries={"max_attempts": 4, "mode": "standard"}))
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
        },
        "roots": {},
    }

    for root in DEFAULT_ROOTS:
        tree = walk_prefixes(s3, root, depth=args.depth)
        # Sample exact objects only after prefix discovery; this remains bounded metadata-only work.
        samples = sample_objects(s3, root, max_objects=args.sample)
        payload["roots"][root] = {
            "prefix_tree": tree,
            "object_samples": samples,
            "sample_count": len(samples),
        }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"out": str(out), "roots": {k: v["sample_count"] for k, v in payload["roots"].items()}}, indent=2))


if __name__ == "__main__":
    main()
