"use strict";

const G = 9.80665;
const KAPPA = 0.2854;
const STANDARD_HEIGHT_M = {1000:110, 925:760, 850:1460, 800:1950, 700:3010, 600:4200, 500:5570, 400:7180};
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const rad = d=>Number(d)*Math.PI/180;

function signedCrossBarrier(speed, direction, targetDirection){
  if(!Number.isFinite(Number(speed)) || !Number.isFinite(Number(direction))) return null;
  return Number(speed)*Math.cos(rad((((Number(direction)-Number(targetDirection))+540)%360)-180));
}

function potentialTemperatureK(tempC, pressureHpa){
  if(!Number.isFinite(Number(tempC)) || !Number.isFinite(Number(pressureHpa))) return null;
  return (Number(tempC)+273.15)*Math.pow(1000/Number(pressureHpa),KAPPA);
}

function interpolateZero(z1,z2,u1,u2){
  if(![z1,z2,u1,u2].every(Number.isFinite) || u1===u2) return null;
  const f=(0-u1)/(u2-u1);
  return z1+clamp(f,0,1)*(z2-z1);
}

function normalizeProfile(levels,targetDirection){
  return (levels||[])
    .map(row=>{
      const p=Number(row.pressureHpa);
      const z=Number.isFinite(Number(row.heightM))?Number(row.heightM):STANDARD_HEIGHT_M[p];
      const cross=signedCrossBarrier(row.windSpeed,row.windDirection,targetDirection);
      const theta=potentialTemperatureK(row.temperatureC,p);
      return {...row,pressureHpa:p,heightM:z,crossBarrier:cross,thetaK:theta};
    })
    .filter(r=>Number.isFinite(r.pressureHpa)&&Number.isFinite(r.heightM))
    .sort((a,b)=>a.heightM-b.heightM);
}

function estimateMeanStateCriticalLevel(levels,targetDirection,{minHeightM=700,maxHeightM=10000}={}){
  const p=normalizeProfile(levels,targetDirection).filter(r=>r.heightM>=minHeightM&&r.heightM<=maxHeightM&&Number.isFinite(r.crossBarrier));
  let criticalHeightM=null, bracket=null;
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1];
    if(a.crossBarrier>0 && b.crossBarrier<=0){
      criticalHeightM=interpolateZero(a.heightM,b.heightM,a.crossBarrier,b.crossBarrier);
      bracket=[a.pressureHpa,b.pressureHpa];
      break;
    }
  }
  const present=Number.isFinite(criticalHeightM);
  return {
    present,
    criticalHeightM:present?Math.round(criticalHeightM):null,
    criticalHeightFt:present?Math.round(criticalHeightM*3.28084):null,
    below5km:present&&criticalHeightM<5000,
    below3km:present&&criticalHeightM<3000,
    bracketHpa:bracket,
    profile:p.map(r=>({pressureHpa:r.pressureHpa,heightM:r.heightM,crossBarrier:r.crossBarrier}))
  };
}

function ridgeLayerStability(levels,targetDirection,{bottomHpa=925,topHpa=700}={}){
  const p=normalizeProfile(levels,targetDirection);
  const bottom=p.find(r=>r.pressureHpa===bottomHpa),top=p.find(r=>r.pressureHpa===topHpa);
  if(!bottom||!top||![bottom.thetaK,top.thetaK,bottom.heightM,top.heightM].every(Number.isFinite)||top.heightM<=bottom.heightM)
    return {nPerSec:null,n2:null,deltaThetaK:null};
  const meanTheta=(bottom.thetaK+top.thetaK)/2;
  const dz=top.heightM-bottom.heightM;
  const dTheta=top.thetaK-bottom.thetaK;
  const n2=(G/meanTheta)*(dTheta/dz);
  return {nPerSec:n2>0?Math.sqrt(n2):0,n2,deltaThetaK:dTheta};
}

