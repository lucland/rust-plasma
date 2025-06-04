//-----------------------------------------------------------------------------
// File: simulation/mod.rs
// Main Responsibility: Core module for the simulation engine, organizing all sub-components.
//
// This module serves as the root for the entire simulation engine. It declares
// and organizes all major sub-modules, including physics, mesh generation,
// numerical solvers, state management, material properties, metrics calculation,
// validation, visualization, and parametric studies. It provides a unified
// entry point to the simulation capabilities of the Plasma Furnace Simulator.
//-----------------------------------------------------------------------------
// This module declares and re-exports components from the following sub-modules:
//
// - materials: Manages material properties and databases.
// - mesh: Handles mesh generation and management.
// - metrics: Defines and calculates simulation performance metrics.
// - parametric: Enables parametric studies and optimization.
// - physics: Implements the core physics models (conduction, radiation, etc.).
// - solver: Contains numerical solvers for the simulation equations.
// - state: Manages the simulation state and data.
// - validation: Provides tools for validating simulation results.
// - visualization: (If applicable at this level) Connects to visualization components.
//
// It re-exports key types from the `parametric` module for convenience.

// Módulo de simulação para o simulador de fornalha de plasma

pub mod materials;
pub mod mesh;
pub mod metrics;
pub mod parametric;
pub mod physics;
pub mod solver;
pub mod state;
pub mod validation;
pub mod visualization;

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
