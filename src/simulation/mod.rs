//! Core simulation engine for the Plasma Furnace Simulator
//! 
//! This module serves as the root for the entire simulation engine, organizing
//! all major sub-components including physics models, mesh generation, numerical
//! solvers, state management, material properties, metrics calculation,
//! validation, visualization, and parametric studies.
//! 
//! # Module Organization
//! 
//! - [`materials`] - Material properties and databases
//! - [`mesh`] - Mesh generation and management for cylindrical geometries
//! - [`metrics`] - Performance metrics and data export functionality
//! - [`parametric`] - Parametric studies and optimization workflows
//! - [`physics`] - Core physics models (heat transfer, plasma torches, radiation)
//! - [`solver`] - Numerical solvers for the simulation equations
//! - [`state`] - Simulation state management and threading
//! - [`validation`] - Tools for validating simulation results
//! - [`visualization`] - Data preparation for 3D visualization
//! 
//! # Core Types
//! 
//! The main entry point for simulations is the `SimulationEngine` struct.

use crate::errors::{Result, SimulationError};
use ndarray::Array2;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Instant;

// Core simulation modules
pub mod materials;
pub mod mesh;
pub mod metrics;
pub mod parametric;
pub mod physics;
pub mod solver;
pub mod state;
pub mod validation;
pub mod visualization;

// Integration tests
#[cfg(test)]
mod solver_integration_test;

#[cfg(test)]
mod absolute_distance_test;

#[cfg(test)]
mod material_diffusion_test;

// Re-export key types for convenience
pub use mesh::{CylindricalMesh, MeshPreset};
pub use physics::{PlasmaTorch, PlasmaPhysics, BoundaryConditions};
pub use solver::{HeatSolver, SolverMethod};
pub use materials::{Material, MaterialLibrary};
pub use state::{SimulationState, SimulationStatus, SimulationStateManager};

/// Geometry configuration for the furnace
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GeometryConfig {
    pub radius: f64,        // meters
    pub height: f64,        // meters
}

impl Default for GeometryConfig {
    fn default() -> Self {
        Self {
            radius: 1.0,
            height: 2.0,
        }
    }
}

/// Mesh configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MeshConfig {
    pub preset: MeshPreset,
    pub custom_resolution: Option<(usize, usize)>,
}

impl Default for MeshConfig {
    fn default() -> Self {
        Self {
            preset: MeshPreset::Fast,
            custom_resolution: None,
        }
    }
}

/// Physics configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PhysicsConfig {
    pub initial_temperature: f64,  // K
    pub ambient_temperature: f64,  // K
    pub simulation_time: f64,      // seconds
}

impl Default for PhysicsConfig {
    fn default() -> Self {
        Self {
            initial_temperature: 298.15,  // 25°C
            ambient_temperature: 298.15,  // 25°C
            simulation_time: 60.0,        // 1 minute
        }
    }
}

/// Solver configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SolverConfig {
    pub method: SolverMethod,
    pub cfl_factor: f64,
    pub max_time_step: f64,
}

impl Default for SolverConfig {
    fn default() -> Self {
        Self {
            method: SolverMethod::ForwardEuler,
            cfl_factor: 0.5,
            max_time_step: 0.1,
        }
    }
}

/// Torch configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TorchConfig {
    pub position: (f64, f64),  // (r, z) in meters
    pub power: f64,            // kW
    pub efficiency: f64,       // 0.0 to 1.0
    pub sigma: f64,            // Gaussian spread parameter
}

impl Default for TorchConfig {
    fn default() -> Self {
        Self {
            position: (0.5, 1.0),
            power: 100.0,
            efficiency: 0.8,
            sigma: 0.1,
        }
    }
}

/// Material configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MaterialConfig {
    pub material_name: String,
}

impl Default for MaterialConfig {
    fn default() -> Self {
        Self {
            material_name: "Carbon Steel".to_string(),
        }
    }
}

/// Complete simulation configuration structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimulationConfig {
    /// Simulation metadata
    pub metadata: SimulationMetadata,
    /// Furnace geometry
    pub geometry: GeometryConfig,
    /// Mesh configuration
    pub mesh: MeshConfig,
    /// Physics parameters
    pub physics: PhysicsConfig,
    /// Solver settings
    pub solver: SolverConfig,
    /// Torch configurations
    pub torches: Vec<TorchConfig>,
    /// Material configuration
    pub material: MaterialConfig,
}

