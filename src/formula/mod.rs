//! Formula engine for custom mathematical expressions
//! 
//! This module provides the formula subsystem, which allows users to define and
//! evaluate custom mathematical formulas for material properties, heat sources,
//! and boundary conditions. It enables customization of simulation behavior
//! through user-defined equations with safe, sandboxed execution.
//! 
//! # Core Components
//! 
//! - [`engine`] - Core formula engine using Rhai scripting language
//! - [`integration`] - Integration layer for connecting formulas with simulation
//! 
//! # Safety
//! 
//! All formula evaluation is performed in a sandboxed environment with:
//! - Resource limits (CPU time, memory usage)
//! - Restricted function access
//! - Input validation and sanitization
//! 
//! # Example Usage
//! 
//! ```rust,no_run
//! use plasma_simulation::formula::FormulaEngine;
//! 
//! let mut engine = FormulaEngine::new();
//! let result = engine.evaluate_formula("k_0 * (1 + alpha * (T - T_ref))", 500.0);
//! ```

use crate::errors::Result;

// Core formula modules
pub mod engine;
pub mod integration;

/// Formula evaluation result
pub type FormulaResult = Result<f64>;

// Re-export the main types from submodules
pub use engine::FormulaEngine;
pub use integration::FormulaManager;



#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_formula_engine_creation() {
        let engine = FormulaEngine::new();
        drop(engine);
    }
    
    #[test]
    fn test_formula_manager_creation() {
        let manager = FormulaManager::new();
        drop(manager);
    }
    
    #[test]
    fn test_integration() {
        let mut manager = FormulaManager::new();
        
        // Test adding and evaluating a formula
        assert!(manager.add_material_formula("test_property", "T * 2.0").is_ok());
        let result = manager.evaluate_material_property("test_property", 100.0).unwrap();
        assert_eq!(result, 200.0);
    }
}
