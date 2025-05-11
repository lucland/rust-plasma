//-----------------------------------------------------------------------------
// File: simulation/metrics.rs
// Main Responsibility: Calculate and export performance metrics.
//
// This file implements the analysis and export capabilities for simulation
// results. It calculates performance metrics such as temperature statistics,
// heat fluxes, energy balances, and heating rates. It also provides
// functionality to export simulation results and metrics in various formats
// (CSV, JSON, VTK) and generates reports for analysis. This component is
// crucial for quantitative evaluation of simulation results and for data
// visualization in external tools.
//-----------------------------------------------------------------------------
// Este arquivo implementa o cálculo e exportação de métricas de desempenho da simulação.
// As principais funcionalidades incluem:
//
// - SimulationMetrics: Estrutura que armazena métricas calculadas como temperaturas,
//   gradientes, fluxos de calor e taxas de aquecimento.
//
// - MetricsAnalyzer: Classe responsável por:
//   - calculate_metrics(): Calcula métricas básicas a partir dos resultados da simulação
//   - calculate_gradient_at_point(): Calcula o gradiente de temperatura em um ponto
//   - calculate_heat_flux(): Calcula o fluxo de calor em diferentes pontos
//   - export_metrics(): Exporta métricas calculadas para arquivos CSV/JSON
//   - export_vtk(): Exporta dados para visualização em formato VTK
//   - generate_report(): Gera relatórios detalhados dos resultados da simulação
//   - validate_against_reference(): Compara resultados com dados de referência

// Implementação do módulo de métricas e exportação para o simulador de fornalha de plasma

use ndarray::{Array1, Array2, Array3, ArrayView3};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Write};
use std::path::Path;

use crate::simulation::state::SimulationState;
use crate::simulation::mesh::CylindricalMesh;

/// Estrutura que representa as métricas calculadas a partir dos resultados da simulação
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationMetrics {
    /// Temperatura mínima (°C)
    pub min_temperature: f64,
    /// Temperatura máxima (°C)
    pub max_temperature: f64,
    /// Temperatura média (°C)
    pub avg_temperature: f64,
    /// Desvio padrão da temperatura (°C)
    pub std_temperature: f64,
    /// Gradiente máximo de temperatura (°C/m)
    pub max_gradient: f64,
    /// Fluxo de calor máximo (W/m²)
    pub max_heat_flux: f64,
    /// Energia total no sistema (J)
    pub total_energy: f64,
    /// Taxa de aquecimento média (°C/s)
    pub avg_heating_rate: f64,
    /// Métricas por região
    pub region_metrics: HashMap<String, RegionMetrics>,
    /// Métricas temporais
    pub temporal_metrics: TemporalMetrics,
}

/// Estrutura que representa as métricas calculadas para uma região específica
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegionMetrics {
    /// Nome da região
    pub name: String,
    /// Temperatura mínima (°C)
    pub min_temperature: f64,
    /// Temperatura máxima (°C)
    pub max_temperature: f64,
    /// Temperatura média (°C)
    pub avg_temperature: f64,
    /// Volume da região (m³)
    pub volume: f64,
    /// Energia na região (J)
    pub energy: f64,
}

/// Estrutura que representa as métricas temporais
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalMetrics {
    /// Tempo para atingir 50% da temperatura máxima (s)
    pub time_to_half_max: f64,
    /// Tempo para atingir 90% da temperatura máxima (s)
    pub time_to_90_percent_max: f64,
    /// Taxa de aquecimento máxima (°C/s)
    pub max_heating_rate: f64,
    /// Tempo de estabilização (s)
    pub stabilization_time: f64,
}

/// Enumeração que representa os formatos de exportação suportados
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    /// Formato CSV (Comma-Separated Values)
    CSV,
    /// Formato JSON (JavaScript Object Notation)
    JSON,
    /// Formato VTK (Visualization Toolkit)
    VTK,
}

/// Estrutura que representa as opções de exportação
#[derive(Debug, Clone)]
pub struct ExportOptions {
    /// Formato de exportação
    pub format: ExportFormat,
    /// Caminho do arquivo de saída
    pub output_path: String,
    /// Incluir métricas no arquivo exportado
    pub include_metrics: bool,
    /// Incluir dados de temperatura
    pub include_temperature: bool,
    /// Incluir dados de gradiente
    pub include_gradient: bool,
    /// Incluir dados de fluxo de calor
    pub include_heat_flux: bool,
    /// Incluir metadados da simulação
    pub include_metadata: bool,
    /// Passos de tempo a exportar (None para todos)
    pub time_steps: Option<Vec<usize>>,
}

/// Estrutura que representa o analisador de métricas
pub struct MetricsAnalyzer {
    /// Estado da simulação
    simulation_state: SimulationState,
    /// Métricas calculadas
    metrics: Option<SimulationMetrics>,
}

impl MetricsAnalyzer {
    /// Cria um novo analisador de métricas
    pub fn new(simulation_state: SimulationState) -> Self {
        Self {
            simulation_state,
            metrics: None,
        }
    }
    
    /// Calcula as métricas a partir do estado da simulação
    pub fn calculate_metrics(&mut self) -> Result<&SimulationMetrics, String> {
        let mesh = &self.simulation_state.mesh;
        let temperature_history = &self.simulation_state.temperature_history;
        
        if temperature_history.is_empty() {
            return Err("Histórico de temperatura vazio".to_string());
        }
        
        // Obter a temperatura final
        let final_temperature = &temperature_history[temperature_history.len() - 1];
        
        // Calcular métricas básicas
        let mut min_temp = f64::INFINITY;
        let mut max_temp = f64::NEG_INFINITY;
        let mut sum_temp = 0.0;
        let mut sum_squared_temp = 0.0;
        let cell_count = final_temperature.len();
        
        for &temp in final_temperature.iter() {
            min_temp = min_temp.min(temp);
            max_temp = max_temp.max(temp);
            sum_temp += temp;
            sum_squared_temp += temp * temp;
        }
        
        let avg_temp = sum_temp / cell_count as f64;
        let variance = (sum_squared_temp / cell_count as f64) - (avg_temp * avg_temp);
        let std_temp = variance.sqrt();
        
        // Calcular gradiente e fluxo de calor
        let max_gradient = self.calculate_max_gradient(final_temperature, mesh);
        let max_heat_flux = self.calculate_max_heat_flux(final_temperature, mesh);
        
        // Calcular energia total
        let total_energy = self.calculate_total_energy(final_temperature, mesh);
        
        // Calcular taxa de aquecimento média
        let avg_heating_rate = self.calculate_avg_heating_rate(temperature_history, &self.simulation_state.time_steps);
        
        // Calcular métricas por região
        let region_metrics = self.calculate_region_metrics(final_temperature, mesh);
        
        // Calcular métricas temporais
        let temporal_metrics = self.calculate_temporal_metrics(temperature_history, &self.simulation_state.time_steps, max_temp);
        
        // Criar objeto de métricas
        let metrics = SimulationMetrics {
            min_temperature: min_temp,
            max_temperature: max_temp,
            avg_temperature: avg_temp,
            std_temperature: std_temp,
            max_gradient,
            max_heat_flux,
            total_energy,
            avg_heating_rate,
            region_metrics,
            temporal_metrics,
        };
        
        self.metrics = Some(metrics);
        
        Ok(self.metrics.as_ref().unwrap())
    }
    
