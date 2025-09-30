# Design Document - Plasma Furnace Simulator MVP

## Overview

This design document outlines the architecture and implementation approach for the Plasma Furnace Simulator MVP. The system is designed as a desktop application using Tauri with a Rust backend for high-performance numerical computations and an HTML/CSS/JavaScript frontend for user interaction and 3D visualization.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Tauri UI)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Parameter     │  │   3D Heatmap    │  │   Project   │ │
│  │   Input UI      │  │  Visualization  │  │ Management  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Tauri Commands  │
                    └─────────┬─────────┘
┌─────────────────────────────┴─────────────────────────────────┐
│                  Backend (Rust Core)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Simulation  │  │   Physics   │  │   Formula   │          │
│  │   Engine    │  │   Models    │  │   Engine    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │    Mesh     │  │  Materials  │  │ Visualization│          │
│  │  Generator  │  │ Properties  │  │ Data Prep   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Frontend Layer (Tauri UI)
- **Technology**: HTML5, CSS3, JavaScript, Three.js for 3D rendering
- **Responsibilities**:
  - Parameter input forms with real-time validation
  - 3D heatmap visualization with interactive controls
  - Project management interface (save/load)
  - Progress indication and user feedback

#### 2. Backend Layer (Rust Core)
- **Technology**: Rust with key crates (ndarray, rayon, serde, rhai)
- **Responsibilities**:
  - High-performance numerical computations
  - Physics simulation engine
  - Data management and serialization
  - Formula evaluation engine

## Components and Interfaces

### Core Simulation Engine

#### SimulationEngine
```rust
pub struct SimulationEngine {
    mesh: CylindricalMesh,
    physics: PlasmaPhysics,
    solver: HeatSolver,
    state: SimulationState,
}

impl SimulationEngine {
    pub fn new(config: SimulationConfig) -> Result<Self>;
    pub fn run_simulation(&mut self) -> Result<SimulationResults>;
    pub fn get_temperature_field(&self) -> &Array2<f64>;
    pub fn get_progress(&self) -> f64;
}
```

#### CylindricalMesh
```rust
pub struct CylindricalMesh {
    nr: usize,           // Radial nodes
    nz: usize,           // Axial nodes
    dr: f64,             // Radial spacing
    dz: f64,             // Axial spacing
    r_coords: Vec<f64>,  // Radial coordinates
    z_coords: Vec<f64>,  // Axial coordinates
}

impl CylindricalMesh {
    pub fn new(radius: f64, height: f64, nr: usize, nz: usize) -> Self;
    pub fn get_cell_volume(&self, i: usize, j: usize) -> f64;
    pub fn get_neighbors(&self, i: usize, j: usize) -> Vec<(usize, usize)>;
}
```

#### HeatSolver
```rust
pub struct HeatSolver {
    method: SolverMethod,
    dt: f64,
    cfl_factor: f64,
}

pub enum SolverMethod {
    ForwardEuler,
    CrankNicolson { sor_tolerance: f64, max_iterations: usize },
}

impl HeatSolver {
    pub fn solve_time_step(
        &mut self,
        temperature: &mut Array2<f64>,
        mesh: &CylindricalMesh,
        physics: &PlasmaPhysics,
        dt: f64,
    ) -> Result<()>;
    
    pub fn calculate_stable_timestep(&self, mesh: &CylindricalMesh, material: &Material) -> f64;
}
```

### Physics Models

#### PlasmaPhysics
```rust
pub struct PlasmaPhysics {
    torches: Vec<PlasmaTorch>,
    material: Material,
    boundary_conditions: BoundaryConditions,
}

impl PlasmaPhysics {
    pub fn calculate_heat_source(&self, r: f64, z: f64) -> f64;
    pub fn calculate_radiation_loss(&self, temperature: f64, emissivity: f64) -> f64;
    pub fn get_thermal_conductivity(&self, temperature: f64) -> f64;
    pub fn get_specific_heat(&self, temperature: f64) -> f64;
}
```

#### PlasmaTorch
```rust
pub struct PlasmaTorch {
    position: (f64, f64),    // (r, z) coordinates
    power: f64,              // kW
    efficiency: f64,         // 0.0 to 1.0
    sigma: f64,              // Gaussian dispersion parameter
}

impl PlasmaTorch {
    pub fn calculate_heat_flux(&self, r: f64, z: f64) -> f64 {
        let distance_sq = (r - self.position.0).powi(2) + (z - self.position.1).powi(2);
        let q_max = self.power * self.efficiency * 1000.0 / (2.0 * PI * self.sigma.powi(2));
        q_max * (-distance_sq / (2.0 * self.sigma.powi(2))).exp()
    }
}
```

### Material Properties

#### Material
```rust
pub struct Material {
    name: String,
    density: f64,                    // kg/m³
    thermal_conductivity: Property,  // W/(m·K)
    specific_heat: Property,         // J/(kg·K)
    emissivity: f64,                // 0.0 to 1.0
    melting_point: Option<f64>,     // K
    latent_heat_fusion: Option<f64>, // J/kg
}

pub enum Property {
    Constant(f64),
    Formula(String),  // Rhai formula string
    Table(Vec<(f64, f64)>), // (temperature, value) pairs
}

impl Material {
    pub fn get_thermal_conductivity(&self, temperature: f64, formula_engine: &FormulaEngine) -> f64;
    pub fn get_specific_heat(&self, temperature: f64, formula_engine: &FormulaEngine) -> f64;
}
```

### Formula Engine