function mountainWaveIndex(levels,targetDirection,{ridgeHeightM=1050}={}){
  const p=normalizeProfile(levels,targetDirection);
  const crit=estimateMeanStateCriticalLevel(p,targetDirection);
  const stab=ridgeLayerStability(p,targetDirection);
  const low=p.filter(r=>r.heightM>=650&&r.heightM<=3200&&Number.isFinite(r.crossBarrier));
  const meanCross=low.length?low.reduce((s,r)=>s+Math.max(0,r.crossBarrier),0)/low.length:0;
  const n=Number.isFinite(stab.nPerSec)?stab.nPerSec:0;
  const froude=n>0?meanCross/(n*ridgeHeightM):null;
  const flowScore=clamp((meanCross-5)/18);
  const stabilityScore=clamp((n-.004)/.014);
  const criticalScore=crit.below3km?1:crit.below5km?.82:crit.present?.35:0;
  const nearCriticalFroude=Number.isFinite(froude)?clamp(1-Math.abs(froude-1)/1.2):0;
  const score=clamp(.38*flowScore+.25*stabilityScore+.27*criticalScore+.10*nearCriticalFroude);
  return {score,meanCrossBarrier:meanCross,nPerSec:n,froude,critical:crit,stability:stab};
}

function inversionAndJetStructure(levels,targetDirection,{ridgeHeightM=1050,maxJetHeightM=3500}={}){
  const p=normalizeProfile(levels,targetDirection);
  const low=p.filter(r=>r.heightM<=maxJetHeightM&&Number.isFinite(r.crossBarrier));
  if(!low.length) return {
    jetHeightM:null,jetCrossBarrier:null,jetHeightRelativeRidgeM:null,
    lowestCrossBarrier:null,jetSurfaceDrop:null,inversionStrengthC:null,
    maxThetaGradientKPerKm:null,lowLevelReversal:false
  };
  const jet=low.reduce((best,r)=>!best||r.crossBarrier>best.crossBarrier?r:best,null);
  const lowest=low[0];
  let inversionStrengthC=0,maxThetaGradientKPerKm=null;
  for(let i=0;i<low.length-1;i++){
    const a=low[i],b=low[i+1],dz=b.heightM-a.heightM;
    if(dz<=0)continue;
    const dt=Number(b.temperatureC)-Number(a.temperatureC);
    if(Number.isFinite(dt))inversionStrengthC=Math.max(inversionStrengthC,dt);
    if(Number.isFinite(a.thetaK)&&Number.isFinite(b.thetaK)){
      const grad=(b.thetaK-a.thetaK)/(dz/1000);
      if(!Number.isFinite(maxThetaGradientKPerKm)||grad>maxThetaGradientKPerKm)maxThetaGradientKPerKm=grad;
    }
  }
  const aloft=low.filter(r=>r.heightM>=ridgeHeightM&&r.heightM<=3200);
  const strongestAloft=aloft.length?Math.max(...aloft.map(r=>r.crossBarrier)):null;
  const lowLevelReversal=Number.isFinite(strongestAloft)&&strongestAloft>=8&&Number.isFinite(lowest.crossBarrier)&&lowest.crossBarrier<=0;
  return {
    jetHeightM:jet?jet.heightM:null,
    jetCrossBarrier:jet?jet.crossBarrier:null,
    jetHeightRelativeRidgeM:jet?jet.heightM-ridgeHeightM:null,
    lowestCrossBarrier:Number.isFinite(lowest.crossBarrier)?lowest.crossBarrier:null,
    jetSurfaceDrop:jet&&Number.isFinite(lowest.crossBarrier)?Math.max(0,jet.crossBarrier-lowest.crossBarrier):null,
    inversionStrengthC,
    maxThetaGradientKPerKm,
    lowLevelReversal
  };
}

function hydraulicJumpRotorSusceptibility(levels,targetDirection,{ridgeHeightM=1050}={}){
  const wave=mountainWaveIndex(levels,targetDirection,{ridgeHeightM});
  const structure=inversionAndJetStructure(levels,targetDirection,{ridgeHeightM});
  const nearCriticalFroude=Number.isFinite(wave.froude)?clamp(1-Math.abs(wave.froude-1)/.9):0;
  const shear=Number.isFinite(structure.jetSurfaceDrop)?clamp((structure.jetSurfaceDrop-6)/24):0;
  const reversal=structure.lowLevelReversal?1:0;
  const stable=Number.isFinite(structure.maxThetaGradientKPerKm)?clamp((structure.maxThetaGradientKPerKm-2)/10):0;
  const score=clamp(.34*nearCriticalFroude+.28*shear+.23*reversal+.15*stable);
  return {
    score,
    diagnosticOnly:true,
    nearCriticalFroude,
    shearScore:shear,
    lowLevelReversal:structure.lowLevelReversal,
    stableLayerScore:stable,
    froude:wave.froude,
    structure
  };
}

