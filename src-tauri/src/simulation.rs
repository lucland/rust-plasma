//! Simulation control commands for Tauri application
//! 
//! This module provides Tauri commands for controlling simulations,
//! integrating the core simulation library with the desktop UI.
//! 
//! # Commands
//! 
//! - `run_simulation` - Start a new simulation with given parameters
//! - `get_simulation_status` - Check the status of a running simulation
//! - `get_simulation_results` - Retrieve results from a completed simulation
//! - `cancel_simulation` - Cancel a running simulation
//! - `get_simulation_progress` - Get detailed progress information

use log::{info, error, warn};
use serde::{Serialize, Deserialize};
use serde_json;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};

use crate::parameters::SimulationParameters;
use plasma_simulation::simulation::{SimulationEngine, SimulationConfig};

/// Simulation execution status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SimulationStatus {
    NotStarted,
    Initializing,
    Running,
    Completed,
    Failed(String),
    Cancelled,
}

/// Detailed simulation progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationProgress {
    pub status: SimulationStatus,
    pub progress_percent: f64,
    pub current_time: f64,
    pub total_time: f64,
    pub time_steps_completed: usize,
    pub estimated_remaining_seconds: Option<f64>,
    pub start_time: DateTime<Utc>,
    pub last_update: DateTime<Utc>,
}

/// Simulation execution context
pub struct SimulationContext {
    pub id: String,
    pub engine: Arc<Mutex<SimulationEngine>>,
    pub progress: Arc<RwLock<SimulationProgress>>,
    pub app_handle: AppHandle,
    pub cancellation_requested: Arc<std::sync::atomic::AtomicBool>,
}

/// Global simulation manager
pub struct SimulationManager {
    pub active_simulations: Arc<Mutex<HashMap<String, SimulationContext>>>,
}

