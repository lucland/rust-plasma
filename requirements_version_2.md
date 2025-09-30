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