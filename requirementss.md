# plasma-heat-transfer-simulation

# Plasma Furnace Simulator v1.0 – Combined Requirements & Architecture

---

## Part I: Software Requirements Document (SRD)

### 1. Introduction

#### 1.1 Purpose  
To provide researchers with a locally installable desktop tool (Windows/macOS) to simulate, visualize, analyze and validate heat propagation in a cylindrical plasma furnace for waste‑incineration research. The software emphasizes computational efficiency on standard hardware (e.g., Apple M1) while allowing high‑fidelity “turbo” runs via optional cloud offload.

#### 1.2 Scope  
- Physics modules: conduction, radiation, phase changes (vaporization, melting), simplified convection/turbulence.  
- User‑defined geometry and multi‑torch configurations.  
- 2D/3D heatmap visualization with playback controls.  
- Formula inspection/editing sandboxed for safety.  
- Data export (CSV/JSON) with raw data, parameters, and performance metrics.  
- Plugin API to extend physics solvers.  

#### 1.3 Target Audience  
Researchers in materials science, thermodynamics, environmental engineering, and related fields—adept at leveraging GUIs but not necessarily programmers.

#### 1.4 Definitions & Acronyms  
- **SRD**: Software Requirements Document  
- **SAD**: Software Architecture Document  
- **CFD**: Computational Fluid Dynamics  
- **UI**: User Interface 
- **ER**: Equivalence Ratio  
- **S/F**: Steam‑to‑Feedstock ratio  
- **PER**: Plasma Energy Ratio  
- **SER**: Specific Energy Requirement  
- **MVP**: Minimum Viable Product  
- **SOLID**: Object‑oriented design principles  

---

### 2. Overall Description

#### 2.1 Product Perspective  
A standalone desktop application, calling a simulation core for zero‑copy, low‑latency performance.

#### 2.2 Product Features (Summary)  
- Geometry & torch configuration  
- Material and kinetic property definition (temperature‑dependent)  
- Multi‑zone simulation (drying, pyrolysis, gasification, melting)  
- 2D/3D heatmap visualizations with playback controls  
- Formula display and safe editing (sandboxed evaluator)  
- Performance metrics: syngas yield, heating value, SER, mass/volume reduction  
- Export of full dataset + metrics (CSV/JSON)  
- Validation‑data import and comparison tools  
- Plugin API for custom physics extensions  
- Batch/parametric study mode  
- Project workspace persistence  

#### 2.3 User Classes and Characteristics  
Researchers need an intuitive GUI with advanced controls hidden behind “expert” toggles. They require clear error messages, tooltips, and example workspaces.

#### 2.6 Assumptions & Dependencies  
- Users supply or choose material data from built‑in database  
- Host machine meets minimum hardware specs 
- Simplifications versus full CFD are documented  

#### 2.8 Error Handling & Logging Requirements  
- **Structured logs** (JSON) with levels (DEBUG, INFO, WARN, ERROR) written to user‑configurable file.  
- **Error codes** for all failures: simulation convergence.
- **UI notifications** via dialogs/snackbars with actionable messages (“Retry,” “Switch to local”).  
- **Automatic retry**: Cloud offload retries up to 3×; on persistent failure, falls back to local run with user prompt.  
- **Crash‑safe**: Uncaught panics in Rust are caught, logged, and surfaced to the UI in human‑readable form.  

---

### 3. Functional Requirements (FR)

#### FR1: Parameter Input  
- **FR1.1**: Input furnace geometry (cylinder height, diameter).  
- **FR1.2**: Define number, 3D position, and orientation of plasma torches.  
- **FR1.3**: Input operational parameters per torch (power, flow, temperature).  
- **FR1.4**: Define initial material properties (composition, density, water content).  
  - **FR1.4.2**: Temperature‑dependent properties via functions/tables.  
- **FR1.5**: Define boundary conditions (wall heat‑loss toggles, wall properties).  
- **FR1.6**: Enable/disable specific phenomena (simplified convection).  
- **FR1.7**: Input total simulation time.  
- **FR1.8**: Define simulation precision (mesh density).  
- **FR1.9**: Define gasification agent and related parameters (ER, S/F).  
- **FR1.10**: Validate inputs on‑the‑fly; show context‑sensitive error messages.

#### FR2: Simulation Execution  
- **FR2.1**: Calculate heat propagation (conduction, radiation).  
  - **FR2.1.1**: Distinct zones (drying, pyrolysis, etc.) if enabled.  
  - **FR2.1.2**: Optional simplified turbulence/convection.  
