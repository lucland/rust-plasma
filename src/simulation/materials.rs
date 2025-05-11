//-----------------------------------------------------------------------------
// File: simulation/materials.rs
// Main Responsibility: Manage material properties and phase changes.
//
// This file handles all material-related functionality, including defining 
// material properties and their temperature-dependent behavior. It implements
// support for phase changes (like melting and vaporization) and provides a 
// library of predefined materials with realistic properties. This component
// is essential for accurate physical modeling of different materials in the
// plasma furnace simulation.
//-----------------------------------------------------------------------------
// Este arquivo contém as seguintes funções e métodos:
//
// MaterialProperties:
//   - new(): Cria uma nova instância com valores básicos de propriedades
//   - with_phase_change(): Adiciona propriedades de mudança de fase ao material
//   - with_temperature_dependence(): Configura coeficientes para propriedades dependentes da temperatura
//   - get_specific_heat(): Calcula a capacidade térmica específica para uma dada temperatura
//   - get_thermal_conductivity(): Calcula a condutividade térmica para uma dada temperatura
//   - get_density(): Calcula a densidade para uma dada temperatura
//   - get_enthalpy_change(): Calcula a mudança de entalpia entre temperaturas considerando calor latente
//
// MaterialLibrary:
//   - new(): Cria uma nova biblioteca vazia de materiais
//   - add_material(): Adiciona um material à biblioteca
//   - get_material(): Recupera um material da biblioteca pelo nome
//   - load_default_materials(): Carrega materiais predefinidos na biblioteca
//   - create_material_from_composition(): Cria um material composto baseado em porcentagens

// Implementação expandida para propriedades de materiais com suporte a mudanças de fase

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::f64::consts::PI;

/// Constante de Stefan-Boltzmann (W/(m²·K⁴))
pub const STEFAN_BOLTZMANN: f64 = 5.67e-8;

/// Estrutura que representa as propriedades do material com suporte a dependência de temperatura
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialProperties {
    /// Nome do material
    pub name: String,
    /// Densidade (kg/m³)
    pub density: f64,
    /// Conteúdo de umidade (%)
    pub moisture_content: f64,
    /// Capacidade térmica específica (J/(kg·K))
    pub specific_heat: f64,
    /// Condutividade térmica (W/(m·K))
    pub thermal_conductivity: f64,
    /// Emissividade (0-1)
    pub emissivity: f64,
    /// Temperatura de fusão (°C)
    pub melting_point: Option<f64>,
    /// Calor latente de fusão (J/kg)
    pub latent_heat_fusion: Option<f64>,
    /// Temperatura de vaporização (°C)
    pub vaporization_point: Option<f64>,
    /// Calor latente de vaporização (J/kg)
    pub latent_heat_vaporization: Option<f64>,
    /// Coeficientes para capacidade térmica específica dependente da temperatura
    pub specific_heat_coefficients: Option<Vec<f64>>,
    /// Coeficientes para condutividade térmica dependente da temperatura
    pub thermal_conductivity_coefficients: Option<Vec<f64>>,
    /// Coeficientes para densidade dependente da temperatura
    pub density_coefficients: Option<Vec<f64>>,
    /// Temperatura de referência para os coeficientes (°C)
    pub reference_temperature: Option<f64>,
}

impl MaterialProperties {
    /// Cria uma nova instância de propriedades de material com valores básicos
    pub fn new(name: &str, density: f64, specific_heat: f64, thermal_conductivity: f64) -> Self {
        Self {
            name: name.to_string(),
            density,
            moisture_content: 0.0,
            specific_heat,
            thermal_conductivity,
            emissivity: 0.9,
            melting_point: None,
            latent_heat_fusion: None,
            vaporization_point: None,
            latent_heat_vaporization: None,
            specific_heat_coefficients: None,
            thermal_conductivity_coefficients: None,
            density_coefficients: None,
            reference_temperature: None,
        }
    }

