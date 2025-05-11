//-----------------------------------------------------------------------------
// File: simulation/parametric.rs
// Main Responsibility: Enable systematic parameter space exploration.
//
// This file implements the parametric study functionality that allows for
// systematic exploration of the parameter space through automation of multiple
// simulation runs with varying parameters. It provides capabilities for linear
// and logarithmic parameter sweeps, sensitivity analysis, and optimization
// studies. This component enables researchers to study the effects of different
// parameters on simulation results and optimize furnace designs based on
// various performance metrics.
//-----------------------------------------------------------------------------
// This file implements parametric study functionality with the following components:
//
// - ScaleType: Enum defining parameter scaling methods (Linear, Logarithmic)
// - ParametricParameter: Struct defining a parameter to be varied in a study, including
//   name, range, and scaling type
// - OptimizationGoal: Enum defining optimization targets (Maximize, Minimize)
// - ParametricStudyConfig: Configuration for a parametric study including parameters to vary
//   and optimization goals
// - ParametricSimulationResult: Stores results from a single parametric simulation run
// - ParametricStudyResult: Collects and analyzes results from all parametric simulations
// - ParametricStudyManager: Manages execution of parametric studies with methods:
//   - new(): Creates a new manager instance with given configuration
//   - generate_parameter_combinations(): Creates all parameter sets for the study
//   - export_results(): Exports study results to CSV or JSON files
//   - run_study(): Runs the parametric study and returns the results
//   - generate_linear_values(): Generates linearly spaced values for a parameter
//   - generate_logarithmic_values(): Generates logarithmically spaced values for a parameter
//   - run_simulations_sequential(): Runs the parametric study sequentially
//   - run_simulations_parallel(): Runs the parametric study in parallel
//   - run_single_simulation(): Runs a single simulation with the given parameter values
//   - apply_parameter(): Applies a parameter value to the simulation
//   - extract_target_metric(): Extracts the target metric from the simulation results  
//   - extract_additional_metrics(): Extracts additional metrics from the simulation results
//   - find_best_configuration(): Finds the best configuration based on the optimization goal
//   - perform_sensitivity_analysis(): Performs sensitivity analysis on the parametric study
//   - generate_report(): Generates a report of the parametric study
//   - calculate_parameter_sensitivity(): Calculates the sensitivity of the target metric to each parameter
//   - calculate_correlation(): Calculates the correlation between the target metric and each parameter
//   - create_energy_efficiency_study(): Creates an energy efficiency study
//   - create_max_temperature_study(): Creates a maximum temperature study
//   - calculate_improvement_percentage(): Calculates the improvement percentage of the target metric

// Implementação do módulo de estudos paramétricos para o simulador de fornalha de plasma

use ndarray::{Array1, Array2, Array3, ArrayView3};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::simulation::state::SimulationState;
use crate::simulation::mesh::CylindricalMesh;
use crate::simulation::solver::Solver;
use crate::simulation::physics::PlasmaPhysics;
use crate::simulation::metrics::{SimulationMetrics, MetricsAnalyzer};

/// Estrutura que representa um parâmetro para estudo paramétrico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParametricParameter {
    /// Nome do parâmetro
    pub name: String,
    /// Descrição do parâmetro
    pub description: String,
    /// Unidade do parâmetro
    pub unit: String,
    /// Valor mínimo do parâmetro
    pub min_value: f64,
    /// Valor máximo do parâmetro
    pub max_value: f64,
    /// Número de pontos a serem avaliados
    pub num_points: usize,
    /// Tipo de escala (linear, logarítmica)
    pub scale_type: ScaleType,
    /// Valores específicos a serem avaliados (opcional)
    pub specific_values: Option<Vec<f64>>,
}

/// Enumeração que representa o tipo de escala para variação de parâmetros
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScaleType {
    /// Escala linear
    Linear,
    /// Escala logarítmica
    Logarithmic,
}

/// Estrutura que representa uma configuração para estudo paramétrico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParametricStudyConfig {
    /// Nome do estudo
    pub name: String,
    /// Descrição do estudo
    pub description: String,
    /// Parâmetros a serem variados
    pub parameters: Vec<ParametricParameter>,
    /// Métrica a ser avaliada
    pub target_metric: String,
    /// Objetivo da otimização (maximizar ou minimizar)
    pub optimization_goal: OptimizationGoal,
    /// Número máximo de simulações
    pub max_simulations: usize,
    /// Tempo máximo de execução em segundos
    pub max_execution_time: Option<f64>,
    /// Usar processamento paralelo
    pub use_parallel: bool,
    /// Metadados adicionais
    pub metadata: HashMap<String, String>,
}

/// Enumeração que representa o objetivo da otimização
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OptimizationGoal {
    /// Maximizar a métrica
    Maximize,
    /// Minimizar a métrica
    Minimize,
}

/// Estrutura que representa um resultado de simulação para estudo paramétrico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParametricSimulationResult {
    /// Valores dos parâmetros
    pub parameter_values: HashMap<String, f64>,
    /// Valor da métrica alvo
    pub target_metric_value: f64,
    /// Métricas adicionais
    pub additional_metrics: HashMap<String, f64>,
    /// Tempo de execução da simulação em segundos
    pub execution_time: f64,
    /// Identificador da simulação
    pub simulation_id: usize,
}

