#!/usr/bin/env python3
"""Build research-only SI-4 features from final-QC SWEX radiosonde netCDF files.

Input is a local directory of NCAR/EOL CF-1.6 netCDF files from ISS2/ISS3.
This tool never imputes missing observations and never uses fire outcomes.
"""
import argparse, glob, json, math, os
from datetime import datetime, timezone
import numpy as np
import xarray as xr

LEVELS=(925,850,700,600,500)

def pick(ds,names):
    lower={k.lower():k for k in list(ds.variables)+list(ds.coords)}
    for n in names:
        if n.lower() in lower:return ds[lower[n.lower()]]
    return None

def arr(v):
    if v is None:return None
    a=np.asarray(v.values,dtype=float).reshape(-1)
    return a

def interp(p,x,target):
    ok=np.isfinite(p)&np.isfinite(x)
    if ok.sum()<2:return None
    pp=p[ok]; xx=x[ok]
    order=np.argsort(pp); pp=pp[order]; xx=xx[order]
    if target<pp[0] or target>pp[-1]:return None
    return float(np.interp(target,pp,xx))

def iso(v):
    try:
        a=np.asarray(v.values).reshape(-1)[0]
        if np.issubdtype(np.asarray(a).dtype,np.datetime64):return np.datetime_as_string(a,unit='s')+'Z'
    except Exception:pass
    return None

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--site',required=True,choices=['ISS2','ISS3']);ap.add_argument('--out',required=True);a=ap.parse_args()
    rows=[]; failures=[]
    for fn in sorted(glob.glob(os.path.join(a.input,'*.nc'))):
      try:
        ds=xr.open_dataset(fn,decode_times=True)
        p=arr(pick(ds,['pressure','pres','p']))
        t=arr(pick(ds,['temperature','temp','tdry']))
        u=arr(pick(ds,['u_wind','u','uwind']))
        v=arr(pick(ds,['v_wind','v','vwind']))
        z=arr(pick(ds,['altitude','height','geopotential_height','gpsalt']))
        if p is None: raise ValueError('pressure variable not found')
        if np.nanmedian(p)>2000:p=p/100.0
        prof={}
        for lev in LEVELS:
          uu=interp(p,u,lev) if u is not None else None; vv=interp(p,v,lev) if v is not None else None
          prof[str(lev)]={'u_ms':uu,'v_ms':vv,'temp_k':interp(p,t,lev) if t is not None else None,'height_m':interp(p,z,lev) if z is not None else None}
        launch=iso(pick(ds,['time','launch_time','base_time']))
        rows.append({'site':a.site,'source_file':os.path.basename(fn),'launch_time':launch,'levels_hpa':prof})
        ds.close()
      except Exception as e: failures.append({'file':os.path.basename(fn),'error':str(e)})
    out={'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION','generated':datetime.now(timezone.utc).isoformat(),'source':'NSF NCAR/EOL final-QC SWEX radiosonde netCDF','site':a.site,'rules':{'missing_values':'null/no imputation','fire_outcome_used':False},'rows':rows,'failures':failures}
    os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True);json.dump(out,open(a.out,'w'),indent=2,allow_nan=False)
    print(json.dumps({'rows':len(rows),'failures':len(failures),'out':a.out}))
    if failures: raise SystemExit(2)
if __name__=='__main__':main()
