//! Plasma Torch Heat Source Model Demonstration
//! 
//! This example demonstrates the plasma torch heat source model implementation,
//! including Gaussian heat distribution, multi-torch support, and heat source
//! superposition calculations.

use plasma_simulation::simulation::{
    physics::{PlasmaTorch, PlasmaPhysics, BoundaryConditions},
    materials::MaterialLibrary,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    env_logger::init();
    
    println!("=== Plasma Torch Heat Source Model Demo ===\n");
    
    // Create plasma torches with different configurations
    println!("1. Creating plasma torches...");
    
    // Main torch at center
    let torch1 = PlasmaTorch::new((0.0, 1.0), 200.0, 0.85, 0.08)?;
    println!("   Torch 1: Position (0.0, 1.0) m, Power: 200 kW, Efficiency: 85%, σ: 0.08 m");
    
    // Secondary torch offset
    let torch2 = PlasmaTorch::new((0.3, 0.8), 150.0, 0.80, 0.06)?;
    println!("   Torch 2: Position (0.3, 0.8) m, Power: 150 kW, Efficiency: 80%, σ: 0.06 m");
    
    // Auxiliary torch with orientation
    let torch3 = PlasmaTorch::with_orientation(
        (0.15, 1.5), 100.0, 0.75, 0.05, (0.1, 0.2), Some(0.01)
    )?;
    println!("   Torch 3: Position (0.15, 1.5) m, Power: 100 kW, Efficiency: 75%, σ: 0.05 m");
    println!("            With orientation (0.1, 0.2) rad and gas flow 0.01 m³/s\n");
    
    // Display torch information
    println!("2. Torch characteristics:");
    for (i, torch) in [&torch1, &torch2, &torch3].iter().enumerate() {
        let info = torch.get_info();
        println!("   Torch {}: Effective radius: {:.3} m, Max heat flux: {:.2e} W/m³", 
                 i + 1, info.effective_radius, info.max_heat_flux);
    }
    println!();
    
    // Create physics model with material
    println!("3. Setting up physics model...");
    let material = MaterialLibrary::get_material("Carbon Steel")?;
    let boundary_conditions = BoundaryConditions::default();
    
    let physics = PlasmaPhysics::new(
        vec![torch1, torch2, torch3], 
        material, 
        boundary_conditions
    )?;
    
    let physics_info = physics.get_physics_info();
    println!("   Material: {}", physics_info.material_name);
    println!("   Number of torches: {}", physics_info.num_torches);
    println!("   Total effective power: {:.1} kW\n", physics_info.total_power);
    
    // Demonstrate heat source calculations at various points
    println!("4. Heat source distribution analysis:");
    
    let test_points = [
        (0.0, 1.0),   // At torch 1 center
        (0.3, 0.8),   // At torch 2 center
        (0.15, 1.25), // Between torches
        (0.1, 0.5),   // Lower region
        (0.5, 1.5),   // Edge region
    ];
    
    for (r, z) in test_points {
        let total_heat = physics.calculate_heat_source(r, z);
        let contributions = physics.calculate_heat_source_by_torch(r, z);
        let dominant_torch = physics.get_dominant_torch_index(r, z);
        
        println!("   Point ({:.2}, {:.2}) m:", r, z);
        println!("     Total heat flux: {:.2e} W/m³", total_heat);
        println!("     Individual contributions: [{:.2e}, {:.2e}, {:.2e}] W/m³", 
                 contributions[0], contributions[1], contributions[2]);
        
        if let Some(dominant) = dominant_torch {
            println!("     Dominant torch: {} ({:.1}% of total)", 
                     dominant + 1, 
                     contributions[dominant] / total_heat * 100.0);
        }
        println!();
    }
    
    // Demonstrate boundary heat loss calculations
    println!("5. Boundary heat loss analysis:");
    
    let temperatures = [400.0, 600.0, 800.0, 1000.0, 1200.0];
    let emissivity = 0.8;
    
    println!("   Temperature (K) | Convection (W/m²) | Radiation (W/m²) | Total (W/m²)");
    println!("   ----------------|-------------------|------------------|-------------");
    
    for temp in temperatures {
        let q_conv = physics.calculate_convection_loss(temp);
        let q_rad = physics.calculate_radiation_loss(temp, emissivity);
        let q_total = physics.calculate_total_boundary_loss(temp, emissivity);
        
        println!("   {:>12.0}    | {:>14.1}    | {:>13.1}    | {:>8.1}", 
                 temp, q_conv, q_rad, q_total);
    }
    println!();
    
    // Demonstrate torch management
    println!("6. Dynamic torch management:");
    let mut physics_mut = physics;
    
    println!("   Initial torch count: {}", physics_mut.torches.len());
    
    // Add a new torch
    let new_torch = PlasmaTorch::new((0.4, 0.5), 80.0, 0.70, 0.04)?;
    physics_mut.add_torch(new_torch);
    println!("   After adding torch: {}", physics_mut.torches.len());
    
    // Remove a torch
    let removed_torch = physics_mut.remove_torch(3)?;
    println!("   After removing torch: {} (removed torch at {:.2}, {:.2})", 
             physics_mut.torches.len(), removed_torch.position.0, removed_torch.position.1);
    
    // Validate torches against furnace geometry
    let furnace_radius = 1.0;
    let furnace_height = 2.0;
    
    match physics_mut.validate_torches(furnace_radius, furnace_height) {
        Ok(()) => println!("   All torches are within furnace bounds ({:.1}m × {:.1}m)", 
                          furnace_radius, furnace_height),
        Err(e) => println!("   Torch validation failed: {}", e),
    }
    
    println!("\n=== Demo completed successfully! ===");
    
    Ok(())
}