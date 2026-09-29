"use strict";

const fs = require("fs");
const path = require("path");

const BUCKET = "noaa-ndfd-pds";
const BASE = `https://${BUCKET}.s3.amazonaws.com/`;
const OUT = process.env.OUT || "research/ndfd-archive-probe.json";
const SAMPLE_DATES = (process.env.SAMPLE_DATES || "2025/01/15,2025/05/15,2025/07/15,2025/11/15").split(",");

function decodeXml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function values(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g");
  let m;
  while ((m = re.exec(xml))) out.push(decodeXml(m[1]));
  return out;
}

async function fetchText(url, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(url, {
        signal: ctl.signal,
        headers: { "User-Agent": "Sundowner-Intelligence-SI4-NDFD-Research/1.0" }
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return await r.text();
    } catch (e) {
      clearTimeout(timer);
      last = e;
      if (i + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw last;
}

async function list(prefix, delimiter = "/", maxKeys = 1000) {
  const u = new URL(BASE);
  u.searchParams.set("list-type", "2");
  u.searchParams.set("prefix", prefix);
  if (delimiter) u.searchParams.set("delimiter", delimiter);
  u.searchParams.set("max-keys", String(maxKeys));
  const xml = await fetchText(u);
  const prefixes = values(xml, "Prefix").filter(p => p !== prefix);
  const keys = values(xml, "Key");
  const sizes = values(xml, "Size").map(Number);
  const modified = values(xml, "LastModified");
  return {
    request: u.toString(),
    common_prefixes: [...new Set(prefixes)],
    objects: keys.map((key, i) => ({ key, size: Number.isFinite(sizes[i]) ? sizes[i] : null, last_modified: modified[i] || null }))
  };
}

(async () => {
  const root = await list("wmo/", "/");
  const parameterPrefixes = root.common_prefixes
    .filter(p => p.startsWith("wmo/"))
    .map(p => p.slice(4).replace(/\/$/, ""))
    .sort();
  const windCandidates = parameterPrefixes.filter(p => /wind|gust|wspd|wdir/i.test(p));

  const sampleCoverage = {};
  for (const parameter of windCandidates) {
    sampleCoverage[parameter] = {};
    for (const d of SAMPLE_DATES) {
      const p = `wmo/${parameter}/${d}/`;
      try {
        const r = await list(p, "", 25);
        sampleCoverage[parameter][d] = {
          count_sampled: r.objects.length,
          sample_keys: r.objects.slice(0, 10)
        };
      } catch (e) {
        sampleCoverage[parameter][d] = { error: String(e.message || e) };
      }
    }
  }

  const topObjects = await list("", "", 100);
  const lookupObjects = topObjects.objects.filter(o => /ndfd.*\.(xls|xlsx|csv)$/i.test(o.key));

  const out = {
    status: "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    generated: new Date().toISOString(),
    purpose: "Discover the authoritative NOAA NDFD Open Data archive layout before building a matched fixed-lead NWS benchmark. This probe does not alter model coefficients or production data.",
    source: {
      dataset: "NOAA National Digital Forecast Database (NDFD)",
      bucket: BUCKET,
      registry: "https://registry.opendata.aws/noaa-ndfd/",
      ncei_product_page: "https://www.ncei.noaa.gov/products/weather-climate-models/national-digital-forecast-database",
      archive_structure: "wmo/<parameter>/<year>/<month>/<day>/<wmo-file-name>"
    },
    parameter_prefix_count: parameterPrefixes.length,
    parameter_prefixes: parameterPrefixes,
    wind_candidates: windCandidates,
    sample_dates: SAMPLE_DATES,
    sample_coverage: sampleCoverage,
    lookup_objects: lookupObjects,
    rules: {
      official_forecast_only: true,
      fixed_lead_required: true,
      hindsight_products_forbidden: true,
      future_observation_leakage: false,
      production_change: false
    }
  };

  if (!parameterPrefixes.length) throw new Error("NDFD wmo parameter prefixes were not discoverable");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify({ parameter_prefix_count: parameterPrefixes.length, wind_candidates: windCandidates, output: OUT }, null, 2));
})().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
