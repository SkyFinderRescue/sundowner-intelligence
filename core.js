"use strict";
const TZ="America/Los_Angeles", APP_VERSION="SI-2.1.0", STALE_MIN=180, EVENT_SIGNAL=18, STRONG_SIGNAL=17;
const Z=[
 {name:"Gaviota",lat:34.48,lon:-120.23,regime:"western",targetDir:345,obsRadius:32},
 {name:"Refugio",lat:34.49,lon:-120.07,regime:"western",targetDir:355,obsRadius:28},
 {name:"Goleta",lat:34.45,lon:-119.83,regime:"hybrid",targetDir:5,obsRadius:24},
 {name:"San Marcos Pass",lat:34.51,lon:-119.80,regime:"hybrid",targetDir:10,obsRadius:22},
 {name:"Mission Canyon",lat:34.47,lon:-119.71,regime:"eastern",targetDir:15,obsRadius:20},
 {name:"Montecito",lat:34.45,lon:-119.63,regime:"eastern",targetDir:20,obsRadius:18},
 {name:"Toro Canyon",lat:34.44,lon:-119.57,regime:"eastern",targetDir:20,obsRadius:18},
 {name:"Carpinteria",lat:34.42,lon:-119.52,regime:"eastern",targetDir:25,obsRadius:20}
];
const FALLBACK_STATIONS=[
 {id:"GVTC1",name:"Gaviota RAWS",lat:34.4883,lon:-120.2358,type:"RAWS"},
 {id:"RHWC1",name:"Santa Ynez - Refugio Hills RAWS",lat:34.5166,lon:-120.0753,type:"RAWS"},
 {id:"MPWC1",name:"Goleta - San Marcos Pass RAWS",lat:34.4913,lon:-119.7963,type:"RAWS"},
 {id:"LPOC1",name:"Los Prietos RAWS",lat:34.5444,lon:-119.7914,type:"RAWS"},
 {id:"SBVC1",name:"Santa Barbara Botanic Garden RAWS",lat:34.4558,lon:-119.7056,type:"RAWS"},
 {id:"MOIC1",name:"Montecito RAWS #2",lat:34.4450,lon:-119.62583,type:"RAWS"},
 {id:"MTIC1",name:"Montecito Hills RAWS",lat:34.461,lon:-119.649,type:"RAWS"},
 {id:"CXPC1",name:"Carpinteria RAWS",lat:34.45,lon:-119.54,type:"RAWS"},
 {id:"FGMC1",name:"Figueroa Mountain RAWS",lat:34.7344,lon:-120.0067,type:"RAWS"},
 {id:"TSQC1",name:"Tepusquet RAWS",lat:34.9198,lon:-120.181,type:"RAWS"},
 {id:"VDBC1",name:"Vandenberg RAWS",lat:34.7586,lon:-120.4861,type:"RAWS"},
 {id:"SRIC1",name:"Santa Rosa Island RAWS",lat:33.98,lon:-120.08,type:"RAWS"}
];
const KNOWN_RAWS=new Set(FALLBACK_STATIONS.map(s=>s.id));
const HV=["temperature_2m","relative_humidity_2m","pressure_msl","cloud_cover_low","wind_speed_10m","wind_direction_10m","wind_gusts_10m","boundary_layer_height","lifted_index","shortwave_radiation","relative_humidity_925hPa","wind_speed_850hPa","wind_direction_850hPa","temperature_850hPa","wind_speed_700hPa","wind_direction_700hPa","vertical_velocity_850hPa"];
let map=null,zoneMarkers={},stationMarkers=[],R=[],ST=[],CATALOG=[],PS=null,OBS_PRESS=null,health={},focus=null,NWS_CACHE={},lastRefresh=null;
const $=x=>document.getElementById(x), clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), sig=x=>1/(1+Math.exp(-x)), rad=x=>x*Math.PI/180;
function finite(x){return Number.isFinite(Number(x))}function num(x){let n=Number(x);return Number.isFinite(n)?n:null}
function dirComponent(dir,target){if(!finite(dir))return 0;return Math.max(0,Math.cos(rad((((Number(dir)-target)+540)%360)-180)))}
function cat(p){return p>=60?"EXTREME":p>=35?"HIGH":p>=EVENT_SIGNAL?"ELEVATED":"LOW"}function col(p){return p>=60?"#eb5757":p>=35?"#f2994a":p>=EVENT_SIGNAL?"#f2c94c":"#35c98a"}
function compass(d){if(!finite(d))return"—";let a=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];return a[Math.round(((Number(d)%360)+360)%360/22.5)%16]}
function ft(t){if(!t)return"—";return new Date(t).toLocaleString("en-US",{weekday:"short",hour:"numeric",minute:"2-digit",timeZone:TZ})}
function ageMinutes(t){if(!t)return Infinity;let d=new Date(t);return Number.isFinite(d.getTime())?Math.max(0,(Date.now()-d.getTime())/60000):Infinity}
function age(t){let m=ageMinutes(t);if(!Number.isFinite(m))return"—";return m<60?Math.round(m)+"m":(m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d")}
function distMi(a,b){let lat=(a.lat+b.lat)/2*rad(1),dx=(a.lon-b.lon)*69.172*Math.cos(lat),dy=(a.lat-b.lat)*69.0;return Math.hypot(dx,dy)}
function fmtSigned(x,d=1){return finite(x)?`${Number(x)>=0?"+":""}${Number(x).toFixed(d)}`:"—"}
function statusClass(s){return s==="Fresh"?"fresh":s==="Stale"?"stale":"offline"}
function sourceHealth(name,value,level="info"){health[name]={value,level,time:new Date().toISOString()};renderHealth()}
async function json(url,opts={},attempts=2){let last;for(let a=0;a<attempts;a++){let ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),12000);try{let r=await fetch(url,{...opts,signal:ctl.signal,cache:"no-store"});clearTimeout(to);if(!r.ok){let text="";try{text=(await r.text()).slice(0,140)}catch(_e){}throw Error(`${r.status}${text?": "+text:""}`)}return await r.json()}catch(e){clearTimeout(to);last=e;if(a+1<attempts)await new Promise(res=>setTimeout(res,350*(a+1)))} }throw last}
function choose(obj,patterns){if(!obj)return null;for(let [k,v] of Object.entries(obj)){if(v==null||v==="")continue;if(patterns.some(p=>p.test(k))){let n=Number(v);if(Number.isFinite(n))return{k,v:n}}}return null}
function chooseTime(obj){if(!obj)return null;for(let k of ["utc_valid","valid","valid_time","observation_time","timestamp","time"]){if(obj[k])return obj[k]}return null}
function isRawsMeta(s){return KNOWN_RAWS.has(s.id)||/\bRAWS\b|FIRE WEATHER/i.test(s.name||"")}
async function currentStation(meta){try{let j=await json(`https://mesonet.agron.iastate.edu/json/current.py?station=${encodeURIComponent(meta.id)}&network=CA_DCP`,{},2);let o=j.last_ob||j.data||j.current||j.observation||{};if(Array.isArray(o))o=o[0]||{};
 let wsp=choose(o,[/^windspeed\[kt\]$/i,/wind.*speed.*\[kt\]/i]), gust=choose(o,[/^gust\[kt\]$/i,/windgust\[kt\]/i,/gust.*\[kt\]/i]), dir=choose(o,[/winddirection\[deg\]/i,/wind.*dir/i,/^UD/i]), rh=choose(o,[/relativehumidity/i,/relh/i,/^XR/i]), temp=choose(o,[/airtemp\[F\]/i,/air.*temp/i,/^TA/i]), fm=choose(o,[/fuel.*moist/i,/moist.*fuel/i,/^MM/i]);
 if(!wsp)wsp=choose(o,[/^US/i,/wind.*speed/i]);if(!gust)gust=choose(o,[/^UP/i,/peak.*wind/i,/gust/i]);let wind=wsp?wsp.v:null,g=wsp&&/\[kt\]|knot/i.test(wsp.k)?wind*1.15078:wind;let gg=gust?gust.v:null;if(gust&&/\[kt\]|knot/i.test(gust.k))gg*=1.15078;
 let t=chooseTime(o),mins=ageMinutes(t),status=Number.isFinite(mins)?(mins<=STALE_MIN?"Fresh":"Stale"):"Offline";let detectedRaws=isRawsMeta(meta)||(!!fm&&finite(g)&&finite(dir?.v));
 return{...meta,type:detectedRaws?"RAWS":(meta.type||"County DCP"),wind:g,gust:gg,dir:dir?dir.v:null,rh:rh?rh.v:null,temp:temp?temp.v:null,fuelMoist:fm?fm.v:null,time:t,status,fresh:status==="Fresh"&&finite(g)&&finite(dir?.v)}
 }catch(e){return{...meta,type:isRawsMeta(meta)?"RAWS":(meta.type||"County DCP"),wind:null,gust:null,dir:null,rh:null,temp:null,fuelMoist:null,time:null,status:"Offline",fresh:false,error:String(e.message||e)}}}
