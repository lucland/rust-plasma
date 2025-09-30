# Plasma Furnace Simulator — Requirements (Version 1)
*Version 1*

## 0) Design Principles (all phases)
1. Scientific rigor (Incropera/DeWitt; Patankar numerics); verify with analytical cases and plant data when available.
2. Deterministic builds (Rust 2021, Cargo workspace, reproducible release artifacts).
3. Extensibility (Plugin API, sandboxed **Formula Engine** using Rhai, modular physics packages).
4. Industrial usability (clear errors, bilingual UI EN/PT‑BR, responsive visualization).
5. Safety & security (sandbox formulas/plugins, signed plugins, read‑only plant connections, role‑based access).
6. Academic reproducibility (parameter logging, versioned projects, ADRs).

---

## 1) Physics & Numerics

### 1.1 Core Heat Diffusion (Axisymmetric r–z) 🔴 MVP
- PDE: Transient heat equation in cylindrical coordinates with azimuthal symmetry (∂/∂θ = 0); temperature‑dependent ρ(T), c_p(T), k(T).
- Sources: Radiation, convection (film‑temperature correlations), phase‑change term (enthalpy), and **plasma source** (Gaussian or Jet module hook).
- Methods: **Fast** = Forward Euler with CFL safeguard and auto time‑step control; **Balanced/Accurate** = larger grids with stricter stability control.
- Mesh presets: 50×50 / 100×100 / 200×200.
- BCs: Axis symmetry at r=0; mixed convection–radiation at walls; selectable top/bottom (adiabatic or imposed T).

### 1.2 High‑Accuracy Mode 🟡 IMPORTANT
- **Crank–Nicolson** implicit scheme; SOR linear solver with ω tuning; residual/tolerance controls.
- Enthalpy method (H as primary variable) for robust phase change; energy conservation <1%.
- Diagnostics: stability monitor, iteration counts, residual norms, time‑to‑solution estimate.

### 1.3 Plasma‑Jet Modeling (per torch) 🟢 FUTURE
- Models: (a) CFD RANS (compressible energy + turbulence; swirl number S), (b) simplified 2D MHD for arc‑core forcing.
- Outputs: u_r, u_z, T_g; returns **surface coupling** heat flux h(T_g−T_s)+εσ(T_g⁴−T_s⁴) or localized volumetric source.
- Coupling: **Loose (explicit) operator splitting**; roadmap to semi‑implicit. Per‑torch switch between Gaussian and Jet model.
- Reduced‑order modes; cache jet profiles by (power, flow, S, standoff).

### 1.4 3D Theta Resolution (r–θ–z) 🟢 FUTURE
- Add θ discretization (8–64 sectors); adapter from 2D axisymmetric. 3D visualization supported.

---

## 2) Visualization & UX

### 2.1 3D Field Viewer 🔴 MVP
- Volume/isosurface heatmap with time slider; rotate/zoom/pan; value probe.
- Fallback 2D slice if GPU limited.

### 2.2 Cross‑Sections & Advanced Rendering 🟡 IMPORTANT
- Arbitrary r–z slice placement synchronized with 3D timeline; quality presets; smooth animation controls.

### 2.3 VR Mode (desktop HMD) 🟢 FUTURE
- Isosurfaces/volume fields; probe readouts; teleport/grab navigation; persistent view state.

### 2.4 UX Essentials 🔴 MVP
- Cold‑start ≤ 5 s on target hardware; progress bar & **cancel** during runs; autosave on crash.
- Shortcuts: F5 run, Ctrl+S save project, Ctrl+O open; tooltips and a minimal “Getting Started” panel.
- Recent files list; clear failure messages with suggested fixes.

---

## 3) Parameters, Materials & Formula Engine

### 3.1 Basic Parameter UI 🔴 MVP
- Geometry, mesh preset, initial & ambient T, BCs, **torch placement & power/efficiency**, material picklist, run duration.
- **Project save/load (JSON)** with version metadata (not considered “data export of results”).

### 3.2 Advanced Configuration 🟡 IMPORTANT
- Multi‑torch positioning/orientation; enthalpy phase parameters.
- **Formula‑driven** convection coefficients & temperature‑dependent properties via **Rhai**.
- Multi‑zone regions with distinct materials; material editor for T‑dependent properties and latent heat.

---

## 4) Validation & Reporting

### 4.1 Scientific Validation 🟡 IMPORTANT
- Analytical benchmarks (Carslaw & Jaeger); mesh/time convergence with MAE, RMSE, MAPE, R², and L² norm.
- Render core equations/discretizations with LaTeX; method trade‑offs summary.

### 4.2 Experimental Energy‑Balance Validation 🟢 FUTURE
- Import plant CSV; compute thermal efficiency and decompose losses; calibration hints (ε, h, source model).

### 4.3 Export & Data Products 🟡 IMPORTANT
- **Results exports**: CSV/JSON fields & time series; **VTK** grid outputs; PNG images; **probe point** series.
- **Large data**: chunked export with progress; background export that doesn’t block the UI.
- **Reports**: HD animations and PDF report generator (acceptance criteria define format & metadata).

> **Note:** No exports in MVP—visualize on screen only.

---

## 5) Waste, Emissions & Operations

### 5.1 Waste Feed Modeling 🟡 IMPORTANT → 🟢 FUTURE
- **Phase A (🟡):** Input **waste type** (medical, municipal, bones, biological) with ranges (density, moisture, ash); simple **throughput** (kg/h) timeline.
- **Phase B (🟢):** Multi‑stream blending; stochastic variability; derived heating value & moisture latent loads; **radioactive tag**; **operational recommendations** (suggested torch power/dwell time).

