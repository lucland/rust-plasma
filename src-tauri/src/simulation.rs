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

use log::{info, error};
use serde_json;
use chrono;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::parameters::SimulationParameters;
use plasma_simulation::simulation::{SimulationEngine, SimulationConfig};

/// Global simulation state (placeholder for future implementation)
static SIMULATION_STATE: Mutex<Option<Arc<Mutex<SimulationEngine>>>> = Mutex::const_new(None);

/// Run a simulation with the given parameters
#[tauri::command]
pub async fn run_simulation(parameters: SimulationParameters) -> Result<serde_json::Value, String> {
    // Create a unique ID for this simulation run
    let id = format!("sim_{}", chrono::Utc::now().timestamp());
    
    // Log that we're starting the simulation
    info!("Starting simulation with ID: {}", id);
    info!("Geometry: {}m height, {}m diameter", 
          parameters.geometry.cylinder_height, 
          parameters.geometry.cylinder_diameter);
    info!("Torches: {}, power: {}kW", parameters.torches.count, parameters.torches.power);
    
    // Convert UI parameters to simulation configuration
    let config = convert_parameters_to_config(parameters);
    
    // Create simulation engine
    match SimulationEngine::new(config) {
        Ok(mut engine) => {
            info!("Created simulation engine successfully");
            
            // Run simulation (placeholder - will be async in future)
            match engine.run() {
                Ok(results) => {
                    info!("Simulation completed successfully");
                    Ok(serde_json::json!({
                        "success": true,
                        "id": id,
                        "message": "Simulation completed successfully",
                        "duration": results.duration
                    }))
                }
                Err(e) => {
                    error!("Simulation failed: {}", e);
                    Err(format!("Simulation failed: {}", e))
                }
            }
        }
        Err(e) => {
            error!("Failed to create simulation engine: {}", e);
            Err(format!("Failed to create simulation engine: {}", e))
        }
    }
}

/// Convert UI parameters to simulation configuration
fn convert_parameters_to_config(parameters: SimulationParameters) -> SimulationConfig {
    // For now, create a basic configuration
    // This will be expanded in subsequent tasks
    let mut config = SimulationConfig::default();
    config.metadata.name = format!("Simulation_{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"));
    config.metadata.description = format!(
        "Plasma furnace simulation - Height: {}m, Diameter: {}m, Torches: {}, Power: {}kW",
        parameters.geometry.cylinder_height,
        parameters.geometry.cylinder_diameter,
        parameters.torches.count,
        parameters.torches.power
    );
    config
}

/// Get the status of a running simulation
#[tauri::command]
pub fn get_simulation_status(_id: String) -> Result<serde_json::Value, String> {
    // In a real app, this would check the status of the actual simulation
    // For now just return a mock status
    Ok(serde_json::json!({
        "complete": true,
        "progress": 1.0,
        "error": null
    }))
}

/// Get the results of a completed simulation
#[tauri::command]
pub fn get_simulation_results(_id: String) -> Result<serde_json::Value, String> {
    // In a real app, this would return the actual simulation results
    // For now just return some mock data
    Ok(serde_json::json!({
        "temperature": {
            "max": 1200.0,
            "min": 300.0,
            "data": [[300, 400, 500], [600, 800, 1000], [800, 1000, 1200]]
        },
        "velocity": {
            "max": 10.0,
            "min": 0.0,
            "data": [[1, 2, 3], [3, 5, 7], [5, 8, 10]]
        }
    }))
}
