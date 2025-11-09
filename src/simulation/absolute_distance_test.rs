//! Test for physics-based absolute distance heat spread
//! 
//! This test verifies that heat spreads the same absolute distance (in meters)
//! regardless of furnace size, confirming that the simulation uses real physics
//! rather than normalized coordinates.

#[cfg(test)]
mod absolute_distance_tests {
    use crate::simulation::{
        solver::{HeatSolver, SolverMethod},
        mesh::CylindricalMesh,
        materials::MaterialLibrary,
        physics::{PlasmaPhysics, PlasmaTorch, BoundaryConditions},
    };
    use ndarray::Array2;
    
    /// Helper function to calculate the radial distance where temperature drops to a threshold
    /// Returns the maximum radial distance from torch where temp > threshold
    fn calculate_heat_spread_distance(
        temperature: &Array2<f64>,
        mesh: &CylindricalMesh,
        torch_position: (f64, f64),
        threshold_temp: f64,
    ) -> f64 {
        let mut max_distance: f64 = 0.0;
        
        for i in 0..mesh.nr {
            for j in 0..mesh.nz {
                let temp = temperature[[i, j]];
                if temp > threshold_temp {
                    let (r, z) = mesh.get_coordinates(i, j).unwrap();
                    let dr = r - torch_position.0;
                    let dz = z - torch_position.1;
                    let distance = (dr * dr + dz * dz).sqrt();
                    max_distance = max_distance.max(distance);
                }
            }
        }
        
        max_distance
    }
    
    /// Helper function to run a simulation and return the final temperature field
    fn run_simulation(
        mesh: &CylindricalMesh,
        physics: &PlasmaPhysics,
        duration: f64,
        initial_temp: f64,
    ) -> Array2<f64> {
        let mut solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let mut temperature = mesh.create_temperature_array(initial_temp);
        
        // Calculate stable time step
        let dt = solver.calculate_stable_timestep(&mesh, &physics) * 0.1;
        
        // Run simulation for specified duration
        let num_steps = (duration / dt).ceil() as usize;
        
        for step in 0..num_steps {
            let result = solver.solve_time_step(&mut temperature, &mesh, &physics, dt);
            assert!(result.is_ok(), "Solver failed at step {}: {:?}", step, result);
            
            // Check for numerical stability
            for temp in temperature.iter() {
                assert!(temp.is_finite(), "Temperature field contains non-finite values at step {}", step);
            }
        }
        
        temperature
    }
    
