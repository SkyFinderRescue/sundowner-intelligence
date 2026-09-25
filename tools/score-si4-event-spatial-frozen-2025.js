"use strict";

// Event-level timing and spatial score for the frozen SI-4 research candidate.
// All thresholds and model fits come from 2024 development only. 2025 is
// score-only. Western uses the already-frozen surface-coupling feature set;
// hybrid/eastern use the current SI-4 candidate features. No production use.

const fs=require("fs");
const BUILDER=process.env.BUILDER||"tools/build-si4-calibration.js";
const FREEZE=process.env.FREEZE||"research/SI4_WESTERN_COUPLING_2024_FROZEN_RULES.json";
const OUT=process.env.OUT||"research/si4-event-spatial-frozen-2025.json";
const source=fs.readFileSync(BUILDER,"utf8");
const marker="\n(async()=>{";
const idx=source.indexOf(marker);
if(idx<0)throw new Error("unable to isolate SI-4 builder definitions");
const defs=source.slice(0,idx);

const main=String.raw`
(async()=>{
  if(TRAIN_START!=="2024-01-01"||TRAIN_END!=="2024-12-31")throw new Error("training period must remain frozen to 2024");
  if(TEST_START!=="2025-01-01"||TEST_END!=="2025-12-31")throw new Error("holdout period must remain frozen to 2025");
  const freeze=JSON.parse(fs.readFileSync(FREEZE,"utf8"));
  const expectedExtras=["surface_cross_barrier_gust_mph","critical_below_3km","wave_mean_cross_barrier_mph"];
  if(freeze.status!=="RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION")throw new Error("freeze guard missing");
  if(freeze.rules?.holdout_2025_seen_when_rules_frozen!==false)throw new Error("western freeze does not prove 2025 was untouched");
  if(JSON.stringify(freeze.frozen_extra_features)!==JSON.stringify(expectedExtras))throw new Error("western frozen feature set changed");

  const upper=loadUpperCache();
  const train=await dataset(TRAIN_START,TRAIN_END,upper);
  const holdout=await dataset(TEST_START,TEST_END,upper);
  const targetDir={Gaviota:345,Refugio:355};

  function augX(r){
    const t=targetDir[r.zone];
    const projected=(Number.isFinite(r.modelGust)&&Number.isFinite(r.modelDir)&&Number.isFinite(t))?r.modelGust*dc(r.modelDir,t):null;
    const below3=r.wave?.critical?.below3km?1:0;
    const meanCross=Number(r.wave?.meanCrossBarrier);
    if(![projected,below3,meanCross].every(Number.isFinite))throw new Error("missing frozen western diagnostic at "+r.time+" "+r.zone);
    return [...r.x,projected,below3,meanCross];
  }

  const regimes=["western","hybrid","eastern"];
  const baselineModels={},candidateModels={},thresholds={baseline:{},candidate:{}};
  for(const regime of regimes){
    const tr=train.byReg[regime].map(r=>({...r,regime}));
    const baseModel=null;
    const candRows=regime==="western"?tr.map(r=>({...r,x:augX(r)})):tr;
    const cand=fit(candRows);
    candidateModels[regime]=cand;
    thresholds.baseline[regime]=thresholdForPod(tr,r=>r.baseline,.5);
    thresholds.candidate[regime]=thresholdForPod(candRows,r=>predict(cand,r.x),.5);
    baselineModels[regime]=baseModel;
  }

  const testRows=[];
  for(const regime of regimes)for(const r of holdout.byReg[regime])testRows.push({...r,regime});
  const HOUR=3600000;
  const ZONES=[...new Set(testRows.map(r=>r.zone))].sort();
  const tms=s=>new Date(s+":00:00Z").getTime();

  function prob(r,kind){
    if(kind==="baseline")return r.baseline;
    if(r.regime==="western")return predict(candidateModels.western,augX(r));
    return predict(candidateModels[r.regime],r.x);
  }
  function active(r,kind){const th=thresholds[kind][r.regime];return Number.isFinite(th)&&prob(r,kind)>=th;}

  function buildEpisodes(rows,isActive){
    const out=[];
    for(const zone of ZONES){
      const a=rows.filter(r=>r.zone===zone&&isActive(r)).slice().sort((x,y)=>String(x.time).localeCompare(String(y.time)));
      let cur=null;
      for(const r of a){
        const ms=tms(r.time);
        if(!cur||ms-cur.endMs>2*HOUR){
          if(cur)out.push(cur);
          cur={zone,start:r.time,end:r.time,startMs:ms,endMs:ms,rows:[r]};
        }else{cur.end=r.time;cur.endMs=ms;cur.rows.push(r);}
      }
      if(cur)out.push(cur);
    }
    return out;
  }

  const observedEpisodes=buildEpisodes(testRows,r=>!!r.y);
  function episodeMetrics(kind){
    const predicted=buildEpisodes(testRows,r=>active(r,kind));
    const used=new Set(),matches=[];
    for(const obs of observedEpisodes){
      let best=null;
      for(let i=0;i<predicted.length;i++){
        if(used.has(i)||predicted[i].zone!==obs.zone)continue;
        const p=predicted[i];
        if(p.endMs<obs.startMs-12*HOUR||p.startMs>obs.endMs+12*HOUR)continue;
        const overlap=Math.max(0,Math.min(p.endMs,obs.endMs)-Math.max(p.startMs,obs.startMs)+HOUR);
        const onsetDiff=Math.abs(p.startMs-obs.startMs);
        const score=(overlap>0?0:1)*1e9+onsetDiff;
        if(!best||score<best.score)best={i,p,score};
      }
      if(!best)continue;
      used.add(best.i);
      const obsPeak=obs.rows.slice().sort((a,b)=>(b.obsGust??-Infinity)-(a.obsGust??-Infinity))[0];
      const peakCandidates=testRows.filter(r=>r.zone===obs.zone&&tms(r.time)>=obs.startMs-6*HOUR&&tms(r.time)<=obs.endMs+6*HOUR);
      const predPeak=peakCandidates.slice().sort((a,b)=>prob(b,kind)-prob(a,kind))[0]||null;
      matches.push({
        zone:obs.zone,
        observed_onset:obs.start,
        predicted_onset:best.p.start,
        onset_error_hours:(best.p.startMs-obs.startMs)/HOUR,
        observed_peak:obsPeak?.time??null,
        predicted_peak:predPeak?.time??null,
        peak_error_hours:predPeak&&obsPeak?(tms(predPeak.time)-tms(obsPeak.time))/HOUR:null,
        observed_duration_hours:(obs.endMs-obs.startMs)/HOUR+1,
        predicted_duration_hours:(best.p.endMs-best.p.startMs)/HOUR+1
      });
    }
    const onset=matches.map(m=>m.onset_error_hours).filter(Number.isFinite);
    const peak=matches.map(m=>m.peak_error_hours).filter(Number.isFinite);
    return {
      observed_events:observedEpisodes.length,
      predicted_events:predicted.length,
      matched_events:matches.length,
      event_pod:observedEpisodes.length?matches.length/observedEpisodes.length:null,
      event_far:predicted.length?(predicted.length-matches.length)/predicted.length:null,
      onset_mae_hours:onset.length?mean(onset.map(Math.abs)):null,
      onset_bias_hours:onset.length?mean(onset):null,
      peak_time_mae_hours:peak.length?mean(peak.map(Math.abs)):null,
      matches
    };
  }

  function spatialMetrics(kind){
    const byTime=new Map();
    for(const r of testRows){
      if(!byTime.has(r.time))byTime.set(r.time,[]);
      byTime.get(r.time).push(r);
    }
    let activeHours=0,jaccardSum=0,exact=0,tp=0,fp=0,fn=0;
    const zoneStats=Object.fromEntries(ZONES.map(z=>[z,{tp:0,fp:0,fn:0}]));
    for(const rows of byTime.values()){
      const obs=new Set(rows.filter(r=>r.y).map(r=>r.zone));
      const pred=new Set(rows.filter(r=>active(r,kind)).map(r=>r.zone));
      if(!obs.size&&!pred.size)continue;
      activeHours++;
      const union=new Set([...obs,...pred]);
      const inter=[...obs].filter(z=>pred.has(z));
      jaccardSum+=union.size?inter.length/union.size:1;
      if(obs.size===pred.size&&inter.length===obs.size)exact++;
      for(const z of union){
        const o=obs.has(z),p=pred.has(z);
        if(o&&p){tp++;zoneStats[z].tp++;}
        else if(!o&&p){fp++;zoneStats[z].fp++;}
        else if(o&&!p){fn++;zoneStats[z].fn++;}
      }
    }
    for(const z of ZONES){const s=zoneStats[z];s.precision=s.tp+s.fp?s.tp/(s.tp+s.fp):null;s.recall=s.tp+s.fn?s.tp/(s.tp+s.fn):null;}
    return {
      evaluated_active_hours:activeHours,
      mean_zone_set_jaccard:activeHours?jaccardSum/activeHours:null,
      exact_zone_set_rate:activeHours?exact/activeHours:null,
      zone_precision:tp+fp?tp/(tp+fp):null,
      zone_recall:tp+fn?tp/(tp+fn):null,
      per_zone:zoneStats
    };
  }

  const baselineEvent=episodeMetrics("baseline"),candidateEvent=episodeMetrics("candidate");
  const baselineSpatial=spatialMetrics("baseline"),candidateSpatial=spatialMetrics("candidate");
  const out={
    status:"RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated:new Date().toISOString(),
    purpose:"Frozen 2025 score-only event onset/peak/decay proxy and spatial-zone correctness evidence using thresholds fit only on 2024.",
    provenance:{upper_air:upper.meta,western_freeze:FREEZE,western_source_cv_run_id:freeze.source_cv_run_id},
    rules:{training_2024_only:true,holdout_2025_score_only:true,thresholds_fit_on_2024_only:true,western_surface_coupling_frozen:true,post_holdout_tuning:false,future_observations_label_only:true,fire_association_used:false,missing_values_fabricated:false,episode_gap_hours:2,event_match_window_hours:12,peak_search_padding_hours:6,production_change_authorized:false},
    thresholds,
    counts:{holdout_rows:testRows.length,observed_event_rows:testRows.filter(r=>r.y).length,observed_episodes:observedEpisodes.length},
    baseline:{event:baselineEvent,spatial:baselineSpatial},
    candidate:{event:candidateEvent,spatial:candidateSpatial},
    delta:{event_pod:candidateEvent.event_pod-baselineEvent.event_pod,event_far:candidateEvent.event_far-baselineEvent.event_far,onset_mae_hours:candidateEvent.onset_mae_hours-baselineEvent.onset_mae_hours,peak_time_mae_hours:candidateEvent.peak_time_mae_hours-baselineEvent.peak_time_mae_hours,mean_zone_set_jaccard:candidateSpatial.mean_zone_set_jaccard-baselineSpatial.mean_zone_set_jaccard,exact_zone_set_rate:candidateSpatial.exact_zone_set_rate-baselineSpatial.exact_zone_set_rate,zone_precision:candidateSpatial.zone_precision-baselineSpatial.zone_precision,zone_recall:candidateSpatial.zone_recall-baselineSpatial.zone_recall},
    interpretation:"Evidence only. No feature, coefficient, threshold, episode rule, or model parameter was tuned from 2025 results. Event timing rules are fixed operational scoring definitions, not training targets."
  };
  fs.mkdirSync(require("path").dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+"\n");
  console.log(JSON.stringify({counts:out.counts,baseline:{event:baselineEvent,spatial:baselineSpatial},candidate:{event:candidateEvent,spatial:candidateSpatial},delta:out.delta},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
`;

eval(defs+"\n"+main);