impl SimulationManager {
    pub fn new() -> Self {
        Self {
            active_simulations: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

/// Global simulation manager instance
static SIMULATION_MANAGER: tokio::sync::OnceCell<SimulationManager> = tokio::sync::OnceCell::const_new();

/// Initialize the simulation manager
pub async fn init_simulation_manager() -> &'static SimulationManager {
    SIMULATION_MANAGER.get_or_init(|| async {
        SimulationManager::new()
    }).await
}

/// Start a new simulation with the given parameters
#[tauri::command]
pub async fn run_simulation(
    app_handle: AppHandle,
    parameters: SimulationParameters
) -> Result<serde_json::Value, String> {
    let simulation_id = format!("sim_{}", Utc::now().timestamp_millis());
    
    info!("Starting simulation with ID: {}", simulation_id);
    info!("Geometry: {}m height, {}m radius", 
          parameters.geometry.cylinder_height, 
          parameters.geometry.cylinder_radius);
    info!("Torches: {}", parameters.torches.torches.len());
    
    // Convert UI parameters to simulation configuration
    let config = match convert_parameters_to_config(parameters.clone()) {
        Ok(config) => config,
        Err(e) => {
            error!("Failed to convert parameters: {}", e);
            return Err(format!("Invalid parameters: {}", e));
        }
    };
    
    // Create simulation engine
    let engine = match SimulationEngine::new(config) {
        Ok(engine) => engine,
        Err(e) => {
            error!("Failed to create simulation engine: {}", e);
            return Err(format!("Failed to create simulation engine: {}", e));
        }
    };
    
    // Initialize progress tracking
    let progress = Arc::new(RwLock::new(SimulationProgress {
        status: SimulationStatus::Initializing,
        progress_percent: 0.0,
        current_time: 0.0,
        total_time: parameters.simulation.total_time,
        time_steps_completed: 0,
        estimated_remaining_seconds: None,
        start_time: Utc::now(),
        last_update: Utc::now(),
    }));
    
    // Create simulation context
    let context = SimulationContext {
        id: simulation_id.clone(),
        engine: Arc::new(Mutex::new(engine)),
        progress: progress.clone(),
        app_handle: app_handle.clone(),
        cancellation_requested: Arc::new(std::sync::atomic::AtomicBool::new(false)),
    };
    
    // Register simulation with manager
    let manager = init_simulation_manager().await;
    {
        let mut active_sims = manager.active_simulations.lock().await;
        active_sims.insert(simulation_id.clone(), context);
    }
    
    // Start simulation in background task
    let manager_clone = init_simulation_manager().await;
    let sim_id_clone = simulation_id.clone();
    
    tokio::spawn(async move {
        if let Err(e) = execute_simulation_async(sim_id_clone, manager_clone).await {
            error!("Simulation execution failed: {}", e);
        }
    });
    
    info!("Simulation {} started successfully", simulation_id);
    
    Ok(serde_json::json!({
        "success": true,
        "simulation_id": simulation_id,
        "message": "Simulation started successfully",
        "status": "initializing"
    }))
}

/// Convert UI parameters to simulation configuration
fn convert_parameters_to_config(parameters: SimulationParameters) -> Result<SimulationConfig, String> {
    use plasma_simulation::simulation::*;
    
    // Validate parameters first
    if parameters.geometry.cylinder_height <= 0.0 {
        return Err("Cylinder height must be positive".to_string());
    }
    if parameters.geometry.cylinder_radius <= 0.0 {
        return Err("Cylinder radius must be positive".to_string());
    }
    if parameters.torches.torches.is_empty() {
        return Err("At least one torch is required".to_string());
    }
    
    // Create simulation configuration
    let mut config = SimulationConfig::default();
    
    // Set metadata
    config.metadata.name = format!("Simulation_{}", Utc::now().format("%Y%m%d_%H%M%S"));
    config.metadata.description = format!(
        "Plasma furnace simulation - Height: {}m, Radius: {}m, Torches: {}",
        parameters.geometry.cylinder_height,
        parameters.geometry.cylinder_radius,
        parameters.torches.torches.len()
    );
    
    // Set geometry
    config.geometry.radius = parameters.geometry.cylinder_radius;
    config.geometry.height = parameters.geometry.cylinder_height;
    
    // Set mesh configuration
    config.mesh.preset = match parameters.mesh.preset.as_str() {
        "fast" => MeshPreset::Fast,
        "balanced" => MeshPreset::Balanced,
        "high" => MeshPreset::High,
        "custom" => {
            config.mesh.custom_resolution = Some((parameters.mesh.nr as usize, parameters.mesh.nz as usize));
            MeshPreset::Custom
        },
        _ => MeshPreset::Balanced,
    };
    
    // Set physics parameters
    config.physics.initial_temperature = parameters.boundary.initial_temperature;
    config.physics.ambient_temperature = parameters.boundary.ambient_temperature;
    config.physics.simulation_time = parameters.simulation.total_time;
    
    // Set solver configuration
    config.solver.method = match parameters.simulation.solver_method.as_str() {
        "forward-euler" => SolverMethod::ForwardEuler,
        "crank-nicolson" => SolverMethod::CrankNicolson { 
            sor_tolerance: 1e-6, 
            max_iterations: 1000 
        },
        _ => SolverMethod::ForwardEuler,
    };
    config.solver.cfl_factor = parameters.simulation.cfl_factor;
    config.solver.max_time_step = parameters.simulation.output_interval;
    
    // Convert torches
    config.torches = parameters.torches.torches.iter().map(|torch| {
        TorchConfig {
            position: (
                torch.position.r * parameters.geometry.cylinder_radius, // Convert normalized to absolute
                torch.position.z * parameters.geometry.cylinder_height  // Convert normalized to absolute
            ),
            power: torch.power,
            efficiency: torch.efficiency,
            sigma: torch.sigma,
        }
    }).collect();
    
    // Set material
    config.material.material_name = parameters.materials.material_type.clone();
    
    Ok(config)
}

/// Execute simulation asynchronously with progress tracking
async fn execute_simulation_async(
    simulation_id: String,
    manager: &'static SimulationManager,
) -> Result<(), String> {
    
    // Get simulation context components
    let (engine, progress, app_handle, _cancellation_requested) = {
        let active_sims = manager.active_simulations.lock().await;
        match active_sims.get(&simulation_id) {
            Some(ctx) => (
                ctx.engine.clone(),
                ctx.progress.clone(),
                ctx.app_handle.clone(),
                ctx.cancellation_requested.clone()
            ),
            None => return Err("Simulation context not found".to_string()),
        }
    };
    
    // Update status to running
    {
        let mut prog = progress.write().await;
        prog.status = SimulationStatus::Running;
        prog.last_update = Utc::now();
    }
    
    // Emit progress update
    emit_progress_update(&app_handle, &simulation_id, &progress).await;
    
    // Start progress simulation
    let total_time = {
        let prog = progress.read().await;
        prog.total_time
    };
    
    let progress_task = tokio::spawn(simulate_progress_updates(
        simulation_id.clone(),
        progress.clone(),
        app_handle.clone(),
        total_time,
    ));
    
    // Initialize simulation
    {
        let mut engine_guard = engine.lock().await;
        if let Err(e) = engine_guard.initialize() {
            error!("Failed to initialize simulation {}: {}", simulation_id, e);
            update_simulation_status(&progress, SimulationStatus::Failed(e.to_string())).await;
            emit_progress_update(&app_handle, &simulation_id, &progress).await;
            progress_task.abort();
            return Err(e.to_string());
        }
        info!("Simulation {} initialized, starting execution", simulation_id);
    }
    
    // Run simulation in blocking task
    let engine_clone = engine.clone();
    let result = tokio::task::spawn_blocking(move || {
        let mut engine_guard = engine_clone.blocking_lock();
        engine_guard.run().map_err(|e| e.to_string())
    }).await.map_err(|e| format!("Task failed: {}", e))?;
    
    // Stop progress simulation
    progress_task.abort();
    
    // Update final progress
    {
        let mut prog = progress.write().await;
        prog.progress_percent = 100.0;
        prog.current_time = total_time;
        prog.estimated_remaining_seconds = Some(0.0);
        prog.last_update = Utc::now();
    }
    
    // Handle result
    match result {
        Ok(results) => {
            info!("Simulation {} completed successfully", simulation_id);
            update_simulation_status(&progress, SimulationStatus::Completed).await;
            
            // Store results (in a real implementation, you'd save to disk or database)
            // For now, just emit completion event
            let _ = app_handle.emit("simulation-completed", serde_json::json!({
                "simulation_id": simulation_id,
                "results": results
            }));
        }
        Err(e) => {
            error!("Simulation {} failed: {}", simulation_id, e);
            update_simulation_status(&progress, SimulationStatus::Failed(e.clone())).await;
        }
    }
    
    // Final progress update
    emit_progress_update(&app_handle, &simulation_id, &progress).await;
    
    // Clean up simulation from active list after a delay
    let manager_clone = manager.active_simulations.clone();
    let sim_id_clone = simulation_id.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await; // Keep for 5 minutes
        let mut active_sims = manager_clone.lock().await;
        active_sims.remove(&sim_id_clone);
        info!("Cleaned up simulation context for {}", sim_id_clone);
    });
    