/// Estrutura que representa o resultado de um estudo paramétrico
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParametricStudyResult {
    /// Configuração do estudo
    pub config: ParametricStudyConfig,
    /// Resultados das simulações
    pub simulation_results: Vec<ParametricSimulationResult>,
    /// Melhor configuração encontrada
    pub best_configuration: ParametricSimulationResult,
    /// Análise de sensibilidade
    pub sensitivity_analysis: HashMap<String, f64>,
    /// Tempo total de execução em segundos
    pub total_execution_time: f64,
    /// Número total de simulações executadas
    pub total_simulations: usize,
    /// Metadados adicionais
    pub metadata: HashMap<String, String>,
}

/// Estrutura que representa um gerenciador de estudos paramétricos
pub struct ParametricStudyManager {
    /// Configuração do estudo
    config: ParametricStudyConfig,
    /// Resultados das simulações
    simulation_results: Vec<ParametricSimulationResult>,
    /// Tempo de início do estudo
    start_time: std::time::Instant,
    /// Solver para simulações
    solver: Solver,
    /// Física do plasma
    physics: PlasmaPhysics,
    /// Malha cilíndrica
    mesh: CylindricalMesh,
}

impl ParametricStudyManager {
    /// Cria um novo gerenciador de estudos paramétricos
    pub fn new(config: ParametricStudyConfig, solver: Solver, physics: PlasmaPhysics, mesh: CylindricalMesh) -> Self {
        Self {
            config,
            simulation_results: Vec::new(),
            start_time: std::time::Instant::now(),
            solver,
            physics,
            mesh,
        }
    }
    
    /// Executa o estudo paramétrico
    pub fn run_study(&mut self) -> Result<ParametricStudyResult, String> {
        println!("Iniciando estudo paramétrico: {}", self.config.name);
        println!("Descrição: {}", self.config.description);
        println!("Parâmetros a serem variados: {}", self.config.parameters.len());
        
        // Verificar se há parâmetros para variar
        if self.config.parameters.is_empty() {
            return Err("Nenhum parâmetro definido para o estudo paramétrico".to_string());
        }
        
        // Gerar combinações de parâmetros
        let parameter_combinations = self.generate_parameter_combinations()?;
        
        println!("Número total de combinações: {}", parameter_combinations.len());
        
        // Verificar se o número de combinações excede o máximo permitido
        if parameter_combinations.len() > self.config.max_simulations {
            println!("Aviso: O número de combinações ({}) excede o máximo permitido ({}). Algumas combinações serão ignoradas.",
                parameter_combinations.len(), self.config.max_simulations);
        }
        
        // Limitar o número de combinações
        let max_combinations = std::cmp::min(parameter_combinations.len(), self.config.max_simulations);
        let combinations_to_run = &parameter_combinations[0..max_combinations];
        
        // Iniciar o cronômetro
        self.start_time = std::time::Instant::now();
        
        // Executar simulações
        if self.config.use_parallel {
            self.run_simulations_parallel(combinations_to_run)?;
        } else {
            self.run_simulations_sequential(combinations_to_run)?;
        }
        
        // Calcular tempo total de execução
        let total_execution_time = self.start_time.elapsed().as_secs_f64();
        
        // Encontrar a melhor configuração
        let best_configuration = self.find_best_configuration()?;
        
        // Realizar análise de sensibilidade
        let sensitivity_analysis = self.perform_sensitivity_analysis();
        
        // Criar resultado do estudo
        let result = ParametricStudyResult {
            config: self.config.clone(),
            simulation_results: self.simulation_results.clone(),
            best_configuration,
            sensitivity_analysis,
            total_execution_time,
            total_simulations: self.simulation_results.len(),
            metadata: HashMap::new(),
        };
        
        println!("Estudo paramétrico concluído em {:.2} segundos", total_execution_time);
        println!("Número total de simulações executadas: {}", result.total_simulations);
        
        Ok(result)
    }
    
    /// Gera combinações de parâmetros para o estudo
    fn generate_parameter_combinations(&self) -> Result<Vec<HashMap<String, f64>>, String> {
        // Verificar se há parâmetros para variar
        if self.config.parameters.is_empty() {
            return Err("Nenhum parâmetro definido para o estudo paramétrico".to_string());
        }
        
        // Gerar valores para cada parâmetro
        let mut parameter_values: Vec<(String, Vec<f64>)> = Vec::new();
        
        for param in &self.config.parameters {
            let values = if let Some(specific_values) = &param.specific_values {
                specific_values.clone()
            } else {
                match param.scale_type {
                    ScaleType::Linear => self.generate_linear_values(param)?,
                    ScaleType::Logarithmic => self.generate_logarithmic_values(param)?,
                }
            };
            
            parameter_values.push((param.name.clone(), values));
        }
        
        // Gerar todas as combinações possíveis
        let combinations = self.generate_combinations(&parameter_values, 0, HashMap::new());
        
        Ok(combinations)
    }
    
    /// Gera valores em escala linear para um parâmetro
    fn generate_linear_values(&self, param: &ParametricParameter) -> Result<Vec<f64>, String> {
        if param.num_points < 2 {
            return Err(format!("Número de pontos inválido para o parâmetro {}: {}", param.name, param.num_points));
        }
        
        let step = (param.max_value - param.min_value) / (param.num_points - 1) as f64;
        let mut values = Vec::with_capacity(param.num_points);
        
        for i in 0..param.num_points {
            let value = param.min_value + i as f64 * step;
            values.push(value);
        }
        
        Ok(values)
    }
    