    /// Calcula o gradiente máximo de temperatura
    fn calculate_max_gradient(&self, temperature: &[f64], mesh: &CylindricalMesh) -> f64 {
        let temp_3d = self.reshape_to_3d(temperature, mesh);
        let (nr, ntheta, nz) = (mesh.nr, mesh.ntheta, mesh.nz);
        
        let mut max_gradient = 0.0;
        
        for i in 0..nr {
            for j in 0..ntheta {
                for k in 0..nz {
                    let mut local_max_gradient = 0.0;
                    
                    // Gradiente radial
                    if i < nr - 1 {
                        let dr = mesh.dr;
                        let grad_r = (temp_3d[[i+1, j, k]] - temp_3d[[i, j, k]]) / dr;
                        local_max_gradient = local_max_gradient.max(grad_r.abs());
                    }
                    
                    // Gradiente angular
                    if j < ntheta - 1 {
                        let r = mesh.r_coords[i];
                        let dtheta = mesh.dtheta;
                        let grad_theta = (temp_3d[[i, j+1, k]] - temp_3d[[i, j, k]]) / (r * dtheta);
                        local_max_gradient = local_max_gradient.max(grad_theta.abs());
                    }
                    
                    // Gradiente axial
                    if k < nz - 1 {
                        let dz = mesh.dz;
                        let grad_z = (temp_3d[[i, j, k+1]] - temp_3d[[i, j, k]]) / dz;
                        local_max_gradient = local_max_gradient.max(grad_z.abs());
                    }
                    
                    max_gradient = max_gradient.max(local_max_gradient);
                }
            }
        }
        
        max_gradient
    }
    
    /// Calcula o fluxo de calor máximo
    fn calculate_max_heat_flux(&self, temperature: &[f64], mesh: &CylindricalMesh) -> f64 {
        // Simplificação: assumindo condutividade térmica constante de 50 W/(m·K)
        const THERMAL_CONDUCTIVITY: f64 = 50.0;
        
        // O fluxo de calor é proporcional ao gradiente de temperatura
        THERMAL_CONDUCTIVITY * self.calculate_max_gradient(temperature, mesh)
    }
    
    /// Calcula a energia total no sistema
    fn calculate_total_energy(&self, temperature: &[f64], mesh: &CylindricalMesh) -> f64 {
        // Simplificação: assumindo densidade e calor específico constantes
        const DENSITY: f64 = 7800.0; // kg/m³ (aproximadamente aço)
        const SPECIFIC_HEAT: f64 = 500.0; // J/(kg·K)
        
        let temp_3d = self.reshape_to_3d(temperature, mesh);
        let (nr, ntheta, nz) = (mesh.nr, mesh.ntheta, mesh.nz);
        
        let mut total_energy = 0.0;
        
        for i in 0..nr {
            let r = mesh.r_coords[i];
            let dr = mesh.dr;
            
            for j in 0..ntheta {
                let dtheta = mesh.dtheta;
                
                for k in 0..nz {
                    let dz = mesh.dz;
                    
                    // Volume do elemento em coordenadas cilíndricas
                    let volume = r * dr * dtheta * dz;
                    
                    // Energia = densidade * volume * calor específico * temperatura
                    let temp = temp_3d[[i, j, k]];
                    let energy = DENSITY * volume * SPECIFIC_HEAT * temp;
                    
                    total_energy += energy;
                }
            }
        }
        
        total_energy
    }
    
    /// Calcula a taxa de aquecimento média
    fn calculate_avg_heating_rate(&self, temperature_history: &[Vec<f64>], time_steps: &[f64]) -> f64 {
        if temperature_history.len() < 2 || time_steps.len() < 2 {
            return 0.0;
        }
        
        let initial_temp = temperature_history[0].iter().sum::<f64>() / temperature_history[0].len() as f64;
        let final_temp = temperature_history.last().unwrap().iter().sum::<f64>() / temperature_history.last().unwrap().len() as f64;
        
        let total_time = time_steps.last().unwrap() - time_steps[0];
        
        if total_time <= 0.0 {
            return 0.0;
        }
        
        (final_temp - initial_temp) / total_time
    }
    
