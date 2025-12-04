//! Performance metrics and data export functionality
//! 
//! This module provides tools for analyzing simulation performance,
//! calculating physical metrics, and exporting results in various formats.
//! 
//! # Animation Data Support
//! 
//! The module includes enhanced support for animation playback:
//! - **Time Step Statistics**: Calculate min/max/avg/std temperature per time step
//! - **Temperature Range Tracking**: Track global temperature extrema across all time steps
//! - **Mesh Metadata**: Export mesh dimension information for visualization
//! - **Efficient Serialization**: Export temperature grids in JSON format for frontend consumption
//! 
//! # Example Usage
//! 
//! ```rust
//! use plasma_simulation::simulation::metrics::{MetricsAnalyzer, MeshMetadata};
//! 
//! let mut analyzer = MetricsAnalyzer::new();
//! 
//! // Set mesh metadata
//! let metadata = MeshMetadata::new(50, 100, 1.0, 2.0);
//! analyzer.set_mesh_metadata(metadata);
//! 
//! // Add time step data
//! let temperature_grid = vec![vec![300.0, 400.0], vec![350.0, 450.0]];
//! analyzer.add_time_step(0, 0.0, &temperature_grid);
//! 
//! // Get statistics
//! let stats = analyzer.get_time_step_statistics(0).unwrap();
//! println!("Min temp: {}, Max temp: {}", stats.min_temperature, stats.max_temperature);
//! 
//! // Export to CSV
//! analyzer.export_statistics_csv("metrics.csv").unwrap();
//! ```

use crate::errors::Result;

/// Simulation performance metrics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PerformanceMetrics {
    pub simulation_time: f64,
    pub memory_usage: f64,
    pub energy_conservation_error: f64,
    pub max_temperature: f64,
    pub min_temperature: f64,
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            simulation_time: 0.0,
            memory_usage: 0.0,
            energy_conservation_error: 0.0,
            max_temperature: 0.0,
            min_temperature: 0.0,
        }
    }
}

/// Temperature statistics for a single time step
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimeStepStatistics {
    /// Time step index
    pub step_index: usize,
    /// Simulation time in seconds
    pub time: f64,
    /// Minimum temperature in the field
    pub min_temperature: f64,
    /// Maximum temperature in the field
    pub max_temperature: f64,
    /// Average temperature in the field
    pub avg_temperature: f64,
    /// Standard deviation of temperature
    pub std_deviation: f64,
    /// Number of cells in the mesh
    pub cell_count: usize,
}

impl TimeStepStatistics {
    /// Calculate statistics from a 2D temperature grid
    pub fn from_temperature_grid(
        step_index: usize,
        time: f64,
        temperature_grid: &[Vec<f64>],
    ) -> Self {
        let mut min_temp = f64::INFINITY;
        let mut max_temp = f64::NEG_INFINITY;
        let mut sum = 0.0;
        let mut count = 0;
        
        // First pass: calculate min, max, and sum
        for row in temperature_grid {
            for &temp in row {
                min_temp = min_temp.min(temp);
                max_temp = max_temp.max(temp);
                sum += temp;
                count += 1;
            }
        }
        
        let avg_temp = if count > 0 { sum / count as f64 } else { 0.0 };
        
        // Second pass: calculate standard deviation
        let mut variance_sum = 0.0;
        for row in temperature_grid {
            for &temp in row {
                let diff = temp - avg_temp;
                variance_sum += diff * diff;
            }
        }
        
        let std_dev = if count > 0 {
            (variance_sum / count as f64).sqrt()
        } else {
            0.0
        };
        
        Self {
            step_index,
            time,
            min_temperature: min_temp,
            max_temperature: max_temp,
            avg_temperature: avg_temp,
            std_deviation: std_dev,
            cell_count: count,
        }
    }
}

/// Temperature range tracker across all time steps
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TemperatureRangeTracker {
    /// Global minimum temperature across all time steps
    pub global_min: f64,
    /// Global maximum temperature across all time steps
    pub global_max: f64,
    /// Time when minimum occurred
    pub min_time: f64,
    /// Time when maximum occurred
    pub max_time: f64,
    /// Step index when minimum occurred
    pub min_step: usize,
    /// Step index when maximum occurred
    pub max_step: usize,
}

