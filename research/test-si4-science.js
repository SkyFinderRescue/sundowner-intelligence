"use strict";
const assert=require("assert");
const S=require("./si4-science");

function near(a,b,tol=1e-6){assert(Math.abs(a-b)<=tol,`${a} not within ${tol} of ${b}`)}

{
  const n=S.signedCrossBarrier(20,0,0); near(n,20);
  const s=S.signedCrossBarrier(20,180,0); near(s,-20);
}

{
  const p=[
    {pressureHpa:925,heightM:800,windSpeed:20,windDirection:350,temperatureC:17},
    {pressureHpa:850,heightM:1500,windSpeed:24,windDirection:355,temperatureC:12},
    {pressureHpa:700,heightM:3000,windSpeed:18,windDirection:5,temperatureC:2},
    {pressureHpa:600,heightM:4200,windSpeed:10,windDirection:110,temperatureC:-6},
    {pressureHpa:500,heightM:5600,windSpeed:15,windDirection:180,temperatureC:-17}
  ];
  const c=S.estimateMeanStateCriticalLevel(p,0);
  assert(c.present,"expected a mean-state critical level");
  assert(c.criticalHeightM>3000&&c.criticalHeightM<5600,"critical level should be interpolated aloft");
  assert(c.below5km,"expected low critical level below 5 km");
  const m=S.mountainWaveIndex(p,0);
  assert(m.score>0.35,"mountain-wave score should respond to cross-barrier flow + low critical level");
}

{
  const open=S.marineLayerResistance({lowCloudPct:10,rh925:35,boundaryLayerHeightM:1800,coastalRhPct:45,coastalTempDewpointSpreadF:15});
  const closed=S.marineLayerResistance({lowCloudPct:95,rh925:92,boundaryLayerHeightM:300,coastalRhPct:95,coastalTempDewpointSpreadF:1});
  assert(open.score<closed.score,"marine resistance should increase for moist shallow low-cloud setups");
  assert(closed.gateClosed,"strong marine layer should close the gate");
}

{
  const a=S.cycleAgreement([42,43,44,43,44]);
  const b=S.cycleAgreement([25,50,30,55,35]);
  assert(a.score>b.score,"stable forecast cycles should have higher agreement");
}

{
  const t=S.classifyTransition({Gaviota:55,Refugio:49,Goleta:30,"San Marcos Pass":28,"Mission Canyon":15,Montecito:12});
  assert.equal(t.state,"WESTERN");
  const e=S.classifyTransition({Gaviota:31,Refugio:28,Goleta:38,"San Marcos Pass":42,"Mission Canyon":51,Montecito:56},{Gaviota:55,Refugio:49,Goleta:30,"San Marcos Pass":28,"Mission Canyon":15,Montecito:12});
  assert.equal(e.state,"HYBRID");
  assert.equal(e.evolution,"EASTWARD");
}

{
  const h=S.hardNegativeFlag({pressureSupport:.75,mountainWaveScore:.62,marineResistanceScore:.78,eventObserved:false});
  assert(h.isHardNegative&&h.likelyMarineBlocked);
  const tr=S.applyTerrainResponse(40,{biasMph:4,directionBiasMph:3,stabilityBiasMph:2});
  assert.equal(tr.gustMph,49);
}

console.log("SI-4 science tests passed");
