#!/usr/bin/env python3
import json, math, os
from pathlib import Path

p = Path(os.environ.get('OUT', 'research/ndfd-development-range-2024.json'))
x = json.load(open(p))

all_targets = list(x.get('targets', []))
kept_cases = []
missing = []
for c in x.get('cases', []):
    steps = {str(c['sources'][k].get('step')) for k in ('wdir','wspd','wgust')}
    if steps == {'24'}:
        kept_cases.append(c)
    else:
        missing.append({
            'target_valid_utc': c.get('target_valid_utc'),
            'reason': 'NO_EXACT_NDFD_F24_COMMON_SNAPSHOT',
            'observed_steps': sorted(steps),
            'source_keys': {k:c['sources'][k].get('source_key') for k in ('wdir','wspd','wgust')},
        })

kept_targets = {c['target_valid_utc'] for c in kept_cases}
rows = [r for r in x.get('rows', []) if r.get('target_valid_utc') in kept_targets]

for t in all_targets:
    if t not in kept_targets and not any(m['target_valid_utc'] == t for m in missing):
        missing.append({'target_valid_utc': t, 'reason': 'ARCHIVE_TARGET_UNAVAILABLE', 'observed_steps': [], 'source_keys': {}})

def mean(vals):
    vals=[v for v in vals if isinstance(v,(int,float)) and math.isfinite(v)]
    return sum(vals)/len(vals) if vals else None

x['cases'] = kept_cases
x['rows'] = rows
x['missing_targets'] = sorted(missing, key=lambda m:m['target_valid_utc'])
x['pilot_diagnostics_unfiltered'] = x.get('pilot_diagnostics')
x['pilot_diagnostics'] = {
    'rows_total': len(rows),
    'rows_with_hads': sum(1 for r in rows if r.get('observation')),
    'mean_abs_gust_error_mph': mean([abs(r['diagnostic_gust_error_mph']) for r in rows if r.get('diagnostic_gust_error_mph') is not None]),
    'mean_direction_error_deg': mean([r['diagnostic_direction_error_deg'] for r in rows if r.get('diagnostic_direction_error_deg') is not None]),
    'max_grid_distance_km': max((r['ndfd_grid_distance_km'] for r in rows if r.get('ndfd_grid_distance_km') is not None), default=None),
    'minimum_effective_lead_hours': min((c['effective_lead_hours'] for c in kept_cases), default=None),
}
x.setdefault('rules', {})['exact_step_24_required'] = True
x['rules']['non_exact_step_preserved_as_missing'] = True
json.dump(x, open(p,'w'), indent=2)
print(json.dumps({'exact_f24_cases':len(kept_cases),'rows':len(rows),'missing_targets':x['missing_targets'],'diagnostics':x['pilot_diagnostics']}, indent=2))
