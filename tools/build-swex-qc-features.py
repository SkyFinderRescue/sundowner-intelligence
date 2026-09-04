#!/usr/bin/env python3
"""Build research-only SI-4 features from final-QC SWEX radiosonde netCDF files.

Input is a local directory of NCAR/EOL CF-style netCDF files from ISS2/ISS3.
This tool never imputes missing observations, never uses fire outcomes, and leaves
features null when the source profile does not support them. Each output row carries
an input SHA-256 digest plus exact NCAR/EOL dataset identifiers so derived evidence
can be traced to both the catalog record and exact bytes.
"""
import argparse, glob, hashlib, json, math, os
from datetime import datetime, timezone
import numpy as np
import xarray as xr

LEVELS=(925,850,700,600,500)
KAPPA=0.2854
G=9.80665
DATASETS={
    'ISS2':{'site_name':'Rancho Alegre','eol_id':'600.003','doi':'10.26023/J6P8-7SYD-XP0M'},
    'ISS3':{'site_name':'Sedgwick','eol_id':'600.004','doi':'10.26023/H5TV-Y54J-R010'}
}

def pick(ds,names):
    lower={k.lower():k for k in list(ds.variables)+list(ds.coords)}
    for n in names:
        if n.lower() in lower:return ds[lower[n.lower()]]
    return None

def arr(v):
    if v is None:return None
    return np.asarray(v.values,dtype=float).reshape(-1)

def interp(p,x,target):
    if x is None:return None
    ok=np.isfinite(p)&np.isfinite(x)
    if ok.sum()<2:return None
    pp=p[ok]; xx=x[ok]
    order=np.argsort(pp); pp=pp[order]; xx=xx[order]
    if target<pp[0] or target>pp[-1]:return None
    return float(np.interp(target,pp,xx))

def iso(v):
    if v is None:return None
    try:
        a=np.asarray(v.values).reshape(-1)[0]
        if np.issubdtype(np.asarray(a).dtype,np.datetime64):
            s=np.datetime_as_string(a,unit='s')
            return s if s.endswith('Z') else s+'Z'
        if isinstance(a,datetime):
            if a.tzinfo is None:a=a.replace(tzinfo=timezone.utc)
            return a.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
        if isinstance(a,(str,bytes)):
            return a.decode() if isinstance(a,bytes) else a
    except Exception:pass
    return None

def finite_or_none(x):
    try:
        x=float(x)
        return x if math.isfinite(x) else None
    except Exception:return None

def theta_k(temp,pressure_hpa):
    if temp is None:return None
    tk=float(temp) if float(temp)>170 else float(temp)+273.15
    return tk*(1000.0/float(pressure_hpa))**KAPPA

def uv_to_speed_dir(u,v):
    if u is None or v is None:return (None,None)
    speed=math.hypot(u,v)
    direction=(math.degrees(math.atan2(-u,-v))+360.0)%360.0
    return speed,direction

def signed_cross_barrier(u,v,target_from_deg):
    if u is None or v is None or target_from_deg is None:return None
    speed,direction=uv_to_speed_dir(u,v)
    delta=((direction-target_from_deg+540.0)%360.0)-180.0
    return speed*math.cos(math.radians(delta))

def zero_crossing(height,cross):
    pts=[(z,c) for z,c in zip(height,cross) if z is not None and c is not None and math.isfinite(z) and math.isfinite(c)]
    pts.sort()
    for (z1,c1),(z2,c2) in zip(pts,pts[1:]):
        if z1<700:continue
        if c1>0 and c2<=0 and c2!=c1:
            f=(0-c1)/(c2-c1)
            return z1+max(0,min(1,f))*(z2-z1)
    return None

def ridge_stability(levels):
    b=levels.get('925',{}); t=levels.get('700',{})
    vals=(b.get('theta_k'),t.get('theta_k'),b.get('height_m'),t.get('height_m'))
    if any(v is None for v in vals):return {'n_per_s':None,'n2_per_s2':None,'delta_theta_k':None}
    thb,tht,zb,zt=vals
    if zt<=zb:return {'n_per_s':None,'n2_per_s2':None,'delta_theta_k':None}
    dtheta=tht-thb; mean_theta=(tht+thb)/2; n2=(G/mean_theta)*(dtheta/(zt-zb))
    return {'n_per_s':math.sqrt(n2) if n2>0 else 0.0,'n2_per_s2':n2,'delta_theta_k':dtheta}