async function discoverCountyStations(){let cached=null;try{cached=JSON.parse(localStorage.getItem("sundowner:countyStations:v2"));if(cached&&Date.now()-cached.saved<864e5&&Array.isArray(cached.items)&&cached.items.length)sourceHealth("County station catalog",`${cached.items.length} cached; refreshing`,"info")}catch(_e){}
 let items=[];try{let gj=await json("https://mesonet.agron.iastate.edu/geojson/network.py?network=CA_DCP",{},2);for(let f of gj.features||[]){let p=f.properties||{},c=f.geometry?.coordinates||[],id=p.sid||p.id||p.station||p.stid,name=p.sname||p.name||p.station_name||id,county=String(p.county||p.county_name||"").trim().toLowerCase(),lon=num(c[0]),lat=num(c[1]);if(!id||!finite(lat)||!finite(lon))continue;let countyMatch=county.includes("santa barbara"),countyMetaKnown=!!county,countyEnvelope=(lat>=34.30&&lat<=35.15&&lon>=-120.75&&lon<=-119.25)||(lat>=33.80&&lat<=34.15&&lon>=-120.70&&lon<=-119.20);if(countyMatch||(!countyMetaKnown&&countyEnvelope))items.push({id:String(id),name:String(name||id),lat:Number(lat),lon:Number(lon),type:/RAWS/i.test(String(name))?"RAWS":"County DCP",archiveEnd:p.archive_end||p.end||null})}
 if(!items.length)throw Error("County field returned no stations");sourceHealth("County station catalog",`${items.length} stations discovered from full CA_DCP catalog`,"good");try{localStorage.setItem("sundowner:countyStations:v2",JSON.stringify({saved:Date.now(),items}))}catch(_e){}
 }catch(e){items=cached?.items||[];sourceHealth("County station catalog",items.length?`Discovery failed; ${items.length} cached stations retained`:`Discovery failed; using verified fallback stations`,items.length?"warn":"err")}
 let m=new Map(items.map(s=>[s.id,{...s}]));for(let s of FALLBACK_STATIONS){if(!m.has(s.id))m.set(s.id,{...s,fallback:true});else if(s.type==="RAWS")m.set(s.id,{...m.get(s.id),type:"RAWS"})}
 return [...m.values()].sort((a,b)=>(a.type==="RAWS"?-1:1)-(b.type==="RAWS"?-1:1)||a.name.localeCompare(b.name))}
