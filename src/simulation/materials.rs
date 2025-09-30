//! Material properties and phase change modeling
//! 
//! This module handles material property definitions, temperature-dependent
//! properties, and phase change calculations using the enthalpy method.

use crate::errors::{Result, SimulationError};
use crate::formula::engine::FormulaEngine;

/// Material property types
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Property {
    Constant(f64),
    Formula(String),  // Rhai formula string
    Table(Vec<(f64, f64)>), // (temperature, value) pairs
}

impl Property {
    /// Evaluate property at given temperature
    pub fn evaluate(&self, temperature: f64, formula_engine: Option<&mut FormulaEngine>) -> Result<f64> {
        match self {
            Property::Constant(value) => {
                if value.is_finite() && *value >= 0.0 {
                    Ok(*value)
                } else {
                    Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: "property".to_string(),
                        details: format!("Invalid constant value: {}", value),
                    })
                }
            }
            Property::Formula(formula) => {
                match formula_engine {
                    Some(engine) => engine.evaluate_formula(formula, temperature),
                    None => Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: "property".to_string(),
                        details: "Formula engine not available for formula evaluation".to_string(),
                    })
                }
            }
            Property::Table(table) => {
                if table.is_empty() {
                    return Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: "property".to_string(),
                        details: "Empty property table".to_string(),
                    });
                }
                
                // Linear interpolation
                if table.len() == 1 {
                    return Ok(table[0].1);
                }
                
                // Find the appropriate interval
                if temperature <= table[0].0 {
                    return Ok(table[0].1);
                }
                
                if temperature >= table[table.len() - 1].0 {
                    return Ok(table[table.len() - 1].1);
                }
                
                for i in 0..table.len() - 1 {
                    if temperature >= table[i].0 && temperature <= table[i + 1].0 {
                        let t1 = table[i].0;
                        let t2 = table[i + 1].0;
                        let v1 = table[i].1;
                        let v2 = table[i + 1].1;
                        
                        let interpolated = v1 + (v2 - v1) * (temperature - t1) / (t2 - t1);
                        return Ok(interpolated);
                    }
                }
                
                Ok(table[0].1) // Fallback
            }
        }
    }
    
    /// Validate property definition
    pub fn validate(&self, property_name: &str) -> Result<()> {
        match self {
            Property::Constant(value) => {
                if !value.is_finite() {
                    return Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: property_name.to_string(),
                        details: format!("Non-finite constant value: {}", value),
                    });
                }
                if *value < 0.0 {
                    return Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: property_name.to_string(),
                        details: format!("Negative property value: {}", value),
                    });
                }
                Ok(())
            }
            Property::Formula(formula) => {
                if formula.trim().is_empty() {
                    return Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: property_name.to_string(),
                        details: "Empty formula string".to_string(),
                    });
                }
                // Formula validation will be done by the formula engine
                Ok(())
            }
            Property::Table(table) => {
                if table.is_empty() {
                    return Err(SimulationError::MaterialError {
                        material: "unknown".to_string(),
                        property: property_name.to_string(),
                        details: "Empty property table".to_string(),
                    });
                }
                
                // Check for valid temperature ordering
                for i in 1..table.len() {
                    if table[i].0 <= table[i - 1].0 {
                        return Err(SimulationError::MaterialError {
                            material: "unknown".to_string(),
                            property: property_name.to_string(),
                            details: format!("Temperature values must be in ascending order at index {}", i),
                        });
                    }
                }
                
                // Check for valid property values
                for (i, (temp, value)) in table.iter().enumerate() {
                    if !temp.is_finite() || !value.is_finite() {
                        return Err(SimulationError::MaterialError {
                            material: "unknown".to_string(),
                            property: property_name.to_string(),
                            details: format!("Non-finite values in table at index {}", i),
                        });
                    }
                    if *value < 0.0 {
                        return Err(SimulationError::MaterialError {
                            material: "unknown".to_string(),
                            property: property_name.to_string(),
                            details: format!("Negative property value in table at index {}: {}", i, value),
                        });
                    }
                }
                
                Ok(())
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
    /// Create a new material with validation
    pub fn new(name: String, density: f64, emissivity: f64) -> Result<Self> {
        // Validate input parameters
        crate::errors::validation::validate_non_empty_string(&name, "material name")?;
        crate::errors::validation::validate_positive(density, "density")?;
        crate::errors::validation::validate_range(emissivity, 0.0, 1.0, "emissivity")?;
        
        Ok(Self {
            name,
            density,
            thermal_conductivity: Property::Constant(50.0), // Default value
            specific_heat: Property::Constant(500.0),       // Default value
            emissivity,
            melting_point: None,
            latent_heat_fusion: None,
        })
    }
    
    /// Create a new material with all properties
    pub fn with_properties(
        name: String,
        density: f64,
        thermal_conductivity: Property,
        specific_heat: Property,
        emissivity: f64,
        melting_point: Option<f64>,
        latent_heat_fusion: Option<f64>,
    ) -> Result<Self> {
        // Validate input parameters
        crate::errors::validation::validate_non_empty_string(&name, "material name")?;
        crate::errors::validation::validate_positive(density, "density")?;
        crate::errors::validation::validate_range(emissivity, 0.0, 1.0, "emissivity")?;
        
        if let Some(mp) = melting_point {
            crate::errors::validation::validate_positive(mp, "melting point")?;
        }
        
        if let Some(lhf) = latent_heat_fusion {
            crate::errors::validation::validate_positive(lhf, "latent heat of fusion")?;
        }
        
        // Validate properties
        thermal_conductivity.validate("thermal_conductivity")?;
        specific_heat.validate("specific_heat")?;
        
        Ok(Self {
            name,
            density,
            thermal_conductivity,
            specific_heat,
            emissivity,
            melting_point,
            latent_heat_fusion,
        })
    }
    
    /// Get thermal conductivity at temperature
    pub fn get_thermal_conductivity(&self, temperature: f64, formula_engine: Option<&mut FormulaEngine>) -> Result<f64> {
        self.thermal_conductivity.evaluate(temperature, formula_engine)
    }
    
    /// Get specific heat at temperature
    pub fn get_specific_heat(&self, temperature: f64, formula_engine: Option<&mut FormulaEngine>) -> Result<f64> {
        self.specific_heat.evaluate(temperature, formula_engine)
    }
    
    /// Calculate effective specific heat including phase change effects (placeholder)
    pub fn effective_specific_heat(&self, temperature: f64, _delta_t: f64, formula_engine: Option<&mut FormulaEngine>) -> Result<f64> {
        // Placeholder implementation - will be completed in subsequent tasks
        self.get_specific_heat(temperature, formula_engine)
    }
    
    /// Validate all material properties
    pub fn validate(&self) -> Result<()> {
        crate::errors::validation::validate_non_empty_string(&self.name, "material name")?;
        crate::errors::validation::validate_positive(self.density, "density")?;
        crate::errors::validation::validate_range(self.emissivity, 0.0, 1.0, "emissivity")?;
        
        if let Some(mp) = self.melting_point {
            crate::errors::validation::validate_positive(mp, "melting point")?;
        }
        
        if let Some(lhf) = self.latent_heat_fusion {
            crate::errors::validation::validate_positive(lhf, "latent heat of fusion")?;
        }
        
        self.thermal_conductivity.validate("thermal_conductivity")?;
        self.specific_heat.validate("specific_heat")?;
        
        Ok(())
    }
    
    /// Check if material has phase change properties
    pub fn has_phase_change(&self) -> bool {
        self.melting_point.is_some() && self.latent_heat_fusion.is_some()
    }
    
    /// Get temperature range for property validity (if using tables)
    pub fn get_temperature_range(&self) -> (Option<f64>, Option<f64>) {
        let mut min_temp = None;
        let mut max_temp = None;
        
        if let Property::Table(table) = &self.thermal_conductivity {
            if !table.is_empty() {
                min_temp = Some(table[0].0);
                max_temp = Some(table[table.len() - 1].0);
            }
        }
        
        if let Property::Table(table) = &self.specific_heat {
            if !table.is_empty() {
                let table_min = table[0].0;
                let table_max = table[table.len() - 1].0;
                
                min_temp = match min_temp {
                    Some(current) => Some(current.max(table_min)),
                    None => Some(table_min),
                };
                
                max_temp = match max_temp {
                    Some(current) => Some(current.min(table_max)),
                    None => Some(table_max),
                };
            }
        }
        
        (min_temp, max_temp)
    }
}

