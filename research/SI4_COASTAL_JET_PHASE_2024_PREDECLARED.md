# SI-4 Coastal-Jet Phase / Expansion-Fan Transfer Candidate — 2024 Predeclared Development Gate

Status: **RESEARCH ONLY — 2024 DEVELOPMENT ONLY — DO NOT LOAD IN PRODUCTION**

Production guard: SI-3.1 on `main` remains the verified production baseline. PR #6 remains draft/unmerged. The frozen 2025 holdout is forbidden development data. This candidate may receive one score-only 2025 evaluation only if every predeclared 2024 chronological-CV gate below passes first.

## Why this is a genuinely new physical hypothesis

Prior rejected SI-4 candidates have already tested static mountain-wave/pressure support, hard-negative recalibration, HRRR cycle agreement, GOES marine-layer state/trends, static and refined inversion/surface coupling, terrain/gust correction, generic event-recall boosts, and a transition/onset candidate using vertical-profile tendency plus evening surface tendency. The rejected transition candidate included a **local NNW-support flag**, but it did **not** explicitly resolve the spatial coastal-flow adjustment around Point Conception or the phase relationship between the upstream coastal jet, pressure fall into the Santa Barbara Channel, and transfer of momentum toward the western Santa Ynez Mountains.

This candidate therefore tests a different mechanism: **whether the spatial phase/alignment of the Point Conception coastal jet and its downstream adjustment provides independent information about when strong NNW marine-layer flow is dynamically positioned to feed western/hybrid Sundowner flow, rather than merely indicating that northerly wind or an offshore pressure gradient exists.**

The candidate is intentionally interaction-based and selective. It must not act as a generic probability boost.

## Primary physical basis

1. Smith et al. (2018), *Journal of Applied Meteorology and Climatology*, DOI `10.1175/JAMC-D-17-0162.1`:
   - strong Sundowner precursor environments contain a strong NNW alongshore jet and a positive MSLP difference from offshore of Point Conception toward Santa Barbara;
   - the alongshore jet and pressure gradient alone do not explain Sundowner variability;
   - the jet may be advected into the Santa Ynez Valley, modified by daytime heating, and subsequently entrained into the lee-slope jet;
   - the offshore wind pattern resembles a supercritical/transcritical expansion fan in the lee of Point Conception.

2. Carvalho et al. (2020), *Monthly Weather Review*, DOI `10.1175/MWR-D-19-0207.1`:
   - observations support possible interaction with the offshore coastal jet, especially for western Sundowners;
   - western-sector events show strong coastal-jet influence while eastern events can occur independently of that jet.

3. Parish et al. (2016), *Journal of Applied Meteorology and Climatology*, DOI `10.1175/JAMC-D-16-0101.1`:
   - aircraft and 1-km WRF observations show strong NNW marine-layer flow accelerating and turning as the marine boundary layer thins south of Point Conception, consistent with expansion-fan dynamics.

4. Rahn et al. (2014), *Monthly Weather Review*, DOI `10.1175/MWR-D-13-00177.1`:
   - Point Conception coastal-jet adjustment depends on the interaction between the upstream marine-layer flow and opposing/modified flow in the Santa Barbara Channel; simple wind magnitude is not sufficient to describe the state.

5. Carvalho et al. (2024), *BAMS*, DOI `10.1175/BAMS-D-22-0171.1`:
   - SWEX specifically targeted the coastal jet as a possible western-Sundowner mechanism and emphasizes that Sundowner evolution depends on interacting upstream, mountain, and marine-boundary-layer processes.

## Predeclared candidate mechanism

Candidate name: `coastal_jet_phase_v1`

Use issuance-time forecast fields only, sampled at fixed geographic points that are declared before scoring:

- **PC-UP (upstream coastal-jet point):** marine point west/northwest of Point Conception, representative of the approaching NNW coastal jet.
- **PC-DOWN (downstream expansion-fan/channel point):** marine point immediately southeast of Point Conception in the western Santa Barbara Channel.
- **SYV-W (western Santa Ynez Valley transfer point):** inland/upstream point north of the western Santa Ynez Mountains.
- Existing fixed zone points for Gaviota, Refugio, San Marcos Pass, Montecito and Carpinteria remain unchanged.

The exact coordinates must be frozen in code before the first 2024 score and then recorded in the output provenance.

### Issuance-time diagnostics

The first implementation may use only these predeclared diagnostics:

