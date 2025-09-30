# Plasma Furnace Simulator – Complete Requirements & Technical Specification
*Final Consolidated Version*

## Executive Summary

This document provides the complete requirements, technical specifications, and implementation guidelines for developing a Plasma Furnace Simulator that calculates and visualizes heat diffusion and distribution over time inside a cylindrical plasma furnace. The simulator addresses complex challenges in modeling transient heat transfer coupled with solid-liquid-vapor phase transitions, targeting researchers in materials science, thermodynamics, and environmental engineering.

## Table of Contents
1. [Product Vision](#product-vision)
2. [Priority Classification](#priority-classification)
3. [Core Design Principles](#core-design-principles)
4. [Technical Requirements](#technical-requirements)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Implementation Details](#implementation-details)
8. [Development Roadmap](#development-roadmap)
9. [Technical Reference](#technical-reference)

---

## Product Vision

### Core Purpose
- Simulate plasma-material interactions in cylindrical furnace geometries
- Model heat transfer with phase changes (melting, vaporization) using the enthalpy method
- Support research in metallurgy, advanced manufacturing, and high-temperature materials processing
- Provide accurate computational tools for waste incineration and materials synthesis research

### Key Capabilities
- Multi-torch plasma configurations with 3D positioning
- Temperature-dependent material properties
- Real-time 2D/3D heatmap visualization with playback controls
- Parametric studies and optimization workflows
- Data export in multiple formats (CSV, JSON, VTK)
- Plugin system for extending physics models
- Formula engine for custom material properties and boundary conditions

### Target Users
Researchers in materials science, thermodynamics, environmental engineering, and related fields who need computational tools for plasma processing analysis but may not be programmers themselves. Brazilian company operating plasma furnaces for medical waste, biological residues, and potentially radioactive waste from oil extraction operations.

---

## Priority Classification

- 🔴 **CRITICAL (MVP)**: Core heat diffusion calculation and basic 3D visualization
- 🟡 **IMPORTANT**: Enhanced accuracy, advanced visualization, and industrial features
- 🟢 **FUTURE**: Advanced physics modeling and operational features
- 🔵 **LONG-TERM**: Live integration and compliance features

---

## Core Design Principles

1. **Scientific Accuracy**: Base all calculations on established heat transfer principles (Incropera & DeWitt, Patankar numerics) with validated numerical methods
2. **Performance First**: Prioritize smooth, responsive 3D visualization and fast simulation times
3. **Industrial Usability**: Clear UI, robust error handling, bilingual support (EN/PT-BR)
4. **Extensibility**: Modular architecture with plugin API and sandboxed formula engine (Rhai)
5. **Safety & Security**: Sandboxed execution for custom formulas and plugins
6. **Academic Reproducibility**: Parameter logging, versioned projects, Architecture Decision Records (ADRs)

---

## Technical Requirements

### 🔴 CRITICAL (MVP) Requirements

#### 1. Core Heat Diffusion Simulation

**Governing Equation**: Transient heat equation in cylindrical coordinates
$$\rho c_p \frac{\partial T}{\partial t} = \frac{1}{r} \frac{\partial}{\partial r}\left(kr \frac{\partial T}{\partial r}\right) + \frac{\partial}{\partial z}\left(k \frac{\partial T}{\partial z}\right) + Q$$

**Technical Specifications**:
- **Geometry**: Cylindrical domain (R: 0.5-5.0m, H: 1.0-10.0m)
- **Coordinate System**: 2D axisymmetric (r-z) with azimuthal symmetry (∂/∂θ = 0)
- **Initial Numerical Method**: Forward Euler (explicit) with CFL stability control
  - Stability criterion: $\Delta t \leq \min(\rho c_p \Delta r^2/(2k), \rho c_p \Delta z^2/(2k))$
- **Mesh Presets**: 
  - Fast: 50×50 nodes
  - Balanced: 100×100 nodes
  - High: 200×200 nodes

**Plasma Heat Source Model**:
$$Q(r,z) = \frac{P \cdot \eta}{2\pi\sigma^2} \cdot \exp\left(-\frac{(r-r_0)^2 + (z-z_0)^2}{2\sigma^2}\right)$$

Where:
- P: Torch power (10-500 kW typical)
- η: Torch efficiency (0.5-0.95)
- σ: Dispersion parameter (m)

**Boundary Conditions**:
- Axis: Symmetry at r=0
- Walls: Mixed convection-radiation
- Stefan-Boltzmann radiation: $q_r = \varepsilon \sigma (T^4 - T_{amb}^4)$

**Performance Requirements**:
- Fast mode (50×50, 60s): < 30 seconds runtime
- Memory usage: < 2GB (Fast), < 4GB (Balanced)
- Energy conservation error: < 10%

#### 2. 3D Visualization System

**Core Features**:
- Volume rendering with temperature color mapping
- Playback controls (play, pause, time slider)
- Interactive camera (rotate, zoom, pan)
- Maintain 15+ FPS for MVP meshes

#### 3. Basic Project Management

**Capabilities**:
- Save/load configurations (JSON format)
- Parameter validation
- Default presets
- Recent files list

### 🟡 IMPORTANT Requirements

#### 4. Enhanced Numerical Methods

**Crank-Nicolson Scheme** (Implicit, unconditionally stable):
$$\frac{T^{n+1} - T^{n}}{\Delta t} = \frac{\alpha}{2} \left( \nabla^2 T^n + \nabla^2 T^{n+1} \right) + \frac{S^n + S^{n+1}}{2 \rho c_p}$$

**Successive Over-Relaxation (SOR) Solver**:
- Iterative solution of resulting linear system
- Relaxation factor ω (1 < ω < 2)
- Convergence tolerance: 1e-6 to 1e-3

#### 5. Enthalpy Method for Phase Changes

**Approach**: Solve for enthalpy H instead of temperature T
$$\rho \frac{H^{n+1} - H^n}{\Delta t} = \nabla \cdot (k \nabla T)^n + S^n$$

**Benefits**:
- Robust energy conservation (<1% error)
- Natural handling of latent heat
- Correct isotherm behavior at phase transitions

#### 6. Advanced Visualization

- Cross-sections with arbitrary plane cutting
- Isosurfaces and volume rendering
- Quality presets and smooth animations
- Target: 30+ FPS at 200×200×200 resolution

#### 7. Data Export & Validation

**Export Formats**:
- CSV: Tabular data for analysis
- JSON: Complete simulation state
- VTK: ParaView-compatible 3D data
- PNG: High-resolution snapshots (4K)

**Validation Metrics**:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- R² coefficient
- Comparison against Carslaw & Jaeger analytical solutions

---

## Technology Stack

### Backend (Simulation Engine)
- **Language**: Rust (edition 2021)
- **Key Crates**:
  - `ndarray`: Multi-dimensional arrays with BLAS integration
  - `rayon`: Data parallelism for performance
  - `serde`/`serde_json`: Serialization
  - `rhai`: Embedded scripting for formulas
  - `anyhow`/`thiserror`: Error handling
  - `log`/`env_logger`: Structured logging

### Frontend (Desktop Application)
- **Framework**: Tauri v2.5.0
- **UI**: HTML/CSS/JavaScript
- **3D Graphics**: WebGL/WebGPU via Three.js or native OpenGL

### Build System
- **Primary**: Cargo workspace structure
- **Targets**: Windows, macOS (Intel/ARM), Linux
- **Reproducible builds** with locked dependencies

---

## Project Structure

```
plasma_simulation/
├── src/                          # Core simulation library
│   ├── simulation/
│   │   ├── physics.rs           # Heat equation, sources, radiation
│   │   ├── solver.rs            # Forward Euler, Crank-Nicolson, SOR
│   │   ├── mesh.rs              # Cylindrical grid discretization
│   │   ├── materials.rs         # Properties and phase changes
│   │   ├── state.rs             # Execution state management
│   │   ├── metrics.rs           # Performance and export
│   │   ├── validation.rs        # Benchmarking
│   │   ├── visualization.rs     # Data preparation for rendering
│   │   └── parametric.rs        # Parameter studies
│   ├── formula/
│   │   ├── engine.rs            # Rhai formula evaluation
│   │   └── integration.rs       # Solver integration
│   └── plugins/                 # Plugin API (future)
├── src-tauri/                    # Desktop application
│   ├── src/
│   │   ├── simulation.rs        # Simulation control commands
│   │   ├── parameters.rs        # Parameter management
│   │   └── state.rs             # App state
│   └── ui/
│       ├── index.html           # Main interface
│       ├── parameters.html      # Parameter input
│       ├── css/                 # Stylesheets
│       └── js/                  # JavaScript modules
└── docs/                         # Documentation
```

### Module Responsibilities

1. **physics.rs**: PDE formulation, source terms, boundary conditions
2. **solver.rs**: Numerical methods implementation
3. **mesh.rs**: Grid generation and geometry handling
4. **materials.rs**: Material properties, temperature dependencies, phase changes
5. **visualization.rs**: 3D data preparation and export
6. **formula/engine.rs**: User-defined mathematical expressions

---

## Implementation Details

### Simulation Parameters

| Parameter | Description | Unit | Typical Range |
|-----------|-------------|------|---------------|
| `furnaceRadius` | Furnace radius | m | 0.5-5.0 |
| `furnaceHeight` | Furnace height | m | 1.0-10.0 |
| `meshRadialCells` | Radial discretization | - | 10-100 |
| `meshAxialCells` | Axial discretization | - | 10-100 |
| `initialTemperature` | Initial temperature | K | 273-1273 |
| `simulationTimeStep` | Time step | s | 0.001-1.0 |
| `simulationDuration` | Total duration | s | 1-3600 |
| `torchPower` | Torch power | kW | 10-500 |
| `torchEfficiency` | Torch efficiency | - | 0.5-0.95 |

### Predefined Materials Library

| Material | k [W/(m·K)] | cp [J/(kg·K)] | ρ [kg/m³] | ε | Tm [K] |
|----------|-------------|---------------|-----------|---|--------|
| Carbon Steel | 45 | 490 | 7850 | 0.8 | 1723 |
| Stainless Steel | 15 | 500 | 8000 | 0.85 | 1673 |
| Aluminum | 237 | 900 | 2700 | 0.2 | 933 |
| Graphite | 120 | 710 | 2250 | 0.95 | 3800 |
| Refractory | 2.5 | 880 | 3000 | 0.9 | 2073 |

### Formula Engine Syntax

**Supported Operations**:
- Arithmetic: `+`, `-`, `*`, `/`, `^`
- Functions: `sin`, `cos`, `exp`, `log`, `sqrt`
- Conditionals: `if(condition, true_val, false_val)`

**Example**: Temperature-dependent conductivity
```
k_0 * (1 + alpha * (T - T_ref))
```

### Plugin API Interface

```rust
pub trait SimulationPlugin {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn initialize(&mut self, state: &mut SimulationState);
    fn pre_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn post_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn finalize(&mut self, state: &mut SimulationState);
}
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| E001 | Invalid parameters | Check parameter ranges |
| E003 | Numerical instability | Reduce time step or use implicit solver |
| E004 | Convergence error | Increase iterations or tolerance |
| E010 | 3D rendering error | Update graphics drivers |

---

## Development Roadmap

### Phase 1: MVP (Months 1-3)
- [x] Project setup and structure
- [ ] 2D axisymmetric heat solver (Forward Euler)
- [ ] Gaussian plasma source implementation
- [ ] Basic 3D temperature visualization
- [ ] Parameter input UI
- [ ] Project save/load (JSON)
- [ ] Performance optimization

### Phase 2: Industrial Release (Months 4-6)
- [ ] Crank-Nicolson implicit solver
- [ ] SOR iterative solver
- [ ] Enthalpy method for phase changes
- [ ] Advanced visualization (cross-sections, isosurfaces)
- [ ] Data export (CSV, JSON, VTK)
- [ ] Validation framework
- [ ] Formula engine integration

### Phase 3: Advanced Features (Months 7-9)
- [ ] Plasma jet physics module
- [ ] 3D θ discretization option
- [ ] Multi-zone materials
- [ ] Parametric studies
- [ ] Process optimization tools

### Phase 4: Enterprise Features (Months 10-12)
- [ ] Plugin system
- [ ] Live data connectivity (OPC UA)
- [ ] Compliance reporting (IBAMA, ANVISA)
- [ ] Multi-language UI (PT-BR)

---

## Success Criteria

### MVP Acceptance
- ✓ Simulate heat diffusion in cylindrical furnace
- ✓ Support 1-4 plasma torches
- ✓ Complete 60s simulation in <30 seconds
- ✓ Achieve 15+ FPS visualization
- ✓ Energy conservation error <10%
- ✓ Save/load project configurations

### Quality Metrics
- Unit test coverage >80% for physics modules
- Performance benchmarks documented
- User manual complete
- Validation against analytical solutions

### Hardware Requirements

| Complexity | Mesh Cells | RAM | CPU | Time* |
|------------|------------|-----|-----|-------|
| Low | <50k | 8 GB | 4 cores | Minutes |
| Medium | 50k-500k | 16 GB | 8 cores | Tens of minutes |
| High | >500k | 32 GB | 16+ cores | Hours |

*For 1 hour of simulated time

---

## Common Development Commands

```bash
# Build simulation library
cargo build

# Run tests
cargo test -- --nocapture

# Development mode with logging
RUST_LOG=debug cargo run

# Tauri development
cd src-tauri && cargo tauri dev

# Build release
cargo tauri build

# Check formatting
cargo fmt --check

# Run clippy lints
cargo clippy
```

---

## Risk Mitigation

### Technical Risks
- **Numerical instability**: Start with proven explicit methods, add implicit as needed
- **Performance bottlenecks**: Profile early, parallelize critical loops with Rayon
- **Memory constraints**: Implement streaming for large datasets

### Project Risks
- **Scope creep**: Strict MVP feature set, defer advanced features
- **Integration complexity**: Modular architecture with clear interfaces

---

## Definition of Done

### MVP
- All 🔴 requirements implemented
- Performance targets met
- Basic documentation complete
- Core physics validated

### Industrial Release
- All 🟡 requirements implemented
- Unit/integration tests >80% coverage
- Validation suite automated
- VTK export verified in ParaView

---

## Document Control

- **Version**: 2.0 (Complete Technical Specification)
- **Date**: September 2024
- **Status**: APPROVED FOR DEVELOPMENT
- **Review Cycle**: Quarterly updates


# Phase Change Modeling Approaches

This document outlines the approaches considered for modeling phase changes (melting, vaporization) in the plasma heat transfer simulation.

## 1. Current Approach (Simplified "Available Energy")

*   **Mechanism:** Calculates temperature first using `solve_time_step` (incorporating an effective heat capacity $c_{p,eff}$ that attempts to smooth out latent heat effects). Then, `update_phase_change_fractions` explicitly checks if the calculated temperature $T$ exceeds a phase change temperature ($T_{phase}$). If it does, it calculates the "available energy" above $T_{phase}$ ($\Delta E \approx m c_p (T - T_{phase})$) and compares it to the remaining latent heat required ($\Delta E_{latent} = m L (1 - f)$). A portion of the available energy, up to the required latent heat, is used to update the phase fraction $f$, effectively consuming latent heat.
*   **Order:** Melting is processed before vaporization.
*   **Pros:**
    *   Relatively simple to implement initially.
    *   Keeps the primary solver focused on temperature.
*   **Cons:**
    *   **Energy Conservation Issues:** The decoupling of the temperature solve (using $c_{p,eff}$) and the explicit fraction update can lead to inaccuracies in energy conservation, especially with large time steps or sharp interfaces. The energy "absorbed" by $c_{p,eff}$ might not perfectly match the energy consumed in the fraction update.
    *   **Isotherm Handling:** Can struggle to maintain a sharp isotherm (the region exactly at $T_{phase}$). Temperatures might overshoot $T_{phase}$ in the solver before being partially corrected by the fraction update.
    *   **Approximation:** Calculating available energy as $m c_p (T - T_{phase})$ is a simplification of the energy balance during the phase transition.

## 2. Proposed Approach: Enthalpy Method

*   **Mechanism:** Reformulates the heat equation to solve for specific enthalpy $H$ instead of temperature $T$. Enthalpy naturally incorporates both sensible heat ($\int c_p dT$) and latent heat ($L$) in a continuous function. Temperature is derived from enthalpy using the enthalpy-temperature relationship, which includes "plateaus" at phase change temperatures where enthalpy increases while temperature remains constant. The relationship between enthalpy, temperature, and phase fraction ($T(H)$, $f(H)$) is defined based on material properties.
    *   The discretized heat equation becomes an equation for $H^{n+1}$.
    *   $\rho \frac{H^{n+1} - H^n}{\Delta t} = \nabla \cdot (k \nabla T)^n + S^n$ (or an implicit/Crank-Nicolson version).
    *   Note that $k$ and $\nabla T$ still depend on temperature, requiring the $T(H)$ relationship, introducing non-linearity. This is typically handled by using values from the previous time step or iteration ($k(T^n)$, $T^n$) when solving for $H^{n+1}$.
*   **Post-Solve:** After solving for the enthalpy field $H^{n+1}$, the corresponding temperature $T^{n+1}$ and phase fractions $f^{n+1}$ are calculated directly from the $T(H)$ and $f(H)$ relationships for each cell.
*   **Pros:**
    *   **Improved Energy Conservation:** Enthalpy is the conserved variable, inherently including latent heat, leading to more accurate energy balance.
    *   **Robust Isotherm Handling:** Correctly handles the phase change occurring at a constant temperature over a range of enthalpy values.
    *   **Unified Equation:** Solves a single conservation equation for enthalpy.
*   **Cons:**
    *   **Increased Complexity:** Requires significant refactoring of the solver to work with enthalpy.
    *   **Non-linearity:** The dependence of properties (\(k\), \(c_p\)) on \(T(H)\) requires careful handling within the solver (e.g., using lagged coefficients or inner iterations).

## Decision

The **Enthalpy Method** (Approach 2) will be implemented to improve the physical accuracy and robustness of the phase change simulation, despite the increased implementation complexity. 


# Solver Methods for Heat Transfer Simulation

This document outlines the numerical methods used in the `HeatSolver` for the plasma heat transfer simulation, focusing on the time-stepping scheme.

## Initial Implementation: Forward Euler (Explicit)

The initial version of the `solve_time_step` function employed an explicit forward Euler finite difference method. This scheme calculates the temperature at the next time step ($T^{n+1}$) directly based on the temperatures at the current time step ($T^n$):

$$\frac{T_{i,j}^{n+1} - T_{i,j}^{n}}{\Delta t} = \alpha \left( \nabla^2 T \right)_{i,j}^n + \frac{S_{i,j}^n}{\rho c_p}$$

Where:
- $T_{i,j}^n$ is the temperature at radial node $i$ and axial node $j$ at time step $n$.
- $\Delta t$ is the time step size.
- $\alpha = k / (\rho c_p)$ is the thermal diffusivity.
- $\nabla^2 T$ is the Laplacian operator (discretized using central differences in cylindrical coordinates).
- $S_{i,j}^n$ represents the source terms (plasma heating, radiation, convection).

**Advantages:**
- Simple to implement.
- Computationally inexpensive per time step.

**Disadvantages:**
- **Conditional Stability:** Explicit methods suffer from stability constraints. The simulation can become unstable (producing nonsensical results like oscillating or infinite temperatures) if the time step $\Delta t$ is too large relative to the mesh spacing ($\Delta r, \Delta z$) and thermal diffusivity. The stability limit (related to the CFL condition) often forces the use of very small time steps, increasing the total simulation time.

## Refined Implementation: Crank-Nicolson (Implicit)

To overcome the stability limitations of the explicit method, the solver was refactored to use the **Crank-Nicolson** method. This is an implicit method that averages the spatial derivative terms between the current time step ($n$) and the next time step ($n+1$):

$$\frac{T^{n+1} - T^{n}}{\Delta t} = \frac{\alpha}{2} \left( \nabla^2 T^n + \nabla^2 T^{n+1} \right) + \frac{S^n + S^{n+1}}{2 \rho c_p}$$

(Note: Source terms $S$ are often treated explicitly or semi-implicitly for simplicity; here we assume they are evaluated predominantly at step $n$ or averaged).

Rearranging the equation to group terms at \( n+1 \) on the left side results in a system of linear algebraic equations for the unknown temperatures \( T^{n+1} \) at each node:

$$A T^{n+1} = b$$

Where:
- $T^{n+1}$ is the vector of unknown temperatures at the next time step.
- $A$ is a matrix derived from the discretized $\nabla^2 T^{n+1}$ terms and the time derivative term.
- $b$ is a vector containing known values from the current time step $T^n$, source terms, and boundary conditions.

**Advantages:**
- **Unconditional Stability:** The Crank-Nicolson method is unconditionally stable for the linear heat equation, meaning larger time steps ($\Delta t$) can generally be used without causing numerical instability. This often leads to faster overall simulations despite the increased cost per step.
- **Second-Order Accuracy in Time:** It offers better temporal accuracy compared to the first-order forward Euler method.

**Disadvantages:**
- **Computationally More Complex:** Requires solving a system of linear equations $A T^{n+1} = b$ at each time step.
- **Implementation Complexity:** Setting up the matrix $A$ and solving the system is more complex than the direct calculation in the explicit method.

## Solving the Linear System: Successive Over-Relaxation (SOR)

Since the matrix $A$ arising from the finite difference discretization is typically large, sparse, and often diagonally dominant, an iterative method is suitable for solving $A T^{n+1} = b$. The **Successive Over-Relaxation (SOR)** method was chosen:

- It is an extension of the Gauss-Seidel method.
- It introduces a relaxation factor $\omega$ (typically $1 < \omega < 2$) to potentially accelerate convergence.
- It iteratively updates the temperature at each node based on the latest available values from neighboring nodes until the solution converges within a specified tolerance or a maximum number of iterations is reached.

This iterative approach avoids the need to explicitly store and invert the large matrix $A$.





# Reference Guide - Plasma Furnace Simulator

This reference guide provides detailed information about the functionalities, parameters, and APIs of the Plasma Furnace Simulator.

## Simulation Parameters

### Geometry and Mesh

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `meshRadialCells` | Number of cells in radial direction | - | 10-100 |
| `meshAngularCells` | Number of cells in angular direction | - | 8-64 |
| `meshAxialCells` | Number of cells in axial direction | - | 10-100 |
| `meshCellSize` | Cell size | m | 0.01-0.1 |
| `furnaceRadius` | Furnace radius | m | 0.5-5.0 |
| `furnaceHeight` | Furnace height | m | 1.0-10.0 |

### Simulation Conditions

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `initialTemperature` | Initial temperature | K | 273-1273 |
| `ambientTemperature` | Ambient temperature | K | 273-323 |
| `simulationTimeStep` | Time step | s | 0.001-1.0 |
| `simulationDuration` | Total simulation duration | s | 1-3600 |
| `maxIterations` | Maximum iterations per step | - | 10-1000 |
| `convergenceTolerance` | Convergence tolerance | - | 1e-6-1e-3 |

### Plasma Torch Properties

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `torchPower` | Torch power | kW | 10-500 |
| `torchEfficiency` | Torch efficiency | - | 0.5-0.95 |
| `torchPosition` | Torch position (x, y, z) | m | - |
| `torchDirection` | Torch direction (vector) | - | - |
| `torchDiameter` | Torch diameter | m | 0.01-0.1 |
| `torchTemperature` | Plasma temperature | K | 5000-20000 |

### Material Properties

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `materialThermalConductivity` | Thermal conductivity | W/(m·K) | 0.1-500 |
| `materialSpecificHeat` | Specific heat | J/(kg·K) | 100-5000 |
| `materialDensity` | Density | kg/m³ | 100-20000 |
| `materialEmissivity` | Emissivity | - | 0.1-1.0 |
| `materialMeltingPoint` | Melting point | K | 500-3000 |
| `materialLatentHeat` | Latent heat of fusion | J/kg | 1e4-5e5 |

## Predefined Materials

| Material | Thermal Conductivity (W/(m·K)) | Specific Heat (J/(kg·K)) | Density (kg/m³) | Emissivity | Melting Point (K) |
|----------|--------------------------------|----------------------------|-----------------|--------------|-------------------|
| Carbon Steel | 45 | 490 | 7850 | 0.8 | 1723 |
| Stainless Steel | 15 | 500 | 8000 | 0.85 | 1673 |
| Aluminum | 237 | 900 | 2700 | 0.2 | 933 |
| Copper | 400 | 385 | 8960 | 0.3 | 1358 |
| Iron | 80 | 450 | 7870 | 0.7 | 1808 |
| Graphite | 120 | 710 | 2250 | 0.95 | 3800 |
| Concrete | 1.7 | 880 | 2300 | 0.9 | 1773 |
| Glass | 1.0 | 840 | 2600 | 0.95 | 1473 |
| Wood | 0.15 | 1700 | 700 | 0.9 | 573 |
| Ceramic | 2.5 | 800 | 3000 | 0.85 | 2073 |

## Physical Formulas

### Heat Transfer Equation

The fundamental equation governing heat transfer in the furnace is:

$$\rho c_p \frac{\partial T}{\partial t} = \nabla \cdot (k \nabla T) + Q$$

Where:
- $\rho$ is the material density (kg/m³)
- $c_p$ is the specific heat (J/(kg·K))
- $T$ is the temperature (K)
- $t$ is time (s)
- $k$ is the thermal conductivity (W/(m·K))
- $Q$ is the heat source term (W/m³)

### Plasma Heat Source

The plasma heat source is modeled as:

$$Q(r) = \frac{P \eta}{2\pi\sigma^2} \exp\left(-\frac{r^2}{2\sigma^2}\right)$$

Where:
- $P$ is the torch power (W)
- $\eta$ is the torch efficiency
- $r$ is the distance from the torch center (m)
- $\sigma$ is the dispersion parameter (m)

### Thermal Radiation

Heat transfer by radiation is modeled by the Stefan-Boltzmann law:

$$q_r = \varepsilon \sigma (T^4 - T_{amb}^4)$$

Where:
- $q_r$ is the radiative heat flux (W/m²)
- $\varepsilon$ is the surface emissivity
- $\sigma$ is the Stefan-Boltzmann constant (5.67×10⁻⁸ W/(m²·K⁴))
- $T$ is the surface temperature (K)
- $T_{amb}$ is the ambient temperature (K)

## Simulation Metrics

| Metric | Description | Unit |
|---------|-----------|---------|
| `maxTemperature` | Maximum temperature | K |
| `minTemperature` | Minimum temperature | K |
| `avgTemperature` | Average temperature | K |
| `maxGradient` | Maximum temperature gradient | K/m |
| `avgGradient` | Average temperature gradient | K/m |
| `maxHeatFlux` | Maximum heat flux | W/m² |
| `avgHeatFlux` | Average heat flux | W/m² |
| `totalEnergy` | Total energy in the system | J |
| `heatingRate` | Heating rate | K/s |
| `energyEfficiency` | Energy efficiency | % |

## Validation Metrics

| Metric | Description | Formula |
|---------|-----------|---------|
| `meanAbsoluteError` (MAE) | Mean Absolute Error | $\frac{1}{n}\sum_{i=1}^{n}|y_i-\hat{y}_i|$ |
| `meanSquaredError` (MSE) | Mean Squared Error | $\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2$ |
| `rootMeanSquaredError` (RMSE) | Root Mean Squared Error | $\sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}$ |
| `meanAbsolutePercentageError` (MAPE) | Mean Absolute Percentage Error | $\frac{100\%}{n}\sum_{i=1}^{n}\left\|\frac{y_i-\hat{y}_i}{y_i}\right\|$ |
| `rSquared` (R²) | Coefficient of Determination | $1-\frac{\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}{\sum_{i=1}^{n}(y_i-\bar{y})^2}$ |

## Export Formats

### CSV (Comma-Separated Values)

Simple text format for tabular data:

```
x,y,z,temperature
0.1,0.0,0.1,350.5
0.2,0.0,0.1,375.2
...
```

### JSON (JavaScript Object Notation)

Structured format for hierarchical data:

```json
{
  "metadata": {
    "simulationTime": 10.0,
    "meshSize": [20, 16, 20]
  },
  "results": [
    {"position": [0.1, 0.0, 0.1], "temperature": 350.5},
    {"position": [0.2, 0.0, 0.1], "temperature": 375.2},
    ...
  ]
}
```

### VTK (Visualization Toolkit)

Format for 3D scientific visualization:

```
# vtk DataFile Version 3.0
Plasma Furnace Simulation Results
ASCII
DATASET STRUCTURED_GRID
DIMENSIONS 20 16 20
POINTS 6400 float
...
POINT_DATA 6400
SCALARS temperature float 1
LOOKUP_TABLE default
...
```

## Plugin API

### Plugin Interface

```rust
pub trait SimulationPlugin {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn initialize(&mut self, state: &mut SimulationState);
    fn pre_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn post_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn finalize(&mut self, state: &mut SimulationState);
}
```

### Creating a Custom Plugin

1. Implement the `SimulationPlugin` trait
2. Compile as a dynamic library (.dll/.so/.dylib)
3. Place the file in the plugins folder
4. Activate the plugin in the application settings

## Formula Language

### Basic Syntax

The formula language supports:

- Arithmetic operators: `+`, `-`, `*`, `/`, `^` (power)
- Mathematical functions: `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`
- Constants: `pi`, `e`
- User-defined variables
- Conditionals: `if(condition, true_value, false_value)`

### Examples

Gaussian heat source:
```
power * efficiency / (2 * pi * sigma^2) * exp(-r^2 / (2 * sigma^2))
```

Temperature-dependent thermal conductivity:
```
k_0 * (1 + alpha * (T - T_ref))
```

Variable emissivity:
```
if(T < T_transition, emissivity_low, emissivity_high)
```

## Project File Format

Projects are saved in the `.pfp` (Plasma Furnace Project) format, which is a ZIP file containing:

- `project.json`: Project metadata
- `simulation_parameters.json`: Simulation parameters
- `materials/`: Custom material definitions
- `formulas/`: Custom formulas
- `results/`: Simulation results
- `validation/`: Validation data
- `parametric_studies/`: Parametric study configurations and results

## Hardware Requirements for Complex Simulations

| Complexity | Mesh Cells | Recommended RAM | Recommended CPU | Estimated Time* |
|--------------|------------------|-----------------|-----------------|------------------|
| Low | < 50,000 | 8 GB | 4 cores | Minutes |
| Medium | 50,000 - 500,000 | 16 GB | 8 cores | Tens of minutes |
| High | 500,000 - 5,000,000 | 32 GB | 16+ cores | Hours |
| Very High | > 5,000,000 | 64+ GB | 32+ cores | Days |

*Estimated time for a simulation of 1 hour of real time

## Error Codes

| Code | Description | Solution |
|--------|-----------|----------|
| E001 | Invalid simulation parameters | Check parameter values |
| E002 | Mesh initialization failure | Reduce mesh size or increase available memory |
| E003 | Numerical instability detected | Reduce time step or use implicit solver |
| E004 | Convergence error | Increase maximum iterations or tolerance |
| E005 | Corrupted project file | Use a backup or create a new project |
| E006 | Data import error | Check data file format |
| E007 | Results export error | Check write permissions in the destination directory |
| E008 | Formula evaluation error | Check formula syntax |
| E009 | Plugin initialization error | Check plugin compatibility |
| E010 | 3D rendering error | Update graphics drivers or reduce visualization quality |

## Technical Glossary

| Term | Definition |
|-------|----------|
| **Advection** | Transport of a substance or property by a fluid due to the fluid's movement |
| **Conduction** | Heat transfer through a material without macroscopic movement of the material |
| **Convection** | Heat transfer due to fluid movement |
| **Thermal Diffusivity** | Property that characterizes the rate of heat diffusion through a material (k/ρcp) |
| **Discretization** | Process of converting continuous differential equations into discrete algebraic equations |
| **Navier-Stokes Equation** | Equations that describe fluid motion |
| **Isosurface** | Three-dimensional surface representing points of constant value |
| **Finite Volume Method** | Numerical technique for solving partial differential equations |
| **Courant Number** | Parameter relating time step to mesh size and phenomenon velocity |
| **Plasma** | State of matter composed of ionized gas |
| **Thermal Radiation** | Heat transfer by electromagnetic waves |
| **Transient Regime** | State where system properties vary with time |
| **Steady State Regime** | State where system properties do not vary with time |
| **Thermal Conductivity Tensor** | Representation of thermal conductivity in anisotropic materials |
| **Plasma Torch** | Device that generates a high-temperature plasma jet |



### **ALTERNATIVE VERSION OF REQUIREMENTS**

# Plasma Furnace Simulator — Requirements (Version 2)
*Version 2*

## Introduction

This document defines the requirements for transforming the existing Plasma Furnace Simulator codebase into a production-ready industrial tool for waste management operations. The primary client is a Brazilian company operating plasma furnaces for medical waste, biological residues, cemetery bones, and potentially radioactive waste from Petrobras oil extraction operations.

Requirements are prioritized into **CRITICAL MVP**, **IMPORTANT**, **FUTURE**, and **LONG-TERM** features.

## Priority Classification

- 🔴 **CRITICAL: MVP**: Must be delivered first - core simulation and basic 3D visualization for immediate industrial use.
- 🟡 **IMPORTANT**: Complete industrial features - needed for full operational capability.
- 🟢 **FUTURE**: Advanced operational features - enhanced waste management capabilities.
- 🔵 **LONG-TERM**: Industrial IoT integration - live furnace monitoring and control.

## Design Principles (All Phases)

1.  **Scientific Rigor**: Base all formulations on established academic sources (e.g., Incropera & DeWitt for heat transfer, Patankar for numerics) and validate against analytical cases and experimental data when available.
2.  **Extensibility**: Design with a first-class plugin API, a sandboxed Formula Engine (Rhai), and modular physics packages to facilitate future expansion.
3.  **Industrial Usability**: Ensure the application provides clear error messages, robust performance, a bilingual UI (EN/PT-BR), and exports to standard industrial and academic formats (CSV, JSON, VTK).
4.  **Safety & Security**: Implement sandboxed execution for formulas and plugins, require signed plugins for security, and establish read-only defaults for live plant connections to prevent accidental operations.

## Requirements

### Requirement 1: Core Heat Diffusion Simulation 🔴 **CRITICAL MVP**

**User Story:** As a researcher, I want to simulate heat diffusion in a cylindrical plasma furnace with scientifically accurate methods so that I can visualize temperature distribution patterns over time.

#### Acceptance Criteria

1.  WHEN I define furnace geometry (height, radius) THEN the system SHALL create a cylindrical mesh with configurable resolution using a uniform grid with Nr radial and Nz axial nodes.
2.  WHEN I place plasma torches THEN the system SHALL calculate heat sources using a Gaussian distribution.
3.  WHEN I select "Fast" mode THEN the system SHALL use the Forward Euler method with CFL stability control.
4.  WHEN I configure performance vs accuracy THEN the system SHALL allow mesh resolution presets (e.g., Fast: 50×50, Balanced: 100×100, High: 200×200).
5.  WHEN the simulation runs THEN the system SHALL solve the transient heat equation in cylindrical coordinates with temperature-dependent properties.
6.  WHEN I enable multi-zone physics THEN the system SHALL support distinct regions for processes like drying, pyrolysis, gasification, and melting.
7.  IF simulation becomes unstable THEN the system SHALL automatically reduce the time step and warn the user.
8.  **Example Snapshot:** Given a furnace (R=1.5m, H=4m), one torch (250 kW), Fast mesh (50×50), and a 60s duration, the simulation MUST complete in under 30 seconds with an energy residual below 10%, and successfully export CSV/JSON files and a PNG snapshot.

### Requirement 2: Visualization & UX 🔴 **CRITICAL MVP** / 🟡 **IMPORTANT**

**User Story:** As a researcher, I want to see a clear visualization of the heat diffusion so that I can understand the thermal behavior and present results.

#### Acceptance Criteria

1.  🔴 WHEN simulation data is available THEN the system SHALL display a basic 3D heatmap of the temperature distribution.
2.  🔴 WHEN I use playback controls THEN the system SHALL animate temperature evolution over time (play, pause, slider).
3.  🔴 WHEN I interact with the 3D view THEN the system SHALL support basic rotation, zoom, and pan operations.
4.  🟡 WHEN I select advanced visualization modes THEN the system SHALL provide isosurfaces, volume rendering, and cross-sectional views.
5.  🟡 WHEN I adjust the cutting plane THEN the system SHALL display a 2D cross-sectional heatmap that updates in real-time.

### Requirement 3: Parameter Configuration & Formula Engine 🔴 **CRITICAL MVP** / 🟡 **IMPORTANT**

**User Story:** As a researcher, I want a flexible interface to configure simulations, from simple presets to complex custom formulas.

#### Acceptance Criteria

1.  🔴 WHEN I open the application THEN the system SHALL display input forms for basic parameters (geometry, mesh, materials, torches, boundary conditions).
2.  🔴 WHEN I save parameters THEN the system SHALL store the project configuration in JSON format with metadata.
3.  🟡 WHEN I enable advanced mode THEN the system SHALL allow multi-torch positioning and multi-zone material configuration.
4.  🟡 WHEN I use custom materials THEN the system SHALL support temperature-dependent properties defined via mathematical formulas using the Rhai engine.

### Requirement 4: High-Accuracy Numerical Methods 🟡 **IMPORTANT**

**User Story:** As a researcher, I want access to advanced numerical methods so that I can achieve maximum scientific precision when needed.

#### Acceptance Criteria

1.  WHEN I select "High Accuracy" mode THEN the system SHALL use the **Crank-Nicolson** implicit method.
2.  WHEN using Crank-Nicolson THEN the system SHALL solve the resulting linear system using an iterative **SOR (Successive Over-Relaxation)** solver.
3.  WHEN modeling phase changes THEN the system SHALL use the **Enthalpy Method** as the governing variable to ensure robust energy conservation (<1% error).

### Requirement 5: Data Export & Validation 🟡 **IMPORTANT**

**User Story:** As a researcher, I want to export my results in various formats and validate the simulation's accuracy against known benchmarks.

#### Acceptance Criteria

1.  WHEN a simulation completes THEN the system SHALL offer export options for CSV, JSON, and VTK formats.
2.  WHEN I run validation tests THEN the system SHALL compare results against analytical benchmarks (e.g., Carslaw & Jaeger) and report error metrics (MAE, RMSE, R²).
3.  WHEN I save visualizations THEN the system SHALL export high-resolution (4K) images and HD video animations.

### Requirement 6: Plasma Jet CFD/MHD Modeling 🟢 **FUTURE**

**User Story:** As an advanced researcher, I want to model the plasma jet's physics more realistically to improve the accuracy of the heat source.

#### Acceptance Criteria

1.  WHEN I enable plasma jet modeling THEN the system SHALL offer selectable models, such as a simplified CFD RANS model or a 2D MHD approximation.
2.  WHEN I configure the plasma torch THEN the system SHALL allow setting a **swirl number (S)** to analyze its effect on heat distribution.
3.  WHEN the simulation runs THEN the jet model SHALL provide a more realistic heat source to the main thermal simulation, either as a surface heat flux or a volumetric source.

### Requirement 7: Waste-Specific & Component Modeling 🟢 **FUTURE**

**User Story:** As a waste management operator, I want to model different waste streams and furnace components to optimize the entire process.

#### Acceptance Criteria

1.  The system SHALL allow selecting waste types (medical, municipal, bones) with typical properties (density, moisture, ash content) and throughput (kg/h).
2.  Future enhancements SHALL model multi-stream blending, heating value calculations, and radioactive waste for audit trails.
3.  The system SHALL model an **off-gas train**, including components like cyclones and filters/baghouses, to predict KPIs like particulate load and gas temperature at the filter inlet.
4.  The system SHALL generate rule-based alerts for operational issues like over-temperature conditions or predicted emission spikes.

### Requirement 8: Live Furnace Integration (Digital Twin) 🔵 **LONG-TERM**

**User Story:** As a plant manager, I want to connect the simulator to live furnace data for real-time monitoring and optimization.

#### Acceptance Criteria

1.  The system SHALL provide read-only connectors (e.g., OPC UA) for live data tags from PLCs and SCADA systems.
2.  The system SHALL feature a "ghost run" mode to simulate alongside the live plant timeline for deviation analysis.
3.  Write-back capabilities (sending setpoints to the furnace) SHALL be optional, disabled by default, and gated by strict user roles.

### Requirement 9: Regulatory Compliance & Reporting 🔵 **LONG-TERM**

**User Story:** As a compliance manager, I want to generate automated reports to meet Brazilian environmental and safety standards.

#### Acceptance Criteria

1.  WHEN I generate reports THEN the system SHALL produce compliance documentation for agencies like IBAMA and ANVISA.
2.  WHEN processing radioactive waste THEN reports SHALL comply with CNEN (National Nuclear Energy Commission) requirements.

## Non-Functional Requirements

### Performance Requirements
-   🔴 **MVP**: Fast mode simulation completes in < 30s; 3D visualization maintains 15+ FPS; memory usage is < 2GB (Fast) and < 4GB (Balanced).
-   🟡 **IMPORTANT**: 3D visualization maintains 30+ FPS on larger meshes; memory usage is optimized to stay < 8GB.

### Security & Governance Requirements
-   The Formula Engine and plugin system SHALL be sandboxed with resource limits (CPU, memory) to prevent malicious code execution.
-   The system SHALL support role-based access control (e.g., Operator, Engineer, Admin) to gate access to sensitive features like live connectivity.
-   The system SHALL maintain an audit log for critical actions like changes to simulation settings and live connection events.

### Academic & Process Requirements
-   **Architecture Decision Records (ADR)**: Key design decisions, such as the choice of numerical methods (Enthalpy, Crank-Nicolson), must be documented to justify the architecture.
-   **Project Documentation**: The technical documentation must be kept current to allow new team members to onboard efficiently.

## Roadmap & Milestones

-   **MVP (🔴)**: Implement 2D axisymmetric heat diffusion with a Gaussian source model, basic 3D visualization, project saving, and CSV/JSON export.
-   **Release 1 (🟡)**: Implement Crank-Nicolson solver, Enthalpy Method for phase change, advanced visualization, formula-driven properties, and basic waste feed modeling. Add VTK export and automated validation reports.
-   **Release 2 (🟢)**: Develop the plasma-jet module, add 3D theta discretization, model basic emissions/filters, and implement energy-balance validation against plant data.
-   **Release 3 (🔵)**: Implement live read-only connectivity, generate compliance reports, and enable role-based access control.

## Traceability to Code Structure

-   **`src/simulation/solver.rs`**: Will contain the Forward Euler (MVP) and Crank-Nicolson / SOR (Release 1) implementations.
-   **`src/simulation/physics.rs`**: Will house the heat PDE, source terms, and phase-change logic (Enthalpy Method).
-   **`src/formula/`**: Will contain the Rhai engine integration for custom user formulas.
-   **`src/plugins/`**: Will host the plugin API and loader. The future Plasma Jet module will be a plugin.
-   **`src-tauri/src/`**: Will manage UI parameter handling, run control, and live data connectors (long-term).

## Definition of "Done" (Per Phase)

-   **MVP**: All 🔴 items are implemented, unit and integration tests are passing, performance targets are met, and a basic user manual is complete.
-   **IMPORTANT**: All 🟡 items are implemented, the validation pack generates automated reports, and VTK exports are verified in external tools like ParaView.

## Risks & Mitigations

-   **Risk**: The complexity of the Plasma Jet CFD/MHD model could cause delays.
    -   **Mitigation**: Begin with simplified, reduced-order models. Develop the full CFD/MHD model as a plugin behind a feature flag so it doesn't block other progress.
-   **Risk**: Live data integration may be unreliable or introduce security vulnerabilities.
    -   **Mitigation**: Default to read-only connections. Implement rigorous testing in a sandboxed environment before connecting to a live plant. Gate all write-access with strict permissions.