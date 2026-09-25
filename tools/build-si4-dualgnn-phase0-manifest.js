"use strict";
const fs=require("fs"), crypto=require("crypto");
const HREF=process.env.HREF_CACHE||"/tmp/si4-href-qc/si4-href-ensemble-2024-source-qc.json";
const OUT=process.env.OUT||"research/si4-dualgnn-phase0-manifest.json";
const NODES=[
 {name:"Gaviota",station:"GVTC1",lat:34.48,lon:-120.23,hrefPoint:"western_channel"},
 {name:"Refugio",station:"RHWC1",lat:34.49,lon:-120.07,hrefPoint:"western_channel"},
 {name:"San Marcos Pass",station:"MPWC1",lat:34.51,lon:-119.80,hrefPoint:"santa_ynez_valley"},
 {name:"Montecito",station:"MTIC1",lat:34.45,lon:-119.63,hrefPoint:"santa_barbara_lee"},
 {name:"Carpinteria",station:"CXPC1",lat:34.42,lon:-119.52,hrefPoint:"santa_barbara_lee"}
];
const hav=(a,b)=>{const R=6371,rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon),q=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(q));};
const stable=x=>JSON.stringify(x,Object.keys(x).sort());
const sha=x=>crypto.createHash("sha256").update(typeof x==="string"?x:JSON.stringify(x)).digest("hex");
const x=JSON.parse(fs.readFileSync(HREF,"utf8"));
if(x.status!=="RESEARCH_ONLY_2024_DEVELOPMENT"||x.phase!=="full_2024_href_member_archive_source_qc_repaired") throw Error("bad HREF source-QC identity");
if(x.science_scoring_performed!==false||x.observations_or_outcomes_used!==false||x.holdout_2025_loaded!==false||x.production_change_authorized!==false) throw Error("firewall failed");
if(Number(x.row_count)!==35750||(x.rows||[]).length!==35750) throw Error("unexpected row count");
if((x.rows||[]).some(r=>!String(r.valid_time).startsWith("2024-")||Number(r.issuance_to_valid_lead_h)!==24)) throw Error("2024/F24 firewall failed");
const members=[...new Set(x.rows.map(r=>r.member))].sort();
const points=[...new Set(x.rows.map(r=>r.point))].sort();
const groups=new Map();
for(const r of x.rows){const k=`${r.valid_time}|${r.point}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
const incomplete=[...groups].filter(([,a])=>a.length!==10).map(([k,a])=>({key:k,n:a.length}));
const edges=[];
for(let i=0;i<NODES.length;i++)for(let j=i+1;j<NODES.length;j++){const d=hav(NODES[i],NODES[j]);if(d<50)edges.push({a:NODES[i].station,b:NODES[j].station,distance_km:Number(d.toFixed(3))});}
edges.sort((a,b)=>`${a.a}|${a.b}`.localeCompare(`${b.a}|${b.b}`));
const nodeDegree=Object.fromEntries(NODES.map(n=>[n.station,edges.filter(e=>e.a===n.station||e.b===n.station).length]));
const isolated=Object.entries(nodeDegree).filter(([,d])=>d===0).map(([k])=>k);
const manifest={
 status:"RESEARCH_ONLY_PHASE0_NO_OUTCOME_SCORING",
 candidate_family:"dualgnn_composite_loss_v1",
 generated_at:new Date().toISOString(),
 source:{run_id:String(x.provenance?.source_qc_run_id||""),upstream_run_id:String(x.provenance?.github_run_id||""),rows:x.row_count,member_count:members.length,point_count:points.length},
 firewall:{year:2024,lead_hours:24,holdout_2025_loaded:false,observations_or_outcomes_used:false,production_change_authorized:false},
 graph:{threshold_km:50,nodes:NODES,edges,node_degree:nodeDegree,isolated_nodes:isolated,node_hash:sha(NODES),edge_hash:sha(edges)},
 archive_qc:{members,points,group_count:groups.size,incomplete_group_count:incomplete.length,incomplete_groups:incomplete.slice(0,20)},
 frozen:{loss:"0.9 ES + 0.1 normalized VS",variogram_order:0.5,architecture:"GraphSAGE mean; 1 hidden layer; 1024 hidden; batchnorm; ReLU; dropout 0.2",batch_size:64,learning_rate:0.03,optimizer:"Adam PyTorch defaults; no scheduler",max_epochs:500,early_stopping_patience:15,training_window_days:30,validation_fraction:0.30},
 phase0_pass: incomplete.length===0 && isolated.length===0 && members.length===10 && points.length===5
};
fs.mkdirSync(require("path").dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({phase0_pass:manifest.phase0_pass,rows:manifest.source.rows,members:members.length,points:points.length,edges:edges.length,isolated},null,2));
if(!manifest.phase0_pass) process.exit(2);