    Ok(())
}

/// Simulate progress updates for a running simulation
async fn simulate_progress_updates(
    simulation_id: String,
    progress: Arc<RwLock<SimulationProgress>>,
    app_handle: AppHandle,
    total_time: f64,
) {
    let start_time = std::time::Instant::now();
    let mut last_progress = 0.0;
    
    while last_progress < 95.0 {
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
        
        // Simulate progress
        let elapsed = start_time.elapsed().as_secs_f64();
        let estimated_total = total_time * 2.0; // Rough estimate
        let new_progress = (elapsed / estimated_total * 100.0).min(95.0);
        
        if new_progress > last_progress {
            {
                let mut prog = progress.write().await;
                prog.progress_percent = new_progress;
                prog.current_time = elapsed.min(total_time);
                prog.estimated_remaining_seconds = Some((estimated_total - elapsed).max(0.0));
                prog.last_update = Utc::now();
            }
            
            emit_progress_update(&app_handle, &simulation_id, &progress).await;
            last_progress = new_progress;
        }
    }
}

/// Update simulation status
async fn update_simulation_status(progress: &Arc<RwLock<SimulationProgress>>, status: SimulationStatus) {
    let mut prog = progress.write().await;
    prog.status = status;
    prog.last_update = Utc::now();
}

/// Emit progress update to frontend
async fn emit_progress_update(app_handle: &AppHandle, simulation_id: &str, progress: &Arc<RwLock<SimulationProgress>>) {
    let prog = progress.read().await;
    let _ = app_handle.emit("simulation-progress", serde_json::json!({
        "simulation_id": simulation_id,
        "progress": prog.clone()
    }));
}

