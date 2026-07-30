const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'core.js'),'utf8');
const model=fs.readFileSync(path.join(root,'model.js'),'utf8');
let ui=fs.readFileSync(path.join(root,'ui.js'),'utf8').replace(/selfTests\(\);load\(\);\s*$/,'selfTests();globalThis.__loadPromise=load();');
const elements=new Map();
function elem(id=''){return {id,textContent:'',innerHTML:'',value:'ALL',disabled:false,children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},firstElementChild:{innerHTML:''}}}
function get(id){if(!elements.has(id))elements.set(id,elem(id));return elements.get(id)}
const now=new Date().toISOString();
function response(x){return {ok:true,status:200,json:async()=>x,text:async()=>JSON.stringify(x)}}
async function fetchMock(input){const u=String(input);
 if(u.includes('geojson/network.py'))return response({features:[
  {properties:{sid:'RHWC1',sname:'Refugio Hills RAWS',county:'Santa Barbara'},geometry:{coordinates:[-120.0753,34.5166]}},
  {properties:{sid:'GLTC1',sname:'Goleta Fire Station Alert',county:'Santa Barbara'},geometry:{coordinates:[-119.82,34.44]}}
 ]});
 if(u.includes('json/current.py')){const raws=u.includes('RHWC1');return response({last_ob:{'windspeed[kt]':raws?18:10,'gust[kt]':raws?25:15,'winddirection[deg]':raws?355:10,'relativehumidity[%]':22,'airtemp[F]':72,'fuel moisture[%]':8,utc_valid:now}})}
 if(u.includes('api.weather.gov/stations/')){let pa=u.includes('KSBA')?101200:u.includes('KBFL')?101500:101400;return response({properties:{seaLevelPressure:{value:pa},timestamp:now}})}
 if(u.includes('api.weather.gov/alerts/'))return response({features:[]});
 if(u.includes('api.weather.gov/points/'))return response({properties:{forecastGridData:'https://example.test/grid',cwa:'LOX'}});
 if(u==='https://example.test/grid')return response({updateTime:now,properties:{windGust:{uom:'wmoUnit:m_s-1',values:[{value:20}]}}});
 if(u.includes('api.open-meteo.com/v1/forecast')){const q=new URL(u).searchParams,vars=(q.get('hourly')||'').split(','),times=[],hourly={};let start=new Date();start.setMinutes(0,0,0);for(let i=0;i<48;i++)times.push(new Date(start.getTime()+i*3600000).toISOString().slice(0,13)+':00');hourly.time=times;let lat=Number(q.get('latitude')),lon=Number(q.get('longitude'));for(const v of vars){let val=0;if(v==='temperature_2m')val=72;else if(v==='relative_humidity_2m')val=22;else if(v==='pressure_msl')val=(lat>35?1015:(lon<-120.3?1014:1012));else if(v==='cloud_cover_low')val=5;else if(v==='wind_speed_10m')val=20;else if(v==='wind_direction_10m')val=5;else if(v==='wind_gusts_10m')val=35;else if(v==='boundary_layer_height')val=1800;else if(v==='lifted_index')val=4;else if(v==='shortwave_radiation')val=0;else if(v==='relative_humidity_925hPa')val=25;else if(v==='wind_speed_850hPa')val=34;else if(v==='wind_direction_850hPa')val=5;else if(v==='temperature_850hPa')val=65;else if(v==='wind_speed_700hPa')val=30;else if(v==='wind_direction_700hPa')val=5;else if(v==='vertical_velocity_850hPa')val=-0.5;hourly[v]=times.map(()=>val)}return response({hourly})}
 return {ok:false,status:404,json:async()=>({}),text:async()=>''};
}
const sandbox={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,RegExp,URL,URLSearchParams,setTimeout,clearTimeout,AbortController,Intl,fetch:fetchMock,window:{},globalThis:null,localStorage:{getItem(){return null},setItem(){}},document:{getElementById:get,querySelectorAll(){return[]},createElement(){return elem()}}};sandbox.globalThis=sandbox;
vm.createContext(sandbox);
(async()=>{vm.runInContext(core+'\n'+model+'\n'+ui,sandbox,{timeout:5000});await sandbox.__loadPromise;await new Promise(r=>setTimeout(r,10));
 const checks={status:get('status').innerHTML.includes('Live forecast complete'),noError:!get('status').innerHTML.includes('Load error'),cards:(get('cards').innerHTML.match(/class="card /g)||[]).length===8,raws:get('stationRows').innerHTML.includes('Refugio Hills RAWS'),selfTests:get('selfTest').textContent==='7/7',nws:get('nwsCompare').innerHTML.includes('NWS LOX grid max gust')};
 for(const [k,v] of Object.entries(checks))if(!v)throw new Error('E2E FAIL '+k+' '+JSON.stringify({status:get('status').innerHTML,self:get('selfTest').textContent,nws:get('nwsCompare').innerHTML.slice(0,200),cards:(get('cards').innerHTML.match(/class="card /g)||[]).length}));
 console.log('Mocked end-to-end application test: '+Object.keys(checks).length+'/'+Object.keys(checks).length+' passed');
})().catch(e=>{console.error(e);process.exit(1)});
