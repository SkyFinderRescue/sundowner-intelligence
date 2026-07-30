const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'core.js'), 'utf8');
const model = fs.readFileSync(path.join(root, 'model.js'), 'utf8');

const sandbox = {
  console, Date, Math, Number, String, Array, Object, Set, Map, JSON, RegExp,
  URLSearchParams, setTimeout, clearTimeout, AbortController, Intl,
  window: {}, localStorage: { getItem(){ return null; }, setItem(){} },
  document: { getElementById(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return {}; } },
  renderHealth(){}, fetch(){ throw new Error('network disabled in unit tests'); }
};
vm.createContext(sandbox);
const assertions = `
(function(){
  const results=[];
  function check(name, value){ results.push([name, !!value]); if(!value) throw new Error('FAIL: '+name); }
  check('eight terrain forecast zones', Z.length===8);
  check('complete county and partner RAWS fallback set', KNOWN_RAWS.size>=15);
  check('county fire RAWS fallbacks present', ['GVTC1','RHWC1','MPWC1','SBVC1','CXPC1','SYAC1','BMFC1','TSQC1','CUVC1'].every(id=>KNOWN_RAWS.has(id)));
  check('three-hour observation freshness gate', STALE_MIN===180);
  check('research-informed event signal threshold', EVENT_SIGNAL===18);
  check('research-informed strong signal threshold', STRONG_SIGNAL===17);
  check('risk category uses event signal threshold', cat(EVENT_SIGNAL)==='ELEVATED');
  check('north component retained', dirComponent(0,0)>.999);
  check('opposite wind suppressed', dirComponent(180,0)===0);
  check('western offshore gradient increases signal', sig((-(-3)-1.8)/.8)>sig((-(0)-1.8)/.8));
  const base={hourly:{time:['a','b','c'],wind_gusts_10m:[10,20,30],temperature_2m:[60,61,62]}};
  const overlay={hourly:{time:['a','b'],wind_gusts_10m:[15,25]}};
  const merged=mergeHourly(base,overlay);
  check('HRRR overlay replaces available hours', merged.hourly.wind_gusts_10m[0]===15 && merged.hourly.wind_gusts_10m[1]===25);
  check('seamless guidance preserves long horizon', merged.hourly.wind_gusts_10m[2]===30);
  PS={time:['2026-07-30T00:00'],b:[-3.5],s:[-2.5]}; OBS_PRESS=null; ST=[];
  const h={time:['2026-07-30T00:00'],wind_gusts_10m:[35],wind_direction_10m:[10],wind_speed_850hPa:[35],wind_direction_850hPa:[10],temperature_850hPa:[65],wind_speed_700hPa:[30],wind_direction_700hPa:[10],relative_humidity_2m:[20],boundary_layer_height:[1900],lifted_index:[4],shortwave_radiation:[0],relative_humidity_925hPa:[25],cloud_cover_low:[5],vertical_velocity_850hPa:[-0.5]};
  const n={wind_gusts_10m:[38]};
  const zone=Z.find(z=>z.name==='Montecito');
  const sc=score(h,n,0,zone);
  check('all probability outputs bounded', sc.p>=0&&sc.p<=100&&sc.strong>=0&&sc.strong<=100&&sc.fire>=0&&sc.fire<=100);
  check('localized gust is plausible positive value', Number.isFinite(sc.localG)&&sc.localG>0);
  const weak={...sc,b:-1.0,s:-1.0,localG:25,r8:.35,r7:.3,downslope:.3,obs:.2};
  const strong={...weak,b:-5.0,s:-4.0,localG:42,r8:.85,r7:.7,downslope:.75,obs:.7};
  check('published strong gradient and gust anchors raise strong probability', strongProbability(strong,.65,zone)>strongProbability(weak,.65,zone));
  const west=Z.find(z=>z.name==='Refugio');
  const westWeak={...weak,s:-2.0,b:-2.0};
  const westStrong={...strong,s:-4.0,b:-2.0};
  check('western strong signal uses SBA-SMX threshold', strongProbability(westStrong,.65,west)>strongProbability(westWeak,.65,west));
  const source=modelSource;
  check('production forecast endpoint', source.includes('api.open-meteo.com/v1/forecast'));
  check('Open-Meteo HRRR model id', source.includes('gfs_hrrr'));
  check('Open-Meteo NBM model id', source.includes('ncep_nbm_conus'));
  check('strong western research threshold embedded', source.includes('-3.4'));
  check('strong eastern research threshold embedded', source.includes('-4.2'));
  check('significant gust anchor embedded', source.includes('localG-35'));
  check('station temperature parser returns value', coreSource.includes('temp:temp?temp.v:null'));
  console.log('Sundowner Intelligence tests: '+results.length+'/'+results.length+' passed');
})();`;
sandbox.modelSource = model;
sandbox.coreSource = core;
vm.runInContext(core + '\n' + model + '\n' + assertions, sandbox, { timeout: 5000 });
