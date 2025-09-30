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