function marineLayerResistance({
  lowCloudPct,rh925,boundaryLayerHeightM,coastalRhPct,coastalTempDewpointSpreadF,
  inversionStrengthC,marineIntrusionScore,channelEddyScore
}={}){
  const cloud=Number.isFinite(Number(lowCloudPct))?clamp(Number(lowCloudPct)/100):.5;
  const rh=Number.isFinite(Number(rh925))?clamp((Number(rh925)-45)/50):.45;
  const shallow=Number.isFinite(Number(boundaryLayerHeightM))?clamp((1600-Number(boundaryLayerHeightM))/1300):.45;
  const coastRh=Number.isFinite(Number(coastalRhPct))?clamp((Number(coastalRhPct)-55)/40):.4;
  const saturation=Number.isFinite(Number(coastalTempDewpointSpreadF))?clamp((8-Number(coastalTempDewpointSpreadF))/8):.4;
  let score=clamp(.28*cloud+.24*rh+.24*shallow+.14*coastRh+.10*saturation);
  if(Number.isFinite(Number(inversionStrengthC))){
    const inversion=clamp((Number(inversionStrengthC)-.5)/5.5);
    score=clamp(.82*score+.18*inversion);
  }
  if(Number.isFinite(Number(marineIntrusionScore)))score=clamp(.88*score+.12*clamp(Number(marineIntrusionScore)));
  if(Number.isFinite(Number(channelEddyScore)))score=clamp(.92*score+.08*clamp(Number(channelEddyScore)));
  return {score,gateOpen:score<.38,gateMarginal:score>=.38&&score<.62,gateClosed:score>=.62};
}

function surfaceCouplingIndex({
  levels,targetDirection,regime="hybrid",pressureSupport,
  lowCloudPct,rh925,boundaryLayerHeightM,coastalRhPct,coastalTempDewpointSpreadF,
  marineIntrusionScore,channelEddyScore,ridgeHeightM=1050
}={}){
  const wave=mountainWaveIndex(levels||[],targetDirection,{ridgeHeightM});
  const structure=inversionAndJetStructure(levels||[],targetDirection,{ridgeHeightM});
  const rotor=hydraulicJumpRotorSusceptibility(levels||[],targetDirection,{ridgeHeightM});
  const marine=marineLayerResistance({
    lowCloudPct,rh925,boundaryLayerHeightM,coastalRhPct,coastalTempDewpointSpreadF,
    inversionStrengthC:structure.inversionStrengthC,marineIntrusionScore,channelEddyScore
  });
  const jetHeight=Number(structure.jetHeightRelativeRidgeM);
  const jetHeightAccess=Number.isFinite(jetHeight)?clamp(1-Math.max(0,jetHeight-500)/2200):.45;
  const jetDrop=Number(structure.jetSurfaceDrop);
  const jetDropAccess=Number.isFinite(jetDrop)?clamp(1-jetDrop/34):.45;
  const jetAccess=clamp(.58*jetHeightAccess+.42*jetDropAccess);
  const mixing=Number.isFinite(Number(boundaryLayerHeightM))?clamp((Number(boundaryLayerHeightM)-250)/1500):.5;
  const weights={
    western:{marine:.38,rotor:.18,access:.26,mixing:.18},
    hybrid:{marine:.30,rotor:.23,access:.27,mixing:.20},
    eastern:{marine:.22,rotor:.28,access:.30,mixing:.20}
  }[String(regime).toLowerCase()]||{marine:.30,rotor:.23,access:.27,mixing:.20};
  const resistance=clamp(weights.marine*marine.score+weights.rotor*rotor.score+(1-weights.marine-weights.rotor)*(1-jetAccess));
  const coupling=clamp(
    weights.access*jetAccess+
    weights.mixing*mixing+
    .25*wave.score+
    (1-weights.access-weights.mixing-.25)*(1-resistance)
  );
  const p=Number(pressureSupport);
  const atmosphericSupport=Number.isFinite(p)?clamp(.62*wave.score+.38*clamp(p)):wave.score;
  return {
    regime:String(regime).toLowerCase(),
    atmosphericSupport,
    surfaceCoupling:coupling,
    surfaceEventSupport:clamp(atmosphericSupport*coupling),
    jetAccess,
    mixing,
    resistance,
    marineResistance:marine,
    hydraulicJumpRotor:rotor,
    structure,
    wave
  };
}

