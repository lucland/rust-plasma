//! Numerical solvers for the simulation equations
//! 
//! This module contains the numerical methods for solving the heat diffusion
//! equation in cylindrical coordinates, including Forward Euler and 
//! Crank-Nicolson methods.

use crate::errors::Result;
use ndarray::Array2;

/// Solver method enumeration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum SolverMethod {
    ForwardEuler,
    CrankNicolson { 
        sor_tolerance: f64, 
        max_iterations: usize 
    },
}

impl Default for SolverMethod {
    fn default() -> Self {
        Self::ForwardEuler
    }
}

/// Heat equation solver
pub struct HeatSolver {
    pub method: SolverMethod,
    pub dt: f64,
    pub cfl_factor: f64,
}

impl HeatSolver {
    /// Create a new heat solver
    pub fn new(method: SolverMethod) -> Self {
        Self {
            method,
            dt: 0.001, // Default time step
            cfl_factor: 0.5, // Default CFL factor
        }
    }
    
    /// Create a new heat solver with custom CFL factor
    pub fn with_cfl_factor(method: SolverMethod, cfl_factor: f64) -> Result<Self> {
        if cfl_factor <= 0.0 || cfl_factor > 1.0 {
            return Err(crate::errors::SimulationError::InvalidParameter {
                parameter: "CFL factor".to_string(),
                value: cfl_factor.to_string(),
                range: "(0.0, 1.0]".to_string(),
            });
        }
        
        Ok(Self {
            method,
            dt: 0.001,
            cfl_factor,
        })
    }
    
    /// Solve one time step using the configured method
    pub fn solve_time_step(
        &mut self,
        temperature: &mut Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        physics: &super::physics::PlasmaPhysics,
        dt: f64,
    ) -> Result<()> {
        match &self.method {
            SolverMethod::ForwardEuler => {
                self.solve_forward_euler(temperature, mesh, physics, dt)
            }
            SolverMethod::CrankNicolson { .. } => {
                // Will be implemented in future tasks
                Err(crate::errors::SimulationError::SolverError {
                    method: "Crank-Nicolson".to_string(),
                    reason: "Not yet implemented".to_string(),
                })
            }
        }
    }
    
    /// Calculate stable time step based on CFL condition
    /// For Forward Euler: Δt ≤ min(Δr², Δz²) / (2α) where α = k/(ρcp)
    pub fn calculate_stable_timestep(
        &self, 
        mesh: &super::mesh::CylindricalMesh, 
        physics: &super::physics::PlasmaPhysics
    ) -> f64 {
        // Get material properties at reference temperature (500K)
        let reference_temp = 500.0;
        let k = physics.get_thermal_conductivity(reference_temp);
        let cp = physics.get_specific_heat(reference_temp);
        let rho = physics.get_density();
        
        // Calculate thermal diffusivity: α = k/(ρ*cp)
        let alpha = k / (rho * cp);
        
        // CFL condition for 2D cylindrical coordinates
        // Δt ≤ min(Δr², Δz²) / (2α)
        let dr_sq = mesh.dr * mesh.dr;
        let dz_sq = mesh.dz * mesh.dz;
        let min_spacing_sq = dr_sq.min(dz_sq);
        
        let max_dt_raw = self.cfl_factor * min_spacing_sq / (2.0 * alpha);
        
        // Ensure reasonable bounds
        max_dt_raw.max(1e-8).min(10.0) // Between 10 nanoseconds and 10 seconds
    }
    
