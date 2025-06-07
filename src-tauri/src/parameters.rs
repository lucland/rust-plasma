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
    
    // Torch parameters
    #[serde(default)]
    pub torches: TorchParameters,
    
    // Material parameters
    #[serde(default)]
    pub materials: MaterialParameters,
    
    // Boundary conditions
    #[serde(default)]
    pub boundary: BoundaryParameters,
    
    // Physical phenomena to include
    #[serde(default)]
    pub phenomena: PhysicalPhenomena,
    
    // Simulation settings
    #[serde(default)]
    pub simulation: SimulationSettings,
    
    // Gasification parameters
    #[serde(default)]
    pub gasification: GasificationParameters,
}

/// Furnace geometry parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GeometryParameters {
    pub cylinder_height: f64,      // Height of the furnace cylinder (m)
    pub cylinder_diameter: f64,    // Diameter of the furnace cylinder (m)
}

/// Torch position in 3D space
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TorchPosition {
    pub x: f64,                    // X coordinate (normalized 0-1)
    pub y: f64,                    // Y coordinate (normalized 0-1)
    pub z: f64,                    // Z coordinate (normalized 0-1)
}

/// Torch parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TorchParameters {
    pub count: i32,                // Number of torches
    pub positions: Vec<TorchPosition>, // Positions of each torch
    pub power: f64,                // Power of each torch (kW)
}

/// Material parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MaterialParameters {
    pub material_type: String,     // Type of material (e.g., "aluminum", "steel")
    pub density: f64,              // Material density (kg/m³)
    pub specific_heat: f64,        // Specific heat capacity (J/(kg·K))
    pub thermal_conductivity: f64, // Thermal conductivity (W/(m·K))
}

/// Boundary conditions for the simulation
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct BoundaryParameters {
    pub wall_temperature: f64,      // Wall temperature (K)
    pub inlet_temperature: f64,     // Gas inlet temperature (K)
    pub outlet_pressure: f64,       // Outlet pressure (Pa)
}

/// Physical phenomena to include in the simulation
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct PhysicalPhenomena {
    pub include_radiation: bool,    // Include thermal radiation
    pub include_convection: bool,   // Include convective heat transfer
    pub include_turbulence: bool,   // Include turbulence modeling
    pub include_chemistry: bool,    // Include chemical reactions
}

/// Simulation settings
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SimulationSettings {
    pub max_time: f64,              // Maximum simulation time (s)
    pub time_step: f64,             // Time step (s)
    pub convergence_criteria: f64,  // Convergence criteria
    pub mesh_density: i32,          // Mesh density (points per dimension)
}

/// Gasification parameters
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GasificationParameters {
    pub feed_rate: f64,             // Feed rate (kg/s)
    pub particle_size: f64,         // Mean particle size (mm)
    pub moisture_content: f64,      // Moisture content (%)
    pub volatile_matter: f64,       // Volatile matter content (%)
}

/// Get default parameters
#[tauri::command]
pub fn get_parameters() -> Result<SimulationParameters, String> {
    // In a real app, we'd load this from a config file or database
    // For now, just return some default values
    let params = SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 2.0,
            cylinder_diameter: 1.0,
        },
        torches: TorchParameters {
            count: 2,
            positions: vec![
                TorchPosition { x: 0.2, y: 0.1, z: 0.5 },
                TorchPosition { x: 0.8, y: 0.1, z: 0.5 },
            ],
            power: 100.0,
        },
        materials: MaterialParameters::default(),
        boundary: BoundaryParameters::default(),
        phenomena: PhysicalPhenomena::default(),
        simulation: SimulationSettings::default(),
        gasification: GasificationParameters::default(),
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

    // In a real app, this would load from a database or configuration
    // For now, just return a mock template
    
    // Simple templates for testing
    match template_id.as_str() {
        "small_furnace" => {
            let mut params = get_parameters().unwrap();
            params.geometry.cylinder_height = 1.5;
            params.geometry.cylinder_diameter = 0.8;
            params.torches.count = 1;
            params.torches.positions = vec![
                TorchPosition { x: 0.5, y: 0.1, z: 0.5 }
            ];
            Ok(params)
        },
        "large_furnace" => {
            let mut params = get_parameters().unwrap();
            params.geometry.cylinder_height = 3.0;
            params.geometry.cylinder_diameter = 1.5;
            params.torches.count = 4;
            params.torches.positions = vec![
                TorchPosition { x: 0.2, y: 0.1, z: 0.2 },
                TorchPosition { x: 0.8, y: 0.1, z: 0.2 },
                TorchPosition { x: 0.2, y: 0.1, z: 0.8 },
                TorchPosition { x: 0.8, y: 0.1, z: 0.8 }
            ];
            Ok(params)
        },
        "high_power" => {
            let mut params = get_parameters().unwrap();
            params.torches.power = 200.0;
            params.simulation.max_time = 120.0;
            params.phenomena.include_radiation = true;
            params.phenomena.include_convection = true;
            params.phenomena.include_turbulence = true;
            Ok(params)
        },
        _ => {
            Err(format!("Unknown template: {}", template_id))
        }
    }
}
