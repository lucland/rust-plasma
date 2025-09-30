//! Physics models for plasma furnace simulation
//! 
//! This module contains the core physics models including plasma torch
//! heat sources, radiation, convection, and material interactions.

use crate::errors::{Result, SimulationError};
use std::f64::consts::PI;

/// Plasma torch configuration with 3D positioning and Gaussian heat distribution
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlasmaTorch {
    /// Position in cylindrical coordinates (r, z) in meters
    pub position: (f64, f64),
    /// Power output in kW
    pub power: f64,
    /// Efficiency factor (0.0 to 1.0) - fraction of power converted to heat
    pub efficiency: f64,
    /// Gaussian dispersion parameter (standard deviation) in meters
    pub sigma: f64,
    /// Torch orientation angles (pitch, yaw) in radians for future 3D extension
    pub orientation: Option<(f64, f64)>,
    /// Gas flow rate in m³/s (for future modeling)
    pub gas_flow: Option<f64>,
}

impl PlasmaTorch {
    /// Create a new plasma torch with basic parameters
    pub fn new(position: (f64, f64), power: f64, efficiency: f64, sigma: f64) -> Result<Self> {
        // Validate input parameters
        if position.0 < 0.0 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch radial position".to_string(),
                value: position.0.to_string(),
                range: "≥ 0.0".to_string(),
            });
        }
        
        if position.1 < 0.0 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch axial position".to_string(),
                value: position.1.to_string(),
                range: "≥ 0.0".to_string(),
            });
        }
        
        if power <= 0.0 || power > 1000.0 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch power".to_string(),
                value: power.to_string(),
                range: "0.0 < power ≤ 1000.0 kW".to_string(),
            });
        }
        
        if efficiency <= 0.0 || efficiency > 1.0 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch efficiency".to_string(),
                value: efficiency.to_string(),
                range: "0.0 < efficiency ≤ 1.0".to_string(),
            });
        }
        
        if sigma <= 0.0 || sigma > 1.0 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch sigma".to_string(),
                value: sigma.to_string(),
                range: "0.0 < sigma ≤ 1.0 m".to_string(),
            });
        }
        
        Ok(Self {
            position,
            power,
            efficiency,
            sigma,
            orientation: None,
            gas_flow: None,
        })
    }
    
    /// Create a new plasma torch with extended parameters
    pub fn with_orientation(
        position: (f64, f64),
        power: f64,
        efficiency: f64,
        sigma: f64,
        orientation: (f64, f64),
        gas_flow: Option<f64>,
    ) -> Result<Self> {
        let mut torch = Self::new(position, power, efficiency, sigma)?;
        torch.orientation = Some(orientation);
        torch.gas_flow = gas_flow;
        Ok(torch)
    }
    
    /// Calculate heat flux at given position using Gaussian distribution
    /// 
    /// Implements the formula: Q(r) = (P * η) / (2π * σ²) * exp(-d²/(2σ²))
    /// where d is the distance from the torch position to the evaluation point
    /// 
    /// # Arguments
    /// * `r` - Radial coordinate in meters
    /// * `z` - Axial coordinate in meters
    /// 
    /// # Returns
    /// Heat flux in W/m³
    pub fn calculate_heat_flux(&self, r: f64, z: f64) -> f64 {
        // Calculate distance from torch position to evaluation point
        let dr = r - self.position.0;
        let dz = z - self.position.1;
        let distance_sq = dr * dr + dz * dz;
        
        // Convert power from kW to W
        let power_watts = self.power * 1000.0;
        
        // Calculate maximum heat flux at torch center
        let q_max = (power_watts * self.efficiency) / (2.0 * PI * self.sigma * self.sigma);
        
        // Apply Gaussian distribution
        let heat_flux = q_max * (-distance_sq / (2.0 * self.sigma * self.sigma)).exp();
        
        heat_flux
    }
    
    /// Calculate heat flux with view factor for radiative exchange (future enhancement)
    pub fn calculate_heat_flux_with_view_factor(&self, r: f64, z: f64, _view_factor: f64) -> f64 {
        // For now, just return the basic heat flux
        // View factor calculations will be implemented in future tasks
        self.calculate_heat_flux(r, z)
    }
    
    /// Get effective radius of heat source (3σ rule - 99.7% of heat within this radius)
    pub fn get_effective_radius(&self) -> f64 {
        3.0 * self.sigma
    }
    
    /// Check if a point is within the effective heating zone
    pub fn is_within_heating_zone(&self, r: f64, z: f64) -> bool {
        let dr = r - self.position.0;
        let dz = z - self.position.1;
        let distance = (dr * dr + dz * dz).sqrt();
        distance <= self.get_effective_radius()
    }
    
    /// Get torch configuration summary for debugging
    pub fn get_info(&self) -> TorchInfo {
        TorchInfo {
            position: self.position,
            power: self.power,
            efficiency: self.efficiency,
            sigma: self.sigma,
            effective_radius: self.get_effective_radius(),
            max_heat_flux: self.calculate_heat_flux(self.position.0, self.position.1),
        }
    }
    
    /// Validate torch configuration
    pub fn validate(&self, furnace_radius: f64, furnace_height: f64) -> Result<()> {
        // Check if torch is within furnace bounds
        if self.position.0 > furnace_radius {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch radial position".to_string(),
                value: self.position.0.to_string(),
                range: format!("≤ {} m (furnace radius)", furnace_radius),
            });
        }
        
        if self.position.1 > furnace_height {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch axial position".to_string(),
                value: self.position.1.to_string(),
                range: format!("≤ {} m (furnace height)", furnace_height),
            });
        }
        
        // Check if effective heating zone extends beyond furnace
        let effective_radius = self.get_effective_radius();
        if self.position.0 + effective_radius > furnace_radius * 1.5 {
            log::warn!(
                "Torch at ({:.3}, {:.3}) has effective radius {:.3} m that may extend beyond furnace",
                self.position.0, self.position.1, effective_radius
            );
        }
        
        Ok(())
    }
}

