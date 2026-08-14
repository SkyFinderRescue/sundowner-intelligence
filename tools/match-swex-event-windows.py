#!/usr/bin/env python3
"""Attach documented SWEX IOP membership to extracted observation rows.

Important: observations outside an IOP are NOT automatically labeled non-events.
They remain `other_campaign_time` until an independently verified negative-window
catalog is supplied. This prevents silent target contamination in event validation.
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


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--features',required=True)
    ap.add_argument('--events',default='data/swex-2022-events.json')
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    feat=json.load(open(a.features))
    truth=json.load(open(a.events))
    events=[]
    for e in truth.get('events',[]):
        s,eend=dt(e.get('start_utc')),dt(e.get('end_utc'))
        if s and eend and eend>s: events.append((s,eend,e))
    rows=[]; invalid_time=0; overlaps=[]
    for r in feat.get('rows',[]):
        t=dt(r.get('launch_time') or r.get('valid_time') or r.get('time'))
        hits=[]
        if t:
            hits=[e for s,en,e in events if s<=t<=en]
        else:
            invalid_time+=1
        if len(hits)>1: overlaps.append({'source_file':r.get('source_file'),'time':r.get('launch_time'),'event_ids':[x.get('event_id') for x in hits]})
        hit=hits[0] if len(hits)==1 else None
        q=dict(r)
        q['swex_validation_membership']={
            'class':'documented_iop' if hit else ('other_campaign_time' if t else 'unknown_time'),
            'event_id':hit.get('event_id') if hit else None,
            'regime':hit.get('regime') if hit else None,
            'tier':hit.get('tier') if hit else None,
            'verified_negative':False,
            'fire_associated_used_as_label':False
        }
        rows.append(q)
    out={
        'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION',
        'generated':datetime.now(timezone.utc).isoformat(),
        'source_features':a.features,
        'source_events':a.events,
        'rules':{
            'outside_iop_is_not_negative':True,
            'negative_windows_require_independent_verification':True,
            'fire_outcome_used':False,
            'future_observation_leakage':False,
            'missing_times_remain_unknown':True
        },
        'counts':{
            'rows':len(rows),
            'documented_iop':sum(x['swex_validation_membership']['class']=='documented_iop' for x in rows),
            'other_campaign_time':sum(x['swex_validation_membership']['class']=='other_campaign_time' for x in rows),
            'unknown_time':sum(x['swex_validation_membership']['class']=='unknown_time' for x in rows),
            'invalid_or_missing_time':invalid_time,
            'overlap_count':len(overlaps)
        },
        'overlaps':overlaps,
        'rows':rows
    }
    os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True)
    with open(a.out,'w') as f: json.dump(out,f,indent=2,allow_nan=False)
    print(json.dumps(out['counts']))
    if overlaps: raise SystemExit(2)

if __name__=='__main__': main()