/// Get the status of a running simulation
#[tauri::command]
pub async fn get_simulation_status(simulation_id: String) -> Result<serde_json::Value, String> {
    let manager = init_simulation_manager().await;
    let active_sims = manager.active_simulations.lock().await;
    
    match active_sims.get(&simulation_id) {
        Some(context) => {
            let progress = context.progress.read().await;
            Ok(serde_json::json!({
                "simulation_id": simulation_id,
                "status": progress.status,
                "progress": progress.clone()
            }))
        }
        None => {
            Ok(serde_json::json!({
                "simulation_id": simulation_id,
                "status": "not_found",
                "error": "Simulation not found"
            }))
        }
    }
}

/// Cancel a running simulation
#[tauri::command]
pub async fn cancel_simulation(simulation_id: String) -> Result<serde_json::Value, String> {
    info!("Cancelling simulation: {}", simulation_id);
    
    let manager = init_simulation_manager().await;
    let active_sims = manager.active_simulations.lock().await;
    
    match active_sims.get(&simulation_id) {
        Some(context) => {
            // Set cancellation flag
            context.cancellation_requested.store(true, std::sync::atomic::Ordering::Relaxed);
            
            // Update status
            update_simulation_status(&context.progress, SimulationStatus::Cancelled).await;
            
            // Emit progress update
            emit_progress_update(&context.app_handle, &simulation_id, &context.progress).await;
            
            info!("Simulation {} cancellation requested", simulation_id);
            
            Ok(serde_json::json!({
                "success": true,
                "simulation_id": simulation_id,
                "message": "Simulation cancellation requested"
            }))
        }
        None => {
            warn!("Attempted to cancel non-existent simulation: {}", simulation_id);
            Err("Simulation not found".to_string())
        }
    }
}

/// Get detailed progress information for a simulation
#[tauri::command]
pub async fn get_simulation_progress(simulation_id: String) -> Result<serde_json::Value, String> {
    let manager = init_simulation_manager().await;
    let active_sims = manager.active_simulations.lock().await;
    
    match active_sims.get(&simulation_id) {
        Some(context) => {
            let progress = context.progress.read().await;
            Ok(serde_json::json!({
                "simulation_id": simulation_id,
                "progress": progress.clone()
            }))
        }
        None => {
            Err("Simulation not found".to_string())
        }
    }
}

/// Get the results of a completed simulation
#[tauri::command]
pub async fn get_simulation_results(simulation_id: String) -> Result<serde_json::Value, String> {
    let manager = init_simulation_manager().await;
    let active_sims = manager.active_simulations.lock().await;
    
    match active_sims.get(&simulation_id) {
        Some(context) => {
            let progress = context.progress.read().await;
            
            match &progress.status {
                SimulationStatus::Completed => {
                    // In a real implementation, you'd retrieve stored results
                    // For now, return mock data based on the simulation parameters
                    Ok(serde_json::json!({
                        "simulation_id": simulation_id,
                        "status": "completed",
                        "results": {
                            "temperature": {
                                "max": 1200.0,
                                "min": 300.0,
                                "data": generate_mock_temperature_data()
                            },
                            "metadata": {
                                "total_time": progress.total_time,
                                "time_steps": progress.time_steps_completed,
                                "completion_time": progress.last_update
                            }
                        }
                    }))
                }
                _ => {
                    Err("Simulation not completed".to_string())
                }
            }
        }
        None => {
            Err("Simulation not found".to_string())
        }
    }
}

/// Generate mock temperature data for testing
fn generate_mock_temperature_data() -> Vec<Vec<f64>> {
    // Generate a simple 10x10 grid of temperature data
    let mut data = Vec::new();
    for i in 0..10 {
        let mut row = Vec::new();
        for j in 0..10 {
            // Create a simple temperature pattern with hot center
            let center_i = 5.0;
            let center_j = 5.0;
            let distance = ((i as f64 - center_i).powi(2) + (j as f64 - center_j).powi(2)).sqrt();
            let temp = 300.0 + (1000.0 * (-distance / 3.0).exp());
            row.push(temp);
        }
        data.push(row);
    }
    data
}

/// Start a simulation (alias for run_simulation for UI consistency)
#[tauri::command]
pub async fn start_simulation(
    app_handle: AppHandle,
    parameters: SimulationParameters
) -> Result<serde_json::Value, String> {
    info!("Starting simulation via start_simulation command");
    run_simulation(app_handle, parameters).await
}

