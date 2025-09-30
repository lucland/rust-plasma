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
}

impl FormulaManager {
    /// Create a new formula manager
    pub fn new() -> Self {
        Self {
            engine: FormulaEngine::new(),
            material_formulas: HashMap::new(),
            physics_formulas: HashMap::new(),
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
        self.engine.set_constants(constants);
    }
    
    /// List available material formulas
    pub fn list_material_formulas(&self) -> Vec<String> {
        self.material_formulas.keys().cloned().collect()
    }
    
    /// List available physics formulas
    pub fn list_physics_formulas(&self) -> Vec<String> {
        self.physics_formulas.keys().cloned().collect()
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
}