#### FormulaEngine
```rust
pub struct FormulaEngine {
    engine: rhai::Engine,
    scope: rhai::Scope<'static>,
}

impl FormulaEngine {
    pub fn new() -> Self;
    pub fn evaluate_formula(&mut self, formula: &str, temperature: f64) -> Result<f64>;
    pub fn validate_formula(&mut self, formula: &str) -> Result<()>;
    pub fn set_constants(&mut self, constants: HashMap<String, f64>);
}
```

### Visualization Data Preparation

#### VisualizationData
```rust
pub struct VisualizationData {
    pub mesh_points: Vec<Point3D>,
    pub temperature_values: Vec<f64>,
    pub time_steps: Vec<f64>,
    pub metadata: VisualizationMetadata,
}

pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

pub struct VisualizationMetadata {
    pub min_temperature: f64,
    pub max_temperature: f64,
    pub simulation_time: f64,
    pub mesh_resolution: (usize, usize),
}

impl VisualizationData {
    pub fn from_simulation_results(results: &SimulationResults, mesh: &CylindricalMesh) -> Self;
    pub fn to_json(&self) -> Result<String>;
}
```

## Data Models

### Configuration Models

#### SimulationConfig
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct SimulationConfig {
    pub geometry: GeometryConfig,
    pub mesh: MeshConfig,
    pub physics: PhysicsConfig,
    pub solver: SolverConfig,
    pub torches: Vec<TorchConfig>,
    pub material: MaterialConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GeometryConfig {
    pub radius: f64,        // meters
    pub height: f64,        // meters
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MeshConfig {
    pub preset: MeshPreset,
    pub custom_resolution: Option<(usize, usize)>,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum MeshPreset {
    Fast,      // 50x50
    Balanced,  // 100x100
    High,      // 200x200
    Custom,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TorchConfig {
    pub position: (f64, f64),  // (r, z) in meters
    pub power: f64,            // kW
    pub efficiency: f64,       // 0.0 to 1.0
    pub sigma: f64,            // Gaussian spread parameter
}
```

### Project Management

#### Project
```rust
#[derive(Serialize, Deserialize)]
pub struct Project {
    pub metadata: ProjectMetadata,
    pub config: SimulationConfig,
    pub results: Option<SimulationResults>,
}

#[derive(Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub version: String,
}

impl Project {
    pub fn new(name: String, config: SimulationConfig) -> Self;
    pub fn save_to_file(&self, path: &Path) -> Result<()>;
    pub fn load_from_file(path: &Path) -> Result<Self>;
}
```

## Error Handling

### Error Types
```rust
#[derive(Debug, thiserror::Error)]
pub enum SimulationError {
    #[error("Invalid parameter: {parameter} = {value}, expected range: {range}")]
    InvalidParameter {
        parameter: String,
        value: String,
        range: String,
    },
    
    #[error("Numerical instability detected at time step {step}, time = {time}s")]
    NumericalInstability { step: usize, time: f64 },
    
    #[error("Mesh generation failed: {reason}")]
    MeshGenerationError { reason: String },
    
    #[error("Formula evaluation error: {formula} - {error}")]
    FormulaError { formula: String, error: String },
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, SimulationError>;
```

## Testing Strategy

### Unit Testing Approach
- **Physics Models**: Test individual heat source calculations, material property evaluations
- **Numerical Methods**: Validate Forward Euler implementation against analytical solutions
- **Mesh Generation**: Verify correct coordinate generation and neighbor relationships
- **Formula Engine**: Test formula parsing, evaluation, and error handling

### Integration Testing Approach
- **End-to-End Simulation**: Run complete simulation workflows with known inputs
- **Performance Benchmarks**: Measure simulation times for different mesh sizes
- **Data Consistency**: Verify temperature field data integrity throughout simulation

### Manual Testing Support
- **Immediate Visualization**: Basic heatmap available after each simulation step
- **Parameter Validation**: Real-time feedback on parameter changes
- **Progress Monitoring**: Visual progress indicators during simulation execution

## Performance Considerations

### Memory Management
- **Efficient Arrays**: Use ndarray with BLAS integration for numerical operations
- **Memory Pools**: Reuse temperature field arrays between time steps
- **Streaming**: Process large datasets in chunks to manage memory usage

### Computational Optimization
- **Parallelization**: Use rayon for parallel mesh operations where possible
- **Cache Efficiency**: Structure data for optimal memory access patterns
- **SIMD**: Leverage ndarray's SIMD optimizations for array operations

### Scalability Targets
- **Fast Mode (50×50)**: Complete 60s simulation in <30 seconds
- **Memory Usage**: <2GB for Fast mode, <4GB for Balanced mode
- **Visualization**: Maintain 15+ FPS for interactive 3D rendering

## Security Considerations

### Formula Engine Security
- **Sandboxing**: Rhai engine runs in restricted environment
- **Resource Limits**: CPU time and memory limits for formula evaluation
- **Input Validation**: Sanitize all user-provided formulas before evaluation

### File System Security
- **Path Validation**: Validate all file paths for project save/load operations
- **Permission Checks**: Verify write permissions before attempting file operations
- **Input Sanitization**: Sanitize all user inputs to prevent injection attacks

## Development Guidelines

### Code Organization
- **Modular Design**: Clear separation between physics, numerics, and visualization
- **Interface Contracts**: Well-defined APIs between components
- **Error Propagation**: Consistent error handling throughout the system

### Incremental Development
- **Feature Isolation**: Each component can be developed and tested independently
- **Visual Feedback**: Basic visualization available from first implementation
- **Code Reuse**: Check existing implementations before adding new functionality

### Documentation Requirements
- **API Documentation**: Comprehensive rustdoc for all public interfaces
- **Mathematical Formulations**: Document all physics equations and numerical methods
- **Usage Examples**: Provide examples for all major functionality