/// Simulation metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimulationMetadata {
    pub name: String,
    pub description: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub version: String,
}

impl Default for SimulationConfig {
    fn default() -> Self {
        Self {
            metadata: SimulationMetadata {
                name: "New Simulation".to_string(),
                description: "Plasma furnace simulation".to_string(),
                created_at: chrono::Utc::now(),
                version: crate::version().to_string(),
            },
            geometry: GeometryConfig::default(),
            mesh: MeshConfig::default(),
            physics: PhysicsConfig::default(),
            solver: SolverConfig::default(),
            torches: vec![TorchConfig::default()],
            material: MaterialConfig::default(),
        }
    }
}

/// Energy conservation monitoring data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EnergyMonitor {
    pub initial_energy: f64,
    pub current_energy: f64,
    pub energy_input: f64,
    pub energy_loss: f64,
    pub conservation_error: f64,
}

impl EnergyMonitor {
    pub fn new() -> Self {
        Self {
            initial_energy: 0.0,
            current_energy: 0.0,
            energy_input: 0.0,
            energy_loss: 0.0,
            conservation_error: 0.0,
        }
    }
    
    pub fn update(&mut self, current_energy: f64, energy_input: f64, energy_loss: f64) {
        self.current_energy = current_energy;
        self.energy_input += energy_input;
        self.energy_loss += energy_loss;
        
        // Calculate conservation error: (E_current - E_initial - E_input + E_loss) / E_initial
        let expected_energy = self.initial_energy + self.energy_input - self.energy_loss;
        if self.initial_energy > 0.0 {
            self.conservation_error = (self.current_energy - expected_energy).abs() / self.initial_energy;
        }
    }
    
    pub fn set_initial_energy(&mut self, energy: f64) {
        self.initial_energy = energy;
        self.current_energy = energy;
    }
}

/// Time step data for animation playback
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimeStepData {
    /// Simulation time in seconds
    pub time: f64,
    /// Temperature grid at this time step [row][col]
    pub temperature_grid: Vec<Vec<f64>>,
    /// Time step index
    pub step_index: usize,
}

/// Animation metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AnimationMetadata {
    /// Total number of time steps
    pub total_time_steps: usize,
    /// Total simulation duration in seconds
    pub simulation_duration: f64,
    /// Time interval between steps
    pub time_interval: f64,
    /// Temperature range (min, max)
    pub temperature_range: (f64, f64),
    /// Mesh dimensions (nr, nz)
    pub mesh_dimensions: (usize, usize),
    /// Furnace dimensions (radius, height)
    pub furnace_dimensions: (f64, f64),
}

/// Complete animation data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AnimationData {
    /// All time step data
    pub time_steps: Vec<TimeStepData>,
    /// Animation metadata
    pub metadata: AnimationMetadata,
}

/// Simulation results structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimulationResults {
    /// Configuration used for this simulation
    pub config: SimulationConfig,
    /// Completion timestamp
    pub completed_at: chrono::DateTime<chrono::Utc>,
    /// Simulation duration in seconds
    pub duration: f64,
    /// Final temperature field
    pub final_temperature_field: Vec<Vec<f64>>,
    /// Time steps completed
    pub time_steps_completed: usize,
    /// Final simulation time
    pub final_time: f64,
    /// Energy conservation data
    pub energy_monitor: EnergyMonitor,
    /// Maximum temperature reached
    pub max_temperature: f64,
    /// Minimum temperature reached
    pub min_temperature: f64,
    /// Average temperature
    pub avg_temperature: f64,
    /// Time-series data for animation (optional, can be large)
    pub time_series_data: Option<Vec<TimeStepData>>,
}

/// Main simulation engine that orchestrates mesh, physics, and solver
pub struct SimulationEngine {
    config: SimulationConfig,
    mesh: Option<CylindricalMesh>,
    physics: Option<PlasmaPhysics>,
    solver: Option<HeatSolver>,
    temperature_field: Option<Array2<f64>>,
    state_manager: Option<SimulationStateManager>,
    cancellation_token: Arc<AtomicBool>,
    energy_monitor: EnergyMonitor,
    /// Time-series data storage for animation
    time_series_data: Vec<TimeStepData>,
    /// Interval for storing time steps (in seconds)
    storage_interval: f64,
    /// Last stored time
    last_stored_time: f64,
}