    /// Calcula a capacidade térmica específica para uma temperatura específica
    pub fn get_specific_heat(&self, temperature: f64) -> f64 {
        if let Some(coeffs) = &self.specific_heat_coefficients {
            if let Some(t_ref) = self.reference_temperature {
                // Temperatura normalizada
                let t_norm = (temperature - t_ref) / 100.0;
                
                // Polinômio: c0 + c1*t + c2*t^2 + c3*t^3 + ...
                let mut result = 0.0;
                for (i, coeff) in coeffs.iter().enumerate() {
                    result += coeff * t_norm.powi(i as i32);
                }
                return result.max(0.0); // Garantir valor positivo
            }
        }
        
        // Valor constante se não houver coeficientes
        self.specific_heat
    }

    /// Calcula a condutividade térmica para uma temperatura específica
    pub fn get_thermal_conductivity(&self, temperature: f64) -> f64 {
        if let Some(coeffs) = &self.thermal_conductivity_coefficients {
            if let Some(t_ref) = self.reference_temperature {
                // Temperatura normalizada
                let t_norm = (temperature - t_ref) / 100.0;
                
                // Polinômio: c0 + c1*t + c2*t^2 + c3*t^3 + ...
                let mut result = 0.0;
                for (i, coeff) in coeffs.iter().enumerate() {
                    result += coeff * t_norm.powi(i as i32);
                }
                return result.max(0.0); // Garantir valor positivo
            }
        }
        
        // Valor constante se não houver coeficientes
        self.thermal_conductivity
    }

    /// Calcula a densidade para uma temperatura específica
    pub fn get_density(&self, temperature: f64) -> f64 {
        if let Some(coeffs) = &self.density_coefficients {
            if let Some(t_ref) = self.reference_temperature {
                // Temperatura normalizada
                let t_norm = (temperature - t_ref) / 100.0;
                
                // Polinômio: c0 + c1*t + c2*t^2 + c3*t^3 + ...
                let mut result = 0.0;
                for (i, coeff) in coeffs.iter().enumerate() {
                    result += coeff * t_norm.powi(i as i32);
                }
                return result.max(0.0); // Garantir valor positivo
            }
        }
        
        // Valor constante se não houver coeficientes
        self.density
    }

    /// Calcula a capacidade térmica efetiva considerando mudanças de fase
    pub fn effective_specific_heat(&self, temperature: f64, delta_t: f64) -> f64 {
        let mut c_eff = self.get_specific_heat(temperature);

        // Adicionar efeito da mudança de fase (fusão)
        if let (Some(mp), Some(lhf)) = (self.melting_point, self.latent_heat_fusion) {
            // Intervalo de suavização para a mudança de fase
            let phase_change_interval = 10.0;
            if (temperature - mp).abs() < phase_change_interval {
                // Distribuição gaussiana para suavizar a transição
                let gaussian = (-0.5 * ((temperature - mp) / (phase_change_interval / 2.0)).powi(2)).exp();
                c_eff += lhf * gaussian / (phase_change_interval * (2.0 * PI).sqrt());
            }
        }

        // Adicionar efeito da mudança de fase (vaporização)
        if let (Some(vp), Some(lhv)) = (self.vaporization_point, self.latent_heat_vaporization) {
            // Intervalo de suavização para a mudança de fase
            let phase_change_interval = 10.0;
            if (temperature - vp).abs() < phase_change_interval {
                // Distribuição gaussiana para suavizar a transição
                let gaussian = (-0.5 * ((temperature - vp) / (phase_change_interval / 2.0)).powi(2)).exp();
                c_eff += lhv * gaussian / (phase_change_interval * (2.0 * PI).sqrt());
            }
        }

        // Adicionar efeito da evaporação da umidade
        if self.moisture_content > 0.0 {
            // Temperatura de evaporação da água
            let water_evaporation_temp = 100.0;
            let phase_change_interval = 5.0;
            
            if (temperature - water_evaporation_temp).abs() < phase_change_interval {
                // Calor latente de vaporização da água (J/kg)
                let water_latent_heat = 2260000.0;
                
                // Distribuição gaussiana para suavizar a transição
                let gaussian = (-0.5 * ((temperature - water_evaporation_temp) / (phase_change_interval / 2.0)).powi(2)).exp();
                c_eff += self.moisture_content / 100.0 * water_latent_heat * gaussian / 
                        (phase_change_interval * (2.0 * PI).sqrt());
            }
        }

        c_eff
    }
}

