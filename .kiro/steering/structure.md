# Project Structure & Organization

## Root Directory Layout

```
plasma_simulation/
├── src/                    # Core simulation library (Rust)
├── src-tauri/             # Desktop application (Tauri)
├── docs/                  # Documentation and guides
├── .kiro/                 # Kiro AI assistant configuration
├── .windsurf/             # Windsurf IDE configuration
├── target/                # Build artifacts (generated)
├── Cargo.toml             # Main workspace configuration
├── Cargo.lock             # Dependency lock file
└── README.md              # Project overview
```

## Core Library Structure (`src/`)

### Main Modules
- `lib.rs` - Library entry point and FFI interface
- `main.rs` - CLI entry point (currently minimal)
- `tests.rs` - Integration tests

### Simulation Engine (`src/simulation/`)
- `mod.rs` - Module organization and re-exports
- `physics.rs` - Physical models (heat transfer, plasma torches, radiation)
- `solver.rs` - Numerical solvers (Crank-Nicolson, SOR)
- `mesh.rs` - Cylindrical mesh discretization and geometry
- `materials.rs` - Material properties and phase change modeling
- `state.rs` - Simulation execution state and threading
- `metrics.rs` - Performance analysis and data export
- `validation.rs` - Result validation against reference data
- `visualization.rs` - Data preparation for rendering
- `parametric.rs` - Parameter sweep and optimization studies

### Formula Engine (`src/formula/`)
- `mod.rs` - Formula subsystem entry point
- `engine.rs` - Core formula evaluation using Rhai
- `integration.rs` - Integration with simulation solver

### Support Modules
- `src/errors/` - Error handling (placeholder)
- `src/logging/` - Logging configuration (placeholder)
- `src/plugins/` - Plugin system (placeholder)

## Desktop Application (`src-tauri/`)

### Rust Backend (`src-tauri/src/`)
- `main.rs` - Application entry point
- `lib.rs` - Tauri application library
- `simulation.rs` - Simulation control commands
- `parameters.rs` - Parameter management
- `state.rs` - Application state management

### Frontend (`src-tauri/ui/`)
- `index.html` - Main application page
- `parameters.html` - Parameter input interface
- `css/` - Stylesheets organized by component
  - `main.css` - Global styles
  - `design-system/` - Design tokens and variables
  - `components/` - Reusable UI components
  - `features/` - Feature-specific styles
- `js/` - JavaScript modules
  - `main.js` - Application initialization
  - `core/` - Core utilities and API wrappers
  - `features/` - Feature-specific functionality

### Configuration
- `tauri.conf.json` - Tauri application configuration
- `capabilities/` - Security capabilities
- `icons/` - Application icons for different platforms

## Documentation (`docs/`)

### Technical Documentation
- `technical_documentation.md` - Comprehensive technical overview
- `architecture_design.md` - System architecture details
- `build_guide.md` - Build and deployment instructions
- `user_manual.md` - End-user documentation
- `tutorial.md` - Getting started guide

### Development Guides
- `TUTORIAL_COMPLETO.md` - Complete tutorial (Portuguese)
- `TESTES_PERFORMANCE.md` - Performance testing guide
- `GITHUB_INTEGRATION.md` - Git workflow and integration

## Naming Conventions

### Rust Code
- **Modules**: `snake_case` (e.g., `simulation`, `formula_engine`)
- **Structs/Enums**: `PascalCase` (e.g., `PlasmaTorch`, `MaterialProperties`)
- **Functions/Variables**: `snake_case` (e.g., `calculate_heat_flux`, `mesh_density`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `STEFAN_BOLTZMANN`, `DEFAULT_TOLERANCE`)

### Files and Directories
- **Rust files**: `snake_case.rs` (e.g., `physics.rs`, `parametric_studies.rs`)
- **Documentation**: `snake_case.md` or descriptive names
- **Configuration**: Standard names (e.g., `Cargo.toml`, `tauri.conf.json`)

## Module Responsibilities

### Core Simulation Flow
1. **Input**: Parameters via Tauri commands → `parameters.rs`
2. **Setup**: Mesh generation → `mesh.rs`
3. **Physics**: Material properties → `materials.rs`
4. **Solver**: Numerical computation → `solver.rs` + `physics.rs`
5. **Analysis**: Metrics calculation → `metrics.rs`
6. **Output**: Visualization data → `visualization.rs`
7. **Export**: Results and reports → `metrics.rs`

### Data Flow Patterns
- **Configuration**: JSON serialization for persistence
- **Simulation Data**: In-memory arrays with zero-copy operations
- **Visualization**: Prepared data structures for frontend rendering
- **Export**: Multiple formats (CSV, JSON, VTK) via `metrics.rs`

## Development Workflow

### Adding New Features
1. **Physics Models**: Extend `physics.rs` or create new module in `simulation/`
2. **UI Components**: Add to `src-tauri/ui/` with corresponding CSS/JS
3. **Tauri Commands**: Define in appropriate `src-tauri/src/` module
4. **Tests**: Add unit tests in same file, integration tests in `tests/`
5. **Documentation**: Update relevant docs in `docs/`

### File Organization Principles
- **Single Responsibility**: Each module has a clear, focused purpose
- **Logical Grouping**: Related functionality grouped together
- **Minimal Dependencies**: Avoid circular dependencies between modules
- **Clear Interfaces**: Well-defined public APIs between modules
- **Testability**: Structure supports easy unit and integration testing