impl TemperatureRangeTracker {
    /// Create a new tracker
    pub fn new() -> Self {
        Self {
            global_min: f64::INFINITY,
            global_max: f64::NEG_INFINITY,
            min_time: 0.0,
            max_time: 0.0,
            min_step: 0,
            max_step: 0,
        }
    }
    
    /// Update tracker with new time step statistics
    pub fn update(&mut self, stats: &TimeStepStatistics) {
        if stats.min_temperature < self.global_min {
            self.global_min = stats.min_temperature;
            self.min_time = stats.time;
            self.min_step = stats.step_index;
        }
        
        if stats.max_temperature > self.global_max {
            self.global_max = stats.max_temperature;
            self.max_time = stats.time;
            self.max_step = stats.step_index;
        }
    }
    
    /// Get the temperature range as a tuple (min, max)
    pub fn get_range(&self) -> (f64, f64) {
        (self.global_min, self.global_max)
    }
}

impl Default for TemperatureRangeTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// Mesh dimension metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MeshMetadata {
    /// Number of radial cells
    pub nr: usize,
    /// Number of axial cells
    pub nz: usize,
    /// Furnace radius in meters
    pub radius: f64,
    /// Furnace height in meters
    pub height: f64,
    /// Radial cell size (dr)
    pub dr: f64,
    /// Axial cell size (dz)
    pub dz: f64,
}

impl MeshMetadata {
    /// Create mesh metadata from mesh dimensions
    pub fn new(nr: usize, nz: usize, radius: f64, height: f64) -> Self {
        let dr = if nr > 1 { radius / (nr - 1) as f64 } else { 0.0 };
        let dz = if nz > 1 { height / (nz - 1) as f64 } else { 0.0 };
        
        Self {
            nr,
            nz,
            radius,
            height,
            dr,
            dz,
        }
    }
}

/// Metrics analyzer for simulation results
pub struct MetricsAnalyzer {
    /// Statistics for each time step
    time_step_statistics: Vec<TimeStepStatistics>,
    /// Temperature range tracker
    range_tracker: TemperatureRangeTracker,
    /// Mesh metadata
    mesh_metadata: Option<MeshMetadata>,
}

impl MetricsAnalyzer {
    /// Create new metrics analyzer
    pub fn new() -> Self {
        Self {
            time_step_statistics: Vec::new(),
            range_tracker: TemperatureRangeTracker::new(),
            mesh_metadata: None,
        }
    }
    
    /// Set mesh metadata
    pub fn set_mesh_metadata(&mut self, metadata: MeshMetadata) {
        self.mesh_metadata = Some(metadata);
    }
    
    /// Add time step data and calculate statistics
    pub fn add_time_step(
        &mut self,
        step_index: usize,
        time: f64,
        temperature_grid: &[Vec<f64>],
    ) {
        let stats = TimeStepStatistics::from_temperature_grid(step_index, time, temperature_grid);
        self.range_tracker.update(&stats);
        self.time_step_statistics.push(stats);
    }
    
    /// Get statistics for a specific time step
    pub fn get_time_step_statistics(&self, step_index: usize) -> Option<&TimeStepStatistics> {
        self.time_step_statistics.get(step_index)
    }
    
    /// Get all time step statistics
    pub fn get_all_statistics(&self) -> &[TimeStepStatistics] {
        &self.time_step_statistics
    }
    
    /// Get temperature range tracker
    pub fn get_range_tracker(&self) -> &TemperatureRangeTracker {
        &self.range_tracker
    }
    
    /// Get mesh metadata
    pub fn get_mesh_metadata(&self) -> Option<&MeshMetadata> {
        self.mesh_metadata.as_ref()
    }
    
    /// Calculate performance metrics (placeholder)
    pub fn calculate_metrics(&self) -> Result<PerformanceMetrics> {
        // Placeholder implementation - will be completed in subsequent tasks
        Ok(PerformanceMetrics::default())
    }
    