impl SimulationEngine {
    /// Create a new simulation engine with the given configuration
    pub fn new(config: SimulationConfig) -> Result<Self> {
        // Validate configuration
        Self::validate_config(&config)?;
        
        // Calculate storage interval (store ~100 frames for animation)
        let storage_interval = config.physics.simulation_time / 100.0;
        
        Ok(Self {
            config,
            mesh: None,
            physics: None,
            solver: None,
            temperature_field: None,
            state_manager: None,
            cancellation_token: Arc::new(AtomicBool::new(false)),
            energy_monitor: EnergyMonitor::new(),
            time_series_data: Vec::new(),
            storage_interval: storage_interval.max(0.01), // At least 10ms between frames
            last_stored_time: -1.0, // Force storage of first frame
        })
    }
    
    /// Validate simulation configuration
    fn validate_config(config: &SimulationConfig) -> Result<()> {
        // Validate geometry
        crate::errors::validation::validate_positive(config.geometry.radius, "furnace radius")?;
        crate::errors::validation::validate_positive(config.geometry.height, "furnace height")?;
        
        // Validate physics parameters
        crate::errors::validation::validate_positive(config.physics.initial_temperature, "initial temperature")?;
        crate::errors::validation::validate_positive(config.physics.ambient_temperature, "ambient temperature")?;
        crate::errors::validation::validate_positive(config.physics.simulation_time, "simulation time")?;
        
        // Validate solver parameters
        crate::errors::validation::validate_range(config.solver.cfl_factor, 0.0, 1.0, "CFL factor")?;
        crate::errors::validation::validate_positive(config.solver.max_time_step, "maximum time step")?;
        
        // Validate torches
        if config.torches.is_empty() {
            return Err(SimulationError::InvalidParameter {
                parameter: "torches".to_string(),
                value: "0".to_string(),
                range: "≥ 1 torch required".to_string(),
            });
        }
        
        for (i, torch) in config.torches.iter().enumerate() {
            if torch.position.0 < 0.0 || torch.position.0 > config.geometry.radius {
                return Err(SimulationError::InvalidParameter {
                    parameter: format!("torch[{}] radial position", i),
                    value: torch.position.0.to_string(),
                    range: format!("[0.0, {}]", config.geometry.radius),
                });
            }
            
            if torch.position.1 < 0.0 || torch.position.1 > config.geometry.height {
                return Err(SimulationError::InvalidParameter {
                    parameter: format!("torch[{}] axial position", i),
                    value: torch.position.1.to_string(),
                    range: format!("[0.0, {}]", config.geometry.height),
                });
            }
            
            crate::errors::validation::validate_range(torch.power, 1.0, 1000.0, &format!("torch[{}] power", i))?;
            crate::errors::validation::validate_range(torch.efficiency, 0.1, 1.0, &format!("torch[{}] efficiency", i))?;
            crate::errors::validation::validate_range(torch.sigma, 0.01, 1.0, &format!("torch[{}] sigma", i))?;
        }
        
        // Validate material
        if !MaterialLibrary::is_valid_material(&config.material.material_name) {
            return Err(SimulationError::MaterialError {
                material: config.material.material_name.clone(),
                property: "material".to_string(),
                details: "Unknown material name".to_string(),
            });
        }
        
        Ok(())
    }
    
    /// Initialize simulation components
    pub fn initialize(&mut self) -> Result<()> {
        log::info!("Initializing simulation: {}", self.config.metadata.name);
        
        // Create mesh
        let (nr, nz) = match self.config.mesh.custom_resolution {
            Some(resolution) => resolution,
            None => self.config.mesh.preset.resolution(),
        };
        
        self.mesh = Some(CylindricalMesh::new(
            self.config.geometry.radius,
            self.config.geometry.height,
            nr,
            nz,
        )?);
        
        // Create physics model
        let material = MaterialLibrary::get_material(&self.config.material.material_name)?;
        let mut torches = Vec::new();
        
        for torch_config in &self.config.torches {
            let torch = PlasmaTorch::new(
                torch_config.position,
                torch_config.power,
                torch_config.efficiency,
                torch_config.sigma,
            )?;
            torches.push(torch);
        }
        
        let boundary_conditions = BoundaryConditions {
            axis_symmetry: true,
            outer_wall_temperature: None,
            convection_coefficient: 10.0,
            ambient_temperature: self.config.physics.ambient_temperature,
            emissivity: material.emissivity,
        };
        
        self.physics = Some(PlasmaPhysics::new(torches, material, boundary_conditions)?);
        
        // Create solver
        self.solver = Some(HeatSolver::with_cfl_factor(
            self.config.solver.method.clone(),
            self.config.solver.cfl_factor,
        )?);
        
        // Initialize temperature field
        if let Some(ref mesh) = self.mesh {
            self.temperature_field = Some(mesh.create_temperature_array(self.config.physics.initial_temperature));
        }
        
        // Initialize state manager
        self.state_manager = Some(SimulationStateManager::new(self.config.clone()));
        
        // Initialize energy monitor
        if let (Some(ref mesh), Some(ref physics), Some(ref temp_field)) = 
            (&self.mesh, &self.physics, &self.temperature_field) {
            let initial_energy = self.calculate_total_energy(mesh, physics, temp_field);
            self.energy_monitor.set_initial_energy(initial_energy);
        }
        
        log::info!("Simulation initialized successfully");
        Ok(())
    }
    