    /// Gera valores em escala logarítmica para um parâmetro
    fn generate_logarithmic_values(&self, param: &ParametricParameter) -> Result<Vec<f64>, String> {
        if param.num_points < 2 {
            return Err(format!("Número de pontos inválido para o parâmetro {}: {}", param.name, param.num_points));
        }
        
        if param.min_value <= 0.0 || param.max_value <= 0.0 {
            return Err(format!("Valores inválidos para escala logarítmica no parâmetro {}: min={}, max={}",
                param.name, param.min_value, param.max_value));
        }
        
        let log_min = param.min_value.ln();
        let log_max = param.max_value.ln();
        let log_step = (log_max - log_min) / (param.num_points - 1) as f64;
        
        let mut values = Vec::with_capacity(param.num_points);
        
        for i in 0..param.num_points {
            let log_value = log_min + i as f64 * log_step;
            let value = log_value.exp();
            values.push(value);
        }
        
        Ok(values)
    }
    
    /// Gera todas as combinações possíveis de parâmetros
    fn generate_combinations(
        &self,
        parameter_values: &[(String, Vec<f64>)],
        index: usize,
        current_combination: HashMap<String, f64>,
    ) -> Vec<HashMap<String, f64>> {
        if index >= parameter_values.len() {
            return vec![current_combination];
        }
        
        let (param_name, values) = &parameter_values[index];
        let mut combinations = Vec::new();
        
        for &value in values {
            let mut new_combination = current_combination.clone();
            new_combination.insert(param_name.clone(), value);
            
            let sub_combinations = self.generate_combinations(parameter_values, index + 1, new_combination);
            combinations.extend(sub_combinations);
        }
        
        combinations
    }
    
    /// Executa simulações sequencialmente
    fn run_simulations_sequential(&mut self, combinations: &[HashMap<String, f64>]) -> Result<(), String> {
        println!("Executando {} simulações sequencialmente", combinations.len());
        
        for (i, combination) in combinations.iter().enumerate() {
            // Verificar se o tempo máximo de execução foi excedido
            if let Some(max_time) = self.config.max_execution_time {
                let elapsed = self.start_time.elapsed().as_secs_f64();
                if elapsed > max_time {
                    println!("Tempo máximo de execução excedido ({:.2} s). Interrompendo estudo.", elapsed);
                    break;
                }
            }
            
            // Executar simulação com a combinação atual
            let start_time = std::time::Instant::now();
            let result = self.run_single_simulation(combination, i)?;
            let execution_time = start_time.elapsed().as_secs_f64();
            
            // Armazenar resultado
            self.simulation_results.push(ParametricSimulationResult {
                parameter_values: combination.clone(),
                target_metric_value: result.target_metric_value,
                additional_metrics: result.additional_metrics,
                execution_time,
                simulation_id: i,
            });
            
            // Exibir progresso
            if (i + 1) % 10 == 0 || i + 1 == combinations.len() {
                println!("Progresso: {}/{} simulações concluídas ({:.1}%)",
                    i + 1, combinations.len(), (i + 1) as f64 / combinations.len() as f64 * 100.0);
            }
        }
        
        Ok(())
    }
    
