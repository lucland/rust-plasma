/**
 * state.rs
 * Responsibility: Application state management for the Plasma Furnace Simulator
 * 
 * Main functions:
 * - Define and manage application state
 * - Provide thread-safe access to shared simulation state
 * - Store simulation mesh and parameters
 */

use std::sync::{Arc, Mutex};
use tauri::State;
use log::info;
use serde::Serialize;
use crate::parameters::GeometryParameters;

/// Struct to hold the global application state
pub struct AppState {
    /// Current geometry parameters
    pub geometry: Mutex<GeometryParameters>,
    /// Flag indicating if a mesh has been created
    pub mesh_created: Mutex<bool>,
}

/// Default implementation for AppState
impl Default for AppState {
    fn default() -> Self {
        Self {
            geometry: Mutex::new(GeometryParameters::default()),
            mesh_created: Mutex::new(false),
        }
    }
}

/// Create a new AppState with default values
impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
}

/// Response structure for update_geometry command
#[derive(Serialize)]
pub struct GeometryResponse {
    pub success: bool,
    pub message: String,
    pub geometry: GeometryParameters,
}

#[derive(Debug, Clone, Serialize)]
pub struct DebugStateResponse {
    pub geometry: GeometryParameters,
    pub mesh_created: bool,
}

/// Get current application state values for debugging
#[tauri::command]
pub fn get_debug_state(state: State<Arc<AppState>>) -> DebugStateResponse {
    // Log the debug state request
    info!("Debug state requested");
    
    // Access the state safely
    let geometry = state.geometry.lock().unwrap().clone();
    let mesh_created = *state.mesh_created.lock().unwrap();
    
    // Return debug information
    DebugStateResponse {
        geometry,
        mesh_created,
    }
}

/// Update the furnace geometry and create a mesh
#[tauri::command]
pub fn update_geometry(
    height: f64,
    diameter: f64, 
    state: State<Arc<AppState>>
) -> Result<GeometryResponse, String> {
    // Validate inputs
    if height <= 0.0 || diameter <= 0.0 {
        return Err("Height and diameter must be positive values".to_string());
    }

    // Log the received parameters
    info!(
        "Updating furnace geometry: height = {:.2} m, diameter = {:.2} m", 
        height, 
        diameter
    );

    // Update geometry in state
    let mut geometry = state.geometry.lock().unwrap();
    info!("Previous geometry: height = {:.2} m, radius = {:.2} m", 
          geometry.cylinder_height, geometry.cylinder_radius);
    geometry.cylinder_height = height;
    geometry.cylinder_radius = diameter / 2.0;

    // In a real implementation, we would create and store a CylindricalMesh instance:
    // 
    // 1. Import the CylindricalMesh from the core simulation:
    //    use crate::simulation::mesh::CylindricalMesh;
    //
    // 2. Create a mesh with the specified dimensions:
    //    let radius = diameter / 2.0;
    //    let mesh = CylindricalMesh::new(
    //        height,           // height
    //        radius,           // radius
    //        100,              // nr (radial nodes)
    //        100,              // nz (axial nodes)
    //        36,               // ntheta (angular nodes)
    //    );
    // 
    // 3. Store the mesh in application state
    //    *state.mesh.lock().unwrap() = Some(mesh);

    // Mark mesh as created
    let mut mesh_created = state.mesh_created.lock().unwrap();
    let was_created = *mesh_created;
    *mesh_created = true;
    info!("Mesh creation flag: {} -> true", was_created);
    
    // Return success response
    Ok(GeometryResponse {
        success: true,
        message: format!(
            "Furnace geometry updated successfully. Cylinder height: {:.2} m, diameter: {:.2} m",
            height, 
            diameter
        ),
        geometry: geometry.clone(),
    })
}