    /// Run the complete simulation
    pub fn run(&mut self) -> Result<SimulationResults> {
        let start_time = Instant::now();
        
        // Initialize if not already done
        if self.mesh.is_none() {
            self.initialize()?;
        }
        
        // Set status to running
        if let Some(ref state_manager) = self.state_manager {
            state_manager.set_status(SimulationStatus::Running)?;
        }
        
        log::info!("Starting simulation: {}", self.config.metadata.name);
        
        // Reset cancellation token
        self.cancellation_token.store(false, Ordering::Relaxed);
        
        // Run simulation loop
        let result = self.run_simulation_loop();
        
        let duration = start_time.elapsed().as_secs_f64();
        
        match result {
            Ok((time_steps, final_time)) => {
                // Set status to completed
                if let Some(ref state_manager) = self.state_manager {
                    state_manager.set_status(SimulationStatus::Completed)?;
                }
                
                // Create results
                let results = self.create_results(duration, time_steps, final_time)?;
                
                log::info!("Simulation completed successfully in {:.2}s", duration);
                Ok(results)
            }
            Err(e) => {
                // Set status to failed
                if let Some(ref state_manager) = self.state_manager {
                    state_manager.set_status(SimulationStatus::Failed(e.to_string()))?;
                }
                
                log::error!("Simulation failed: {}", e);
                Err(e)
            }
        }
    }
    
    /// Main simulation loop with progress tracking and cancellation support
    fn run_simulation_loop(&mut self) -> Result<(usize, f64)> {
        let mut current_time = 0.0;
        let mut time_step = 0;
        let total_time = self.config.physics.simulation_time;
        
        log::info!("Starting simulation loop: {} seconds", total_time);
        
        while current_time < total_time {
            // Check for cancellation
            if self.cancellation_token.load(Ordering::Relaxed) {
                log::info!("Simulation cancelled at time {:.3}s", current_time);
                return Err(SimulationError::ConfigurationError {
                    component: "SimulationEngine".to_string(),
                    issue: "Simulation cancelled by user".to_string(),
                });
            }
            
            // Calculate stable time step
            let stable_dt = {
                let mesh = self.mesh.as_ref().unwrap();
                let physics = self.physics.as_ref().unwrap();
                let solver = self.solver.as_ref().unwrap();
                solver.calculate_stable_timestep(mesh, physics)
            };
            
            let dt = stable_dt.min(self.config.solver.max_time_step).min(total_time - current_time);
            
            // Check stability
            {
                let mesh = self.mesh.as_ref().unwrap();
                let physics = self.physics.as_ref().unwrap();
                let solver = self.solver.as_ref().unwrap();
                solver.check_stability(dt, mesh, physics)?;
            }
            
            // Solve one time step
            {
                let mesh = self.mesh.as_ref().unwrap();
                let physics = self.physics.as_ref().unwrap();
                let solver = self.solver.as_mut().unwrap();
                let temperature_field = self.temperature_field.as_mut().unwrap();
                
                solver.solve_time_step(temperature_field, mesh, physics, dt)
                    .map_err(|e| match e {
                        SimulationError::NumericalInstability { .. } => {
                            SimulationError::NumericalInstability {
                                step: time_step,
                                time: current_time,
                            }
                        }
                        other => other,
                    })?;
            }
            
            // Update time and step counter
            current_time += dt;
            time_step += 1;
            
            // Store time step data for animation if interval has passed
            if current_time - self.last_stored_time >= self.storage_interval {
                self.store_time_step_data(current_time, time_step);
                self.last_stored_time = current_time;
            }
            
            // Calculate energy and monitor conservation
            {
                let mesh = self.mesh.as_ref().unwrap();
                let physics = self.physics.as_ref().unwrap();
                let temperature_field = self.temperature_field.as_ref().unwrap();
                
                let energy_after = self.calculate_total_energy(mesh, physics, temperature_field);
                let energy_input = self.calculate_energy_input(mesh, physics, dt);
                let energy_loss = self.calculate_energy_loss(mesh, physics, temperature_field, dt);
                
                self.energy_monitor.update(energy_after, energy_input, energy_loss);
            }
            
            // Check energy conservation (warn if error > 10%)
            if self.energy_monitor.conservation_error > 0.1 {
                log::warn!(
                    "Energy conservation error: {:.1}% at time {:.3}s",
                    self.energy_monitor.conservation_error * 100.0,
                    current_time
                );
            }
            
            // Update progress
            let progress = current_time / total_time;
            if let Some(ref state_manager) = self.state_manager {
                state_manager.update_progress(progress)?;
            }
            
            // Log progress periodically
            if time_step % 100 == 0 || current_time >= total_time {
                log::info!(
                    "Progress: {:.1}% (t={:.3}s, step={}, dt={:.6}s, energy_error={:.2}%)",
                    progress * 100.0,
                    current_time,
                    time_step,
                    dt,
                    self.energy_monitor.conservation_error * 100.0
                );
            }
        }
        
        log::info!("Simulation loop completed: {} steps, {:.3}s", time_step, current_time);
        Ok((time_step, current_time))
    }
    
