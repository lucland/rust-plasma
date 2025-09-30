//! Plasma Furnace Simulator Library
//! 
//! A high-performance desktop simulation framework for analyzing thermal dynamics 
//! of materials subjected to high-energy plasma heating. The simulator addresses 
//! complex challenges in modeling transient heat transfer coupled with 
//! solid-liquid-vapor phase transitions.
//! 
//! # Core Capabilities
//! 
//! - Multi-torch plasma configurations with 3D positioning
//! - Temperature-dependent material properties
//! - Real-time 2D/3D heatmap visualization with playback controls
//! - Parametric studies and optimization workflows
//! - Data export in multiple formats (CSV, JSON, VTK)
//! - Plugin system for extending physics models
//! - Formula engine for custom material properties and boundary conditions
//! 
//! # Architecture
//! 
//! The library is organized into several main modules:
//! 
//! - [`simulation`] - Core simulation engine and physics models
//! - [`formula`] - Formula engine for custom mathematical expressions
//! - [`errors`] - Comprehensive error handling system
//! 
//! # Example Usage
//! 
//! ```rust,no_run
//! use plasma_simulation::*;
//! 
//! // Initialize logging
//! init_logger();
//! 
//! // Create simulation configuration
//! // (Will be implemented in subsequent tasks)
//! ```

// Core modules
pub mod simulation;
pub mod formula;
pub mod errors;

// Re-export commonly used types
pub use errors::{SimulationError, Result};

use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize the logging system for the library
/// 
/// This should be called once at the start of the application.
/// Subsequent calls will be ignored.
pub fn init_logger() {
    INIT.call_once(|| {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Info)
            .init();
        log::info!("Plasma Furnace Simulator - Library initialized");
    });
}

/// Get the library version
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Get library information
pub fn info() -> LibraryInfo {
    LibraryInfo {
        name: env!("CARGO_PKG_NAME"),
        version: env!("CARGO_PKG_VERSION"),
        description: env!("CARGO_PKG_DESCRIPTION"),
        authors: env!("CARGO_PKG_AUTHORS"),
    }
}

/// Library information structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LibraryInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub description: &'static str,
    pub authors: &'static str,
}

// FFI interface for C interoperability (legacy support)
#[cfg(feature = "ffi")]
pub mod ffi {
    use super::*;
    use std::ffi::{c_void, CString};
    use std::os::raw::{c_char, c_int};
    
    /// FFI simulation context (placeholder for future implementation)
    #[repr(C)]
    pub struct SimulationContext {
        // Will be implemented in future tasks
        _placeholder: u8,
    }
    
    /// Initialize simulation and return context pointer
    #[no_mangle]
    pub extern "C" fn initialize_simulation() -> *mut c_void {
        init_logger();
        log::info!("Initializing simulation via FFI");
        
        // Placeholder implementation
        std::ptr::null_mut()
    }
    
    /// Set simulation parameters
    #[no_mangle]
    pub extern "C" fn set_simulation_parameters(
        _ctx: *mut c_void,
        _params: *const c_void,
    ) -> c_int {
        // Placeholder implementation
        0 // Success
    }
    
    /// Run simulation
    #[no_mangle]
    pub extern "C" fn run_simulation(
        _ctx: *mut c_void,
        _progress_callback: extern "C" fn(f32),
    ) -> c_int {
        // Placeholder implementation
        0 // Success
    }
    
    /// Get temperature data for specific time step
    #[no_mangle]
    pub extern "C" fn get_temperature_data(
        _ctx: *mut c_void,
        _time_step: c_int,
        _buffer: *mut f32,
        _buffer_size: usize,
    ) -> c_int {
        // Placeholder implementation
        0 // Success
    }
    
    /// Destroy simulation context
    #[no_mangle]
    pub extern "C" fn destroy_simulation(_ctx: *mut c_void) {
        log::info!("Destroying simulation context");
    }
    
    /// Get last error message
    #[no_mangle]
    pub extern "C" fn get_last_error() -> *const c_char {
        let error_msg = CString::new("No error").unwrap();
        error_msg.into_raw()
    }
    
    /// Free error message memory
    #[no_mangle]
    pub extern "C" fn free_error_message(message: *mut c_char) {
        if !message.is_null() {
            unsafe {
                let _ = CString::from_raw(message);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_library_info() {
        let info = info();
        assert_eq!(info.name, "plasma_simulation");
        assert!(!info.version.is_empty());
        assert!(!info.description.is_empty());
    }
    
    #[test]
    fn test_version() {
        let version = version();
        assert!(!version.is_empty());
    }
    
    #[test]
    fn test_init_logger() {
        // Should not panic when called multiple times
        init_logger();
        init_logger();
    }
}
