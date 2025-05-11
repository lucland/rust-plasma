//-----------------------------------------------------------------------------
// File: simulation/mesh.rs
// Main Responsibility: Spatial discretization for the simulation domain.
//
// This file implements the cylindrical mesh discretization that serves as the
// spatial framework for the simulation. It handles coordinate transformations
// between cylindrical and Cartesian systems, manages zone mapping for different
// materials, and provides utilities for working with the mesh geometry. This
// component is fundamental for the finite difference method used in the heat
// transfer calculations.
//-----------------------------------------------------------------------------
// Implementação da malha cilíndrica para simulação de fornalha de plasma
//
// Este arquivo contém as seguintes funções/métodos:
// 
// - CylindricalMesh::new: Cria uma nova malha cilíndrica com dimensões e resolução especificadas
// - CylindricalMesh::create_uniform_mesh: Cria uma malha com espaçamento uniforme
// - CylindricalMesh::create_nonuniform_mesh: Cria uma malha com espaçamento não uniforme para maior precisão em áreas críticas
// - CylindricalMesh::get_node_position: Retorna a posição cartesiana (x,y,z) de um nó da malha
// - CylindricalMesh::get_cell_volume: Calcula o volume de uma célula específica
// - CylindricalMesh::set_zone_map: Define um mapa de zonas para diferentes materiais ou regiões
// - CylindricalMesh::get_zone_at: Retorna a zona em uma posição específica da malha
// - CylindricalMesh::get_neighbors: Retorna os índices dos nós vizinhos para cálculos de diferenças finitas
// - CylindricalMesh::refine_mesh: Refina a malha em regiões específicas para maior precisão
// - CylindricalMesh::export_mesh: Exporta a malha para formato VTK ou outro formato de visualização

// Implementação aprimorada para suporte a múltiplas tochas e configurações de geometria

use ndarray::{Array1, Array2, Array3};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Estrutura que representa a malha de discretização cilíndrica com suporte a geometria avançada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CylindricalMesh {
    /// Altura do cilindro (m)
    pub height: f64,
    /// Raio do cilindro (m)
    pub radius: f64,
    /// Número de nós na direção radial
    pub nr: usize,
    /// Número de nós na direção axial
    pub nz: usize,
    /// Número de nós na direção angular (para visualização 3D)
    pub ntheta: usize,
    /// Coordenadas radiais dos nós (m)
    pub r_coords: Array1<f64>,
    /// Coordenadas axiais dos nós (m)
    pub z_coords: Array1<f64>,
    /// Coordenadas angulares dos nós (radianos) - para visualização 3D
    pub theta_coords: Array1<f64>,
    /// Tamanho do passo radial (m)
    pub dr: f64,
    /// Tamanho do passo axial (m)
    pub dz: f64,
    /// Tamanho do passo angular (radianos)
    pub dtheta: f64,
    /// Volumes dos elementos da malha (m³)
    pub cell_volumes: Array2<f64>,
    /// Mapa de zonas (opcional) - identifica diferentes zonas no cilindro
    pub zone_map: Option<Array2<usize>>,
}

impl CylindricalMesh {
    /// Cria uma nova malha cilíndrica com dimensões e número de nós especificados
    pub fn new(height: f64, radius: f64, nr: usize, nz: usize, ntheta: usize) -> Self {
        // Validação de entrada
        assert!(height > 0.0, "Altura deve ser positiva");
        assert!(radius > 0.0, "Raio deve ser positivo");
        assert!(nr >= 2, "Número de nós radiais deve ser pelo menos 2");
        assert!(nz >= 2, "Número de nós axiais deve ser pelo menos 2");
        assert!(ntheta >= 4, "Número de nós angulares deve ser pelo menos 4");

        // Calcular tamanhos de passo
        let dr = radius / (nr as f64 - 1.0);
        let dz = height / (nz as f64 - 1.0);
        let dtheta = 2.0 * PI / ntheta as f64;

        // Criar coordenadas
        let r_coords = Array1::linspace(0.0, radius, nr);
        let z_coords = Array1::linspace(0.0, height, nz);
        let theta_coords = Array1::linspace(0.0, 2.0 * PI * (1.0 - 1.0 / ntheta as f64), ntheta);

        // Calcular volumes dos elementos
        let mut cell_volumes = Array2::<f64>::zeros((nr, nz));
        for i in 0..nr {
            for j in 0..nz {
                // Para o eixo central (r=0), usamos um volume especial
                if i == 0 {
                    let r_outer = r_coords[i + 1];
                    cell_volumes[[i, j]] = PI * r_outer * r_outer * dz / 4.0;
                } else if i == nr - 1 {
                    // Para a borda externa
                    let r_inner = r_coords[i - 1];
                    let r_center = r_coords[i];
                    cell_volumes[[i, j]] = PI * (r_center * r_center - r_inner * r_inner) * dz / 2.0;
                } else {
                    // Para nós internos
                    let r_inner = r_coords[i - 1];
                    let r_outer = r_coords[i + 1];
                    cell_volumes[[i, j]] = PI * (r_outer * r_outer - r_inner * r_inner) * dz / 4.0;
                }
            }
        }

        Self {
            height,
            radius,
            nr,
            nz,
            ntheta,
            r_coords,
            z_coords,
            theta_coords,
            dr,
            dz,
            dtheta,
            cell_volumes,
            zone_map: None,
        }
    }

