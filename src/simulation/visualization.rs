//-----------------------------------------------------------------------------
// File: simulation/visualization.rs
// Main Responsibility: Prepare simulation data for visual representation.
//
// This file implements the data structures and transformation methods needed
// to visualize the simulation results in both 2D and 3D. It supports multiple
// visualization modes including slice views, 3D rendering with meshes, time
// series animations, and heat maps. The component transforms raw simulation
// data into formats optimized for rendering, enabling researchers to gain
// visual insights into temperature distribution and other physical phenomena.
//-----------------------------------------------------------------------------

// Implementação de visualização avançada para dados de simulação

use ndarray::{Array2, Array3, Axis};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Estrutura que representa dados para visualização 3D
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizationData3D {
    /// Dimensões da malha
    pub dimensions: (usize, usize, usize),
    /// Coordenadas dos vértices (x, y, z)
    pub vertices: Vec<(f64, f64, f64)>,
    /// Índices dos vértices para formar faces
    pub faces: Vec<(usize, usize, usize)>,
    /// Valores de temperatura nos vértices
    pub values: Vec<f64>,
    /// Valores mínimo e máximo de temperatura
    pub range: (f64, f64),
    /// Passo de tempo atual
    pub time_step: usize,
    /// Tempo total da simulação
    pub total_time: f64,
}

/// Estrutura que representa dados para visualização de corte
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SliceVisualizationData {
    /// Tipo de corte (radial, axial, angular)
    pub slice_type: SliceType,
    /// Posição do corte
    pub position: f64,
    /// Dimensões da malha de corte
    pub dimensions: (usize, usize),
    /// Coordenadas dos vértices no corte (x, y)
    pub vertices: Vec<(f64, f64)>,
    /// Valores de temperatura nos vértices
    pub values: Vec<f64>,
    /// Valores mínimo e máximo de temperatura
    pub range: (f64, f64),
    /// Passo de tempo atual
    pub time_step: usize,
}

/// Tipos de corte para visualização
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SliceType {
    /// Corte radial (plano r-θ)
    Radial,
    /// Corte axial (plano r-z)
    Axial,
    /// Corte angular (plano θ-z)
    Angular,
}

/// Estrutura que representa dados para visualização de fluxo de calor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeatFluxVisualizationData {
    /// Dimensões da malha
    pub dimensions: (usize, usize),
    /// Coordenadas dos pontos (x, y)
    pub points: Vec<(f64, f64)>,
    /// Vetores de fluxo de calor (dx, dy)
    pub vectors: Vec<(f64, f64)>,
    /// Magnitudes dos vetores de fluxo
    pub magnitudes: Vec<f64>,
    /// Valores mínimo e máximo de magnitude
    pub range: (f64, f64),
    /// Passo de tempo atual
    pub time_step: usize,
}

/// Estrutura que representa dados para visualização de isosuperfícies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IsosurfaceData {
    /// Valor de temperatura da isosuperfície
    pub iso_value: f64,
    /// Vértices da isosuperfície (x, y, z)
    pub vertices: Vec<(f64, f64, f64)>,
    /// Faces da isosuperfície (índices de vértices)
    pub faces: Vec<(usize, usize, usize)>,
    /// Normais dos vértices para sombreamento
    pub normals: Vec<(f64, f64, f64)>,
    /// Passo de tempo atual
    pub time_step: usize,
}

/// Estrutura que representa opções de visualização
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizationOptions {
    /// Modo de visualização
    pub mode: VisualizationMode,
    /// Escala de cores
    pub color_scale: ColorScale,
    /// Mostrar malha
    pub show_grid: bool,
    /// Mostrar tochas
    pub show_torches: bool,
    /// Mostrar vetores de fluxo de calor
    pub show_heat_flux: bool,
    /// Mostrar isosuperfícies
    pub show_isosurfaces: bool,
    /// Valores de isosuperfícies
    pub isosurface_values: Vec<f64>,
    /// Opacidade da visualização (0-1)
    pub opacity: f64,
}

