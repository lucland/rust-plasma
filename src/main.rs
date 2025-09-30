//! Command-line interface for the Plasma Furnace Simulator
//! 
//! This provides a basic CLI interface for running simulations from the command line.
//! The main desktop application is in the src-tauri directory.

use plasma_simulation::{init_logger, info, simulation::SimulationEngine};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    init_logger();
    
    // Print library information
    let lib_info = info();
    println!("{} v{}", lib_info.name, lib_info.version);
    println!("{}", lib_info.description);
    println!();
    
    // Create a basic simulation configuration
    let config = plasma_simulation::simulation::SimulationConfig::default();
    println!("Creating simulation engine with default configuration...");
    
    // Create and run a basic simulation
    let mut engine = SimulationEngine::new(config)?;
    println!("Running simulation...");
    
    let results = engine.run()?;
    println!("Simulation completed in {:.2} seconds", results.duration);
    println!("Completed at: {}", results.completed_at.format("%Y-%m-%d %H:%M:%S UTC"));
    
    println!();
    println!("For the full desktop application, run:");
    println!("  cd src-tauri && cargo tauri dev");
    
    Ok(())
}