    /// Executa simulações em paralelo
    fn run_simulations_parallel(&mut self, combinations: &[HashMap<String, f64>]) -> Result<(), String> {
        println!("Executando {} simulações em paralelo", combinations.len());
        
        // Criar estruturas compartilhadas
        let results = Arc::new(Mutex::new(Vec::new()));
        let start_time = self.start_time;
        let max_execution_time = self.config.max_execution_time;
        
        // Executar simulações em paralelo
        combinations.par_iter().enumerate().for_each(|(i, combination)| {
            // Verificar se o tempo máximo de execução foi excedido
            if let Some(max_time) = max_execution_time {
                let elapsed = start_time.elapsed().as_secs_f64();
                if elapsed > max_time {
                    return;
                }
            }
            
            // Executar simulação com a combinação atual
            let sim_start_time = std::time::Instant::now();
            let result = match self.run_single_simulation(combination, i) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Erro na simulação {}: {}", i, e);
                    return;
                }
            };
            let execution_time = sim_start_time.elapsed().as_secs_f64();
            
            // Armazenar resultado
            let mut results_guard = results.lock().unwrap();
            results_guard.push(ParametricSimulationResult {
                parameter_values: combination.clone(),
                target_metric_value: result.target_metric_value,
                additional_metrics: result.additional_metrics,
                execution_time,
                simulation_id: i,
            });
            
            // Exibir progresso
            let progress = results_guard.len();
            if progress % 10 == 0 || progress == combinations.len() {
                println!("Progresso: {}/{} simulações concluídas ({:.1}%)",
                    progress, combinations.len(), progress as f64 / combinations.len() as f64 * 100.0);
            }
        });
        
        // Obter resultados
        let results_guard = results.lock().unwrap();
        self.simulation_results = results_guard.clone();
        
        Ok(())
    }
    
    /// Executa uma única simulação com uma combinação de parâmetros
    fn run_single_simulation(&self, parameters: &HashMap<String, f64>, simulation_id: usize) -> Result<ParametricSimulationResult, String> {
        // Criar cópia do solver e da física
        let mut solver = self.solver.clone();
        let mut physics = self.physics.clone();
        
        // Aplicar parâmetros à física e ao solver
        for (name, value) in parameters {
            self.apply_parameter(&mut solver, &mut physics, name, *value)?;
        }
        
        // Criar estado de simulação
        let mut state = SimulationState::new(self.mesh.clone());
        
        // Executar simulação
        solver.solve(&mut state, &physics)?;
        
        // Calcular métricas
        let metrics_analyzer = MetricsAnalyzer::new(&state);
        let metrics = metrics_analyzer.calculate_metrics();
        
        // Extrair métrica alvo
        let target_metric_value = self.extract_target_metric(&metrics)?;
        
        // Extrair métricas adicionais
        let additional_metrics = self.extract_additional_metrics(&metrics);
        
        Ok(ParametricSimulationResult {
            parameter_values: parameters.clone(),
            target_metric_value,
            additional_metrics,
            execution_time: 0.0, // Será preenchido pelo chamador
            simulation_id,
        })
    }
    
    /// Aplica um parâmetro ao solver e à física
    fn apply_parameter(&self, solver: &mut Solver, physics: &mut PlasmaPhysics, name: &str, value: f64) -> Result<(), String> {
        // Aplicar parâmetro com base no nome
        match name {
            // Parâmetros do solver
            "time_step" => solver.set_time_step(value),
            "max_iterations" => solver.set_max_iterations(value as usize),
            "convergence_tolerance" => solver.set_convergence_tolerance(value),
            
            // Parâmetros da física
            "thermal_conductivity" => physics.set_thermal_conductivity(value),
            "specific_heat" => physics.set_specific_heat(value),
            "density" => physics.set_density(value),
            "emissivity" => physics.set_emissivity(value),
            "torch_power" => physics.set_torch_power(value),
            "torch_efficiency" => physics.set_torch_efficiency(value),
            "ambient_temperature" => physics.set_ambient_temperature(value),
            
            // Parâmetro desconhecido
            _ => return Err(format!("Parâmetro desconhecido: {}", name)),
        }
        
        Ok(())
    }
    
    /// Extrai a métrica alvo dos resultados da simulação
    fn extract_target_metric(&self, metrics: &SimulationMetrics) -> Result<f64, String> {
        match self.config.target_metric.as_str() {
            "max_temperature" => Ok(metrics.max_temperature),
            "min_temperature" => Ok(metrics.min_temperature),
            "avg_temperature" => Ok(metrics.avg_temperature),
            "max_gradient" => Ok(metrics.max_gradient),
            "avg_gradient" => Ok(metrics.avg_gradient),
            "max_heat_flux" => Ok(metrics.max_heat_flux),
            "avg_heat_flux" => Ok(metrics.avg_heat_flux),
            "total_energy" => Ok(metrics.total_energy),
            "heating_rate" => Ok(metrics.heating_rate),
            "energy_efficiency" => Ok(metrics.energy_efficiency),
            _ => Err(format!("Métrica alvo desconhecida: {}", self.config.target_metric)),
        }
    }
    
    /// Extrai métricas adicionais dos resultados da simulação
    fn extract_additional_metrics(&self, metrics: &SimulationMetrics) -> HashMap<String, f64> {
        let mut additional_metrics = HashMap::new();
        
        // Adicionar todas as métricas disponíveis
        additional_metrics.insert("max_temperature".to_string(), metrics.max_temperature);
        additional_metrics.insert("min_temperature".to_string(), metrics.min_temperature);
        additional_metrics.insert("avg_temperature".to_string(), metrics.avg_temperature);
        additional_metrics.insert("max_gradient".to_string(), metrics.max_gradient);
        additional_metrics.insert("avg_gradient".to_string(), metrics.avg_gradient);
        additional_metrics.insert("max_heat_flux".to_string(), metrics.max_heat_flux);
        additional_metrics.insert("avg_heat_flux".to_string(), metrics.avg_heat_flux);
        additional_metrics.insert("total_energy".to_string(), metrics.total_energy);
        additional_metrics.insert("heating_rate".to_string(), metrics.heating_rate);
        additional_metrics.insert("energy_efficiency".to_string(), metrics.energy_efficiency);
        
        // Remover a métrica alvo para evitar duplicação
        additional_metrics.remove(&self.config.target_metric);
        
        additional_metrics
    }
    
    /// Encontra a melhor configuração com base na métrica alvo
    fn find_best_configuration(&self) -> Result<ParametricSimulationResult, String> {
        if self.simulation_results.is_empty() {
            return Err("Nenhum resultado de simulação disponível".to_string());
        }
        
        let best_result = match self.config.optimization_goal {
            OptimizationGoal::Maximize => {
                self.simulation_results.iter()
                    .max_by(|a, b| a.target_metric_value.partial_cmp(&b.target_metric_value).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap()
            },
            OptimizationGoal::Minimize => {
                self.simulation_results.iter()
                    .min_by(|a, b| a.target_metric_value.partial_cmp(&b.target_metric_value).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap()
            },
        };
        
        Ok(best_result.clone())
    }
    
    /// Realiza análise de sensibilidade para identificar parâmetros críticos
    fn perform_sensitivity_analysis(&self) -> HashMap<String, f64> {
        let mut sensitivity = HashMap::new();
        
        // Verificar se há resultados suficientes
        if self.simulation_results.len() < 2 {
            return sensitivity;
        }
        
        // Obter nomes dos parâmetros
        let parameter_names: Vec<String> = self.config.parameters.iter()
            .map(|p| p.name.clone())
            .collect();
        
        // Calcular sensibilidade para cada parâmetro
        for param_name in parameter_names {
            // Calcular variação da métrica em relação ao parâmetro
            let sensitivity_value = self.calculate_parameter_sensitivity(&param_name);
            sensitivity.insert(param_name, sensitivity_value);
        }
        
        // Normalizar sensibilidades
        let max_sensitivity = sensitivity.values()
            .cloned()
            .fold(0.0, |a, b| a.max(b.abs()));
        
        if max_sensitivity > 0.0 {
            for (_, value) in sensitivity.iter_mut() {
                *value /= max_sensitivity;
            }
        }
        
        sensitivity
    }
    
    /// Calcula a sensibilidade de um parâmetro específico
    fn calculate_parameter_sensitivity(&self, param_name: &str) -> f64 {
        // Agrupar resultados por valor do parâmetro
        let mut param_values = Vec::new();
        let mut metric_values = Vec::new();
        
        for result in &self.simulation_results {
            if let Some(&value) = result.parameter_values.get(param_name) {
                param_values.push(value);
                metric_values.push(result.target_metric_value);
            }
        }
        
        // Verificar se há dados suficientes
        if param_values.len() < 2 {
            return 0.0;
        }
        
        // Calcular correlação entre parâmetro e métrica
        let correlation = self.calculate_correlation(&param_values, &metric_values);
        
        // Calcular variação relativa da métrica
        let min_metric = metric_values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_metric = metric_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let metric_range = max_metric - min_metric;
        
        // Calcular variação relativa do parâmetro
        let min_param = param_values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_param = param_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let param_range = max_param - min_param;
        
        // Calcular sensibilidade como produto da correlação e da variação relativa
        if param_range > 0.0 && metric_range > 0.0 {
            correlation * (metric_range / min_metric.abs().max(0.001)) / (param_range / min_param.abs().max(0.001))
        } else {
            0.0
        }
    }
    
    /// Calcula o coeficiente de correlação de Pearson entre dois vetores
    fn calculate_correlation(&self, x: &[f64], y: &[f64]) -> f64 {
        if x.len() != y.len() || x.is_empty() {
            return 0.0;
        }
        
        let n = x.len() as f64;
        
        // Calcular médias
        let mean_x = x.iter().sum::<f64>() / n;
        let mean_y = y.iter().sum::<f64>() / n;
        
        // Calcular covariância e variâncias
        let mut cov_xy = 0.0;
        let mut var_x = 0.0;
        let mut var_y = 0.0;
        
        for i in 0..x.len() {
            let dx = x[i] - mean_x;
            let dy = y[i] - mean_y;
            
            cov_xy += dx * dy;
            var_x += dx * dx;
            var_y += dy * dy;
        }
        
        // Calcular correlação
        if var_x > 0.0 && var_y > 0.0 {
            cov_xy / (var_x.sqrt() * var_y.sqrt())
        } else {
            0.0
        }
    }
    
    /// Exporta os resultados do estudo paramétrico para um arquivo
    pub fn export_results(&self, result: &ParametricStudyResult, output_path: &str) -> Result<(), String> {
        let path = Path::new(output_path);
        let file = File::create(path).map_err(|e| format!("Erro ao criar arquivo de resultado: {}", e))?;
        
        serde_json::to_writer_pretty(file, result)
            .map_err(|e| format!("Erro ao escrever resultado do estudo paramétrico: {}", e))?;
        
        Ok(())
    }
    
    /// Gera um relatório do estudo paramétrico
    pub fn generate_report(&self, result: &ParametricStudyResult, output_path: &str) -> Result<(), String> {
        let path = Path::new(output_path);
        let mut file = File::create(path).map_err(|e| format!("Erro ao criar arquivo de relatório: {}", e))?;
        
        // Escrever cabeçalho do relatório
        let header = format!(
            "# Relatório de Estudo Paramétrico: {}\n\n{}\n\n",
            result.config.name,
            result.config.description
        );
        
        file.write_all(header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho do relatório: {}", e))?;
        
        // Escrever informações sobre o estudo
        let study_info = format!(
            "## Informações do Estudo\n\n\
             - Métrica alvo: {}\n\
             - Objetivo: {}\n\
             - Número total de simulações: {}\n\
             - Tempo total de execução: {:.2} segundos\n\n",
            result.config.target_metric,
            match result.config.optimization_goal {
                OptimizationGoal::Maximize => "Maximizar",
                OptimizationGoal::Minimize => "Minimizar",
            },
            result.total_simulations,
            result.total_execution_time
        );
        
        file.write_all(study_info.as_bytes()).map_err(|e| format!("Erro ao escrever informações do estudo: {}", e))?;
        
        // Escrever parâmetros variados
        let parameters_header = "## Parâmetros Variados\n\n";
        file.write_all(parameters_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de parâmetros: {}", e))?;
        
        for param in &result.config.parameters {
            let param_info = format!(
                "### {}\n\n\
                 - Descrição: {}\n\
                 - Unidade: {}\n\
                 - Faixa: {} a {}\n\
                 - Escala: {}\n\
                 - Número de pontos: {}\n\n",
                param.name,
                param.description,
                param.unit,
                param.min_value,
                param.max_value,
                match param.scale_type {
                    ScaleType::Linear => "Linear",
                    ScaleType::Logarithmic => "Logarítmica",
                },
                param.num_points
            );
            
            file.write_all(param_info.as_bytes()).map_err(|e| format!("Erro ao escrever informações do parâmetro {}: {}", param.name, e))?;
        }
        
        // Escrever melhor configuração
        let best_config_header = "## Melhor Configuração\n\n";
        file.write_all(best_config_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho da melhor configuração: {}", e))?;
        
        let best_config = &result.best_configuration;
        
        let best_metric_info = format!(
            "- Valor da métrica alvo ({}): {:.4}\n\n",
            result.config.target_metric,
            best_config.target_metric_value
        );
        
        file.write_all(best_metric_info.as_bytes()).map_err(|e| format!("Erro ao escrever informações da métrica alvo: {}", e))?;
        
        let best_params_header = "### Valores dos Parâmetros\n\n";
        file.write_all(best_params_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho dos valores dos parâmetros: {}", e))?;
        
        for param in &result.config.parameters {
            if let Some(&value) = best_config.parameter_values.get(&param.name) {
                let param_value_info = format!(
                    "- {}: {:.4} {}\n",
                    param.name,
                    value,
                    param.unit
                );
                
                file.write_all(param_value_info.as_bytes()).map_err(|e| format!("Erro ao escrever valor do parâmetro {}: {}", param.name, e))?;
            }
        }
        
        file.write_all(b"\n").map_err(|e| format!("Erro ao escrever quebra de linha: {}", e))?;
        
        // Escrever métricas adicionais da melhor configuração
        let additional_metrics_header = "### Métricas Adicionais\n\n";
        file.write_all(additional_metrics_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de métricas adicionais: {}", e))?;
        
        for (name, value) in &best_config.additional_metrics {
            let metric_info = format!(
                "- {}: {:.4}\n",
                name,
                value
            );
            
            file.write_all(metric_info.as_bytes()).map_err(|e| format!("Erro ao escrever métrica adicional {}: {}", name, e))?;
        }
        
        file.write_all(b"\n").map_err(|e| format!("Erro ao escrever quebra de linha: {}", e))?;
        
        // Escrever análise de sensibilidade
        let sensitivity_header = "## Análise de Sensibilidade\n\n";
        file.write_all(sensitivity_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de análise de sensibilidade: {}", e))?;
        
        // Ordenar parâmetros por sensibilidade
        let mut sensitivity_pairs: Vec<(&String, &f64)> = result.sensitivity_analysis.iter().collect();
        sensitivity_pairs.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        for (name, sensitivity) in sensitivity_pairs {
            let sensitivity_info = format!(
                "- {}: {:.4}\n",
                name,
                sensitivity
            );
            
            file.write_all(sensitivity_info.as_bytes()).map_err(|e| format!("Erro ao escrever sensibilidade do parâmetro {}: {}", name, e))?;
        }
        
        file.write_all(b"\n").map_err(|e| format!("Erro ao escrever quebra de linha: {}", e))?;
        
        // Escrever conclusões
        let conclusions_header = "## Conclusões\n\n";
        file.write_all(conclusions_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de conclusões: {}", e))?;
        
        // Identificar parâmetros mais sensíveis
        let most_sensitive_params: Vec<&String> = sensitivity_pairs.iter()
            .filter(|(_, &sensitivity)| sensitivity.abs() > 0.5)
            .map(|(name, _)| *name)
            .collect();
        
        let conclusions = if !most_sensitive_params.is_empty() {
            format!(
                "O estudo paramétrico identificou que os parâmetros mais influentes na {} da métrica alvo ({}) são: {}. \
                 Estes parâmetros devem ser controlados com maior precisão para obter resultados consistentes.\n\n\
                 A melhor configuração encontrada resultou em um valor de {:.4} para a métrica alvo, \
                 o que representa um {} de {:.1}% em relação à média das configurações testadas.\n\n\
                 Recomenda-se realizar estudos adicionais com faixas mais estreitas em torno dos valores ótimos \
                 para refinar ainda mais a configuração.",
                match result.config.optimization_goal {
                    OptimizationGoal::Maximize => "maximização",
                    OptimizationGoal::Minimize => "minimização",
                },
                result.config.target_metric,
                most_sensitive_params.iter().map(|s| s.to_string()).collect::<Vec<String>>().join(", "),
                best_config.target_metric_value,
                match result.config.optimization_goal {
                    OptimizationGoal::Maximize => "aumento",
                    OptimizationGoal::Minimize => "redução",
                },
                self.calculate_improvement_percentage(&result)
            )
        } else {
            format!(
                "O estudo paramétrico não identificou parâmetros com alta sensibilidade em relação à métrica alvo ({}). \
                 Isso sugere que a métrica é robusta em relação às variações dos parâmetros testados, \
                 ou que as faixas de variação utilizadas foram insuficientes para capturar a sensibilidade.\n\n\
                 A melhor configuração encontrada resultou em um valor de {:.4} para a métrica alvo. \
                 Recomenda-se explorar faixas mais amplas de parâmetros ou considerar parâmetros adicionais \
                 em estudos futuros.",
                result.config.target_metric,
                best_config.target_metric_value
            )
        };
        
        file.write_all(conclusions.as_bytes()).map_err(|e| format!("Erro ao escrever conclusões: {}", e))?;
        
        Ok(())
    }
    
    /// Calcula a porcentagem de melhoria da melhor configuração em relação à média
    fn calculate_improvement_percentage(&self, result: &ParametricStudyResult) -> f64 {
        if result.simulation_results.is_empty() {
            return 0.0;
        }
        
        // Calcular média da métrica alvo
        let sum: f64 = result.simulation_results.iter()
            .map(|r| r.target_metric_value)
            .sum();
        
        let mean = sum / result.simulation_results.len() as f64;
        
        // Calcular melhoria
        let best = result.best_configuration.target_metric_value;
        
        match result.config.optimization_goal {
            OptimizationGoal::Maximize => {
                if mean > 0.0 {
                    (best - mean) / mean * 100.0
                } else {
                    0.0
                }
            },
            OptimizationGoal::Minimize => {
                if mean > 0.0 {
                    (mean - best) / mean * 100.0
                } else {
                    0.0
                }
            },
        }
    }
    
    /// Cria uma configuração de estudo paramétrico para otimização de eficiência energética
    pub fn create_energy_efficiency_study() -> ParametricStudyConfig {
        let mut parameters = Vec::new();
        
        // Parâmetro: Potência da tocha
        parameters.push(ParametricParameter {
            name: "torch_power".to_string(),
            description: "Potência da tocha de plasma".to_string(),
            unit: "kW".to_string(),
            min_value: 50.0,
            max_value: 200.0,
            num_points: 6,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Eficiência da tocha
        parameters.push(ParametricParameter {
            name: "torch_efficiency".to_string(),
            description: "Eficiência da tocha de plasma".to_string(),
            unit: "%".to_string(),
            min_value: 60.0,
            max_value: 90.0,
            num_points: 4,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Condutividade térmica
        parameters.push(ParametricParameter {
            name: "thermal_conductivity".to_string(),
            description: "Condutividade térmica do material".to_string(),
            unit: "W/(m·K)".to_string(),
            min_value: 10.0,
            max_value: 100.0,
            num_points: 5,
            scale_type: ScaleType::Logarithmic,
            specific_values: None,
        });
        
        ParametricStudyConfig {
            name: "Otimização de Eficiência Energética".to_string(),
            description: "Estudo paramétrico para maximizar a eficiência energética da fornalha de plasma".to_string(),
            parameters,
            target_metric: "energy_efficiency".to_string(),
            optimization_goal: OptimizationGoal::Maximize,
            max_simulations: 120,
            max_execution_time: Some(3600.0),
            use_parallel: true,
            metadata: HashMap::new(),
        }
    }
    
    /// Cria uma configuração de estudo paramétrico para otimização de temperatura máxima
    pub fn create_max_temperature_study() -> ParametricStudyConfig {
        let mut parameters = Vec::new();
        
        // Parâmetro: Potência da tocha
        parameters.push(ParametricParameter {
            name: "torch_power".to_string(),
            description: "Potência da tocha de plasma".to_string(),
            unit: "kW".to_string(),
            min_value: 100.0,
            max_value: 300.0,
            num_points: 5,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Densidade do material
        parameters.push(ParametricParameter {
            name: "density".to_string(),
            description: "Densidade do material".to_string(),
            unit: "kg/m³".to_string(),
            min_value: 1000.0,
            max_value: 8000.0,
            num_points: 4,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Calor específico
        parameters.push(ParametricParameter {
            name: "specific_heat".to_string(),
            description: "Calor específico do material".to_string(),
            unit: "J/(kg·K)".to_string(),
            min_value: 500.0,
            max_value: 2000.0,
            num_points: 4,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        ParametricStudyConfig {
            name: "Otimização de Temperatura Máxima".to_string(),
            description: "Estudo paramétrico para maximizar a temperatura máxima na fornalha de plasma".to_string(),
            parameters,
            target_metric: "max_temperature".to_string(),
            optimization_goal: OptimizationGoal::Maximize,
            max_simulations: 80,
            max_execution_time: Some(3600.0),
            use_parallel: true,
            metadata: HashMap::new(),
        }
    }
    
    /// Cria uma configuração de estudo paramétrico para otimização de uniformidade de temperatura
    pub fn create_temperature_uniformity_study() -> ParametricStudyConfig {
        let mut parameters = Vec::new();
        
        // Parâmetro: Potência da tocha
        parameters.push(ParametricParameter {
            name: "torch_power".to_string(),
            description: "Potência da tocha de plasma".to_string(),
            unit: "kW".to_string(),
            min_value: 50.0,
            max_value: 200.0,
            num_points: 4,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Condutividade térmica
        parameters.push(ParametricParameter {
            name: "thermal_conductivity".to_string(),
            description: "Condutividade térmica do material".to_string(),
            unit: "W/(m·K)".to_string(),
            min_value: 20.0,
            max_value: 200.0,
            num_points: 5,
            scale_type: ScaleType::Logarithmic,
            specific_values: None,
        });
        
        // Parâmetro: Emissividade
        parameters.push(ParametricParameter {
            name: "emissivity".to_string(),
            description: "Emissividade da superfície".to_string(),
            unit: "-".to_string(),
            min_value: 0.1,
            max_value: 0.9,
            num_points: 5,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        ParametricStudyConfig {
            name: "Otimização de Uniformidade de Temperatura".to_string(),
            description: "Estudo paramétrico para minimizar o gradiente de temperatura na fornalha de plasma".to_string(),
            parameters,
            target_metric: "max_gradient".to_string(),
            optimization_goal: OptimizationGoal::Minimize,
            max_simulations: 100,
            max_execution_time: Some(3600.0),
            use_parallel: true,
            metadata: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::simulation::mesh::CylindricalMesh;
    use crate::simulation::solver::Solver;
    use crate::simulation::physics::PlasmaPhysics;
    
    fn create_test_manager() -> ParametricStudyManager {
        // Criar configuração de teste
        let mut parameters = Vec::new();
        
        // Parâmetro: Potência da tocha
        parameters.push(ParametricParameter {
            name: "torch_power".to_string(),
            description: "Potência da tocha de plasma".to_string(),
            unit: "kW".to_string(),
            min_value: 100.0,
            max_value: 200.0,
            num_points: 3,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        // Parâmetro: Condutividade térmica
        parameters.push(ParametricParameter {
            name: "thermal_conductivity".to_string(),
            description: "Condutividade térmica do material".to_string(),
            unit: "W/(m·K)".to_string(),
            min_value: 20.0,
            max_value: 80.0,
            num_points: 2,
            scale_type: ScaleType::Linear,
            specific_values: None,
        });
        
        let config = ParametricStudyConfig {
            name: "Teste de Estudo Paramétrico".to_string(),
            description: "Estudo paramétrico para testes".to_string(),
            parameters,
            target_metric: "max_temperature".to_string(),
            optimization_goal: OptimizationGoal::Maximize,
            max_simulations: 10,
            max_execution_time: Some(60.0),
            use_parallel: false,
            metadata: HashMap::new(),
        };
        
        // Criar componentes para simulação
        let mesh = CylindricalMesh::new(10, 8, 10, 0.1, 1.0);
        let solver = Solver::new(0.1, 100, 1e-6);
        let physics = PlasmaPhysics::new();
        
        ParametricStudyManager::new(config, solver, physics, mesh)
    }
    
    #[test]
    fn test_generate_parameter_combinations() {
        let manager = create_test_manager();
        
        let combinations = manager.generate_parameter_combinations().unwrap();
        
        // Verificar número de combinações (3 valores para potência * 2 valores para condutividade)
        assert_eq!(combinations.len(), 6);
        
        // Verificar se todas as combinações são únicas
        let mut unique_combinations = std::collections::HashSet::new();
        
        for combination in &combinations {
            let key = format!("{:?}", combination);
            unique_combinations.insert(key);
        }
        
        assert_eq!(unique_combinations.len(), 6);
    }
    
    #[test]
    fn test_generate_linear_values() {
        let manager = create_test_manager();
        
        let param = ParametricParameter {
            name: "test".to_string(),
            description: "Test parameter".to_string(),
            unit: "-".to_string(),
            min_value: 10.0,
            max_value: 20.0,
            num_points: 3,
            scale_type: ScaleType::Linear,
            specific_values: None,
        };
        
        let values = manager.generate_linear_values(&param).unwrap();
        
        assert_eq!(values.len(), 3);
        assert_eq!(values[0], 10.0);
        assert_eq!(values[1], 15.0);
        assert_eq!(values[2], 20.0);
    }
    
    #[test]
    fn test_generate_logarithmic_values() {
        let manager = create_test_manager();
        
        let param = ParametricParameter {
            name: "test".to_string(),
            description: "Test parameter".to_string(),
            unit: "-".to_string(),
            min_value: 10.0,
            max_value: 1000.0,
            num_points: 4,
            scale_type: ScaleType::Logarithmic,
            specific_values: None,
        };
        
        let values = manager.generate_logarithmic_values(&param).unwrap();
        
        assert_eq!(values.len(), 4);
        assert!(values[0] >= 9.9 && values[0] <= 10.1);
        assert!(values[3] >= 999.0 && values[3] <= 1001.0);
        
        // Verificar se os valores estão em escala logarítmica
        let ratio1 = values[1] / values[0];
        let ratio2 = values[2] / values[1];
        let ratio3 = values[3] / values[2];
        
        assert!((ratio1 - ratio2).abs() < 0.1);
        assert!((ratio2 - ratio3).abs() < 0.1);
    }
    
    #[test]
    fn test_calculate_correlation() {
        let manager = create_test_manager();
        
        // Correlação positiva perfeita
        let x1 = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y1 = vec![2.0, 4.0, 6.0, 8.0, 10.0];
        
        let corr1 = manager.calculate_correlation(&x1, &y1);
        assert!(corr1 > 0.99);
        
        // Correlação negativa perfeita
        let x2 = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y2 = vec![10.0, 8.0, 6.0, 4.0, 2.0];
        
        let corr2 = manager.calculate_correlation(&x2, &y2);
        assert!(corr2 < -0.99);
        
        // Sem correlação
        let x3 = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y3 = vec![5.0, 2.0, 8.0, 1.0, 7.0];
        
        let corr3 = manager.calculate_correlation(&x3, &y3);
        assert!(corr3.abs() < 0.5);
    }
    
    #[test]
    fn test_create_predefined_studies() {
        // Testar criação de estudo de eficiência energética
        let energy_study = ParametricStudyManager::create_energy_efficiency_study();
        assert_eq!(energy_study.target_metric, "energy_efficiency");
        assert_eq!(energy_study.optimization_goal, OptimizationGoal::Maximize);
        assert_eq!(energy_study.parameters.len(), 3);
        
        // Testar criação de estudo de temperatura máxima
        let temp_study = ParametricStudyManager::create_max_temperature_study();
        assert_eq!(temp_study.target_metric, "max_temperature");
        assert_eq!(temp_study.optimization_goal, OptimizationGoal::Maximize);
        assert_eq!(temp_study.parameters.len(), 3);
        
        // Testar criação de estudo de uniformidade de temperatura
        let uniformity_study = ParametricStudyManager::create_temperature_uniformity_study();
        assert_eq!(uniformity_study.target_metric, "max_gradient");
        assert_eq!(uniformity_study.optimization_goal, OptimizationGoal::Minimize);
        assert_eq!(uniformity_study.parameters.len(), 3);
    }
}
