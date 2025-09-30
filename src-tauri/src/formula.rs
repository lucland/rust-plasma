/**
 * formula.rs
 * Responsibility: Formula management commands for the Tauri application
 * 
 * Main functions:
 * - Formula validation and evaluation
 * - Material property formula management
 * - Physics formula management
 * - Constants management
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::State;
use plasma_simulation::formula::{FormulaEngine, FormulaManager};

/// Formula validation result
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FormulaValidationResult {
    pub valid: bool,
    pub error: Option<String>,
    pub warnings: Vec<String>,
}

/// Formula evaluation result
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FormulaEvaluationResult {
    pub success: bool,
    pub value: Option<f64>,
    pub error: Option<String>,
}

/// Formula information for UI display
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FormulaInfo {
    pub name: String,
    pub formula: String,
    pub description: Option<String>,
    pub category: String, // "material" or "physics"
}

/// Available functions and constants for formula editor
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FormulaReference {
    pub functions: Vec<String>,
    pub constants: Vec<ConstantInfo>,
    pub variables: Vec<String>,
}

/// Constant information
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConstantInfo {
    pub name: String,
    pub value: f64,
    pub description: Option<String>,
}

/// Global formula manager state
pub type FormulaManagerState = Arc<Mutex<FormulaManager>>;

/// Initialize formula manager in application state
pub fn init_formula_manager() -> FormulaManagerState {
    let mut manager = FormulaManager::new();
    
    // Add some default material property formulas
    let _ = manager.add_material_formula(
        "thermal_conductivity_steel", 
        "50.0 * (1.0 + 0.0005 * (T - 298.0))"
    );
    let _ = manager.add_material_formula(
        "specific_heat_steel", 
        "460.0 + 0.2 * (T - 298.0)"
    );
    let _ = manager.add_material_formula(
        "emissivity_temperature", 
        "if(T < 773.0, 0.8, 0.8 + 0.0002 * (T - 773.0))"
    );
    
    // Add some default physics formulas
    let _ = manager.add_physics_formula(
        "gaussian_heat_source", 
        "power * efficiency / (2.0 * PI * sigma^2) * exp(-r^2 / (2.0 * sigma^2))"
    );
    let _ = manager.add_physics_formula(
        "radiation_loss", 
        "STEFAN_BOLTZMANN * emissivity * (T^4 - T_ambient^4)"
    );
    
    Arc::new(Mutex::new(manager))
}

/// Validate a formula
#[tauri::command]
pub async fn validate_formula(
    formula: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<FormulaValidationResult, String> {
    let _manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let mut engine = FormulaEngine::new();
    match engine.validate_formula(&formula) {
        Ok(_) => Ok(FormulaValidationResult {
            valid: true,
            error: None,
            warnings: Vec::new(),
        }),
        Err(e) => Ok(FormulaValidationResult {
            valid: false,
            error: Some(e.to_string()),
            warnings: Vec::new(),
        }),
    }
}

/// Evaluate a formula with given temperature and variables
#[tauri::command]
pub async fn evaluate_formula(
    formula: String,
    temperature: f64,
    variables: Option<HashMap<String, f64>>,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<FormulaEvaluationResult, String> {
    let manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let vars = variables.unwrap_or_default();
    let mut engine = FormulaEngine::new();
    // Set the same constants as the manager
    engine.set_constants(manager.get_custom_constants().clone());
    match engine.evaluate_formula_with_vars(&formula, temperature, &vars) {
        Ok(value) => Ok(FormulaEvaluationResult {
            success: true,
            value: Some(value),
            error: None,
        }),
        Err(e) => Ok(FormulaEvaluationResult {
            success: false,
            value: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Add or update a material property formula
#[tauri::command]
pub async fn add_material_formula(
    property: String,
    formula: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    match manager.add_material_formula(&property, &formula) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

/// Add or update a physics formula
#[tauri::command]
pub async fn add_physics_formula(
    property: String,
    formula: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    match manager.add_physics_formula(&property, &formula) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

/// Get all material formulas
#[tauri::command]
pub async fn get_material_formulas(
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<Vec<FormulaInfo>, String> {
    let manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let mut formulas = Vec::new();
    for property in manager.list_material_formulas() {
        if let Some(formula) = manager.get_material_formula(&property) {
            formulas.push(FormulaInfo {
                name: property.clone(),
                formula: formula.clone(),
                description: None,
                category: "material".to_string(),
            });
        }
    }
    
    Ok(formulas)
}

/// Get all physics formulas
#[tauri::command]
pub async fn get_physics_formulas(
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<Vec<FormulaInfo>, String> {
    let manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let mut formulas = Vec::new();
    for property in manager.list_physics_formulas() {
        if let Some(formula) = manager.get_physics_formula(&property) {
            formulas.push(FormulaInfo {
                name: property.clone(),
                formula: formula.clone(),
                description: None,
                category: "physics".to_string(),
            });
        }
    }
    
    Ok(formulas)
}

/// Remove a material formula
#[tauri::command]
pub async fn remove_material_formula(
    property: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(manager.remove_material_formula(&property))
}

/// Remove a physics formula
#[tauri::command]
pub async fn remove_physics_formula(
    property: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(manager.remove_physics_formula(&property))
}

/// Add a custom constant
#[tauri::command]
pub async fn add_constant(
    name: String,
    value: f64,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    match manager.add_constant(&name, value) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

/// Remove a custom constant
#[tauri::command]
pub async fn remove_constant(
    name: String,
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<bool, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.remove_constant(&name);
    Ok(true)
}

/// Get formula reference information for the editor
#[tauri::command]
pub async fn get_formula_reference(
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<FormulaReference, String> {
    let manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let functions = manager.get_available_functions();
    
    let mut constants = Vec::new();
    for (name, value) in manager.get_available_constants() {
        constants.push(ConstantInfo {
            name: name.clone(),
            value,
            description: get_constant_description(&name),
        });
    }
    
    // Add custom constants
    for (name, value) in manager.get_custom_constants() {
        constants.push(ConstantInfo {
            name: name.clone(),
            value: *value,
            description: Some("Custom constant".to_string()),
        });
    }
    
    let variables = vec![
        "T".to_string(),           // Temperature
        "r".to_string(),           // Radial position
        "z".to_string(),           // Axial position
        "t".to_string(),           // Time
        "pressure".to_string(),    // Pressure
        "density".to_string(),     // Density
        "power".to_string(),       // Power
        "efficiency".to_string(),  // Efficiency
        "sigma".to_string(),       // Gaussian spread
        "emissivity".to_string(),  // Emissivity
        "T_ambient".to_string(),   // Ambient temperature
    ];
    
    Ok(FormulaReference {
        functions,
        constants,
        variables,
    })
}

/// Get description for built-in constants
fn get_constant_description(name: &str) -> Option<String> {
    match name {
        "PI" => Some("Mathematical constant π (3.14159...)".to_string()),
        "E" => Some("Mathematical constant e (2.71828...)".to_string()),
        "SQRT_2" => Some("Square root of 2 (1.41421...)".to_string()),
        "LN_2" => Some("Natural logarithm of 2 (0.69314...)".to_string()),
        "LN_10" => Some("Natural logarithm of 10 (2.30258...)".to_string()),
        "STEFAN_BOLTZMANN" => Some("Stefan-Boltzmann constant (5.67e-8 W/(m²·K⁴))".to_string()),
        "BOLTZMANN" => Some("Boltzmann constant (1.38e-23 J/K)".to_string()),
        "AVOGADRO" => Some("Avogadro's number (6.02e23 mol⁻¹)".to_string()),
        "GAS_CONSTANT" => Some("Universal gas constant (8.314 J/(mol·K))".to_string()),
        _ => None,
    }
}

/// Validate all stored formulas
#[tauri::command]
pub async fn validate_all_formulas(
    formula_manager: State<'_, FormulaManagerState>,
) -> Result<FormulaValidationResult, String> {
    let mut manager = formula_manager.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    match manager.validate_all_formulas() {
        Ok(_) => Ok(FormulaValidationResult {
            valid: true,
            error: None,
            warnings: Vec::new(),
        }),
        Err(e) => Ok(FormulaValidationResult {
            valid: false,
            error: Some(e.to_string()),
            warnings: Vec::new(),
        }),
    }
}