/// Modos de visualização
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum VisualizationMode {
    /// Visualização em wireframe
    Wireframe,
    /// Visualização sólida
    Solid,
    /// Visualização com gradiente de cores
    Gradient,
    /// Visualização de corte
    Slice,
}

/// Escalas de cores para visualização
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ColorScale {
    /// Escala de cores de azul para vermelho
    BlueToRed,
    /// Escala de cores de arco-íris
    Rainbow,
    /// Escala de cores de preto para branco
    Grayscale,
    /// Escala de cores personalizada
    Custom,
}

/// Gera dados para visualização 3D a partir de dados de temperatura
pub fn generate_3d_visualization_data(
    temperature: &Array3<f64>,
    r_coords: &[f64],
    theta_coords: &[f64],
    z_coords: &[f64],
    time_step: usize,
    total_time: f64,
) -> VisualizationData3D {
    let nr = r_coords.len();
    let ntheta = theta_coords.len();
    let nz = z_coords.len();
    
    let mut vertices = Vec::new();
    let mut faces = Vec::new();
    let mut values = Vec::new();
    
    // Gerar vértices e valores
    for i in 0..nr {
        let r = r_coords[i];
        for k in 0..ntheta {
            let theta = theta_coords[k];
            for j in 0..nz {
                let z = z_coords[j];
                
                // Converter coordenadas cilíndricas para cartesianas
                let x = r * theta.cos();
                let y = r * theta.sin();
                
                vertices.push((x, y, z));
                values.push(temperature[[i, k, j]]);
            }
        }
    }
    
    // Gerar faces (triângulos)
    for i in 0..nr-1 {
        for k in 0..ntheta {
            let k_next = (k + 1) % ntheta;
            for j in 0..nz-1 {
                // Índices dos vértices
                let v00 = i * ntheta * nz + k * nz + j;
                let v01 = i * ntheta * nz + k * nz + (j + 1);
                let v10 = i * ntheta * nz + k_next * nz + j;
                let v11 = i * ntheta * nz + k_next * nz + (j + 1);
                let v20 = (i + 1) * ntheta * nz + k * nz + j;
                let v21 = (i + 1) * ntheta * nz + k * nz + (j + 1);
                let v30 = (i + 1) * ntheta * nz + k_next * nz + j;
                let v31 = (i + 1) * ntheta * nz + k_next * nz + (j + 1);
                
                // Adicionar faces (triângulos)
                // Face frontal 1
                faces.push((v00, v10, v11));
                // Face frontal 2
                faces.push((v00, v11, v01));
                // Face traseira 1
                faces.push((v20, v30, v31));
                // Face traseira 2
                faces.push((v20, v31, v21));
                // Face lateral 1
                faces.push((v00, v20, v30));
                // Face lateral 2
                faces.push((v00, v30, v10));
                // Face lateral 3
                faces.push((v01, v21, v31));
                // Face lateral 4
                faces.push((v01, v31, v11));
                // Face superior 1
                faces.push((v00, v20, v21));
                // Face superior 2
                faces.push((v00, v21, v01));
                // Face inferior 1
                faces.push((v10, v30, v31));
                // Face inferior 2
                faces.push((v10, v31, v11));
            }
        }
    }
    
    // Calcular valores mínimo e máximo
    let min_value = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_value = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    VisualizationData3D {
        dimensions: (nr, ntheta, nz),
        vertices,
        faces,
        values,
        range: (min_value, max_value),
        time_step,
        total_time,
    }
}

