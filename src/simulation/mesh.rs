//! Cylindrical mesh generation and management
//! 
//! This module handles the creation and management of cylindrical meshes
//! for axisymmetric simulations, including coordinate generation and
//! neighbor relationships.

use crate::errors::Result;
use ndarray::{Array2, Array3};

/// Cylindrical mesh for axisymmetric simulations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CylindricalMesh {
    pub nr: usize,           // Number of radial nodes
    pub nz: usize,           // Number of axial nodes
    pub radius: f64,         // Maximum radius (m)
    pub height: f64,         // Total height (m)
    pub dr: f64,             // Radial spacing
    pub dz: f64,             // Axial spacing
    pub r_coords: Vec<f64>,  // Radial coordinates
    pub z_coords: Vec<f64>,  // Axial coordinates
}

impl CylindricalMesh {
    /// Create a new cylindrical mesh
    pub fn new(radius: f64, height: f64, nr: usize, nz: usize) -> Result<Self> {
        // Validate inputs
        crate::errors::validation::validate_positive(radius, "radius")?;
        crate::errors::validation::validate_positive(height, "height")?;
        crate::errors::validation::validate_mesh_resolution(nr, nz)?;
        
        let dr = radius / (nr - 1) as f64;
        let dz = height / (nz - 1) as f64;
        
        // Generate coordinates
        let r_coords: Vec<f64> = (0..nr).map(|i| i as f64 * dr).collect();
        let z_coords: Vec<f64> = (0..nz).map(|j| j as f64 * dz).collect();
        
        Ok(Self {
            nr,
            nz,
            radius,
            height,
            dr,
            dz,
            r_coords,
            z_coords,
        })
    }
    
    /// Get cell volume at position (i, j)
    pub fn get_cell_volume(&self, i: usize, j: usize) -> f64 {
        if i >= self.nr || j >= self.nz {
            return 0.0;
        }
        
        let r = self.r_coords[i];
        let dr = self.dr;
        let dz = self.dz;
        
        // For cylindrical coordinates: dV = r * dr * dθ * dz
        // For axisymmetric case (2π integration): dV = 2π * r * dr * dz
        if i == 0 {
            // Special case for center node
            std::f64::consts::PI * (dr / 2.0).powi(2) * dz
        } else {
            2.0 * std::f64::consts::PI * r * dr * dz
        }
    }
    
    /// Get neighbor indices for position (i, j)
    pub fn get_neighbors(&self, i: usize, j: usize) -> Vec<(usize, usize)> {
        let mut neighbors = Vec::new();
        
        // Radial neighbors
        if i > 0 {
            neighbors.push((i - 1, j));
        }
        if i < self.nr - 1 {
            neighbors.push((i + 1, j));
        }
        
        // Axial neighbors
        if j > 0 {
            neighbors.push((i, j - 1));
        }
        if j < self.nz - 1 {
            neighbors.push((i, j + 1));
        }
        
        neighbors
    }
    
    /// Create 2D temperature array
    pub fn create_temperature_array(&self, initial_temperature: f64) -> Array2<f64> {
        Array2::from_elem((self.nr, self.nz), initial_temperature)
    }
    
    /// Create 3D temperature array for time series (placeholder)
    pub fn create_3d_temperature_array(&self, _time_step: usize) -> Array3<f64> {
        // Placeholder implementation - will be completed in subsequent tasks
        Array3::zeros((self.nr, self.nz, 1))
    }
    
    /// Get coordinate at mesh point
    pub fn get_coordinates(&self, i: usize, j: usize) -> Option<(f64, f64)> {
        if i < self.nr && j < self.nz {
            Some((self.r_coords[i], self.z_coords[j]))
        } else {
            None
        }
    }
}

/// Mesh presets for common configurations
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum MeshPreset {
    Fast,      // 50x50
    Balanced,  // 100x100
    High,      // 200x200
    Custom,
}

impl MeshPreset {
    /// Get resolution for preset
    pub fn resolution(&self) -> (usize, usize) {
        match self {
            MeshPreset::Fast => (50, 50),
            MeshPreset::Balanced => (100, 100),
            MeshPreset::High => (200, 200),
            MeshPreset::Custom => (100, 100), // Default for custom
        }
    }
    
    /// Create mesh from preset
    pub fn create_mesh(&self, radius: f64, height: f64) -> Result<CylindricalMesh> {
        let (nr, nz) = self.resolution();
        CylindricalMesh::new(radius, height, nr, nz)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_mesh_creation() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 50, 100).unwrap();
        assert_eq!(mesh.nr, 50);
        assert_eq!(mesh.nz, 100);
        assert_eq!(mesh.radius, 1.0);
        assert_eq!(mesh.height, 2.0);
        assert_eq!(mesh.r_coords.len(), 50);
        assert_eq!(mesh.z_coords.len(), 100);
    }
    
    #[test]
    fn test_mesh_coordinates() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 11, 21).unwrap();
        let (r, z) = mesh.get_coordinates(5, 10).unwrap();
        assert!((r - 0.5).abs() < 1e-10);
        assert!((z - 1.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_mesh_neighbors() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();
        let neighbors = mesh.get_neighbors(5, 5);
        assert_eq!(neighbors.len(), 4); // Should have 4 neighbors
    }
    
    #[test]
    fn test_mesh_presets() {
        let preset = MeshPreset::Fast;
        let (nr, nz) = preset.resolution();
        assert_eq!(nr, 50);
        assert_eq!(nz, 50);
        
        let mesh = preset.create_mesh(1.0, 2.0).unwrap();
        assert_eq!(mesh.nr, 50);
        assert_eq!(mesh.nz, 50);
    }
}