# Plasma Furnace Simulator - Implementation TODO List

## Overview

This document outlines the components and features that need to be implemented to fulfill all requirements specified in the project's requirement documentation. The analysis is based on a comprehensive review of the current codebase and the original requirements.

## Core Components Status

| Component | Status | Missing Features |
|-----------|--------|------------------|
| Physics Engine | ✅ Mostly Implemented | Enhanced turbulence modeling |
| Mesh System | ✅ Implemented | None |
| Material System | ✅ Implemented | None |
| Solver | ✅ Implemented | Cloud offloading capability |
| Formula Engine | ✅ Implemented | None |
| Validation | ✅ Implemented | None |
| Metrics & Export | ✅ Implemented | None |
| Parametric Studies | ✅ Implemented | None |

## File Description

This document serves as a tracking tool for implementation progress across the Plasma Furnace Simulator project. It identifies completed components, partially implemented features, and missing elements that need to be addressed to fulfill the requirements specified in the project documentation.

```rust
//-----------------------------------------------------------------------------
// File: formula/engine.rs
// Main Responsibility: Core formula evaluation and management engine.
//
// This file implements the embedded formula engine that powers the customizable
// physics models in the plasma furnace simulator. It provides a sandboxed
// environment for safely evaluating user-defined mathematical formulas using
// the Rhai scripting language. The engine manages formula compilation, parameter
// validation, type conversion, and evaluation, and includes a library of
// predefined formulas for common material properties and physical phenomena.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: formula/integration.rs
// Main Responsibility: Integrate formula engine with the simulation solver.
//
// This file implements the integration layer between the formula engine and the
// simulation solver. It provides high-level functionality for mapping specific
// physics functions (like thermal conductivity, specific heat, heat sources)
// to user-defined formulas. The FormulaManager acts as an intermediary that
// manages these mappings, evaluates the appropriate formulas when needed by
// the solver, and handles import/export of formula configurations for saving
// user customizations between sessions.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: formula/mod.rs
// Main Responsibility: Central module for custom formula management.
//
// This module serves as the entry point for the formula subsystem, which allows
// users to define and evaluate custom mathematical formulas for material
// properties, heat sources, and boundary conditions. It exports the core types
// from both the engine and integration submodules, providing a unified interface
// for the rest of the application to access formula functionality. This enables
// customization of simulation behavior through user-defined equations.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/materials.rs
// Main Responsibility: Manage material properties and phase changes.
//
// This file handles all material-related functionality, including defining 
// material properties and their temperature-dependent behavior. It implements
// support for phase changes (like melting and vaporization) and provides a 
// library of predefined materials with realistic properties. This component
// is essential for accurate physical modeling of different materials in the
// plasma furnace simulation.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/mesh.rs
// Main Responsibility: Spatial discretization for the simulation domain.
//
// This file implements the cylindrical mesh discretization that serves as the
// spatial framework for the simulation. It handles coordinate transformations
// between cylindrical and Cartesian systems, manages zone mapping for different
// materials, and provides utilities for working with the mesh geometry. This
// component is fundamental for the finite difference method used in the heat
// transfer calculations.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/metrics.rs
// Main Responsibility: Calculate and export performance metrics.
//
// This file implements the analysis and export capabilities for simulation
// results. It calculates performance metrics such as temperature statistics,
// heat fluxes, energy balances, and heating rates. It also provides
// functionality to export simulation results and metrics in various formats
// (CSV, JSON, VTK) and generates reports for analysis. This component is
// crucial for quantitative evaluation of simulation results and for data
// visualization in external tools.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/mod.rs
// Main Responsibility: Central module for organizing parametric studies.
//
// This module acts as the central organizer for the parametric study 
// functionality of the simulator. It exports the main types related to 
// parametric studies, allowing users to systematically vary simulation 
// parameters to study their effects on the results. The module provides 
// a clean interface to the parametric study capabilities of the simulator.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/parametric.rs
// Main Responsibility: Enable systematic parameter space exploration.
//
// This file implements the parametric study functionality that allows for
// systematic exploration of the parameter space through automation of multiple
// simulation runs with varying parameters. It provides capabilities for linear
// and logarithmic parameter sweeps, sensitivity analysis, and optimization
// studies. This component enables researchers to study the effects of different
// parameters on simulation results and optimize furnace designs based on
// various performance metrics.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/physics.rs
// Main Responsibility: Implement physical models for heat transfer.
//
// This file implements the physical models for heat transfer, including radiation
// and convection sources. It defines the PlasmaTorch class with advanced
// configuration options, calculates view factors between torches and material
// points, and provides material property handling for temperature-dependent
// behavior. This component is responsible for the accurate physical modeling of
// heat transfer phenomena in the plasma furnace.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/solver.rs
// Main Responsibility: Numerical solution of the heat transfer equations.
//
// This file contains the core numerical algorithms for solving the heat transfer
// equations. It implements an enthalpy-based method that handles phase changes,
// uses the Crank-Nicolson method for time integration, and solves the resulting
// system of equations. This component is the mathematical heart of the simulation
// engine, responsible for accurately calculating temperature distributions and
// phase transitions over time.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/state.rs
// Main Responsibility: Manage simulation execution state and threading.
//
// This file manages the runtime state of the simulation, including status
// (running, paused, completed, failed), progress tracking, and thread-safe
// execution. It provides mechanisms for starting, pausing, resuming, and
// canceling simulations, as well as thread synchronization for parallel
// execution. This component ensures reliable simulation execution and status
// monitoring.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/validation.rs
// Main Responsibility: Validate simulation results against reference data.
//
// This file provides tools for validating the simulation results against
// analytical solutions, experimental data, or other reference data. It calculates
// various error metrics (RMSE, MAE, R-squared, etc.), generates validation
// reports, and helps ensure the scientific accuracy of the simulation through
// quantitative comparison with known solutions. This component is crucial for
// verifying the correctness and accuracy of the simulation models.
//-----------------------------------------------------------------------------
```
```rust
//-----------------------------------------------------------------------------
// File: simulation/visualization.rs
// Main Responsibility: Prepare simulation data for visual representation.
//
// This file implements the data structures and transformation methods needed
// to visualize the simulation results in both 2D and 3D. It supports multiple
// visualization modes including slice views, 3D rendering with meshes, time
// series animations, and heat maps. The component transforms raw simulation
// data into formats optimized for rendering, enabling researchers to gain
// visual insights into temperature distribution and other physical phenomena.
//-----------------------------------------------------------------------------
```

