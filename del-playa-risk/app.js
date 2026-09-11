(() => {
'use strict';

const P = window.DEL_PLAYA_PROPERTIES || [];
const $ = id => document.getElementById(id);
const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
const fmt = (n,d=1) => Number.isFinite(n) ? n.toFixed(d) : '—';
const COLORS = {Low:'#35c98a', Elevated:'#e5c74f', High:'#f09b42', Severe:'#ef5b4f', Extreme:'#c83bff'};
const state = {weather:null, marine:null, tides:null, alerts:[], ndbc:null, errors:[], selected:6745, model:new Map()};

function level(score){
  if(score >= 80) return 'Extreme';
  if(score >= 60) return 'Severe';
  if(score >= 40) return 'High';
  if(score >= 25) return 'Elevated';
  return 'Low';
}
function localDateCompact(){
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${v.year}${v.month}${v.day}`;
}
async function fetchJSON(url, ms=9000){
  const c = new AbortController(); const t = setTimeout(()=>c.abort(),ms);
  try{ const r=await fetch(url,{signal:c.signal,headers:{'Accept':'application/json'}}); if(!r.ok) throw new Error(`${r.status}`); return await r.json(); }
  finally{clearTimeout(t)}
}
async function fetchText(url, ms=7000){
  const c = new AbortController(); const t = setTimeout(()=>c.abort(),ms);
  try{ const r=await fetch(url,{signal:c.signal}); if(!r.ok) throw new Error(`${r.status}`); return await r.text(); }
  finally{clearTimeout(t)}
}
function parseNDBC(txt){
  const lines=txt.trim().split(/\n/).filter(Boolean); if(lines.length<3) return null;
  const headers=lines[0].replace(/^#/,'').trim().split(/\s+/);
  const vals=lines[2].trim().split(/\s+/);
  const o={}; headers.forEach((h,i)=>o[h]=vals[i]);
  return {
    wave:+o.WVHT*3.28084, period:+o.DPD, direction:+o.MWD,
    observed:`${o.YY}-${o.MM}-${o.DD} ${o.hh}:${o.mm} UTC`
  };
}
function toMs(t){
  return new Date(t).getTime();
}
function sumPrecip(pastHours, futureHours){
  const h=state.weather?.hourly; if(!h?.time) return 0;
  const now=Date.now(), lo=now-pastHours*3600000, hi=now+futureHours*3600000;
  return h.time.reduce((s,t,i)=>{const ms=toMs(t); return (ms>=lo && ms<=hi)?s+(+h.precipitation?.[i]||0):s},0);
}
function marineStats(hours){
  const h=state.marine?.hourly;
  const out={maxWave:0,maxSwell:0,period:0,direction:null,duration7:0};
  if(!h?.time) return out;
  const now=Date.now(), hi=now+hours*3600000;
  h.time.forEach((t,i)=>{
    const ms=toMs(t); if(ms<now-3600000||ms>hi)return;
    const wh=+h.wave_height?.[i]||0, wp=+h.wave_period?.[i]||0, wd=+h.wave_direction?.[i];
    if(wh>out.maxWave){out.maxWave=wh;out.period=wp;out.direction=Number.isFinite(wd)?wd:null}
    out.maxSwell=Math.max(out.maxSwell,+h.swell_wave_height?.[i]||0);
    if(wh>=7) out.duration7++;
  });
  if(state.ndbc && Number.isFinite(state.ndbc.wave) && state.ndbc.wave>out.maxWave){
    out.maxWave=state.ndbc.wave;
    out.period=Number.isFinite(state.ndbc.period)?state.ndbc.period:out.period;
    out.direction=Number.isFinite(state.ndbc.direction)?state.ndbc.direction:out.direction;
  }
  return out;
}
function tideStats(hours){
  const arr=state.tides?.predictions||[]; const now=Date.now(), hi=now+hours*3600000;
  let max=-99, when=null;
  arr.forEach(x=>{if(x.type!=='H')return; const ms=new Date(x.t.replace(' ','T')).getTime(); if(ms>=now-3600000&&ms<=hi&&+x.v>max){max=+x.v;when=x.t}});
  return {maxHigh:max>-90?max:null,when};
}
function exposureFactor(deg){
  if(!Number.isFinite(deg)) return .8;
  const d=((deg%360)+360)%360;
  if(d>=180&&d<=255) return 1.0;
  if((d>=150&&d<180)||(d>255&&d<=285)) return .85;
  return .65;
}
function envScore(hours){
  const rain7=sumPrecip(168,0);
  const rainFuture=sumPrecip(0,Math.min(hours,168));
  const m=marineStats(hours), t=tideStats(hours);
  const rainAnte=clamp(rain7/4*10,0,10);
  const rainFc=clamp(rainFuture/4*12,0,12);
  const perMult=clamp((m.period||8)/14,.65,1.25);
  const wave=clamp((m.maxWave-3)/10*18,0,18)*perMult*exposureFactor(m.direction);
  const tide=clamp(((t.maxHigh??4.5)-4.5)/2.4*10,0,10);
  const duration=clamp(m.duration7/24*5,0,5);
  let coincidence=0;
  if(m.maxWave>=10 && (t.maxHigh??0)>=5.8 && (rain7+rainFuture)>=2) coincidence=10;
  else if(m.maxWave>=8 && (t.maxHigh??0)>=5.5) coincidence=6;
  else if(m.maxWave>=7 || (t.maxHigh??0)>=6) coincidence=3;
  const hazardText=(state.alerts||[]).map(a=>a.event||'').join(' ').toLowerCase();
  let advisory=0;
  if(/high surf|coastal flood/.test(hazardText)) advisory+=3;
  if(/flood watch|flash flood|winter storm|heavy rain/.test(hazardText)) advisory+=2;
  const score=clamp(rainAnte+rainFc+wave+tide+duration+coincidence+advisory,0,65);
  return {score,rain7,rainFuture,...m,...t,coincidence,advisory};
}
function propertyBase(p){ return clamp((p.base||16)*0.60,4,22); }
function riskFor(p,hours){
  const env=envScore(hours);
  const score=clamp(propertyBase(p)+env.score,0,100);
  return {score,level:level(score),env};
}
function retreatRange(env){
  if(env<15) return [0,1];
  if(env<25) return [0,3];
  if(env<40) return [2,6];
  if(env<52) return [5,12];
  return [10,18];
}
function consequence(p,r){
  const [lo,hi]=retreatRange(r.env.score);
  const prefix=`If a localized bluff failure initiates directly in front of this parcel, the current scenario supports roughly ${lo}–${hi}${hi>=18?'+':''} ft of single-event retreat potential as a screening range — not a surveyed forecast. `;
  if(Number.isFinite(p.setback) && p.setbackCurrent){
    if(hi>=p.setback) return prefix+`That envelope can reach or pass the documented ~${p.setback} ft building setback. Structural loss, emergency vacation or cutback becomes plausible and requires immediate professional/County evaluation.`;
    if(Number.isFinite(p.deck) && hi>=p.deck) return prefix+`The deck/patio setback (~${p.deck} ft) falls inside that envelope even though the main building line is farther landward. Deck/patio or bluff-top land loss is the leading concern.`;
    if(hi>=p.setback*.6) return prefix+`The modeled retreat would materially consume the remaining setback and could move the structure into a County intervention range.`;
    return prefix+`The documented building setback remains outside the modeled retreat envelope, but localized fracture geometry and foundation conditions can still produce worse outcomes.`;
  }
  if(r.level==='Extreme') return prefix+'Major bluff-top land/deck loss and possible structural involvement are plausible, but the current building setback is not yet loaded for this address.';
  if(r.level==='Severe') return prefix+'Multi-foot bluff loss, deck/patio damage and a rapid reduction in structural setback are plausible. Current survey geometry is needed to determine building involvement.';
  if(r.level==='High') return prefix+'Localized bluff sloughing and yard/deck impacts are plausible; structural involvement cannot be ranked precisely until current setback data are loaded.';
  if(r.level==='Elevated') return prefix+'Minor-to-localized bluff loss is possible, especially at existing cracks, undercut areas or drainage concentrations.';
  return prefix+'No major event signal is present, but chronic retreat and isolated sloughing remain possible.';
}
function factorRow(k,v){return `<div class="factor"><span>${k}</span><b>${v}</b></div>`}
function dirText(d){
  if(!Number.isFinite(d)) return '—';
  const n=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return `${n[Math.round(d/22.5)%16]} (${Math.round(d)}°)`;
}
function buildModels(){
  state.model.clear();
  P.forEach(p=>{
    state.model.set(+p.short,{current:riskFor(p,12),h72:riskFor(p,72),week:riskFor(p,168)});
  });
}
let map, markers=new Map();
function initMap(){
  map=L.map('map',{zoomControl:true}).setView([34.4099,-119.8643],16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap'}).addTo(map);
}
function markerStyle(r){return {radius:8,color:'#06101a',weight:2,fillColor:COLORS[r.level],fillOpacity:.95}}
function renderMap(){
  P.forEach(p=>{
    const r=state.model.get(+p.short)?.h72 || {level:'Low',score:0};
    let m=markers.get(+p.short);
    if(!m){
      m=L.circleMarker([p.lat,p.lon],markerStyle(r)).addTo(map).on('click',()=>select(+p.short));
      markers.set(+p.short,m);
    } else m.setStyle(markerStyle(r));
    m.bindTooltip(`${p.short} Del Playa · ${r.level} ${Math.round(r.score)}/100`,{direction:'top'});
  });
}
function renderCards(){
  const sorted=[...P].sort((a,b)=>(state.model.get(+b.short)?.h72.score||0)-(state.model.get(+a.short)?.h72.score||0));
  $('cards').innerHTML=sorted.map(p=>{
    const r=state.model.get(+p.short)?.h72 || {level:'Low',score:0};
    return `<div class="card" data-a="${p.short}"><div class="a">${p.short} Del Playa</div><div class="r" style="color:${COLORS[r.level]}">${r.level} · ${Math.round(r.score)}/100</div><div class="mini">${p.confidence} property-data confidence</div></div>`;
  }).join('');
  document.querySelectorAll('.card').forEach(c=>c.onclick=()=>select(+c.dataset.a));
}
function renderHealth(){
  const h=[];
  h.push(`<span class="pill ${state.weather?'ok':'bad'}">Weather ${state.weather?'live':'unavailable'}</span>`);
  h.push(`<span class="pill ${state.marine?'ok':'bad'}">Marine ${state.marine?'live':'unavailable'}</span>`);
  h.push(`<span class="pill ${state.tides?'ok':'bad'}">NOAA tide ${state.tides?'live':'unavailable'}</span>`);
  h.push(`<span class="pill ${state.ndbc?'ok':'warn'}">NDBC ${state.ndbc?'live':'fallback'}</span>`);
  h.push(`<span class="pill ${state.alerts.length?'warn':'ok'}">${state.alerts.length?state.alerts.length+' active NWS alert(s)':'No active NWS hazard modifier'}</span>`);
  $('health').innerHTML=h.join('');
}
function select(a){
  state.selected=a; $('addressSelect').value=String(a);
  const p=P.find(x=>+x.short===a); if(!p)return;
  const m=state.model.get(a) || {current:riskFor(p,12),h72:riskFor(p,72),week:riskFor(p,168)};
  $('focusAddress').textContent=p.address;
  $('riskWord').textContent=m.h72.level; $('riskWord').style.color=COLORS[m.h72.level];
  $('riskScore').innerHTML=`${Math.round(m.h72.score)}<small>/100</small>`;
  $('riskBar').style.width=`${m.h72.score}%`; $('riskBar').style.background=COLORS[m.h72.level];
  $('currentRisk').textContent=`${m.current.level} · ${Math.round(m.current.score)}`;
  $('weekRisk').textContent=`${m.week.level} · ${Math.round(m.week.score)}`;
  const rr=retreatRange(m.h72.env.score); $('retreat').textContent=`${rr[0]}–${rr[1]}${rr[1]>=18?'+':''} ft`;
  $('confidence').textContent=p.confidence;
  $('consequence').textContent=consequence(p,m.h72);
  $('propertyFactors').innerHTML=
    factorRow('County status',p.status)+
    factorRow('Building setback evidence',Number.isFinite(p.setback)?`~${p.setback} ft · ${p.setbackCurrent?'current verified':'historical/proposed only'}`:'Needs current survey')+
    factorRow('Deck/patio setback evidence',Number.isFinite(p.deck)?`~${p.deck} ft · ${p.deckCurrent?'current verified':'historical/proposed only'}`:'Not loaded')+
    factorRow('Property susceptibility component',`${propertyBase(p).toFixed(0)} / 22`);
  const e=m.h72.env;
  $('forcing').innerHTML=
    factorRow('Antecedent precipitation · past 7 days',`${fmt(e.rain7,2)} in`)+
    factorRow('Forecast precipitation · next 72 h',`${fmt(e.rainFuture,2)} in`)+
    factorRow('Max modeled wave · next 72 h',`${fmt(e.maxWave,1)} ft`)+
    factorRow('Peak period / direction',`${fmt(e.period,0)} sec · ${dirText(e.direction)}`)+
    factorRow('Max predicted high tide',e.maxHigh!=null?`${fmt(e.maxHigh,1)} ft MLLW`:'—')+
    factorRow('Hours ≥7-ft seas in window',`${e.duration7||0} h`)+
    factorRow('Compound-event modifier',`${Math.round(e.coincidence||0)} / 10`);
  $('history').textContent=`${p.history} Calibration anchors include the January 2017 6653/6663 failure (10–15 ft surf and ~15–16 ft localized bluff loss reported) and the February 2024 6741–6747 failure cluster.`;
  markers.get(a)?.openTooltip();
  if(window.innerWidth>980) map.panTo([p.lat,p.lon],{animate:true,duration:.3});
}
function populateSelect(){
  $('addressSelect').innerHTML=P.map(p=>`<option value="${p.short}">${p.address}</option>`).join('');
  $('addressSelect').onchange=e=>select(+e.target.value);
}
async function loadLive(){
  document.body.classList.add('loading'); state.errors=[]; state.weather=state.marine=state.tides=state.ndbc=null; state.alerts=[];
  $('liveLabel').textContent='Loading weather, surf and tides…';
  const lat=34.4100, lon=-119.8640;
  const weatherURL=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,precipitation_probability&past_days=7&forecast_days=7&timezone=America%2FLos_Angeles&precipitation_unit=inch`;
  const marineURL=`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&forecast_days=7&timezone=America%2FLos_Angeles&length_unit=imperial`;
  const tideURL=`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=del_playa_bluff_risk&begin_date=${localDateCompact()}&range=168&datum=MLLW&station=9411340&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
  const alertURL=`https://api.weather.gov/alerts/active?point=${lat},${lon}`;
  const ndbcURL='https://www.ndbc.noaa.gov/data/realtime2/46218.txt';
  const jobs=[
    fetchJSON(weatherURL).then(x=>state.weather=x).catch(()=>state.errors.push('weather')),
    fetchJSON(marineURL).then(x=>state.marine=x).catch(()=>state.errors.push('marine')),
    fetchJSON(tideURL).then(x=>state.tides=x).catch(()=>state.errors.push('tides')),
    fetchJSON(alertURL).then(x=>state.alerts=(x.features||[]).map(f=>f.properties)).catch(()=>state.errors.push('alerts')),
    fetchText(ndbcURL).then(x=>state.ndbc=parseNDBC(x)).catch(()=>state.errors.push('ndbc'))
  ];
  await Promise.allSettled(jobs);
  buildModels(); renderHealth(); renderMap(); renderCards(); select(state.selected);
  const n=4-state.errors.filter(x=>x!=='ndbc').length;
  $('liveLabel').textContent=n>=3?'Live coastal model loaded':'Model loaded with data gaps';
  $('updated').textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  document.body.classList.remove('loading');
}
function init(){
  initMap(); populateSelect();
  buildModels(); renderMap(); renderCards(); select(state.selected);
  $('refresh').onclick=loadLive;
  loadLive();
}
window.addEventListener('DOMContentLoaded',init);
})();
