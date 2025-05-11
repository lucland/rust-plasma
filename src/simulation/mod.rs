//-----------------------------------------------------------------------------
// File: simulation/mod.rs
// Main Responsibility: Central module for organizing parametric studies.
//
// This module acts as the central organizer for the parametric study 
// functionality of the simulator. It exports the main types related to 
// parametric studies, allowing users to systematically vary simulation 
// parameters to study their effects on the results. The module provides 
// a clean interface to the parametric study capabilities of the simulator.
//-----------------------------------------------------------------------------
// This module provides the following functionality for parametric studies:
//
// - ParametricParameter: Defines parameters to be varied in studies with ranges and scaling
// - ScaleType: Specifies linear or logarithmic parameter scaling
// - ParametricStudyConfig: Configuration for parametric studies including parameters and goals
// - OptimizationGoal: Defines optimization targets for parametric studies
// - ParametricSimulationResult: Stores results of a single parametric simulation run
// - ParametricStudyResult: Collects and analyzes results from all parametric simulations
// - ParametricStudyManager: Manages execution of parametric studies including:
//   - generate_parameter_combinations(): Creates parameter sets for study
//   - run_parametric_study(): Executes simulations with different parameter combinations
//   - analyze_results(): Processes results to identify trends and optimal configurations

// Módulo de estudos paramétricos para o simulador de fornalha de plasma

pub mod parametric;

// Re-exportar tipos principais
pub use parametric::{
    ParametricParameter,
    ScaleType,
    ParametricStudyConfig,
    OptimizationGoal,
    ParametricSimulationResult,
    ParametricStudyResult,
    ParametricStudyManager
};