impl Default for Material {
    fn default() -> Self {
        Self::new("Steel".to_string(), 7850.0, 0.8).unwrap()
    }
}

/// Predefined materials library with comprehensive material properties
pub struct MaterialLibrary;

impl MaterialLibrary {
    /// Get carbon steel material with temperature-dependent properties
    pub fn carbon_steel() -> Result<Material> {
        Material::with_properties(
            "Carbon Steel".to_string(),
            7850.0, // kg/m³
            Property::Formula("50.0 * (1.0 - 0.0003 * (T - 273.15))".to_string()), // W/(m·K) - decreases with temperature
            Property::Formula("460.0 + 0.27 * (T - 273.15)".to_string()), // J/(kg·K) - increases with temperature
            0.8,
            Some(1811.0), // K
            Some(247000.0), // J/kg
        )
    }
    
    /// Get stainless steel material (316L)
    pub fn stainless_steel() -> Result<Material> {
        Material::with_properties(
            "Stainless Steel".to_string(),
            8000.0, // kg/m³
            Property::Formula("16.0 + 0.012 * (T - 273.15)".to_string()), // W/(m·K) - increases with temperature
            Property::Formula("500.0 + 0.15 * (T - 273.15)".to_string()), // J/(kg·K)
            0.7,
            Some(1673.0), // K
            Some(247000.0), // J/kg
        )
    }
    
