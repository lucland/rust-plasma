/**
 * parameters.rs
 * Responsibility: Parameter definitions and management for the Plasma Furnace Simulator
 * 
 * Main functions:
 * - Parameter structure definitions
 * - Parameter default values
 * - Parameter template loading
 * - Parameter saving/loading
 */

use serde::{Deserialize, Serialize};
use log::info;
use chrono;

/// Parameter templates for quick loading
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParameterTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub parameters: SimulationParameters,
}

/// Complete simulation parameters structure
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SimulationParameters {
    // Furnace geometry
    #[serde(default)]
    pub geometry: GeometryParameters,
    
    // Mesh settings
    #[serde(default)]
    pub mesh: MeshParameters,
    
    // Torch parameters
    #[serde(default)]
    pub torches: TorchParameters,
    
    // Material parameters
    #[serde(default)]
    pub materials: MaterialParameters,
    
    // Boundary conditions
    #[serde(default)]
    pub boundary: BoundaryParameters,
    
    // Simulation settings
    #[serde(default)]
    pub simulation: SimulationSettings,
}

/// Furnace geometry parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GeometryParameters {
    pub cylinder_height: f64,      // Height of the furnace cylinder (m)
    pub cylinder_radius: f64,      // Radius of the furnace cylinder (m)
}

/// Mesh parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MeshParameters {
    pub preset: String,            // Mesh preset: "fast", "balanced", "high", "custom"
    pub nr: i32,                   // Number of radial nodes
    pub nz: i32,                   // Number of axial nodes
}

/// Individual torch configuration
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TorchConfig {
    pub id: i32,                   // Torch ID
    pub position: TorchPosition,   // Position in furnace
    pub power: f64,                // Power (kW)
    pub efficiency: f64,           // Efficiency (0.0-1.0)
    pub sigma: f64,                // Gaussian spread parameter (m)
}

/// Torch position in cylindrical coordinates
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TorchPosition {
    pub r: f64,                    // Radial position (normalized 0-1)
    pub z: f64,                    // Axial position (normalized 0-1)
}

/// Torch parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TorchParameters {
    pub torches: Vec<TorchConfig>, // Individual torch configurations
}

/// Material parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MaterialParameters {
    pub material_type: String,     // Type of material (e.g., "carbon-steel", "aluminum")
    pub density: f64,              // Material density (kg/m³)
    pub thermal_conductivity: f64, // Thermal conductivity (W/(m·K))
    pub specific_heat: f64,        // Specific heat capacity (J/(kg·K))
    pub emissivity: f64,           // Surface emissivity (0.0-1.0)
    pub melting_point: f64,        // Melting point (K)
}

/// Boundary conditions for the simulation
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct BoundaryParameters {
    pub initial_temperature: f64,   // Initial temperature (K)
    pub ambient_temperature: f64,   // Ambient temperature (K)
    pub wall_boundary_type: String, // "mixed", "adiabatic", "fixed-temperature"
    pub convection_coefficient: f64, // Heat transfer coefficient (W/(m²·K))
    pub surface_emissivity: f64,    // Surface emissivity for radiation (0.0-1.0)
}

/// Simulation settings
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SimulationSettings {
    pub total_time: f64,            // Total simulation time (s)
    pub output_interval: f64,       // Output interval (s)
    pub solver_method: String,      // "forward-euler", "crank-nicolson"
    pub cfl_factor: f64,            // CFL safety factor (0.0-1.0)
}

/// Get default parameters
#[tauri::command]
pub fn get_parameters() -> Result<SimulationParameters, String> {
    let params = SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 2.0,
            cylinder_radius: 0.5,
        },
        mesh: MeshParameters {
            preset: "balanced".to_string(),
            nr: 100,
            nz: 100,
        },
        torches: TorchParameters {
            torches: vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.5, z: 0.1 },
                    power: 100.0,
                    efficiency: 0.8,
                    sigma: 0.1,
                }
            ],
        },
        materials: MaterialParameters {
            material_type: "carbon-steel".to_string(),
            density: 7850.0,
            thermal_conductivity: 50.0,
            specific_heat: 460.0,
            emissivity: 0.8,
            melting_point: 1811.0,
        },
        boundary: BoundaryParameters {
            initial_temperature: 298.0,
            ambient_temperature: 298.0,
            wall_boundary_type: "mixed".to_string(),
            convection_coefficient: 10.0,
            surface_emissivity: 0.8,
        },
        simulation: SimulationSettings {
            total_time: 60.0,
            output_interval: 1.0,
            solver_method: "forward-euler".to_string(),
            cfl_factor: 0.5,
        },
    };
    
    Ok(params)
}

/// Save parameters to a file
#[tauri::command]
pub fn save_parameters(_parameters: SimulationParameters) -> Result<serde_json::Value, String> {
    // Create a unique ID for this saved parameter set
    let id = format!("params_{}", chrono::Utc::now().timestamp());
    
    // In a real app, this would save the parameters to a file or database
    info!("Saving parameters with ID: {}", id);

    // Return success response with the ID
    Ok(serde_json::json!({
        "success": true,
        "id": id,
        "message": "Parameters saved successfully"
    }))
}

/// Load a parameter template by ID
#[tauri::command]
pub fn load_parameter_template(template_id: String) -> Result<SimulationParameters, String> {
    info!("Loading template: {}", template_id);

    // Simple templates for testing
    match template_id.as_str() {
        "small_furnace" => {
            let mut params = get_parameters().unwrap();
            params.geometry.cylinder_height = 1.5;
            params.geometry.cylinder_radius = 0.4;
            params.mesh.preset = "fast".to_string();
            params.mesh.nr = 50;
            params.mesh.nz = 50;
            params.torches.torches = vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.5, z: 0.1 },
                    power: 75.0,
                    efficiency: 0.8,
                    sigma: 0.08,
                }
            ];
            Ok(params)
        },
        "large_furnace" => {
            let mut params = get_parameters().unwrap();
            params.geometry.cylinder_height = 3.0;
            params.geometry.cylinder_radius = 0.75;
            params.mesh.preset = "high".to_string();
            params.mesh.nr = 200;
            params.mesh.nz = 200;
            params.torches.torches = vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.3, z: 0.1 },
                    power: 150.0,
                    efficiency: 0.85,
                    sigma: 0.12,
                },
                TorchConfig {
                    id: 2,
                    position: TorchPosition { r: 0.7, z: 0.1 },
                    power: 150.0,
                    efficiency: 0.85,
                    sigma: 0.12,
                }
            ];
            Ok(params)
        },
        "high_power" => {
            let mut params = get_parameters().unwrap();
            params.torches.torches = vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.5, z: 0.1 },
                    power: 250.0,
                    efficiency: 0.9,
                    sigma: 0.15,
                }
            ];
            params.simulation.total_time = 120.0;
            params.simulation.output_interval = 2.0;
            Ok(params)
        },
        _ => {
            Err(format!("Unknown template: {}", template_id))
        }
    }
}
