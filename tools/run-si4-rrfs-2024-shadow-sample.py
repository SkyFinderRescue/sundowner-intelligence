#!/usr/bin/env python3
"""Run the frozen RRFS F24 range extractor on a predeclared 2024 shadow sample.

This wrapper changes only the development-case inventory. It does not alter the
extractor, scoring, thresholds, observations, SI-4 coefficients, or production.
The dates are evenly spaced through the available May 2024 RRFS retrospective
window and were declared without reference to 2024 outcomes.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

CASES = (
    ("20240502", "12"),
    ("20240506", "12"),
    ("20240510", "12"),
    ("20240514", "12"),
    ("20240518", "12"),
    ("20240522", "12"),
    ("20240526", "12"),
    ("20240530", "12"),
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
