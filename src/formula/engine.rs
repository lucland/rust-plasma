//! Core formula engine using Rhai scripting language
//! 
//! This module provides safe evaluation of mathematical formulas for
//! material properties, heat sources, and boundary conditions.

use crate::errors::Result;
use std::collections::HashMap;

/// Formula engine for safe mathematical expression evaluation
pub struct FormulaEngine {
    engine: rhai::Engine,
    scope: rhai::Scope<'static>,
}

impl FormulaEngine {
    /// Create a new formula engine
    pub fn new() -> Self {
        let mut engine = rhai::Engine::new();
        
        // Configure engine for safety
        engine.set_max_operations(10000); // Limit operations
        engine.set_max_modules(0);        // Disable module loading
        engine.set_max_call_levels(10);   // Limit recursion
        
        // Add mathematical constants
        let mut scope = rhai::Scope::new();
        scope.push_constant("PI", std::f64::consts::PI);
        scope.push_constant("E", std::f64::consts::E);
        
        Self { engine, scope }
    }
    
    /// Evaluate a formula with given temperature
    pub fn evaluate_formula(&mut self, formula: &str, temperature: f64) -> Result<f64> {
        // Set temperature variable
        self.scope.set_value("T", temperature);
        
        // Evaluate formula
        match self.engine.eval_with_scope::<f64>(&mut self.scope, formula) {
            Ok(result) => {
                if result.is_finite() {
                    Ok(result)
                } else {
                    Err(crate::errors::SimulationError::FormulaError {
                        formula: formula.to_string(),
                        error: "Result is not finite".to_string(),
                    })
                }
            }
            Err(e) => Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: e.to_string(),
            }),
        }
    }
    
    /// Validate formula syntax
    pub fn validate_formula(&mut self, formula: &str) -> Result<()> {
        // Try to compile the formula
        match self.engine.compile(formula) {
            Ok(_) => Ok(()),
            Err(e) => Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: format!("Syntax error: {}", e),
            }),
        }
    }
    
    /// Set constants for formula evaluation
    pub fn set_constants(&mut self, constants: HashMap<String, f64>) {
        for (name, value) in constants {
            self.scope.set_value(name, value);
        }
    }
}

impl Default for FormulaEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_formula_engine_creation() {
        let engine = FormulaEngine::new();
        drop(engine);
    }
    
    #[test]
    fn test_simple_formula_evaluation() {
        let mut engine = FormulaEngine::new();
        let result = engine.evaluate_formula("2.0 + 3.0", 300.0).unwrap();
        assert_eq!(result, 5.0);
    }
    
    #[test]
    fn test_temperature_dependent_formula() {
        let mut engine = FormulaEngine::new();
        let result = engine.evaluate_formula("T * 2.0", 100.0).unwrap();
        assert_eq!(result, 200.0);
    }
    
    #[test]
    fn test_formula_validation() {
        let mut engine = FormulaEngine::new();
        assert!(engine.validate_formula("2.0 + 3.0").is_ok());
        assert!(engine.validate_formula("2.0 +").is_err());
    }
    
    #[test]
    fn test_constants() {
        let mut engine = FormulaEngine::new();
        let result = engine.evaluate_formula("PI * 2.0", 300.0).unwrap();
        assert!((result - 2.0 * std::f64::consts::PI).abs() < 1e-10);
    }
}