### 5.2 Furnace Components & Emissions 🟢 FUTURE
- Component models (refractory, hearth, slag pool).
- **Off‑gas** train (cyclone, **filters/baghouse**, scrubber): predicted emissions & collection rates; pressure‑drop/efficiency curves; **filter loading** and maintenance indicators.
- KPIs: particulate load, filter‑inlet temperature, predicted emission classes; compliance hooks.

### 5.3 Alerts & Operational Guardrails 🟢 FUTURE
- Rule‑based alerts (refractory over‑T, wall loss, filter‑inlet > limit, emission spike).
- Recommendations and scheduling; notification bus with throttling & acknowledgment; alert history export (depends on exports being 🟡).

### 5.4 Live Connectivity / Digital Twin 🔵 LONG‑TERM
- Read‑only connectors (OPC UA/Modbus‑TCP) for **live tags**; tag mapping UI; live replay & “ghost run” (≤ 500 ms UI latency).
- **Optional write‑back** of optimized setpoints behind roles/policies and safety interlocks; real‑time dashboard.

### 5.5 Compliance & Reporting 🔵 LONG‑TERM
- Audit/report templates (EN/PT‑BR): run settings, KPIs, alerts, changes, plugin hashes.
- Regulatory targets: IBAMA, ANVISA, CNEN report packs; emission limits; PDF export.

---

## 6) Platform, Packaging & Performance

### 6.1 Tech Stack & Build 🔴 MVP
- Rust 2021 + Cargo workspace; Tauri 2.5 desktop; Windows/macOS/Linux targets.
- Crates: ndarray, rayon, serde/serde_json, rhai, log/env_logger, anyhow/thiserror.
- Reproducible builds; CLI for batch; logging controls; ADRs tracked.

### 6.2 Performance Targets 🔴/🟡
- 🔴 MVP: Fast mode < 30 s on modest meshes; 15+ FPS 3D at ~100×100×100; memory < 2 GB (Fast), < 4 GB (Balanced).
- 🟡 IMPORTANT: 30+ FPS at ~200×200×200; memory < 8 GB; background export doesn’t block UI (exports are 🟡).

### 6.3 Packaging & Project Format 🟡 IMPORTANT
- `.pfp` bundles (ZIP): configuration, materials, formulas, **results** (once exports exist). Error codes and glossary maintained.

---

## 7) Security, Safety & Governance
- Sandboxed **Formula Engine** (CPU/time/memory limits); safe plugin loader; signed manifests.
- Role‑based access (Operator/Engineer/Admin); audit logs for settings and connections.
- Offline simulations by default; live connectors disabled until configured.

---

## 8) Documentation & Localization
- Rustdoc for public APIs; math in docstrings; examples/doctests **begin at 🟡**.
- User manual + “Getting Started”; Architecture Decision Records (ADRs).
- English & Portuguese UI/docs.

---

## 9) Roadmap & Milestones
- **MVP (🔴)**: 2D heat diffusion + Gaussian/parametric sources; basic 3D viz; project save/load; mesh presets; stability controls; startup/cancel/shortcuts.
- **Release 1 (🟡)**: Crank–Nicolson + enthalpy; advanced viz & slices; formula correlations; Waste Phase A; **all exports (CSV/JSON/VTK/PNG)** + probe series + chunked export; validation automation & **unit/integration tests** start here.
- **Release 2 (🟢)**: Plasma‑jet module; 3D θ discretization; emissions/filters basics with filter loading; energy‑balance validation; alerting & recommendations.
- **Release 3 (🔵)**: Live connectivity (read‑only) + dashboard; compliance report packs; role‑based access; optional write‑backs; digital‑twin workflows.

---

## 10) Acceptance Criteria Snapshots
- **MVP**: R=1.5 m, H=4 m, 1 torch @ 250 kW, mesh 50×50, 60 s → < 30 s runtime; energy residual < 10%; responsive 3D playback; run **cancel** works; **no result exports** required.
- **Release 1**: CN+Enthalpy with SOR residual < 1e‑5 ≤ 200 iters/step; energy error < 1%; validation report with MAE/RMSE/L²; **VTK/CSV/JSON/PNG** exports and probe time‑series available; chunked export functional.

---

## 11) Traceability to Code Structure
- `src/simulation/mesh.rs`: Cylindrical grid (2D); θ adapter later.
- `src/simulation/physics.rs`: Heat PDE, radiation/convection, enthalpy, Gaussian torch; jet hooks.
- `src/simulation/solver.rs`: Forward Euler (MVP); Crank–Nicolson + SOR (Release 1).
- `src/simulation/materials.rs`: Libraries + editor; T‑dependent properties.
- `src/simulation/validation.rs`: Analytical cases & KPIs (active at 🟡).
- `src/simulation/visualization.rs`: Volume/isosurface/slice data; (export writers activate at 🟡).
- `src/formula/`: Rhai engine; correlations; properties.
- `src/plugins/`: Plugin API; future Jet module.
- `src-tauri/src/parameters.rs`: UI marshalling; project IO.
- `src-tauri/src/simulation.rs`: Run control; status; logging; batch CLI; cancel handling.
- `src-tauri/ui/`: Parameter forms; viewers; localization; recent files/shortcuts.

---

## 12) Definitions of Done
- **MVP**: All 🔴 implemented; performance/accuracy thresholds met; user manual MVP; sample projects. **(No unit/integration tests required.)**
- **IMPORTANT**: All 🟡 implemented; **unit/integration tests** added; validation pack & automated reports; VTK verified with ParaView; reproducibility checks.
- **FUTURE/LONG‑TERM**: Feature flags/config schemas; stubs/adapters merged without breaking earlier phases.
