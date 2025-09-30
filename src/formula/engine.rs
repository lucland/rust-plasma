//! Core formula engine using Rhai scripting language
//! 
//! This module provides safe evaluation of mathematical formulas for
//! material properties, heat sources, and boundary conditions.

use crate::errors::Result;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Formula engine for safe mathematical expression evaluation
pub struct FormulaEngine {
    engine: rhai::Engine,
    scope: rhai::Scope<'static>,
    max_execution_time: Duration,
    max_memory_usage: usize,
}

impl FormulaEngine {
    /// Create a new formula engine with default safety limits
    pub fn new() -> Self {
        Self::with_limits(
            Duration::from_millis(100), // 100ms max execution time
            1024 * 1024,                // 1MB max memory usage
        )
    }
    
    /// Create a new formula engine with custom safety limits
    pub fn with_limits(max_execution_time: Duration, max_memory_usage: usize) -> Self {
        let mut engine = rhai::Engine::new();
        
        // Configure engine for safety and sandboxing
        engine.set_max_operations(10000);     // Limit operations
        engine.set_max_modules(0);            // Disable module loading
        engine.set_max_call_levels(10);       // Limit recursion
        engine.set_max_string_size(1024);     // Limit string size
        engine.set_max_array_size(100);       // Limit array size
        engine.set_max_map_size(100);         // Limit map size
        
        // Disable potentially dangerous functions
        engine.disable_symbol("import");
        engine.disable_symbol("export");
        engine.disable_symbol("eval");
        
        // Add mathematical constants
        let mut scope = rhai::Scope::new();
        scope.push_constant("PI", std::f64::consts::PI);
        scope.push_constant("E", std::f64::consts::E);
        scope.push_constant("SQRT_2", std::f64::consts::SQRT_2);
        scope.push_constant("LN_2", std::f64::consts::LN_2);
        scope.push_constant("LN_10", std::f64::consts::LN_10);
        
        // Add common physical constants
        scope.push_constant("STEFAN_BOLTZMANN", 5.670374419e-8); // W/(m²·K⁴)
        scope.push_constant("BOLTZMANN", 1.380649e-23);          // J/K
        scope.push_constant("AVOGADRO", 6.02214076e23);          // mol⁻¹
        scope.push_constant("GAS_CONSTANT", 8.314462618);        // J/(mol·K)
        
        Self { 
            engine, 
            scope,
            max_execution_time,
            max_memory_usage,
        }
    }
    
    /// Evaluate a formula with given temperature and optional variables
    pub fn evaluate_formula(&mut self, formula: &str, temperature: f64) -> Result<f64> {
        self.evaluate_formula_with_vars(formula, temperature, &HashMap::new())
    }
    