/// Torch information structure for debugging and analysis
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TorchInfo {
    pub position: (f64, f64),
    pub power: f64,
    pub efficiency: f64,
    pub sigma: f64,
    pub effective_radius: f64,
    pub max_heat_flux: f64,
}

/// Boundary conditions configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BoundaryConditions {
    pub axis_symmetry: bool,
    pub outer_wall_temperature: Option<f64>,
    pub convection_coefficient: f64,
    pub ambient_temperature: f64,
    pub emissivity: f64,
}

impl Default for BoundaryConditions {
    fn default() -> Self {
        Self {
            axis_symmetry: true,
            outer_wall_temperature: None,
            convection_coefficient: 10.0, // W/(m²·K)
            ambient_temperature: 298.15,  // K (25°C)
            emissivity: 0.8,
        }
    }
}

/// Main physics model container with multi-torch support
pub struct PlasmaPhysics {
    pub torches: Vec<PlasmaTorch>,
    pub material: super::materials::Material,
    pub boundary_conditions: BoundaryConditions,
}

impl PlasmaPhysics {
    /// Create new physics model
    pub fn new(
        torches: Vec<PlasmaTorch>,
        material: super::materials::Material,
        boundary_conditions: BoundaryConditions,
    ) -> Result<Self> {
        // Validate that we have at least one torch
        if torches.is_empty() {
            return Err(SimulationError::InvalidParameter {
                parameter: "torches".to_string(),
                value: "0".to_string(),
                range: "≥ 1 torch required".to_string(),
            });
        }
        
        Ok(Self {
            torches,
            material,
            boundary_conditions,
        })
    }
    
    /// Add a torch to the physics model
    pub fn add_torch(&mut self, torch: PlasmaTorch) {
        self.torches.push(torch);
    }
    
