"use strict";
const assert=require("assert");
const I=require("./si4-inversion-coupling");

const inversionProfile=[
 {pressureHpa:1000,heightM:100,temperatureC:14,windSpeed:8,windDirection:350,relativeHumidityPct:75},
 {pressureHpa:925,heightM:760,temperatureC:16,windSpeed:20,windDirection:350,relativeHumidityPct:65},
 {pressureHpa:850,heightM:1460,temperatureC:11,windSpeed:28,windDirection:350,relativeHumidityPct:48},
 {pressureHpa:700,heightM:3010,temperatureC:1,windSpeed:25,windDirection:20,relativeHumidityPct:35}
];
const inv=I.inversionBaseHeight(inversionProfile,350);
assert.equal(inv.present,true);
assert.equal(inv.baseHeightM,100);
assert.equal(inv.topHeightM,760);
assert(inv.strengthC>=2);

const noInv=I.inversionBaseHeight([
 {pressureHpa:1000,heightM:100,temperatureC:16,windSpeed:8,windDirection:350},
 {pressureHpa:925,heightM:760,temperatureC:12,windSpeed:20,windDirection:350},
 {pressureHpa:850,heightM:1460,temperatureC:8,windSpeed:28,windDirection:350}
],350);
assert.equal(noInv.present,false);
assert.equal(noInv.baseHeightM,null);

const c=I.refinedSurfaceCoupling({levels:inversionProfile,targetDirection:350,regime:"western",pressureSupport:.7,boundaryLayerHeightM:900});
assert(Number.isFinite(c.surfaceCoupling));
assert(Number.isFinite(c.surfaceEventSupport));
assert.equal(c.hydraulicJumpRotor.diagnosticOnly,true);
assert(c.components.some(x=>x.name==="inversion_access"));
assert(c.componentWeightAvailable>0&&c.componentWeightAvailable<=1.01);
console.log("SI-4 inversion/coupling tests passed");