    /// Calcula as métricas por região
    fn calculate_region_metrics(&self, temperature: &[f64], mesh: &CylindricalMesh) -> HashMap<String, RegionMetrics> {
        let mut region_metrics = HashMap::new();
        
        // Exemplo: dividir em regiões radiais (centro, meio, periferia)
        let regions = vec![
            ("Centro", 0, mesh.nr / 3),
            ("Meio", mesh.nr / 3, 2 * mesh.nr / 3),
            ("Periferia", 2 * mesh.nr / 3, mesh.nr),
        ];
        
        let temp_3d = self.reshape_to_3d(temperature, mesh);
        
        for (name, start_r, end_r) in regions {
            let mut min_temp = f64::INFINITY;
            let mut max_temp = f64::NEG_INFINITY;
            let mut sum_temp = 0.0;
            let mut total_volume = 0.0;
            
            for i in start_r..end_r {
                let r = mesh.r_coords[i];
                let dr = mesh.dr;
                
                for j in 0..mesh.ntheta {
                    let dtheta = mesh.dtheta;
                    
                    for k in 0..mesh.nz {
                        let dz = mesh.dz;
                        
                        let temp = temp_3d[[i, j, k]];
                        min_temp = min_temp.min(temp);
                        max_temp = max_temp.max(temp);
                        
                        // Volume do elemento em coordenadas cilíndricas
                        let volume = r * dr * dtheta * dz;
                        total_volume += volume;
                        
                        sum_temp += temp * volume; // Ponderado pelo volume
                    }
                }
            }
            
            let avg_temp = if total_volume > 0.0 { sum_temp / total_volume } else { 0.0 };
            
            // Simplificação: assumindo densidade e calor específico constantes
            const DENSITY: f64 = 7800.0; // kg/m³ (aproximadamente aço)
            const SPECIFIC_HEAT: f64 = 500.0; // J/(kg·K)
            
            let energy = DENSITY * total_volume * SPECIFIC_HEAT * avg_temp;
            
            region_metrics.insert(name.to_string(), RegionMetrics {
                name: name.to_string(),
                min_temperature: min_temp,
                max_temperature: max_temp,
                avg_temperature: avg_temp,
                volume: total_volume,
                energy,
            });
        }
        
        region_metrics
    }
    
    /// Calcula as métricas temporais
    fn calculate_temporal_metrics(&self, temperature_history: &[Vec<f64>], time_steps: &[f64], max_temp: f64) -> TemporalMetrics {
        let n_steps = temperature_history.len();
        
        if n_steps < 2 || time_steps.len() < n_steps {
            return TemporalMetrics {
                time_to_half_max: 0.0,
                time_to_90_percent_max: 0.0,
                max_heating_rate: 0.0,
                stabilization_time: 0.0,
            };
        }
        
        // Calcular temperaturas médias por passo de tempo
        let mut avg_temps = Vec::with_capacity(n_steps);
        for temps in temperature_history {
            let avg = temps.iter().sum::<f64>() / temps.len() as f64;
            avg_temps.push(avg);
        }
        
        // Tempo para atingir 50% da temperatura máxima
        let half_max = max_temp * 0.5;
        let mut time_to_half_max = 0.0;
        for i in 0..n_steps {
            if avg_temps[i] >= half_max {
                if i > 0 {
                    // Interpolação linear
                    let t0 = time_steps[i-1];
                    let t1 = time_steps[i];
                    let temp0 = avg_temps[i-1];
                    let temp1 = avg_temps[i];
                    time_to_half_max = t0 + (t1 - t0) * (half_max - temp0) / (temp1 - temp0);
                } else {
                    time_to_half_max = time_steps[i];
                }
                break;
            }
        }
        
        // Tempo para atingir 90% da temperatura máxima
        let ninety_percent_max = max_temp * 0.9;
        let mut time_to_90_percent_max = 0.0;
        for i in 0..n_steps {
            if avg_temps[i] >= ninety_percent_max {
                if i > 0 {
                    // Interpolação linear
                    let t0 = time_steps[i-1];
                    let t1 = time_steps[i];
                    let temp0 = avg_temps[i-1];
                    let temp1 = avg_temps[i];
                    time_to_90_percent_max = t0 + (t1 - t0) * (ninety_percent_max - temp0) / (temp1 - temp0);
                } else {
                    time_to_90_percent_max = time_steps[i];
                }
                break;
            }
        }
        
        // Taxa de aquecimento máxima
        let mut max_heating_rate = 0.0;
        for i in 1..n_steps {
            let dt = time_steps[i] - time_steps[i-1];
            if dt > 0.0 {
                let heating_rate = (avg_temps[i] - avg_temps[i-1]) / dt;
                max_heating_rate = max_heating_rate.max(heating_rate);
            }
        }
        
        // Tempo de estabilização (quando a taxa de variação cai abaixo de 1% da taxa máxima)
        let threshold = max_heating_rate * 0.01;
        let mut stabilization_time = time_steps.last().unwrap_or(&0.0).clone();
        
        for i in 1..n_steps {
            let dt = time_steps[i] - time_steps[i-1];
            if dt > 0.0 {
                let heating_rate = (avg_temps[i] - avg_temps[i-1]) / dt;
                if heating_rate < threshold {
                    stabilization_time = time_steps[i];
                    break;
                }
            }
        }
        
        TemporalMetrics {
            time_to_half_max,
            time_to_90_percent_max,
            max_heating_rate,
            stabilization_time,
        }
    }
    
    /// Converte um vetor 1D para um array 3D usando as dimensões da malha
    fn reshape_to_3d(&self, data: &[f64], mesh: &CylindricalMesh) -> Array3<f64> {
        let (nr, ntheta, nz) = (mesh.nr, mesh.ntheta, mesh.nz);
        
        let mut array = Array3::zeros((nr, ntheta, nz));
        
        for i in 0..nr {
            for j in 0..ntheta {
                for k in 0..nz {
                    let idx = i * ntheta * nz + j * nz + k;
                    if idx < data.len() {
                        array[[i, j, k]] = data[idx];
                    }
                }
            }
        }
        
        array
    }
    
    /// Exporta os resultados da simulação para um arquivo
    pub fn export_results(&self, options: &ExportOptions) -> Result<(), String> {
        match options.format {
            ExportFormat::CSV => self.export_to_csv(options),
            ExportFormat::JSON => self.export_to_json(options),
            ExportFormat::VTK => self.export_to_vtk(options),
        }
    }
    
