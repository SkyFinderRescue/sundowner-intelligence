"use strict";

const fs = require("fs");
const path = require("path");

const OUT = process.env.OUT || "research/si4-archive-probe.json";
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS || 20000);

function utcDayOfYear(date){
  const start = Date.UTC(date.getUTCFullYear(),0,0);
  return String(Math.floor((date.getTime()-start)/86400000)).padStart(3,"0");
}
function xmlKeys(xml){ return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m=>m[1]); }
function xmlPrefixes(xml){ return [...xml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g)].map(m=>m[1]); }
async function fetchText(url,{method="GET"}={}){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
  try{
    const r=await fetch(url,{method,signal:ctl.signal,headers:{"User-Agent":"Sundowner-Intelligence-SI4-Archive-Probe/1.1"}});
    const text=method==="HEAD"?"":await r.text();
    return {ok:r.ok,status:r.status,url,headers:Object.fromEntries(r.headers),text};
  } finally { clearTimeout(timer); }
}
async function s3List(bucket,prefix,maxKeys=8,delimiter=null){
  let url=`https://${bucket}.s3.amazonaws.com/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${maxKeys}`;
  if(delimiter) url+=`&delimiter=${encodeURIComponent(delimiter)}`;
  const r=await fetchText(url), keys=r.ok?xmlKeys(r.text):[], prefixes=r.ok?xmlPrefixes(r.text):[];
  return {ok:r.ok&&(keys.length>0||prefixes.length>0),status:r.status,url,prefix,keys,prefixes,error:r.ok&&!keys.length&&!prefixes.length?"no keys/prefixes returned":null};
}
async function probe(){
  const now=new Date();
  const yyyy=now.getUTCFullYear(), mm=String(now.getUTCMonth()+1).padStart(2,"0"), dd=String(now.getUTCDate()).padStart(2,"0"), ymd=`${yyyy}${mm}${dd}`;
  const doy=utcDayOfYear(now), hh=String(now.getUTCHours()).padStart(2,"0"), rrfsCycle=String(Math.floor(now.getUTCHours()/6)*6).padStart(2,"0");

  const checks={};
  checks.hrrr_zarr_prs_fcst_2024 = await s3List("hrrrzarr","prs/20240401/20240401_00z_fcst.zarr/850mb/UGRD/");
  checks.hrrr_zarr_sfc_fcst_2024 = await s3List("hrrrzarr","sfc/20240401/20240401_00z_fcst.zarr/surface/GUST/");
  checks.noaa_hrrr_prs_f24_2024 = await s3List("noaa-hrrr-bdp-pds","hrrr.20240401/conus/hrrr.t00z.wrfprsf24.grib2",4);
  checks.noaa_hrrr_prs_f24_2025 = await s3List("noaa-hrrr-bdp-pds","hrrr.20250401/conus/hrrr.t00z.wrfprsf24.grib2",4);
  checks.noaa_hrrr_surface_f24_2024 = await s3List("noaa-hrrr-bdp-pds","hrrr.20240401/conus/hrrr.t00z.wrfsfcf24.grib2",4);

  checks.rrfs_root = await s3List("noaa-rrfs-pds","",25,"/");
  checks.rrfs_date_discovery = await s3List("noaa-rrfs-pds",ymd,25,"/");
  const rrfsPrefixes=[`rrfs.${ymd}/${rrfsCycle}/`,`rrfs_a/rrfs.${ymd}/${rrfsCycle}/`,`rrfs_public/rrfs.${ymd}/${rrfsCycle}/`];
  checks.rrfs_current_candidates=[];
  for(const prefix of rrfsPrefixes) checks.rrfs_current_candidates.push(await s3List("noaa-rrfs-pds",prefix,5));

  checks.goes18_cloud_candidates=[];
  for(const product of ["ABI-L2-ACHAC","ABI-L2-ACMC","ABI-L2-LSTC"]) checks.goes18_cloud_candidates.push(await s3List("noaa-goes18",`${product}/${yyyy}/${doy}/${hh}/`,4));
  checks.ndfd_current = await s3List("noaa-ndfd-pds","wmo/",5);

  const swexQc=`https://archive.eol.ucar.edu/docs/isf/projects/SWEX/isfs/qcdata/20220512.html`;
  const swex=await fetchText(swexQc);
  checks.swex_qc_20220512={ok:swex.ok&&/SWEX|Spd\.10m|RH\.2m|20220512/i.test(swex.text),status:swex.status,url:swexQc,bytes:swex.text.length};

  const summary={
    hrrr_zarr_prs_fcst_2024:checks.hrrr_zarr_prs_fcst_2024.ok,
    hrrr_zarr_sfc_fcst_2024:checks.hrrr_zarr_sfc_fcst_2024.ok,
    noaa_hrrr_prs_f24_2024:checks.noaa_hrrr_prs_f24_2024.ok,
    noaa_hrrr_prs_f24_2025:checks.noaa_hrrr_prs_f24_2025.ok,
    hrrr_fixed_lead_pressure:checks.hrrr_zarr_prs_fcst_2024.ok||(checks.noaa_hrrr_prs_f24_2024.ok&&checks.noaa_hrrr_prs_f24_2025.ok),
    hrrr_fixed_lead_surface:checks.hrrr_zarr_sfc_fcst_2024.ok||checks.noaa_hrrr_surface_f24_2024.ok,
    rrfs_current:checks.rrfs_current_candidates.some(x=>x.ok),
    rrfs_root_prefixes:checks.rrfs_root.prefixes.slice(0,12),
    goes18_cloud:checks.goes18_cloud_candidates.some(x=>x.ok),
    ndfd:checks.ndfd_current.ok,
    swex_qc:checks.swex_qc_20220512.ok
  };
  const out={generated:new Date().toISOString(),status:"RESEARCH_ONLY",summary,checks};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(summary,null,2));
  if(!summary.hrrr_fixed_lead_pressure||!summary.hrrr_fixed_lead_surface||!summary.swex_qc){
    console.error("Required SI-4 research archives are not yet verified; inspect artifact for provider-path details.");
    process.exitCode=2;
  }
}
probe().catch(e=>{console.error(e.stack||e);process.exit(1)});
