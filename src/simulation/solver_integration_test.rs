//! Integration tests for the heat solver
//! 
//! These tests verify that the Forward Euler solver works correctly
//! in realistic simulation scenarios.

#[cfg(test)]
mod integration_tests {
    use crate::simulation::{
        solver::{HeatSolver, SolverMethod},
        mesh::CylindricalMesh,
        materials::MaterialLibrary,
        physics::{PlasmaPhysics, PlasmaTorch, BoundaryConditions},
    };
    
    #[test]
    fn test_forward_euler_heat_diffusion_integration() {
        // Create a realistic furnace setup
        let mesh = CylindricalMesh::new(0.5, 1.0, 30, 30).unwrap(); // 0.5m radius, 1m height
        let torch = PlasmaTorch::new((0.25, 0.5), 50.0, 0.8, 0.05).unwrap(); // 50kW torch
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let mut solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let mut temperature = mesh.create_temperature_array(300.0); // Start at 300K
        
        // Calculate stable time step
        let dt = solver.calculate_stable_timestep(&mesh, &physics) * 0.1; // Use 10% of stable dt
        
        // Run simulation for several time steps
        let num_steps = 10;
        let mut max_temps = Vec::new();
        
        for step in 0..num_steps {
            let result = solver.solve_time_step(&mut temperature, &mesh, &physics, dt);
            assert!(result.is_ok(), "Solver failed at step {}: {:?}", step, result);
            
            // Track maximum temperature
            let max_temp = temperature.iter().fold(0.0f64, |a, &b| a.max(b));
            max_temps.push(max_temp);
            
            // Ensure temperatures are physical
            assert!(max_temp > 300.0, "Temperature should increase due to heating");
            assert!(max_temp < 5000.0, "Temperature should not be unrealistically high");
            
            // Check for NaN or infinite values
            for temp in temperature.iter() {
                assert!(temp.is_finite(), "Temperature field contains non-finite values");
            }
        }
        
        // Verify that heating is occurring
        assert!(max_temps[num_steps - 1] > max_temps[0], "Temperature should increase over time");
        
        // Verify temperature distribution makes physical sense
        // The hottest point should be near the torch
        let torch_pos = (0.25, 0.5);
        let torch_i = (torch_pos.0 / mesh.dr).round() as usize;
        let torch_j = (torch_pos.1 / mesh.dz).round() as usize;
        
        let torch_temp = temperature[[torch_i.min(mesh.nr - 1), torch_j.min(mesh.nz - 1)]];
        let corner_temp = temperature[[mesh.nr - 1, mesh.nz - 1]]; // Far corner
        
        assert!(torch_temp > corner_temp, "Temperature near torch should be higher than far corner");
    }
    
    #[test]
    fn test_boundary_conditions_integration() {
        // Test that boundary conditions are properly applied
        let mesh = CylindricalMesh::new(0.3, 0.6, 20, 20).unwrap();
        let torch = PlasmaTorch::new((0.15, 0.3), 30.0, 0.8, 0.03).unwrap();
        let material = MaterialLibrary::get_material("Aluminum").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let mut solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let mut temperature = mesh.create_temperature_array(350.0);
        
        let dt = solver.calculate_stable_timestep(&mesh, &physics) * 0.05;
        
        // Run a few time steps
        for _ in 0..5 {
            solver.solve_time_step(&mut temperature, &mesh, &physics, dt).unwrap();
        }
        
        // Check axis symmetry boundary condition
        // The gradient at the axis should be approximately zero
        // This means temperature at axis should be close to first radial node
        for j in 1..mesh.nz - 1 {
            let axis_temp = temperature[[0, j]];
            let first_radial_temp = temperature[[1, j]];
            let temp_diff = (axis_temp - first_radial_temp).abs();
            
            // Allow for some numerical error, especially after multiple time steps
            assert!(temp_diff < 10.0, 
                   "Axis symmetry condition violated: axis_temp={}, first_radial_temp={}, diff={}", 
                   axis_temp, first_radial_temp, temp_diff);
        }
        
        // Check that outer wall temperature is reasonable (affected by heat loss)
        let outer_wall_temp = temperature[[mesh.nr - 1, mesh.nz / 2]];
        let interior_temp = temperature[[mesh.nr / 2, mesh.nz / 2]];
        assert!(outer_wall_temp <= interior_temp, 
               "Outer wall should be cooler than interior due to heat loss");
    }
    
    #[test]
    fn test_energy_conservation_basic() {
        // Basic test to ensure energy is being added to the system
        let mesh = CylindricalMesh::new(0.2, 0.4, 15, 15).unwrap();
        let torch = PlasmaTorch::new((0.1, 0.2), 20.0, 0.9, 0.02).unwrap();
        let material = MaterialLibrary::get_material("Copper").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let mut solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let mut temperature = mesh.create_temperature_array(298.15); // Room temperature
        
        let dt = solver.calculate_stable_timestep(&mesh, &physics) * 0.2;
        
        // Calculate initial total energy
        let initial_energy: f64 = temperature.iter()
            .enumerate()
            .map(|(idx, &temp)| {
                let i = idx / mesh.nz;
                let j = idx % mesh.nz;
                let volume = mesh.get_cell_volume(i, j);
                let cp = physics.get_specific_heat(temp);
                let rho = physics.get_density();
                volume * rho * cp * temp
            })
            .sum();
        
        // Run simulation
        for _ in 0..3 {
            solver.solve_time_step(&mut temperature, &mesh, &physics, dt).unwrap();
        }
        
        // Calculate final total energy
        let final_energy: f64 = temperature.iter()
            .enumerate()
            .map(|(idx, &temp)| {
                let i = idx / mesh.nz;
                let j = idx % mesh.nz;
                let volume = mesh.get_cell_volume(i, j);
                let cp = physics.get_specific_heat(temp);
                let rho = physics.get_density();
                volume * rho * cp * temp
            })
            .sum();
        
        // Energy should increase due to heat input from torch
        assert!(final_energy > initial_energy, 
               "Total energy should increase due to heat input from torch");
        
        // Energy increase should be reasonable (not too large)
        let energy_increase = final_energy - initial_energy;
        let torch_power = physics.get_total_power() * 1000.0; // Convert to W
        let max_expected_increase = torch_power * dt * 3.0; // 3 time steps
        
        assert!(energy_increase < max_expected_increase * 2.0, 
               "Energy increase should not exceed twice the theoretical maximum");
    }
    
    #[test]
    fn test_cfl_stability_enforcement() {
        // Test that the solver respects CFL stability limits
        let mesh = CylindricalMesh::new(0.1, 0.2, 50, 50).unwrap(); // Fine mesh
        let torch = PlasmaTorch::new((0.05, 0.1), 10.0, 0.8, 0.01).unwrap();
        let material = MaterialLibrary::get_material("Iron").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let stable_dt = solver.calculate_stable_timestep(&mesh, &physics);
        
        // Test that stable time step passes stability check
        assert!(solver.check_stability(stable_dt * 0.9, &mesh, &physics).is_ok());
        
        // Test that unstable time step fails stability check
        assert!(solver.check_stability(stable_dt * 2.0, &mesh, &physics).is_err());
        
        // Test that very large time step fails
        assert!(solver.check_stability(1.0, &mesh, &physics).is_err());
    }
}