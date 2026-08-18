#!/usr/bin/env python3
"""Run the frozen RRFS F24 range extractor on a predeclared 2024 shadow sample.

This wrapper changes only the development-case inventory. It does not alter the
extractor, scoring, thresholds, observations, SI-4 coefficients, or production.
The dates are evenly spaced every two days through the available May 2024 RRFS
retrospective window and were declared without reference to 2024 outcomes.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

CASES = (
    ("20240501", "12"),
    ("20240503", "12"),
    ("20240505", "12"),
    ("20240507", "12"),
    ("20240509", "12"),
    ("20240511", "12"),
    ("20240513", "12"),
    ("20240515", "12"),
    ("20240517", "12"),
    ("20240519", "12"),
    ("20240521", "12"),
    ("20240523", "12"),
    ("20240525", "12"),
    ("20240527", "12"),
    ("20240529", "12"),
    ("20240531", "12"),
)


def main() -> None:
    path = Path(__file__).with_name("extract-si4-rrfs-f24-range.py")
    spec = importlib.util.spec_from_file_location("si4_rrfs_range", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.CASES = CASES
    sys.argv = [str(path), "--out", "research/si4-rrfs-f24-2024-shadow-sample.json"]
    module.main()


if __name__ == "__main__":
    main()
