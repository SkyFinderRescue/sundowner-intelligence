const fs=require('fs');
const assert=require('assert');

const START=process.env.VALIDATION_START||'2025-03-01';
const END=process.env.VALIDATION_END||'2025-05-31';
const LEADS=(process.env.VALIDATION_LEADS||'1,2').split(',').map(Number).filter(x=>x>=1&&x<=2);
const PAIRS=[
  {name:'Gaviota',station:'GVTC1',lat:34.48,lon:-120.23,regime:'western',targetDir:345},
  {name:'Refugio',station:'RHWC1',lat:34.49,lon:-120.07,regime:'western',targetDir:355},
  {name:'San Marcos Pass',station:'MPWC1',lat:34.51,lon:-119.80,regime:'hybrid',targetDir:10},
  {name:'Montecito',station:'MTIC1',lat:34.45,lon:-119.63,regime:'eastern',targetDir:20},
  {name:'Carpinteria',station:'CXPC1',lat:34.42,lon:-119.52,regime:'eastern',targetDir:25}
];
const BASE_VARS=['relative_humidity_2m','wind_speed_10m','wind_direction_10m','wind_gusts_10m','shortwave_radiation','wind_speed_850hPa','wind_direction_850hPa','wind_speed_700hPa','wind_direction_700hPa'];
const AIRPORTS={sba:[34.4262,-119.8404],bfl:[35.4336,-119.0568],smx:[34.8993,-120.4576]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sig=x=>1/(1+Math.exp(-x)),rad=x=>x*Math.PI/180;
const dirComponent=(dir,target)=>Math.max(0,Math.cos(rad((((Number(dir)-target)+540)%360)-180)));

async function text(url,attempts=3){let last;for(let i=0;i<attempts;i++){const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000);try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'Sundowner-Intelligence-Validation/2.0'}});clearTimeout(tm);if(!r.ok)throw Error(`${r.status} ${await r.text()}`);return await r.text()}catch(e){clearTimeout(tm);last=e;if(i+1<attempts)await new Promise(r=>setTimeout(r,1000*(i+1)))}}throw last}
async function json(url){return JSON.parse(await text(url))}
function csvRows(s){const lines=s.trim().split(/\r?\n/);if(lines.length<2)return[];const h=lines[0].split(',');return lines.slice(1).map(line=>{const v=line.split(','),o={};h.forEach((k,i)=>o[k]=v[i]??'');return o})}
async function hads(station){const u=new URL('https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py');u.search=new URLSearchParams({stations:station,network:'CA_DCP',sts:`${START}T00:00Z`,ets:`${END}T23:59Z`,what:'txt',delim:'comma'});const rows=csvRows(await text(u));const out=new Map();for(const r of rows){const speed=Number(r.USIRGZZ),gust=Number(r.UPHRGZZ),dir=Number(r.UDIRGZZ);if(!r.utc_valid||!Number.isFinite(speed)||!Number.isFinite(dir))continue;const t=new Date(r.utc_valid.replace(' ','T')+'Z').toISOString().slice(0,13);out.set(t,{speed,gust:Number.isFinite(gust)?gust:null,dir});}return out}
function prevUrl(lat,lon,vars,lead,model='gfs_hrrr'){const u=new URL('https://previous-runs-api.open-meteo.com/v1/forecast');const hourly=vars.map(v=>`${v}_previous_day${lead}`);u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),start_date:START,end_date:END,hourly:hourly.join(','),wind_speed_unit:'mph',timezone:'GMT',models:model});return u}
async function previous(lat,lon,vars,lead,model){return json(prevUrl(lat,lon,vars,lead,model))}
function series(j,v,lead){return j.hourly?.[`${v}_previous_day${lead}`]||[]}
function makeIndex(j){return new Map((j.hourly?.time||[]).map((t,i)=>[t.slice(0,13),i]))}
function auc(pairs){const a=pairs.filter(x=>Number.isFinite(x.p)).sort((a,b)=>b.p-a.p),pos=a.filter(x=>x.y).length,neg=a.length-pos;if(!pos||!neg)return null;let rank=0,tp=0;for(const r of a){if(r.y)tp++;else rank+=tp}return rank/(pos*neg)}
function metrics(pairs,cut=.5){let TP=0,FN=0,FP=0,TN=0;for(const r of pairs){const y=r.p>=cut;if(y&&r.y)TP++;else if(!y&&r.y)FN++;else if(y&&!r.y)FP++;else TN++}return{n:pairs.length,events:TP+FN,auc:auc(pairs),pod:TP/(TP+FN||1),far:FP/(TP+FP||1),specificity:TN/(TN+FP||1)}}
function probability(v,z){let westP=sig((-v.s-1.8)/.8),eastP=sig((-v.b-1.2)/1.0),press=z.regime==='western'?westP:z.regime==='eastern'?eastP:Math.max(westP,eastP),r8=clamp((v.w8*dirComponent(v.d8,z.targetDir)-12)/30,0,1),r7=clamp((v.w7*dirComponent(v.d7,z.targetDir)-16)/36,0,1),surf=clamp((v.g*dirComponent(v.d,z.targetDir)-12)/34,0,1),dry=clamp((36-v.rh)/29,0,1),hour=Number(v.time.slice(11,13)),eve=(hour>=16||hour<=5)?1:0,tw=eve?1:clamp((350-v.sol)/350,0,1);return sig(-4.05+1.9*press+1.32*r8+.48*r7+.72*surf+.52*dry+.52*tw+.28*eve)}
function strongProbability(v,p,z){let westGrad=sig((-v.s-3.4)/.45),eastGrad=sig((-v.b-4.2)/.55),grad=z.regime==='western'?westGrad:z.regime==='eastern'?eastGrad:Math.max(westGrad,eastGrad),gust=sig((v.g-35)/3.8),r8=clamp((v.w8*dirComponent(v.d8,z.targetDir)-12)/30,0,1),r7=clamp((v.w7*dirComponent(v.d7,z.targetDir)-16)/36,0,1),aloft=.68*r8+.32*r7,base=clamp((p-.12)/.72,0,1);return sig(-4.25+1.75*grad+1.55*gust+.95*aloft+.35*base)}

