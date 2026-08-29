#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const DATES = [
  '20240115','20240215','20240315','20240415','20240515','20240615',
  '20240715','20240815','20240915','20241015','20241115','20241215',
];
const BASE = 'https://data.nssl.noaa.gov';
const MAX_CATALOGS_PER_DATE = 80;
const MAX_DEPTH = 6;
const TIMEOUT_MS = 20000;
const RETRIES = 2;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function certError(error) {
  const s = String(error?.message || error || '').toLowerCase();
  return s.includes('unable to verify the first certificate') ||
    s.includes('unable to get local issuer certificate') ||
    s.includes('self signed certificate in certificate chain');
}
function reqOnce(url, opts = {}, tlsFallback = false) {
  return new Promise(resolve => {
    const parsed = new URL(url);
    const hostFallback = tlsFallback && parsed.hostname === 'data.nssl.noaa.gov';
    const req = https.request(url, {
      method: opts.method || 'GET',
      headers: {
        'User-Agent': 'sundowner-intelligence-si4-href-f24-probe/1.0',
        'Accept': opts.accept || 'application/xml,text/xml,text/html,*/*',
        ...(opts.headers || {}),
      },
      timeout: TIMEOUT_MS,
      rejectUnauthorized: !hostFallback,
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { if (body.length < 2_000_000) body += c; });
      res.on('end', () => resolve({
        url, status: res.statusCode, headers: res.headers, body,
        tls_mode: hostFallback ? 'nssl_cert_chain_fallback' : 'strict',
      }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', error => resolve({url,status:null,headers:{},body:'',error:String(error.message||error),raw_error:error,tls_mode:hostFallback?'nssl_cert_chain_fallback':'strict'}));
    req.end();
  });
}
async function request(url, opts = {}) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    let r = await reqOnce(url, opts, false);
    if (!r.status && certError(r.raw_error)) {
      r = await reqOnce(url, opts, true);
      r.strict_tls_error = 'certificate_chain_verification_failed';
    }
    delete r.raw_error;
    if ((r.status && ![429,500,502,503,504].includes(r.status)) || attempt === RETRIES) {
      r.attempt = attempt; return r;
    }
    await sleep(1000 * (attempt + 1));
  }
}
function abs(base, href) { try { return new URL(href, base).toString(); } catch { return null; } }
function extract(base, body) {
  const refs = [], datasets = [];
  let m;
  const hrefRe = /(?:xlink:href|href)=["']([^"']+)["']/gi;
  while ((m = hrefRe.exec(body))) {
    const u = abs(base, m[1]);
    if (u && u.includes('/thredds/catalog/FRDD/HREF/')) refs.push(u);
  }
  const pathRe = /urlPath=["']([^"']+)["']/gi;
  while ((m = pathRe.exec(body))) datasets.push(m[1]);
  return {refs:[...new Set(refs)],datasets:[...new Set(datasets)]};
}
function isExactF24(path) {
  const s = path.toLowerCase();
  return /(^|[^a-z0-9])f0?24([^0-9]|$)/.test(s) ||
    /(^|[^a-z0-9])024hr([^0-9]|$)/.test(s) ||
    /(^|[^a-z0-9])fh0?24([^0-9]|$)/.test(s);
}
function classify(path) {
  const s = path.toLowerCase();
  const memberTokens = [];
  const patterns = [
    ['hrrr','hrrr'],['namnest','namnest'],['nam_nest','namnest'],['hiresw','hiresw'],
    ['arw','arw'],['nmm','nmm'],['fv3','fv3'],['nmmb','nmmb'],['member','member'],
  ];
  for (const [p,label] of patterns) if (s.includes(p)) memberTokens.push(label);
  const explicit = s.match(/(?:^|[._-])(m(?:em(?:ber)?)?0?[1-9]|m1[0-9])(?:[._-]|$)/g) || [];
  for (const x of explicit) memberTokens.push(x.replace(/[._-]/g,''));
  const productTokens = ['mean','avrg','avg','pmmn','lpmm','prob','sprd','spread','max','min'].filter(x => s.includes(x));
  return {member_tokens:[...new Set(memberTokens)], product_tokens:[...new Set(productTokens)]};
}
function fileServerUrl(path) {
  const cleaned = String(path).replace(/^\/+/, '');
  return `${BASE}/thredds/fileServer/${cleaned}`;
}

(async () => {
  const startedAt = new Date().toISOString();
  const dateReports = [];
  let tlsFallbackUsed = false;

  for (const date of DATES) {
    const root = `${BASE}/thredds/catalog/FRDD/HREF/2024/${date}/catalog.html`;
    const queue = [{url:root,depth:0}], seen = new Set(), accesses = [], datasetPaths = [];
    while (queue.length && seen.size < MAX_CATALOGS_PER_DATE) {
      const {url,depth} = queue.shift();
      if (seen.has(url) || depth > MAX_DEPTH || !url.includes(`/2024/${date}/`)) continue;
      seen.add(url);
      const r = await request(url);
      tlsFallbackUsed ||= r.tls_mode === 'nssl_cert_chain_fallback';
      accesses.push({url:r.url,status:r.status,error:r.error||null,attempt:r.attempt,tls_mode:r.tls_mode,bytes:Buffer.byteLength(r.body||'','utf8')});
      if (!r.status || r.status < 200 || r.status >= 300 || !r.body) continue;
      const {refs,datasets} = extract(url,r.body);
      datasetPaths.push(...datasets);
      for (const ref of refs) if (!seen.has(ref)) queue.push({url:ref,depth:depth+1});
    }
    const unique = [...new Set(datasetPaths)];
    const exact = unique.filter(isExactF24).map(path => ({path,...classify(path)}));
    const probeObjects = [];
    for (const item of exact.slice(0, 40)) {
      const u = fileServerUrl(item.path);
      const r = await request(u, {headers:{Range:'bytes=0-0'}, accept:'*/*'});
      tlsFallbackUsed ||= r.tls_mode === 'nssl_cert_chain_fallback';
      probeObjects.push({
        path:item.path,url:u,status:r.status,content_range:r.headers?.['content-range']||null,
        content_length:r.headers?.['content-length']||null,accept_ranges:r.headers?.['accept-ranges']||null,
        member_tokens:item.member_tokens,product_tokens:item.product_tokens,tls_mode:r.tls_mode,
      });
    }
    dateReports.push({
      date, root, catalogs_attempted:seen.size,
      root_reachable:accesses.some(x => x.url === root && x.status >= 200 && x.status < 300),
      dataset_count:unique.length, exact_f24_count:exact.length,
      exact_f24_member_token_count:new Set(exact.flatMap(x=>x.member_tokens)).size,
      exact_f24_product_token_count:new Set(exact.flatMap(x=>x.product_tokens)).size,
      sample_exact_f24:exact.slice(0,40), object_probes:probeObjects, accesses,
    });
  }

  const exactTotal = dateReports.reduce((a,d)=>a+d.exact_f24_count,0);
  const reachableDates = dateReports.filter(d=>d.root_reachable).length;
  const datesWithExact = dateReports.filter(d=>d.exact_f24_count>0).length;
  const memberTokens = [...new Set(dateReports.flatMap(d=>d.sample_exact_f24.flatMap(x=>x.member_tokens)))].sort();
  const productTokens = [...new Set(dateReports.flatMap(d=>d.sample_exact_f24.flatMap(x=>x.product_tokens)))].sort();
  const rangeVerified = dateReports.reduce((n,d)=>n+d.object_probes.filter(x=>x.status===206 || (x.status===200 && Number(x.content_length)>0)).length,0);

  let status = 'BLOCKED_ARCHIVE';
  if (reachableDates === DATES.length && datesWithExact === DATES.length && exactTotal > 0) {
    status = memberTokens.length > 0 ? 'EXACT_F24_SOURCE_DISCOVERED_NEEDS_MEMBER_IDENTITY_FREEZE' : 'EXACT_F24_PRODUCTS_FOUND_MEMBER_LEVEL_UNRESOLVED';
  } else if (reachableDates > 0) status = 'PARTIAL_EXACT_F24_ARCHIVE_COVERAGE';

  const report = {
    candidate:'initial_condition_ensemble_downslope_v1',
    phase:'0b_exact_f24_member_reproducibility_only',
    science_scoring_performed:false,
    observations_or_outcomes_used:false,
    queried_years:[2024],
    future_observations_used:false,
    fire_association_used:false,
    predeclared_dates:DATES,
    replacement_rule:'If a date is unavailable, replace only by the next calendar day with archive availability established before any observation scoring; do not use outcomes.',
    started_at:startedAt, completed_at:new Date().toISOString(),
    phase0b_status:status,
    reachable_date_count:reachableDates,
    dates_with_exact_f24:datesWithExact,
    exact_f24_object_count:exactTotal,
    byte_range_or_object_verified_count:rangeVerified,
    member_tokens:memberTokens,
    ensemble_product_tokens:productTokens,
    tls_fallback_used:tlsFallbackUsed,
    date_reports:dateReports,
    notes:[
      'Availability/provenance only. No labels, observations, forecast errors, event outcomes, fire association, or 2025 science data are loaded.',
      'Exact F24 is determined from archive object naming only; any ambiguous lead naming is rejected rather than inferred.',
      'HREF aggregate products do not by themselves prove reconstructible member-level states. Member identity must be explicit before 2024 science scoring.',
      'Transient 5xx/timeouts/archive gaps are infrastructure evidence only.',
    ],
  };
  fs.mkdirSync('research',{recursive:true});
  fs.writeFileSync('research/href-2024-exact-f24-probe.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({phase0b_status:status,reachable_date_count:reachableDates,dates_with_exact_f24:datesWithExact,exact_f24_object_count:exactTotal,byte_range_or_object_verified_count:rangeVerified,member_tokens:memberTokens,ensemble_product_tokens:productTokens,tls_fallback_used:tlsFallbackUsed},null,2));
})();
