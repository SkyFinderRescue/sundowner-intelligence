#!/usr/bin/env python3
"""Chronological 2024-only CV for a predeclared compact GOES marine candidate set.

Research only. Uses 2024 development labels and issuance-safe GOES features. The
SI-4 baseline probability is treated as a fixed offset; GOES can only learn a
small additive logit correction from prior chronological data. Missing features
are never imputed. 2025 is forbidden.
"""
from __future__ import annotations
import argparse, datetime as dt, json, math
from pathlib import Path

CANDIDATES={
  "coast_microphysics_level":["local_coast_btd13_07"],
  "coast_channel_microphysics_contrast":["local_coast_minus_channel_btd13_07"],
  "channel_cloud_trend_1h":["local_channel_bt13_change_1h"],
  "compact_marine_state":["local_coast_btd13_07","local_coast_minus_channel_btd13_07","local_channel_bt13_change_1h"],
}
FOLDS=[
  {"name":"may-jun","train_end":"2024-04-30T23:59:59Z","test_start":"2024-05-01T00:00:00Z","test_end":"2024-06-30T23:59:59Z"},
  {"name":"jul-sep","train_end":"2024-06-30T23:59:59Z","test_start":"2024-07-01T00:00:00Z","test_end":"2024-09-30T23:59:59Z"},
  {"name":"oct-dec","train_end":"2024-09-30T23:59:59Z","test_start":"2024-10-01T00:00:00Z","test_end":"2024-12-31T23:59:59Z"},
]
TARGET_POD=.60
GATES={"brier_relative_max":.99,"hard_negative_brier_relative_max":1.00,"hard_negative_fpr_margin_max":.02,"auc_margin_min":-.01,"pod_margin_min":-.05}

def finite(x): return isinstance(x,(int,float)) and math.isfinite(x)
def clamp(x,a,b): return max(a,min(b,x))
def sig(x): return 1/(1+math.exp(-clamp(x,-35,35)))
def logit(p): p=clamp(float(p),.001,.999); return math.log(p/(1-p))
def iso(s): return dt.datetime.fromisoformat(str(s).replace('Z','+00:00')).astimezone(dt.timezone.utc)
def mean(a): return sum(a)/len(a) if a else None

def auc(rows,key):
    vals=[(r[key],r['label']) for r in rows if finite(r.get(key))]
    pos=[v for v,y in vals if y==1]; neg=[v for v,y in vals if y==0]
    if not pos or not neg:return None
    wins=ties=0
    for p in pos:
        for n in neg:
            if p>n:wins+=1
            elif p==n:ties+=1
    return (wins+.5*ties)/(len(pos)*len(neg))

def brier(rows,key,negative_only=False):
    a=[(r[key]-r['label'])**2 for r in rows if finite(r.get(key)) and (not negative_only or r['label']==0)]
    return mean(a)

def classification(rows,pkey,tkey):
    tp=fp=tn=fn=0
    for r in rows:
        p=r.get(pkey); t=r.get(tkey)
        if not finite(p) or not finite(t):continue
        yes=p>=t; actual=r['label']==1
        if yes and actual:tp+=1
        elif yes and not actual:fp+=1
        elif not yes and actual:fn+=1
        else:tn+=1
    return {"tp":tp,"fp":fp,"tn":tn,"fn":fn,"pod":tp/(tp+fn) if tp+fn else None,"fpr_negative":fp/(fp+tn) if fp+tn else None}

def threshold_for_pod(rows,key,target=TARGET_POD):
    events=[r for r in rows if r['label']==1 and finite(r.get(key))]
    if not events:return None
    candidates=sorted({r[key] for r in rows if finite(r.get(key))},reverse=True)
    for t in candidates:
        hit=sum(r[key]>=t for r in events)/len(events)
        if hit>=target:return t
    return candidates[-1] if candidates else None

def fit_delta(train,features):
    usable=[r for r in train if finite(r['baseline_probability']) and all(finite(r['features'].get(f)) for f in features)]
    if len(usable)<12 or len({r['label'] for r in usable})<2:return None
    mu=[]; sd=[]
    for f in features:
        a=[r['features'][f] for r in usable]; m=mean(a); s=math.sqrt(mean([(v-m)**2 for v in a])) or 1.0; mu.append(m);sd.append(s)
    w=[0.0]*len(features); b=0.0; lr=.035
    for _ in range(1800):
        gb=0.0; gw=[0.0]*len(features)
        for r in usable:
            z=logit(r['baseline_probability'])+b
            xs=[]
            for j,f in enumerate(features):
                xv=(r['features'][f]-mu[j])/sd[j];xs.append(xv);z+=w[j]*xv
            q=sig(z);e=q-r['label'];gb+=e
            for j,xv in enumerate(xs):gw[j]+=e*xv
        b-=lr*gb/len(usable)
        for j in range(len(w)):w[j]-=lr*(gw[j]/len(usable)+.02*w[j])
        lr*=.999
    return {"intercept":b,"weights":w,"mean":mu,"sd":sd,"features":features,"n_train":len(usable)}

