//! Cylindrical mesh generation and management
//!
//! This module handles the creation and management of cylindrical meshes
//! for axisymmetric simulations, including coordinate generation and
//! neighbor relationships.

use crate::errors::Result;
use ndarray::{Array2, Array3};
use std::f64::consts::PI;

/// Boundary types for cylindrical mesh
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum BoundaryType {
    /// Interior node (not on any boundary)
    Interior,
    /// On the axis of symmetry (r = 0)
    Axis,
    /// On the outer cylindrical wall (r = R_max)
    OuterWall,
    /// On the bottom surface (z = 0)
    Bottom,
    /// On the top surface (z = H_max)
    Top,
}

/// Direction for neighbor identification in finite difference calculations
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Direction {
    /// Radial direction towards center (decreasing r)
    RadialInner,
    /// Radial direction towards outer boundary (increasing r)
    RadialOuter,
    /// Axial direction towards bottom (decreasing z)
    AxialLower,
    /// Axial direction towards top (increasing z)
    AxialUpper,
}

/// Cylindrical mesh for axisymmetric simulations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CylindricalMesh {
    pub nr: usize,          // Number of radial nodes
    pub nz: usize,          // Number of axial nodes
    pub radius: f64,        // Maximum radius (m)
    pub height: f64,        // Total height (m)
    pub dr: f64,            // Radial spacing
    pub dz: f64,            // Axial spacing
    pub r_coords: Vec<f64>, // Radial coordinates
    pub z_coords: Vec<f64>, // Axial coordinates
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
    /// For cylindrical coordinates with axisymmetric assumption
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
            // Special case for center node (r = 0)
            // Volume is a cylinder: π * (dr/2)² * dz
            PI * (dr / 2.0).powi(2) * dz
        } else {
            // Regular cylindrical shell volume: 2π * r * dr * dz
            2.0 * PI * r * dr * dz
        }
    }

    /// Get cell area for heat transfer calculations
    /// Returns the cross-sectional area perpendicular to heat flow
    pub fn get_cell_area_radial(&self, i: usize, j: usize) -> f64 {
        if i >= self.nr || j >= self.nz {
            return 0.0;
        }

        let r = self.r_coords[i];
        let dz = self.dz;

        if i == 0 {
            // At center, area is π * (dr/2)²
            PI * (self.dr / 2.0).powi(2)
        } else {
            // Cylindrical surface area: 2π * r * dz
            2.0 * PI * r * dz
        }
    }

    /// Get cell area for axial heat transfer
    pub fn get_cell_area_axial(&self, i: usize, j: usize) -> f64 {
        if i >= self.nr || j >= self.nz {
            return 0.0;
        }

        let r = self.r_coords[i];
        let dr = self.dr;

        if i == 0 {
            // At center, area is π * (dr/2)²
            PI * (dr / 2.0).powi(2)
        } else {
            // Annular area: π * ((r + dr/2)² - (r - dr/2)²) = 2π * r * dr
            2.0 * PI * r * dr
        }
    }

    /// Get neighbor indices for position (i, j)
    /// Returns neighbors in order: [radial_inner, radial_outer, axial_lower, axial_upper]
    pub fn get_neighbors(&self, i: usize, j: usize) -> Vec<(usize, usize)> {
        let mut neighbors = Vec::new();

        // Radial neighbors
        if i > 0 {
            neighbors.push((i - 1, j)); // Inner radial neighbor
        }
        if i < self.nr - 1 {
            neighbors.push((i + 1, j)); // Outer radial neighbor
        }

        // Axial neighbors
        if j > 0 {
            neighbors.push((i, j - 1)); // Lower axial neighbor
        }
        if j < self.nz - 1 {
            neighbors.push((i, j + 1)); // Upper axial neighbor
        }

        neighbors
    }

    /// Get neighbor with direction information for finite difference calculations
    pub fn get_neighbors_with_direction(
        &self,
        i: usize,
        j: usize,
    ) -> Vec<((usize, usize), Direction)> {
        let mut neighbors = Vec::new();

        // Radial neighbors
        if i > 0 {
            neighbors.push(((i - 1, j), Direction::RadialInner));
        }
        if i < self.nr - 1 {
            neighbors.push(((i + 1, j), Direction::RadialOuter));
        }

        // Axial neighbors
        if j > 0 {
            neighbors.push(((i, j - 1), Direction::AxialLower));
        }
        if j < self.nz - 1 {
            neighbors.push(((i, j + 1), Direction::AxialUpper));
        }

        neighbors
    }

    /// Get distance to neighbor for finite difference calculations
    pub fn get_neighbor_distance(&self, _i: usize, _j: usize, direction: Direction) -> f64 {
        match direction {
            Direction::RadialInner | Direction::RadialOuter => self.dr,
            Direction::AxialLower | Direction::AxialUpper => self.dz,
        }
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

    /// Check if a node is on the axis (r = 0)
    pub fn is_on_axis(&self, i: usize, _j: usize) -> bool {
        i == 0
    }

    /// Check if a node is on the outer boundary (r = R_max)
    pub fn is_on_outer_boundary(&self, i: usize, _j: usize) -> bool {
        i == self.nr - 1
    }

    /// Check if a node is on the bottom boundary (z = 0)
    pub fn is_on_bottom_boundary(&self, _i: usize, j: usize) -> bool {
        j == 0
    }

    /// Check if a node is on the top boundary (z = H_max)
    pub fn is_on_top_boundary(&self, _i: usize, j: usize) -> bool {
        j == self.nz - 1
    }

    /// Get boundary type for a given node
    pub fn get_boundary_type(&self, i: usize, j: usize) -> BoundaryType {
        if self.is_on_axis(i, j) {
            BoundaryType::Axis
        } else if self.is_on_outer_boundary(i, j) {
            BoundaryType::OuterWall
        } else if self.is_on_bottom_boundary(i, j) {
            BoundaryType::Bottom
        } else if self.is_on_top_boundary(i, j) {
            BoundaryType::Top
        } else {
            BoundaryType::Interior
        }
    }

    /// Validate mesh parameters
    pub fn validate(&self) -> Result<()> {
        // Check basic parameters
        crate::errors::validation::validate_positive(self.radius, "radius")?;
        crate::errors::validation::validate_positive(self.height, "height")?;
        crate::errors::validation::validate_mesh_resolution(self.nr, self.nz)?;

        // Check coordinate arrays
        if self.r_coords.len() != self.nr {
            return Err(crate::errors::SimulationError::MeshGenerationError {
                reason: format!(
                    "Radial coordinate array length {} doesn't match nr {}",
                    self.r_coords.len(),
                    self.nr
                ),
            });
        }

        if self.z_coords.len() != self.nz {
            return Err(crate::errors::SimulationError::MeshGenerationError {
                reason: format!(
                    "Axial coordinate array length {} doesn't match nz {}",
                    self.z_coords.len(),
                    self.nz
                ),
            });
        }

        // Check coordinate monotonicity
        for i in 1..self.nr {
            if self.r_coords[i] <= self.r_coords[i - 1] {
                return Err(crate::errors::SimulationError::MeshGenerationError {
                    reason: "Radial coordinates are not monotonically increasing".to_string(),
                });
            }
        }

        for j in 1..self.nz {
            if self.z_coords[j] <= self.z_coords[j - 1] {
                return Err(crate::errors::SimulationError::MeshGenerationError {
                    reason: "Axial coordinates are not monotonically increasing".to_string(),
                });
            }
        }

        Ok(())
    }

    /// Get total number of nodes
    pub fn total_nodes(&self) -> usize {
        self.nr * self.nz
    }

    /// Get mesh statistics for debugging and validation
    pub fn get_mesh_info(&self) -> MeshInfo {
        MeshInfo {
            nr: self.nr,
            nz: self.nz,
            radius: self.radius,
            height: self.height,
            dr: self.dr,
            dz: self.dz,
            total_nodes: self.total_nodes(),
            aspect_ratio: self.height / self.radius,
            min_cell_size: self.dr.min(self.dz),
            max_cell_size: self.dr.max(self.dz),
        }
    }
}

