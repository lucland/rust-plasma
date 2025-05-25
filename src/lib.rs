//-----------------------------------------------------------------------------
// File: lib.rs
// Main Responsibility: Entry point for the Plasma Furnace Simulator library.
//
// This file serves as the entry point and core API for the Plasma Furnace
// Simulator. It defines the Foreign Function Interface (FFI) that allows the
// Rust-based simulation engine to be called from other programming languages.
// The file manages the simulation context and exposes core functions like
// initializing the simulation, setting parameters, running the simulation,
// retrieving temperature data, and handling errors. It acts as the bridge
// between the Rust backend and any external applications or interfaces.
//-----------------------------------------------------------------------------

// Biblioteca principal do simulador de fornalha de plasma

mod simulation;

mod formula;

use std::ffi::{c_void, CString};
use std::os::raw::{c_char, c_int};

// Inicializa o logger
pub fn init_logger() {
    env_logger::init();
    log::info!("Simulador de Fornalha de Plasma - Backend inicializado");
}

// Estrutura de contexto da simulação que será exposta via FFI
#[repr(C)]
pub struct SimulationContext {
    // Será implementado conforme o desenvolvimento das features
}

// API FFI

/// Inicializa a simulação e retorna um ponteiro para o contexto
#[no_mangle]
pub extern "C" fn initialize_simulation() -> *mut c_void {
    log::info!("Inicializando simulação");
    
    // Por enquanto, retorna um ponteiro nulo
    // Será implementado na feature de simulação básica
    std::ptr::null_mut()
}

/// Define os parâmetros da simulação
#[no_mangle]
pub extern "C" fn set_simulation_parameters(
    _ctx: *mut c_void,
    _params: *const c_void,
) -> c_int {
    // Será implementado na feature de simulação básica
    0 // Sucesso
}

/// Executa a simulação
#[no_mangle]
pub extern "C" fn run_simulation(
    _ctx: *mut c_void,
    _progress_callback: extern "C" fn(f32),
) -> c_int {
    // Será implementado na feature de simulação básica
    0 // Sucesso
}

/// Obtém os dados de temperatura para um passo de tempo específico
#[no_mangle]
pub extern "C" fn get_temperature_data(
    _ctx: *mut c_void,
    _time_step: c_int,
    _buffer: *mut f32,
    _buffer_size: usize,
) -> c_int {
    // Será implementado na feature de simulação básica
    0 // Sucesso
}

/// Libera os recursos da simulação
#[no_mangle]
pub extern "C" fn destroy_simulation(_ctx: *mut c_void) {
    // Será implementado na feature de simulação básica
    log::info!("Finalizando simulação");
}

/// Obtém a última mensagem de erro
#[no_mangle]
pub extern "C" fn get_last_error() -> *const c_char {
    let error_msg = CString::new("Nenhum erro").unwrap();
    error_msg.into_raw()
}

/// Libera a memória de uma string retornada por get_last_error
#[no_mangle]
pub extern "C" fn free_error_message(message: *mut c_char) {
    if !message.is_null() {
        unsafe {
            let _ = CString::from_raw(message);
        }
    }
}