## Missing Components

The following key components are identified as missing or needing significant expansion:

### 1. User Interface (Highest Priority)

The current implementation is focusing on backend functionality without a user interface. A complete Rust-based UI is needed to address the following requirements:

- **FR6.1**: Intuitive parameter input, simulation control, visualization
- **FR6.2**: Native desktop app functionality
- **FR6.3**: Tooltips/help text for parameters
- **FR6.4**: Offline help pages and "Getting Started" wizard

**Implementation Plan**:
- Use an appropriate Rust GUI framework (egui, iced, or druid)
- Create parameter input forms with validation
- Implement visualization panels for 2D/3D heatmaps
- Design control panels for simulation execution
- Add help system and tooltips

### 2. Visualization Rendering (High Priority)

While data structures for visualization exist, the actual rendering system is missing:

- **FR5.1**: 2D/3D heatmap visualization with playback controls
- **FR5.2**: Export visualizations as images/animations

**Implementation Plan**:
- Implement rendering pipeline for mesh visualization
- Create heatmap colormapping functionality
- Build timeline controls for simulation playback
- Add screenshot and animation export capabilities

### 3. Plugin System (Medium Priority)

The requirements specify plugin capabilities that aren't fully implemented:

- **NFR7**: Extensibility via a plugin system
- Ability to extend physics solvers

**Implementation Plan**:
- Design plugin interface traits
- Implement plugin loading mechanism
- Create sandboxed plugin execution environment
- Provide examples and documentation

### 4. Cloud Offloading (Medium Priority)

The ability to offload compute-intensive simulations to the cloud:

- **FR7**: Optional cloud offload for high-fidelity simulations

**Implementation Plan**:
- Implement serialization of simulation state for network transport
- Create client-server communication protocol
- Build authentication and job management system
- Implement automatic fallback to local execution on failure

### 5. Project Management (Medium Priority)

Workspace and project management functionality:

- **FR8**: Project workspace management
- Ability to save, load, and organize multiple simulations

**Implementation Plan**:
- Design project file format
- Implement save/load functionality
- Create workspace management UI
- Add recent projects list and templates

### 6. Error Handling System (Medium Priority)

Although some error handling exists, a comprehensive system is needed:

- **FR2.8**: Structured logging and error handling
- User-friendly error messages and recovery options

**Implementation Plan**:
- Enhance the logging system with structured JSON output
- Create user-friendly error messages
- Implement error recovery mechanisms
- Add a log viewer in the UI

### 7. Documentation (Low Priority)

Internal and user-facing documentation:

- **NFR4**: Usability documentation
- **FR6.4**: Offline help pages

**Implementation Plan**:
- Generate API documentation
- Create user manual
- Implement integrated help system
- Add interactive tutorials

## Technical Debt Items

Some areas of the current implementation may need refinement:

1. **FFI Layer**: Current FFI implementation may not be needed if UI is built in Rust
2. **Performance Optimization**: Potential for further parallelization
3. **Test Coverage**: Expand test suite for better coverage
4. **Refactoring**: Some components may benefit from architectural refinement

## Next Steps Priority

1. Develop the user interface framework
2. Implement the visualization rendering system
3. Connect UI to existing simulation engine
4. Add workspace/project management
5. Implement plugin system
6. Develop cloud offloading capability
7. Enhance error handling and logging
8. Complete documentation

## Conclusion

The core simulation engine is well-implemented, with a strong foundation for physics modeling, numerical solutions, and analysis. The main gaps are in the user interface, visualization rendering, and some extended features like cloud offloading and plugin support. With these components implemented, the Plasma Furnace Simulator would fulfill all the requirements specified in the requirements documentation.

---
---
---



## FEATURE LIST

**Core Simulation & Physics:**
- [ ] Input furnace geometry (cylinder height, diameter).
- [ ] Define number, 3D position, and orientation of plasma torches.
- [ ] Input operational parameters per torch (power, flow, temperature).
- [ ] Define initial material properties (composition, density, water content).
- [ ] Support temperature-dependent material properties (via functions/tables).
- [ ] Define boundary conditions (wall heat-loss toggles, wall properties).
- [ ] Enable/disable specific phenomena (e.g., simplified convection).
- [ ] Input total simulation time.
- [ ] Define simulation precision (mesh density).
- [ ] Define gasification agent and related parameters (ER, S/F).
- [ ] Calculate heat propagation (conduction, radiation).
- [ ] Support distinct simulation zones (drying, pyrolysis, gasification, melting) if enabled.
- [ ] Optional simplified turbulence/convection calculation.
- [ ] Implement solver for time-dependent heat equations.
- [ ] Support multi-zone simulation logic based on local temperature.
- [ ] Axis symmetry boundary condition (r=0).
- [ ] Outer wall boundary condition (mixed convection + radiation).
- [ ] Top/bottom boundary conditions (user-selectable: adiabatic or specified temperature).
- [ ] Phase change modeling (enthalpy method).