    /// Evaluate a formula with temperature and additional variables
    pub fn evaluate_formula_with_vars(
        &mut self, 
        formula: &str, 
        temperature: f64, 
        variables: &HashMap<String, f64>
    ) -> Result<f64> {
        // Validate input parameters
        if !temperature.is_finite() {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: "Temperature is not finite".to_string(),
            });
        }
        
        if formula.trim().is_empty() {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: "Formula is empty".to_string(),
            });
        }
        
        // Set temperature variable
        self.scope.set_value("T", temperature);
        
        // Set additional variables
        for (name, value) in variables {
            if value.is_finite() {
                self.scope.set_value(name.clone(), *value);
            }
        }
        
        // Execute with timeout
        let start_time = Instant::now();
        
        // Evaluate formula with error handling
        let result = self.engine.eval_with_scope::<f64>(&mut self.scope, formula);
        
        // Check execution time
        if start_time.elapsed() > self.max_execution_time {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: format!("Formula execution timeout (>{:?})", self.max_execution_time),
            });
        }
        
        match result {
            Ok(value) => {
                if value.is_finite() {
                    // Apply safety limits to result
                    if value.abs() > 1e15 {
                        Err(crate::errors::SimulationError::FormulaError {
                            formula: formula.to_string(),
                            error: format!("Result too large: {}", value),
                        })
                    } else {
                        Ok(value)
                    }
                } else {
                    Err(crate::errors::SimulationError::FormulaError {
                        formula: formula.to_string(),
                        error: format!("Result is not finite: {}", value),
                    })
                }
            }
            Err(e) => Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: format!("Evaluation error: {}", e),
            }),
        }
    }
    
    /// Validate formula syntax and safety
    pub fn validate_formula(&mut self, formula: &str) -> Result<()> {
        // Check for empty formula
        if formula.trim().is_empty() {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: "Formula is empty".to_string(),
            });
        }
        
        // Check formula length
        if formula.len() > 1000 {
            return Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: "Formula too long (max 1000 characters)".to_string(),
            });
        }
        
        // Check for potentially dangerous patterns
        let dangerous_patterns = [
            "import", "export", "eval", "while", "loop", "for",
            "fn ", "function", "class", "struct", "impl"
        ];
        
        let formula_lower = formula.to_lowercase();
        for pattern in &dangerous_patterns {
            if formula_lower.contains(pattern) {
                return Err(crate::errors::SimulationError::FormulaError {
                    formula: formula.to_string(),
                    error: format!("Forbidden pattern detected: {}", pattern),
                });
            }
        }
        
        // Try to compile the formula
        match self.engine.compile(formula) {
            Ok(_) => {
                // Test evaluation with safe values
                let test_result = self.evaluate_formula_with_vars(
                    formula, 
                    300.0, // Safe test temperature
                    &HashMap::new()
                );
                
                match test_result {
                    Ok(_) => Ok(()),
                    Err(e) => Err(crate::errors::SimulationError::FormulaError {
                        formula: formula.to_string(),
                        error: format!("Validation test failed: {}", e),
                    }),
                }
            }
            Err(e) => Err(crate::errors::SimulationError::FormulaError {
                formula: formula.to_string(),
                error: format!("Syntax error: {}", e),
            }),
        }
    }
    
    /// Set constants for formula evaluation
    pub fn set_constants(&mut self, constants: HashMap<String, f64>) {
        for (name, value) in constants {
            if value.is_finite() {
                self.scope.set_value(name, value);
            }
        }
    }
    
    /// Get available constants and functions
    pub fn get_available_functions(&self) -> Vec<String> {
        vec![
            // Mathematical functions
            "abs(x)".to_string(),
            "sqrt(x)".to_string(),
            "x * x * x (use multiplication for powers)".to_string(),
            "exp(x)".to_string(),
            "ln(x)".to_string(),
            "log(x)".to_string(),
            "sin(x)".to_string(),
            "cos(x)".to_string(),
            "tan(x)".to_string(),
            "floor(x)".to_string(),
            "ceil(x)".to_string(),
            "round(x)".to_string(),
            "min(x, y)".to_string(),
            "max(x, y)".to_string(),
            // Conditional syntax
            "if condition { true_value } else { false_value }".to_string(),
        ]
    }
    
    /// Get available constants
    pub fn get_available_constants(&self) -> Vec<(String, f64)> {
        vec![
            ("PI".to_string(), std::f64::consts::PI),
            ("E".to_string(), std::f64::consts::E),
            ("SQRT_2".to_string(), std::f64::consts::SQRT_2),
            ("LN_2".to_string(), std::f64::consts::LN_2),
            ("LN_10".to_string(), std::f64::consts::LN_10),
            ("STEFAN_BOLTZMANN".to_string(), 5.670374419e-8),
            ("BOLTZMANN".to_string(), 1.380649e-23),
            ("AVOGADRO".to_string(), 6.02214076e23),
            ("GAS_CONSTANT".to_string(), 8.314462618),
        ]
    }
    
    /// Get execution limits
    pub fn get_limits(&self) -> (Duration, usize) {
        (self.max_execution_time, self.max_memory_usage)
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
    
    #[test]
    fn test_mathematical_functions() {
        let mut engine = FormulaEngine::new();
        
        // Test sqrt
        let result = engine.evaluate_formula("sqrt(16.0)", 300.0).unwrap();
        assert_eq!(result, 4.0);
        
        // Test exp and ln
        let result = engine.evaluate_formula("ln(exp(2.0))", 300.0).unwrap();
        assert!((result - 2.0).abs() < 1e-10);
        
        // Test trigonometric functions
        let result = engine.evaluate_formula("sin(PI / 2.0)", 300.0).unwrap();
        assert!((result - 1.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_conditional_formulas() {
        let mut engine = FormulaEngine::new();
        
        // Test if function (Rhai syntax)
        let result = engine.evaluate_formula("if T > 500.0 { 100.0 } else { 50.0 }", 600.0).unwrap();
        assert_eq!(result, 100.0);
        
        let result = engine.evaluate_formula("if T > 500.0 { 100.0 } else { 50.0 }", 400.0).unwrap();
        assert_eq!(result, 50.0);
    }
    
    #[test]
    fn test_complex_material_property_formula() {
        let mut engine = FormulaEngine::new();
        
        // Thermal conductivity formula: k = k0 * (1 + alpha * (T - T_ref))
        let mut constants = HashMap::new();
        constants.insert("k0".to_string(), 50.0);
        constants.insert("alpha".to_string(), 0.001);
        constants.insert("T_ref".to_string(), 298.0);
        engine.set_constants(constants);
        
        let result = engine.evaluate_formula("k0 * (1.0 + alpha * (T - T_ref))", 500.0).unwrap();
        let expected = 50.0 * (1.0 + 0.001 * (500.0 - 298.0));
        assert!((result - expected).abs() < 1e-10);
    }
    
    #[test]
    fn test_safety_limits() {
        let mut engine = FormulaEngine::new();
        
        // Test empty formula
        assert!(engine.validate_formula("").is_err());
        
        // Test dangerous patterns
        assert!(engine.validate_formula("import something").is_err());
        assert!(engine.validate_formula("while true {}").is_err());
        
        // Test infinite result
        assert!(engine.evaluate_formula("1.0 / 0.0", 300.0).is_err());
        
        // Test NaN result
        assert!(engine.evaluate_formula("sqrt(-1.0)", 300.0).is_err());
    }
    
    #[test]
    fn test_formula_with_variables() {
        let mut engine = FormulaEngine::new();
        
        let mut variables = HashMap::new();
        variables.insert("pressure".to_string(), 101325.0);
        variables.insert("density".to_string(), 1.225);
        
        let result = engine.evaluate_formula_with_vars(
            "pressure / (density * GAS_CONSTANT * T)", 
            300.0, 
            &variables
        ).unwrap();
        
        // Should calculate something reasonable
        assert!(result > 0.0 && result < 1000.0);
    }
    
    #[test]
    fn test_physical_constants() {
        let mut engine = FormulaEngine::new();
        
        // Test Stefan-Boltzmann constant (using T*T*T*T for power)
        let result = engine.evaluate_formula("STEFAN_BOLTZMANN * T * T * T * T", 1000.0).unwrap();
        let expected = 5.670374419e-8 * 1000.0_f64.powi(4);
        assert!((result - expected).abs() < 1e-5);
    }
}