    /// Remove a torch by index
    pub fn remove_torch(&mut self, index: usize) -> Result<PlasmaTorch> {
        if index >= self.torches.len() {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch index".to_string(),
                value: index.to_string(),
                range: format!("0 to {}", self.torches.len().saturating_sub(1)),
            });
        }
        
        if self.torches.len() == 1 {
            return Err(SimulationError::InvalidParameter {
                parameter: "torch removal".to_string(),
                value: "last torch".to_string(),
                range: "at least 1 torch must remain".to_string(),
            });
        }
        
        Ok(self.torches.remove(index))
    }
    
    /// Calculate total heat source at position with multi-torch superposition
    /// 
    /// Implements superposition principle: Q_total = Σ Q_i for all torches
    /// 
    /// # Arguments
    /// * `r` - Radial coordinate in meters
    /// * `z` - Axial coordinate in meters
    /// 
    /// # Returns
    /// Total heat flux in W/m³
    pub fn calculate_heat_source(&self, r: f64, z: f64) -> f64 {
        self.torches
            .iter()
            .map(|torch| torch.calculate_heat_flux(r, z))
            .sum()
    }
    
    /// Calculate heat source contribution from individual torches
    /// Returns a vector of heat flux values, one for each torch
    pub fn calculate_heat_source_by_torch(&self, r: f64, z: f64) -> Vec<f64> {
        self.torches
            .iter()
            .map(|torch| torch.calculate_heat_flux(r, z))
            .collect()
    }
    
    /// Get the dominant torch at a given position (torch with highest heat flux)
    pub fn get_dominant_torch_index(&self, r: f64, z: f64) -> Option<usize> {
        if self.torches.is_empty() {
            return None;
        }
        
        let heat_fluxes: Vec<f64> = self.calculate_heat_source_by_torch(r, z);
        let max_index = heat_fluxes
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(index, _)| index)?;
        
        Some(max_index)
    }
    
    /// Calculate radiation loss using Stefan-Boltzmann law
    /// 
    /// Implements: q_rad = ε * σ * (T⁴ - T_amb⁴)
    /// where σ is the Stefan-Boltzmann constant (5.67e-8 W/(m²·K⁴))
    /// 
    /// # Arguments
    /// * `temperature` - Surface temperature in K
    /// * `emissivity` - Surface emissivity (0.0 to 1.0)
    /// 
    /// # Returns
    /// Radiation heat loss in W/m²
    pub fn calculate_radiation_loss(&self, temperature: f64, emissivity: f64) -> f64 {
        const STEFAN_BOLTZMANN: f64 = 5.67e-8; // W/(m²·K⁴)
        
        let t_amb = self.boundary_conditions.ambient_temperature;
        let q_rad = emissivity * STEFAN_BOLTZMANN * 
                   (temperature.powi(4) - t_amb.powi(4));
        
        q_rad.max(0.0) // Ensure non-negative heat loss
    }
    
    /// Calculate convection heat loss
    /// 
    /// Implements: q_conv = h * (T - T_amb)
    /// 
    /// # Arguments
    /// * `temperature` - Surface temperature in K
    /// 
    /// # Returns
    /// Convection heat loss in W/m²
    pub fn calculate_convection_loss(&self, temperature: f64) -> f64 {
        let h = self.boundary_conditions.convection_coefficient;
        let t_amb = self.boundary_conditions.ambient_temperature;
        let q_conv = h * (temperature - t_amb);
        
        q_conv.max(0.0) // Ensure non-negative heat loss
    }
    
    /// Calculate total boundary heat loss (convection + radiation)
    pub fn calculate_total_boundary_loss(&self, temperature: f64, emissivity: f64) -> f64 {
        self.calculate_convection_loss(temperature) + 
        self.calculate_radiation_loss(temperature, emissivity)
    }
    
    /// Get thermal conductivity at temperature
    pub fn get_thermal_conductivity(&self, _temperature: f64) -> f64 {
        // For now, use None for formula engine - will be properly integrated in formula engine task
        // Use reasonable default values for steel
        match &self.material.thermal_conductivity {
            crate::simulation::materials::Property::Constant(k) => *k,
            _ => 50.0, // Default thermal conductivity for steel (W/m·K)
        }
    }
    
    /// Get specific heat at temperature
    pub fn get_specific_heat(&self, _temperature: f64) -> f64 {
        // For now, use None for formula engine - will be properly integrated in formula engine task
        // Use reasonable default values for steel
        match &self.material.specific_heat {
            crate::simulation::materials::Property::Constant(cp) => *cp,
            _ => 500.0, // Default specific heat for steel (J/kg·K)
        }
    }
    
    /// Get material density
    pub fn get_density(&self) -> f64 {
        self.material.density
    }
    
    /// Validate all torches against furnace geometry
    pub fn validate_torches(&self, furnace_radius: f64, furnace_height: f64) -> Result<()> {
        for (i, torch) in self.torches.iter().enumerate() {
            torch.validate(furnace_radius, furnace_height)
                .map_err(|e| match e {
                    SimulationError::InvalidParameter { parameter, value, range } => {
                        SimulationError::InvalidParameter {
                            parameter: format!("torch[{}] {}", i, parameter),
                            value,
                            range,
                        }
                    }
                    other => other,
                })?;
        }
        Ok(())
    }
    
    /// Get total power from all torches
    pub fn get_total_power(&self) -> f64 {
        self.torches.iter().map(|torch| torch.power * torch.efficiency).sum()
    }
    
    /// Get physics model summary for debugging
    pub fn get_physics_info(&self) -> PhysicsInfo {
        let torch_infos: Vec<TorchInfo> = self.torches.iter().map(|t| t.get_info()).collect();
        let total_power = self.get_total_power();
        
        PhysicsInfo {
            num_torches: self.torches.len(),
            total_power,
            material_name: self.material.name.clone(),
            torch_infos,
        }
    }
}