1. **Upstream NNW jet magnitude** — vector component of PC-UP low-level flow within the NNW sector.
2. **Downstream turning/acceleration** — increase in low-level speed and clockwise/eastward vector turning from PC-UP to PC-DOWN, representing expansion-fan-like adjustment rather than simple strong wind.
3. **Point-Conception pressure-drop support** — MSLP drop from PC-UP toward PC-DOWN/Santa Barbara Channel.
4. **Valley-transfer alignment** — directional/vector agreement between the adjusted PC-DOWN flow and western-SYV flow toward the Santa Ynez barrier.
5. **Phase coherence** — a bounded joint score that is high only when the upstream jet, downstream adjustment, pressure support, and valley-transfer alignment coexist. A strong value in only one ingredient cannot produce a trigger.

No hydraulic jump, expansion fan, rotor, or coastal-jet interaction may be claimed as observed truth from these forecast diagnostics. They are **susceptibility/phase proxies only**.

## Candidate action

`coastal_jet_phase_v1` is probability-only and targeted to **western and hybrid zones**. Eastern-only rows receive no positive adjustment from this mechanism.

The candidate may alter a baseline probability only when all of the following are true:

- baseline probability is below the frozen event threshold but within a predeclared near-threshold band;
- existing SI-4 atmospheric support is nontrivial;
- the coastal-jet phase-coherence score exceeds one fixed predeclared cutoff;
- at least three of the four physical ingredients above meet their fixed predeclared support thresholds.

The adjustment must be bounded and fixed before the first 2024 CV score. No post-result coefficient, coordinate, threshold, time-window, or regime search is allowed.

Because the hypothesis is phase/alignment based, a candidate is **not allowed** to trigger merely because PC-UP wind speed is strong or because one pressure gradient is large.

## Leakage and provenance rules

- Development interval: exactly `2024-01-01` through `2024-12-31`.
- Chronological cross-validation only; no random shuffling.
- No 2025 observations, misses, event rows, or holdout metrics may be loaded during candidate development.
- Forecast inputs must be issuance-time fixed-lead data available by the forecast issuance.
- HADS/RAWS future verification winds remain labels only.
- Fire association remains outcome-only.
- Missing physical inputs remain null; incomplete phase states cannot be silently treated as favorable.
- Geographic sample points, field names, vector conventions, thresholds and adjustment magnitude must be present in source/provenance before the first 2024 score.
- Infrastructure/archive failures may be retried with bounded backoff; they are not scientific evidence and may not change coefficients.

## Predeclared 2024 chronological-CV gates

Eligibility for one frozen score-only 2025 evaluation requires **all** of the following on concatenated out-of-fold 2024 predictions:

1. **Overall event recall/POD:** absolute event-level POD improvement `>= 0.03` versus the current SI-4 2024 development baseline.
2. **Targeted western/hybrid event recall:** combined western+hybrid event-level POD improvement `>= 0.05`.
3. **False-alarm episodes:** overall event-level FAR `<= baseline FAR + 0.005`.
4. **Western/hybrid false-alarm episodes:** western+hybrid FAR `<= baseline FAR + 0.005`.
5. **Hard-negative calibration:** overall hard-negative Brier `<= baseline * 1.005` and western hard-negative Brier `<= baseline * 1.005`.
6. **Hard-negative FPR:** overall and western hard-negative FPR each `<= baseline + 0.005`.
7. **Overall Brier:** `<= baseline * 1.003`.
8. **Overall AUC:** `>= baseline - 0.003`.
9. **Regime Brier/AUC:** no regime may exceed the same Brier degradation tolerance or fall more than `0.003` AUC below baseline.
10. **Spatial precision:** zone-level precision overall and in western/hybrid zones `>= baseline - 0.005`.
11. **Eastern guard:** eastern Brier/AUC/POD/FAR must be unchanged within numerical tolerance because the candidate is not permitted to positively adjust eastern-only rows.
12. **Gust skill:** unchanged by construction. Any change to gust output automatically fails this workstream.
13. **Trigger selectivity:** at least 80% of adjusted rows must satisfy all required multi-component phase-coherence conditions as recorded in the audit output; no fallback generic wind/pressure trigger is allowed.

If any gate fails, reject `coastal_jet_phase_v1`, record the result, and do **not** expose it to 2025. Do not relax a gate or tune coordinates, coefficients, phase thresholds or probability adjustments after seeing the CV result.

## 2025 lock

A passing 2024 result authorizes exactly one frozen, score-only 2025 evaluation with the complete candidate definition hashed/persisted beforehand. A failed 2025 score cannot be rescued by examining individual misses or retuning to the holdout.
