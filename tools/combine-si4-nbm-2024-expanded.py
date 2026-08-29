#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import hashlib
import json
from pathlib import Path

EXPECTED_CASES = 284
EXPECTED_ROWS = 1420


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input-glob', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    files = sorted(glob.glob(args.input_glob, recursive=True))
    cases = []
    rows = []
    seen = set()
    file_provenance = []

    for p in files:
        raw = Path(p).read_bytes()
        x = json.loads(raw)
        if x.get('status') != 'RESEARCH_ONLY_2024_NBM_F24_RANGE_SMOKE':
            continue
        rules = x.get('rules', {})
        assert rules.get('development_year') == 2024
        assert rules.get('holdout_2025_loaded') is False
        assert rules.get('observations_loaded') is False
        assert rules.get('outcomes_loaded') is False
        assert rules.get('forecast_hour') == 24
        assert rules.get('production_change_authorized') is False
        rr = x.get('rows', [])
        assert len(rr) == 5
        key = (rr[0]['run_time'], rr[0]['valid_time'])
        assert key not in seen, f'duplicate case {key}'
        seen.add(key)
        assert all(r['run_time'] == key[0] and r['valid_time'] == key[1] for r in rr)
        assert all(r['forecast_lead_hours'] == 24 for r in rr)
        assert key[0].startswith('2024-') and key[1].startswith('2024-')
        cases.append({
            'run_time': key[0],
            'valid_time': key[1],
            'objects': x.get('objects'),
            'source': x.get('source'),
        })
        rows.extend(rr)
        file_provenance.append({'path': p, 'sha256': hashlib.sha256(raw).hexdigest()})

    assert len(cases) == EXPECTED_CASES, f'case count {len(cases)} != {EXPECTED_CASES}'
    assert len(rows) == EXPECTED_ROWS, f'row count {len(rows)} != {EXPECTED_ROWS}'

    out = {
        'status': 'RESEARCH_ONLY_2024_NBM_EXPANDED_ARCHIVE_COMPLETE',
        'candidate': 'nbm_probabilistic_surface_ensemble_v1',
        'rules': {
            'development_year': 2024,
            'calendar_selection': 'every third day from 2024-06-01 through 2024-12-30; 00/06/12/18Z; exact F024',
            'expected_cases': EXPECTED_CASES,
            'expected_rows': EXPECTED_ROWS,
            'holdout_2025_loaded': False,
            'observations_loaded': False,
            'outcomes_loaded': False,
            'production_change_authorized': False,
        },
        'counts': {'cases': len(cases), 'rows': len(rows), 'files': len(file_provenance)},
        'file_provenance': file_provenance,
        'cases': cases,
        'rows': rows,
    }
    target = Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2))
    print(json.dumps(out['counts'], indent=2))


if __name__ == '__main__':
    main()