/// Physics model information structure for debugging and analysis
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PhysicsInfo {
    pub num_torches: usize,
    pub total_power: f64,
    pub material_name: String,
    pub torch_infos: Vec<TorchInfo>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::simulation::materials::MaterialLibrary;
    
    #[test]
    fn test_plasma_torch_creation() {
        let torch = PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 0.05).unwrap();
        assert_eq!(torch.position, (0.1, 0.5));
        assert_eq!(torch.power, 100.0);
        assert_eq!(torch.efficiency, 0.8);
        assert_eq!(torch.sigma, 0.05);
        assert!(torch.orientation.is_none());
        assert!(torch.gas_flow.is_none());
    }
    
    #[test]
    fn test_plasma_torch_validation() {
        // Valid torch
        assert!(PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 0.05).is_ok());
        
        // Invalid radial position
        assert!(PlasmaTorch::new((-0.1, 0.5), 100.0, 0.8, 0.05).is_err());
        
        // Invalid axial position
        assert!(PlasmaTorch::new((0.1, -0.5), 100.0, 0.8, 0.05).is_err());
        
        // Invalid power (too low)
        assert!(PlasmaTorch::new((0.1, 0.5), 0.0, 0.8, 0.05).is_err());
        
        // Invalid power (too high)
        assert!(PlasmaTorch::new((0.1, 0.5), 1500.0, 0.8, 0.05).is_err());
        
        // Invalid efficiency (too low)
        assert!(PlasmaTorch::new((0.1, 0.5), 100.0, 0.0, 0.05).is_err());
        
        // Invalid efficiency (too high)
        assert!(PlasmaTorch::new((0.1, 0.5), 100.0, 1.5, 0.05).is_err());
        
        // Invalid sigma (too low)
        assert!(PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 0.0).is_err());
        
        // Invalid sigma (too high)
        assert!(PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 2.0).is_err());
    }
    
    #[test]
    fn test_plasma_torch_with_orientation() {
        let torch = PlasmaTorch::with_orientation(
            (0.1, 0.5), 
            100.0, 
            0.8, 
            0.05, 
            (0.1, 0.2), 
            Some(0.01)
        ).unwrap();
        
        assert_eq!(torch.orientation, Some((0.1, 0.2)));
        assert_eq!(torch.gas_flow, Some(0.01));
    }
    
    #[test]
    fn test_plasma_torch_heat_flux_calculation() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        
        // Heat flux at torch center should be maximum
        let center_flux = torch.calculate_heat_flux(0.0, 0.0);
        assert!(center_flux > 0.0);
        
        // Heat flux should decrease with distance
        let nearby_flux = torch.calculate_heat_flux(0.01, 0.01);
        let far_flux = torch.calculate_heat_flux(0.1, 0.1);
        
        assert!(center_flux > nearby_flux);
        assert!(nearby_flux > far_flux);
        
        // Heat flux should be very small far from torch
        let very_far_flux = torch.calculate_heat_flux(1.0, 1.0);
        assert!(very_far_flux < center_flux * 1e-6);
    }
    
    #[test]
    fn test_plasma_torch_gaussian_distribution() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 1.0, 0.1).unwrap();
        
        // Test symmetry: heat flux should be same at equal distances
        let flux_1 = torch.calculate_heat_flux(0.05, 0.0);
        let flux_2 = torch.calculate_heat_flux(0.0, 0.05);
        let flux_3 = torch.calculate_heat_flux(0.05 / 2.0_f64.sqrt(), 0.05 / 2.0_f64.sqrt());
        
        assert!((flux_1 - flux_2).abs() < 1e-10);
        assert!((flux_1 - flux_3).abs() < 1e-6); // Small tolerance for floating point
    }
    
    #[test]
    fn test_plasma_torch_effective_radius() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.1).unwrap();
        let effective_radius = torch.get_effective_radius();
        assert!((effective_radius - 0.3).abs() < 1e-10); // 3 * sigma = 3 * 0.1
        
        // Test heating zone detection
        assert!(torch.is_within_heating_zone(0.0, 0.0)); // Center
        assert!(torch.is_within_heating_zone(0.2, 0.0)); // Within zone
        assert!(!torch.is_within_heating_zone(0.5, 0.0)); // Outside zone
    }
    
    #[test]
    fn test_plasma_torch_validation_against_furnace() {
        let torch = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.05).unwrap();
        
        // Valid within furnace bounds
        assert!(torch.validate(1.0, 2.0).is_ok());
        
        // Invalid - outside radial bounds
        assert!(torch.validate(0.3, 2.0).is_err());
        
        // Invalid - outside axial bounds
        assert!(torch.validate(1.0, 0.5).is_err());
    }
    
    #[test]
    fn test_plasma_physics_creation() {
        let torch = PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch], material.clone(), bc.clone()).unwrap();
        assert_eq!(physics.torches.len(), 1);
        
        // Test empty torches validation
        let empty_physics = PlasmaPhysics::new(vec![], material, bc);
        assert!(empty_physics.is_err());
    }
    
    #[test]
    fn test_multi_torch_heat_source_superposition() {
        let torch1 = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((0.2, 0.0), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch1.clone(), torch2.clone()], material, bc).unwrap();
        
        // Test superposition at midpoint
        let midpoint_flux = physics.calculate_heat_source(0.1, 0.0);
        let torch1_flux = torch1.calculate_heat_flux(0.1, 0.0);
        let torch2_flux = torch2.calculate_heat_flux(0.1, 0.0);
        
        assert!((midpoint_flux - (torch1_flux + torch2_flux)).abs() < 1e-10);
        
        // Test individual torch contributions
        let contributions = physics.calculate_heat_source_by_torch(0.1, 0.0);
        assert_eq!(contributions.len(), 2);
        assert!((contributions[0] - torch1_flux).abs() < 1e-10);
        assert!((contributions[1] - torch2_flux).abs() < 1e-10);
    }
    
    #[test]
    fn test_dominant_torch_detection() {
        let torch1 = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((0.5, 0.0), 50.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch1, torch2], material, bc).unwrap();
        
        // Near torch1, it should be dominant
        let dominant_near_torch1 = physics.get_dominant_torch_index(0.01, 0.0);
        assert_eq!(dominant_near_torch1, Some(0));
        
        // Near torch2, it should be dominant
        let dominant_near_torch2 = physics.get_dominant_torch_index(0.49, 0.0);
        assert_eq!(dominant_near_torch2, Some(1));
    }
    
    #[test]
    fn test_torch_management() {
        let torch1 = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((0.2, 0.0), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let mut physics = PlasmaPhysics::new(vec![torch1], material, bc).unwrap();
        assert_eq!(physics.torches.len(), 1);
        
        // Add torch
        physics.add_torch(torch2);
        assert_eq!(physics.torches.len(), 2);
        
        // Remove torch
        let removed = physics.remove_torch(1).unwrap();
        assert_eq!(physics.torches.len(), 1);
        assert_eq!(removed.position, (0.2, 0.0));
        
        // Try to remove last torch (should fail)
        assert!(physics.remove_torch(0).is_err());
        
        // Try to remove invalid index
        assert!(physics.remove_torch(5).is_err());
    }
    
    #[test]
    fn test_radiation_loss_calculation() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        // Test radiation loss at different temperatures
        let q_rad_low = physics.calculate_radiation_loss(400.0, 0.8);
        let q_rad_high = physics.calculate_radiation_loss(800.0, 0.8);
        
        assert!(q_rad_low > 0.0);
        assert!(q_rad_high > q_rad_low); // Higher temperature should have higher radiation loss
        
        // Test at ambient temperature (should be near zero)
        let q_rad_ambient = physics.calculate_radiation_loss(298.15, 0.8);
        assert!(q_rad_ambient.abs() < 1e-6);
    }
    
    #[test]
    fn test_convection_loss_calculation() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        // Calculate expected before moving bc
        let expected = bc.convection_coefficient * (400.0 - bc.ambient_temperature);
        
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        // Test convection loss
        let q_conv = physics.calculate_convection_loss(400.0);
        assert!((q_conv - expected).abs() < 1e-10);
        
        // Test at ambient temperature
        let q_conv_ambient = physics.calculate_convection_loss(298.15);
        assert!(q_conv_ambient.abs() < 1e-6);
    }
    
    #[test]
    fn test_total_boundary_loss() {
        let torch = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        let physics = PlasmaPhysics::new(vec![torch], material, bc).unwrap();
        
        let temperature = 600.0;
        let emissivity = 0.8;
        
        let q_total = physics.calculate_total_boundary_loss(temperature, emissivity);
        let q_conv = physics.calculate_convection_loss(temperature);
        let q_rad = physics.calculate_radiation_loss(temperature, emissivity);
        
        assert!((q_total - (q_conv + q_rad)).abs() < 1e-10);
    }
    
    #[test]
    fn test_total_power_calculation() {
        let torch1 = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((0.2, 0.0), 150.0, 0.9, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch1, torch2], material, bc).unwrap();
        let total_power = physics.get_total_power();
        let expected = 100.0 * 0.8 + 150.0 * 0.9; // power * efficiency for each torch
        
        assert!((total_power - expected).abs() < 1e-10);
    }
    
    #[test]
    fn test_torch_validation_in_physics() {
        let torch1 = PlasmaTorch::new((0.5, 1.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((1.5, 1.0), 100.0, 0.8, 0.05).unwrap(); // Outside furnace
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch1, torch2], material, bc).unwrap();
        
        // Should pass validation for large furnace
        assert!(physics.validate_torches(2.0, 2.0).is_ok());
        
        // Should fail validation for small furnace
        assert!(physics.validate_torches(1.0, 2.0).is_err());
    }
    
    #[test]
    fn test_physics_info() {
        let torch1 = PlasmaTorch::new((0.0, 0.0), 100.0, 0.8, 0.05).unwrap();
        let torch2 = PlasmaTorch::new((0.2, 0.0), 150.0, 0.9, 0.05).unwrap();
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        let bc = BoundaryConditions::default();
        
        let physics = PlasmaPhysics::new(vec![torch1, torch2], material, bc).unwrap();
        let info = physics.get_physics_info();
        
        assert_eq!(info.num_torches, 2);
        assert_eq!(info.material_name, "Carbon Steel");
        assert_eq!(info.torch_infos.len(), 2);
        assert!((info.total_power - (100.0 * 0.8 + 150.0 * 0.9)).abs() < 1e-10);
    }
    
    #[test]
    fn test_torch_info() {
        let torch = PlasmaTorch::new((0.1, 0.5), 100.0, 0.8, 0.05).unwrap();
        let info = torch.get_info();
        
        assert_eq!(info.position, (0.1, 0.5));
        assert_eq!(info.power, 100.0);
        assert_eq!(info.efficiency, 0.8);
        assert_eq!(info.sigma, 0.05);
        assert!((info.effective_radius - 0.15).abs() < 1e-10); // 3 * sigma
        assert!(info.max_heat_flux > 0.0);
    }
    
    #[test]
    fn test_boundary_conditions_default() {
        let bc = BoundaryConditions::default();
        assert!(bc.axis_symmetry);
        assert_eq!(bc.ambient_temperature, 298.15);
        assert_eq!(bc.emissivity, 0.8);
        assert_eq!(bc.convection_coefficient, 10.0);
    }
}