/// Gera dados para visualização de corte a partir de dados de temperatura
pub fn generate_slice_visualization_data(
    temperature: &Array3<f64>,
    r_coords: &[f64],
    theta_coords: &[f64],
    z_coords: &[f64],
    slice_type: SliceType,
    position: f64,
    time_step: usize,
) -> SliceVisualizationData {
    let nr = r_coords.len();
    let ntheta = theta_coords.len();
    let nz = z_coords.len();
    
    let mut vertices = Vec::new();
    let mut values = Vec::new();
    let dimensions: (usize, usize);
    
    match slice_type {
        SliceType::Radial => {
            // Corte radial (plano r-θ) em uma posição z específica
            let j = find_nearest_index(z_coords, position);
            dimensions = (nr, ntheta);
            
            for i in 0..nr {
                let r = r_coords[i];
                for k in 0..ntheta {
                    let theta = theta_coords[k];
                    
                    // Converter coordenadas cilíndricas para cartesianas
                    let x = r * theta.cos();
                    let y = r * theta.sin();
                    
                    vertices.push((x, y));
                    values.push(temperature[[i, k, j]]);
                }
            }
        },
        SliceType::Axial => {
            // Corte axial (plano r-z) em um ângulo específico
            let k = find_nearest_index(theta_coords, position);
            dimensions = (nr, nz);
            
            for i in 0..nr {
                let r = r_coords[i];
                for j in 0..nz {
                    let z = z_coords[j];
                    
                    // Usar coordenadas polares para o corte axial
                    let theta = theta_coords[k];
                    let x = r * theta.cos();
                    
                    vertices.push((r, z));
                    values.push(temperature[[i, k, j]]);
                }
            }
        },
        SliceType::Angular => {
            // Corte angular (plano θ-z) em um raio específico
            let i = find_nearest_index(r_coords, position);
            dimensions = (ntheta, nz);
            
            for k in 0..ntheta {
                let theta = theta_coords[k];
                for j in 0..nz {
                    let z = z_coords[j];
                    
                    // Usar coordenadas desenvolvidas para o corte angular
                    let x = theta * position; // Arco = r * theta
                    
                    vertices.push((x, z));
                    values.push(temperature[[i, k, j]]);
                }
            }
        },
    }
    
    // Calcular valores mínimo e máximo
    let min_value = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_value = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    SliceVisualizationData {
        slice_type,
        position,
        dimensions,
        vertices,
        values,
        range: (min_value, max_value),
        time_step,
    }
}

/// Gera dados para visualização de fluxo de calor a partir de dados de temperatura
pub fn generate_heat_flux_visualization_data(
    temperature: &Array2<f64>,
    r_coords: &[f64],
    z_coords: &[f64],
    thermal_conductivity: f64,
    time_step: usize,
) -> HeatFluxVisualizationData {
    let nr = r_coords.len();
    let nz = z_coords.len();
    
    let mut points = Vec::new();
    let mut vectors = Vec::new();
    let mut magnitudes = Vec::new();
    
    // Calcular gradientes de temperatura e fluxo de calor
    for i in 0..nr {
        let r = r_coords[i];
        for j in 0..nz {
            let z = z_coords[j];
            
            // Adicionar ponto
            points.push((r, z));
            
            // Calcular gradientes (simplificado)
            let mut grad_r = 0.0;
            let mut grad_z = 0.0;
            
            if i > 0 && i < nr - 1 {
                grad_r = (temperature[[i+1, j]] - temperature[[i-1, j]]) / 
                         (r_coords[i+1] - r_coords[i-1]);
            }
            
            if j > 0 && j < nz - 1 {
                grad_z = (temperature[[i, j+1]] - temperature[[i, j-1]]) / 
                         (z_coords[j+1] - z_coords[j-1]);
            }
            
            // Fluxo de calor = -k * grad(T)
            let flux_r = -thermal_conductivity * grad_r;
            let flux_z = -thermal_conductivity * grad_z;
            
            vectors.push((flux_r, flux_z));
            
            // Magnitude do fluxo
            let magnitude = (flux_r * flux_r + flux_z * flux_z).sqrt();
            magnitudes.push(magnitude);
        }
    }
    
    // Calcular valores mínimo e máximo
    let min_value = magnitudes.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_value = magnitudes.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    
    HeatFluxVisualizationData {
        dimensions: (nr, nz),
        points,
        vectors,
        magnitudes,
        range: (min_value, max_value),
        time_step,
    }
}