/// Biblioteca de materiais pré-definidos
pub struct MaterialLibrary {
    materials: HashMap<String, MaterialProperties>,
}

impl MaterialLibrary {
    /// Cria uma nova biblioteca de materiais com materiais pré-definidos
    pub fn new() -> Self {
        let mut library = Self {
            materials: HashMap::new(),
        };
        
        // Adicionar materiais pré-definidos
        library.add_predefined_materials();
        
        library
    }
    
    /// Adiciona materiais pré-definidos à biblioteca
    fn add_predefined_materials(&mut self) {
        // Aço carbono
        let steel = MaterialProperties {
            name: "Aço Carbono".to_string(),
            density: 7850.0,
            moisture_content: 0.0,
            specific_heat: 490.0,
            thermal_conductivity: 45.0,
            emissivity: 0.8,
            melting_point: Some(1450.0),
            latent_heat_fusion: Some(270000.0),
            vaporization_point: Some(3000.0),
            latent_heat_vaporization: Some(6340000.0),
            specific_heat_coefficients: Some(vec![490.0, 0.5, 0.0, 0.0]),
            thermal_conductivity_coefficients: Some(vec![45.0, -0.05, 0.0, 0.0]),
            density_coefficients: Some(vec![7850.0, -0.5, 0.0, 0.0]),
            reference_temperature: Some(25.0),
        };
        self.materials.insert("steel".to_string(), steel);
        
        // Alumínio
        let aluminum = MaterialProperties {
            name: "Alumínio".to_string(),
            density: 2700.0,
            moisture_content: 0.0,
            specific_heat: 900.0,
            thermal_conductivity: 237.0,
            emissivity: 0.7,
            melting_point: Some(660.0),
            latent_heat_fusion: Some(397000.0),
            vaporization_point: Some(2520.0),
            latent_heat_vaporization: Some(10500000.0),
            specific_heat_coefficients: Some(vec![900.0, 0.5, 0.0, 0.0]),
            thermal_conductivity_coefficients: Some(vec![237.0, -0.05, 0.0, 0.0]),
            density_coefficients: Some(vec![2700.0, -0.1, 0.0, 0.0]),
            reference_temperature: Some(25.0),
        };
        self.materials.insert("aluminum".to_string(), aluminum);
        
        // Cobre
        let copper = MaterialProperties {
            name: "Cobre".to_string(),
            density: 8960.0,
            moisture_content: 0.0,
            specific_heat: 385.0,
            thermal_conductivity: 401.0,
            emissivity: 0.6,
            melting_point: Some(1085.0),
            latent_heat_fusion: Some(205000.0),
            vaporization_point: Some(2560.0),
            latent_heat_vaporization: Some(4730000.0),
            specific_heat_coefficients: Some(vec![385.0, 0.1, 0.0, 0.0]),
            thermal_conductivity_coefficients: Some(vec![401.0, -0.06, 0.0, 0.0]),
            density_coefficients: Some(vec![8960.0, -0.5, 0.0, 0.0]),
            reference_temperature: Some(25.0),
        };
        self.materials.insert("copper".to_string(), copper);
        
        // Concreto
        let concrete = MaterialProperties {
            name: "Concreto".to_string(),
            density: 2300.0,
            moisture_content: 2.0,
            specific_heat: 880.0,
            thermal_conductivity: 1.4,
            emissivity: 0.94,
            melting_point: None,
            latent_heat_fusion: None,
            vaporization_point: None,
            latent_heat_vaporization: None,
            specific_heat_coefficients: Some(vec![880.0, 0.2, 0.0, 0.0]),
            thermal_conductivity_coefficients: Some(vec![1.4, -0.001, 0.0, 0.0]),
            density_coefficients: None,
            reference_temperature: Some(25.0),
        };
        self.materials.insert("concrete".to_string(), concrete);
        
        // Madeira
        let wood = MaterialProperties {
            name: "Madeira".to_string(),
            density: 700.0,
            moisture_content: 12.0,
            specific_heat: 1700.0,
            thermal_conductivity: 0.16,
            emissivity: 0.9,
            melting_point: None,
            latent_heat_fusion: None,
            vaporization_point: None,
            latent_heat_vaporization: None,
            specific_heat_coefficients: None,
            thermal_conductivity_coefficients: None,
            density_coefficients: None,
            reference_temperature: None,
        };
        self.materials.insert("wood".to_string(), wood);
        
        // Vidro
        let glass = MaterialProperties {
            name: "Vidro".to_string(),
            density: 2500.0,
            moisture_content: 0.0,
            specific_heat: 840.0,
            thermal_conductivity: 0.8,
            emissivity: 0.95,
            melting_point: Some(1400.0),
            latent_heat_fusion: Some(140000.0),
            vaporization_point: None,
            latent_heat_vaporization: None,
            specific_heat_coefficients: None,
            thermal_conductivity_coefficients: None,
            density_coefficients: None,
            reference_temperature: None,
        };
        self.materials.insert("glass".to_string(), glass);
    }
    
