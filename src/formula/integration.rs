//! Integration layer for connecting formulas with simulation
//! 
//! This module provides the integration between the formula engine and
//! the simulation system, managing formula evaluation in the context
//! of material properties and physics calculations.

use crate::errors::Result;
use super::engine::FormulaEngine;
use std::collections::HashMap;

/// Formula manager for simulation integration
pub struct FormulaManager {
    engine: FormulaEngine,
    material_formulas: HashMap<String, String>,
    physics_formulas: HashMap<String, String>,
    custom_constants: HashMap<String, f64>,
}

impl FormulaManager {
    /// Create a new formula manager
    pub fn new() -> Self {
        Self {
            engine: FormulaEngine::new(),
            material_formulas: HashMap::new(),
            physics_formulas: HashMap::new(),
            custom_constants: HashMap::new(),
        }
    }
    
    /// Add a material property formula
    pub fn add_material_formula(&mut self, property: &str, formula: &str) -> Result<()> {
        // Validate formula first
        self.engine.validate_formula(formula)?;
        self.material_formulas.insert(property.to_string(), formula.to_string());
        Ok(())
    }
    
    /// Add a physics formula
    pub fn add_physics_formula(&mut self, property: &str, formula: &str) -> Result<()> {
        // Validate formula first
        self.engine.validate_formula(formula)?;
        self.physics_formulas.insert(property.to_string(), formula.to_string());
        Ok(())
    }
    
    /// Evaluate a material property formula
    pub fn evaluate_material_property(&mut self, property: &str, temperature: f64) -> Result<f64> {
        if let Some(formula) = self.material_formulas.get(property) {
            self.engine.evaluate_formula(formula, temperature)
        } else {
            Err(crate::errors::SimulationError::FormulaError {
                formula: property.to_string(),
                error: "Formula not found".to_string(),
            })
        }
    }
    
    /// Evaluate a physics formula
    pub fn evaluate_physics_property(&mut self, property: &str, temperature: f64) -> Result<f64> {
        if let Some(formula) = self.physics_formulas.get(property) {
            self.engine.evaluate_formula(formula, temperature)
        } else {
            Err(crate::errors::SimulationError::FormulaError {
                formula: property.to_string(),
                error: "Formula not found".to_string(),
            })
        }
    }
    
    /// Set constants for all formulas
    pub fn set_constants(&mut self, constants: HashMap<String, f64>) {
        self.custom_constants.extend(constants.clone());
        self.engine.set_constants(constants);
    }
    
    /// Add a single constant
    pub fn add_constant(&mut self, name: &str, value: f64) -> Result<()> {
        if !value.is_finite() {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: name.to_string(),
                error: "Constant value is not finite".to_string(),
            });
        }
        
        self.custom_constants.insert(name.to_string(), value);
        let mut constants = HashMap::new();
        constants.insert(name.to_string(), value);
        self.engine.set_constants(constants);
        Ok(())
    }
    
    /// Remove a constant
    pub fn remove_constant(&mut self, name: &str) {
        self.custom_constants.remove(name);
        // Note: Rhai doesn't support removing constants, so we recreate the engine
        self.recreate_engine();
    }
    
    /// Get all custom constants
    pub fn get_custom_constants(&self) -> &HashMap<String, f64> {
        &self.custom_constants
    }
    
    /// Recreate the engine with current constants (used when removing constants)
    fn recreate_engine(&mut self) {
        self.engine = FormulaEngine::new();
        self.engine.set_constants(self.custom_constants.clone());
    }
    
    /// List available material formulas
    pub fn list_material_formulas(&self) -> Vec<String> {
        self.material_formulas.keys().cloned().collect()
    }
    
    /// List available physics formulas
    pub fn list_physics_formulas(&self) -> Vec<String> {
        self.physics_formulas.keys().cloned().collect()
    }
    
    /// Get a material formula by name
    pub fn get_material_formula(&self, property: &str) -> Option<&String> {
        self.material_formulas.get(property)
    }
    
    /// Get a physics formula by name
    pub fn get_physics_formula(&self, property: &str) -> Option<&String> {
        self.physics_formulas.get(property)
    }
    
    /// Remove a material formula
    pub fn remove_material_formula(&mut self, property: &str) -> bool {
        self.material_formulas.remove(property).is_some()
    }
    
    /// Remove a physics formula
    pub fn remove_physics_formula(&mut self, property: &str) -> bool {
        self.physics_formulas.remove(property).is_some()
    }
    
    /// Get available functions from the engine
    pub fn get_available_functions(&self) -> Vec<String> {
        self.engine.get_available_functions()
    }
    
    /// Get available constants from the engine
    pub fn get_available_constants(&self) -> Vec<(String, f64)> {
        self.engine.get_available_constants()
    }
    
    /// Validate all stored formulas
    pub fn validate_all_formulas(&mut self) -> Result<Vec<String>> {
        let mut errors = Vec::new();
        
        // Validate material formulas
        for (property, formula) in &self.material_formulas.clone() {
            if let Err(e) = self.engine.validate_formula(formula) {
                errors.push(format!("Material property '{}': {}", property, e));
            }
        }
        
        // Validate physics formulas
        for (property, formula) in &self.physics_formulas.clone() {
            if let Err(e) = self.engine.validate_formula(formula) {
                errors.push(format!("Physics property '{}': {}", property, e));
            }
        }
        
        if errors.is_empty() {
            Ok(Vec::new())
        } else {
            Err(crate::errors::SimulationError::FormulaError {
                formula: "validation".to_string(),
                error: errors.join("; "),
            })
        }
    }
}