    /// Solve one time step using Forward Euler method
    /// Implements the heat equation in cylindrical coordinates:
    /// ∂T/∂t = α * [1/r * ∂/∂r(r * ∂T/∂r) + ∂²T/∂z²] + Q/(ρ*cp)
    fn solve_forward_euler(
        &mut self,
        temperature: &mut Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        physics: &super::physics::PlasmaPhysics,
        dt: f64,
    ) -> Result<()> {
        let nr = mesh.nr;
        let nz = mesh.nz;
        
        // Create a copy of the current temperature field for calculations
        let temp_old = temperature.clone();
        
        // Update time step
        self.dt = dt;
        
        // Iterate through all interior nodes
        for i in 0..nr {
            for j in 0..nz {
                let t_old = temp_old[[i, j]];
                
                // Get material properties at current temperature
                let k = physics.get_thermal_conductivity(t_old);
                let cp = physics.get_specific_heat(t_old);
                let rho = physics.get_density();
                let alpha = k / (rho * cp);
                
                // Calculate heat source at this position
                let (r, z) = mesh.get_coordinates(i, j).unwrap();
                let heat_source = physics.calculate_heat_source(r, z);
                
                // Apply boundary conditions or calculate interior update
                let new_temp = if mesh.get_boundary_type(i, j) != super::mesh::BoundaryType::Interior {
                    self.apply_boundary_conditions(i, j, &temp_old, mesh, physics)?
                } else {
                    self.calculate_interior_update(i, j, &temp_old, mesh, alpha, heat_source, rho, cp, dt)?
                };
                
                temperature[[i, j]] = new_temp;
            }
        }
        
        Ok(())
    }
    
    /// Calculate temperature update for interior nodes using finite differences
    fn calculate_interior_update(
        &self,
        i: usize,
        j: usize,
        temperature: &Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        alpha: f64,
        heat_source: f64,
        rho: f64,
        cp: f64,
        dt: f64,
    ) -> Result<f64> {
        let t_center = temperature[[i, j]];
        let r = mesh.r_coords[i];
        let dr = mesh.dr;
        let dz = mesh.dz;
        
        // Radial derivatives using finite differences
        let d2t_dr2 = if i == 0 {
            // Special case for axis (r = 0): use L'Hôpital's rule
            // 1/r * d/dr(r * dT/dr) = 2 * d²T/dr² at r = 0
            let t_right = temperature[[i + 1, j]];
            2.0 * (t_right - t_center) / (dr * dr)
        } else if i == mesh.nr - 1 {
            // Outer boundary - use one-sided difference
            let t_left = temperature[[i - 1, j]];
            let t_left2 = if i >= 2 { temperature[[i - 2, j]] } else { t_left };
            (t_left2 - 2.0 * t_left + t_center) / (dr * dr)
        } else {
            // Interior points - central difference
            let t_left = temperature[[i - 1, j]];
            let t_right = temperature[[i + 1, j]];
            
            // Calculate 1/r * d/dr(r * dT/dr) using finite differences
            let r_left = mesh.r_coords[i - 1];
            let r_right = mesh.r_coords[i + 1];
            
            let dt_dr_left = (t_center - t_left) / dr;
            let dt_dr_right = (t_right - t_center) / dr;
            
            let flux_left = r_left * dt_dr_left;
            let flux_right = r_right * dt_dr_right;
            
            (flux_right - flux_left) / (r * dr)
        };
        
        // Axial derivatives using central differences
        let d2t_dz2 = if j == 0 || j == mesh.nz - 1 {
            // Boundary nodes - handled by boundary conditions
            0.0
        } else {
            let t_down = temperature[[i, j - 1]];
            let t_up = temperature[[i, j + 1]];
            (t_up - 2.0 * t_center + t_down) / (dz * dz)
        };
        
        // Heat equation: dT/dt = α * (radial_term + axial_term) + Q/(ρ*cp)
        let heat_source_term = heat_source / (rho * cp);
        let dt_dt = alpha * (d2t_dr2 + d2t_dz2) + heat_source_term;
        
        // Forward Euler update: T^(n+1) = T^n + dt * dT/dt
        let new_temp = t_center + dt * dt_dt;
        
        // Check for numerical stability
        if !new_temp.is_finite() {
            return Err(crate::errors::SimulationError::NumericalInstability {
                step: 0, // Will be set by caller
                time: 0.0, // Will be set by caller
            });
        }
        
        Ok(new_temp)
    }
    