/// Mesh information structure for debugging and validation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MeshInfo {
    pub nr: usize,
    pub nz: usize,
    pub radius: f64,
    pub height: f64,
    pub dr: f64,
    pub dz: f64,
    pub total_nodes: usize,
    pub aspect_ratio: f64,
    pub min_cell_size: f64,
    pub max_cell_size: f64,
}

/// Mesh presets for common configurations
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum MeshPreset {
    Fast,     // 50x50
    Balanced, // 100x100
    High,     // 200x200
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

        // Test validation
        assert!(mesh.validate().is_ok());
    }

    #[test]
    fn test_mesh_coordinates() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 11, 21).unwrap();
        let (r, z) = mesh.get_coordinates(5, 10).unwrap();
        assert!((r - 0.5).abs() < 1e-10);
        assert!((z - 1.0).abs() < 1e-10);

        // Test boundary coordinates
        let (r0, _) = mesh.get_coordinates(0, 0).unwrap();
        assert_eq!(r0, 0.0); // Should be at axis

        let (r_max, z_max) = mesh.get_coordinates(10, 20).unwrap();
        assert!((r_max - 1.0).abs() < 1e-10);
        assert!((z_max - 2.0).abs() < 1e-10);
    }

    #[test]
    fn test_mesh_neighbors() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();

        // Interior node should have 4 neighbors
        let neighbors = mesh.get_neighbors(5, 5);
        assert_eq!(neighbors.len(), 4);

        // Corner node should have 2 neighbors
        let corner_neighbors = mesh.get_neighbors(0, 0);
        assert_eq!(corner_neighbors.len(), 2);

        // Edge node should have 3 neighbors
        let edge_neighbors = mesh.get_neighbors(5, 0);
        assert_eq!(edge_neighbors.len(), 3);
    }

    #[test]
    fn test_boundary_detection() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();

        // Test axis boundary
        assert!(mesh.is_on_axis(0, 5));
        assert!(!mesh.is_on_axis(1, 5));

        // Test outer boundary
        assert!(mesh.is_on_outer_boundary(9, 5));
        assert!(!mesh.is_on_outer_boundary(8, 5));

        // Test bottom boundary
        assert!(mesh.is_on_bottom_boundary(5, 0));
        assert!(!mesh.is_on_bottom_boundary(5, 1));

        // Test top boundary
        assert!(mesh.is_on_top_boundary(5, 9));
        assert!(!mesh.is_on_top_boundary(5, 8));

        // Test boundary types
        assert_eq!(mesh.get_boundary_type(0, 5), BoundaryType::Axis);
        assert_eq!(mesh.get_boundary_type(9, 5), BoundaryType::OuterWall);
        assert_eq!(mesh.get_boundary_type(5, 0), BoundaryType::Bottom);
        assert_eq!(mesh.get_boundary_type(5, 9), BoundaryType::Top);
        assert_eq!(mesh.get_boundary_type(5, 5), BoundaryType::Interior);
    }

    #[test]
    fn test_cell_volumes() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 11, 21).unwrap();

        // Test center cell volume (special case)
        let center_volume = mesh.get_cell_volume(0, 0);
        let expected_center = PI * (mesh.dr / 2.0).powi(2) * mesh.dz;
        assert!((center_volume - expected_center).abs() < 1e-10);

        // Test regular cell volume
        let regular_volume = mesh.get_cell_volume(5, 5);
        let r = mesh.r_coords[5];
        let expected_regular = 2.0 * PI * r * mesh.dr * mesh.dz;
        assert!((regular_volume - expected_regular).abs() < 1e-10);
    }

    #[test]
    fn test_cell_areas() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 11, 21).unwrap();

        // Test radial area at center
        let center_radial_area = mesh.get_cell_area_radial(0, 5);
        let expected_center_radial = PI * (mesh.dr / 2.0).powi(2);
        assert!((center_radial_area - expected_center_radial).abs() < 1e-10);

        // Test axial area at center
        let center_axial_area = mesh.get_cell_area_axial(0, 5);
        assert!((center_axial_area - expected_center_radial).abs() < 1e-10);

        // Test regular radial area
        let regular_radial_area = mesh.get_cell_area_radial(5, 5);
        let r = mesh.r_coords[5];
        let expected_regular_radial = 2.0 * PI * r * mesh.dz;
        assert!((regular_radial_area - expected_regular_radial).abs() < 1e-10);
    }

    #[test]
    fn test_neighbors_with_direction() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();
        let neighbors = mesh.get_neighbors_with_direction(5, 5);

        assert_eq!(neighbors.len(), 4);

        // Check that all directions are present
        let directions: Vec<Direction> = neighbors.iter().map(|(_, dir)| *dir).collect();
        assert!(directions.contains(&Direction::RadialInner));
        assert!(directions.contains(&Direction::RadialOuter));
        assert!(directions.contains(&Direction::AxialLower));
        assert!(directions.contains(&Direction::AxialUpper));
    }

    #[test]
    fn test_neighbor_distances() {
        let mesh = CylindricalMesh::new(1.0, 2.0, 10, 10).unwrap();

        assert_eq!(
            mesh.get_neighbor_distance(5, 5, Direction::RadialInner),
            mesh.dr
        );
        assert_eq!(
            mesh.get_neighbor_distance(5, 5, Direction::RadialOuter),
            mesh.dr
        );
        assert_eq!(
            mesh.get_neighbor_distance(5, 5, Direction::AxialLower),
            mesh.dz
        );
        assert_eq!(
            mesh.get_neighbor_distance(5, 5, Direction::AxialUpper),
            mesh.dz
        );
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

    #[test]
    fn test_mesh_info() {
        let mesh = CylindricalMesh::new(2.0, 4.0, 20, 40).unwrap();
        let info = mesh.get_mesh_info();

        assert_eq!(info.nr, 20);
        assert_eq!(info.nz, 40);
        assert_eq!(info.radius, 2.0);
        assert_eq!(info.height, 4.0);
        assert_eq!(info.total_nodes, 800);
        assert_eq!(info.aspect_ratio, 2.0);
    }

    #[test]
    fn test_mesh_validation_errors() {
        // Test invalid parameters
        assert!(CylindricalMesh::new(-1.0, 2.0, 50, 50).is_err());
        assert!(CylindricalMesh::new(1.0, -2.0, 50, 50).is_err());
        assert!(CylindricalMesh::new(1.0, 2.0, 5, 50).is_err());
        assert!(CylindricalMesh::new(1.0, 2.0, 50, 5).is_err());
    }
}