def pred(model,row):
    if model is None:return row['baseline_probability']
    vals=[row['features'].get(f) for f in model['features']]
    if not all(finite(v) for v in vals):return row['baseline_probability']
    z=logit(row['baseline_probability'])+model['intercept']
    for j,v in enumerate(vals):z+=model['weights'][j]*((v-model['mean'][j])/model['sd'][j])
    return sig(z)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--features',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--out',required=True);args=ap.parse_args()
    fs=json.load(open(args.features)); mf=json.load(open(args.manifest))
    if fs['rules']['development_year']!=2024 or fs['rules']['holdout_2025_loaded'] is not False:raise RuntimeError('feature file is not 2024-only')
    if mf['rules']['development_year']!=2024 or mf['rules']['holdout_2025_loaded'] is not False:raise RuntimeError('manifest is not 2024-only')
    lookup={}
    for kind in ('events','hard_negatives'):
        for r in mf['selected'][kind]:lookup[(r['valid_time'],r['zone'])]=r
    rows=[]
    for r in fs['rows']:
        if not str(r['valid_time']).startswith('2024-') or '2025-' in json.dumps(r):raise RuntimeError('2025 leakage guard failed')
        m=lookup.get((r['valid_time'],r['zone']))
        if not m:continue
        rows.append({**r,'label':int(r['label']),'baseline_probability':m['baseline_probability'],'time':iso(r['valid_time'])})
    rows.sort(key=lambda r:(r['time'],r['zone']))
    if len(rows)<40:raise RuntimeError(f'insufficient chronological rows: {len(rows)}')
    fold_results=[]; pooled=[]
    for fold in FOLDS:
        tr_end=iso(fold['train_end']);te_start=iso(fold['test_start']);te_end=iso(fold['test_end'])
        train=[r for r in rows if r['time']<=tr_end];test=[r.copy() for r in rows if te_start<=r['time']<=te_end]
        if len(train)<16 or len(test)<6 or len({r['label'] for r in train})<2 or len({r['label'] for r in test})<2:
            fold_results.append({**fold,'status':'INSUFFICIENT_CLASS_COVERAGE','n_train':len(train),'n_test':len(test)});continue
        bthr=threshold_for_pod(train,'baseline_probability')
        models={name:fit_delta(train,features) for name,features in CANDIDATES.items()}
        cthrs={}
        train_pred=[]
        for rr in train:
            z=rr.copy()
            for name,m in models.items():z[name]=pred(m,rr)
            train_pred.append(z)
        for name in CANDIDATES:cthrs[name]=threshold_for_pod(train_pred,name)
        for rr in test:
            rr['baseline_threshold']=bthr
            for name,m in models.items():rr[name]=pred(m,rr);rr[name+'_threshold']=cthrs[name]
            pooled.append(rr)
        fold_results.append({**fold,'status':'OK','n_train':len(train),'n_test':len(test),'events_test':sum(r['label']==1 for r in test),'hard_negatives_test':sum(r['label']==0 for r in test),'baseline_threshold':bthr,'candidate_thresholds':cthrs,'models':models})
    ok=[f for f in fold_results if f['status']=='OK']
    if len(ok)<2:raise RuntimeError('fewer than two valid chronological folds')
    base_cls=classification(pooled,'baseline_probability','baseline_threshold')
    baseline={"n":len(pooled),"events":sum(r['label']==1 for r in pooled),"hard_negatives":sum(r['label']==0 for r in pooled),"brier":brier(pooled,'baseline_probability'),"auc":auc(pooled,'baseline_probability'),"hard_negative_brier":brier(pooled,'baseline_probability',True),"pod":base_cls['pod'],"hard_negative_fpr":base_cls['fpr_negative']}
    results={};eligible=[]
    for name in CANDIDATES:
        cls=classification(pooled,name,name+'_threshold')
        m={"features":CANDIDATES[name],"brier":brier(pooled,name),"auc":auc(pooled,name),"hard_negative_brier":brier(pooled,name,True),"pod":cls['pod'],"hard_negative_fpr":cls['fpr_negative']}
        checks={
          "overall_brier":finite(m['brier']) and finite(baseline['brier']) and m['brier']<=baseline['brier']*GATES['brier_relative_max'],
          "hard_negative_brier":finite(m['hard_negative_brier']) and finite(baseline['hard_negative_brier']) and m['hard_negative_brier']<=baseline['hard_negative_brier']*GATES['hard_negative_brier_relative_max'],
          "hard_negative_fpr":finite(m['hard_negative_fpr']) and finite(baseline['hard_negative_fpr']) and m['hard_negative_fpr']<=baseline['hard_negative_fpr']+GATES['hard_negative_fpr_margin_max'],
          "auc_noninferior":finite(m['auc']) and finite(baseline['auc']) and m['auc']>=baseline['auc']+GATES['auc_margin_min'],
          "pod_noninferior":finite(m['pod']) and finite(baseline['pod']) and m['pod']>=baseline['pod']+GATES['pod_margin_min'],
        }
        m['gate_checks']=checks;m['passes_all_predeclared_gates']=all(checks.values());results[name]=m
        if m['passes_all_predeclared_gates']:eligible.append(name)
    winner=min(eligible,key=lambda n:results[n]['brier']) if eligible else None
    out={"status":"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION","generated":dt.datetime.now(dt.timezone.utc).isoformat(),"purpose":"Larger chronological 2024-only GOES marine candidate CV. Development evidence only; no 2025 satellite score is loaded.","rules":{"development_year":2024,"holdout_2025_loaded":False,"future_imagery_used":False,"fire_outcome_used":False,"missing_features_imputed":False,"baseline_logit_coefficient_fixed":1.0,"target_train_pod":TARGET_POD,"candidate_set_predeclared":CANDIDATES,"chronological_folds":FOLDS,"gates":GATES,"production_change_authorized":False},"counts":{"feature_rows":len(rows),"pooled_test_rows":len(pooled),"valid_folds":len(ok)},"baseline":baseline,"candidates":results,"eligible_for_one_time_2025_freeze":eligible,"preferred_2024_cv_candidate":winner,"folds":fold_results}
    Path(args.out).parent.mkdir(parents=True,exist_ok=True);json.dump(out,open(args.out,'w'),indent=2,default=str);open(args.out,'a').write('\n')
    print(json.dumps({"counts":out['counts'],"baseline":baseline,"eligible":eligible,"preferred":winner,"candidates":results},indent=2))
if __name__=='__main__':main()