**Data & Formula Management:**
- [ ] Select material properties from a built-in database or allow user input.
- [ ] Formula display.
- [ ] Safe formula editing (sandboxed evaluator).
- [ ] Load/save project workspaces (parameters, results references, metadata as JSON).

**User Interface & Experience:**
- [ ] Intuitive parameter input.
- [ ] Simulation control (start, stop, pause, resume).
- [ ] Native desktop application (Windows/macOS).
- [ ] Tooltips/help text for parameters.
- [ ] Offline help pages.
- [ ] "Getting Started" wizard.
- [ ] Input validation on-the-fly with context-sensitive error messages.
- [ ] Display simulation progress (time, iterations, convergence).
- [ ] UI notifications for simulation events (completion, errors) via dialogs/snackbars.
- [ ] Human-readable display of Rust panics/errors in UI.
- [ ] User-configurable structured logging (JSON) with levels (DEBUG, INFO, WARN, ERROR) to a file.
- [ ] Display error codes for failures (e.g., simulation convergence).
- [ ] Accessibility support (keyboard navigation, high-contrast themes).

**Visualization:**
- [ ] 2D/3D heatmap visualizations of temperature fields.
- [ ] Playback controls for time-series visualizations (play, pause, seek, speed).
- [ ] Real-time plot of key metrics during simulation.

**Analysis & Export:**
- [ ] Calculate and display performance metrics: syngas yield, heating value, Specific Energy Requirement (SER), mass/volume reduction.
- [ ] Calculate/display syngas composition.
- [ ] Export full dataset (raw data, parameters) and metrics (CSV/JSON).
- [ ] Log export errors (e.g., disk full, permission denied) and prompt for an alternate path.

**Validation & Comparison:**
- [ ] Import validation data (e.g., experimental CSV).
- [ ] Tools to compare simulation results with validation data.
- [ ] Align time/temperature scales for comparison.
- [ ] Compute error metrics (L² norm, Max error, RMS error) against experimental data.
- [ ] Generate deviation plots for each zone.
- [ ] Produce summary reports for validation (e.g., automated PDF or JSON).

**Extensibility & Advanced Features:**
- [ ] Plugin API for custom physics extensions (with secure sandboxing, no arbitrary I/O or network).
- [ ] Batch/parametric study mode.

**General & Non-Functional:**
- [ ] Well-structured, documented code.
- [ ] Single installer per platform.
- [ ] Versioned physics-model manifest.
- [ ] Unit and integration tests.

## ROADMAP LIST

This roadmap organizes features into sprints, aiming for a runnable and testable application increment at the end of each sprint.

### Pre-Sprint: Project Foundation

**Goal:** Establish the foundational tools, repositories, and initial project structure to support efficient development and collaboration. (NFR5, NFR6)

