//! Error handling for the Plasma Furnace Simulator
//! 
//! This module provides comprehensive error types and handling for all components
//! of the simulation system, following Rust best practices with thiserror.



/// Main error type for the simulation system
#[derive(Debug, thiserror::Error)]
pub enum SimulationError {
    #[error("Invalid parameter: {parameter} = {value}, expected range: {range}")]
    InvalidParameter {
        parameter: String,
        value: String,
        range: String,
    },
    
    #[error("Numerical instability detected at time step {step}, time = {time}s")]
    NumericalInstability { step: usize, time: f64 },
    
    #[error("Mesh generation failed: {reason}")]
    MeshGenerationError { reason: String },
    
    #[error("Formula evaluation error: {formula} - {error}")]
    FormulaError { formula: String, error: String },
    
    #[error("Physics calculation error: {operation} - {details}")]
    PhysicsError { operation: String, details: String },
    
    #[error("Solver convergence failed: {method} - {reason}")]
    SolverError { method: String, reason: String },
    
    #[error("Material property error: {material} - {property} - {details}")]
    MaterialError { 
        material: String, 
        property: String, 
        details: String 
    },
    
    #[error("Configuration error: {component} - {issue}")]
    ConfigurationError { component: String, issue: String },
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    
    #[error("Visualization error: {operation} - {details}")]
    VisualizationError { operation: String, details: String },
}

/// Result type alias for simulation operations
pub type Result<T> = std::result::Result<T, SimulationError>;

/// Error context for providing additional information
#[derive(Debug, Clone)]
pub struct ErrorContext {
    pub component: String,
    pub operation: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub additional_info: Option<String>,
}

impl ErrorContext {
    pub fn new(component: &str, operation: &str) -> Self {
        Self {
            component: component.to_string(),
            operation: operation.to_string(),
            timestamp: chrono::Utc::now(),
            additional_info: None,
        }
    }
    
    pub fn with_info(mut self, info: &str) -> Self {
        self.additional_info = Some(info.to_string());
        self
    }
}

/// Helper trait for adding context to errors
pub trait ErrorContextExt<T> {
    fn with_context(self, context: ErrorContext) -> Result<T>;
    fn with_component_context(self, component: &str, operation: &str) -> Result<T>;
}

impl<T, E> ErrorContextExt<T> for std::result::Result<T, E> 
where 
    E: Into<SimulationError>
{
    fn with_context(self, context: ErrorContext) -> Result<T> {
        self.map_err(|e| {
            let error = e.into();
            // Add context information to error message if possible
            log::error!("Error in {}.{}: {}", context.component, context.operation, error);
            error
        })
    }
    
    fn with_component_context(self, component: &str, operation: &str) -> Result<T> {
        self.with_context(ErrorContext::new(component, operation))
    }
}

/// Validation helpers for common parameter checks
pub mod validation {
    use super::*;
    
    pub fn validate_positive(value: f64, name: &str) -> Result<()> {
        if value <= 0.0 {
            Err(SimulationError::InvalidParameter {
                parameter: name.to_string(),
                value: value.to_string(),
                range: "> 0.0".to_string(),
            })
        } else {
            Ok(())
        }
    }
    
    pub fn validate_range(value: f64, min: f64, max: f64, name: &str) -> Result<()> {
        if value < min || value > max {
            Err(SimulationError::InvalidParameter {
                parameter: name.to_string(),
                value: value.to_string(),
                range: format!("[{}, {}]", min, max),
            })
        } else {
            Ok(())
        }
    }
    
    pub fn validate_non_empty_string(value: &str, name: &str) -> Result<()> {
        if value.trim().is_empty() {
            Err(SimulationError::InvalidParameter {
                parameter: name.to_string(),
                value: "empty string".to_string(),
                range: "non-empty string".to_string(),
            })
        } else {
            Ok(())
        }
    }
    
    pub fn validate_mesh_resolution(nr: usize, nz: usize) -> Result<()> {
        if nr < 10 || nz < 10 {
            return Err(SimulationError::MeshGenerationError {
                reason: format!("Mesh resolution too low: {}x{}, minimum is 10x10", nr, nz)
            });
        }
        
        if nr > 1000 || nz > 1000 {
            return Err(SimulationError::MeshGenerationError {
                reason: format!("Mesh resolution too high: {}x{}, maximum is 1000x1000", nr, nz)
            });
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::validation::*;
    
    #[test]
    fn test_validation_positive() {
        assert!(validate_positive(1.0, "test").is_ok());
        assert!(validate_positive(-1.0, "test").is_err());
        assert!(validate_positive(0.0, "test").is_err());
    }
    
    #[test]
    fn test_validation_range() {
        assert!(validate_range(5.0, 0.0, 10.0, "test").is_ok());
        assert!(validate_range(-1.0, 0.0, 10.0, "test").is_err());
        assert!(validate_range(11.0, 0.0, 10.0, "test").is_err());
    }
    
    #[test]
    fn test_validation_mesh_resolution() {
        assert!(validate_mesh_resolution(50, 50).is_ok());
        assert!(validate_mesh_resolution(5, 50).is_err());
        assert!(validate_mesh_resolution(50, 5).is_err());
        assert!(validate_mesh_resolution(1500, 50).is_err());
    }
}