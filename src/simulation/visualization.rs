//! Data preparation for 3D visualization
//! 
//! This module prepares simulation data for visualization in the frontend,
//! including coordinate transformations and data formatting.

use crate::errors::Result;
use ndarray::Array2;

/// 3D point for visualization
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// Visualization metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VisualizationMetadata {
    pub min_temperature: f64,
    pub max_temperature: f64,
    pub simulation_time: f64,
    pub mesh_resolution: (usize, usize),
}

/// Visualization data container
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VisualizationData {
    pub mesh_points: Vec<Point3D>,
    pub temperature_values: Vec<f64>,
    pub time_steps: Vec<f64>,
    pub metadata: VisualizationMetadata,
}

impl VisualizationData {
    /// Create visualization data from simulation results
    pub fn from_simulation_results(
        results: &super::SimulationResults,
        mesh: &super::mesh::CylindricalMesh,
    ) -> Self {
        let mut mesh_points = Vec::new();
        let mut temperature_values = Vec::new();
        
        // Convert 2D temperature field to 3D visualization points
        for i in 0..mesh.nr {
            for j in 0..mesh.nz {
                let r = mesh.r_coords[i];
                let z = mesh.z_coords[j];
                let temperature = results.final_temperature_field[i][j];
                
                // For axisymmetric case, create points around the circumference
                // Use more points for outer radii to maintain visual quality
                let num_theta = if i == 0 { 1 } else { 
                    std::cmp::max(8, (r * 16.0) as usize).min(32)
                };
                
                for k in 0..num_theta {
                    let theta = if num_theta == 1 { 
                        0.0 
                    } else { 
                        2.0 * std::f64::consts::PI * k as f64 / num_theta as f64 
                    };
                    
                    let x = r * theta.cos();
                    let y = r * theta.sin();
                    
                    mesh_points.push(Point3D { x, y, z });
                    temperature_values.push(temperature);
                }
            }
        }
        
        Self {
            mesh_points,
            temperature_values,
            time_steps: vec![results.final_time],
            metadata: VisualizationMetadata {
                min_temperature: results.min_temperature,
                max_temperature: results.max_temperature,
                simulation_time: results.final_time,
                mesh_resolution: (mesh.nr, mesh.nz),
            },
        }
    }
    
    /// Convert to JSON string
    pub fn to_json(&self) -> Result<String> {
        serde_json::to_string(self).map_err(|e| e.into())
    }
    
    /// Create from temperature field (placeholder)
    pub fn from_temperature_field(
        temperature: &Array2<f64>,
        mesh: &super::mesh::CylindricalMesh,
        time: f64,
    ) -> Self {
        let mut mesh_points = Vec::new();
        let mut temperature_values = Vec::new();
        
        // Convert cylindrical coordinates to Cartesian for visualization
        for i in 0..mesh.nr {
            for j in 0..mesh.nz {
                let r = mesh.r_coords[i];
                let z = mesh.z_coords[j];
                
                // For axisymmetric case, create points around the circumference
                let num_theta = if i == 0 { 1 } else { 16 }; // More points for outer radii
                for k in 0..num_theta {
                    let theta = if num_theta == 1 { 0.0 } else { 2.0 * std::f64::consts::PI * k as f64 / num_theta as f64 };
                    let x = r * theta.cos();
                    let y = r * theta.sin();
                    
                    mesh_points.push(Point3D { x, y, z });
                    temperature_values.push(temperature[[i, j]]);
                }
            }
        }
        
        let min_temp = temperature_values.iter().fold(f64::INFINITY, |a, &b| a.min(b));
        let max_temp = temperature_values.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
        
        Self {
            mesh_points,
            temperature_values,
            time_steps: vec![time],
            metadata: VisualizationMetadata {
                min_temperature: min_temp,
                max_temperature: max_temp,
                simulation_time: time,
                mesh_resolution: (mesh.nr, mesh.nz),
            },
        }
    }
}

/// Visualization data manager
pub struct VisualizationManager {
    // Placeholder for future implementation
}

impl VisualizationManager {
    /// Create new visualization manager
    pub fn new() -> Self {
        Self {}
    }
    
    /// Prepare data for 3D rendering
    pub fn prepare_3d_data(&self, results: &super::SimulationResults, mesh: &super::mesh::CylindricalMesh) -> Result<VisualizationData> {
        Ok(VisualizationData::from_simulation_results(results, mesh))
    }
    
    /// Prepare data for real-time visualization during simulation
    pub fn prepare_realtime_data(&self, temperature_field: &ndarray::Array2<f64>, mesh: &super::mesh::CylindricalMesh, current_time: f64) -> Result<VisualizationData> {
        Ok(VisualizationData::from_temperature_field(temperature_field, mesh, current_time))
    }
}

impl Default for VisualizationManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_visualization_manager_creation() {
        let manager = VisualizationManager::new();
        let results = crate::simulation::SimulationResults {
            config: crate::simulation::SimulationConfig::default(),
            completed_at: chrono::Utc::now(),
            duration: 0.0,
            final_temperature_field: vec![vec![300.0; 20]; 10],  // Match mesh dimensions: nr=10, nz=20
            time_steps_completed: 100,
            final_time: 60.0,
            energy_monitor: crate::simulation::EnergyMonitor::new(),
            max_temperature: 400.0,
            min_temperature: 300.0,
            avg_temperature: 350.0,
        };
        let mesh = crate::simulation::CylindricalMesh::new(1.0, 2.0, 10, 20).unwrap();
        let data = manager.prepare_3d_data(&results, &mesh).unwrap();
        assert!(!data.mesh_points.is_empty());  // Should have mesh points
    }
    
    #[test]
    fn test_point3d_serialization() {
        let point = Point3D { x: 1.0, y: 2.0, z: 3.0 };
        let json = serde_json::to_string(&point).unwrap();
        assert!(json.contains("1.0"));
        assert!(json.contains("2.0"));
        assert!(json.contains("3.0"));
    }
}