impl Default for FormulaManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_formula_manager_creation() {
        let manager = FormulaManager::new();
        assert!(manager.list_material_formulas().is_empty());
        assert!(manager.list_physics_formulas().is_empty());
    }
    
    #[test]
    fn test_add_material_formula() {
        let mut manager = FormulaManager::new();
        assert!(manager.add_material_formula("thermal_conductivity", "50.0 + 0.1 * T").is_ok());
        assert_eq!(manager.list_material_formulas().len(), 1);
    }
    
    #[test]
    fn test_evaluate_material_property() {
        let mut manager = FormulaManager::new();
        manager.add_material_formula("thermal_conductivity", "50.0 + 0.1 * T").unwrap();
        let result = manager.evaluate_material_property("thermal_conductivity", 100.0).unwrap();
        assert_eq!(result, 60.0);
    }
    
    #[test]
    fn test_invalid_formula() {
        let mut manager = FormulaManager::new();
        assert!(manager.add_material_formula("invalid", "50.0 +").is_err());
    }
    
    #[test]
    fn test_constants_management() {
        let mut manager = FormulaManager::new();
        
        // Add a constant
        assert!(manager.add_constant("k0", 50.0).is_ok());
        assert_eq!(manager.get_custom_constants().get("k0"), Some(&50.0));
        
        // Use constant in formula
        manager.add_material_formula("thermal_conductivity", "k0 * (1.0 + 0.001 * T)").unwrap();
        let result = manager.evaluate_material_property("thermal_conductivity", 500.0).unwrap();
        let expected = 50.0 * (1.0 + 0.001 * 500.0);
        assert!((result - expected).abs() < 1e-10);
        
        // Remove constant
        manager.remove_constant("k0");
        assert!(manager.get_custom_constants().get("k0").is_none());
    }
    
    #[test]
    fn test_formula_validation() {
        let mut manager = FormulaManager::new();
        
        // Add valid formulas
        manager.add_material_formula("thermal_conductivity", "50.0 + 0.1 * T").unwrap();
        // Set r variable for physics formula test
        let mut constants = HashMap::new();
        constants.insert("r".to_string(), 0.5);
        manager.set_constants(constants);
        manager.add_physics_formula("heat_source", "1000.0 * exp(-r*r)").unwrap();
        
        // Validate all formulas
        assert!(manager.validate_all_formulas().is_ok());
        
        // Add invalid formula (this should be caught during addition)
        assert!(manager.add_material_formula("invalid", "50.0 +").is_err());
    }
    
    #[test]
    fn test_formula_retrieval() {
        let mut manager = FormulaManager::new();
        
        manager.add_material_formula("thermal_conductivity", "50.0 + 0.1 * T").unwrap();
        
        // Test retrieval
        assert_eq!(
            manager.get_material_formula("thermal_conductivity"),
            Some(&"50.0 + 0.1 * T".to_string())
        );
        assert_eq!(manager.get_material_formula("nonexistent"), None);
        
        // Test removal
        assert!(manager.remove_material_formula("thermal_conductivity"));
        assert!(!manager.remove_material_formula("nonexistent"));
        assert_eq!(manager.get_material_formula("thermal_conductivity"), None);
    }
}