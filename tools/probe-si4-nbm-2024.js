#!/usr/bin/env node
'use strict';

const https = require('https');
const fs = require('fs');

const dates = ['20240601','20240701','20240801','20240901','20241001','20241101','20241201'];
const cycle = '00';
const lead = '024';
const base = 'https://noaa-nbm-grib2-pds.s3.amazonaws.com';
const out = process.env.OUT || 'research/si4-nbm-2024-archive-probe.json';

function head(url, attempts = 3) {
  return new Promise((resolve) => {
    let n = 0;
    const go = () => {
      n++;
      const req = https.request(url, {method:'HEAD', headers:{'User-Agent':'sundowner-intelligence-si4-research/1.0'}}, res => {
        const status = res.statusCode || 0;
        const h = res.headers || {};
        res.resume();
        if ((status >= 500 || status === 429) && n < attempts) return setTimeout(go, 1000 * n);
        resolve({status, content_length: h['content-length'] ? Number(h['content-length']) : null, etag: h.etag || null, accept_ranges: h['accept-ranges'] || null, attempts:n});
      });
      req.setTimeout(20000, () => req.destroy(new Error('timeout')));
      req.on('error', err => {
        if (n < attempts) return setTimeout(go, 1000 * n);
        resolve({status:null, content_length:null, etag:null, accept_ranges:null, attempts:n, error:String(err.message || err)});
      });
      req.end();
    };
    go();
  });
}

(async () => {
  const rows = [];
  for (const d of dates) {
    for (const suite of ['core','qmd']) {
      const key = `blend.${d}/${cycle}/${suite}/blend.t${cycle}z.${suite}.f${lead}.co.grib2`;
      const url = `${base}/${key}`;
      const meta = await head(url);
      rows.push({date:d, cycle_utc:cycle, forecast_hour:Number(lead), suite, key, url, ...meta});
      console.log(JSON.stringify(rows[rows.length-1]));
    }
  }
  const result = {
    status:'RESEARCH_ONLY_2024_ARCHIVE_AVAILABILITY',
    generated:new Date().toISOString(),
    rules:{development_year:2024, holdout_2025_loaded:false, observations_loaded:false, outcomes_loaded:false, forecast_hour:24, calendar_selected_dates:true, missing_stays_missing:true, production_change_authorized:false},
    source:{provider:'NOAA National Blend of Models via NOAA Open Data AWS', base},
    rows,
    summary:{objects:rows.length, http_200:rows.filter(r=>r.status===200).length, core_200:rows.filter(r=>r.suite==='core'&&r.status===200).length, qmd_200:rows.filter(r=>r.suite==='qmd'&&r.status===200).length}
  };
  fs.mkdirSync(require('path').dirname(out), {recursive:true});
  fs.writeFileSync(out, JSON.stringify(result,null,2));
  if (!rows.some(r => r.status === 200)) process.exitCode = 2;
})();