- **FR2.2**: Account for phase‑change energy (vaporization, latent heat).  
- **FR2.4**: Communicate simulation progress to UI.  
- **FR2.5**: Expose simulation errors (divergence, singularities) via error codes; abort gracefully.

#### FR3: Visualization  
- **FR3.1**: Display temperature as heatmaps.  
- **FR3.2**: 3D volume vs. 2D cross‑sections.  
- **FR3.3**: Playback controls (play, pause, step, slider).  
- **FR3.4**: Select visualization styles (color schemes, isotherms).  
- **FR3.5**: Adjust rendering quality/update frequency.  
- **FR3.6**: On rendering errors (e.g., OOM), auto‑reduce detail and notify user.

#### FR4: Formula Management  
- **FR4.1**: Display core mathematical formulas.  
- **FR4.2**: Optional editing with clear warnings.  
- **FR4.3**: Sandbox evaluation with resource/time limits; prevent malicious or runaway expressions.

#### FR5: Data Output & Metrics  
- **FR5.1**: Download simulation results.  
- **FR5.2**: Include raw data, input parameters, metrics (CSV/JSON).  
- **FR5.3**: Calculate/display syngas composition, heating value, SER, reduction.  
- **FR5.4**: Log export errors (disk full, permission denied) and prompt alternate path.

#### FR6: User Interface  
- **FR6.1**: Intuitive parameter input, simulation control, visualization.  
- **FR6.2**: Runs as native desktop app.  
- **FR6.3**: Tooltips/help text for parameters.  
- **FR6.4**: Offline help pages and “Getting Started” wizard.

#### FR7: Model Validation Interface  
- **FR7.1**: Import experimental/benchmark data (CSV).  
- **FR7.2**: Overlay/numerical comparison of simulation vs. validation.  
- **FR7.3**: Compute error norms (L², max) with summary table and deviation plots.

#### FR8: Batch & Parametric Studies  
- **FR8.1**: Define parameter sweeps (ranges/steps) and run multiple simulations.  
- **FR8.2**: Aggregate results into sensitivity charts.

---

### 4. Non‑Functional Requirements (NFR)

- **NFR1: Platform Compatibility**  
  Standalone executable on Windows 10/11 and macOS (Intel/ARM).

- **NFR2: Performance**  
  - Local solve: 100³ grid in < 5 s on Apple M1.  
  - Optimized Rust backend with multithreading.  
  - Responsive UI (< 100 ms interactions).

- **NFR3: Accuracy & Reliability**  
  - Verifiable physical models; documented assumptions.  
  - Validation against benchmarks/analytical solutions.  
  - Versioned physics‑model manifest.

- **NFR4: Usability**  
  - Clear interface; minimal learning curve.  
  - Accessibility support (keyboard, high‑contrast themes).

- **NFR5: Maintainability**  
  - Well‑structured, documented code. 

- **NFR6: Deployability**  
  Single installer per platform; no dev environment needed.

- **NFR8: Security & Sandbox**  
  Secure formula editor; no arbitrary I/O or network in plugins.

---

### 5. Quality Assurance & Testing  
- Unit, integration, validation, performance, end‑to‑end, and usability tests.  
- Error‑handling tests for load failure, cloud timeouts, export errors.  
- Accessibility and regression benchmarks in CI.

---

### 6. Supporting Documents & Diagrams  
1. **Use Case Diagram**  
2. **Sequence Diagrams** 
3. **Class Diagrams** (key data structures)  
4. **State Machine Diagram** (simulation lifecycle)  
5. **Test Plan** & **Validation Report**  
6. **User Manual** (installation & walkthrough)  

---

---

## Part II: Software Architecture Document (SAD)


---

### 2. Architectural Goals  
- **Performance**: Native Rust for heavy numerics.  
- **Modularity**
- **Maintainability**
- **Usability**: Native desktop UX, offline help.  
- **Deployability**: Single installer.  
- **Scalability**: Cloud offload with robust retry/fallback.  

---

### 4. Component Breakdown

#### 4.1 Frontend 

#### 4.2 Simulation Core (Rust library)  
- **Responsibilities**: Physics solvers, mesh management, plugin API, serialization.  
- **Key Crates**: `ndarray`, `tokio`+`reqwest`, `rhai`, `log`/`env_logger`, `anyhow`/`thiserror`.  


### 8. Data Management  
- In‑memory state in Rust;
- Exports via Rust; invokes save dialogs.  
- Workspaces saved as JSON: parameters, results references, metadata.



### 10. Supporting Documents & Diagrams  
1. Use Case Diagram  
2. Component Diagram
3. Sequence Diagrams
4. State Machine Diagram (simulation lifecycle) 
5. User Manual with installation & walkthrough  