    /// Apply boundary conditions
    fn apply_boundary_conditions(
        &self,
        i: usize,
        j: usize,
        temperature: &Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        physics: &super::physics::PlasmaPhysics,
    ) -> Result<f64> {
        use super::mesh::BoundaryType;
        
        let boundary_type = mesh.get_boundary_type(i, j);
        let current_temp = temperature[[i, j]];
        
        match boundary_type {
            BoundaryType::Axis => {
                // Axis symmetry: ∂T/∂r = 0 at r = 0
                // Use temperature from neighboring radial node
                if i + 1 < mesh.nr {
                    Ok(temperature[[i + 1, j]])
                } else {
                    Ok(current_temp)
                }
            }
            
            BoundaryType::OuterWall => {
                // Mixed convection-radiation boundary condition
                self.apply_convection_radiation_bc(i, j, temperature, mesh, physics)
            }
            
            BoundaryType::Bottom | BoundaryType::Top => {
                // For now, use adiabatic boundary condition (∂T/∂z = 0)
                // This can be extended to support specified temperature or heat flux
                if boundary_type == BoundaryType::Bottom && j + 1 < mesh.nz {
                    Ok(temperature[[i, j + 1]])
                } else if boundary_type == BoundaryType::Top && j > 0 {
                    Ok(temperature[[i, j - 1]])
                } else {
                    Ok(current_temp)
                }
            }
            
            BoundaryType::Interior => {
                // This should not happen - interior nodes are handled separately
                Ok(current_temp)
            }
        }
    }
    
    /// Apply convection-radiation boundary condition at outer wall
    /// Heat balance: k * ∂T/∂r = h * (T - T_amb) + ε * σ * (T⁴ - T_amb⁴)
    fn apply_convection_radiation_bc(
        &self,
        i: usize,
        j: usize,
        temperature: &Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        physics: &super::physics::PlasmaPhysics,
    ) -> Result<f64> {
        let current_temp = temperature[[i, j]];
        let dr = mesh.dr;
        
        // Get material properties
        let k = physics.get_thermal_conductivity(current_temp);
        let emissivity = physics.material.emissivity;
        
        // Get boundary conditions
        let _h = physics.boundary_conditions.convection_coefficient;
        let t_amb = physics.boundary_conditions.ambient_temperature;
        
        // Calculate heat losses
        let q_conv = physics.calculate_convection_loss(current_temp);
        let q_rad = physics.calculate_radiation_loss(current_temp, emissivity);
        let q_total = q_conv + q_rad;
        
        // Apply heat balance using finite difference
        // k * (T_interior - T_wall) / dr = q_total
        // Solve for T_wall
        if i > 0 {
            let t_interior = temperature[[i - 1, j]];
            let new_temp = (k * t_interior / dr + q_total) / (k / dr);
            
            // Ensure temperature doesn't go below ambient
            Ok(new_temp.max(t_amb))
        } else {
            Ok(current_temp)
        }
    }
    
    /// Check CFL stability condition
    pub fn check_stability(
        &self,
        dt: f64,
        mesh: &super::mesh::CylindricalMesh,
        physics: &super::physics::PlasmaPhysics,
    ) -> Result<()> {
        let max_stable_dt = self.calculate_stable_timestep(mesh, physics);
        
        if dt > max_stable_dt {
            return Err(crate::errors::SimulationError::NumericalInstability {
                step: 0,
                time: 0.0,
            });
        }
        
        Ok(())
    }
    
    /// Get solver information for debugging
    pub fn get_solver_info(&self) -> SolverInfo {
        SolverInfo {
            method: self.method.clone(),
            dt: self.dt,
            cfl_factor: self.cfl_factor,
        }
    }
}

/// Solver information structure for debugging
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SolverInfo {
    pub method: SolverMethod,
    pub dt: f64,
    pub cfl_factor: f64,
}

/// Simulation results structure (placeholder)
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimulationResults {
    pub duration: f64,
    pub completed_at: chrono::DateTime<chrono::Utc>,
}

