//! Material Properties System Demonstration
//! 
//! This example demonstrates the core material properties system functionality,
//! including predefined materials, temperature-dependent properties, and validation.

use plasma_simulation::simulation::materials::{MaterialLibrary, Property, Material};
use plasma_simulation::formula::engine::FormulaEngine;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    plasma_simulation::init_logger();
    
    println!("=== Plasma Furnace Simulator - Material Properties Demo ===\n");
    
    // Demonstrate predefined materials library
    println!("Available Materials:");
    for material_name in MaterialLibrary::list_materials() {
        println!("  - {}", material_name);
    }
    println!();
    
    // Create a formula engine for temperature-dependent properties
    let mut formula_engine = FormulaEngine::new();
    
    // Demonstrate carbon steel properties at different temperatures
    println!("Carbon Steel Properties at Different Temperatures:");
    let steel = MaterialLibrary::get_material("Carbon Steel")?;
    
    let temperatures = vec![300.0, 500.0, 800.0, 1200.0, 1500.0]; // K
    
    for temp in temperatures {
        let k = steel.get_thermal_conductivity(temp, Some(&mut formula_engine))?;
        let cp = steel.get_specific_heat(temp, Some(&mut formula_engine))?;
        
        println!("  T = {:.0} K: k = {:.2} W/(m·K), cp = {:.1} J/(kg·K)", 
                 temp, k, cp);
    }
    println!();
    
    // Demonstrate material validation
    println!("Material Validation Examples:");
    
    // Valid material
    match Material::new("Test Material".to_string(), 1000.0, 0.8) {
        Ok(_) => println!("  ✓ Valid material created successfully"),
        Err(e) => println!("  ✗ Error: {}", e),
    }
    
    // Invalid material (negative density)
    match Material::new("Invalid Material".to_string(), -1000.0, 0.8) {
        Ok(_) => println!("  ✗ Invalid material should have failed"),
        Err(e) => println!("  ✓ Correctly rejected invalid material: {}", e),
    }
    println!();
    
    // Demonstrate property types
    println!("Property Types Demonstration:");
    
    // Constant property
    let constant_prop = Property::Constant(100.0);
    println!("  Constant property (100.0) at 500K: {:.1}", 
             constant_prop.evaluate(500.0, None)?);
    
    // Formula property
    let formula_prop = Property::Formula("50.0 + 0.1 * T".to_string());
    println!("  Formula property (50.0 + 0.1 * T) at 500K: {:.1}", 
             formula_prop.evaluate(500.0, Some(&mut formula_engine))?);
    
    // Table property with interpolation
    let table_prop = Property::Table(vec![
        (273.0, 10.0),
        (373.0, 20.0),
        (473.0, 30.0),
    ]);
    println!("  Table property interpolated at 323K: {:.1}", 
             table_prop.evaluate(323.0, None)?);
    println!();
    
    // Demonstrate all predefined materials
    println!("All Predefined Materials Summary:");
    for material_name in MaterialLibrary::list_materials() {
        let material = MaterialLibrary::get_material(&material_name)?;
        println!("  {}: ρ = {:.0} kg/m³, ε = {:.1}, melting point = {:?} K", 
                 material.name, 
                 material.density, 
                 material.emissivity,
                 material.melting_point);
    }
    println!();
    
    // Demonstrate temperature range detection
    let aluminum = MaterialLibrary::get_material("Aluminum")?;
    let (min_temp, max_temp) = aluminum.get_temperature_range();
    println!("Aluminum temperature range: {:?} - {:?} K", min_temp, max_temp);
    
    println!("\n=== Demo completed successfully! ===");
    
    Ok(())
}