    /// Export time step statistics to CSV
    pub fn export_statistics_csv(&self, path: &str) -> Result<()> {
        use std::fs::File;
        use std::io::Write;
        
        let mut file = File::create(path).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to create CSV file: {}", e),
            }
        })?;
        
        // Write header
        writeln!(
            file,
            "step_index,time,min_temperature,max_temperature,avg_temperature,std_deviation,cell_count"
        ).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to write CSV header: {}", e),
            }
        })?;
        
        // Write data rows
        for stats in &self.time_step_statistics {
            writeln!(
                file,
                "{},{},{},{},{},{},{}",
                stats.step_index,
                stats.time,
                stats.min_temperature,
                stats.max_temperature,
                stats.avg_temperature,
                stats.std_deviation,
                stats.cell_count
            ).map_err(|e| {
                crate::errors::SimulationError::ConfigurationError {
                    component: "MetricsAnalyzer".to_string(),
                    issue: format!("Failed to write CSV row: {}", e),
                }
            })?;
        }
        
        Ok(())
    }
    
    /// Export temperature grids to JSON (efficient serialization)
    pub fn export_temperature_grids_json(
        &self,
        temperature_grids: &[Vec<Vec<f64>>],
        path: &str,
    ) -> Result<()> {
        use std::fs::File;
        
        let file = File::create(path).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to create JSON file: {}", e),
            }
        })?;
        
        serde_json::to_writer(file, temperature_grids).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to write JSON: {}", e),
            }
        })?;
        
        Ok(())
    }
    
    /// Export complete metrics report to JSON
    pub fn export_metrics_json(&self, path: &str) -> Result<()> {
        use std::fs::File;
        
        #[derive(serde::Serialize)]
        struct MetricsReport<'a> {
            statistics: &'a [TimeStepStatistics],
            range_tracker: &'a TemperatureRangeTracker,
            mesh_metadata: Option<&'a MeshMetadata>,
        }
        
        let report = MetricsReport {
            statistics: &self.time_step_statistics,
            range_tracker: &self.range_tracker,
            mesh_metadata: self.mesh_metadata.as_ref(),
        };
        
        let file = File::create(path).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to create JSON file: {}", e),
            }
        })?;
        
        serde_json::to_writer_pretty(file, &report).map_err(|e| {
            crate::errors::SimulationError::ConfigurationError {
                component: "MetricsAnalyzer".to_string(),
                issue: format!("Failed to write JSON: {}", e),
            }
        })?;
        
        Ok(())
    }
    
    /// Export results to CSV (placeholder)
    pub fn export_csv(&self, _path: &str) -> Result<()> {
        // Placeholder implementation - will be completed in subsequent tasks
        Ok(())
    }
    
    /// Export results to JSON (placeholder)
    pub fn export_json(&self, _path: &str) -> Result<()> {
        // Placeholder implementation - will be completed in subsequent tasks
        Ok(())
    }
}

