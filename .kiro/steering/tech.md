# Technology Stack & Build System

## Core Technologies

### Backend (Simulation Engine)
- **Language**: Rust (edition 2021)
- **Performance**: Native systems programming for heavy numerical computations
- **Key Crates**:
  - `ndarray` - Multi-dimensional arrays with BLAS integration and parallel processing
  - `serde` + `serde_json` - Serialization for data exchange and persistence
  - `anyhow` + `thiserror` - Robust error handling
  - `log` + `env_logger` - Structured logging
  - `rhai` - Embedded scripting engine for formula evaluation
  - `rayon` - Data parallelism for performance-critical computations
  - `rand` - Random number generation for Monte Carlo methods

### Frontend (Desktop Application)
- **Framework**: Tauri v2.5.0
- **UI Technology**: HTML/CSS/JavaScript with native Rust backend
- **Architecture**: Hybrid approach combining web technologies with native performance
- **Configuration**: `tauri.conf.json` for app settings and capabilities

### Build System
- **Primary**: Cargo (Rust package manager)
- **Workspace Structure**: Multi-crate workspace with main library and Tauri app
- **Target Platforms**: Windows, macOS (Intel/ARM), Linux

## Common Commands

### Development
```bash
# Build the simulation library
cargo build

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo run

# Build Tauri desktop app
cd src-tauri && cargo tauri dev

# Build release version
cargo tauri build
```

### Testing & Benchmarking
```bash
# Run all tests with output
cargo test -- --nocapture

# Run specific test module
cargo test simulation::physics

# Run benchmarks (when enabled)
cargo bench

# Check code formatting
cargo fmt --check

# Run clippy lints
cargo clippy
```

### Project Management
```bash
# Check dependencies
cargo tree

# Update dependencies
cargo update

# Clean build artifacts
cargo clean
```

## Architecture Patterns

### Numerical Computing
- **Finite Difference Method**: Crank-Nicolson scheme for unconditional stability
- **Enthalpy Method**: For robust phase change modeling with energy conservation
- **Iterative Solvers**: Successive Over-Relaxation (SOR) for large sparse systems
- **Parallelization**: Multi-threaded execution using Rayon for mesh operations

### Code Organization
- **Modular Design**: Clear separation between physics, mesh, solver, and visualization
- **Plugin Architecture**: Dynamic loading of custom physics extensions
- **Formula Engine**: Sandboxed evaluation of user-defined mathematical expressions
- **Error Handling**: Comprehensive error propagation with context

### Performance Considerations
- **Zero-Copy Operations**: Minimize memory allocations in hot paths
- **SIMD Optimization**: Leverage ndarray's BLAS integration
- **Memory Layout**: Cache-friendly data structures for mesh operations
- **Async I/O**: Non-blocking file operations and data export

## Development Guidelines

### Rust Best Practices
- Use `#[derive(Debug, Clone, Serialize, Deserialize)]` for data structures
- Implement proper error types with `thiserror`
- Use `anyhow::Result` for application-level error handling
- Prefer `&str` over `String` for function parameters when possible
- Use `const` for mathematical and physical constants

### Testing Strategy
- Unit tests for individual components
- Integration tests for solver accuracy
- Benchmark tests for performance regression detection
- Property-based testing for numerical stability

### Documentation
- Comprehensive rustdoc comments for public APIs
- Mathematical formulations in docstrings using LaTeX notation
- Examples in documentation tests
- Architecture decision records for major design choices