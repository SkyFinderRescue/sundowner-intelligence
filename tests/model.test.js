const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),core=fs.readFileSync(path.join(root,'core.js'),'utf8'),model=fs.readFileSync(path.join(root,'model.js'),'utf8');
const sandbox={console,Date,Math,Number,String,Array,Object,Set,Map,JSON,RegExp,URL,URLSearchParams,setTimeout,clearTimeout,AbortController,Intl,window:{},localStorage:{getItem(){return null},setItem(){}},document:{getElementById(){return null},querySelectorAll(){return[]},createElement(){return{}}},renderHealth(){},fetch(){throw Error('network disabled')}};
vm.createContext(sandbox);
const assertions=`(function(){
function ok(n,v){if(!v)throw Error('FAIL '+n)}
ok('8 polygons',Z.length===8&&Z.every(z=>z.poly&&z.poly.length>=4));
ok('Cuyama',KNOWN_RAWS.has('CUVC1'));ok('upstream envelope',coreSource.includes('35.65')&&coreSource.includes('Southern Kern precursor'));
ok('vertical levels',HV.includes('wind_speed_925hPa')&&HV.includes('wind_speed_500hPa'));
ok('HRRR',modelSource.includes('gfs_hrrr'));ok('local pressure',modelSource.includes('KIZA')&&modelSource.includes('KVBG')&&modelSource.includes('KLPC'));
ok('pressure tendency',modelSource.includes('tendency3h'));ok('coastal jet',modelSource.includes('coastalGuidance'));
CAL=DEFAULT_CAL; ST=[]; OBS_PRESS=null; COAST={time:['2026-07-31T18:00'],wind_gusts_10m:[35],wind_direction_10m:[325]};PS={time:['2026-07-31T18:00'],bfl:[-4.8],smx:[-3.8],iza:[-2.8],vbg:[-3.2],lpc:[-3.0]};
const h={time:['2026-07-31T18:00'],wind_gusts_10m:[38],wind_direction_10m:[10],wind_speed_925hPa:[32],wind_direction_925hPa:[10],wind_speed_850hPa:[40],wind_direction_850hPa:[10],wind_speed_700hPa:[32],wind_direction_700hPa:[10],wind_speed_500hPa:[12],wind_direction_500hPa:[190],relative_humidity_2m:[18],boundary_layer_height:[1800],lifted_index:[4],shortwave_radiation:[100],relative_humidity_925hPa:[25],cloud_cover_low:[5],vertical_velocity_850hPa:[-.6]};
const n={wind_gusts_10m:[40]},z=Z.find(x=>x.name==='Montecito'),s=score(h,n,0,z);ok('bounded',s.p>=0&&s.p<=100&&s.strong>=0&&s.strong<=100&&s.fire>=0&&s.fire<=100);ok('gust',s.localG>0);ok('critical',s.critical>=0&&s.critical<=1);console.log('SI3 model tests PASS')})();`;
sandbox.coreSource=core;sandbox.modelSource=model;vm.runInContext(core+'\n'+model+'\n'+assertions,sandbox,{timeout:5000});
