#!/usr/bin/env python3
"""2024-only, nighttime-gated GOES-18 marine-layer trend pilot.

Loads the already validated ABI radiance/BT/geolocation extractor and computes
issuance-safe snapshots at 0, -1, -3 and -6 hours. The Nighttime Microphysics
channel differences are considered eligible only when Santa Barbara domain-center
solar elevation is <= -6 degrees (civil-night guard), preventing daylight C07
reflected-solar contamination from being interpreted as a nighttime fog signal.
"""
from __future__ import annotations
import argparse
import datetime as dt
import importlib.util
import json
import math
import tempfile
from pathlib import Path


def load_base():
    p=Path(__file__).with_name("extract-goes-marine-features.py")
    spec=importlib.util.spec_from_file_location("si4_goes_base",p)
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def solar_elevation_deg(t: dt.datetime, lat_deg: float, lon_deg: float) -> float:
    """Approximate NOAA-style solar position, adequate for a conservative night gate."""
    t=t.astimezone(dt.timezone.utc)
    n=t.timetuple().tm_yday
    hour=t.hour+t.minute/60+t.second/3600
    gamma=2*math.pi/365*(n-1+(hour-12)/24)
    eqtime=229.18*(0.000075+0.001868*math.cos(gamma)-0.032077*math.sin(gamma)-0.014615*math.cos(2*gamma)-0.040849*math.sin(2*gamma))
    decl=(0.006918-0.399912*math.cos(gamma)+0.070257*math.sin(gamma)-0.006758*math.cos(2*gamma)+0.000907*math.sin(2*gamma)-0.002697*math.cos(3*gamma)+0.00148*math.sin(3*gamma))
    time_offset=eqtime+4*lon_deg
    tst=(hour*60+time_offset)%1440
    ha=math.radians(tst/4-180)
    lat=math.radians(lat_deg)
    cosz=math.sin(lat)*math.sin(decl)+math.cos(lat)*math.cos(decl)*math.cos(ha)
    cosz=max(-1,min(1,cosz))
    return 90-math.degrees(math.acos(cosz))


def metric(snapshot, domain, key):
    return snapshot["domains"][domain][key]["median"]


def diff(a,b):
    return None if a is None or b is None else float(a-b)


def trend_bundle(snaps):
    current=snaps["h0"]
    domains={}
    keys=("bt_c13_k","btd_c13_minus_c07_k","btd_c15_minus_c13_k")
    for domain in current["domains"]:
        d={}
        for key in keys:
            now=metric(current,domain,key)
            d[key]={"current":now}
            for label,hours in (("1h",1),("3h",3),("6h",6)):
                prev=metric(snaps[f"h-{hours}"],domain,key)
                d[key][f"change_{label}"]=diff(now,prev)
        domains[domain]=d
    c=current["contrasts"]
    contrasts={}
    for key,now in c.items():
        contrasts[key]={"current":now}
        for label,hours in (("1h",1),("3h",3),("6h",6)):
            prev=snaps[f"h-{hours}"]["contrasts"][key]
            contrasts[key][f"change_{label}"]=diff(now,prev)
    return {"domains":domains,"contrasts":contrasts}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--masks",default="research/GOES_MARINE_MASKS_V1.json")
    ap.add_argument("--anchors",default="2024-04-01T10:00:00Z,2024-07-15T10:00:00Z")
    ap.add_argument("--out",default="research/goes-marine-night-trends-pilot-2024.json")
    ap.add_argument("--night-max-solar-elevation",type=float,default=-6.0)
    args=ap.parse_args()
    base=load_base(); masks=json.load(open(args.masks))
    anchors=[dt.datetime.fromisoformat(s.strip().replace("Z","+00:00")).astimezone(dt.timezone.utc) for s in args.anchors.split(",") if s.strip()]
    if not anchors or any(t.year!=2024 for t in anchors): raise RuntimeError("pilot anchors must be 2024 only")
    center_lat,center_lon=34.42,-119.80
    rows=[]
    with tempfile.TemporaryDirectory(prefix="si4-goes-trend-") as td:
        td=Path(td)
        for ai,anchor in enumerate(anchors):
            snaps={}; solar={}
            for hours in (6,3,1,0):
                issue=anchor-dt.timedelta(hours=hours)
                elev=solar_elevation_deg(issue,center_lat,center_lon)
                solar[f"h-{hours}" if hours else "h0"]={"issuance_time":issue.isoformat(),"solar_elevation_deg":elev,"night_eligible":elev<=args.night_max_solar_elevation}
                if elev>args.night_max_solar_elevation:
                    raise RuntimeError(f"nighttime guard failed for {issue.isoformat()}: solar elevation {elev:.2f} deg")
                sub=td/f"a{ai}-h{hours}";sub.mkdir()
                snaps[f"h-{hours}" if hours else "h0"]=base.extract_one(issue,masks,sub)
            rows.append({"anchor_issuance_time":anchor.isoformat(),"solar_geometry":solar,"snapshots":snaps,"trends":trend_bundle(snaps)})
    out={
      "status":"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
      "generated":dt.datetime.now(dt.timezone.utc).isoformat(),
      "purpose":"2024-only nighttime GOES-18 marine-layer persistence/erosion trend engineering pilot.",
      "source":{"provider":"NOAA/NESDIS","bucket":base.BUCKET,"product":base.PRODUCT,"satellite":"GOES-18","bands":list(base.BANDS)},
      "mask_version":masks["version"],
      "night_guard":{"domain_center":{"lat":center_lat,"lon":center_lon},"maximum_solar_elevation_deg":args.night_max_solar_elevation,"reason":"avoid interpreting daylight reflected-solar C07 as NOAA nighttime 10.3-3.9 low-cloud/fog signal"},
      "rules":{"development_year":2024,"future_imagery_used":False,"verifying_winds_loaded":False,"fire_outcome_used":False,"model_coefficients_changed":False,"thresholds_frozen":False,"nighttime_only":True},
      "rows":rows
    }
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    with open(args.out,"w") as f:json.dump(out,f,indent=2);f.write("\n")
    print(json.dumps({"anchors":len(rows),"night_guard":out["night_guard"],"summary":[{"anchor":r["anchor_issuance_time"],"solar":r["solar_geometry"],"coast_btd13_07":r["trends"]["domains"]["south_coast_strip"]["btd_c13_minus_c07_k"]} for r in rows]},indent=2))

if __name__=="__main__":main()