    /// Calculate total thermal energy in the system
    fn calculate_total_energy(&self, mesh: &CylindricalMesh, physics: &PlasmaPhysics, temperature_field: &Array2<f64>) -> f64 {
        let mut total_energy = 0.0;
        
        for i in 0..mesh.nr {
            for j in 0..mesh.nz {
                let temperature = temperature_field[[i, j]];
                let volume = mesh.get_cell_volume(i, j);
                let density = physics.get_density();
                let specific_heat = physics.get_specific_heat(temperature);
                
                // Energy = ρ * V * cp * (T - T_ref)
                let reference_temp = self.config.physics.ambient_temperature;
                let energy = density * volume * specific_heat * (temperature - reference_temp);
                total_energy += energy;
            }
        }
        
        total_energy
    }
    
    /// Calculate energy input from heat sources during time step
    fn calculate_energy_input(&self, mesh: &CylindricalMesh, physics: &PlasmaPhysics, dt: f64) -> f64 {
        let mut total_input = 0.0;
        
        for i in 0..mesh.nr {
            for j in 0..mesh.nz {
                let (r, z) = mesh.get_coordinates(i, j).unwrap();
                let heat_source = physics.calculate_heat_source(r, z);
                let volume = mesh.get_cell_volume(i, j);
                
                // Energy input = Q * V * dt
                total_input += heat_source * volume * dt;
            }
        }
        
        total_input
    }
    
    /// Calculate energy loss through boundaries during time step
    fn calculate_energy_loss(&self, mesh: &CylindricalMesh, physics: &PlasmaPhysics, temperature_field: &Array2<f64>, dt: f64) -> f64 {
        let mut total_loss = 0.0;
        
        // Calculate losses at outer boundary
        for j in 0..mesh.nz {
            let i = mesh.nr - 1; // Outer boundary
            let temperature = temperature_field[[i, j]];
            let area = mesh.get_cell_area_radial(i, j);
            
            let q_conv = physics.calculate_convection_loss(temperature);
            let q_rad = physics.calculate_radiation_loss(temperature, physics.material.emissivity);
            let total_flux = q_conv + q_rad;
            
            // Energy loss = q * A * dt
            total_loss += total_flux * area * dt;
        }
        
        total_loss
    }
    
