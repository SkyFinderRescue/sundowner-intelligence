"use strict";

// Availability-only adapter for the predeclared 2024 transition/onset candidate.
// The first attempt scored zero rows because the authoritative fixed-F24 upper-air
// artifact is available only every 6 h. This adapter changes only the vertical-
// profile tendency lookup from 3 h to the immediately preceding available 6-h
// fixed-F24 profile. Surface/pressure tendencies and all science gates remain 3 h.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const srcPath = path.join(__dirname, "evaluate-si4-transition-onset-2024-cv.js");
const tmpPath = path.join(__dirname, ".tmp-evaluate-si4-transition-onset-2024-cv-archive6h.js");
let src = fs.readFileSync(srcPath, "utf8");

const fromLookup = 'raw3=upper.get(`${prior(time)}|${z.name}`)';
const toLookup = 'raw3=upper.get(`${prior(time,6)}|${z.name}`)';
if (!src.includes(fromLookup)) throw new Error("expected upper-profile 3-h lookup not found");
src = src.replace(fromLookup, toLookup);

const fromName = 'candidate:"transition_onset_v1"';
const toName = 'candidate:"transition_onset_v1a_archive6h"';
if (!src.includes(fromName)) throw new Error("expected candidate name not found");
src = src.replace(fromName, toName);

const fromRules = 'predeclared_gates:true,production_change_authorized:false';
const toRules = 'predeclared_gates:true,archive_cadence_adaptation:"vertical_profile_tendency_6h_surface_tendency_3h",production_change_authorized:false';
if (!src.includes(fromRules)) throw new Error("expected rules block not found");
src = src.replace(fromRules, toRules);

fs.writeFileSync(tmpPath, src);
try {
  const r = spawnSync(process.execPath, [tmpPath], { stdio: "inherit", env: process.env });
  if (r.error) throw r.error;
  process.exitCode = r.status == null ? 2 : r.status;
} finally {
  try { fs.unlinkSync(tmpPath); } catch (_) {}
}
