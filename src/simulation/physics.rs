//-----------------------------------------------------------------------------
// File: simulation/physics.rs
// Main Responsibility: Implement physical models for heat transfer.
//
// This file implements the physical models for heat transfer, including radiation
// and convection sources. It defines the PlasmaTorch class with advanced
// configuration options, calculates view factors between torches and material
// points, and provides material property handling for temperature-dependent
// behavior. This component is responsible for the accurate physical modeling of
// heat transfer phenomena in the plasma furnace.
//-----------------------------------------------------------------------------

// Implementação aprimorada para suporte a múltiplas tochas e configurações avançadas

use ndarray::{Array2, Axis};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Constante de Stefan-Boltzmann (W/(m²·K⁴))
pub const STEFAN_BOLTZMANN: f64 = 5.67e-8;

/// Estrutura que representa as propriedades do material
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
}

impl MaterialProperties {
    /// Cria uma nova instância de propriedades de material com valores padrão
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
        }
    }

    /// Calcula a capacidade térmica efetiva considerando mudanças de fase
    pub fn effective_specific_heat(&self, temperature: f64, delta_t: f64) -> f64 {
        let mut c_eff = self.specific_heat;

        // Adicionar efeito da mudança de fase (fusão)
        if let (Some(mp), Some(lhf)) = (self.melting_point, self.latent_heat_fusion) {
            // Intervalo de suavização para a mudança de fase
            let phase_change_interval = 10.0;
            if (temperature - mp).abs() < phase_change_interval {
                c_eff += lhf / (2.0 * phase_change_interval);
            }
        }

        // Adicionar efeito da mudança de fase (vaporização)
        if let (Some(vp), Some(lhv)) = (self.vaporization_point, self.latent_heat_vaporization) {
            // Intervalo de suavização para a mudança de fase
            let phase_change_interval = 10.0;
            if (temperature - vp).abs() < phase_change_interval {
                c_eff += lhv / (2.0 * phase_change_interval);
            }
        }

        c_eff
    }
}

/// Estrutura que representa uma tocha de plasma com configuração avançada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlasmaTorch {
    /// ID único da tocha
    pub id: String,
    /// Posição radial (m)
    pub r_position: f64,
    /// Posição angular (graus)
    pub theta_position: f64,
    /// Posição axial (m)
    pub z_position: f64,
    /// Orientação - ângulo de inclinação (graus)
    pub pitch: f64,
    /// Orientação - ângulo de rotação (graus)
    pub yaw: f64,
    /// Potência (kW)
    pub power: f64,
    /// Fluxo de gás (kg/s)
    pub gas_flow: f64,
    /// Temperatura do gás (°C)
    pub gas_temperature: f64,
    /// Diâmetro da tocha (m)
    pub diameter: f64,
    /// Comprimento da tocha (m)
    pub length: f64,
    /// Tipo de gás (ar, argônio, etc.)
    pub gas_type: String,
}

impl PlasmaTorch {
    /// Cria uma nova tocha de plasma com configuração básica
    pub fn new(
        id: &str,
        r_position: f64,
        theta_position: f64,
        z_position: f64,
        pitch: f64,
        yaw: f64,
        power: f64,
        gas_flow: f64,
        gas_temperature: f64,
    ) -> Self {
        Self {
            id: id.to_string(),
            r_position,
            theta_position,
            z_position,
            pitch,
            yaw,
            power,
            gas_flow,
            gas_temperature,
            diameter: 0.05, // Valor padrão
            length: 0.2,    // Valor padrão
            gas_type: "Ar".to_string(), // Valor padrão
        }
    }

    /// Cria uma nova tocha de plasma com configuração completa
    pub fn new_with_details(
        id: &str,
        r_position: f64,
        theta_position: f64,
        z_position: f64,
        pitch: f64,
        yaw: f64,
        power: f64,
        gas_flow: f64,
        gas_temperature: f64,
        diameter: f64,
        length: f64,
        gas_type: &str,
    ) -> Self {
        Self {
            id: id.to_string(),
            r_position,
            theta_position,
            z_position,
            pitch,
            yaw,
            power,
            gas_flow,
            gas_temperature,
            diameter,
            length,
            gas_type: gas_type.to_string(),
        }
    }

    /// Converte a posição da tocha para coordenadas cartesianas
    pub fn get_cartesian_position(&self) -> (f64, f64, f64) {
        let x = self.r_position * self.theta_position.to_radians().cos();
        let y = self.r_position * self.theta_position.to_radians().sin();
        let z = self.z_position;
        (x, y, z)
    }

    /// Obtém o vetor de direção da tocha em coordenadas cartesianas
    pub fn get_direction_vector(&self) -> (f64, f64, f64) {
        // Converter ângulos para radianos
        let pitch_rad = self.pitch.to_radians();
        let yaw_rad = self.yaw.to_radians();
        
        // Calcular componentes do vetor de direção
        let dx = pitch_rad.sin() * yaw_rad.cos();
        let dy = pitch_rad.sin() * yaw_rad.sin();
        let dz = pitch_rad.cos();
        
        (dx, dy, dz)
    }