    /// Exporta os resultados para um arquivo CSV
    fn export_to_csv(&self, options: &ExportOptions) -> Result<(), String> {
        let path = Path::new(&options.output_path);
        let mut file = File::create(path).map_err(|e| format!("Erro ao criar arquivo CSV: {}", e))?;
        
        // Escrever cabeçalho
        let mut header = String::from("r,theta,z");
        
        if options.include_temperature {
            header.push_str(",temperature");
        }
        
        if options.include_gradient {
            header.push_str(",gradient_r,gradient_theta,gradient_z,gradient_magnitude");
        }
        
        if options.include_heat_flux {
            header.push_str(",heat_flux_r,heat_flux_theta,heat_flux_z,heat_flux_magnitude");
        }
        
        header.push('\n');
        file.write_all(header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho CSV: {}", e))?;
        
        // Determinar quais passos de tempo exportar
        let time_steps = match &options.time_steps {
            Some(steps) => steps.clone(),
            None => vec![self.simulation_state.temperature_history.len() - 1], // Último passo por padrão
        };
        
        for &step in &time_steps {
            if step >= self.simulation_state.temperature_history.len() {
                continue;
            }
            
            let temperature = &self.simulation_state.temperature_history[step];
            let mesh = &self.simulation_state.mesh;
            let temp_3d = self.reshape_to_3d(temperature, mesh);
            
            // Escrever dados
            for i in 0..mesh.nr {
                let r = mesh.r_coords[i];
                
                for j in 0..mesh.ntheta {
                    let theta = j as f64 * mesh.dtheta;
                    
                    for k in 0..mesh.nz {
                        let z = k as f64 * mesh.dz;
                        
                        let mut line = format!("{},{},{}", r, theta, z);
                        
                        if options.include_temperature {
                            line.push_str(&format!(",{}", temp_3d[[i, j, k]]));
                        }
                        
                        if options.include_gradient {
                            // Calcular gradientes
                            let (grad_r, grad_theta, grad_z) = self.calculate_gradient_at_point(i, j, k, &temp_3d, mesh);
                            let grad_mag = (grad_r * grad_r + grad_theta * grad_theta + grad_z * grad_z).sqrt();
                            
                            line.push_str(&format!(",{},{},{},{}", grad_r, grad_theta, grad_z, grad_mag));
                        }
                        
                        if options.include_heat_flux {
                            // Simplificação: assumindo condutividade térmica constante de 50 W/(m·K)
                            const THERMAL_CONDUCTIVITY: f64 = 50.0;
                            
                            // Calcular gradientes
                            let (grad_r, grad_theta, grad_z) = self.calculate_gradient_at_point(i, j, k, &temp_3d, mesh);
                            
                            // Fluxo de calor = -k * gradiente
                            let flux_r = -THERMAL_CONDUCTIVITY * grad_r;
                            let flux_theta = -THERMAL_CONDUCTIVITY * grad_theta;
                            let flux_z = -THERMAL_CONDUCTIVITY * grad_z;
                            let flux_mag = (flux_r * flux_r + flux_theta * flux_theta + flux_z * flux_z).sqrt();
                            
                            line.push_str(&format!(",{},{},{},{}", flux_r, flux_theta, flux_z, flux_mag));
                        }
                        
                        line.push('\n');
                        file.write_all(line.as_bytes()).map_err(|e| format!("Erro ao escrever dados CSV: {}", e))?;
                    }
                }
            }
        }
        
        // Escrever métricas se solicitado
        if options.include_metrics {
            if let Some(metrics) = &self.metrics {
                file.write_all(b"\n\nMETRICS\n").map_err(|e| format!("Erro ao escrever métricas CSV: {}", e))?;
                
                let metrics_data = format!(
                    "min_temperature,{}\n\
                     max_temperature,{}\n\
                     avg_temperature,{}\n\
                     std_temperature,{}\n\
                     max_gradient,{}\n\
                     max_heat_flux,{}\n\
                     total_energy,{}\n\
                     avg_heating_rate,{}\n\
                     time_to_half_max,{}\n\
                     time_to_90_percent_max,{}\n\
                     max_heating_rate,{}\n\
                     stabilization_time,{}\n",
                    metrics.min_temperature,
                    metrics.max_temperature,
                    metrics.avg_temperature,
                    metrics.std_temperature,
                    metrics.max_gradient,
                    metrics.max_heat_flux,
                    metrics.total_energy,
                    metrics.avg_heating_rate,
                    metrics.temporal_metrics.time_to_half_max,
                    metrics.temporal_metrics.time_to_90_percent_max,
                    metrics.temporal_metrics.max_heating_rate,
                    metrics.temporal_metrics.stabilization_time
                );
                
                file.write_all(metrics_data.as_bytes()).map_err(|e| format!("Erro ao escrever métricas CSV: {}", e))?;
                
                // Escrever métricas por região
                file.write_all(b"\nREGION METRICS\n").map_err(|e| format!("Erro ao escrever métricas de região CSV: {}", e))?;
                file.write_all(b"region,min_temperature,max_temperature,avg_temperature,volume,energy\n")
                    .map_err(|e| format!("Erro ao escrever cabeçalho de métricas de região CSV: {}", e))?;
                
                for (name, region) in &metrics.region_metrics {
                    let region_data = format!(
                        "{},{},{},{},{},{}\n",
                        name,
                        region.min_temperature,
                        region.max_temperature,
                        region.avg_temperature,
                        region.volume,
                        region.energy
                    );
                    
                    file.write_all(region_data.as_bytes()).map_err(|e| format!("Erro ao escrever métricas de região CSV: {}", e))?;
                }
            }
        }
        
        // Escrever metadados se solicitado
        if options.include_metadata {
            file.write_all(b"\n\nMETADATA\n").map_err(|e| format!("Erro ao escrever metadados CSV: {}", e))?;
            
            let metadata = format!(
                "nr,{}\n\
                 ntheta,{}\n\
                 nz,{}\n\
                 r_min,{}\n\
                 r_max,{}\n\
                 z_min,{}\n\
                 z_max,{}\n\
                 time_steps,{}\n\
                 total_time,{}\n",
                self.simulation_state.mesh.nr,
                self.simulation_state.mesh.ntheta,
                self.simulation_state.mesh.nz,
                self.simulation_state.mesh.r_min,
                self.simulation_state.mesh.r_max,
                0.0, // z_min
                self.simulation_state.mesh.nz as f64 * self.simulation_state.mesh.dz, // z_max
                self.simulation_state.temperature_history.len(),
                self.simulation_state.time_steps.last().unwrap_or(&0.0)
            );
            
            file.write_all(metadata.as_bytes()).map_err(|e| format!("Erro ao escrever metadados CSV: {}", e))?;
        }
        
        Ok(())
    }
    
    /// Exporta os resultados para um arquivo JSON
    fn export_to_json(&self, options: &ExportOptions) -> Result<(), String> {
        let path = Path::new(&options.output_path);
        let file = File::create(path).map_err(|e| format!("Erro ao criar arquivo JSON: {}", e))?;
        
        // Criar estrutura de dados para exportação
        let mut export_data = serde_json::Map::new();
        
        // Adicionar metadados se solicitado
        if options.include_metadata {
            let mut metadata = serde_json::Map::new();
            
            metadata.insert("nr".to_string(), serde_json::Value::Number(serde_json::Number::from(self.simulation_state.mesh.nr)));
            metadata.insert("ntheta".to_string(), serde_json::Value::Number(serde_json::Number::from(self.simulation_state.mesh.ntheta)));
            metadata.insert("nz".to_string(), serde_json::Value::Number(serde_json::Number::from(self.simulation_state.mesh.nz)));
            metadata.insert("r_min".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(self.simulation_state.mesh.r_min).unwrap()));
            metadata.insert("r_max".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(self.simulation_state.mesh.r_max).unwrap()));
            metadata.insert("z_min".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(0.0).unwrap()));
            metadata.insert("z_max".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(self.simulation_state.mesh.nz as f64 * self.simulation_state.mesh.dz).unwrap()));
            metadata.insert("time_steps".to_string(), serde_json::Value::Number(serde_json::Number::from(self.simulation_state.temperature_history.len())));
            
            if let Some(total_time) = self.simulation_state.time_steps.last() {
                metadata.insert("total_time".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(*total_time).unwrap()));
            }
            
            export_data.insert("metadata".to_string(), serde_json::Value::Object(metadata));
        }
        
        // Adicionar métricas se solicitado
        if options.include_metrics {
            if let Some(metrics) = &self.metrics {
                export_data.insert("metrics".to_string(), serde_json::to_value(metrics).unwrap());
            }
        }
        
        // Determinar quais passos de tempo exportar
        let time_steps = match &options.time_steps {
            Some(steps) => steps.clone(),
            None => vec![self.simulation_state.temperature_history.len() - 1], // Último passo por padrão
        };
        
        // Adicionar dados de temperatura, gradiente e fluxo de calor
        let mut results = Vec::new();
        
        for &step in &time_steps {
            if step >= self.simulation_state.temperature_history.len() {
                continue;
            }
            
            let temperature = &self.simulation_state.temperature_history[step];
            let mesh = &self.simulation_state.mesh;
            let temp_3d = self.reshape_to_3d(temperature, mesh);
            
            let time = if step < self.simulation_state.time_steps.len() {
                self.simulation_state.time_steps[step]
            } else {
                0.0
            };
            
            let mut step_data = serde_json::Map::new();
            step_data.insert("time_step".to_string(), serde_json::Value::Number(serde_json::Number::from(step)));
            step_data.insert("time".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(time).unwrap()));
            
            if options.include_temperature {
                let mut temp_data = Vec::new();
                
                for i in 0..mesh.nr {
                    for j in 0..mesh.ntheta {
                        for k in 0..mesh.nz {
                            let r = mesh.r_coords[i];
                            let theta = j as f64 * mesh.dtheta;
                            let z = k as f64 * mesh.dz;
                            
                            let mut point_data = serde_json::Map::new();
                            point_data.insert("r".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(r).unwrap()));
                            point_data.insert("theta".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(theta).unwrap()));
                            point_data.insert("z".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(z).unwrap()));
                            point_data.insert("temperature".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(temp_3d[[i, j, k]]).unwrap()));
                            
                            temp_data.push(serde_json::Value::Object(point_data));
                        }
                    }
                }
                
                step_data.insert("temperature_data".to_string(), serde_json::Value::Array(temp_data));
            }
            
            if options.include_gradient || options.include_heat_flux {
                let mut gradient_data = Vec::new();
                
                // Simplificação: assumindo condutividade térmica constante de 50 W/(m·K)
                const THERMAL_CONDUCTIVITY: f64 = 50.0;
                
                for i in 0..mesh.nr {
                    for j in 0..mesh.ntheta {
                        for k in 0..mesh.nz {
                            let r = mesh.r_coords[i];
                            let theta = j as f64 * mesh.dtheta;
                            let z = k as f64 * mesh.dz;
                            
                            // Calcular gradientes
                            let (grad_r, grad_theta, grad_z) = self.calculate_gradient_at_point(i, j, k, &temp_3d, mesh);
                            let grad_mag = (grad_r * grad_r + grad_theta * grad_theta + grad_z * grad_z).sqrt();
                            
                            let mut point_data = serde_json::Map::new();
                            point_data.insert("r".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(r).unwrap()));
                            point_data.insert("theta".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(theta).unwrap()));
                            point_data.insert("z".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(z).unwrap()));
                            
                            if options.include_gradient {
                                point_data.insert("gradient_r".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(grad_r).unwrap()));
                                point_data.insert("gradient_theta".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(grad_theta).unwrap()));
                                point_data.insert("gradient_z".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(grad_z).unwrap()));
                                point_data.insert("gradient_magnitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(grad_mag).unwrap()));
                            }
                            
                            if options.include_heat_flux {
                                // Fluxo de calor = -k * gradiente
                                let flux_r = -THERMAL_CONDUCTIVITY * grad_r;
                                let flux_theta = -THERMAL_CONDUCTIVITY * grad_theta;
                                let flux_z = -THERMAL_CONDUCTIVITY * grad_z;
                                let flux_mag = (flux_r * flux_r + flux_theta * flux_theta + flux_z * flux_z).sqrt();
                                
                                point_data.insert("heat_flux_r".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(flux_r).unwrap()));
                                point_data.insert("heat_flux_theta".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(flux_theta).unwrap()));
                                point_data.insert("heat_flux_z".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(flux_z).unwrap()));
                                point_data.insert("heat_flux_magnitude".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(flux_mag).unwrap()));
                            }
                            
                            gradient_data.push(serde_json::Value::Object(point_data));
                        }
                    }
                }
                
                if options.include_gradient {
                    step_data.insert("gradient_data".to_string(), serde_json::Value::Array(gradient_data.clone()));
                }
                
                if options.include_heat_flux {
                    step_data.insert("heat_flux_data".to_string(), serde_json::Value::Array(gradient_data));
                }
            }
            
            results.push(serde_json::Value::Object(step_data));
        }
        
        export_data.insert("results".to_string(), serde_json::Value::Array(results));
        
        // Escrever JSON no arquivo
        serde_json::to_writer_pretty(file, &serde_json::Value::Object(export_data))
            .map_err(|e| format!("Erro ao escrever arquivo JSON: {}", e))?;
        
        Ok(())
    }
    
    /// Exporta os resultados para um arquivo VTK
    fn export_to_vtk(&self, options: &ExportOptions) -> Result<(), String> {
        let path = Path::new(&options.output_path);
        let mut file = File::create(path).map_err(|e| format!("Erro ao criar arquivo VTK: {}", e))?;
        
        // Determinar quais passos de tempo exportar
        let time_steps = match &options.time_steps {
            Some(steps) => steps.clone(),
            None => vec![self.simulation_state.temperature_history.len() - 1], // Último passo por padrão
        };
        
        // Usar apenas o primeiro passo de tempo para simplificar
        let step = time_steps[0];
        if step >= self.simulation_state.temperature_history.len() {
            return Err(format!("Passo de tempo {} fora dos limites", step));
        }
        
        let temperature = &self.simulation_state.temperature_history[step];
        let mesh = &self.simulation_state.mesh;
        let temp_3d = self.reshape_to_3d(temperature, mesh);
        
        // Escrever cabeçalho VTK
        let header = "# vtk DataFile Version 3.0\nPlasma Furnace Simulation Results\nASCII\nDATASET STRUCTURED_GRID\n";
        file.write_all(header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho VTK: {}", e))?;
        
        // Escrever dimensões
        let dimensions = format!("DIMENSIONS {} {} {}\n", mesh.nr, mesh.ntheta, mesh.nz);
        file.write_all(dimensions.as_bytes()).map_err(|e| format!("Erro ao escrever dimensões VTK: {}", e))?;
        
        // Escrever pontos
        let num_points = mesh.nr * mesh.ntheta * mesh.nz;
        let points = format!("POINTS {} float\n", num_points);
        file.write_all(points.as_bytes()).map_err(|e| format!("Erro ao escrever pontos VTK: {}", e))?;
        
        for i in 0..mesh.nr {
            let r = mesh.r_coords[i];
            
            for j in 0..mesh.ntheta {
                let theta = j as f64 * mesh.dtheta;
                let x = r * theta.cos();
                let y = r * theta.sin();
                
                for k in 0..mesh.nz {
                    let z = k as f64 * mesh.dz;
                    
                    let point = format!("{} {} {}\n", x, y, z);
                    file.write_all(point.as_bytes()).map_err(|e| format!("Erro ao escrever ponto VTK: {}", e))?;
                }
            }
        }
        
        // Escrever dados de ponto
        let point_data = format!("\nPOINT_DATA {}\n", num_points);
        file.write_all(point_data.as_bytes()).map_err(|e| format!("Erro ao escrever dados de ponto VTK: {}", e))?;
        
        // Escrever temperatura
        if options.include_temperature {
            let temp_header = "SCALARS temperature float 1\nLOOKUP_TABLE default\n";
            file.write_all(temp_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de temperatura VTK: {}", e))?;
            
            for i in 0..mesh.nr {
                for j in 0..mesh.ntheta {
                    for k in 0..mesh.nz {
                        let temp = format!("{}\n", temp_3d[[i, j, k]]);
                        file.write_all(temp.as_bytes()).map_err(|e| format!("Erro ao escrever temperatura VTK: {}", e))?;
                    }
                }
            }
        }
        
        // Escrever gradiente
        if options.include_gradient {
            let grad_header = "\nVECTORS temperature_gradient float\n";
            file.write_all(grad_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de gradiente VTK: {}", e))?;
            
            for i in 0..mesh.nr {
                for j in 0..mesh.ntheta {
                    for k in 0..mesh.nz {
                        let (grad_r, grad_theta, grad_z) = self.calculate_gradient_at_point(i, j, k, &temp_3d, mesh);
                        
                        // Converter gradiente de coordenadas cilíndricas para cartesianas
                        let theta = j as f64 * mesh.dtheta;
                        let grad_x = grad_r * theta.cos() - grad_theta * theta.sin();
                        let grad_y = grad_r * theta.sin() + grad_theta * theta.cos();
                        
                        let grad = format!("{} {} {}\n", grad_x, grad_y, grad_z);
                        file.write_all(grad.as_bytes()).map_err(|e| format!("Erro ao escrever gradiente VTK: {}", e))?;
                    }
                }
            }
        }
        
        // Escrever fluxo de calor
        if options.include_heat_flux {
            // Simplificação: assumindo condutividade térmica constante de 50 W/(m·K)
            const THERMAL_CONDUCTIVITY: f64 = 50.0;
            
            let flux_header = "\nVECTORS heat_flux float\n";
            file.write_all(flux_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de fluxo de calor VTK: {}", e))?;
            
            for i in 0..mesh.nr {
                for j in 0..mesh.ntheta {
                    for k in 0..mesh.nz {
                        let (grad_r, grad_theta, grad_z) = self.calculate_gradient_at_point(i, j, k, &temp_3d, mesh);
                        
                        // Fluxo de calor = -k * gradiente
                        let flux_r = -THERMAL_CONDUCTIVITY * grad_r;
                        let flux_theta = -THERMAL_CONDUCTIVITY * grad_theta;
                        let flux_z = -THERMAL_CONDUCTIVITY * grad_z;
                        
                        // Converter fluxo de coordenadas cilíndricas para cartesianas
                        let theta = j as f64 * mesh.dtheta;
                        let flux_x = flux_r * theta.cos() - flux_theta * theta.sin();
                        let flux_y = flux_r * theta.sin() + flux_theta * theta.cos();
                        
                        let flux = format!("{} {} {}\n", flux_x, flux_y, flux_z);
                        file.write_all(flux.as_bytes()).map_err(|e| format!("Erro ao escrever fluxo de calor VTK: {}", e))?;
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Calcula o gradiente de temperatura em um ponto específico
    fn calculate_gradient_at_point(&self, i: usize, j: usize, k: usize, temp_3d: &Array3<f64>, mesh: &CylindricalMesh) -> (f64, f64, f64) {
        let (nr, ntheta, nz) = (mesh.nr, mesh.ntheta, mesh.nz);
        
        // Gradiente radial
        let grad_r = if i < nr - 1 && i > 0 {
            // Diferença central
            (temp_3d[[i+1, j, k]] - temp_3d[[i-1, j, k]]) / (2.0 * mesh.dr)
        } else if i < nr - 1 {
            // Diferença avançada
            (temp_3d[[i+1, j, k]] - temp_3d[[i, j, k]]) / mesh.dr
        } else if i > 0 {
            // Diferença atrasada
            (temp_3d[[i, j, k]] - temp_3d[[i-1, j, k]]) / mesh.dr
        } else {
            0.0
        };
        
        // Gradiente angular
        let grad_theta = if j < ntheta - 1 && j > 0 {
            // Diferença central
            let r = mesh.r_coords[i];
            if r > 0.0 {
                (temp_3d[[i, j+1, k]] - temp_3d[[i, j-1, k]]) / (2.0 * r * mesh.dtheta)
            } else {
                0.0
            }
        } else if j < ntheta - 1 {
            // Diferença avançada
            let r = mesh.r_coords[i];
            if r > 0.0 {
                (temp_3d[[i, j+1, k]] - temp_3d[[i, j, k]]) / (r * mesh.dtheta)
            } else {
                0.0
            }
        } else if j > 0 {
            // Diferença atrasada
            let r = mesh.r_coords[i];
            if r > 0.0 {
                (temp_3d[[i, j, k]] - temp_3d[[i, j-1, k]]) / (r * mesh.dtheta)
            } else {
                0.0
            }
        } else {
            0.0
        };
        
        // Gradiente axial
        let grad_z = if k < nz - 1 && k > 0 {
            // Diferença central
            (temp_3d[[i, j, k+1]] - temp_3d[[i, j, k-1]]) / (2.0 * mesh.dz)
        } else if k < nz - 1 {
            // Diferença avançada
            (temp_3d[[i, j, k+1]] - temp_3d[[i, j, k]]) / mesh.dz
        } else if k > 0 {
            // Diferença atrasada
            (temp_3d[[i, j, k]] - temp_3d[[i, j, k-1]]) / mesh.dz
        } else {
            0.0
        };
        
        (grad_r, grad_theta, grad_z)
    }
    
    /// Gera um relatório com os resultados da simulação
    pub fn generate_report(&self, output_path: &str) -> Result<(), String> {
        let path = Path::new(output_path);
        let mut file = File::create(path).map_err(|e| format!("Erro ao criar arquivo de relatório: {}", e))?;
        
        // Verificar se as métricas foram calculadas
        if self.metrics.is_none() {
            return Err("Métricas não calculadas".to_string());
        }
        
        let metrics = self.metrics.as_ref().unwrap();
        
        // Escrever cabeçalho do relatório
        let header = "# Relatório de Simulação de Fornalha de Plasma\n\n";
        file.write_all(header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho do relatório: {}", e))?;
        
        // Escrever informações da simulação
        let mesh = &self.simulation_state.mesh;
        let simulation_info = format!(
            "## Informações da Simulação\n\n\
             - Dimensões da malha: {} x {} x {}\n\
             - Raio mínimo: {:.2} m\n\
             - Raio máximo: {:.2} m\n\
             - Altura: {:.2} m\n\
             - Passos de tempo: {}\n\
             - Tempo total: {:.2} s\n\n",
            mesh.nr, mesh.ntheta, mesh.nz,
            mesh.r_min, mesh.r_max,
            mesh.nz as f64 * mesh.dz,
            self.simulation_state.temperature_history.len(),
            self.simulation_state.time_steps.last().unwrap_or(&0.0)
        );
        
        file.write_all(simulation_info.as_bytes()).map_err(|e| format!("Erro ao escrever informações da simulação: {}", e))?;
        
        // Escrever métricas globais
        let global_metrics = format!(
            "## Métricas Globais\n\n\
             - Temperatura mínima: {:.2} °C\n\
             - Temperatura máxima: {:.2} °C\n\
             - Temperatura média: {:.2} °C\n\
             - Desvio padrão da temperatura: {:.2} °C\n\
             - Gradiente máximo de temperatura: {:.2} °C/m\n\
             - Fluxo de calor máximo: {:.2} W/m²\n\
             - Energia total no sistema: {:.2e} J\n\
             - Taxa de aquecimento média: {:.2} °C/s\n\n",
            metrics.min_temperature,
            metrics.max_temperature,
            metrics.avg_temperature,
            metrics.std_temperature,
            metrics.max_gradient,
            metrics.max_heat_flux,
            metrics.total_energy,
            metrics.avg_heating_rate
        );
        
        file.write_all(global_metrics.as_bytes()).map_err(|e| format!("Erro ao escrever métricas globais: {}", e))?;
        
        // Escrever métricas temporais
        let temporal_metrics = format!(
            "## Métricas Temporais\n\n\
             - Tempo para atingir 50% da temperatura máxima: {:.2} s\n\
             - Tempo para atingir 90% da temperatura máxima: {:.2} s\n\
             - Taxa de aquecimento máxima: {:.2} °C/s\n\
             - Tempo de estabilização: {:.2} s\n\n",
            metrics.temporal_metrics.time_to_half_max,
            metrics.temporal_metrics.time_to_90_percent_max,
            metrics.temporal_metrics.max_heating_rate,
            metrics.temporal_metrics.stabilization_time
        );
        
        file.write_all(temporal_metrics.as_bytes()).map_err(|e| format!("Erro ao escrever métricas temporais: {}", e))?;
        
        // Escrever métricas por região
        let region_header = "## Métricas por Região\n\n";
        file.write_all(region_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de métricas por região: {}", e))?;
        
        for (name, region) in &metrics.region_metrics {
            let region_metrics = format!(
                "### Região: {}\n\n\
                 - Temperatura mínima: {:.2} °C\n\
                 - Temperatura máxima: {:.2} °C\n\
                 - Temperatura média: {:.2} °C\n\
                 - Volume: {:.2e} m³\n\
                 - Energia: {:.2e} J\n\n",
                name,
                region.min_temperature,
                region.max_temperature,
                region.avg_temperature,
                region.volume,
                region.energy
            );
            
            file.write_all(region_metrics.as_bytes()).map_err(|e| format!("Erro ao escrever métricas da região {}: {}", name, e))?;
        }
        
        // Escrever conclusões
        let conclusions = format!(
            "## Conclusões\n\n\
             A simulação atingiu uma temperatura máxima de {:.2} °C após {:.2} segundos. \
             A temperatura média final foi de {:.2} °C, com um desvio padrão de {:.2} °C, \
             indicando uma distribuição de temperatura {}. \
             O sistema atingiu 90% da temperatura máxima em {:.2} segundos e estabilizou após {:.2} segundos.\n\n\
             O fluxo de calor máximo foi de {:.2} W/m², localizado na região de maior gradiente de temperatura ({:.2} °C/m). \
             A energia total armazenada no sistema foi de {:.2e} J.\n\n",
            metrics.max_temperature,
            self.simulation_state.time_steps.last().unwrap_or(&0.0),
            metrics.avg_temperature,
            metrics.std_temperature,
            if metrics.std_temperature / metrics.avg_temperature < 0.1 { "relativamente uniforme" } else { "não uniforme" },
            metrics.temporal_metrics.time_to_90_percent_max,
            metrics.temporal_metrics.stabilization_time,
            metrics.max_heat_flux,
            metrics.max_gradient,
            metrics.total_energy
        );
        
        file.write_all(conclusions.as_bytes()).map_err(|e| format!("Erro ao escrever conclusões: {}", e))?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::simulation::mesh::CylindricalMesh;
    use crate::simulation::state::SimulationState;
    
    fn create_test_simulation_state() -> SimulationState {
        // Criar malha de teste
        let mesh = CylindricalMesh::new(10, 8, 10, 0.1, 1.0);
        
        // Criar estado de simulação
        let mut state = SimulationState::new(mesh);
        
        // Adicionar dados de temperatura
        let mut temperature = vec![25.0; mesh.total_cells()];
        state.temperature_history.push(temperature.clone());
        
        // Adicionar mais um passo de tempo com temperatura mais alta no centro
        for i in 0..mesh.nr {
            for j in 0..mesh.ntheta {
                for k in 0..mesh.nz {
                    let idx = i * mesh.ntheta * mesh.nz + j * mesh.nz + k;
                    let r = mesh.r_coords[i];
                    
                    // Temperatura mais alta no centro, diminuindo com o raio
                    temperature[idx] = 500.0 * (1.0 - r / mesh.r_max) + 25.0;
                }
            }
        }
        
        state.temperature_history.push(temperature);
        
        // Adicionar passos de tempo
        state.time_steps = vec![0.0, 10.0];
        
        state
    }
    
    #[test]
    fn test_metrics_calculation() {
        let state = create_test_simulation_state();
        let mut analyzer = MetricsAnalyzer::new(state);
        
        // Calcular métricas
        let metrics = analyzer.calculate_metrics().unwrap();
        
        // Verificar métricas básicas
        assert!(metrics.min_temperature >= 25.0);
        assert!(metrics.max_temperature <= 525.0);
        assert!(metrics.avg_temperature > 25.0 && metrics.avg_temperature < 525.0);
        
        // Verificar métricas temporais
        assert!(metrics.temporal_metrics.time_to_half_max > 0.0);
        assert!(metrics.temporal_metrics.time_to_90_percent_max > 0.0);
        
        // Verificar métricas por região
        assert!(metrics.region_metrics.contains_key("Centro"));
        assert!(metrics.region_metrics.contains_key("Meio"));
        assert!(metrics.region_metrics.contains_key("Periferia"));
        
        // Verificar que a temperatura média no centro é maior que na periferia
        let center_temp = metrics.region_metrics.get("Centro").unwrap().avg_temperature;
        let periphery_temp = metrics.region_metrics.get("Periferia").unwrap().avg_temperature;
        assert!(center_temp > periphery_temp);
    }
    
    #[test]
    fn test_export_csv() {
        let state = create_test_simulation_state();
        let mut analyzer = MetricsAnalyzer::new(state);
        
        // Calcular métricas
        analyzer.calculate_metrics().unwrap();
        
        // Exportar para CSV
        let options = ExportOptions {
            format: ExportFormat::CSV,
            output_path: "test_export.csv".to_string(),
            include_metrics: true,
            include_temperature: true,
            include_gradient: false,
            include_heat_flux: false,
            include_metadata: true,
            time_steps: None,
        };
        
        let result = analyzer.export_results(&options);
        assert!(result.is_ok());
        
        // Verificar se o arquivo foi criado
        let path = Path::new("test_export.csv");
        assert!(path.exists());
        
        // Limpar
        std::fs::remove_file(path).unwrap();
    }
    
    #[test]
    fn test_export_json() {
        let state = create_test_simulation_state();
        let mut analyzer = MetricsAnalyzer::new(state);
        
        // Calcular métricas
        analyzer.calculate_metrics().unwrap();
        
        // Exportar para JSON
        let options = ExportOptions {
            format: ExportFormat::JSON,
            output_path: "test_export.json".to_string(),
            include_metrics: true,
            include_temperature: true,
            include_gradient: false,
            include_heat_flux: false,
            include_metadata: true,
            time_steps: None,
        };
        
        let result = analyzer.export_results(&options);
        assert!(result.is_ok());
        
        // Verificar se o arquivo foi criado
        let path = Path::new("test_export.json");
        assert!(path.exists());
        
        // Limpar
        std::fs::remove_file(path).unwrap();
    }
    
    #[test]
    fn test_generate_report() {
        let state = create_test_simulation_state();
        let mut analyzer = MetricsAnalyzer::new(state);
        
        // Calcular métricas
        analyzer.calculate_metrics().unwrap();
        
        // Gerar relatório
        let result = analyzer.generate_report("test_report.md");
        assert!(result.is_ok());
        
        // Verificar se o arquivo foi criado
        let path = Path::new("test_report.md");
        assert!(path.exists());
        
        // Limpar
        std::fs::remove_file(path).unwrap();
    }
}
