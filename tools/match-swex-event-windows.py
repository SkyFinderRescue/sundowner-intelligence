#!/usr/bin/env python3
"""Attach documented SWEX IOP and independently verified negative-window membership.

Observations outside documented IOPs and verified negative windows are NOT
implicitly labeled non-events. They remain `other_campaign_time`. This prevents
silent target contamination in event/hard-negative validation.
"""
import argparse, json, os
from datetime import datetime, timezone


def dt(s):
    if not s: return None
    s=str(s).strip().replace('Z','+00:00')
    try:
        x=datetime.fromisoformat(s)
        if x.tzinfo is None: x=x.replace(tzinfo=timezone.utc)
        return x.astimezone(timezone.utc)
    except Exception:
        return None


def windows_from(path, key, require_verified_negative=False):
    if not path or not os.path.exists(path): return []
    src=json.load(open(path))
    out=[]
    for e in src.get(key,[]):
        if require_verified_negative and e.get('verified_negative') is not True:
            continue
        s,en=dt(e.get('start_utc')),dt(e.get('end_utc'))
        if s and en and en>s: out.append((s,en,e))
    return out


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--features',required=True)
    ap.add_argument('--events',default='data/swex-2022-events.json')
    ap.add_argument('--negatives',default='data/swex-2022-negative-windows.json')
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    feat=json.load(open(a.features))
    events=windows_from(a.events,'events')
    negatives=windows_from(a.negatives,'windows',require_verified_negative=True)
    rows=[]; invalid_time=0; overlaps=[]; conflicts=[]
    for r in feat.get('rows',[]):
        t=dt(r.get('launch_time') or r.get('valid_time') or r.get('time'))
        event_hits=[]; negative_hits=[]
        if t:
            event_hits=[e for s,en,e in events if s<=t<=en]
            negative_hits=[e for s,en,e in negatives if s<=t<=en]
        else:
            invalid_time+=1
        if len(event_hits)>1:
            overlaps.append({'source_file':r.get('source_file'),'time':r.get('launch_time'),'kind':'event','ids':[x.get('event_id') for x in event_hits]})
        if len(negative_hits)>1:
            overlaps.append({'source_file':r.get('source_file'),'time':r.get('launch_time'),'kind':'negative','ids':[x.get('window_id') for x in negative_hits]})
        if event_hits and negative_hits:
            conflicts.append({'source_file':r.get('source_file'),'time':r.get('launch_time'),'event_ids':[x.get('event_id') for x in event_hits],'negative_ids':[x.get('window_id') for x in negative_hits]})
        hit=event_hits[0] if len(event_hits)==1 and not negative_hits else None
        neg=negative_hits[0] if len(negative_hits)==1 and not event_hits else None
        if hit:
            cls='documented_iop'
        elif neg:
            cls='documented_negative'
        elif t:
            cls='other_campaign_time'
        else:
            cls='unknown_time'
        q=dict(r)
        q['swex_validation_membership']={
            'class':cls,
            'event_id':hit.get('event_id') if hit else None,
            'negative_window_id':neg.get('window_id') if neg else None,
            'regime':hit.get('regime') if hit else None,
            'tier':hit.get('tier') if hit else None,
            'verified_negative':bool(neg),
            'fire_associated_used_as_label':False
        }
        rows.append(q)
    out={
        'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION',
        'generated':datetime.now(timezone.utc).isoformat(),
        'source_features':a.features,
        'source_events':a.events,
        'source_negative_windows':a.negatives if os.path.exists(a.negatives) else None,
        'rules':{
            'outside_documented_windows_is_not_negative':True,
            'negative_windows_require_independent_verification':True,
            'only_explicit_verified_negative_windows_used':True,
            'fire_outcome_used':False,
            'future_observation_leakage':False,
            'missing_times_remain_unknown':True
        },
        'counts':{
            'rows':len(rows),
            'documented_iop':sum(x['swex_validation_membership']['class']=='documented_iop' for x in rows),
            'documented_negative':sum(x['swex_validation_membership']['class']=='documented_negative' for x in rows),
            'other_campaign_time':sum(x['swex_validation_membership']['class']=='other_campaign_time' for x in rows),
            'unknown_time':sum(x['swex_validation_membership']['class']=='unknown_time' for x in rows),
            'invalid_or_missing_time':invalid_time,
            'overlap_count':len(overlaps),
            'conflict_count':len(conflicts)
        },
        'overlaps':overlaps,
        'conflicts':conflicts,
        'rows':rows
    }
    os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True)
    with open(a.out,'w') as f: json.dump(out,f,indent=2,allow_nan=False)
    print(json.dumps(out['counts']))
    if overlaps or conflicts: raise SystemExit(2)

if __name__=='__main__': main()
