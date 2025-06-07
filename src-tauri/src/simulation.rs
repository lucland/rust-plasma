/**
 * simulation.rs
 * Responsibility: Simulation functions for the Plasma Furnace Simulator
 * 
 * Main functions:
 * - Run simulation
 * - Get simulation status
 * - Get simulation results
 */

use log::info;
use serde_json;
use chrono;
use crate::parameters::SimulationParameters;

/// Run a simulation with the given parameters
#[tauri::command]
pub fn run_simulation(parameters: SimulationParameters) -> Result<serde_json::Value, String> {
    // Create a unique ID for this simulation run
    let id = format!("sim_{}", chrono::Utc::now().timestamp());
    
    // Log that we're starting the simulation
    info!("Starting simulation with ID: {}", id);
    info!("Geometry: {}m height, {}m diameter", 
          parameters.geometry.cylinder_height, 
          parameters.geometry.cylinder_diameter);
    info!("Torches: {}, power: {}kW", parameters.torches.count, parameters.torches.power);
    
    // In a real app, this would start an async job to run the simulation
    // For now, just return a mock response
    Ok(serde_json::json!({
        "success": true,
        "id": id,
        "message": "Simulation started successfully"
    }))
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