impl Default for SimulationResults {
    fn default() -> Self {
        Self {
            duration: 0.0,
            completed_at: chrono::Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::simulation::{mesh::CylindricalMesh, materials::MaterialLibrary, physics::*};
    
    #[test]
    fn test_solver_creation() {
        let solver = HeatSolver::new(SolverMethod::ForwardEuler);
        assert_eq!(solver.dt, 0.001);
        assert_eq!(solver.cfl_factor, 0.5);
    }
    
    #[test]
    fn test_solver_with_cfl_factor() {
        let solver = HeatSolver::with_cfl_factor(SolverMethod::ForwardEuler, 0.3).unwrap();
        assert_eq!(solver.cfl_factor, 0.3);
        
        // Test invalid CFL factor
        assert!(HeatSolver::with_cfl_factor(SolverMethod::ForwardEuler, 0.0).is_err());
        assert!(HeatSolver::with_cfl_factor(SolverMethod::ForwardEuler, 1.5).is_err());
    }
    
    #[test]
    fn test_cfl_timestep_calculation() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 50, 50).unwrap();
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.1).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let dt = solver.calculate_stable_timestep(&mesh, &physics);
        
        assert!(dt > 0.0);
        assert!(dt.is_finite());
        
        // The time step should be reasonable for the given mesh and material
        assert!(dt > 1e-6); // Should be larger than 1 microsecond
        assert!(dt < 100.0); // Should be less than 100 seconds for this mesh
    }
    
    #[test]
    fn test_stability_check() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 50, 50).unwrap();
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.1).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let stable_dt = solver.calculate_stable_timestep(&mesh, &physics);
        
        // Stable time step should pass
        assert!(solver.check_stability(stable_dt * 0.5, &mesh, &physics).is_ok());
        
        // Unstable time step should fail
        assert!(solver.check_stability(stable_dt * 2.0, &mesh, &physics).is_err());
    }
    
    #[test]
    fn test_forward_euler_solve_step() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 20, 20).unwrap();
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.1).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let mut solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let mut temperature = mesh.create_temperature_array(300.0); // Initial temperature
        
        let dt = solver.calculate_stable_timestep(&mesh, &physics) * 0.1; // Use small time step
        
        // Solve one time step
        let result = solver.solve_time_step(&mut temperature, &mesh, &physics, dt);
        assert!(result.is_ok());
        
        // Temperature should have changed (heating from torch)
        let max_temp = temperature.iter().fold(0.0f64, |a, &b| a.max(b));
        assert!(max_temp > 300.0);
    }
    
    #[test]
    fn test_boundary_conditions() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.1).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let solver = HeatSolver::new(SolverMethod::ForwardEuler);
        let temperature = mesh.create_temperature_array(400.0);
        
        // Test axis boundary condition
        let axis_temp = solver.apply_boundary_conditions(0, 5, &temperature, &mesh, &physics).unwrap();
        assert!(axis_temp > 0.0);
        
        // Test outer wall boundary condition
        let wall_temp = solver.apply_boundary_conditions(9, 5, &temperature, &mesh, &physics).unwrap();
        assert!(wall_temp > 0.0);
    }
    
    #[test]
    fn test_solver_info() {
        let solver = HeatSolver::with_cfl_factor(SolverMethod::ForwardEuler, 0.3).unwrap();
        let info = solver.get_solver_info();
        
        assert_eq!(info.cfl_factor, 0.3);
        assert!(matches!(info.method, SolverMethod::ForwardEuler));
    }
    
    #[test]
    fn test_crank_nicolson_not_implemented() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 20, 20).unwrap();
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.1).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let mut solver = HeatSolver::new(SolverMethod::CrankNicolson { 
            sor_tolerance: 1e-6, 
            max_iterations: 100 
        });
        let mut temperature = mesh.create_temperature_array(300.0);
        
        // Should return error for unimplemented method
        let result = solver.solve_time_step(&mut temperature, &mesh, &physics, 0.001);
        assert!(result.is_err());
    }
}