impl Default for MetricsAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_metrics_analyzer_creation() {
        let analyzer = MetricsAnalyzer::new();
        let metrics = analyzer.calculate_metrics().unwrap();
        assert_eq!(metrics.simulation_time, 0.0);
    }
    
    #[test]
    fn test_time_step_statistics() {
        let temperature_grid = vec![
            vec![300.0, 400.0, 500.0],
            vec![350.0, 450.0, 550.0],
        ];
        
        let stats = TimeStepStatistics::from_temperature_grid(0, 0.0, &temperature_grid);
        
        assert_eq!(stats.step_index, 0);
        assert_eq!(stats.time, 0.0);
        assert_eq!(stats.min_temperature, 300.0);
        assert_eq!(stats.max_temperature, 550.0);
        assert_eq!(stats.cell_count, 6);
        
        // Average should be (300 + 400 + 500 + 350 + 450 + 550) / 6 = 425.0
        assert!((stats.avg_temperature - 425.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_temperature_range_tracker() {
        let mut tracker = TemperatureRangeTracker::new();
        
        let stats1 = TimeStepStatistics::from_temperature_grid(
            0,
            0.0,
            &vec![vec![300.0, 400.0]],
        );
        tracker.update(&stats1);
        
        assert_eq!(tracker.global_min, 300.0);
        assert_eq!(tracker.global_max, 400.0);
        assert_eq!(tracker.min_step, 0);
        assert_eq!(tracker.max_step, 0);
        
        let stats2 = TimeStepStatistics::from_temperature_grid(
            1,
            1.0,
            &vec![vec![250.0, 500.0]],
        );
        tracker.update(&stats2);
        
        assert_eq!(tracker.global_min, 250.0);
        assert_eq!(tracker.global_max, 500.0);
        assert_eq!(tracker.min_step, 1);
        assert_eq!(tracker.max_step, 1);
        assert_eq!(tracker.get_range(), (250.0, 500.0));
    }
    
    #[test]
    fn test_mesh_metadata() {
        let metadata = MeshMetadata::new(50, 100, 1.0, 2.0);
        
        assert_eq!(metadata.nr, 50);
        assert_eq!(metadata.nz, 100);
        assert_eq!(metadata.radius, 1.0);
        assert_eq!(metadata.height, 2.0);
        assert!((metadata.dr - 1.0 / 49.0).abs() < 1e-10);
        assert!((metadata.dz - 2.0 / 99.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_metrics_analyzer_add_time_step() {
        let mut analyzer = MetricsAnalyzer::new();
        
        let grid1 = vec![vec![300.0, 400.0], vec![350.0, 450.0]];
        analyzer.add_time_step(0, 0.0, &grid1);
        
        let grid2 = vec![vec![320.0, 420.0], vec![370.0, 470.0]];
        analyzer.add_time_step(1, 1.0, &grid2);
        
        assert_eq!(analyzer.get_all_statistics().len(), 2);
        
        let stats0 = analyzer.get_time_step_statistics(0).unwrap();
        assert_eq!(stats0.step_index, 0);
        assert_eq!(stats0.min_temperature, 300.0);
        
        let stats1 = analyzer.get_time_step_statistics(1).unwrap();
        assert_eq!(stats1.step_index, 1);
        assert_eq!(stats1.max_temperature, 470.0);
        
        let range = analyzer.get_range_tracker().get_range();
        assert_eq!(range, (300.0, 470.0));
    }
    
    #[test]
    fn test_metrics_analyzer_with_mesh_metadata() {
        let mut analyzer = MetricsAnalyzer::new();
        
        let metadata = MeshMetadata::new(50, 100, 1.0, 2.0);
        analyzer.set_mesh_metadata(metadata);
        
        assert!(analyzer.get_mesh_metadata().is_some());
        let meta = analyzer.get_mesh_metadata().unwrap();
        assert_eq!(meta.nr, 50);
        assert_eq!(meta.nz, 100);
    }
    
    #[test]
    fn test_export_statistics_csv() {
        let mut analyzer = MetricsAnalyzer::new();
        
        let grid = vec![vec![300.0, 400.0], vec![350.0, 450.0]];
        analyzer.add_time_step(0, 0.0, &grid);
        analyzer.add_time_step(1, 1.0, &grid);
        
        // Test export (will create a temporary file)
        let temp_path = "/tmp/test_metrics.csv";
        let result = analyzer.export_statistics_csv(temp_path);
        assert!(result.is_ok());
        
        // Clean up
        let _ = std::fs::remove_file(temp_path);
    }
    
    #[test]
    fn test_export_temperature_grids_json() {
        let analyzer = MetricsAnalyzer::new();
        
        let grids = vec![
            vec![vec![300.0, 400.0], vec![350.0, 450.0]],
            vec![vec![320.0, 420.0], vec![370.0, 470.0]],
        ];
        
        let temp_path = "/tmp/test_grids.json";
        let result = analyzer.export_temperature_grids_json(&grids, temp_path);
        assert!(result.is_ok());
        
        // Clean up
        let _ = std::fs::remove_file(temp_path);
    }
    
    #[test]
    fn test_export_metrics_json() {
        let mut analyzer = MetricsAnalyzer::new();
        
        let metadata = MeshMetadata::new(50, 100, 1.0, 2.0);
        analyzer.set_mesh_metadata(metadata);
        
        let grid = vec![vec![300.0, 400.0], vec![350.0, 450.0]];
        analyzer.add_time_step(0, 0.0, &grid);
        
        let temp_path = "/tmp/test_metrics.json";
        let result = analyzer.export_metrics_json(temp_path);
        assert!(result.is_ok());
        
        // Clean up
        let _ = std::fs::remove_file(temp_path);
    }
}