    /// Store current temperature field as a time step for animation
    fn store_time_step_data(&mut self, current_time: f64, step_index: usize) {
        if let Some(ref temperature_field) = self.temperature_field {
            // Convert temperature field to Vec<Vec<f64>>
            let mut temp_grid = Vec::new();
            for i in 0..temperature_field.nrows() {
                let mut row = Vec::new();
                for j in 0..temperature_field.ncols() {
                    row.push(temperature_field[[i, j]]);
                }
                temp_grid.push(row);
            }
            
            self.time_series_data.push(TimeStepData {
                time: current_time,
                temperature_grid: temp_grid,
                step_index,
            });
        }
    }
    
    /// Create simulation results
    fn create_results(&self, duration: f64, time_steps: usize, final_time: f64) -> Result<SimulationResults> {
        let temperature_field = self.temperature_field.as_ref().unwrap();
        
        // Convert temperature field to Vec<Vec<f64>> for serialization
        let mut final_temp_field = Vec::new();
        for i in 0..temperature_field.nrows() {
            let mut row = Vec::new();
            for j in 0..temperature_field.ncols() {
                row.push(temperature_field[[i, j]]);
            }
            final_temp_field.push(row);
        }
        
        // Calculate temperature statistics
        let temps: Vec<f64> = temperature_field.iter().cloned().collect();
        let max_temperature = temps.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
        let min_temperature = temps.iter().fold(f64::INFINITY, |a, &b| a.min(b));
        let avg_temperature = temps.iter().sum::<f64>() / temps.len() as f64;
        
        Ok(SimulationResults {
            config: self.config.clone(),
            completed_at: chrono::Utc::now(),
            duration,
            final_temperature_field: final_temp_field,
            time_steps_completed: time_steps,
            final_time,
            energy_monitor: self.energy_monitor.clone(),
            max_temperature,
            min_temperature,
            avg_temperature,
            time_series_data: Some(self.time_series_data.clone()),
        })
    }
    
    /// Get the current configuration
    pub fn config(&self) -> &SimulationConfig {
        &self.config
    }
    
    /// Update the configuration
    pub fn set_config(&mut self, config: SimulationConfig) -> Result<()> {
        Self::validate_config(&config)?;
        
        // Calculate new storage interval
        let storage_interval = config.physics.simulation_time / 100.0;
        
        self.config = config;
        
        // Reset components to force re-initialization
        self.mesh = None;
        self.physics = None;
        self.solver = None;
        self.temperature_field = None;
        self.state_manager = None;
        self.energy_monitor = EnergyMonitor::new();
        self.time_series_data = Vec::new();
        self.storage_interval = storage_interval.max(0.01);
        self.last_stored_time = -1.0;
        
        Ok(())
    }
    
    /// Get current simulation progress (0.0 to 1.0)
    pub fn get_progress(&self) -> f64 {
        if let Some(ref state_manager) = self.state_manager {
            state_manager.get_state().map(|s| s.progress).unwrap_or(0.0)
        } else {
            0.0
        }
    }
    
    /// Get current simulation status
    pub fn get_status(&self) -> SimulationStatus {
        if let Some(ref state_manager) = self.state_manager {
            state_manager.get_state().map(|s| s.status).unwrap_or(SimulationStatus::NotStarted)
        } else {
            SimulationStatus::NotStarted
        }
    }
    
    /// Cancel the running simulation
    pub fn cancel(&self) {
        self.cancellation_token.store(true, Ordering::Relaxed);
        log::info!("Simulation cancellation requested");
    }
    
    /// Get current temperature field (if available)
    pub fn get_temperature_field(&self) -> Option<&Array2<f64>> {
        self.temperature_field.as_ref()
    }
    
    /// Get energy conservation monitor
    pub fn get_energy_monitor(&self) -> &EnergyMonitor {
        &self.energy_monitor
    }
    
    /// Check if simulation is initialized
    pub fn is_initialized(&self) -> bool {
        self.mesh.is_some() && self.physics.is_some() && self.solver.is_some()
    }
    
