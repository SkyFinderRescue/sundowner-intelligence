const assert = require('assert');

async function getJson(url, timeoutMs=20000){
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'Sundowner-Intelligence-QA/2.1'}});
    assert.ok(r.ok, `${r.status} ${url}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

function omUrl(lat,lon,model,vars){
  const q=new URLSearchParams({latitude:String(lat),longitude:String(lon),hourly:vars.join(','),wind_speed_unit:'mph',temperature_unit:'fahrenheit',timezone:'America/Los_Angeles',forecast_hours:'48',models:model});
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

(async()=>{
  const fullVars=['temperature_2m','relative_humidity_2m','pressure_msl','cloud_cover_low','wind_speed_10m','wind_direction_10m','wind_gusts_10m','boundary_layer_height','lifted_index','shortwave_radiation','relative_humidity_925hPa','wind_speed_850hPa','wind_direction_850hPa','temperature_850hPa','wind_speed_700hPa','wind_direction_700hPa','vertical_velocity_850hPa'];
  const seamless=await getJson(omUrl(34.45,-119.63,'gfs_seamless',fullVars));
  assert.ok(seamless.hourly?.time?.length>=24,'NOAA seamless forecast missing');
  assert.ok(seamless.hourly.wind_gusts_10m?.some(Number.isFinite),'NOAA seamless gusts missing');
  assert.ok(seamless.hourly.wind_speed_850hPa?.some(Number.isFinite),'NOAA upper wind missing');
  console.log('PASS Open-Meteo NOAA seamless 48h source');

  const hrrr=await getJson(omUrl(34.45,-119.63,'gfs_hrrr',fullVars));
  assert.ok(hrrr.hourly?.time?.length>0,'HRRR source missing');
  assert.ok(hrrr.hourly.wind_gusts_10m?.some(Number.isFinite),'HRRR gusts missing');
  assert.ok(hrrr.hourly.wind_speed_850hPa?.some(Number.isFinite),'HRRR 850-mb winds missing');
  console.log('PASS Open-Meteo HRRR production request');

  const nbmVars=['temperature_2m','relative_humidity_2m','wind_speed_10m','wind_direction_10m','wind_gusts_10m'];
  const nbm=await getJson(omUrl(34.45,-119.63,'ncep_nbm_conus',nbmVars));
  assert.ok(nbm.hourly?.time?.length>0,'NBM source missing');
  assert.ok(nbm.hourly.wind_gusts_10m?.some(Number.isFinite),'NBM gusts missing');
  console.log('PASS Open-Meteo NBM production request');

  const net=await getJson('https://mesonet.agron.iastate.edu/geojson/network.py?network=CA_DCP');
  assert.ok(Array.isArray(net.features)&&net.features.length>100,'CA_DCP catalog missing');
  const sb=net.features.filter(f=>String(f.properties?.county||f.properties?.county_name||'').toLowerCase().includes('santa barbara'));
  assert.ok(sb.length>0,'Santa Barbara county station catalog empty');
  const ids=new Set(sb.map(f=>String(f.properties?.sid||f.properties?.id||f.properties?.station||f.properties?.stid||'')));
  const countyFireRaws=['GVTC1','RHWC1','MPWC1','SBVC1','CXPC1','SYAC1','BMFC1','TSQC1','CUVC1'];
  assert.ok(countyFireRaws.every(id=>ids.has(id)),`County Fire RAWS missing from catalog: ${countyFireRaws.filter(id=>!ids.has(id)).join(',')}`);
  console.log(`PASS IEM CA_DCP catalog (${sb.length} Santa Barbara county stations by metadata; all ${countyFireRaws.length} County Fire RAWS present)`);

  let sampleReporting=0;
  for(const id of countyFireRaws){
    const current=await getJson(`https://mesonet.agron.iastate.edu/json/current.py?station=${id}&network=CA_DCP`);
    assert.ok(current && typeof current==='object',`${id} current endpoint missing`);
    if(current.last_ob&&Object.keys(current.last_ob).length)sampleReporting++;
  }
  assert.ok(sampleReporting>=1,'No Santa Barbara County Fire RAWS current observations returned');
  console.log(`PASS all County Fire RAWS endpoints (${sampleReporting}/${countyFireRaws.length} currently reporting observations)`);

  const point=await getJson('https://api.weather.gov/points/34.45,-119.63');
  assert.ok(point.properties?.forecastGridData,'NWS grid-data URL missing');
  const grid=await getJson(point.properties.forecastGridData);
  assert.ok(grid.properties,'NWS grid data missing');
  console.log('PASS NWS grid reference endpoint');

  for(const id of ['KSBA','KBFL','KSMX']){
    const o=await getJson(`https://api.weather.gov/stations/${id}/observations/latest`);
    const p=o.properties||{};
    assert.ok(Number.isFinite(Number(p.seaLevelPressure?.value??p.barometricPressure?.value)),`${id} pressure missing`);
  }
  console.log('PASS live airport pressure-gradient endpoints');

  const hads=await fetch('https://mesonet.agron.iastate.edu/cgi-bin/request/hads.py?stations=RHWC1&network=CA_DCP&sts=2025-07-01T00:00Z&ets=2025-07-02T00:00Z&what=txt&delim=comma',{headers:{'User-Agent':'Sundowner-Intelligence-QA/2.1'}});
  assert.ok(hads.ok,`HADS history ${hads.status}`);
  const text=await hads.text();
  assert.ok(text.includes('UDIRGZZ')&&text.includes('USIRGZZ'),'Historical RAWS wind fields missing');
  console.log('PASS historical RAWS archive endpoint');

  console.log('Live upstream integration test: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