-   [x] **Setup & Configuration:** Initialize Git repository on a chosen platform (e.g., GitHub, GitLab). (See AI Prompt: [`PROMPTS.md#task-initialize-git-repository-on-a-chosen-platform-eg-github-gitlab`](./PROMPTS.md#task-initialize-git-repository-on-a-chosen-platform-eg-github-gitlab))
-   [ ] **Setup & Configuration:** Set up project structure (folders for `src`, `docs`, `tests`, `ui`, etc.). (See AI Prompt: [`PROMPTS.md#task-set-up-project-structure-folders-for-src-docs-tests-ui-etc`](./PROMPTS.md#task-set-up-project-structure-folders-for-src-docs-tests-ui-etc))
-   [ ] **Setup & Configuration:** Configure CI/CD pipeline basics (e.g., linting, basic build checks on push). (See AI Prompt: [`PROMPTS.md#task-configure-cicd-pipeline-basics-eg-linting-basic-build-checks-on-push`](./PROMPTS.md#task-configure-cicd-pipeline-basics-eg-linting-basic-build-checks-on-push))
-   [ ] **Documentation:** Initial project `README.md` with setup and build instructions. (See AI Prompt: [`PROMPTS.md#task-initial-project-readmemd-with-setup-and-build-instructions`](./PROMPTS.md#task-initial-project-readmemd-with-setup-and-build-instructions))
-   [ ] **Documentation:** Establish conventions for ongoing creation of supporting design documents (Use Cases, Sequence Diagrams, etc.) alongside feature development. (See AI Prompt: [`PROMPTS.md#task-establish-conventions-for-ongoing-creation-of-supporting-design-documents`](./PROMPTS.md#task-establish-conventions-for-ongoing-creation-of-supporting-design-documents))
-   [ ] **Tooling:** Choose and configure issue tracking and project management tools (e.g., Jira, Trello, GitHub Issues). (See AI Prompt: [`PROMPTS.md#task-choose-and-configure-issue-tracking-and-project-management-tools-eg-jira-trello-github-issues`](./PROMPTS.md#task-choose-and-configure-issue-tracking-and-project-management-tools-eg-jira-trello-github-issues))
-   [ ] **QA Objective:** Repository is accessible. Basic CI check passes on initial commit. Project can be cloned and a placeholder 'hello world' (or equivalent for Tauri) can be built and run locally.

---
---
### Sprint 1: Basic UI Shell & Core Furnace Geometry Input

**Goal:** Create the main application window and implement UI elements for defining the fundamental furnace geometry. (FR1.1, FR6.1, FR6.2, NFR1, NFR4)

-   [ ] **User Interface & Experience:** Implement main window structure, basic menu (File > Exit), and placeholder content areas using Tauri. (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-implement-main-window-structure-basic-menu-file--exit-and-placeholder-content-areas-using-tauri`](./PROMPTS.md#task-user-interface--experience-implement-main-window-structure-basic-menu-file--exit-and-placeholder-content-areas-using-tauri))
-   [ ] **User Interface & Experience:** UI input fields for furnace cylinder height and diameter (FR1.1) with basic on-the-fly validation (FR1.10 - e.g., positive numbers only). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-ui-input-fields-for-furnace-cylinder-height-and-diameter-fr11-with-basic-on-the-fly-validation-fr110---eg-positive-numbers-only`](./PROMPTS.md#task-user-interface--experience-ui-input-fields-for-furnace-cylinder-height-and-diameter-fr11-with-basic-on-the-fly-validation-fr110---eg-positive-numbers-only))
-   [ ] **Core Simulation & Physics:** Backend stubs/data structures to receive and store furnace geometry from UI. (See AI Prompt: [`PROMPTS.md#task-core-simulation--physics-backend-stubsdata-structures-to-receive-and-store-furnace-geometry-from-ui`](./PROMPTS.md#task-core-simulation--physics-backend-stubsdata-structures-to-receive-and-store-furnace-geometry-from-ui))
-   [ ] **QA Objective:** Launch the app. Input valid and invalid furnace dimensions. Verify UI updates, basic validation messages appear, and data is (conceptually) passed to backend (verifiable via logs/debug). App has a title bar and can be closed.

---
### Sprint 2: Basic Simulation Control & Feedback

**Goal:** Introduce UI controls for starting/stopping a (placeholder) simulation and provide minimal feedback to the user. (FR2.3, FR2.4 partial, FR6.1)

-   [ ] **User Interface & Experience:** Basic simulation control (Start, Stop, Pause placeholder buttons). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-basic-simulation-control-start-stop-pause-placeholder-buttons`](./PROMPTS.md#task-user-interface--experience-basic-simulation-control-start-stop-pause-placeholder-buttons))
-   [ ] **User Interface & Experience:** UI text area/panel to display simple simulation status messages (e.g., "Simulation Started," "Simulation Stopped," "Error: Backend not fully implemented") (FR2.3). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-ui-text-areapanel-to-display-simple-simulation-status-messages`](./PROMPTS.md#task-user-interface--experience-ui-text-areapanel-to-display-simple-simulation-status-messages))
-   [ ] **Core Simulation & Physics:** Basic Tauri command to invoke a placeholder backend "simulation" function when "Start" is clicked and receive a simple status update. (See AI Prompt: [`PROMPTS.md#task-core-simulation--physics-basic-tauri-command-to-invoke-a-placeholder-backend-simulation-function-when-start-is-clicked-and-receive-a-simple-status-update`](./PROMPTS.md#task-core-simulation--physics-basic-tauri-command-to-invoke-a-placeholder-backend-simulation-function-when-start-is-clicked-and-receive-a-simple-status-update))
-   [ ] **QA Objective:** Launch app. Click Start/Pause/Stop. Verify UI status messages update accordingly. Placeholder backend function is called (verifiable via logs).

---
### Sprint 3: Plasma Torch Parameter Input

**Goal:** Extend the UI to allow users to define plasma torch configurations and their operational parameters. (FR1.2, FR1.3, FR6.1, FR1.10)

-   [ ] **User Interface & Experience:** UI for defining number of torches (e.g., a simple number input) (FR1.2 part). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-ui-for-defining-number-of-torches-eg-a-simple-number-input-fr12-part`](./PROMPTS.md#task-user-interface--experience-ui-for-defining-number-of-torches-eg-a-simple-number-input-fr12-part))
-   [ ] **User Interface & Experience:** For each torch: UI input fields for 3D position (X,Y,Z) and orientation (e.g., direction vector or Euler angles) (FR1.2 part). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-for-each-torch-ui-input-fields-for-3d-position-xyz-and-orientation-eg-direction-vector-or-euler-angles-fr12-part`](./PROMPTS.md#task-user-interface--experience-for-each-torch-ui-input-fields-for-3d-position-xyz-and-orientation-eg-direction-vector-or-euler-angles-fr12-part))
-   [ ] **User Interface & Experience:** For each torch: UI input fields for power, flow, temperature (FR1.3). Add basic validation (FR1.10). (See AI Prompt: [`PROMPTS.md#task-user-interface--experience-for-each-torch-ui-input-fields-for-power-flow-temperature-fr13-add-basic-validation-fr110`](./PROMPTS.md#task-user-interface--experience-for-each-torch-ui-input-fields-for-power-flow-temperature-fr13-add-basic-validation-fr110))
-   [ ] **Core Simulation & Physics:** Backend data structures to store multi-torch configurations. (See AI Prompt: [`PROMPTS.md#task-core-simulation--physics-backend-data-structures-to-store-multi-torch-configurations`](./PROMPTS.md#task-core-simulation--physics-backend-data-structures-to-store-multi-torch-configurations))
-   [ ] **QA Objective:** Define 1 and N torches. Input valid/invalid parameters for each. Verify UI updates and validation. Data structure for torches is correctly populated in backend (debug/log).

---
### Sprint 4: Material Properties & Boundary Conditions Input

**Goal:** Implement UI for specifying initial material properties and basic boundary conditions for the simulation. (FR1.4 initial, FR1.5, FR6.1, FR1.10)

-   [ ] **User Interface & Experience:** UI for initial material properties: composition (text input), density, water content (numeric inputs) (FR1.4). Basic validation (FR1.10).
-   [ ] **User Interface & Experience:** UI for basic boundary conditions: e.g., toggle for "Adiabatic Walls" (FR1.5 part).
-   [ ] **Core Simulation & Physics:** Backend to store these settings.
-   [ ] **QA Objective:** Input material properties and set boundary condition toggles. Verify UI validation and backend data storage (debug/log).

---
### Sprint 5: Core Simulation Execution (Conduction & Radiation - Simplified)

**Goal:** Implement the first version of the backend simulation engine, focusing on simplified 2D heat conduction and radiation. (FR2.1 Simplified)

-   [ ] **Core Simulation & Physics:** Implement backend logic for 2D (axial-radial) heat conduction in the cylindrical mesh (using parameters from Sprints 1, 4).
-   [ ] **Core Simulation & Physics:** Implement a *simplified* radiation model (e.g., torch as point source, basic view factors, no complex inter-surface radiation yet).
-   [ ] **Core Simulation & Physics:** Connect "Start" button to trigger this simplified backend simulation.
-   [ ] **Core Simulation & Physics:** Simulation outputs basic results (e.g., final temperature array) to a log or internal state.
-   [ ] **QA Objective:** Run a simulation with simple geometry/material. Verify (via logs or debugger) that conduction and simplified radiation calculations are performed and a temperature field is produced without crashing. No UI visualization of results yet.

---
### Sprint 6: Basic 2D Heatmap Visualization

**Goal:** Provide the first visual output of simulation results by displaying a 2D heatmap of the temperature field. (FR3.1, FR3.2 2D part, FR6.1)

-   [ ] **User Interface & Experience:** UI panel to display a static 2D heatmap (e.g., radial-axial cross-section) of the temperature field from Sprint 5 results.
-   [ ] **User Interface & Experience:** Implement basic color mapping for temperature.
-   [ ] **Core Simulation & Physics:** Backend needs to provide the 2D temperature array to the UI.
-   [ ] **QA Objective:** Run simulation. Verify a 2D heatmap is displayed in the UI, representing the backend temperature data. Colors should qualitatively reflect temperature differences.

---
### Sprint 7: Simulation Time & Precision Settings

**Goal:** Allow users to configure total simulation time and select a precision level (mesh density) for the simulation. (FR1.7, FR1.8, FR6.1, FR1.10)

-   [ ] **User Interface & Experience:** UI input for total simulation time (FR1.7) and simulation precision (e.g., mesh density presets: Coarse, Medium, Fine - FR1.8).
-   [ ] **Core Simulation & Physics:** Backend to use these parameters in the simulation setup (mesh generation and solver loop).
-   [ ] **QA Objective:** Set different simulation times and precision levels. Verify these are used by the backend (e.g., observe run duration changes, or log mesh size). Heatmap updates accordingly.

---
### Sprint 8: Project Workspace Persistence (Save/Load Parameters)

**Goal:** Implement functionality to save all current simulation input parameters to a file and load them back into the UI. (FR8, `requirements.md` 2.2)

-   [ ] **User Interface & Experience:** Implement "File > Save Project" and "File > Load Project" menu items.
-   [ ] **Core Simulation & Physics:** Backend logic to serialize all current input parameters (from Sprints 1, 3, 4, 7) to a file (e.g., JSON).
-   [ ] **Core Simulation & Physics:** Backend logic to deserialize parameters from file and populate UI fields.
-   [ ] **QA Objective:** Configure parameters, save project. Close and reopen app (or clear parameters). Load project. Verify all parameters are restored in UI. Run simulation with loaded parameters; results should be consistent.

---
### Sprint 9: Advanced Simulation Physics - Phase Change & Multi-Zone Logic

**Goal:** Enhance the simulation with phase change modeling (enthalpy method) and logic for multiple simulation zones. (FR1.6 part, FR2.1.1, FR2.2)

-   [ ] **User Interface & Experience:** UI toggle for "Enable Phase Change" (FR1.6).
-   [ ] **Core Simulation & Physics:** Implement logic for distinct simulation zones (drying, pyrolysis, gasification, melting) based on local temperature thresholds (FR2.1.1), initially affecting material properties used in those zones.
-   [ ] **Core Simulation & Physics:** Implement enthalpy method for phase change energy (vaporization, latent heat) (FR2.2).
-   [ ] **QA Objective:** Run simulations with phase change enabled/disabled. Observe impact (e.g., on logged temperature profiles or energy balance if logged). Set up conditions to trigger different zones and verify logic through output data/logs.

---
### Sprint 10: Advanced Parameterization - Temperature-Dependent Properties & Gasification Agents

**Goal:** Allow users to define temperature-dependent material properties and specify gasification agents. (FR1.4.2, FR1.9, FR6.1, FR1.10)

-   [ ] **User Interface & Experience:** UI for defining temperature-dependent material properties (e.g., thermal conductivity, specific heat) via simple table input (temperature, value pairs) (FR1.4.2).
-   [ ] **User Interface & Experience:** UI for defining gasification agent (e.g., dropdown: Air, Steam) and related parameters (ER, S/F if applicable) (FR1.9). Basic validation (FR1.10).
-   [ ] **QA Objective:** Input temp-dependent properties; verify backend uses interpolated values during simulation (logs/debug). Test with different gasification agents; verify parameters are passed to backend.

---
### Sprint 11: Visualization Enhancements - Playback Controls & Real-Time Plotting

**Goal:** Improve user experience for analyzing time-series results with playback controls and a real-time plot of key metrics. (FR3.3, FR2.3, FR3.4, FR3.5)

-   [ ] **User Interface & Experience:** Add Play, Pause, Step Forward/Backward, Speed control, and a Time Slider for the 2D heatmap (FR3.3).
-   [ ] **User Interface & Experience:** Allow selection of visualization styles for 2D heatmap (e.g., color schemes, basic isotherm toggle) (FR3.4).
-   [ ] **User Interface & Experience:** Basic controls to adjust rendering detail/update frequency for 2D heatmap if performance issues arise (FR3.5).
-   [ ] **Core Simulation & Physics:** Store temperature field at multiple time steps during simulation.
-   [ ] **User Interface & Experience:** Add a simple line plot to show one key metric (e.g., average furnace temperature) updating in real-time during simulation (FR2.3 for progress, precursor to FR5.3).
-   [ ] **QA Objective:** Use playback controls on a completed simulation's 2D heatmap. Observe real-time plot updating during an active (short) simulation. Test new visualization style options.

---
### Sprint 12: Performance Metrics Calculation & Basic Data Export

**Goal:** Enable the calculation and display of key performance metrics and allow users to export basic simulation data. (FR5.1, FR5.2, FR5.3 initial)

-   [ ] **Analysis & Export:** Backend: Calculate simplified initial versions of: syngas yield (if gasification active), heating value, SER, mass/volume reduction (FR5.3).
-   [ ] **User Interface & Experience:** UI panel/section to display these calculated metrics post-simulation.
-   [ ] **Analysis & Export:** UI: "Export Data" button. Backend: Export current input parameters and final temperature field (or time-series if available) to CSV/JSON (FR5.1, FR5.2).
-   [ ] **QA Objective:** Run simulation. Verify metrics are displayed. Export data; check CSV/JSON file content and format.

---
### Sprint 13: UI/UX Enhancements - Help System & Structured Logging

**Goal:** Improve usability with an integrated help system and enhance diagnostics with structured logging and better error reporting. (FR6.3, FR6.4 partial, `requirements.md` 2.8 Error Handling/Logging)

-   [ ] **User Interface & Experience:** Add tooltips for at least 5-10 key input parameters (FR6.3).
-   [ ] **Documentation:** Create basic structure for offline help (e.g., "About" page, key concept explanations) and design/implement a simple "Getting Started" wizard (FR6.4).
-   [ ] **Core Simulation & Physics:** Backend: Implement structured logging (JSON) to a file with levels (DEBUG, INFO, WARN, ERROR) (`requirements.md` 2.8). UI: Basic setting for log level.
-   [ ] **Core Simulation & Physics:** Implement top-level panic hook in Rust backend to catch panics, log them structurally, and send a user-friendly error message to UI (`requirements.md` 2.8, FR2.5).
-   [ ] **User Interface & Experience:** Define and use 2-3 basic error codes for common input validation failures or simple simulation issues, display in UI (`requirements.md` 2.8, FR1.10, FR2.5).
-   [ ] **QA Objective:** Verify tooltips. Access help pages and test "Getting Started" wizard. Configure logging, check log file. Trigger a deliberate panic (if possible via test setup) or input error; observe UI feedback.

---
### Sprint 14: Material Database Integration & Advanced Simulation Controls

**Goal:** Allow selection of materials from a built-in database and provide more robust simulation control (pause, resume). (`requirements.md` 2.2 Material definition from DB, FR2.4)

-   [ ] **User Interface & Experience:** UI: Allow selecting a material from a built-in database (e.g., dropdown) (FR1.4).
-   [ ] **Core Simulation & Physics:** Backend: Store selected material properties.
-   [ ] **User Interface & Experience:** Ensure Pause/Resume buttons are functional. Backend: Implement logic to gracefully pause (save state, stop solver iterations) and resume simulation (FR2.4). Stop should ensure clean shutdown.
-   [ ] **QA Objective:** Select material from DB, run simulation, verify properties used. Test Pause, Resume, Stop during a simulation.

---
### Sprint 15: Basic Validation Data Handling & Comparison

**Goal:** Implement initial functionality for importing experimental validation data and visually comparing it with simulation results. (FR7.1, FR7.2)

-   [ ] **Validation & Comparison:** UI: "Import Validation Data" button for CSV (time, temp_point_A, temp_point_B...). Backend: Parse CSV into an internal data structure (FR7.1).
-   [ ] **Validation & Comparison:** UI: On the 2D heatmap or a separate simple plot, overlay imported validation data points against simulation results for corresponding locations/times (FR7.2).
-   [ ] **Validation & Comparison:** Basic UI controls for shifting/scaling validation data for overlay (visual alignment only for now).
-   [ ] **QA Objective:** Import sample CSV. Display its data points overlaid on simulation results. Test alignment tools for visual matching.

---
### Sprint 16: Advanced Analysis (Syngas Composition) & Robust Export Error Handling

**Goal:** Calculate and display syngas composition and make data export more robust by handling common errors. (FR5.3 fuller, FR5.4)

-   [ ] **Analysis & Export:** Backend: If gasification is active and relevant zones are modeled (Sprint 9), implement calculation for basic syngas components (e.g., H2, CO, CO2, CH4 based on simplified equilibrium/kinetic models) (FR5.3). UI: Display these.
-   [ ] **Analysis & Export:** Backend: For data export (Sprint 12), implement error handling for disk full / permission denied. UI: Display error message from backend and prompt for alternate path (FR5.4).
-   [ ] **QA Objective:** Run simulation with gasification. Verify syngas composition displayed. Test data export error conditions (e.g., to read-only path).

---
### Sprint 17: Formula Display & Basic Sandboxed Editing

**Goal:** Allow users to view and safely edit predefined core formulas using a sandboxed environment. (FR4.1, FR4.2, FR4.3)

-   [ ] **User Interface & Experience:** UI: Display one or two predefined core formulas (e.g., a specific material property calculation) in a read-only text area (FR4.1).
-   [ ] **User Interface & Experience:** UI: Allow editing of this displayed formula. Backend: Use Rhai (or similar) to evaluate the user-edited formula in a sandboxed environment (FR4.2, FR4.3). Apply resource/time limits.
-   [ ] **QA Objective:** View default formula. Edit it (e.g., change a constant). Run simulation; verify edited formula is used (logs/results). Test that a deliberately malformed or resource-intensive (but simple) formula is handled safely (e.g., error message, no crash).

---
### Sprint 18: Batch/Parametric Study Mode (Basic)

**Goal:** Implement a basic batch/parametric study mode allowing users to vary a single input parameter over a defined range. (FR8.1)

-   [ ] **User Interface & Experience:** UI: Allow selecting one existing numerical input parameter (e.g., a torch power). UI: Define a range (start, end, number of steps) for this parameter (FR8.1).
-   [ ] **Core Simulation & Physics:** Backend: Loop through the defined parameter values, run a full simulation for each. Collect one key output metric (e.g., max temperature) for each run.
-   [ ] **User Interface & Experience:** UI: Display results in a simple table (varied parameter value vs. key output metric) (precursor to FR8.2 sensitivity charts).
-   [ ] **Data & Formula Management:** Store results from parametric studies, at least temporarily or in a simple aggregated format (e.g., the table data).
-   [ ] **QA Objective:** Setup parametric study (e.g., vary torch power over 3 values). Execute. Verify 3 simulations run. Check results table for correctness.

---
### Sprint 19: Advanced Validation Metrics & Deviation Plots

**Goal:** Compute and display quantitative error metrics for validation and generate deviation plots to visualize differences. (FR7.3)

-   [ ] **Validation & Comparison:** Backend: When validation data (Sprint 15) is loaded and simulation run, compute L² norm, Max error, RMS error between simulation and experimental data for comparable points (FR7.3).
-   [ ] **Validation & Comparison:** UI: Display these error metrics in a summary table (FR7.3).
-   [ ] **Validation & Comparison:** UI: Generate a simple plot showing simulation_value vs. experimental_value, or (experimental_value - simulation_value) vs. time/position (FR7.3).
-   [ ] **User Interface & Experience:** UI to select and display these zone-specific deviation plots.
-   [ ] **Data & Formula Management:** Extend project workspace to save references to validation reports or key report data.
-   [ ] **QA Objective:** Perform validation run. Verify that the specified error metrics are calculated and displayed correctly. Check that a deviation plot is generated and accurately represents the differences between simulation and experimental data.

---
### Sprint 20: 3D Heatmap Visualization (Initial) & Accessibility Review

**Goal:** Introduce an initial, basic version of 3D heatmap visualization and conduct a review of existing UI components for accessibility. (FR3.1, FR3.2 3D part, NFR4 Accessibility)

-   [ ] **User Interface & Experience:** Visualization: Implement a basic, static 3D heatmap display of the final temperature field (e.g., using a Rust 3D plotting library). User can select this view. (FR3.1, FR3.2).
-   [ ] **User Interface & Experience:** Review existing UI elements for keyboard navigation (tab order, focus indicators). Test with a screen reader (basic support). Check color contrast for main UI text & controls (NFR4). Document findings.
-   [ ] **QA Objective:** Run simulation. View basic static 3D heatmap. Perform keyboard navigation through UI. Use contrast checker on key screens.

---
### Sprint 21: Advanced Boundary Conditions & Simplified Turbulence Model

**Goal:** Implement UI for more detailed boundary conditions and an optional simplified turbulence/convection model. (FR1.5 detailed, FR1.6 part, FR2.1.2)

-   [ ] **User Interface & Experience:** UI: Add options for top/bottom surface boundary conditions (e.g., dropdown: Adiabatic, Specified Temperature, Convective Heat Flux) with relevant input fields (FR1.5).
-   [ ] **Core Simulation & Physics:** Backend: Implement a *simplified* turbulence/convection model (e.g., effective thermal conductivity or simplified heat transfer coefficient correlations). UI: Toggle to enable/disable (FR1.6, FR2.1.2).
-   [ ] **QA Objective:** Test different boundary conditions. Run with/without simplified turbulence model, observe impact on results (heatmaps/logs).

---
### Sprint 22: Enhanced Validation Reporting (Summary & Zonal Plots)

**Goal:** Improve validation workflow by producing summary reports and generating deviation plots specific to simulation zones. (FR7.3 reporting part, implicitly FR2.1.1 if zonal plots)

-   [ ] **Validation & Comparison:** Backend: Generate a JSON summary report for validation runs, including input parameters, error metrics (from Sprint 19), and paths to data files (FR7.3). UI: Option to save this report.
-   [ ] **Validation & Comparison:** If multi-zone simulation active (Sprint 9) and validation data points can be mapped to zones: Generate deviation plots (from Sprint 19) filtered per zone.
-   [ ] **QA Objective:** Perform validation run. Generate and save summary report; verify content. If applicable, test zone-specific deviation plots.

---
### Sprint 23: Parametric Study Enhancements (Multi-Parameter & Improved Results)

**Goal:** Extend the parametric study mode to allow variation of multiple parameters and provide better ways to visualize/export results. (FR8.1 multi-param, FR8.2 sensitivity charts)

-   [ ] **User Interface & Experience:** UI: Allow selection of 2-3 numerical input parameters for variation in parametric study (FR8.1).
-   [ ] **User Interface & Experience:** UI: Display results as a sortable/filterable table. For 2 varied params, attempt a simple 2D plot (heatmap or contour) of output vs. the two input params (FR8.2).
-   [ ] **Data & Formula Management:** Store results from parametric studies, at least temporarily or in a simple aggregated format (e.g., the table data).
-   [ ] **QA Objective:** Setup and run multi-parameter study. Verify simulations for all combinations. Test improved results display and data export.

---
### Sprint 24: Plugin System - Core Infrastructure & API Design (Phase 1)

**Goal:** Design and implement the core infrastructure for a plugin system, including API basics and a versioned manifest. (`requirements.md` Scope 1.2 Plugin API, NFR3 Versioned manifest, NFR8 Sandbox)

-   [ ] **Extensibility & Advanced Features:** Define initial Rust traits for basic plugin registration (name, version, description) and a simple lifecycle hook (e.g., `on_simulation_start`).
-   [ ] **Extensibility & Advanced Features:** Design a simple manifest structure (e.g., TOML file) for plugins to declare their name, version, compatibility with core app version (NFR3).
-   [ ] **Extensibility & Advanced Features:** Backend: Scan a designated directory for plugin files (e.g., `.dll`/`.so`/`.dylib`). Load valid plugins based on manifest.
-   [ ] **Extensibility & Advanced Features:** Research sandboxing options for Rust (e.g., WASM runtimes, restricted capabilities). Create a design document/notes on feasibility for future plugin types (NFR8). (No implementation yet).
-   [ ] **QA Objective:** Create "hello world" plugin (logs message via `on_simulation_start` hook). Demonstrate loading and its message appearing. Verify manifest parsing.

---
### Sprint 25: Plugin System - UI Management & Basic Custom Physics Hook

**Goal:** Provide UI for managing plugins and extend the plugin API with a basic hook for custom physics modification. (`requirements.md` Scope 1.2, NFR8)

-   [ ] **User Interface & Experience:** Plugin management UI: List loaded plugins, show info from manifest, allow enable/disable (persisted setting).
-   [ ] **Extensibility & Advanced Features:** API: Add a hook for plugins to modify a *single, predefined* simulation parameter (e.g., global heat loss factor) *before* simulation starts.
-   [ ] **QA Objective:** Use UI to enable/disable example plugin. Verify its effect (modifying the parameter) is active only when enabled.

---
### Sprint 26: Interactive 3D Visualization & User-Defined Material Database

**Goal:** Enhance 3D visualization with interactive controls and allow users to create and manage their own material database. (FR3.2, FR3.3 for 3D, FR1.4 user DB part, `requirements.md` 2.2 user mat DB)

-   [ ] **User Interface & Experience:** For the 3D heatmap (Sprint 20): Implement camera rotation, zoom, pan controls (FR3.2, FR3.3).
-   [ ] **User Interface & Experience:** Add basic 3D slicing (e.g., show a 2D slice along X, Y, or Z axis) of the 3D volume.
-   [ ] **User Interface & Experience:** Implement basic error handling for 3D visualization (e.g., attempt to reduce detail on OOM, notify user) (FR3.6).
-   [ ] **User Interface & Experience:** UI: Allow creating new materials (with properties from Sprint 4 & 10), editing, saving to a user-managed file (e.g., JSON). UI: Load materials from this user file (FR1.4).
-   [ ] **QA Objective:** Test 3D camera and slicing. Create custom material, save, load, use in simulation. Test 3D visualization error handling if possible.

---
### Sprint 27: Performance Profiling & Initial Optimizations

**Goal:** Profile application performance, identify bottlenecks, and implement initial targeted optimizations. (NFR2 Performance)

-   [ ] **Core Simulation & Physics:** Use profiling tools (e.g., `flamegraph`, `perf`) on the backend for a defined benchmark case (e.g., 100³ grid as per NFR2, or a smaller but representative case).
-   [ ] **Core Simulation & Physics:** Based on profiling, implement 1-2 high-impact optimizations.
-   [ ] **User Interface & Experience:** Improve progress display (e.g., % complete, estimated time remaining based on current iteration speed) (FR2.3).
-   [ ] **QA Objective:** Run benchmark before/after optimizations, document speedup. Verify improved progress display.

---
### Sprint 28: Advanced Formula Integration & Plugin-Sourced Parameters

**Goal:** Deeper customization through formulas referencing other outputs and plugins defining new parameters. (FR4 advanced, `requirements.md` Scope 1.2)

-   [ ] **Extensibility & Advanced Features:** Extend Rhai scope/engine to allow formulas to access results of other (pre-calculated) formulas or a few key, named simulation state variables (e.g., `current_sim_time`).
-   [ ] **Extensibility & Advanced Features:** API: Allow plugins to define new parameters (name, type, default, description) that the core app can list. UI: Basic display (read-only for now) of these plugin-exposed parameters.
-   [ ] **Documentation:** Consolidate and review core supporting documents (User Manual, Test Plan) for initial release.
-   [ ] **QA Objective:** Create formula referencing another or sim variable; verify. Activate plugin; see its parameter listed (even if not editable yet). Review final documentation.

---