    /// Get aluminum material (pure aluminum)
    pub fn aluminum() -> Result<Material> {
        Material::with_properties(
            "Aluminum".to_string(),
            2700.0, // kg/m³
            Property::Formula("237.0 * (1.0 - 0.0004 * (T - 273.15))".to_string()), // W/(m·K)
            Property::Formula("900.0 + 0.2 * (T - 273.15)".to_string()), // J/(kg·K)
            0.9,
            Some(933.0), // K
            Some(397000.0), // J/kg
        )
    }
    
    /// Get copper material
    pub fn copper() -> Result<Material> {
        Material::with_properties(
            "Copper".to_string(),
            8960.0, // kg/m³
            Property::Formula("401.0 * (1.0 - 0.0006 * (T - 273.15))".to_string()), // W/(m·K)
            Property::Constant(385.0), // J/(kg·K) - relatively constant
            0.8,
            Some(1358.0), // K
            Some(205000.0), // J/kg
        )
    }
    
    /// Get iron material (pure iron)
    pub fn iron() -> Result<Material> {
        Material::with_properties(
            "Iron".to_string(),
            7874.0, // kg/m³
            Property::Formula("80.0 * (1.0 - 0.0005 * (T - 273.15))".to_string()), // W/(m·K)
            Property::Formula("449.0 + 0.3 * (T - 273.15)".to_string()), // J/(kg·K)
            0.85,
            Some(1811.0), // K
            Some(247000.0), // J/kg
        )
    }
    
    /// Get graphite material
    pub fn graphite() -> Result<Material> {
        Material::with_properties(
            "Graphite".to_string(),
            2200.0, // kg/m³
            Property::Formula("129.0 * (1.0 + 0.0002 * (T - 273.15))".to_string()), // W/(m·K)
            Property::Formula("709.0 + 0.4 * (T - 273.15)".to_string()), // J/(kg·K)
            0.9,
            Some(3773.0), // K (sublimation point)
            Some(59000.0), // J/kg (sublimation)
        )
    }
    
    /// Get concrete material
    pub fn concrete() -> Result<Material> {
        Material::with_properties(
            "Concrete".to_string(),
            2300.0, // kg/m³
            Property::Constant(1.7), // W/(m·K) - relatively constant
            Property::Constant(880.0), // J/(kg·K)
            0.9,
            None, // No melting point (decomposes)
            None,
        )
    }
    
    /// Get glass material (soda-lime glass)
    pub fn glass() -> Result<Material> {
        Material::with_properties(
            "Glass".to_string(),
            2500.0, // kg/m³
            Property::Constant(1.4), // W/(m·K)
            Property::Formula("840.0 + 0.1 * (T - 273.15)".to_string()), // J/(kg·K)
            0.9,
            Some(1773.0), // K (softening point)
            None, // No distinct melting point
        )
    }
    