    /// Calcula o fator de visão da tocha para um ponto específico na malha (coordenadas cilíndricas)
    pub fn view_factor_cylindrical(&self, r: f64, theta: f64, z: f64) -> f64 {
        // Converter coordenadas cilíndricas para cartesianas
        let x = r * theta.cos();
        let y = r * theta.sin();
        
        // Obter posição da tocha em coordenadas cartesianas
        let (torch_x, torch_y, torch_z) = self.get_cartesian_position();
        
        // Calcular distância entre a tocha e o ponto
        let dx = x - torch_x;
        let dy = y - torch_y;
        let dz = z - torch_z;
        let distance_squared = dx * dx + dy * dy + dz * dz;
        
        if distance_squared < 1e-10 {
            return 0.0; // Evitar divisão por zero
        }
        
        // Obter vetor de direção da tocha
        let (torch_dir_x, torch_dir_y, torch_dir_z) = self.get_direction_vector();
        
        // Vetor normalizado da tocha para o ponto
        let distance = distance_squared.sqrt();
        let point_dir_x = dx / distance;
        let point_dir_y = dy / distance;
        let point_dir_z = dz / distance;
        
        // Produto escalar (cosseno do ângulo entre os vetores)
        let cos_angle = torch_dir_x * point_dir_x + torch_dir_y * point_dir_y + torch_dir_z * point_dir_z;
        
        // Fator de visão simplificado (lei do cosseno)
        let view_factor = cos_angle.max(0.0) / (PI * distance_squared);
        
        // Ajustar pelo diâmetro da tocha (área da fonte)
        let torch_area = PI * (self.diameter / 2.0).powi(2);
        view_factor * torch_area
    }

    /// Calcula o fator de visão da tocha para um ponto específico na malha (coordenadas cartesianas)
    pub fn view_factor(&self, r: f64, z: f64) -> f64 {
        // Compatibilidade com a versão anterior (assumindo theta=0)
        self.view_factor_cylindrical(r, 0.0, z)
    }
}

/// Estrutura que representa os termos fonte para a equação de calor
#[derive(Debug, Clone)]
pub struct HeatSources {
    /// Termo fonte de radiação (W/m³)
    pub radiation: Array2<f64>,
    /// Termo fonte de convecção (W/m³)
    pub convection: Array2<f64>,
    /// Termo fonte de mudança de fase (W/m³)
    pub phase_change: Array2<f64>,
}

impl HeatSources {
    /// Cria uma nova instância de termos fonte com arrays zerados
    pub fn new(nr: usize, nz: usize) -> Self {
        Self {
            radiation: Array2::<f64>::zeros((nr, nz)),
            convection: Array2::<f64>::zeros((nr, nz)),
            phase_change: Array2::<f64>::zeros((nr, nz)),
        }
    }

    /// Retorna a soma de todos os termos fonte
    pub fn total(&self) -> Array2<f64> {
        &self.radiation + &self.convection + &self.phase_change
    }
}

/// Calcula o termo fonte de radiação das tochas considerando múltiplas tochas e suas interações
pub fn calculate_radiation_source(
    mesh: &super::mesh::CylindricalMesh,
    torches: &[PlasmaTorch],
    temperature: &Array2<f64>,
    material: &MaterialProperties,
) -> Array2<f64> {
    let mut radiation_source = Array2::<f64>::zeros((mesh.nr, mesh.nz));
    
    for i in 0..mesh.nr {
        let r = mesh.r_coords[i];
        for j in 0..mesh.nz {
            let z = mesh.z_coords[j];
            let cell_temp = temperature[[i, j]];
            
            // Contribuição de cada tocha
            for torch in torches {
                // Para cada ponto angular (simplificação 2D -> 3D)
                let mut total_view_factor = 0.0;
                for k in 0..mesh.ntheta {
                    let theta = mesh.theta_coords[k];
                    total_view_factor += torch.view_factor_cylindrical(r, theta, z);
                }
                let avg_view_factor = total_view_factor / mesh.ntheta as f64;
                
                let torch_temp_kelvin = torch.gas_temperature + 273.15;
                let cell_temp_kelvin = cell_temp + 273.15;
                
                // Equação de transferência de calor por radiação
                let q_rad = material.emissivity * STEFAN_BOLTZMANN * avg_view_factor * 
                            (torch_temp_kelvin.powi(4) - cell_temp_kelvin.powi(4));
                
                // Converter para densidade de potência (W/m³)
                radiation_source[[i, j]] += q_rad / mesh.cell_volumes[[i, j]];
            }
        }
    }
    
    radiation_source
}