/// Gera dados para visualização de isosuperfícies a partir de dados de temperatura
pub fn generate_isosurface_data(
    temperature: &Array3<f64>,
    r_coords: &[f64],
    theta_coords: &[f64],
    z_coords: &[f64],
    iso_value: f64,
    time_step: usize,
) -> IsosurfaceData {
    // Implementação simplificada do algoritmo Marching Cubes
    // Em uma implementação real, usaríamos uma biblioteca como rust-mcubes
    
    // Placeholder para demonstração
    let vertices = Vec::new();
    let faces = Vec::new();
    let normals = Vec::new();
    
    IsosurfaceData {
        iso_value,
        vertices,
        faces,
        normals,
        time_step,
    }
}

/// Encontra o índice mais próximo em um array para um valor dado
fn find_nearest_index(array: &[f64], value: f64) -> usize {
    let mut nearest_idx = 0;
    let mut min_diff = f64::INFINITY;
    
    for (i, &item) in array.iter().enumerate() {
        let diff = (item - value).abs();
        if diff < min_diff {
            min_diff = diff;
            nearest_idx = i;
        }
    }
    
    nearest_idx
}

/// Converte dados de visualização 3D para formato JSON
pub fn visualization_data_to_json(data: &VisualizationData3D) -> String {
    serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string())
}

/// Converte dados de visualização de corte para formato JSON
pub fn slice_data_to_json(data: &SliceVisualizationData) -> String {
    serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ndarray::Array3;
    
    #[test]
    fn test_generate_3d_visualization_data() {
        // Criar dados de teste
        let nr = 3;
        let ntheta = 4;
        let nz = 3;
        let r_coords = vec![0.0, 0.5, 1.0];
        let theta_coords = vec![0.0, PI/2.0, PI, 3.0*PI/2.0];
        let z_coords = vec![0.0, 0.5, 1.0];
        
        let mut temperature = Array3::<f64>::zeros((nr, ntheta, nz));
        
        // Preencher com dados de teste
        for i in 0..nr {
            for k in 0..ntheta {
                for j in 0..nz {
                    temperature[[i, k, j]] = (i + j) as f64 * 10.0;
                }
            }
        }
        
        let vis_data = generate_3d_visualization_data(
            &temperature,
            &r_coords,
            &theta_coords,
            &z_coords,
            0,
            100.0,
        );
        
        // Verificar dimensões
        assert_eq!(vis_data.dimensions, (nr, ntheta, nz));
        
        // Verificar número de vértices
        assert_eq!(vis_data.vertices.len(), nr * ntheta * nz);
        
        // Verificar valores
        assert_eq!(vis_data.values.len(), nr * ntheta * nz);
        
        // Verificar range
        assert_eq!(vis_data.range, (0.0, 20.0));
    }
    
    #[test]
    fn test_generate_slice_visualization_data() {
        // Criar dados de teste
        let nr = 3;
        let ntheta = 4;
        let nz = 3;
        let r_coords = vec![0.0, 0.5, 1.0];
        let theta_coords = vec![0.0, PI/2.0, PI, 3.0*PI/2.0];
        let z_coords = vec![0.0, 0.5, 1.0];
        
        let mut temperature = Array3::<f64>::zeros((nr, ntheta, nz));
        
        // Preencher com dados de teste
        for i in 0..nr {
            for k in 0..ntheta {
                for j in 0..nz {
                    temperature[[i, k, j]] = (i + j) as f64 * 10.0;
                }
            }
        }
        
        // Testar corte radial
        let radial_slice = generate_slice_visualization_data(
            &temperature,
            &r_coords,
            &theta_coords,
            &z_coords,
            SliceType::Radial,
            0.5, // Posição z
            0,
        );
        
        // Verificar dimensões
        assert_eq!(radial_slice.dimensions, (nr, ntheta));
        
        // Verificar número de vértices
        assert_eq!(radial_slice.vertices.len(), nr * ntheta);
    }
    
    #[test]
    fn test_find_nearest_index() {
        let array = vec![0.0, 1.0, 2.0, 3.0, 4.0];
        
        assert_eq!(find_nearest_index(&array, 0.0), 0);
        assert_eq!(find_nearest_index(&array, 0.4), 0);
        assert_eq!(find_nearest_index(&array, 0.6), 1);
        assert_eq!(find_nearest_index(&array, 2.7), 3);
        assert_eq!(find_nearest_index(&array, 5.0), 4);
    }
}
