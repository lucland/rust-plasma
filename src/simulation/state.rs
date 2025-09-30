//! Simulation state management and threading
//! 
//! This module handles simulation execution state, progress tracking,
//! and thread management for long-running simulations.

use crate::errors::Result;
use std::sync::{Arc, Mutex};

/// Simulation execution status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum SimulationStatus {
    NotStarted,
    Running,
    Completed,
    Failed(String),
    Cancelled,
}

impl Default for SimulationStatus {
    fn default() -> Self {
        Self::NotStarted
    }
}

/// Simulation state container
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimulationState {
    pub parameters: super::SimulationConfig,
    pub status: SimulationStatus,
    pub progress: f64,
    pub error_message: Option<String>,
    pub results: Option<super::SimulationResults>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
}

impl SimulationState {
    /// Create new simulation state
    pub fn new(parameters: super::SimulationConfig) -> Self {
        Self {
            parameters,
            status: SimulationStatus::NotStarted,
            progress: 0.0,
            error_message: None,
            results: None,
            start_time: None,
            end_time: None,
        }
    }
    
    /// Update progress
    pub fn set_progress(&mut self, progress: f64) {
        self.progress = progress.clamp(0.0, 1.0);
    }
    
    /// Set status
    pub fn set_status(&mut self, status: SimulationStatus) {
        self.status = status;
        match &self.status {
            SimulationStatus::Running => {
                self.start_time = Some(chrono::Utc::now());
            }
            SimulationStatus::Completed | SimulationStatus::Failed(_) | SimulationStatus::Cancelled => {
                self.end_time = Some(chrono::Utc::now());
            }
            _ => {}
        }
    }
    
    /// Set error
    pub fn set_error(&mut self, error: String) {
        self.error_message = Some(error.clone());
        self.set_status(SimulationStatus::Failed(error));
    }
    
    /// Set results
    pub fn set_results(&mut self, results: super::SimulationResults) {
        self.results = Some(results);
        self.set_status(SimulationStatus::Completed);
        self.progress = 1.0;
    }
}

/// Thread-safe simulation state manager
pub struct SimulationStateManager {
    state: Arc<Mutex<SimulationState>>,
}

impl SimulationStateManager {
    /// Create new state manager
    pub fn new(config: super::SimulationConfig) -> Self {
        Self {
            state: Arc::new(Mutex::new(SimulationState::new(config))),
        }
    }
    
    /// Get current state (clone)
    pub fn get_state(&self) -> Result<SimulationState> {
        self.state
            .lock()
            .map(|state| state.clone())
            .map_err(|e| crate::errors::SimulationError::ConfigurationError {
                component: "StateManager".to_string(),
                issue: format!("Failed to lock state: {}", e),
            })
    }
    
    /// Update progress
    pub fn update_progress(&self, progress: f64) -> Result<()> {
        self.state
            .lock()
            .map(|mut state| state.set_progress(progress))
            .map_err(|e| crate::errors::SimulationError::ConfigurationError {
                component: "StateManager".to_string(),
                issue: format!("Failed to update progress: {}", e),
            })
    }
    
    /// Set status
    pub fn set_status(&self, status: SimulationStatus) -> Result<()> {
        self.state
            .lock()
            .map(|mut state| state.set_status(status))
            .map_err(|e| crate::errors::SimulationError::ConfigurationError {
                component: "StateManager".to_string(),
                issue: format!("Failed to set status: {}", e),
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simulation_state_creation() {
        let config = crate::simulation::SimulationConfig::default();
        let state = SimulationState::new(config);
        assert!(matches!(state.status, SimulationStatus::NotStarted));
        assert_eq!(state.progress, 0.0);
    }
    
    #[test]
    fn test_state_manager() {
        let config = crate::simulation::SimulationConfig::default();
        let manager = SimulationStateManager::new(config);
        let state = manager.get_state().unwrap();
        assert!(matches!(state.status, SimulationStatus::NotStarted));
        
        manager.update_progress(0.5).unwrap();
        let state = manager.get_state().unwrap();
        assert_eq!(state.progress, 0.5);
    }
}