function cycleAgreement(values){
  const a=(values||[]).map(Number).filter(Number.isFinite);
  if(a.length<2) return {n:a.length,score:null,spread:null,std:null,trend:null};
  const mean=a.reduce((s,x)=>s+x,0)/a.length;
  const variance=a.reduce((s,x)=>s+(x-mean)**2,0)/a.length;
  const std=Math.sqrt(variance),spread=Math.max(...a)-Math.min(...a),trend=a[a.length-1]-a[0];
  return {n:a.length,mean,std,spread,trend,score:clamp(1-std/18)};
}

function classifyTransition(zoneProbabilities,previousZoneProbabilities={}){
  const p=zoneProbabilities||{};
  const west=Math.max(Number(p.Gaviota)||0,Number(p.Refugio)||0);
  const hybrid=Math.max(Number(p.Goleta)||0,Number(p["San Marcos Pass"])||0);
  const east=Math.max(Number(p["Mission Canyon"])||0,Number(p.Montecito)||0,Number(p["Toro Canyon"])||0,Number(p.Carpinteria)||0);
  const active=Math.max(west,hybrid,east);
  let state="NONE";
  if(active>=18){
    if(west>=18&&east>=18) state="HYBRID";
    else if(east>=Math.max(west,hybrid)) state="EASTERN";
    else if(west>=Math.max(east,hybrid)) state="WESTERN";
    else state="HYBRID";
  }
  const prev=previousZoneProbabilities||{};
  const eastTrend=east-Math.max(Number(prev["Mission Canyon"])||0,Number(prev.Montecito)||0,Number(prev["Toro Canyon"])||0,Number(prev.Carpinteria)||0);
  const westTrend=west-Math.max(Number(prev.Gaviota)||0,Number(prev.Refugio)||0);
  let evolution="STEADY";
  if(state!=="NONE"&&eastTrend>=8&&westTrend<=0) evolution="EASTWARD";
  else if(state!=="NONE"&&westTrend>=8&&eastTrend<=0) evolution="WESTWARD";
  else if(active<18&&Math.max(...Object.values(prev).map(Number).filter(Number.isFinite),0)>=18) evolution="DECAY";
  else if(active>=18&&Math.max(...Object.values(prev).map(Number).filter(Number.isFinite),0)<18) evolution="ONSET";
  return {state,evolution,west,hybrid,east,maxProbability:active};
}

function hardNegativeFlag({pressureSupport,mountainWaveScore,marineResistanceScore,surfaceCouplingScore,eventObserved}){
  const setup=(Number(pressureSupport)||0)>=.58 || (Number(mountainWaveScore)||0)>=.58;
  const blocked=(Number(marineResistanceScore)||0)>=.58 || (Number.isFinite(Number(surfaceCouplingScore))&&Number(surfaceCouplingScore)<.36);
  return {isHardNegative:!!(setup&&!eventObserved),likelyMarineBlocked:!!(setup&&!eventObserved&&blocked)};
}

function applyTerrainResponse(rawGustMph,{biasMph=0,directionBiasMph=0,stabilityBiasMph=0,capMph=15}={}){
  const correction=clamp(Number(biasMph||0)+Number(directionBiasMph||0)+Number(stabilityBiasMph||0),-capMph,capMph);
  return {gustMph:Math.max(0,Number(rawGustMph||0)+correction),correctionMph:correction};
}

module.exports={
  signedCrossBarrier,potentialTemperatureK,estimateMeanStateCriticalLevel,ridgeLayerStability,
  mountainWaveIndex,inversionAndJetStructure,hydraulicJumpRotorSusceptibility,
  marineLayerResistance,surfaceCouplingIndex,cycleAgreement,classifyTransition,hardNegativeFlag,applyTerrainResponse
};
