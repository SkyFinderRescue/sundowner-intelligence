#!/usr/bin/env python3
"""Extract leakage-safe SI-4 physics features from EOL Sounding Composite ASCII files.

Designed for the authoritative SWEX 5-hPa composite (UCAR 600.029, DOI
10.26023/CM8F-TNHW-HX01) and native/highest-resolution composite (600.028,
DOI 10.26023/TN83-Q6BW-AB0D). Missing values remain null; observations are
validation-only and are never fixed-lead predictors. Each derived row records
an SHA-256 digest of its exact source bytes for reproducible provenance.
"""
import argparse, glob, hashlib, json, math, os, re
from datetime import datetime, timezone
import numpy as np

LEVELS=(925,850,700,600,500); KAPPA=.2854; G=9.80665
ALIASES={
 'pressure':{'pres','pressure','p','press'}, 'temp':{'temp','temperature','tdry','t'},
 'height':{'alt','altitude','height','hght','z','gpsalt'}, 'u':{'u','uwind','u_wind'},
 'v':{'v','vwind','v_wind'}, 'speed':{'spd','speed','wspd','wind_speed'},
 'direction':{'dir','direction','wdir','wind_dir'}
}
DATASETS={
 'swex_sounding_composite_5hpa':{'eol_id':'600.029','doi':'10.26023/CM8F-TNHW-HX01'},
 'swex_sounding_composite_highres':{'eol_id':'600.028','doi':'10.26023/TN83-Q6BW-AB0D'}
}

def norm(s): return re.sub(r'[^a-z0-9_]+','',s.lower())
def recognized(tokens):
 out={}
 for i,t in enumerate(tokens):
  n=norm(t)
  for k,vals in ALIASES.items():
   if n in vals and k not in out: out[k]=i
 return out

def fnum(s):
 try:
  x=float(s)
  return None if (not math.isfinite(x) or x in (-999,-9999,-99999,99999)) else x
 except Exception:return None

def interp(p,x,target):
 pts=sorted((a,b) for a,b in zip(p,x) if a is not None and b is not None)
 if len(pts)<2 or target<pts[0][0] or target>pts[-1][0]: return None
 return float(np.interp(target,[q for q,_ in pts],[v for _,v in pts]))
def uv(speed,direction):
 if speed is None or direction is None:return (None,None)
 r=math.radians(direction); return (-speed*math.sin(r),-speed*math.cos(r))
def speed_dir(u,v):
 if u is None or v is None:return (None,None)
 return (math.hypot(u,v),(math.degrees(math.atan2(-u,-v))+360)%360)
def cross(u,v,target):
 if u is None or v is None or target is None:return None
 s,d=speed_dir(u,v); delta=((d-target+540)%360)-180; return s*math.cos(math.radians(delta))
def theta(t,p):
 if t is None:return None
 tk=t if t>170 else t+273.15; return tk*(1000/p)**KAPPA
def finite(x): return float(x) if x is not None and math.isfinite(float(x)) else None
def critical(z,c):
 pts=sorted((a,b) for a,b in zip(z,c) if a is not None and b is not None)
 for (z1,c1),(z2,c2) in zip(pts,pts[1:]):
  if z1>=700 and c1>0 and c2<=0 and c2!=c1:
   return z1+(0-c1)/(c2-c1)*(z2-z1)
 return None
def stability(prof):
 a,b=prof['925'],prof['700']; vals=(a['theta_k'],b['theta_k'],a['height_m'],b['height_m'])
 if any(v is None for v in vals) or b['height_m']<=a['height_m']:return {'n_per_s':None,'n2_per_s2':None,'delta_theta_k':None}
 d=b['theta_k']-a['theta_k']; m=(a['theta_k']+b['theta_k'])/2; n2=(G/m)*(d/(b['height_m']-a['height_m']))
 return {'n_per_s':math.sqrt(n2) if n2>0 else 0.0,'n2_per_s2':n2,'delta_theta_k':d}