    /// Get animation data (all time steps with metadata)
    pub fn get_animation_data(&self) -> Option<AnimationData> {
        if self.time_series_data.is_empty() {
            return None;
        }
        
        let mesh = self.mesh.as_ref()?;
        
        // Calculate temperature range across all time steps
        let mut min_temp = f64::INFINITY;
        let mut max_temp = f64::NEG_INFINITY;
        
        for time_step in &self.time_series_data {
            for row in &time_step.temperature_grid {
                for &temp in row {
                    min_temp = min_temp.min(temp);
                    max_temp = max_temp.max(temp);
                }
            }
        }
        
        // Calculate time interval
        let time_interval = if self.time_series_data.len() > 1 {
            (self.time_series_data.last().unwrap().time - self.time_series_data.first().unwrap().time) 
                / (self.time_series_data.len() - 1) as f64
        } else {
            0.0
        };
        
        Some(AnimationData {
            time_steps: self.time_series_data.clone(),
            metadata: AnimationMetadata {
                total_time_steps: self.time_series_data.len(),
                simulation_duration: self.time_series_data.last().map(|ts| ts.time).unwrap_or(0.0),
                time_interval,
                temperature_range: (min_temp, max_temp),
                mesh_dimensions: (mesh.nr, mesh.nz),
                furnace_dimensions: (self.config.geometry.radius, self.config.geometry.height),
            },
        })
    }
    
    /// Get specific time step data
    pub fn get_time_step_data(&self, time_step: usize) -> Option<&TimeStepData> {
        self.time_series_data.get(time_step)
    }
    
    /// Get animation metadata without full data
    pub fn get_animation_metadata(&self) -> Option<AnimationMetadata> {
        if self.time_series_data.is_empty() {
            return None;
        }
        
        let mesh = self.mesh.as_ref()?;
        
        // Calculate temperature range
        let mut min_temp = f64::INFINITY;
        let mut max_temp = f64::NEG_INFINITY;
        
        for time_step in &self.time_series_data {
            for row in &time_step.temperature_grid {
                for &temp in row {
                    min_temp = min_temp.min(temp);
                    max_temp = max_temp.max(temp);
                }
            }
        }
        
        // Calculate time interval
        let time_interval = if self.time_series_data.len() > 1 {
            (self.time_series_data.last().unwrap().time - self.time_series_data.first().unwrap().time) 
                / (self.time_series_data.len() - 1) as f64
        } else {
            0.0
        };
        
        Some(AnimationMetadata {
            total_time_steps: self.time_series_data.len(),
            simulation_duration: self.time_series_data.last().map(|ts| ts.time).unwrap_or(0.0),
            time_interval,
            temperature_range: (min_temp, max_temp),
            mesh_dimensions: (mesh.nr, mesh.nz),
            furnace_dimensions: (self.config.geometry.radius, self.config.geometry.height),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simulation_config_default() {
        let config = SimulationConfig::default();
        assert_eq!(config.metadata.name, "New Simulation");
        assert!(!config.metadata.version.is_empty());
        assert_eq!(config.geometry.radius, 1.0);
        assert_eq!(config.geometry.height, 2.0);
        assert_eq!(config.torches.len(), 1);
        assert_eq!(config.material.material_name, "Carbon Steel");
    }
    
    #[test]
    fn test_simulation_engine_creation() {
        let config = SimulationConfig::default();
        let engine = SimulationEngine::new(config);
        assert!(engine.is_ok());
        
        let engine = engine.unwrap();
        assert!(!engine.is_initialized());
        assert_eq!(engine.get_progress(), 0.0);
        assert!(matches!(engine.get_status(), SimulationStatus::NotStarted));
    }
    
    #[test]
    fn test_simulation_engine_initialization() {
        let config = SimulationConfig::default();
        let mut engine = SimulationEngine::new(config).unwrap();
        
        let result = engine.initialize();
        assert!(result.is_ok());
        assert!(engine.is_initialized());
    }
    
    #[test]
    fn test_simulation_engine_run() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.1; // Short simulation for testing
        
        let mut engine = SimulationEngine::new(config).unwrap();
        let result = engine.run();
        assert!(result.is_ok());
        
        let results = result.unwrap();
        assert!(results.duration > 0.0);
        assert!(results.time_steps_completed > 0);
        assert!(results.final_time > 0.0);
        assert!(results.max_temperature >= results.min_temperature);
    }
    
    #[test]
    fn test_config_validation() {
        let mut config = SimulationConfig::default();
        
        // Valid config should pass
        assert!(SimulationEngine::validate_config(&config).is_ok());
        
        // Invalid geometry
        config.geometry.radius = -1.0;
        assert!(SimulationEngine::validate_config(&config).is_err());
        config.geometry.radius = 1.0;
        
        // Invalid torch position
        config.torches[0].position = (2.0, 1.0); // Outside furnace radius
        assert!(SimulationEngine::validate_config(&config).is_err());
        config.torches[0].position = (0.5, 1.0);
        
        // Invalid material
        config.material.material_name = "Unknown Material".to_string();
        assert!(SimulationEngine::validate_config(&config).is_err());
    }
    
    #[test]
    fn test_energy_monitor() {
        let mut monitor = EnergyMonitor::new();
        monitor.set_initial_energy(1000.0);
        
        assert_eq!(monitor.initial_energy, 1000.0);
        assert_eq!(monitor.current_energy, 1000.0);
        
        // Update with perfect conservation
        monitor.update(1100.0, 100.0, 0.0);
        assert!(monitor.conservation_error < 1e-10);
        
        // Update with energy loss - reset monitor first
        let mut monitor2 = EnergyMonitor::new();
        monitor2.set_initial_energy(1000.0);
        monitor2.update(950.0, 0.0, 50.0);
        assert!(monitor2.conservation_error < 0.01); // Should be small error
    }
    
    #[test]
    fn test_simulation_cancellation() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.1; // Short simulation for testing
        
        let engine = SimulationEngine::new(config).unwrap();
        
        // Test cancellation token functionality
        engine.cancel();
        assert!(engine.cancellation_token.load(Ordering::Relaxed));
    }
    
    #[test]
    fn test_geometry_config() {
        let geometry = GeometryConfig::default();
        assert_eq!(geometry.radius, 1.0);
        assert_eq!(geometry.height, 2.0);
    }
    
    #[test]
    fn test_time_series_data_storage() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.5; // Short simulation
        
        let mut engine = SimulationEngine::new(config).unwrap();
        let results = engine.run().unwrap();
        
        // Verify time series data was stored
        assert!(results.time_series_data.is_some());
        let time_series = results.time_series_data.unwrap();
        assert!(!time_series.is_empty());
        
        // Verify time step data structure
        let first_step = &time_series[0];
        assert!(!first_step.temperature_grid.is_empty());
    }
    
