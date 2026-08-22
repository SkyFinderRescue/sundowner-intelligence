#!/usr/bin/env python3
"""Build research-only SI-4 validation features from final-QC SWEX wind-profiler netCDF.

This extractor is for independent SWEX event reconstruction only. It does not feed
future observations into fixed-lead forecasts. Missing values remain null, source
bytes are SHA-256 hashed, and fire outcomes are never read.

The final NCAR/EOL NIMA wind products are 30-minute netCDF products for the SWEX
915-MHz profilers at ISS2 Rancho Alegre and ISS3 Sedgwick (dataset 600.034,
DOI 10.26023/2659-AF70-3009). The parser accepts common CF/NIMA aliases rather than
inventing values when a field is absent.
"""
import argparse, glob, hashlib, json, math, os
from datetime import datetime, timezone
import numpy as np
import xarray as xr

PROVENANCE={
    'dataset_title':'ISS Radar Wind Profiler Products',
    'eol_id':'600.034',
    'doi':'10.26023/2659-AF70-3009',
    'product_version':'1.0',
    'campaign':'SWEX 2022',
    'expected_resolution':'30-minute final NIMA winds for 915-MHz ISS2/ISS3 products'
}
SITES={'ISS2':'Rancho Alegre','ISS3':'Sedgwick','ISS1':'Santa Barbara Fire Department'}
TARGET_HEIGHTS=(500,1000,1500,2000,2500,3000)

def pick(ds,names):
    lower={k.lower():k for k in list(ds.variables)+list(ds.coords)}
    for n in names:
        if n.lower() in lower:return ds[lower[n.lower()]]
    return None

def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def finite(x):
    try:
        y=float(x); return y if math.isfinite(y) else None
    except Exception:return None

def uv_to_speed_dir(u,v):
    if u is None or v is None:return (None,None)
    s=math.hypot(u,v)
    d=(math.degrees(math.atan2(-u,-v))+360)%360
    return s,d

def cross_barrier(u,v,target_from):
    if u is None or v is None or target_from is None:return None
    s,d=uv_to_speed_dir(u,v)
    delta=((d-target_from+540)%360)-180
    return s*math.cos(math.radians(delta))

def to_iso(value):
    try:
        a=np.asarray(value).reshape(-1)[0]
        if np.issubdtype(np.asarray(a).dtype,np.datetime64):
            s=np.datetime_as_string(a,unit='s'); return s if s.endswith('Z') else s+'Z'
        if isinstance(a,datetime):
            if a.tzinfo is None:a=a.replace(tzinfo=timezone.utc)
            return a.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
        if isinstance(a,(str,bytes)):
            s=a.decode() if isinstance(a,bytes) else a
            return s
    except Exception:pass
    return None

def interp_height(z,x,target):
    z=np.asarray(z,dtype=float).reshape(-1); x=np.asarray(x,dtype=float).reshape(-1)
    ok=np.isfinite(z)&np.isfinite(x)
    if ok.sum()<2:return None
    zz=z[ok]; xx=x[ok]; order=np.argsort(zz); zz=zz[order]; xx=xx[order]
    if target<zz[0] or target>zz[-1]:return None
    return finite(np.interp(target,zz,xx))

def zero_crossing(z,cross):
    pts=sorted((float(a),float(b)) for a,b in zip(z,cross) if np.isfinite(a) and np.isfinite(b))
    for (z1,c1),(z2,c2) in zip(pts,pts[1:]):
        if z1<300:continue
        if c1>0 and c2<=0 and c2!=c1:
            f=(0-c1)/(c2-c1)
            return finite(z1+max(0,min(1,f))*(z2-z1))
    return None