---  




# Appendix: Inputs, Calculations, Compliance & Validation

## 1. User Inputs to the Simulation

| Category                 | Parameter                                    | Type            | Units        | Notes / Valid Range                       |
|--------------------------|----------------------------------------------|-----------------|--------------|-------------------------------------------|
| **Geometry**             | Cylinder height                              | float           | m            | e.g. 0.5–5.0                               |
|                          | Cylinder radius                              | float           | m            | e.g. 0.1–1.0                               |
| **Torches**              | Number of torches                            | integer         | –            | 1–8                                       |
|                          | Torch position (r, z)                        | array of floats | m            | 0 ≤ r ≤ radius, 0 ≤ z ≤ height            |
|                          | Torch orientation (pitch, yaw)               | array of floats | deg          | 0–360                                     |
|                          | Torch power                                  | float           | kW           | e.g. 0–200                                 |
|                          | Torch gas flow                               | float           | kg/s         |                                           |
|                          | Torch gas temperature                        | float           | °C           | e.g. 500–20 000                            |
| **Material Properties**  | Material type                                | enum            | –            | Dropdown of built‑in materials             |
|                          | Density                                      | float           | kg/m³        |                                           |
|                          | Moisture content                             | float           | %            | 0–100                                     |
|                          | Specific heat capacity, \(c_p(T)\)           | function/table  | J/(kg·K)     | Tabulated or analytic                     |
|                          | Thermal conductivity, \(k(T)\)               | function/table  | W/(m·K)      |                                           |
|                          | Pyrolysis kinetics (Arrhenius A, \(E_a\))    | two floats      | –            |                                           |
| **Boundary Conditions**  | Wall emissivity                              | float           | –            | 0–1                                       |
|                          | Convection coefficient \(h\)                 | float           | W/(m²·K)     | e.g. 5–100                                 |
|                          | Ambient temperature                          | float           | °C           |                                           |
|                          | Enable/disable convection                     | bool            | –            |                                           |
|                          | Enable/disable radiation                      | bool            | –            |                                           |
| **Simulation Control**   | Total simulation time                        | float           | s            |                                           |
|                          | Time step                                    | float           | s            | auto‑computed or user‑set                  |
|                          | Mesh density (radial × axial nodes)          | two integers    | –            | e.g. 50×100                                |
|                          | Precision mode                                | enum            | –            | “Fast”, “Balanced”, “High‑Fidelity”        |
| **Gasification Agent**   | Agent type                                   | enum            | –            | Air, Steam, Air/Steam mix                  |
|                          | Equivalence ratio (ER)                       | float           | –            | 0.1–2.0                                   |
|                          | Steam‑to‑Feedstock ratio (S/F)               | float           | –            | 0–10                                      |

> **Validation of inputs**  
> • Out‑of‑range entries trigger inline error messages.  
> • Logical checks (e.g. total mass flow vs. torch capacity) enforced before run.

---

## 2. Simulation Engine Calculations

The core solves the transient heat equation in cylindrical coordinates \((r, θ, z)\), assuming azimuthal symmetry (∂/∂θ = 0):

\[
\rho\,c_p(T)\,\frac{\partial T}{\partial t}
= \frac{1}{r}\,\frac{\partial}{\partial r}\!\Bigl(r\,k(T)\,\frac{\partial T}{\partial r}\Bigr)
+ \frac{\partial}{\partial z}\!\Bigl(k(T)\,\frac{\partial T}{\partial z}\Bigr)
+ Q_{\mathrm{rad}}(r,z,t)
+ Q_{\mathrm{conv}}(r,z,t)
+ Q_{\mathrm{phase}}(r,z,t)
\]

### 2.1 Spatial & Temporal Discretization

- **Mesh**: Uniform grid with \(N_r\) radial and \(N_z\) axial nodes.  
- **Time integration**: Implicit Crank–Nicolson (50 % implicit) for stability at larger time steps.  
- **Linear solver**: Multi‑threaded banded matrix solve (e.g. Thomas algorithm extended to 2D).

### 2.2 Conduction Term

At node \((i,j)\):
\[
\begin{aligned}
&\frac{1}{r_i}\frac{\partial}{\partial r}\Bigl(r\,k\,\partial_r T\Bigr)\approx
\frac{1}{r_i\,\Delta r}\bigl[r_{i+\frac12}\,k_{i+\frac12}\,\delta_r^+T
- r_{i-\frac12}\,k_{i-\frac12}\,\delta_r^-T\bigr],\\
&\frac{\partial}{\partial z}\Bigl(k\,\partial_z T\Bigr)\approx
\frac{k_{j+\frac12}\,\delta_z^+T - k_{j-\frac12}\,\delta_z^-T}{(\Delta z)^2},
\end{aligned}
\]
where \(\delta_r^{\pm}T = T_{i\pm1,j}-T_{i,j}\), etc.

