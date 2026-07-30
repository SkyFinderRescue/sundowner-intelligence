const assert=require('assert');
(async()=>{
  const r=await fetch('https://mesonet.agron.iastate.edu/geojson/network.py?network=CA_DCP',{headers:{'User-Agent':'Sundowner-RAWS-Audit/2.1'}});
  assert.ok(r.ok,`catalog ${r.status}`);
  const j=await r.json();
  const sb=(j.features||[]).map(f=>{const p=f.properties||{},c=f.geometry?.coordinates||[];return{id:String(p.sid||p.id||p.station||p.stid||''),name:String(p.sname||p.name||p.station_name||''),county:String(p.county||p.county_name||''),lat:c[1],lon:c[0]}}).filter(s=>s.id&&s.county.toLowerCase().includes('santa barbara'));
  console.log(`SB_COUNT=${sb.length}`);
  for(const s of sb.sort((a,b)=>a.name.localeCompare(b.name))) console.log(`SB_STATION|${s.id}|${s.name}|${s.lat}|${s.lon}`);
  const keys=['GAVIOTA','REFUGIO','SAN MARCOS','MISSION','CARP','SANTA YNEZ','BURTON','TEPUS','CUYAMA','FIGUEROA','LOS PRIETOS','MONTECITO','BOTANIC','VANDENBERG'];
  for(const k of keys){const m=sb.filter(s=>(s.name+' '+s.id).toUpperCase().includes(k));console.log(`MATCH_${k.replace(/ /g,'_')}=${m.map(x=>x.id+':'+x.name).join(';')||'NONE'}`)}
  assert.ok(sb.length>0);
})().catch(e=>{console.error(e);process.exit(1)});
