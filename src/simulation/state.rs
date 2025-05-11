//-----------------------------------------------------------------------------
// File: simulation/state.rs
// Main Responsibility: Manage simulation execution state and threading.
//
// This file manages the runtime state of the simulation, including status
// (running, paused, completed, failed), progress tracking, and thread-safe
// execution. It provides mechanisms for starting, pausing, resuming, and
// canceling simulations, as well as thread synchronization for parallel
// execution. This component ensures reliable simulation execution and status
// monitoring.
//-----------------------------------------------------------------------------

// Implementação do estado da simulação

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::{self, JoinHandle};

use super::solver::{SimulationParameters, SimulationResults, HeatSolver};

/// Enumeração que representa o status da simulação
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SimulationStatus {
    /// Simulação não iniciada
    NotStarted,
    /// Simulação em execução
    Running,
    /// Simulação pausada
    Paused,
    /// Simulação concluída
    Completed,
    /// Simulação falhou
    Failed,
}

/// Estrutura que representa o estado da simulação
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationState {
    /// Parâmetros da simulação
    pub parameters: SimulationParameters,
    /// Status da simulação
    pub status: SimulationStatus,
    /// Progresso da simulação (0.0 - 1.0)
    pub progress: f32,
    /// Mensagem de erro (se houver)
    pub error_message: Option<String>,
    /// Resultados da simulação (se concluída)
    #[serde(skip)]
    pub results: Option<SimulationResults>,
    /// Tempo de início da simulação
    #[serde(skip)]
    pub start_time: Option<Instant>,
    /// Tempo de execução da simulação (s)
    pub execution_time: f64,
}

impl SimulationState {
    /// Cria um novo estado de simulação com os parâmetros especificados
    pub fn new(parameters: SimulationParameters) -> Self {
        Self {
            parameters,
            status: SimulationStatus::NotStarted,
            progress: 0.0,
            error_message: None,
            results: None,
            start_time: None,
            execution_time: 0.0,
        }
    }

    /// Inicia a simulação
    pub fn start(&mut self) -> Result<(), String> {
        if self.status == SimulationStatus::Running {
            return Err("Simulação já está em execução".to_string());
        }

        self.status = SimulationStatus::Running;
        self.progress = 0.0;
        self.error_message = None;
        self.start_time = Some(Instant::now());

        Ok(())
    }

    /// Pausa a simulação
    pub fn pause(&mut self) -> Result<(), String> {
        if self.status != SimulationStatus::Running {
            return Err("Simulação não está em execução".to_string());
        }

        self.status = SimulationStatus::Paused;

        Ok(())
    }

    /// Retoma a simulação
    pub fn resume(&mut self) -> Result<(), String> {
        if self.status != SimulationStatus::Paused {
            return Err("Simulação não está pausada".to_string());
        }

        self.status = SimulationStatus::Running;

        Ok(())
    }

    /// Atualiza o progresso da simulação
    pub fn update_progress(&mut self, progress: f32) {
        self.progress = progress;
    }

    /// Conclui a simulação com sucesso
    pub fn complete(&mut self, results: SimulationResults) {
        self.status = SimulationStatus::Completed;
        self.progress = 1.0;
        self.results = Some(results);
        
        if let Some(start_time) = self.start_time {
            self.execution_time = start_time.elapsed().as_secs_f64();
        }
    }

    /// Marca a simulação como falha
    pub fn fail(&mut self, error_message: String) {
        self.status = SimulationStatus::Failed;
        self.error_message = Some(error_message);
        
        if let Some(start_time) = self.start_time {
            self.execution_time = start_time.elapsed().as_secs_f64();
        }
    }

    /// Verifica se a simulação está concluída
    pub fn is_completed(&self) -> bool {
        self.status == SimulationStatus::Completed
    }

    /// Verifica se a simulação falhou
    pub fn is_failed(&self) -> bool {
        self.status == SimulationStatus::Failed
    }

    /// Retorna os resultados da simulação, se disponíveis
    pub fn get_results(&self) -> Option<&SimulationResults> {
        self.results.as_ref()
    }
}

/// Estrutura thread-safe para compartilhar o estado da simulação
pub struct SharedSimulationState {
    /// Estado da simulação
    state: Arc<Mutex<SimulationState>>,
    /// Flag para solicitar cancelamento da simulação
    cancel_flag: Arc<AtomicBool>,
    /// Handle para a thread da simulação (se estiver rodando)
    simulation_thread: Mutex<Option<JoinHandle<()>>>,
}