    /// Get wood material (generic hardwood)
    pub fn wood() -> Result<Material> {
        Material::with_properties(
            "Wood".to_string(),
            600.0, // kg/m³
            Property::Constant(0.16), // W/(m·K)
            Property::Constant(1600.0), // J/(kg·K)
            0.9,
            None, // Decomposes before melting
            None,
        )
    }
    
    /// Get ceramic material (alumina)
    pub fn ceramic() -> Result<Material> {
        Material::with_properties(
            "Ceramic".to_string(),
            3970.0, // kg/m³
            Property::Formula("30.0 * (1.0 - 0.0003 * (T - 273.15))".to_string()), // W/(m·K)
            Property::Formula("775.0 + 0.15 * (T - 273.15)".to_string()), // J/(kg·K)
            0.8,
            Some(2327.0), // K
            Some(1070000.0), // J/kg
        )
    }
    
    /// List all available materials
    pub fn list_materials() -> Vec<String> {
        vec![
            "Carbon Steel".to_string(),
            "Stainless Steel".to_string(),
            "Aluminum".to_string(),
            "Copper".to_string(),
            "Iron".to_string(),
            "Graphite".to_string(),
            "Concrete".to_string(),
            "Glass".to_string(),
            "Wood".to_string(),
            "Ceramic".to_string(),
        ]
    }
    
    /// Get material by name
    pub fn get_material(name: &str) -> Result<Material> {
        match name {
            "Carbon Steel" => Self::carbon_steel(),
            "Stainless Steel" => Self::stainless_steel(),
            "Aluminum" => Self::aluminum(),
            "Copper" => Self::copper(),
            "Iron" => Self::iron(),
            "Graphite" => Self::graphite(),
            "Concrete" => Self::concrete(),
            "Glass" => Self::glass(),
            "Wood" => Self::wood(),
            "Ceramic" => Self::ceramic(),
            _ => Err(SimulationError::MaterialError {
                material: name.to_string(),
                property: "material".to_string(),
                details: format!("Unknown material: {}", name),
            }),
        }
    }
    
    /// Get all materials as a vector
    pub fn get_all_materials() -> Result<Vec<Material>> {
        let mut materials = Vec::new();
        for name in Self::list_materials() {
            materials.push(Self::get_material(&name)?);
        }
        Ok(materials)
    }
    