/// Stop a running simulation (alias for cancel_simulation)
#[tauri::command]
pub async fn stop_simulation(simulation_id: String) -> Result<serde_json::Value, String> {
    info!("Stopping simulation with ID: {}", simulation_id);
    cancel_simulation(simulation_id).await
}

/// Get simulation progress (alias for get_simulation_progress for UI consistency)
#[tauri::command]
pub async fn get_progress(simulation_id: String) -> Result<serde_json::Value, String> {
    info!("Getting progress for simulation ID: {}", simulation_id);
    get_simulation_progress(simulation_id).await
}

/// Get visualization data for 3D rendering
#[tauri::command]
pub fn get_visualization_data(_id: String) -> Result<serde_json::Value, String> {
    info!("Getting visualization data");
    
    // For now, return mock visualization data with multiple time steps for playback
    // In a real implementation, this would get data from the completed simulation
    let mock_data = serde_json::json!({
        "mesh_points": [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.5, "y": 0.0, "z": 0.0},
            {"x": 1.0, "y": 0.0, "z": 0.0},
            {"x": 0.0, "y": 0.0, "z": 1.0},
            {"x": 0.5, "y": 0.0, "z": 1.0},
            {"x": 1.0, "y": 0.0, "z": 1.0},
            {"x": 0.0, "y": 0.0, "z": 2.0},
            {"x": 0.5, "y": 0.0, "z": 2.0},
            {"x": 1.0, "y": 0.0, "z": 2.0}
        ],
        "time_steps": [
            {
                "time": 0.0,
                "temperature_values": [300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0]
            },
            {
                "time": 15.0,
                "temperature_values": [320.0, 350.0, 330.0, 400.0, 500.0, 450.0, 350.0, 400.0, 370.0]
            },
            {
                "time": 30.0,
                "temperature_values": [340.0, 400.0, 360.0, 500.0, 700.0, 550.0, 400.0, 500.0, 420.0]
            },
            {
                "time": 45.0,
                "temperature_values": [360.0, 450.0, 380.0, 550.0, 850.0, 650.0, 450.0, 600.0, 480.0]
            },
            {
                "time": 60.0,
                "temperature_values": [380.0, 500.0, 400.0, 600.0, 1000.0, 750.0, 500.0, 700.0, 550.0]
            }
        ],
        "metadata": {
            "min_temperature": 300.0,
            "max_temperature": 1000.0,
            "simulation_time": 60.0,
            "mesh_resolution": [3, 3],
            "total_time_steps": 5,
            "time_interval": 15.0
        }
    });
    
    Ok(mock_data)
}

/// Get time step data for playback animation
#[tauri::command]
pub fn get_time_step_data(simulation_id: String, time_step: usize) -> Result<serde_json::Value, String> {
    info!("Getting time step data for simulation {} at step {}", simulation_id, time_step);
    
    // Mock time step data - in real implementation this would retrieve stored simulation data
    let time_steps = vec![
        (0.0, vec![300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0]),
        (15.0, vec![320.0, 350.0, 330.0, 400.0, 500.0, 450.0, 350.0, 400.0, 370.0]),
        (30.0, vec![340.0, 400.0, 360.0, 500.0, 700.0, 550.0, 400.0, 500.0, 420.0]),
        (45.0, vec![360.0, 450.0, 380.0, 550.0, 850.0, 650.0, 450.0, 600.0, 480.0]),
        (60.0, vec![380.0, 500.0, 400.0, 600.0, 1000.0, 750.0, 500.0, 700.0, 550.0]),
    ];
    
    if time_step >= time_steps.len() {
        return Err(format!("Time step {} out of range (0-{})", time_step, time_steps.len() - 1));
    }
    
    let (time, temperatures) = &time_steps[time_step];
    
    Ok(serde_json::json!({
        "time": time,
        "temperature_values": temperatures,
        "step_index": time_step,
        "total_steps": time_steps.len()
    }))
}

/// Get playback information for a simulation
#[tauri::command]
pub fn get_playback_info(simulation_id: String) -> Result<serde_json::Value, String> {
    info!("Getting playback info for simulation {}", simulation_id);
    
    // Mock playback info - in real implementation this would come from simulation metadata
    Ok(serde_json::json!({
        "total_time_steps": 5,
        "time_interval": 15.0,
        "total_time": 60.0,
        "min_temperature": 300.0,
        "max_temperature": 1000.0,
        "mesh_resolution": [3, 3]
    }))
}
