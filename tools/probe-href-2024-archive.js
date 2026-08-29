#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const ROOTS = [
  'https://data.nssl.noaa.gov/thredds/catalog/customConfig/FRDD/HREF.html',
  'https://data.nssl.noaa.gov/thredds/catalog/customConfig/FRDD.html',
];

const MAX_CATALOGS = 250;
const MAX_DEPTH = 8;
const TIMEOUT_MS = 20000;
const RETRIES = 2;

function isNsslCertChainError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('unable to verify the first certificate') ||
    msg.includes('unable to get local issuer certificate') ||
    msg.includes('self signed certificate in certificate chain');
}

function requestOnce(url, attempt = 0, allowNsslTlsFallback = false) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const tlsFallback = allowNsslTlsFallback && parsed.hostname === 'data.nssl.noaa.gov';
    const req = https.get(url, {
      headers: {
        'User-Agent': 'sundowner-intelligence-si4-href-archive-probe/1.2',
        'Accept': 'application/xml,text/xml,text/html,*/*',
      },
      timeout: TIMEOUT_MS,
      rejectUnauthorized: !tlsFallback,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          body,
          headers: res.headers,
          attempt,
          tls_mode: tlsFallback ? 'nssl_cert_chain_fallback' : 'strict',
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (error) => {
      resolve({
        url,
        status: null,
        body: '',
        headers: {},
        attempt,
        error: String(error.message || error),
        raw_error: error,
        tls_mode: tlsFallback ? 'nssl_cert_chain_fallback' : 'strict',
      });
    });
  });
}

async function request(url, attempt = 0) {
  let r = await requestOnce(url, attempt, false);
  if (!r.status && isNsslCertChainError(r.raw_error)) {
    r = await requestOnce(url, attempt, true);
    r.strict_tls_error = 'certificate_chain_verification_failed';
  }
  if ([429, 500, 502, 503, 504].includes(r.status) && attempt < RETRIES) {
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    return request(url, attempt + 1);
  }
  if (!r.status && attempt < RETRIES && !isNsslCertChainError(r.raw_error)) {
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    return request(url, attempt + 1);
  }
  delete r.raw_error;
  return r;
}

function absolute(base, href) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function isHrefCatalogLink(u) {
  if (!u || !u.includes('data.nssl.noaa.gov/thredds/catalog/')) return false;
  const lower = u.toLowerCase();
  return lower.includes('/frdd/href') && (/\.html(?:\?.*)?$/.test(lower) || /catalog\.xml(?:\?.*)?$/.test(lower));
}

function extractLinks(base, body) {
  const refs = [];
  const datasets = [];
  const hrefRe = /(?:xlink:href|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(body))) {
    const u = absolute(base, m[1]);
    if (isHrefCatalogLink(u)) refs.push(u);
  }
  const urlPathRe = /urlPath=["']([^"']+)["']/gi;
  while ((m = urlPathRe.exec(body))) datasets.push(m[1]);
  return { refs: [...new Set(refs)], datasets: [...new Set(datasets)] };
}

function looks2024(text) {
  return /(?:^|[^0-9])2024(?:[01][0-9][0-3][0-9])?(?:[^0-9]|$)/.test(text);
}

function memberSignals(text) {
  const lower = text.toLowerCase();
  const keys = ['hrrr', 'nam', 'arw', 'fv3', 'hiresw', 'member', 'm01', 'm02', 'm03', 'm04', 'm05'];
  return keys.filter(k => lower.includes(k));
}

(async () => {
  const startedAt = new Date().toISOString();
  const queue = ROOTS.map(url => ({ url, depth: 0 }));
  const seen = new Set();
  const accesses = [];
  const datasetPaths = [];
  const refs2024 = [];

  while (queue.length && seen.size < MAX_CATALOGS) {
    const { url, depth } = queue.shift();
    if (seen.has(url) || depth > MAX_DEPTH) continue;
    seen.add(url);

    const r = await request(url);
    accesses.push({
      url: r.url,
      status: r.status,
      error: r.error || null,
      attempt: r.attempt,
      bytes: Buffer.byteLength(r.body || '', 'utf8'),
      content_type: r.headers?.['content-type'] || null,
      tls_mode: r.tls_mode || 'strict',
      strict_tls_error: r.strict_tls_error || null,
    });
    if (!r.status || r.status < 200 || r.status >= 300 || !r.body) continue;

    const { refs, datasets } = extractLinks(url, r.body);
    for (const path of datasets) {
      datasetPaths.push(path);
      if (looks2024(path)) refs2024.push({ type: 'dataset', value: path, member_signals: memberSignals(path) });
    }
    for (const ref of refs) {
      if (looks2024(ref)) refs2024.push({ type: 'catalog', value: ref, member_signals: memberSignals(ref) });
      if (!seen.has(ref)) queue.push({ url: ref, depth: depth + 1 });
    }
  }

  const unique2024 = [];
  const uSeen = new Set();
  for (const item of refs2024) {
    const key = `${item.type}:${item.value}`;
    if (!uSeen.has(key)) { uSeen.add(key); unique2024.push(item); }
  }

  const reachableRoots = accesses.filter(x => ROOTS.includes(x.url) && x.status >= 200 && x.status < 300);
  const memberSignalSet = [...new Set(unique2024.flatMap(x => x.member_signals))].sort();
  const phase0Status = unique2024.length > 0 ? 'SOURCE_DISCOVERED_NEEDS_EXACT_F24_MEMBER_PROBE' :
    (reachableRoots.length > 0 ? 'ARCHIVE_REACHABLE_2024_LAYOUT_NOT_YET_RESOLVED' : 'BLOCKED_ARCHIVE_OR_INFRASTRUCTURE');

  const report = {
    candidate: 'initial_condition_ensemble_downslope_v1',
    phase: '0_archive_reproducibility_only',
    science_scoring_performed: false,
    observations_or_outcomes_used: false,
    queried_years: [2024],
    future_observations_used: false,
    fire_association_used: false,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    roots: ROOTS,
    phase0_status: phase0Status,
    catalogs_attempted: seen.size,
    reachable_root_count: reachableRoots.length,
    discovered_2024_reference_count: unique2024.length,
    member_signals: memberSignalSet,
    tls_fallback_used: accesses.some(x => x.tls_mode === 'nssl_cert_chain_fallback'),
    sample_2024_references: unique2024.slice(0, 100),
    sample_dataset_paths: [...new Set(datasetPaths)].slice(0, 100),
    accesses,
    notes: [
      'This probe is availability/provenance only and intentionally does not load observation labels or score forecast skill.',
      'Transient 5xx, rate-limit, timeout, DNS, or archive gaps are infrastructure evidence only and are not scientific evidence.',
      'If strict TLS fails only because data.nssl.noaa.gov presents an incomplete certificate chain, a host-scoped fallback is permitted and explicitly recorded in provenance.',
      'The crawler is deliberately restricted to the official NSSL FRDD/HREF catalog subtree.',
      'A separate exact fixed-F24 member/object probe is required before any 2024 chronological scoring is authorized.',
      'No 2025 science object is queried by this script.',
    ],
  };

  fs.mkdirSync('research', { recursive: true });
  fs.writeFileSync('research/href-2024-archive-probe.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    phase0_status: report.phase0_status,
    catalogs_attempted: report.catalogs_attempted,
    reachable_root_count: report.reachable_root_count,
    discovered_2024_reference_count: report.discovered_2024_reference_count,
    member_signals: report.member_signals,
    tls_fallback_used: report.tls_fallback_used,
  }, null, 2));
})();