def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def profile_integrity(p,z):
    fp=p[np.isfinite(p)] if p is not None else np.array([])
    fz=z[np.isfinite(z)] if z is not None else np.array([])
    pressure_min=finite_or_none(np.min(fp)) if fp.size else None
    pressure_max=finite_or_none(np.max(fp)) if fp.size else None
    altitude_min=finite_or_none(np.min(fz)) if fz.size else None
    altitude_max=finite_or_none(np.max(fz)) if fz.size else None
    covers_925_500=bool(pressure_min is not None and pressure_max is not None and pressure_min<=500 and pressure_max>=925)
    return {'pressure_samples':int(fp.size),'height_samples':int(fz.size),'pressure_min_hpa':pressure_min,'pressure_max_hpa':pressure_max,'altitude_min_m':altitude_min,'altitude_max_m':altitude_max,'covers_925_to_500_hpa':covers_925_500}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',required=True)
    ap.add_argument('--site',required=True,choices=['ISS2','ISS3'])
    ap.add_argument('--out',required=True)
    ap.add_argument('--target-direction-deg',type=float,default=None,help='Meteorological FROM direction normal to terrain. Direction-dependent features remain null when omitted.')
    a=ap.parse_args(); provenance=DATASETS[a.site]
    rows=[]; failures=[]
    for fn in sorted(glob.glob(os.path.join(a.input,'*.nc'))):
      try:
        ds=xr.open_dataset(fn,decode_times=True)
        p=arr(pick(ds,['pressure','pres','p'])); t=arr(pick(ds,['temperature','temp','tdry'])); u=arr(pick(ds,['u_wind','u','uwind'])); v=arr(pick(ds,['v_wind','v','vwind'])); z=arr(pick(ds,['altitude','height','geopotential_height','gpsalt']))
        if p is None: raise ValueError('pressure variable not found')
        if np.nanmedian(p)>2000:p=p/100.0
        integrity=profile_integrity(p,z); prof={}; heights=[]; cross=[]
        for lev in LEVELS:
          uu=interp(p,u,lev); vv=interp(p,v,lev); temp=interp(p,t,lev); height=interp(p,z,lev); speed,direction=uv_to_speed_dir(uu,vv); cb=signed_cross_barrier(uu,vv,a.target_direction_deg)
          prof[str(lev)]={'u_ms':finite_or_none(uu),'v_ms':finite_or_none(vv),'wind_speed_ms':finite_or_none(speed),'wind_from_deg':finite_or_none(direction),'cross_barrier_ms':finite_or_none(cb),'temp_k':finite_or_none((temp if temp is not None and temp>170 else temp+273.15) if temp is not None else None),'theta_k':finite_or_none(theta_k(temp,lev)),'height_m':finite_or_none(height)}
          heights.append(height); cross.append(cb)
        critical=zero_crossing(heights,cross) if a.target_direction_deg is not None else None
        launch=iso(pick(ds,['time','launch_time','base_time']))
        rows.append({'site':a.site,'dataset_provenance':provenance,'source_file':os.path.basename(fn),'source_sha256':sha256_file(fn),'source_bytes':os.path.getsize(fn),'launch_time':launch,'target_direction_deg':a.target_direction_deg,'profile_integrity':integrity,'levels_hpa':prof,'features':{'critical_level_height_m':finite_or_none(critical),'critical_level_below_5km':(critical<5000 if critical is not None else None),'critical_level_below_3km':(critical<3000 if critical is not None else None),'ridge_stability_925_700':ridge_stability(prof)}})
        ds.close()
      except Exception as e: failures.append({'file':os.path.basename(fn),'error':str(e)})
    out={'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION','generated':datetime.now(timezone.utc).isoformat(),'source':'NSF NCAR/EOL final-QC SWEX radiosonde netCDF','site':a.site,'dataset_provenance':provenance,'rules':{'missing_values':'null/no imputation','fire_outcome_used':False,'future_observation_leakage':False,'validation_only':True,'direction_features_require_explicit_target_direction':True,'source_byte_provenance':'SHA-256 per input file'},'rows':rows,'failures':failures}
    os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True)
    with open(a.out,'w') as f:json.dump(out,f,indent=2,allow_nan=False)
    print(json.dumps({'rows':len(rows),'failures':len(failures),'out':a.out}))
    if failures: raise SystemExit(2)
if __name__=='__main__':main()