    /// Define zonas na malha para diferentes materiais ou condições
    pub fn set_zones(&mut self, zone_map: Array2<usize>) {
        assert_eq!(zone_map.shape(), &[self.nr, self.nz], "Dimensões do mapa de zonas devem corresponder à malha");
        self.zone_map = Some(zone_map);
    }

    /// Retorna o volume total do cilindro
    pub fn total_volume(&self) -> f64 {
        PI * self.radius * self.radius * self.height
    }

    /// Retorna o índice do nó mais próximo às coordenadas dadas
    pub fn nearest_node_index(&self, r: f64, z: f64) -> (usize, usize) {
        let i = (r / self.dr).round() as usize;
        let j = (z / self.dz).round() as usize;
        
        // Limitar aos índices válidos
        let i = i.min(self.nr - 1);
        let j = j.min(self.nz - 1);
        
        (i, j)
    }

    /// Retorna o índice do nó mais próximo às coordenadas 3D dadas
    pub fn nearest_node_index_3d(&self, r: f64, theta: f64, z: f64) -> (usize, usize, usize) {
        let i = (r / self.dr).round() as usize;
        
        // Normalizar theta para [0, 2π)
        let normalized_theta = theta % (2.0 * PI);
        let k = (normalized_theta / self.dtheta).round() as usize % self.ntheta;
        
        let j = (z / self.dz).round() as usize;
        
        // Limitar aos índices válidos
        let i = i.min(self.nr - 1);
        let j = j.min(self.nz - 1);
        
        (i, k, j)
    }

    /// Converte coordenadas cartesianas para cilíndricas
    pub fn cartesian_to_cylindrical(&self, x: f64, y: f64, z: f64) -> (f64, f64, f64) {
        let r = (x * x + y * y).sqrt();
        let theta = y.atan2(x);
        (r, theta, z)
    }

    /// Converte coordenadas cilíndricas para cartesianas
    pub fn cylindrical_to_cartesian(&self, r: f64, theta: f64, z: f64) -> (f64, f64, f64) {
        let x = r * theta.cos();
        let y = r * theta.sin();
        (x, y, z)
    }

    /// Cria um array 3D inicializado com zeros para armazenar dados de temperatura
    /// A terceira dimensão é para passos de tempo
    pub fn create_temperature_array(&self, time_steps: usize) -> Array3<f64> {
        Array3::<f64>::zeros((self.nr, self.nz, time_steps))
    }

    /// Cria um array 3D para visualização 3D (r, theta, z)
    pub fn create_3d_temperature_array(&self, time_step: usize) -> Array3<f64> {
        Array3::<f64>::zeros((self.nr, self.ntheta, self.nz))
    }

    /// Cria um array 2D inicializado com um valor constante
    pub fn create_constant_field(&self, value: f64) -> Array2<f64> {
        Array2::<f64>::from_elem((self.nr, self.nz), value)
    }

    /// Retorna a zona de um nó específico
    pub fn get_node_zone(&self, i: usize, j: usize) -> Option<usize> {
        self.zone_map.as_ref().map(|zones| zones[[i, j]])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_mesh_creation_with_theta() {
        let height = 1.0;
        let radius = 0.5;
        let nr = 5;
        let nz = 10;
        let ntheta = 8;
        
        let mesh = CylindricalMesh::new(height, radius, nr, nz, ntheta);
        
        assert_eq!(mesh.nr, nr);
        assert_eq!(mesh.nz, nz);
        assert_eq!(mesh.ntheta, ntheta);
        assert_eq!(mesh.r_coords.len(), nr);
        assert_eq!(mesh.z_coords.len(), nz);
        assert_eq!(mesh.theta_coords.len(), ntheta);
        assert_relative_eq!(mesh.r_coords[0], 0.0);
        assert_relative_eq!(mesh.r_coords[nr-1], radius);
        assert_relative_eq!(mesh.z_coords[0], 0.0);
        assert_relative_eq!(mesh.z_coords[nz-1], height);
        assert_relative_eq!(mesh.theta_coords[0], 0.0);
        assert_relative_eq!(mesh.theta_coords[ntheta-1], 2.0 * PI * (ntheta - 1) as f64 / ntheta as f64);
    }

    #[test]
    fn test_coordinate_conversions() {
        let mesh = CylindricalMesh::new(1.0, 0.5, 5, 10, 8);
        
        // Teste de conversão de coordenadas
        let (r, theta, z) = (0.3, PI/4.0, 0.7);
        let (x, y, z_cart) = mesh.cylindrical_to_cartesian(r, theta, z);
        let (r_back, theta_back, z_back) = mesh.cartesian_to_cylindrical(x, y, z_cart);
        
        assert_relative_eq!(r, r_back, epsilon = 1e-10);
        assert_relative_eq!(theta, theta_back, epsilon = 1e-10);
        assert_relative_eq!(z, z_back, epsilon = 1e-10);
    }

    #[test]
    fn test_zone_mapping() {
        let mut mesh = CylindricalMesh::new(1.0, 0.5, 5, 10, 8);
        
        // Criar um mapa de zonas simples (2 zonas)
        let mut zone_map = Array2::<usize>::zeros((5, 10));
        for i in 0..5 {
            for j in 0..10 {
                if j < 5 {
                    zone_map[[i, j]] = 0; // Zona inferior
                } else {
                    zone_map[[i, j]] = 1; // Zona superior
                }
            }
        }
        
        mesh.set_zones(zone_map);
        
        // Verificar zonas
        assert_eq!(mesh.get_node_zone(2, 2), Some(0)); // Zona inferior
        assert_eq!(mesh.get_node_zone(2, 7), Some(1)); // Zona superior
    }
}