    #[test]
    fn test_animation_data_retrieval() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.5;
        
        let mut engine = SimulationEngine::new(config).unwrap();
        engine.run().unwrap();
        
        // Test get_animation_data
        let animation_data = engine.get_animation_data();
        assert!(animation_data.is_some());
        
        let data = animation_data.unwrap();
        assert!(!data.time_steps.is_empty());
        assert!(data.metadata.total_time_steps > 0);
        assert!(data.metadata.simulation_duration > 0.0);
    }
    
    #[test]
    fn test_animation_metadata_retrieval() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.5;
        
        let mut engine = SimulationEngine::new(config).unwrap();
        engine.run().unwrap();
        
        // Test get_animation_metadata
        let metadata = engine.get_animation_metadata();
        assert!(metadata.is_some());
        
        let meta = metadata.unwrap();
        assert!(meta.total_time_steps > 0);
        assert_eq!(meta.mesh_dimensions, (50, 50)); // Fast preset
        assert_eq!(meta.furnace_dimensions, (1.0, 2.0)); // Default geometry
    }
    
    #[test]
    fn test_time_step_data_retrieval() {
        let mut config = SimulationConfig::default();
        config.physics.simulation_time = 0.5;
        
        let mut engine = SimulationEngine::new(config).unwrap();
        engine.run().unwrap();
        
        // Test get_time_step_data
        let step_0 = engine.get_time_step_data(0);
        assert!(step_0.is_some());
        
        let step_data = step_0.unwrap();
        assert!(!step_data.temperature_grid.is_empty());
        
        // Test out of bounds
        let invalid_step = engine.get_time_step_data(9999);
        assert!(invalid_step.is_none());
    }
    
    #[test]
    fn test_mesh_config() {
        let mesh_config = MeshConfig::default();
        assert!(matches!(mesh_config.preset, MeshPreset::Fast));
        assert!(mesh_config.custom_resolution.is_none());
    }
    
    #[test]
    fn test_physics_config() {
        let physics = PhysicsConfig::default();
        assert_eq!(physics.initial_temperature, 298.15);
        assert_eq!(physics.ambient_temperature, 298.15);
        assert_eq!(physics.simulation_time, 60.0);
    }
    
    #[test]
    fn test_torch_config() {
        let torch = TorchConfig::default();
        assert_eq!(torch.position, (0.5, 1.0));
        assert_eq!(torch.power, 100.0);
        assert_eq!(torch.efficiency, 0.8);
        assert_eq!(torch.sigma, 0.1);
    }
}