def sha256_file(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def parse(path):
 lines=open(path,errors='replace').read().splitlines(); columns=None; rows=[]
 for line in lines:
  tok=line.strip().split()
  if not tok:continue
  cand=recognized(tok)
  if columns is None and 'pressure' in cand and ('u' in cand or 'speed' in cand) and len(cand)>=3:
   columns=cand; continue
  if columns is None:continue
  if len(tok)<=max(columns.values()):continue
  p=fnum(tok[columns['pressure']])
  if p is None:continue
  if p>2000:p/=100
  rec={'pressure':p}
  for k in ('temp','height','u','v','speed','direction'):
   rec[k]=fnum(tok[columns[k]]) if k in columns else None
  if (rec['u'] is None or rec['v'] is None) and rec['speed'] is not None and rec['direction'] is not None:
   rec['u'],rec['v']=uv(rec['speed'],rec['direction'])
  rows.append(rec)
 if not rows: raise ValueError('no EOL sounding data table recognized')
 return rows

def profile_integrity(rows):
 ps=[x['pressure'] for x in rows if x['pressure'] is not None]
 zs=[x['height'] for x in rows if x['height'] is not None]
 pmin=min(ps) if ps else None; pmax=max(ps) if ps else None
 return {'pressure_samples':len(ps),'height_samples':len(zs),'pressure_min_hpa':finite(pmin),'pressure_max_hpa':finite(pmax),'altitude_min_m':finite(min(zs)) if zs else None,'altitude_max_m':finite(max(zs)) if zs else None,'covers_925_to_500_hpa':bool(pmin is not None and pmax is not None and pmin<=500 and pmax>=925)}

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--input',required=True); ap.add_argument('--out',required=True); ap.add_argument('--target-direction-deg',type=float); ap.add_argument('--dataset-key',choices=list(DATASETS),required=True); a=ap.parse_args()
 files=[]
 for pat in ('*.cls','*.txt','*.asc','*.dat'): files+=glob.glob(os.path.join(a.input,pat))
 outrows=[]; failures=[]
 for fn in sorted(set(files)):
  try:
   r=parse(fn); p=[x['pressure'] for x in r]; prof={}; zs=[]; cs=[]
   for lev in LEVELS:
    uu=interp(p,[x['u'] for x in r],lev); vv=interp(p,[x['v'] for x in r],lev); tt=interp(p,[x['temp'] for x in r],lev); zz=interp(p,[x['height'] for x in r],lev); s,d=speed_dir(uu,vv); cb=cross(uu,vv,a.target_direction_deg)
    prof[str(lev)]={'u_ms':finite(uu),'v_ms':finite(vv),'wind_speed_ms':finite(s),'wind_from_deg':finite(d),'cross_barrier_ms':finite(cb),'temp_k':finite((tt if tt is not None and tt>170 else tt+273.15) if tt is not None else None),'theta_k':finite(theta(tt,lev)),'height_m':finite(zz)}; zs.append(zz); cs.append(cb)
   cr=critical(zs,cs) if a.target_direction_deg is not None else None
   outrows.append({'source_file':os.path.basename(fn),'source_sha256':sha256_file(fn),'source_bytes':os.path.getsize(fn),'dataset_key':a.dataset_key,'dataset_provenance':DATASETS[a.dataset_key],'target_direction_deg':a.target_direction_deg,'profile_integrity':profile_integrity(r),'levels_hpa':prof,'features':{'critical_level_height_m':finite(cr),'critical_level_below_5km':cr<5000 if cr is not None else None,'critical_level_below_3km':cr<3000 if cr is not None else None,'ridge_stability_925_700':stability(prof)}})
  except Exception as e: failures.append({'file':os.path.basename(fn),'error':str(e)})
 result={'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION','generated':datetime.now(timezone.utc).isoformat(),'source':'NSF NCAR/EOL SWEX EOL Sounding Composite ASCII','dataset_key':a.dataset_key,'dataset_provenance':DATASETS[a.dataset_key],'rules':{'missing_values':'null/no imputation','fire_outcome_used':False,'future_observation_leakage':False,'validation_only':True,'source_byte_provenance':'SHA-256 per input file'},'rows':outrows,'failures':failures}
 os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True); json.dump(result,open(a.out,'w'),indent=2,allow_nan=False); print(json.dumps({'rows':len(outrows),'failures':len(failures),'out':a.out}))
 if failures:raise SystemExit(2)
if __name__=='__main__':main()