    /// Validate material name
    pub fn is_valid_material(name: &str) -> bool {
        Self::list_materials().contains(&name.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::formula::engine::FormulaEngine;
    
    #[test]
    fn test_material_creation() {
        let material = Material::new("Test".to_string(), 1000.0, 0.5).unwrap();
        assert_eq!(material.name, "Test");
        assert_eq!(material.density, 1000.0);
        assert_eq!(material.emissivity, 0.5);
    }
    
    #[test]
    fn test_material_validation() {
        // Valid material
        assert!(Material::new("Test".to_string(), 1000.0, 0.5).is_ok());
        
        // Invalid density
        assert!(Material::new("Test".to_string(), -1000.0, 0.5).is_err());
        
        // Invalid emissivity
        assert!(Material::new("Test".to_string(), 1000.0, 1.5).is_err());
        
        // Empty name
        assert!(Material::new("".to_string(), 1000.0, 0.5).is_err());
    }
    
    #[test]
    fn test_property_constant() {
        let prop = Property::Constant(100.0);
        assert_eq!(prop.evaluate(500.0, None).unwrap(), 100.0);
        
        // Test invalid constant
        let invalid_prop = Property::Constant(-100.0);
        assert!(invalid_prop.evaluate(500.0, None).is_err());
    }
    
    #[test]
    fn test_property_table() {
        let table = vec![(273.0, 10.0), (373.0, 20.0), (473.0, 30.0)];
        let prop = Property::Table(table);
        
        // Test interpolation
        assert_eq!(prop.evaluate(323.0, None).unwrap(), 15.0); // Midpoint
        
        // Test extrapolation (should clamp)
        assert_eq!(prop.evaluate(200.0, None).unwrap(), 10.0); // Below range
        assert_eq!(prop.evaluate(600.0, None).unwrap(), 30.0); // Above range
    }
    
    #[test]
    fn test_property_formula() {
        let mut engine = FormulaEngine::new();
        let prop = Property::Formula("T * 2.0".to_string());
        
        assert_eq!(prop.evaluate(100.0, Some(&mut engine)).unwrap(), 200.0);
        
        // Test without engine
        assert!(prop.evaluate(100.0, None).is_err());
    }
    
    #[test]
    fn test_property_validation() {
        // Valid constant
        let prop = Property::Constant(100.0);
        assert!(prop.validate("test").is_ok());
        
        // Invalid constant
        let prop = Property::Constant(-100.0);
        assert!(prop.validate("test").is_err());
        
        // Valid table
        let table = vec![(273.0, 10.0), (373.0, 20.0)];
        let prop = Property::Table(table);
        assert!(prop.validate("test").is_ok());
        
        // Invalid table (wrong order)
        let table = vec![(373.0, 10.0), (273.0, 20.0)];
        let prop = Property::Table(table);
        assert!(prop.validate("test").is_err());
        
        // Empty formula
        let prop = Property::Formula("".to_string());
        assert!(prop.validate("test").is_err());
    }
    
    #[test]
    fn test_material_library() {
        let materials = MaterialLibrary::list_materials();
        assert!(materials.len() >= 10); // Should have at least 10 materials
        assert!(materials.contains(&"Carbon Steel".to_string()));
        assert!(materials.contains(&"Aluminum".to_string()));
        assert!(materials.contains(&"Copper".to_string()));
        
        let steel = MaterialLibrary::get_material("Carbon Steel").unwrap();
        assert_eq!(steel.name, "Carbon Steel");
        assert_eq!(steel.density, 7850.0);
        assert!(steel.has_phase_change());
        
        // Test unknown material
        assert!(MaterialLibrary::get_material("Unknown").is_err());
    }
    
    #[test]
    fn test_material_properties_evaluation() {
        let mut engine = FormulaEngine::new();
        let steel = MaterialLibrary::get_material("Carbon Steel").unwrap();
        
        // Test thermal conductivity evaluation
        let k = steel.get_thermal_conductivity(300.0, Some(&mut engine)).unwrap();
        assert!(k > 0.0);
        
        // Test specific heat evaluation
        let cp = steel.get_specific_heat(300.0, Some(&mut engine)).unwrap();
        assert!(cp > 0.0);
    }
    
    #[test]
    fn test_material_temperature_range() {
        // Create material with table properties
        let table = vec![(273.0, 10.0), (373.0, 20.0), (473.0, 30.0)];
        let material = Material::with_properties(
            "Test".to_string(),
            1000.0,
            Property::Table(table.clone()),
            Property::Table(table),
            0.5,
            None,
            None,
        ).unwrap();
        
        let (min_temp, max_temp) = material.get_temperature_range();
        assert_eq!(min_temp, Some(273.0));
        assert_eq!(max_temp, Some(473.0));
    }
    
    #[test]
    fn test_all_predefined_materials() {
        // Test that all predefined materials can be created without errors
        for material_name in MaterialLibrary::list_materials() {
            let material = MaterialLibrary::get_material(&material_name);
            assert!(material.is_ok(), "Failed to create material: {}", material_name);
            
            let material = material.unwrap();
            assert!(material.validate().is_ok(), "Material validation failed: {}", material_name);
        }
    }
    
    #[test]
    fn test_material_validation_comprehensive() {
        let material = MaterialLibrary::get_material("Carbon Steel").unwrap();
        assert!(material.validate().is_ok());
        
        // Test material with invalid properties
        let invalid_material = Material {
            name: "".to_string(), // Invalid empty name
            density: -1000.0,     // Invalid negative density
            thermal_conductivity: Property::Constant(50.0),
            specific_heat: Property::Constant(500.0),
            emissivity: 1.5,      // Invalid emissivity > 1.0
            melting_point: Some(-100.0), // Invalid negative melting point
            latent_heat_fusion: Some(-1000.0), // Invalid negative latent heat
        };
        
        assert!(invalid_material.validate().is_err());
    }
}