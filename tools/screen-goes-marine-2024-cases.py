#!/usr/bin/env python3
"""Screen direct GOES-18 marine-layer features on 2024 development cases only.

This is a bounded feature-discovery screen, not a promotion test. It reads the
preselected 2024 event/hard-negative case manifest, uses only satellite scans at
or before the fixed-24h forecast issuance, and never reads 2025 or production data.
"""
from __future__ import annotations
import argparse, datetime as dt, importlib.util, json, math, tempfile
from pathlib import Path
import numpy as np


def load_base():
    p=Path(__file__).with_name('extract-goes-marine-features.py')
    s=importlib.util.spec_from_file_location('si4_goes_base',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m


def install_coherent_scan_selector(base):
    """Plumbing-only guard: choose the newest complete ABI band triplet.

    The original extractor chose the newest eligible file independently per band.
    Around scan-boundary transitions that can mix adjacent CONUS scans and produce
    a 10-minute cross-band end-time span. This selector keeps the same issuance,
    age and <=5-minute coherence rules, but searches complete triplets instead of
    changing any scientific feature, mask, threshold, label or model coefficient.
    """
    def select_scans(issue, max_age_min=25.0):
        keys=[]
        for offset in (0,-1): keys.extend(base.list_prefix(base.hour_prefix(issue+dt.timedelta(hours=offset))))
        parsed=[p for k in keys if (p:=base.parse_key(k)) and p['band'] in base.BANDS and p['end']<=issue]
        by={b:sorted([p for p in parsed if p['band']==b],key=lambda p:p['end'],reverse=True) for b in base.BANDS}
        if any(not by[b] for b in base.BANDS):
            missing=[b for b in base.BANDS if not by[b]]
            raise RuntimeError(f'no issuance-safe scans found for bands {missing} before {issue.isoformat()}')
        anchors=by[13]
        for anchor in anchors:
            chosen={13:anchor}
            for b in (7,15):
                chosen[b]=min(by[b],key=lambda p:abs((p['end']-anchor['end']).total_seconds()))
            ends=[p['end'] for p in chosen.values()]
            span=(max(ends)-min(ends)).total_seconds()/60.0
            ages=[(issue-p['end']).total_seconds()/60.0 for p in chosen.values()]
            if span<=5.0 and max(ages)<=max_age_min:
                return chosen
        newest={b:by[b][0] for b in base.BANDS}
        ends=[p['end'] for p in newest.values()]
        span=(max(ends)-min(ends)).total_seconds()/60.0
        raise RuntimeError(f'no coherent issuance-safe ABI band triplet within {max_age_min} min; newest span {span:.1f} min')
    base.select_scans=select_scans


def iso(s): return dt.datetime.fromisoformat(str(s).replace('Z','+00:00')).astimezone(dt.timezone.utc)
def finite(v): return v is not None and isinstance(v,(int,float)) and math.isfinite(v)
def median(snap,domain,key): return snap['domains'][domain][key]['median']
def sub(a,b): return None if not finite(a) or not finite(b) else float(a-b)

def auc(labels,values):
    pairs=[(float(v),int(y)) for y,v in zip(labels,values) if finite(v)]
    pos=[v for v,y in pairs if y==1];neg=[v for v,y in pairs if y==0]
    if not pos or not neg:return None
    wins=ties=0
    for p in pos:
        for n in neg:
            if p>n:wins+=1
            elif p==n:ties+=1
    return (wins+.5*ties)/(len(pos)*len(neg))

def stats(labels,values):
    ev=[v for y,v in zip(labels,values) if y==1 and finite(v)];hn=[v for y,v in zip(labels,values) if y==0 and finite(v)]
    raw=auc(labels,values)
    return {
      'n_event':len(ev),'n_hard_negative':len(hn),
      'event_mean':float(np.mean(ev)) if ev else None,'hard_negative_mean':float(np.mean(hn)) if hn else None,
      'event_minus_hard_negative_mean':float(np.mean(ev)-np.mean(hn)) if ev and hn else None,
      'raw_auc_higher_means_event':raw,
      'best_oriented_auc':None if raw is None else max(raw,1-raw),
      'orientation':None if raw is None else ('higher_event' if raw>=.5 else 'lower_event')
    }
def snapshot_feature(s,case,offset):
    zone=case['zone'].lower()
    coast=f'{zone}_coast'; channel=f'{zone}_channel'
    return {
      'local_coast_btd13_07':median(s,coast,'btd_c13_minus_c07_k'),
      'local_channel_btd13_07':median(s,channel,'btd_c13_minus_c07_k'),
      'local_coast_minus_channel_btd13_07':sub(median(s,coast,'btd_c13_minus_c07_k'),median(s,channel,'btd_c13_minus_c07_k')),
      'local_coast_btd15_13':median(s,coast,'btd_c15_minus_c13_k'),
      'local_channel_btd15_13':median(s,channel,'btd_c15_minus_c13_k'),
      'local_coast_minus_channel_btd15_13':sub(median(s,coast,'btd_c15_minus_c13_k'),median(s,channel,'btd_c15_minus_c13_k')),
      'local_coast_bt13':median(s,coast,'bt_c13_k'),
      'local_channel_bt13':median(s,channel,'bt_c13_k'),
      'local_coast_minus_channel_bt13':sub(median(s,coast,'bt_c13_k'),median(s,channel,'bt_c13_k')),
      'western_minus_eastern_btd13_07':sub(median(s,'western_sector','btd_c13_minus_c07_k'),median(s,'eastern_sector','btd_c13_minus_c07_k')),
      'western_minus_eastern_bt13':sub(median(s,'western_sector','bt_c13_k'),median(s,'eastern_sector','bt_c13_k')),
    }
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--cases',default='/tmp/goes-cases/goes-marine-2024-case-manifest.json')
    ap.add_argument('--masks',default='research/GOES_MARINE_MASKS_V2.json')
    ap.add_argument('--per-class',type=int,default=8)
    ap.add_argument('--out',default='research/goes-marine-2024-feature-screen.json')
    args=ap.parse_args();base=load_base();install_coherent_scan_selector(base);manifest=json.load(open(args.cases));masks=json.load(open(args.masks))
    if manifest['rules']['development_year']!=2024 or manifest['rules']['holdout_2025_loaded'] is not False:raise RuntimeError('case manifest is not 2024-only')
    if masks['rules']['2025_satellite_data_used_to_define_masks'] is not False:raise RuntimeError('mask leakage guard failed')
    cases=[]
    for kind,label in (('events',1),('hard_negatives',0)):
        for c in manifest['selected'][kind][:args.per_class]: cases.append({**c,'screen_label':label})
    if sum(c['screen_label']==1 for c in cases)<6 or sum(c['screen_label']==0 for c in cases)<6:raise RuntimeError('insufficient cases')
    cache={};rows=[]
    with tempfile.TemporaryDirectory(prefix='si4-goes-screen-') as td:
      td=Path(td)
      for ci,c in enumerate(cases):
        issue=iso(c['forecast_issuance_time']); snaps={}
        for hours in (0,1,3,6):
          eligibility=c['solar_window'][str(hours)]['night_eligible']
          if hours in (0,1) and not eligibility:raise RuntimeError('required night guard violated')
          if not eligibility:continue
          t=issue-dt.timedelta(hours=hours); key=t.isoformat()
          if key not in cache:
            subdir=td/('s'+str(len(cache)));subdir.mkdir();cache[key]=base.extract_one(t,masks,subdir)
          snaps[hours]=cache[key]
        current=snapshot_feature(snaps[0],c,0); f=dict(current)
        for hours in (1,3,6):
          if hours not in snaps:continue
          prev=snapshot_feature(snaps[hours],c,hours)
          for k,v in current.items(): f[f'{k}_change_{hours}h']=sub(v,prev.get(k))
        rows.append({
          'kind':c['kind'],'label':c['screen_label'],'zone':c['zone'],'valid_time':c['valid_time'],'forecast_issuance_time':c['forecast_issuance_time'],
          'local_night_date':c['local_night_date'],'local_hour':c['local_hour'],'local_period':c['local_period'],
          'available_offsets_hours':sorted(snaps.keys()),'features':f,
          'satellite_provenance':{str(h):snaps[h]['provenance'] for h in snaps}
        })
    names=sorted({k for r in rows for k in r['features']});labels=[r['label'] for r in rows]
    feature_stats={n:stats(labels,[r['features'].get(n) for r in rows]) for n in names}
    ranked=sorted(([v.get('best_oriented_auc') or 0,k] for k,v in feature_stats.items()),reverse=True)
    out={
      'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION','generated':dt.datetime.now(dt.timezone.utc).isoformat(),
      'purpose':'Bounded 2024-only direct GOES marine feature screen on western event vs hard-negative cases. Discovery only; no feature is frozen by this artifact.',
      'source':{'case_manifest_run':31996649436,'case_manifest_artifact_sha256':'c2a337d7acceb62f8da0ef47112c479aa16712f6e3cc3cb6b125d8dfe5e02ff1','mask_version':masks['version'],'provider':'NOAA/NESDIS','product':base.PRODUCT,'satellite':'GOES-18'},
      'rules':{'development_year':2024,'holdout_2025_loaded':False,'future_imagery_used':False,'required_night_offsets_hours':[0,1],'optional_night_offsets_hours':[3,6],'fire_outcome_used':False,'feature_thresholds_frozen':False,'production_change_authorized':False},
      'counts':{'event_cases':sum(r['label']==1 for r in rows),'hard_negative_cases':sum(r['label']==0 for r in rows),'unique_satellite_times':len(cache)},
      'feature_stats':feature_stats,'ranked_by_in_sample_oriented_auc':[{'feature':k,'best_oriented_auc':s,'orientation':feature_stats[k]['orientation']} for s,k in ranked],
      'rows':rows
    }
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    with open(args.out,'w') as f:json.dump(out,f,indent=2);f.write('\n')
    print(json.dumps({'counts':out['counts'],'top_features':out['ranked_by_in_sample_oriented_auc'][:12]},indent=2))

if __name__=='__main__':main()
