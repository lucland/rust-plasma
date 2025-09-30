//! Material properties and phase change modeling
//! 
//! This module handles material property definitions, temperature-dependent
//! properties, and phase change calculations using the enthalpy method.

use crate::errors::Result;

/// Material property types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Property {
    Constant(f64),
    Formula(String),  // Rhai formula string
    Table(Vec<(f64, f64)>), // (temperature, value) pairs
}

impl Property {
    /// Evaluate property at given temperature (placeholder)
    pub fn evaluate(&self, _temperature: f64) -> f64 {
        match self {
            Property::Constant(value) => *value,
            Property::Formula(_formula) => {
                // Placeholder - will use formula engine in subsequent tasks
                0.0
            }
            Property::Table(table) => {
                if table.is_empty() {
                    return 0.0;
                }
                // Simple linear interpolation placeholder
                table[0].1
            }
        }
    }
}

/// Material definition
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Material {
    pub name: String,
    pub density: f64,                    // kg/m³
    pub thermal_conductivity: Property,  // W/(m·K)
    pub specific_heat: Property,         // J/(kg·K)
    pub emissivity: f64,                // 0.0 to 1.0
    pub melting_point: Option<f64>,     // K
    pub latent_heat_fusion: Option<f64>, // J/kg
}

impl Material {
    /// Create a new material
    pub fn new(name: String, density: f64, emissivity: f64) -> Self {
        Self {
            name,
            density,
            thermal_conductivity: Property::Constant(50.0), // Default value
            specific_heat: Property::Constant(500.0),       // Default value
            emissivity,
            melting_point: None,
            latent_heat_fusion: None,
        }
    }
    
    /// Get thermal conductivity at temperature
    pub fn get_thermal_conductivity(&self, temperature: f64) -> f64 {
        self.thermal_conductivity.evaluate(temperature)
    }
    
    /// Get specific heat at temperature
    pub fn get_specific_heat(&self, temperature: f64) -> f64 {
        self.specific_heat.evaluate(temperature)
    }
    
    /// Calculate effective specific heat including phase change effects (placeholder)
    pub fn effective_specific_heat(&self, temperature: f64, _delta_t: f64) -> f64 {
        // Placeholder implementation - will be completed in subsequent tasks
        self.get_specific_heat(temperature)
    }
}

impl Default for Material {
    fn default() -> Self {
        Self::new("Steel".to_string(), 7850.0, 0.8)
    }
}

/// Predefined materials library
pub struct MaterialLibrary;

impl MaterialLibrary {
    /// Get carbon steel material
    pub fn carbon_steel() -> Material {
        Material {
            name: "Carbon Steel".to_string(),
            density: 7850.0,
            thermal_conductivity: Property::Constant(50.0),
            specific_heat: Property::Constant(500.0),
            emissivity: 0.8,
            melting_point: Some(1811.0), // K
            latent_heat_fusion: Some(247000.0), // J/kg
        }
    }
    
    /// Get stainless steel material
    pub fn stainless_steel() -> Material {
        Material {
            name: "Stainless Steel".to_string(),
            density: 8000.0,
            thermal_conductivity: Property::Constant(16.0),
            specific_heat: Property::Constant(500.0),
            emissivity: 0.7,
            melting_point: Some(1673.0), // K
            latent_heat_fusion: Some(247000.0), // J/kg
        }
    }
    
    /// Get aluminum material
    pub fn aluminum() -> Material {
        Material {
            name: "Aluminum".to_string(),
            density: 2700.0,
            thermal_conductivity: Property::Constant(237.0),
            specific_heat: Property::Constant(900.0),
            emissivity: 0.9,
            melting_point: Some(933.0), // K
            latent_heat_fusion: Some(397000.0), // J/kg
        }
    }
    
    /// List all available materials
    pub fn list_materials() -> Vec<String> {
        vec![
            "Carbon Steel".to_string(),
            "Stainless Steel".to_string(),
            "Aluminum".to_string(),
        ]
    }
    
    /// Get material by name
    pub fn get_material(name: &str) -> Option<Material> {
        match name {
            "Carbon Steel" => Some(Self::carbon_steel()),
            "Stainless Steel" => Some(Self::stainless_steel()),
            "Aluminum" => Some(Self::aluminum()),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_material_creation() {
        let material = Material::new("Test".to_string(), 1000.0, 0.5);
        assert_eq!(material.name, "Test");
        assert_eq!(material.density, 1000.0);
        assert_eq!(material.emissivity, 0.5);
    }
    
    #[test]
    fn test_property_constant() {
        let prop = Property::Constant(100.0);
        assert_eq!(prop.evaluate(500.0), 100.0);
    }
    
    #[test]
    fn test_material_library() {
        let materials = MaterialLibrary::list_materials();
        assert!(materials.contains(&"Carbon Steel".to_string()));
        
        let steel = MaterialLibrary::get_material("Carbon Steel").unwrap();
        assert_eq!(steel.name, "Carbon Steel");
        assert_eq!(steel.density, 7850.0);
    }
}