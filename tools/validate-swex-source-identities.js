"use strict";

const fs=require("fs");
const path=require("path");

const INVENTORY=process.env.INVENTORY||"research/swex-catalog-inventory.json";
const OUT=process.env.OUT||"research/swex-source-identity-validation.json";

const EXPECTED={
  "multi-network-5mb-vertical-resolution-sounding-composite2":{
    title:"Multi-Network 5mb Vertical Resolution Sounding Composite",
    doi:"https://doi.org/10.26023/CM8F-TNHW-HX01"
  },
  "multi-network-composite-highest-resolution-radiosonde-data7":{
    title:"Multi-Network Composite Highest Resolution Radiosonde Data",
    doi:"https://doi.org/10.26023/TN83-Q6BW-AB0D"
  },
  "iss-radiosonde-data-rancho-alegre-site":{
    title:"ISS Radiosonde Data - Rancho Alegre Site",
    doi:"https://doi.org/10.26023/J6P8-7SYD-XP0M"
  },
  "iss-radiosonde-data-sedgwick-site":{
    title:"ISS Radiosonde Data - Sedgwick Site",
    doi:"https://doi.org/10.26023/H5TV-Y54J-R010"
  },
  "iss-radar-wind-profiler-products":{
    title:"ISS Radar Wind Profiler Products",
    doi:"https://doi.org/10.26023/2659-AF70-3009"
  },
  "isfs-surface-meteorology-and-flux-products-georeferenced":{
    title:"ISFS Surface Meteorology and Flux Products - georeferenced",
    doi:"https://doi.org/10.26023/XDKV-QXC2-1Y0J"
  },
  "iss-surface-meteorology-products":{
    title:"ISS Surface Meteorology Products",
    doi:"https://doi.org/10.26023/FHZJ-PF5C-W602"
  },
  "iss-wind-lidar-data-products":{
    title:"ISS Wind Lidar Data Products",
    doi:"https://doi.org/10.26023/Q28P-EEBS-0Y0E"
  },
  "iss-ceilometer-cl31-data-products":{
    title:"ISS Ceilometer CL31 Data Products",
    doi:"https://doi.org/10.26023/RB11-0HZ1-QV0F"
  },
  "iss-ceilometer-cl51-data-products":{
    title:"ISS Ceilometer CL51 Data Products",
    doi:"https://doi.org/10.26023/VY3V-71AR-150A"
  },
  "iss-ceilometer-cl61-data-products":{
    title:"ISS Ceilometer CL61 Data Products",
    doi:"https://doi.org/10.26023/AP30-C79D-6T0G"
  }
};

const FORBIDDEN_SWEX_PROFILER_DOI="https://doi.org/10.26023/ZH7Z-GRWB-AV0F";

function normalizeUrl(u){return String(u||"").trim().replace(/\/$/,"");}
function main(){
  const inv=JSON.parse(fs.readFileSync(INVENTORY,"utf8"));
  const byId=new Map((inv.results||[]).map(r=>[r.id,r]));
  const checks=[];
  let failed=0;
  for(const[id,exp]of Object.entries(EXPECTED)){
    const row=byId.get(id);
    const urls=(row?.resources||[]).map(r=>normalizeUrl(r.url));
    const ok=!!row?.ok && row.title===exp.title && urls.includes(normalizeUrl(exp.doi));
    const forbidden=id==="iss-radar-wind-profiler-products" && urls.includes(normalizeUrl(FORBIDDEN_SWEX_PROFILER_DOI));
    const finalOk=ok&&!forbidden;
    if(!finalOk)failed++;
    checks.push({id,ok:finalOk,expected_title:exp.title,observed_title:row?.title??null,expected_doi:exp.doi,observed_resource_urls:urls,forbidden_profiler_doi_present:forbidden});
  }
  const profiler=checks.find(x=>x.id==="iss-radar-wind-profiler-products");
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    authority:"NSF NCAR/EOL metadata as exposed by UCAR DASH/CKAN",
    rules:{
      exact_dataset_identity_required:true,
      missing_values:"null/fail closed",
      future_observation_leakage:false,
      fire_outcome_used:false,
      profiler_source_must_be_swex_600_034:true,
      profiler_m2hats_doi_forbidden:true
    },
    summary:{checked:checks.length,failed,passed:checks.length-failed},
    profiler_guard:{expected_doi:profiler?.expected_doi||null,forbidden_doi:FORBIDDEN_SWEX_PROFILER_DOI,ok:!!profiler?.ok},
    checks
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify(out.summary));
  if(failed)process.exit(2);
}

try{main();}catch(e){console.error(e.stack||e);process.exit(1);}