    /// Obtém um material pelo ID
    pub fn get_material(&self, id: &str) -> Option<&MaterialProperties> {
        self.materials.get(id)
    }
    
    /// Obtém uma cópia de um material pelo ID
    pub fn get_material_clone(&self, id: &str) -> Option<MaterialProperties> {
        self.materials.get(id).cloned()
    }
    
    /// Adiciona ou atualiza um material na biblioteca
    pub fn add_material(&mut self, id: &str, material: MaterialProperties) {
        self.materials.insert(id.to_string(), material);
    }
    
    /// Remove um material da biblioteca
    pub fn remove_material(&mut self, id: &str) -> bool {
        self.materials.remove(id).is_some()
    }
    
    /// Obtém todos os IDs de materiais disponíveis
    pub fn get_material_ids(&self) -> Vec<String> {
        self.materials.keys().cloned().collect()
    }
    
    /// Obtém todos os nomes de materiais disponíveis com seus IDs
    pub fn get_material_names(&self) -> Vec<(String, String)> {
        self.materials.iter()
            .map(|(id, material)| (id.clone(), material.name.clone()))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_material_properties_with_temperature_dependence() {
        let mut material = MaterialProperties::new("Test Material", 1000.0, 1500.0, 0.5);
        
        // Configurar coeficientes para dependência de temperatura
        material.specific_heat_coefficients = Some(vec![1500.0, 2.0, 0.01]);
        material.thermal_conductivity_coefficients = Some(vec![0.5, 0.001]);
        material.reference_temperature = Some(25.0);
        
        // Testar capacidade térmica específica a diferentes temperaturas
        let cp_25 = material.get_specific_heat(25.0);
        let cp_125 = material.get_specific_heat(125.0);
        
        // A 25°C (temperatura de referência), deve ser igual ao coeficiente c0
        assert_relative_eq!(cp_25, 1500.0);
        
        // A 125°C, deve ser c0 + c1*1 + c2*1^2 (t_norm = (125-25)/100 = 1)
        assert_relative_eq!(cp_125, 1500.0 + 2.0 + 0.01);
    }

    #[test]
    fn test_effective_specific_heat_with_phase_change() {
        let mut material = MaterialProperties::new("Test Material", 1000.0, 1500.0, 0.5);
        
        // Configurar ponto de fusão e calor latente
        material.melting_point = Some(100.0);
        material.latent_heat_fusion = Some(200000.0);
        
        // Testar capacidade térmica efetiva longe do ponto de fusão
        let cp_eff_25 = material.effective_specific_heat(25.0, 1.0);
        assert_relative_eq!(cp_eff_25, 1500.0, epsilon = 1.0);
        
        // Testar capacidade térmica efetiva próximo ao ponto de fusão
        let cp_eff_100 = material.effective_specific_heat(100.0, 1.0);
        assert!(cp_eff_100 > 1500.0); // Deve ser maior devido ao calor latente
    }

    #[test]
    fn test_material_library() {
        let library = MaterialLibrary::new();
        
        // Verificar se os materiais pré-definidos foram adicionados
        assert!(library.get_material("steel").is_some());
        assert!(library.get_material("aluminum").is_some());
        assert!(library.get_material("copper").is_some());
        
        // Verificar propriedades de um material
        let steel = library.get_material("steel").unwrap();
        assert_eq!(steel.name, "Aço Carbono");
        assert_relative_eq!(steel.density, 7850.0);
        assert!(steel.melting_point.is_some());
    }
}