/// Calcula o termo fonte de convecção considerando múltiplas tochas
pub fn calculate_convection_source(
    mesh: &super::mesh::CylindricalMesh,
    torches: &[PlasmaTorch],
    temperature: &Array2<f64>,
    h_conv: f64,
) -> Array2<f64> {
    let mut convection_source = Array2::<f64>::zeros((mesh.nr, mesh.nz));
    
    // Mapa de influência das tochas (para cada célula, qual tocha tem maior influência)
    let mut torch_influence = Array2::<usize>::zeros((mesh.nr, mesh.nz));
    let mut max_influence = Array2::<f64>::zeros((mesh.nr, mesh.nz));
    
    // Determinar a tocha com maior influência em cada célula
    for i in 0..mesh.nr {
        let r = mesh.r_coords[i];
        for j in 0..mesh.nz {
            let z = mesh.z_coords[j];
            
            for (idx, torch) in torches.iter().enumerate() {
                let influence = torch.view_factor(r, z);
                if influence > max_influence[[i, j]] {
                    max_influence[[i, j]] = influence;
                    torch_influence[[i, j]] = idx;
                }
            }
        }
    }
    
    // Calcular convecção baseada na tocha com maior influência
    for i in 0..mesh.nr {
        let r = mesh.r_coords[i];
        for j in 0..mesh.nz {
            let z = mesh.z_coords[j];
            let cell_temp = temperature[[i, j]];
            
            // Obter a tocha com maior influência
            let torch_idx = torch_influence[[i, j]];
            if torch_idx < torches.len() {
                let torch = &torches[torch_idx];
                
                // Equação de transferência de calor por convecção
                let q_conv = h_conv * (torch.gas_temperature - cell_temp);
                
                // Ajustar pelo fator de visão para considerar a distância
                let view_factor = torch.view_factor(r, z);
                let adjusted_q_conv = q_conv * view_factor * 100.0; // Fator de escala para convecção
                
                // Converter para densidade de potência (W/m³)
                convection_source[[i, j]] = adjusted_q_conv / mesh.cell_volumes[[i, j]];
            }
        }
    }
    
    convection_source
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_torch_with_theta_position() {
        let torch = PlasmaTorch::new(
            "torch1",
            0.3,    // r_position
            45.0,   // theta_position (graus)
            0.5,    // z_position
            90.0,   // pitch
            0.0,    // yaw
            100.0,  // power
            0.01,   // gas_flow
            5000.0, // gas_temperature
        );
        
        // Verificar conversão para coordenadas cartesianas
        let (x, y, z) = torch.get_cartesian_position();
        
        // Para r=0.3, theta=45°, esperamos x=r*cos(theta), y=r*sin(theta)
        let expected_x = 0.3 * (45.0_f64.to_radians().cos());
        let expected_y = 0.3 * (45.0_f64.to_radians().sin());
        
        assert_relative_eq!(x, expected_x, epsilon = 1e-10);
        assert_relative_eq!(y, expected_y, epsilon = 1e-10);
        assert_relative_eq!(z, 0.5, epsilon = 1e-10);
    }

    #[test]
    fn test_torch_direction_vector() {
        let torch = PlasmaTorch::new(
            "torch1",
            0.0,    // r_position
            0.0,    // theta_position
            0.0,    // z_position
            45.0,   // pitch (45° da vertical)
            90.0,   // yaw (90° no plano horizontal)
            100.0,  // power
            0.01,   // gas_flow
            5000.0, // gas_temperature
        );
        
        let (dx, dy, dz) = torch.get_direction_vector();
        
        // Para pitch=45°, yaw=90°, esperamos direção (0, 0.7071, 0.7071)
        assert_relative_eq!(dx, 0.0, epsilon = 1e-4);
        assert_relative_eq!(dy, 0.7071, epsilon = 1e-4);
        assert_relative_eq!(dz, 0.7071, epsilon = 1e-4);
    }

    #[test]
    fn test_view_factor_cylindrical() {
        let torch = PlasmaTorch::new(
            "torch1",
            0.0,    // r_position
            0.0,    // theta_position
            0.0,    // z_position
            90.0,   // pitch (horizontal)
            0.0,    // yaw (direção +x)
            100.0,  // power
            0.01,   // gas_flow
            5000.0, // gas_temperature
        );
        
        // Ponto na direção da tocha
        let vf1 = torch.view_factor_cylindrical(1.0, 0.0, 0.0);
        
        // Ponto perpendicular à direção da tocha
        let vf2 = torch.view_factor_cylindrical(0.0, 0.0, 1.0);
        
        // Ponto na direção oposta
        let vf3 = torch.view_factor_cylindrical(-1.0, 0.0, 0.0);
        
        // O fator de visão deve ser maior na direção da tocha
        assert!(vf1 > vf2);
        
        // O fator de visão deve ser zero na direção oposta (cos < 0)
        assert_relative_eq!(vf3, 0.0);
    }
}