def normalize_time_height(da,time_dim,height_dim):
    if da is None:return None
    dims=list(da.dims)
    if time_dim not in dims or height_dim not in dims:return None
    return da.transpose(time_dim,height_dim)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',required=True,help='Directory containing final-QC profiler netCDF files')
    ap.add_argument('--site',required=True,choices=sorted(SITES))
    ap.add_argument('--out',required=True)
    ap.add_argument('--target-direction-deg',type=float,default=None,help='Meteorological FROM direction normal to terrain; direction-dependent features stay null when omitted')
    a=ap.parse_args()
    rows=[]; failures=[]
    for fn in sorted(glob.glob(os.path.join(a.input,'*.nc'))):
      try:
        ds=xr.open_dataset(fn,decode_times=True)
        tv=pick(ds,['time','datetime','base_time'])
        zv=pick(ds,['height','altitude','range','gate_height','height_agl'])
        uv=pick(ds,['u','u_wind','uwind','wind_u'])
        vv=pick(ds,['v','v_wind','vwind','wind_v'])
        sv=pick(ds,['wind_speed','wspd','speed'])
        dv=pick(ds,['wind_direction','wind_dir','wdir','direction'])
        wv=pick(ds,['w','vertical_velocity','w_wind'])
        if tv is None or zv is None:raise ValueError('time/height coordinate not found')
        time_dim=tv.dims[0] if tv.dims else None
        height_dim=zv.dims[-1] if zv.dims else None
        if not time_dim or not height_dim:raise ValueError('time/height dimensions not identifiable')
        z=np.asarray(zv.values,dtype=float).reshape(-1)
        # Convert km-like height coordinate to meters only when units explicitly say km.
        zunits=str(zv.attrs.get('units','')).lower()
        if zunits in ('km','kilometer','kilometers'):z=z*1000.0
        U=normalize_time_height(uv,time_dim,height_dim); V=normalize_time_height(vv,time_dim,height_dim)
        S=normalize_time_height(sv,time_dim,height_dim); D=normalize_time_height(dv,time_dim,height_dim)
        W=normalize_time_height(wv,time_dim,height_dim)
        if (U is None or V is None) and (S is None or D is None):raise ValueError('neither u/v nor speed/direction wind fields found')
        times=np.asarray(tv.values).reshape(-1)
        for i,t in enumerate(times):
            if U is not None and V is not None:
                ua=np.asarray(U.isel({time_dim:i}).values,dtype=float).reshape(-1)
                va=np.asarray(V.isel({time_dim:i}).values,dtype=float).reshape(-1)
            else:
                sa=np.asarray(S.isel({time_dim:i}).values,dtype=float).reshape(-1)
                da=np.asarray(D.isel({time_dim:i}).values,dtype=float).reshape(-1)
                rad=np.deg2rad(da); ua=-sa*np.sin(rad); va=-sa*np.cos(rad)
            wa=np.asarray(W.isel({time_dim:i}).values,dtype=float).reshape(-1) if W is not None else np.full_like(z,np.nan)
            if len(ua)!=len(z) or len(va)!=len(z):raise ValueError('wind/height shape mismatch')
            cross=np.array([cross_barrier(finite(u),finite(v),a.target_direction_deg) for u,v in zip(ua,va)],dtype=float) if a.target_direction_deg is not None else np.full_like(z,np.nan)
            levels={}
            for h in TARGET_HEIGHTS:
                uu=interp_height(z,ua,h); vv=interp_height(z,va,h); ws,wd=uv_to_speed_dir(uu,vv)
                levels[str(h)]={'u_ms':finite(uu),'v_ms':finite(vv),'wind_speed_ms':finite(ws),'wind_from_deg':finite(wd),'cross_barrier_ms':finite(interp_height(z,cross,h)) if a.target_direction_deg is not None else None,'vertical_velocity_ms':finite(interp_height(z,wa,h))}
            validz=z[np.isfinite(z)]
            low_cb=interp_height(z,cross,500) if a.target_direction_deg is not None else None
            high_cb=interp_height(z,cross,2000) if a.target_direction_deg is not None else None
            rows.append({
              'site':a.site,'site_name':SITES[a.site],'dataset_provenance':PROVENANCE,
              'source_file':os.path.basename(fn),'source_sha256':sha256_file(fn),'source_bytes':os.path.getsize(fn),
              'valid_time':to_iso(t),'target_direction_deg':a.target_direction_deg,
              'profile_integrity':{'height_samples':int(np.isfinite(z).sum()),'height_min_m':finite(validz.min()) if validz.size else None,'height_max_m':finite(validz.max()) if validz.size else None},
              'levels_m_agl':levels,
              'features':{
                'critical_level_height_m':zero_crossing(z,cross) if a.target_direction_deg is not None else None,
                'cross_barrier_shear_500_2000_ms':finite(high_cb-low_cb) if low_cb is not None and high_cb is not None else None,
                'max_abs_vertical_velocity_ms':finite(np.nanmax(np.abs(wa))) if np.isfinite(wa).any() else None
              }
            })
        ds.close()
      except Exception as e:
        failures.append({'file':os.path.basename(fn),'error':str(e)})
    out={
      'status':'RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION','generated':datetime.now(timezone.utc).isoformat(),
      'source':'NSF NCAR/EOL final-QC SWEX radar wind-profiler products','site':a.site,'dataset_provenance':PROVENANCE,
      'rules':{'validation_only':True,'missing_values':'null/no imputation','future_observation_leakage':False,'fire_outcome_used':False,'source_byte_provenance':'SHA-256 per input file','direction_features_require_explicit_target_direction':True},
      'rows':rows,'failures':failures
    }
    os.makedirs(os.path.dirname(a.out) or '.',exist_ok=True)
    with open(a.out,'w') as f:json.dump(out,f,indent=2,allow_nan=False)
    print(json.dumps({'rows':len(rows),'failures':len(failures),'out':a.out}))
    if failures:raise SystemExit(2)
if __name__=='__main__':main()
