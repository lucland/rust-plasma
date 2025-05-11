//-----------------------------------------------------------------------------
// File: formula/mod.rs
// Main Responsibility: Central module for custom formula management.
//
// This module serves as the entry point for the formula subsystem, which allows
// users to define and evaluate custom mathematical formulas for material
// properties, heat sources, and boundary conditions. It exports the core types
// from both the engine and integration submodules, providing a unified interface
// for the rest of the application to access formula functionality. This enables
// customization of simulation behavior through user-defined equations.
//-----------------------------------------------------------------------------
// This module exports the following key components:
//
// engine: Contains the FormulaEngine struct and related types for formula compilation, evaluation, and management
// integration: Provides the FormulaManager struct and related types for integrating formulas with the simulation solver

// Módulo de fórmulas para o simulador de fornalha de plasma

pub mod engine;
pub mod integration;

// Re-exportar tipos principais
pub use engine::{
    FormulaEngine, 
    Formula, 
    FormulaParameter, 
    ParameterType, 
    ParameterValue, 
    FormulaCategory,
    FormulaResult
};

pub use integration::{
    FormulaManager,
    FunctionType
};