(async()=>{
 const report={generated:new Date().toISOString(),period:{start:START,end:END},method:'Independent RAWS verification against Open-Meteo Previous Runs fixed-lead HRRR forecasts. No live observation assimilation is used in forecast probabilities.',leads:{}};
 for(const lead of LEADS){
  const ap={};for(const [k,[lat,lon]] of Object.entries(AIRPORTS))ap[k]=await previous(lat,lon,['pressure_msl'],lead,'gfs_hrrr');
  const ai={};for(const [k,j] of Object.entries(ap))ai[k]=makeIndex(j);
  report.leads[`${lead*24}h`]={zones:{}};
  for(const z of PAIRS){
   const [obs,m]=await Promise.all([hads(z.station),previous(z.lat,z.lon,BASE_VARS,lead,'gfs_hrrr')]);const mi=makeIndex(m),pairs=[],strongPairs=[],gustErrors=[];
   for(const [t,o] of obs){const i=mi.get(t);if(i==null)continue;const pi=ai.sba.get(t),bi=ai.bfl.get(t),si=ai.smx.get(t);if(pi==null||bi==null||si==null)continue;const val=(v)=>Number(series(m,v,lead)[i]);const sba=Number(series(ap.sba,'pressure_msl',lead)[pi]),bfl=Number(series(ap.bfl,'pressure_msl',lead)[bi]),smx=Number(series(ap.smx,'pressure_msl',lead)[si]);const v={time:t,b:sba-bfl,s:sba-smx,rh:val('relative_humidity_2m'),g:val('wind_gusts_10m'),d:val('wind_direction_10m'),w8:val('wind_speed_850hPa'),d8:val('wind_direction_850hPa'),w7:val('wind_speed_700hPa'),d7:val('wind_direction_700hPa'),sol:val('shortwave_radiation')};if(!Object.values(v).every((x,k)=>k===0||Number.isFinite(x)))continue;const p=probability(v,z),sp=strongProbability(v,p,z),actualComp=o.speed*dirComponent(o.dir,z.targetDir),y=actualComp>=20,sy=(Math.max(o.gust||0,o.speed)>=35)&&dirComponent(o.dir,z.targetDir)>.5;pairs.push({p,y});strongPairs.push({p:sp,y:sy});if(Number.isFinite(o.gust)&&Number.isFinite(v.g))gustErrors.push(Math.abs(v.g-o.gust));}
   const event=metrics(pairs,.18),strong=metrics(strongPairs,.5),mae=gustErrors.length?gustErrors.reduce((a,b)=>a+b,0)/gustErrors.length:null;report.leads[`${lead*24}h`].zones[z.name]={station:z.station,event,strong,gustMAE:mae};console.log(`${lead*24}h ${z.name}/${z.station}: n=${event.n} events=${event.events} AUC=${event.auc?.toFixed(3)} POD=${event.pod.toFixed(3)} FAR=${event.far.toFixed(3)} strongAUC=${strong.auc?.toFixed(3)} gustMAE=${mae?.toFixed(1)}`);
  }
 }
 fs.mkdirSync('validation',{recursive:true});fs.writeFileSync('validation/fixed-lead-latest.json',JSON.stringify(report,null,2)+'\n');
 const all=[];for(const l of Object.values(report.leads))for(const z of Object.values(l.zones))all.push(z.event);assert.ok(all.some(x=>x.n>100),'Validation produced too few matched observations');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