impl SharedSimulationState {
    /// Cria um novo estado compartilhado com os parâmetros especificados
    pub fn new(parameters: SimulationParameters) -> Self {
        Self {
            state: Arc::new(Mutex::new(SimulationState::new(parameters))),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            simulation_thread: Mutex::new(None),
        }
    }

    /// Obtém uma cópia do estado atual
    pub fn get_state(&self) -> Result<SimulationState, String> {
        match self.state.lock() {
            Ok(state) => Ok(state.clone()),
            Err(poison_err) => Err(format!("Failed to lock state mutex (poisoned: {}): ", poison_err)),
        }
    }

    /// Requests cancellation of the running simulation.
    pub fn request_cancellation(&self) {
        self.cancel_flag.store(true, Ordering::Relaxed);
    }

    /// Checks if cancellation has been requested.
    pub fn is_cancellation_requested(&self) -> bool {
        self.cancel_flag.load(Ordering::Relaxed)
    }

    /// Waits for the simulation thread to finish.
    /// Returns Ok(true) if joined successfully, Ok(false) if no thread was running,
    /// Err(String) on error (e.g., mutex poison, thread panic).
    pub fn join_simulation_thread(&self) -> Result<bool, String> {
        let mut handle_guard = self.simulation_thread.lock()
            .map_err(|e| format!("Failed to lock thread handle mutex: {}", e))?;

        if let Some(handle) = handle_guard.take() {
            handle.join().map_err(|e| format!("Simulation thread panicked: {:?}", e))?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Executa a simulação em uma thread separada
    pub fn run_simulation(&self) -> Result<(), String> {
        // Check if already running
        {
            let mut handle_guard = self.simulation_thread.lock()
                .map_err(|e| format!("Failed to lock thread handle mutex: {}", e))?;
            if handle_guard.is_some() {
                return Err("Simulation thread handle already exists. Call destroy_simulation or wait for completion.".to_string());
            }
        }

        // Obter parâmetros da simulação e reset cancel flag
        let parameters = {
            let state = self.state.lock().map_err(|e| format!("Failed to lock state mutex: {}", e))?;
            self.cancel_flag.store(false, Ordering::Relaxed);
            state.parameters.clone()
        };

        // Iniciar simulação state
        {
            let mut state = self.state.lock().map_err(|e| format!("Failed to lock state mutex: {}", e))?;
            state.start()?;
        }

        // Criar clones para a thread
        let state_clone = self.state.clone();
        let cancel_flag_clone = self.cancel_flag.clone();
        let simulation_thread_mutex_clone = self.simulation_thread.clone();

        // Executar simulação em uma thread separada
        let handle = thread::spawn(move || {
            // Criar solucionador
            let solver_result = HeatSolver::new(parameters);

            let final_status = match solver_result {
                Err(err) => {
                    eprintln!("Solver initialization failed: {}", err);
                    SimulationStatus::Failed
                }
                Ok(mut solver) => {
                    // Definir callback de progresso (adaptado para checar cancelamento)
                    let progress_callback = |progress: f32| {
                        if cancel_flag_clone.load(Ordering::Relaxed) {
                            return false;
                        }
                        if let Ok(mut state) = state_clone.lock() {
                            state.update_progress(progress);
                            if state.status == SimulationStatus::Paused {
                                drop(state);
                                while cancel_flag_clone.load(Ordering::Relaxed) == false {
                                    if let Ok(current_state) = state_clone.lock() {
                                        if current_state.status != SimulationStatus::Paused {
                                            break;
                                        }
                                    } else {
                                        eprintln!("Progress callback: Failed to re-lock state while paused.");
                                        return false;
                                    }
                                    thread::sleep(std::time::Duration::from_millis(100));
                                }
                                if cancel_flag_clone.load(Ordering::Relaxed) {
                                    return false;
                                }
                            }
                        } else {
                            eprintln!("Progress callback: Failed to lock state.");
                            return false;
                        }
                        true
                    };

                    // Executar simulação
                    let result = solver.run(Some(&progress_callback), cancel_flag_clone.clone());

                    // Retorna o status final baseado no resultado
                    match result {
                        Ok(_) => SimulationStatus::Completed,
                        Err(err) if err == "Simulation cancelled" => SimulationStatus::Failed,
                        Err(err) => {
                            eprintln!("Simulation run failed: {}", err);
                            SimulationStatus::Failed
                        }
                    }
                }
            };

            // Atualizar estado final (outside solver Result match)
            if let Ok(mut state) = state_clone.lock() {
                match final_status {
                    SimulationStatus::Completed => {
                        if state.status != SimulationStatus::Failed {
                            state.status = SimulationStatus::Completed;
                            state.progress = 1.0;
                            if let Some(start_time) = state.start_time {
                                state.execution_time = start_time.elapsed().as_secs_f64();
                            }
                        }
                    }
                    SimulationStatus::Failed => {
                        if state.status != SimulationStatus::Failed {
                            state.fail(if cancel_flag_clone.load(Ordering::Relaxed) {
                                "Simulation cancelled by user".to_string()
                            } else {
                                state.error_message.clone().unwrap_or_else(|| "Simulation failed".to_string())
                            });
                        }
                    }
                    _ => {}
                }
            } else {
                eprintln!("Thread finished but could not lock state mutex to finalize.");
            }

            // Auto-cleanup: Remove handle from shared state when thread finishes
            if let Ok(mut handle_guard) = simulation_thread_mutex_clone.lock() {
                *handle_guard = None;
                println!("Simulation thread finished and handle removed.");
            } else {
                eprintln!("Simulation thread finished but failed to lock handle mutex for cleanup.");
            }
        });

        // Store the handle
        {
            let mut handle_guard = self.simulation_thread.lock()
                .map_err(|e| format!("Failed to lock thread handle mutex after spawn: {}", e))?;
            *handle_guard = Some(handle);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::physics::PlasmaTorch;
    use std::time::Duration;

    #[test]
    fn test_simulation_state_flow() {
        let mut params = SimulationParameters::new(1.0, 0.5, 10, 20);
        params.add_torch(PlasmaTorch::new(0.0, 0.0, 90.0, 0.0, 100.0, 0.01, 5000.0));

        let shared_state = SharedSimulationState::new(params.clone());

        // Initial state
        let initial_state = shared_state.get_state().unwrap();
        assert_eq!(initial_state.status, SimulationStatus::NotStarted);
        assert_eq!(initial_state.progress, 0.0);
        assert!(initial_state.error_message.is_none());
        assert!(initial_state.results.is_none());

        // Start simulation (mocked run)
        {
            let mut state_guard = shared_state.state.lock().unwrap();
            state_guard.start().unwrap();
            assert_eq!(state_guard.status, SimulationStatus::Running);
        }

        // Pause
        {
            let mut state_guard = shared_state.state.lock().unwrap();
            state_guard.pause().unwrap();
            assert_eq!(state_guard.status, SimulationStatus::Paused);
        }

        // Resume
        {
            let mut state_guard = shared_state.state.lock().unwrap();
            state_guard.resume().unwrap();
            assert_eq!(state_guard.status, SimulationStatus::Running);
        }

        // Complete (mocked)
        {
             let mut state_guard = shared_state.state.lock().unwrap();
             let dummy_results = SimulationResults {
                 parameters: params.clone(),
                 mesh: super::super::mesh::CylindricalMesh::new(params.height, params.radius, params.nr, params.nz, params.ntheta).unwrap(),
                 temperature: ndarray::Array3::zeros((params.nr, params.nz, 1)),
                 execution_time: 0.0,
                 phase_change_info: None,
             };
             state_guard.complete(dummy_results);
            assert_eq!(state_guard.status, SimulationStatus::Completed);
            assert_eq!(state_guard.progress, 1.0);
            assert!(state_guard.results.is_some());
            assert!(state_guard.execution_time > 0.0);
        }

         // Fail (mocked)
         {
             let mut state_guard = shared_state.state.lock().unwrap();
             state_guard.start().unwrap_err();
             state_guard.status = SimulationStatus::Running;
             state_guard.error_message = None;
             state_guard.fail("Test failure".to_string());
             assert_eq!(state_guard.status, SimulationStatus::Failed);
             assert_eq!(state_guard.error_message, Some("Test failure".to_string()));
         }
    }

    // Note: Testing run_simulation requires more setup, possibly mocking HeatSolver::run
    // or running a very short dummy simulation.
    // Testing cancellation and join requires careful thread synchronization.
}
