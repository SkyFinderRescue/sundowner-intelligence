"use strict";

// Research-only SI-4 diagnostics. These functions do not create labels and do not
// substitute values for missing predictors. Hydraulic-jump/rotor output is a
// susceptibility diagnostic only, never proof of a realized rotor/jump.

const S=require("./si4-science");
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const rad=d=>Number(d)*Math.PI/180;
const signedCross=(speed,dir,target)=>Number.isFinite(Number(speed))&&Number.isFinite(Number(dir))?Number(speed)*Math.cos(rad((((Number(dir)-Number(target))+540)%360)-180)):null;
const STD={1000:110,975:320,950:540,925:760,900:990,875:1220,850:1460,825:1700,800:1950,775:2200,750:2460,725:2730,700:3010,650:3580,600:4200,550:4860,500:5570};

function normalized(levels,targetDirection){
  return (levels||[]).map(r=>{
    const p=Number(r.pressureHpa),z=Number.isFinite(Number(r.heightM))?Number(r.heightM):STD[p];
    return {pressureHpa:p,heightM:z,temperatureC:Number(r.temperatureC),relativeHumidityPct:Number(r.relativeHumidityPct),windSpeed:Number(r.windSpeed),windDirection:Number(r.windDirection),crossBarrier:signedCross(r.windSpeed,r.windDirection,targetDirection)};
  }).filter(r=>Number.isFinite(r.pressureHpa)&&Number.isFinite(r.heightM)&&Number.isFinite(r.temperatureC)).sort((a,b)=>a.heightM-b.heightM);
}

function inversionBaseHeight(levels,targetDirection,{maxBaseHeightM=3000,minStrengthC=0.5,minGradientCPerKm=0.5}={}){
  const p=normalized(levels,targetDirection);
  const candidates=[];
  for(let i=0;i<p.length-1;i++){
    const a=p[i],b=p[i+1],dz=b.heightM-a.heightM;
    if(dz<=0||a.heightM>maxBaseHeightM)continue;
    const strength=b.temperatureC-a.temperatureC,grad=strength/(dz/1000);
    if(strength>=minStrengthC&&grad>=minGradientCPerKm){
      candidates.push({baseHeightM:a.heightM,topHeightM:b.heightM,basePressureHpa:a.pressureHpa,topPressureHpa:b.pressureHpa,strengthC:strength,gradientCPerKm:grad,thicknessM:dz});
    }
  }
  if(!candidates.length)return {present:false,baseHeightM:null,topHeightM:null,basePressureHpa:null,topPressureHpa:null,strengthC:null,gradientCPerKm:null,thicknessM:null,candidateCount:0};
  candidates.sort((a,b)=>a.baseHeightM-b.baseHeightM||b.gradientCPerKm-a.gradientCPerKm);
  return {present:true,...candidates[0],candidateCount:candidates.length};
}

function valueAtPressure(levels,pressureHpa,field){
  const rows=(levels||[]).map(r=>({p:Number(r.pressureHpa),v:Number(r[field])})).filter(r=>Number.isFinite(r.p)&&Number.isFinite(r.v)).sort((a,b)=>a.p-b.p);
  const exact=rows.find(r=>r.p===Number(pressureHpa)); if(exact)return exact.v;
  for(let i=0;i<rows.length-1;i++){const a=rows[i],b=rows[i+1];if((a.p<=pressureHpa&&pressureHpa<=b.p)||(b.p<=pressureHpa&&pressureHpa<=a.p)){const f=(pressureHpa-a.p)/(b.p-a.p);return a.v+f*(b.v-a.v);}}
  return null;
}

function refinedSurfaceCoupling({levels,targetDirection,regime="hybrid",pressureSupport,boundaryLayerHeightM,ridgeHeightM=1050}={}){
  const wave=S.mountainWaveIndex(levels||[],targetDirection,{ridgeHeightM});
  const structure=S.inversionAndJetStructure(levels||[],targetDirection,{ridgeHeightM});
  const rotor=S.hydraulicJumpRotorSusceptibility(levels||[],targetDirection,{ridgeHeightM});
  const inversion=inversionBaseHeight(levels||[],targetDirection);
  const rh925=valueAtPressure(levels||[],925,"relativeHumidityPct");
  const components=[];
  const add=(name,value,weight)=>{if(Number.isFinite(value))components.push({name,value:clamp(value),weight});};
  const jetRel=Number(structure.jetHeightRelativeRidgeM),drop=Number(structure.jetSurfaceDrop);
  const jetHeightAccess=Number.isFinite(jetRel)?clamp(1-Math.max(0,jetRel-400)/2200):null;
  const jetDropAccess=Number.isFinite(drop)?clamp(1-drop/34):null;
  let jetAccess=null;
  if(Number.isFinite(jetHeightAccess)&&Number.isFinite(jetDropAccess))jetAccess=.60*jetHeightAccess+.40*jetDropAccess;
  else if(Number.isFinite(jetHeightAccess))jetAccess=jetHeightAccess;
  else if(Number.isFinite(jetDropAccess))jetAccess=jetDropAccess;
  const mixing=Number.isFinite(Number(boundaryLayerHeightM))?clamp((Number(boundaryLayerHeightM)-250)/1500):null;
  const inversionBarrier=inversion.present?clamp((ridgeHeightM-inversion.baseHeightM+250)/1400)*clamp((inversion.strengthC-.25)/4.5):0;
  const moist925=Number.isFinite(rh925)?clamp((rh925-45)/50):null;
  const criticalAccess=wave.critical?.present?(wave.critical.below3km?0.35:wave.critical.below5km?0.60:0.80):1;
  add("wave_support",wave.score,.25); add("jet_access",jetAccess,.20); add("mixing",mixing,.16); add("critical_access",criticalAccess,.10); add("dry_925",Number.isFinite(moist925)?1-moist925:null,.12); add("inversion_access",1-inversionBarrier,.17);
  const wsum=components.reduce((s,c)=>s+c.weight,0),coupling=wsum?components.reduce((s,c)=>s+c.value*c.weight,0)/wsum:null;
  const ps=Number(pressureSupport),atmosphericSupport=Number.isFinite(ps)?clamp(.62*wave.score+.38*clamp(ps)):wave.score;
  return {
    regime:String(regime).toLowerCase(),inversion,rh925:Number.isFinite(rh925)?rh925:null,
    boundaryLayerHeightM:Number.isFinite(Number(boundaryLayerHeightM))?Number(boundaryLayerHeightM):null,
    wave,structure,hydraulicJumpRotor:{...rotor,diagnosticOnly:true},jetAccess:Number.isFinite(jetAccess)?jetAccess:null,
    mixing,inversionBarrier,components,componentWeightAvailable:wsum,atmosphericSupport,
    surfaceCoupling:Number.isFinite(coupling)?coupling:null,
    surfaceEventSupport:Number.isFinite(coupling)?clamp(atmosphericSupport*coupling):null
  };
}

module.exports={inversionBaseHeight,valueAtPressure,refinedSurfaceCoupling};