async function loadStations(){CATALOG=await discoverCountyStations();let out=new Array(CATALOG.length),i=0,workers=Math.min(10,CATALOG.length);async function worker(){while(i<CATALOG.length){let idx=i++;out[idx]=await currentStation(CATALOG[idx])}}await Promise.all(Array.from({length:workers},worker));ST=out;let raws=ST.filter(s=>s.type==="RAWS").length,fresh=ST.filter(s=>s.fresh).length,rawFresh=ST.filter(s=>s.type==="RAWS"&&s.fresh).length;sourceHealth("County observations",`${fresh}/${ST.length} fresh wind stations • ${rawFresh}/${raws} RAWS fresh`,fresh?"good":"warn");return ST}
function freshestStations(){return ST.filter(s=>s.fresh&&ageMinutes(s.time)<=STALE_MIN)}
function stationInfluence(z,s){let d=distMi(z,s),distance=Math.exp(-Math.pow(d/Math.max(z.obsRadius,10),1.35)),freshness=Math.exp(-ageMinutes(s.time)/125),raws=s.type==="RAWS"?1.22:1,quality=finite(s.gust)?1.05:1;return distance*freshness*raws*quality}
function obsSignal(z){let sum=0,w=0,n=0;for(let s of freshestStations()){let ws=Math.max(Number(s.gust)||0,Number(s.wind)||0);if(!ws||!finite(s.dir))continue;let wt=stationInfluence(z,s);if(wt<.015)continue;let component=ws*dirComponent(s.dir,z.targetDir),v=clamp((component-9)/31,0,1);sum+=v*wt;w+=wt;n++}return{signal:w?clamp(sum/w,0,1):0,count:n,weight:w}}
function obsGustCorrection(z){let vals=[];for(let s of freshestStations()){let ws=Math.max(Number(s.gust)||0,Number(s.wind)||0);if(!ws)continue;let d=distMi(z,s);if(d>Math.max(35,z.obsRadius*1.6))continue;let wt=stationInfluence(z,s);vals.push({v:ws,w:wt})}let w=vals.reduce((a,x)=>a+x.w,0);return{gust:w?vals.reduce((a,x)=>a+x.v*x.w,0)/w:null,weight:w,count:vals.length}}
function fuelSignal(){let vals=freshestStations().map(s=>num(s.fuelMoist)).filter(x=>finite(x)&&x>0&&x<80).sort((a,b)=>a-b);if(!vals.length)return{value:null,signal:.35,n:0};let m=vals[Math.floor(vals.length/2)];return{value:m,signal:clamp((16-m)/11,0,1),n:vals.length}}