### 2.3 Radiation Source

Each grid cell exchanges radiative heat with torch(s):
\[
Q_{\mathrm{rad}} = \sum_{\text{torches}} \varepsilon\,\sigma\,F_{m\to c}\,\bigl(T_{\mathrm{torch}}^4 - T^4\bigr),
\]
- \(\sigma\): Stefan–Boltzmann constant  
- \(F_{m\to c}\): view factor from torch to cell  
- \(\varepsilon\): emissivity  

### 2.4 Convection Source

\[
Q_{\mathrm{conv}} = h\,A_{\mathrm{cell}}\,\bigl(T_{\mathrm{gas}} - T\bigr).
\]

### 2.5 Phase Change (Enthalpy Method)

Effective heat capacity near phase‑change temperature \(T_m\):
\[
c_p^{\mathrm{eff}}(T) = c_p + \frac{L}{\Delta T_{\mathrm{pc}}},
\]
where \(L\) is latent heat and \(\Delta T_{\mathrm{pc}}\) is small smoothing interval around \(T_m\).

### 2.6 Multi‑Zone Logic

Switch material/energy terms based on local \(T\):

| Zone       | Temperature Range          | Special Terms            |
|------------|----------------------------|--------------------------|
| Drying     | \(T<100^\circ\mathrm{C}\)  | Moisture evaporation     |
| Pyrolysis  | 100–400 °C                 | Char kinetics            |
| Gasification | 400–1000 °C              | Syngas generation        |
| Melting    | \(>1000^\circ\mathrm{C}\)  | Latent heat of fusion    |

### 2.7 Boundary Conditions

- **Axis** (\(r=0\)): symmetry → \(\partial_r T=0\).  
- **Outer wall** (\(r=R\)): mixed convection + radiation.  
- **Top/bottom** (\(z=0,H\)): user‑selectable (adiabatic or specified temperature).

---

## 3. Academic Compliance

1. **Governing Equations**  
   Based on standard heat‑transfer formulations (Incropera & DeWitt, *Fundamentals of Heat and Mass Transfer*).

2. **Numerical Methods**  
   - Finite difference in cylindrical coordinates, described in Patankar, *Numerical Heat Transfer and Fluid Flow*.  
   - Crank–Nicolson time integration for second‑order accuracy and unconditional stability.

3. **Material & Kinetic Data**  
   - Uses peer‑reviewed property databases (e.g. NIST, JANAF) for \(k(T)\), \(c_p(T)\).  
   - Arrhenius parameters aligned with literature on biomass pyrolysis kinetics (Yang et al., *Biomass & Bioenergy*, 2006).

4. **Code Quality & Reproducibility**  
   - All algorithms versioned and documented; open plugin API ensures transparency.  
   - Unit and integration tests accompanied by references to analytical or benchmark problems.

---

## 4. Scientific Validation

### 4.1 Analytical Benchmark

- **Test case**: Solid cylinder heated suddenly at surface to \(T_s\).  
- **Analytical solution**: series solution (Carslaw & Jaeger).  
- **Validation**: run simulation, compute temperature profiles \(T(r,t)\), and calculate  
  \[
    \text{error}_{L^2} = \sqrt{\frac{\sum (T_{\text{num}}-T_{\text{analytical}})^2}{N_r\,N_t}} < 5\%.
  \]

### 4.2 Experimental Comparison

- **Dataset**: Char pyrolysis temperatures vs. time from Smith et al., *Journal of Thermal Analysis*, 2018.  
- **Procedure**: import CSV; overlay simulation and experimental curves; compute maximum deviation.

### 4.3 Error Metrics

| Metric         | Definition                                                |
|----------------|-----------------------------------------------------------|
| **L² norm**    | \(\sqrt{\sum (T_{\text{num}}-T_{\text{exp}})^2 / N}\)      |
| **Max error**  | \(\max |T_{\text{num}}-T_{\text{exp}}|\)                   |
| **RMS error**  | \(\sqrt{\sum (T_{\text{num}}-T_{\text{exp}})^2 / N}\)      |

### 4.4 Validation Workflow

1. **Import experimental CSV**  
2. **Align time/temperature scales**  
3. **Compute error metrics**  
4. **Generate deviation plots** for each zone  
5. **Produce summary report** (automated PDF or JSON)  

---