    #[test]
    fn test_absolute_distance_heat_spread_4m_vs_2m_furnace() {
        println!("\n=== Testing Physics-Based Absolute Distance Heat Spread ===\n");
        
        // Test parameters
        let simulation_duration = 60.0; // 60 seconds
        let torch_power = 150.0; // 150 kW
        let torch_efficiency = 0.8;
        let torch_sigma = 0.1; // 0.1 m
        let initial_temp = 300.0; // 300 K (ambient)
        let threshold_temp = 305.0; // Temperature threshold for measuring spread (5K above ambient)
        
        // Material: Steel with thermal diffusivity α ≈ 1.2×10⁻⁵ m²/s
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        println!("Material: Carbon Steel");
        println!("Expected thermal diffusivity α ≈ 1.2×10⁻⁵ m²/s");
        println!("Simulation duration: {} seconds", simulation_duration);
        println!("Torch power: {} kW", torch_power);
        println!("Torch efficiency: {}", torch_efficiency);
        println!("Initial temperature: {} K", initial_temp);
        println!("Threshold temperature for spread measurement: {} K\n", threshold_temp);
        
        // ===== Simulation 1: 4m tall furnace =====
        println!("--- Simulation 1: 4m tall furnace ---");
        let furnace_height_1 = 4.0; // 4 meters
        let furnace_radius_1 = 2.0; // 2 meters
        
        // Place torch at center, middle height (absolute coordinates)
        let torch_r_1 = 0.0; // Center
        let torch_z_1 = furnace_height_1 / 2.0; // Middle height = 2.0 m
        
        println!("Furnace dimensions: radius={} m, height={} m", furnace_radius_1, furnace_height_1);
        println!("Torch position (absolute): r={} m, z={} m", torch_r_1, torch_z_1);
        
        let mesh_1 = CylindricalMesh::new(furnace_radius_1, furnace_height_1, 40, 80).unwrap();
        let torch_1 = PlasmaTorch::new((torch_r_1, torch_z_1), torch_power, torch_efficiency, torch_sigma).unwrap();
        let physics_1 = PlasmaPhysics::new(vec![torch_1], material.clone(), bc.clone()).unwrap();
        
        println!("Mesh resolution: {} x {} nodes", mesh_1.nr, mesh_1.nz);
        println!("Cell size: Δr={:.4} m, Δz={:.4} m", mesh_1.dr, mesh_1.dz);
        
        // Run simulation
        println!("Running simulation...");
        let temperature_1 = run_simulation(&mesh_1, &physics_1, simulation_duration, initial_temp);
        
        // Calculate heat spread distance
        let spread_distance_1 = calculate_heat_spread_distance(
            &temperature_1,
            &mesh_1,
            (torch_r_1, torch_z_1),
            threshold_temp,
        );
        
        let max_temp_1 = temperature_1.iter().fold(0.0f64, |a, &b| a.max(b));
        println!("Maximum temperature reached: {:.2} K", max_temp_1);
        println!("Heat spread distance (>{} K): {:.4} m\n", threshold_temp, spread_distance_1);
        
        // ===== Simulation 2: 2m tall furnace =====
        println!("--- Simulation 2: 2m tall furnace ---");
        let furnace_height_2 = 2.0; // 2 meters
        let furnace_radius_2 = 1.0; // 1 meter
        
        // Place torch at center, middle height (absolute coordinates)
        let torch_r_2 = 0.0; // Center
        let torch_z_2 = furnace_height_2 / 2.0; // Middle height = 1.0 m
        
        println!("Furnace dimensions: radius={} m, height={} m", furnace_radius_2, furnace_height_2);
        println!("Torch position (absolute): r={} m, z={} m", torch_r_2, torch_z_2);
        
        let mesh_2 = CylindricalMesh::new(furnace_radius_2, furnace_height_2, 40, 80).unwrap();
        let torch_2 = PlasmaTorch::new((torch_r_2, torch_z_2), torch_power, torch_efficiency, torch_sigma).unwrap();
        let physics_2 = PlasmaPhysics::new(vec![torch_2], material, bc).unwrap();
        
        println!("Mesh resolution: {} x {} nodes", mesh_2.nr, mesh_2.nz);
        println!("Cell size: Δr={:.4} m, Δz={:.4} m", mesh_2.dr, mesh_2.dz);
        
        // Run simulation
        println!("Running simulation...");
        let temperature_2 = run_simulation(&mesh_2, &physics_2, simulation_duration, initial_temp);
        
        // Calculate heat spread distance
        let spread_distance_2 = calculate_heat_spread_distance(
            &temperature_2,
            &mesh_2,
            (torch_r_2, torch_z_2),
            threshold_temp,
        );
        
        let max_temp_2 = temperature_2.iter().fold(0.0f64, |a, &b| a.max(b));
        println!("Maximum temperature reached: {:.2} K", max_temp_2);
        println!("Heat spread distance (>{} K): {:.4} m\n", threshold_temp, spread_distance_2);
        
        // ===== Verification =====
        println!("--- Verification Results ---");
        println!("4m furnace heat spread: {:.4} m", spread_distance_1);
        println!("2m furnace heat spread: {:.4} m", spread_distance_2);
        
        let difference = (spread_distance_1 - spread_distance_2).abs();
        let relative_difference = difference / spread_distance_1.max(spread_distance_2);
        
        println!("Absolute difference: {:.4} m", difference);
        println!("Relative difference: {:.2}%", relative_difference * 100.0);
        
        // Verify that heat spreads approximately the same absolute distance
        // Allow for 20% tolerance due to:
        // - Different mesh resolutions relative to furnace size
        // - Boundary effects (smaller furnace has proportionally more boundary influence)
        // - Numerical discretization errors
        let tolerance = 0.20; // 20% tolerance
        
        assert!(
            relative_difference < tolerance,
            "Heat spread distance should be similar in both furnaces (within {}% tolerance). \
             4m furnace: {:.4} m, 2m furnace: {:.4} m, difference: {:.2}%",
            tolerance * 100.0,
            spread_distance_1,
            spread_distance_2,
            relative_difference * 100.0
        );
        
        // Verify that both simulations show reasonable heat spread
        // For Steel with α ≈ 1.2×10⁻⁵ m²/s and t = 60s:
        // Characteristic diffusion length: L ≈ sqrt(α * t) ≈ sqrt(1.2×10⁻⁵ * 60) ≈ 0.027 m
        // But with torch power, we expect larger spread
        assert!(
            spread_distance_1 > 0.1 && spread_distance_1 < 2.0,
            "Heat spread distance should be reasonable (0.1-2.0 m), got {:.4} m",
            spread_distance_1
        );
        
        assert!(
            spread_distance_2 > 0.1 && spread_distance_2 < 2.0,
            "Heat spread distance should be reasonable (0.1-2.0 m), got {:.4} m",
            spread_distance_2
        );
        
        println!("\n✓ Test passed: Heat spreads same absolute distance in both furnaces");
        println!("✓ Physics-based simulation confirmed (not using normalized coordinates)");
        println!("\n=== Test Complete ===\n");
    }
    
    #[test]
    fn test_thermal_diffusivity_calculation() {
        // Verify that Steel has the expected thermal diffusivity
        println!("\n=== Verifying Steel Thermal Diffusivity ===\n");
        
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let torch = PlasmaTorch::new((0.0, 0.5), 100.0, 0.8, 0.1).unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        // Calculate thermal diffusivity at reference temperature (500K)
        let reference_temp = 500.0;
        let k = physics.get_thermal_conductivity(reference_temp);
        let cp = physics.get_specific_heat(reference_temp);
        let rho = physics.get_density();
        
        let alpha = k / (rho * cp);
        
        println!("Material: Carbon Steel");
        println!("Temperature: {} K", reference_temp);
        println!("Thermal conductivity k: {:.2} W/(m·K)", k);
        println!("Specific heat cp: {:.2} J/(kg·K)", cp);
        println!("Density ρ: {:.2} kg/m³", rho);
        println!("Thermal diffusivity α = k/(ρ·cp): {:.6e} m²/s", alpha);
        
        // Expected thermal diffusivity for Steel: α ≈ 1.2×10⁻⁵ m²/s
        let expected_alpha = 1.2e-5;
        let tolerance = 0.5; // 50% tolerance (material properties vary)
        
        let relative_error = (alpha - expected_alpha).abs() / expected_alpha;
        
        println!("Expected α: {:.6e} m²/s", expected_alpha);
        println!("Relative error: {:.2}%", relative_error * 100.0);
        
        assert!(
            relative_error < tolerance,
            "Thermal diffusivity should be close to expected value. \
             Expected: {:.6e} m²/s, Got: {:.6e} m²/s, Error: {:.2}%",
            expected_alpha,
            alpha,
            relative_error * 100.0
        );
        
        println!("\n✓ Thermal diffusivity is within expected range");
        println!("\n=== Test Complete ===\n");
    }
}
