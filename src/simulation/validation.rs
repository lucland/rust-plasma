//-----------------------------------------------------------------------------
// File: simulation/validation.rs
// Main Responsibility: Validate simulation results against reference data.
//
// This file provides tools for validating the simulation results against
// analytical solutions, experimental data, or other reference data. It calculates
// various error metrics (RMSE, MAE, R-squared, etc.), generates validation
// reports, and helps ensure the scientific accuracy of the simulation through
// quantitative comparison with known solutions. This component is crucial for
// verifying the correctness and accuracy of the simulation models.
//-----------------------------------------------------------------------------

// Implementação do módulo de validação de modelos para o simulador de fornalha de plasma

use ndarray::{Array1, Array2, Array3, ArrayView3};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;

use crate::simulation::state::SimulationState;
use crate::simulation::mesh::CylindricalMesh;
use crate::simulation::metrics::{SimulationMetrics, MetricsAnalyzer};

/// Estrutura que representa os dados de referência para validação
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceData {
    /// Nome do conjunto de dados
    pub name: String,
    /// Descrição do conjunto de dados
    pub description: String,
    /// Fonte dos dados (experimental, analítica, etc.)
    pub source: String,
    /// Tipo de dados (temperatura, gradiente, fluxo de calor, etc.)
    pub data_type: String,
    /// Coordenadas dos pontos de dados (r, theta, z)
    pub coordinates: Vec<(f64, f64, f64)>,
    /// Valores nos pontos de dados
    pub values: Vec<f64>,
    /// Incerteza nos valores (opcional)
    pub uncertainties: Option<Vec<f64>>,
    /// Metadados adicionais
    pub metadata: HashMap<String, String>,
}

/// Estrutura que representa as métricas de erro para validação
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationMetrics {
    /// Erro médio absoluto (MAE)
    pub mean_absolute_error: f64,
    /// Erro quadrático médio (MSE)
    pub mean_squared_error: f64,
    /// Raiz do erro quadrático médio (RMSE)
    pub root_mean_squared_error: f64,
    /// Erro percentual absoluto médio (MAPE)
    pub mean_absolute_percentage_error: f64,
    /// Coeficiente de determinação (R²)
    pub r_squared: f64,
    /// Erro máximo absoluto
    pub max_absolute_error: f64,
    /// Erro médio (ME)
    pub mean_error: f64,
    /// Erro normalizado pela raiz da média quadrática (NRMSE)
    pub normalized_rmse: f64,
    /// Métricas por região
    pub region_metrics: HashMap<String, ValidationMetrics>,
}

/// Estrutura que representa o resultado de uma validação
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Nome da validação
    pub name: String,
    /// Descrição da validação
    pub description: String,
    /// Dados de referência utilizados
    pub reference_data: ReferenceData,
    /// Métricas de erro calculadas
    pub metrics: ValidationMetrics,
    /// Valores simulados nos pontos de referência
    pub simulated_values: Vec<f64>,
    /// Metadados adicionais
    pub metadata: HashMap<String, String>,
}

/// Enumeração que representa os formatos de importação suportados
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportFormat {
    /// Formato CSV (Comma-Separated Values)
    CSV,
    /// Formato JSON (JavaScript Object Notation)
    JSON,
    /// Formato personalizado
    Custom,
}

/// Estrutura que representa as opções de importação
#[derive(Debug, Clone)]
pub struct ImportOptions {
    /// Formato de importação
    pub format: ImportFormat,
    /// Caminho do arquivo de entrada
    pub input_path: String,
    /// Delimitador (para CSV)
    pub delimiter: Option<char>,
    /// Tem cabeçalho (para CSV)
    pub has_header: bool,
    /// Colunas para coordenadas (para CSV)
    pub coordinate_columns: Option<(usize, usize, usize)>,
    /// Coluna para valores (para CSV)
    pub value_column: Option<usize>,
    /// Coluna para incertezas (para CSV)
    pub uncertainty_column: Option<usize>,
}

/// Estrutura que representa o validador de modelos
pub struct ModelValidator {
    /// Estado da simulação
    simulation_state: SimulationState,
    /// Dados de referência
    reference_data: Option<ReferenceData>,
    /// Resultado da validação
    validation_result: Option<ValidationResult>,
}

impl ModelValidator {
    /// Cria um novo validador de modelos
    pub fn new(simulation_state: SimulationState) -> Self {
        Self {
            simulation_state,
            reference_data: None,
            validation_result: None,
        }
    }
    
    /// Importa dados de referência a partir de um arquivo
    pub fn import_reference_data(&mut self, options: &ImportOptions) -> Result<&ReferenceData, String> {
        match options.format {
            ImportFormat::CSV => self.import_from_csv(options),
            ImportFormat::JSON => self.import_from_json(options),
            ImportFormat::Custom => self.import_from_custom(options),
        }
    }
    
    /// Importa dados de referência a partir de um arquivo CSV
    fn import_from_csv(&mut self, options: &ImportOptions) -> Result<&ReferenceData, String> {
        let path = Path::new(&options.input_path);
        let file = File::open(path).map_err(|e| format!("Erro ao abrir arquivo CSV: {}", e))?;
        let reader = BufReader::new(file);
        
        let delimiter = options.delimiter.unwrap_or(',');
        let has_header = options.has_header;
        
        let coordinate_columns = options.coordinate_columns.ok_or_else(|| 
            "Colunas de coordenadas não especificadas".to_string()
        )?;
        
        let value_column = options.value_column.ok_or_else(|| 
            "Coluna de valores não especificada".to_string()
        )?;
        
        let mut coordinates = Vec::new();
        let mut values = Vec::new();
        let mut uncertainties = if options.uncertainty_column.is_some() {
            Some(Vec::new())
        } else {
            None
        };
        
        for (i, line_result) in reader.lines().enumerate() {
            // Pular cabeçalho se necessário
            if i == 0 && has_header {
                continue;
            }
            
            let line = line_result.map_err(|e| format!("Erro ao ler linha {}: {}", i + 1, e))?;
            let fields: Vec<&str> = line.split(delimiter).collect();
            
            if fields.len() <= value_column || fields.len() <= coordinate_columns.0 || 
               fields.len() <= coordinate_columns.1 || fields.len() <= coordinate_columns.2 {
                return Err(format!("Linha {} não tem campos suficientes", i + 1));
            }
            
            // Extrair coordenadas
            let r = fields[coordinate_columns.0].trim().parse::<f64>()
                .map_err(|e| format!("Erro ao converter coordenada r na linha {}: {}", i + 1, e))?;
            
            let theta = fields[coordinate_columns.1].trim().parse::<f64>()
                .map_err(|e| format!("Erro ao converter coordenada theta na linha {}: {}", i + 1, e))?;
            
            let z = fields[coordinate_columns.2].trim().parse::<f64>()
                .map_err(|e| format!("Erro ao converter coordenada z na linha {}: {}", i + 1, e))?;
            
            coordinates.push((r, theta, z));
            
            // Extrair valor
            let value = fields[value_column].trim().parse::<f64>()
                .map_err(|e| format!("Erro ao converter valor na linha {}: {}", i + 1, e))?;
            
            values.push(value);
            
            // Extrair incerteza se disponível
            if let Some(uncertainty_column) = options.uncertainty_column {
                if fields.len() <= uncertainty_column {
                    return Err(format!("Linha {} não tem campo de incerteza", i + 1));
                }
                
                let uncertainty = fields[uncertainty_column].trim().parse::<f64>()
                    .map_err(|e| format!("Erro ao converter incerteza na linha {}: {}", i + 1, e))?;
                
                if let Some(ref mut uncertainties_vec) = uncertainties {
                    uncertainties_vec.push(uncertainty);
                }
            }
        }
        
        // Extrair nome do arquivo para usar como nome do conjunto de dados
        let file_name = path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        // Criar conjunto de dados de referência
        let reference_data = ReferenceData {
            name: file_name,
            description: format!("Dados importados de {}", options.input_path),
            source: "CSV Import".to_string(),
            data_type: "Temperature".to_string(), // Assumindo temperatura por padrão
            coordinates,
            values,
            uncertainties,
            metadata: HashMap::new(),
        };
        
        self.reference_data = Some(reference_data);
        
        Ok(self.reference_data.as_ref().unwrap())
    }
    
    /// Importa dados de referência a partir de um arquivo JSON
    fn import_from_json(&mut self, options: &ImportOptions) -> Result<&ReferenceData, String> {
        let path = Path::new(&options.input_path);
        let file = File::open(path).map_err(|e| format!("Erro ao abrir arquivo JSON: {}", e))?;
        
        let reference_data: ReferenceData = serde_json::from_reader(file)
            .map_err(|e| format!("Erro ao ler arquivo JSON: {}", e))?;
        
        self.reference_data = Some(reference_data);
        
        Ok(self.reference_data.as_ref().unwrap())
    }
    
    /// Importa dados de referência a partir de um formato personalizado
    fn import_from_custom(&mut self, options: &ImportOptions) -> Result<&ReferenceData, String> {
        // Implementação simplificada - em um ambiente real, isso seria adaptado para o formato específico
        Err("Importação de formato personalizado não implementada".to_string())
    }
    
    /// Define dados de referência diretamente
    pub fn set_reference_data(&mut self, reference_data: ReferenceData) -> &ReferenceData {
        self.reference_data = Some(reference_data);
        self.reference_data.as_ref().unwrap()
    }
    
    /// Valida o modelo com os dados de referência
    pub fn validate(&mut self, name: &str, description: &str) -> Result<&ValidationResult, String> {
        if self.reference_data.is_none() {
            return Err("Dados de referência não definidos".to_string());
        }
        
        let reference_data = self.reference_data.as_ref().unwrap();
        
        if self.simulation_state.temperature_history.is_empty() {
            return Err("Histórico de temperatura vazio".to_string());
        }
        
        // Obter a temperatura final
        let final_temperature = &self.simulation_state.temperature_history[self.simulation_state.temperature_history.len() - 1];
        let mesh = &self.simulation_state.mesh;
        
        // Interpolar valores simulados nos pontos de referência
        let mut simulated_values = Vec::with_capacity(reference_data.coordinates.len());
        
        for &(r, theta, z) in &reference_data.coordinates {
            let interpolated_value = self.interpolate_value(r, theta, z, final_temperature, mesh);
            simulated_values.push(interpolated_value);
        }
        
        // Calcular métricas de erro
        let metrics = self.calculate_validation_metrics(&reference_data.values, &simulated_values);
        
        // Calcular métricas por região
        let region_metrics = self.calculate_region_validation_metrics(&reference_data.values, &simulated_values, &reference_data.coordinates);
        
        let validation_metrics = ValidationMetrics {
            mean_absolute_error: metrics.0,
            mean_squared_error: metrics.1,
            root_mean_squared_error: metrics.2,
            mean_absolute_percentage_error: metrics.3,
            r_squared: metrics.4,
            max_absolute_error: metrics.5,
            mean_error: metrics.6,
            normalized_rmse: metrics.7,
            region_metrics,
        };
        
        // Criar resultado da validação
        let validation_result = ValidationResult {
            name: name.to_string(),
            description: description.to_string(),
            reference_data: reference_data.clone(),
            metrics: validation_metrics,
            simulated_values,
            metadata: HashMap::new(),
        };
        
        self.validation_result = Some(validation_result);
        
        Ok(self.validation_result.as_ref().unwrap())
    }
    
    /// Interpola o valor simulado em um ponto específico
    fn interpolate_value(&self, r: f64, theta: f64, z: f64, temperature: &[f64], mesh: &CylindricalMesh) -> f64 {
        // Encontrar os índices da célula que contém o ponto
        let i_r = self.find_index(r, &mesh.r_coords);
        let i_theta = (theta / mesh.dtheta).floor() as usize;
        let i_z = (z / mesh.dz).floor() as usize;
        
        // Verificar se os índices estão dentro dos limites
        if i_r >= mesh.nr - 1 || i_theta >= mesh.ntheta - 1 || i_z >= mesh.nz - 1 {
            return 0.0;
        }
        
        // Calcular as frações para interpolação
        let fr = (r - mesh.r_coords[i_r]) / (mesh.r_coords[i_r + 1] - mesh.r_coords[i_r]);
        let ftheta = (theta - i_theta as f64 * mesh.dtheta) / mesh.dtheta;
        let fz = (z - i_z as f64 * mesh.dz) / mesh.dz;
        
        // Obter os valores nos vértices da célula
        let v000 = self.get_temperature_at(i_r, i_theta, i_z, temperature, mesh);
        let v001 = self.get_temperature_at(i_r, i_theta, i_z + 1, temperature, mesh);
        let v010 = self.get_temperature_at(i_r, i_theta + 1, i_z, temperature, mesh);
        let v011 = self.get_temperature_at(i_r, i_theta + 1, i_z + 1, temperature, mesh);
        let v100 = self.get_temperature_at(i_r + 1, i_theta, i_z, temperature, mesh);
        let v101 = self.get_temperature_at(i_r + 1, i_theta, i_z + 1, temperature, mesh);
        let v110 = self.get_temperature_at(i_r + 1, i_theta + 1, i_z, temperature, mesh);
        let v111 = self.get_temperature_at(i_r + 1, i_theta + 1, i_z + 1, temperature, mesh);
        
        // Interpolação trilinear
        let v00 = v000 * (1.0 - fr) + v100 * fr;
        let v01 = v001 * (1.0 - fr) + v101 * fr;
        let v10 = v010 * (1.0 - fr) + v110 * fr;
        let v11 = v011 * (1.0 - fr) + v111 * fr;
        
        let v0 = v00 * (1.0 - ftheta) + v10 * ftheta;
        let v1 = v01 * (1.0 - ftheta) + v11 * ftheta;
        
        v0 * (1.0 - fz) + v1 * fz
    }
    
    /// Encontra o índice do elemento mais próximo em um vetor ordenado
    fn find_index(&self, value: f64, coords: &[f64]) -> usize {
        let mut left = 0;
        let mut right = coords.len() - 1;
        
        while left < right {
            let mid = (left + right + 1) / 2;
            
            if coords[mid] <= value {
                left = mid;
            } else {
                right = mid - 1;
            }
        }
        
        left
    }
    
    /// Obtém a temperatura em um ponto específico da malha
    fn get_temperature_at(&self, i: usize, j: usize, k: usize, temperature: &[f64], mesh: &CylindricalMesh) -> f64 {
        let idx = i * mesh.ntheta * mesh.nz + j * mesh.nz + k;
        
        if idx < temperature.len() {
            temperature[idx]
        } else {
            0.0
        }
    }
    
    /// Calcula as métricas de validação
    fn calculate_validation_metrics(&self, reference: &[f64], simulated: &[f64]) -> (f64, f64, f64, f64, f64, f64, f64, f64) {
        if reference.len() != simulated.len() || reference.is_empty() {
            return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        }
        
        let n = reference.len() as f64;
        
        // Calcular erro médio absoluto (MAE)
        let mut sum_abs_error = 0.0;
        for i in 0..reference.len() {
            sum_abs_error += (reference[i] - simulated[i]).abs();
        }
        let mae = sum_abs_error / n;
        
        // Calcular erro quadrático médio (MSE)
        let mut sum_squared_error = 0.0;
        for i in 0..reference.len() {
            sum_squared_error += (reference[i] - simulated[i]).powi(2);
        }
        let mse = sum_squared_error / n;
        
        // Calcular raiz do erro quadrático médio (RMSE)
        let rmse = mse.sqrt();
        
        // Calcular erro percentual absoluto médio (MAPE)
        let mut sum_abs_percentage_error = 0.0;
        for i in 0..reference.len() {
            if reference[i] != 0.0 {
                sum_abs_percentage_error += ((reference[i] - simulated[i]) / reference[i]).abs();
            }
        }
        let mape = sum_abs_percentage_error / n * 100.0;
        
        // Calcular coeficiente de determinação (R²)
        let mean_reference = reference.iter().sum::<f64>() / n;
        
        let mut ss_total = 0.0;
        let mut ss_residual = 0.0;
        
        for i in 0..reference.len() {
            ss_total += (reference[i] - mean_reference).powi(2);
            ss_residual += (reference[i] - simulated[i]).powi(2);
        }
        
        let r_squared = if ss_total > 0.0 {
            1.0 - (ss_residual / ss_total)
        } else {
            0.0
        };
        
        // Calcular erro máximo absoluto
        let mut max_abs_error = 0.0;
        for i in 0..reference.len() {
            let abs_error = (reference[i] - simulated[i]).abs();
            max_abs_error = max_abs_error.max(abs_error);
        }
        
        // Calcular erro médio (ME)
        let mut sum_error = 0.0;
        for i in 0..reference.len() {
            sum_error += reference[i] - simulated[i];
        }
        let me = sum_error / n;
        
        // Calcular erro normalizado pela raiz da média quadrática (NRMSE)
        let reference_range = reference.iter().cloned().fold(f64::NEG_INFINITY, f64::max) - 
                             reference.iter().cloned().fold(f64::INFINITY, f64::min);
        
        let nrmse = if reference_range > 0.0 {
            rmse / reference_range
        } else {
            0.0
        };
        
        (mae, mse, rmse, mape, r_squared, max_abs_error, me, nrmse)
    }
    
    /// Calcula as métricas de validação por região
    fn calculate_region_validation_metrics(&self, reference: &[f64], simulated: &[f64], coordinates: &[(f64, f64, f64)]) -> HashMap<String, ValidationMetrics> {
        let mut region_metrics = HashMap::new();
        
        // Exemplo: dividir em regiões radiais (centro, meio, periferia)
        let regions = vec![
            ("Centro", 0.0, self.simulation_state.mesh.r_max / 3.0),
            ("Meio", self.simulation_state.mesh.r_max / 3.0, 2.0 * self.simulation_state.mesh.r_max / 3.0),
            ("Periferia", 2.0 * self.simulation_state.mesh.r_max / 3.0, self.simulation_state.mesh.r_max),
        ];
        
        for (name, r_min, r_max) in regions {
            // Filtrar pontos na região
            let mut region_reference = Vec::new();
            let mut region_simulated = Vec::new();
            
            for i in 0..coordinates.len() {
                let (r, _, _) = coordinates[i];
                
                if r >= r_min && r < r_max {
                    region_reference.push(reference[i]);
                    region_simulated.push(simulated[i]);
                }
            }
            
            // Calcular métricas para a região
            if !region_reference.is_empty() {
                let metrics = self.calculate_validation_metrics(&region_reference, &region_simulated);
                
                let validation_metrics = ValidationMetrics {
                    mean_absolute_error: metrics.0,
                    mean_squared_error: metrics.1,
                    root_mean_squared_error: metrics.2,
                    mean_absolute_percentage_error: metrics.3,
                    r_squared: metrics.4,
                    max_absolute_error: metrics.5,
                    mean_error: metrics.6,
                    normalized_rmse: metrics.7,
                    region_metrics: HashMap::new(),
                };
                
                region_metrics.insert(name.to_string(), validation_metrics);
            }
        }
        
        region_metrics
    }
    
    /// Exporta o resultado da validação para um arquivo
    pub fn export_validation_result(&self, output_path: &str) -> Result<(), String> {
        if self.validation_result.is_none() {
            return Err("Resultado de validação não disponível".to_string());
        }
        
        let validation_result = self.validation_result.as_ref().unwrap();
        
        let path = Path::new(output_path);
        let file = File::create(path).map_err(|e| format!("Erro ao criar arquivo de resultado: {}", e))?;
        
        serde_json::to_writer_pretty(file, validation_result)
            .map_err(|e| format!("Erro ao escrever resultado de validação: {}", e))?;
        
        Ok(())
    }
    
    /// Gera um relatório de validação
    pub fn generate_validation_report(&self, output_path: &str) -> Result<(), String> {
        if self.validation_result.is_none() {
            return Err("Resultado de validação não disponível".to_string());
        }
        
        let validation_result = self.validation_result.as_ref().unwrap();
        
        let path = Path::new(output_path);
        let mut file = File::create(path).map_err(|e| format!("Erro ao criar arquivo de relatório: {}", e))?;
        
        // Escrever cabeçalho do relatório
        let header = format!(
            "# Relatório de Validação: {}\n\n{}\n\n",
            validation_result.name,
            validation_result.description
        );
        
        file.write_all(header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho do relatório: {}", e))?;
        
        // Escrever informações sobre os dados de referência
        let reference_info = format!(
            "## Dados de Referência\n\n\
             - Nome: {}\n\
             - Descrição: {}\n\
             - Fonte: {}\n\
             - Tipo de dados: {}\n\
             - Número de pontos: {}\n\n",
            validation_result.reference_data.name,
            validation_result.reference_data.description,
            validation_result.reference_data.source,
            validation_result.reference_data.data_type,
            validation_result.reference_data.coordinates.len()
        );
        
        file.write_all(reference_info.as_bytes()).map_err(|e| format!("Erro ao escrever informações de referência: {}", e))?;
        
        // Escrever métricas de validação
        let metrics = &validation_result.metrics;
        
        let metrics_info = format!(
            "## Métricas de Validação\n\n\
             - Erro Médio Absoluto (MAE): {:.4} °C\n\
             - Erro Quadrático Médio (MSE): {:.4} °C²\n\
             - Raiz do Erro Quadrático Médio (RMSE): {:.4} °C\n\
             - Erro Percentual Absoluto Médio (MAPE): {:.4} %\n\
             - Coeficiente de Determinação (R²): {:.4}\n\
             - Erro Máximo Absoluto: {:.4} °C\n\
             - Erro Médio (ME): {:.4} °C\n\
             - Erro Normalizado (NRMSE): {:.4}\n\n",
            metrics.mean_absolute_error,
            metrics.mean_squared_error,
            metrics.root_mean_squared_error,
            metrics.mean_absolute_percentage_error,
            metrics.r_squared,
            metrics.max_absolute_error,
            metrics.mean_error,
            metrics.normalized_rmse
        );
        
        file.write_all(metrics_info.as_bytes()).map_err(|e| format!("Erro ao escrever métricas de validação: {}", e))?;
        
        // Escrever métricas por região
        let region_header = "## Métricas por Região\n\n";
        file.write_all(region_header.as_bytes()).map_err(|e| format!("Erro ao escrever cabeçalho de métricas por região: {}", e))?;
        
        for (name, region_metrics) in &metrics.region_metrics {
            let region_metrics_info = format!(
                "### Região: {}\n\n\
                 - Erro Médio Absoluto (MAE): {:.4} °C\n\
                 - Erro Quadrático Médio (MSE): {:.4} °C²\n\
                 - Raiz do Erro Quadrático Médio (RMSE): {:.4} °C\n\
                 - Erro Percentual Absoluto Médio (MAPE): {:.4} %\n\
                 - Coeficiente de Determinação (R²): {:.4}\n\
                 - Erro Máximo Absoluto: {:.4} °C\n\
                 - Erro Médio (ME): {:.4} °C\n\
                 - Erro Normalizado (NRMSE): {:.4}\n\n",
                name,
                region_metrics.mean_absolute_error,
                region_metrics.mean_squared_error,
                region_metrics.root_mean_squared_error,
                region_metrics.mean_absolute_percentage_error,
                region_metrics.r_squared,
                region_metrics.max_absolute_error,
                region_metrics.mean_error,
                region_metrics.normalized_rmse
            );
            
            file.write_all(region_metrics_info.as_bytes()).map_err(|e| format!("Erro ao escrever métricas da região {}: {}", name, e))?;
        }
        
        // Escrever análise de resultados
        let analysis = format!(
            "## Análise de Resultados\n\n\
             A validação do modelo apresentou um RMSE de {:.4} °C, o que representa {:.2}% da faixa de temperatura dos dados de referência. \
             O coeficiente de determinação (R²) de {:.4} indica que o modelo {}. \
             O erro médio de {:.4} °C sugere que o modelo {}.\n\n\
             A região com melhor desempenho foi {}, com RMSE de {:.4} °C, \
             enquanto a região com pior desempenho foi {}, com RMSE de {:.4} °C.\n\n",
            metrics.root_mean_squared_error,
            metrics.normalized_rmse * 100.0,
            metrics.r_squared,
            if metrics.r_squared > 0.9 {
                "explica muito bem a variação dos dados"
            } else if metrics.r_squared > 0.7 {
                "explica razoavelmente bem a variação dos dados"
            } else {
                "não explica adequadamente a variação dos dados"
            },
            metrics.mean_error,
            if metrics.mean_error.abs() < 0.1 * metrics.root_mean_squared_error {
                "não apresenta viés significativo"
            } else if metrics.mean_error > 0.0 {
                "tende a subestimar os valores reais"
            } else {
                "tende a superestimar os valores reais"
            },
            self.find_best_region(&metrics.region_metrics),
            self.get_region_rmse(&metrics.region_metrics, &self.find_best_region(&metrics.region_metrics)),
            self.find_worst_region(&metrics.region_metrics),
            self.get_region_rmse(&metrics.region_metrics, &self.find_worst_region(&metrics.region_metrics))
        );
        
        file.write_all(analysis.as_bytes()).map_err(|e| format!("Erro ao escrever análise de resultados: {}", e))?;
        
        // Escrever conclusões
        let conclusion = format!(
            "## Conclusões\n\n\
             Com base nas métricas de validação, o modelo {}. \
             O erro médio absoluto de {:.4} °C e o erro percentual médio de {:.2}% indicam que {}. \
             Recomenda-se {} para melhorar a precisão do modelo.\n\n",
            if metrics.r_squared > 0.9 && metrics.normalized_rmse < 0.1 {
                "apresenta excelente concordância com os dados de referência"
            } else if metrics.r_squared > 0.7 && metrics.normalized_rmse < 0.2 {
                "apresenta boa concordância com os dados de referência"
            } else {
                "apresenta concordância limitada com os dados de referência"
            },
            metrics.mean_absolute_error,
            metrics.mean_absolute_percentage_error,
            if metrics.mean_absolute_percentage_error < 5.0 {
                "o modelo é adequado para aplicações de alta precisão"
            } else if metrics.mean_absolute_percentage_error < 10.0 {
                "o modelo é adequado para a maioria das aplicações práticas"
            } else {
                "o modelo pode ser inadequado para aplicações que exigem alta precisão"
            },
            if metrics.r_squared < 0.7 {
                "revisar os parâmetros físicos e refinar a malha de discretização"
            } else if metrics.mean_error.abs() > 0.1 * metrics.root_mean_squared_error {
                "ajustar os parâmetros do modelo para reduzir o viés sistemático"
            } else {
                "realizar validações adicionais com outros conjuntos de dados"
            }
        );
        
        file.write_all(conclusion.as_bytes()).map_err(|e| format!("Erro ao escrever conclusões: {}", e))?;
        
        Ok(())
    }
    
    /// Encontra a região com melhor desempenho (menor RMSE)
    fn find_best_region(&self, region_metrics: &HashMap<String, ValidationMetrics>) -> String {
        let mut best_region = String::new();
        let mut best_rmse = f64::INFINITY;
        
        for (name, metrics) in region_metrics {
            if metrics.root_mean_squared_error < best_rmse {
                best_rmse = metrics.root_mean_squared_error;
                best_region = name.clone();
            }
        }
        
        best_region
    }
    
    /// Encontra a região com pior desempenho (maior RMSE)
    fn find_worst_region(&self, region_metrics: &HashMap<String, ValidationMetrics>) -> String {
        let mut worst_region = String::new();
        let mut worst_rmse = 0.0;
        
        for (name, metrics) in region_metrics {
            if metrics.root_mean_squared_error > worst_rmse {
                worst_rmse = metrics.root_mean_squared_error;
                worst_region = name.clone();
            }
        }
        
        worst_region
    }
    
    /// Obtém o RMSE de uma região específica
    fn get_region_rmse(&self, region_metrics: &HashMap<String, ValidationMetrics>, region_name: &str) -> f64 {
        if let Some(metrics) = region_metrics.get(region_name) {
            metrics.root_mean_squared_error
        } else {
            0.0
        }
    }
    
    /// Cria dados de referência sintéticos para testes
    pub fn create_synthetic_reference_data(&self, num_points: usize, error_level: f64) -> ReferenceData {
        let mesh = &self.simulation_state.mesh;
        
        let mut coordinates = Vec::with_capacity(num_points);
        let mut values = Vec::with_capacity(num_points);
        
        // Gerar pontos aleatórios dentro do domínio
        let mut rng = rand::thread_rng();
        
        for _ in 0..num_points {
            // Coordenadas aleatórias
            let r = mesh.r_min + (mesh.r_max - mesh.r_min) * rand::random::<f64>();
            let theta = mesh.dtheta * mesh.ntheta as f64 * rand::random::<f64>();
            let z = mesh.dz * mesh.nz as f64 * rand::random::<f64>();
            
            coordinates.push((r, theta, z));
            
            // Valor de referência (simplificado)
            // Em uma implementação real, isso seria baseado em uma solução analítica ou dados experimentais
            let reference_value = 100.0 + 400.0 * (1.0 - r / mesh.r_max);
            
            // Adicionar ruído para simular erro experimental
            let noise = error_level * (2.0 * rand::random::<f64>() - 1.0) * reference_value;
            values.push(reference_value + noise);
        }
        
        ReferenceData {
            name: "Synthetic Reference Data".to_string(),
            description: format!("Synthetic data with {} points and {}% error level", num_points, error_level * 100.0),
            source: "Synthetic".to_string(),
            data_type: "Temperature".to_string(),
            coordinates,
            values,
            uncertainties: None,
            metadata: HashMap::new(),
        }
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
        
        // Adicionar temperatura com distribuição radial
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
        state.time_steps = vec![10.0];
        
        state
    }
    
    fn create_test_reference_data() -> ReferenceData {
        let mut coordinates = Vec::new();
        let mut values = Vec::new();
        
        // Criar alguns pontos de teste
        coordinates.push((0.2, 0.1, 0.5));
        values.push(400.0);
        
        coordinates.push((0.5, 0.2, 0.3));
        values.push(250.0);
        
        coordinates.push((0.8, 0.3, 0.7));
        values.push(100.0);
        
        ReferenceData {
            name: "Test Reference Data".to_string(),
            description: "Data for testing".to_string(),
            source: "Test".to_string(),
            data_type: "Temperature".to_string(),
            coordinates,
            values,
            uncertainties: None,
            metadata: HashMap::new(),
        }
    }
    
    #[test]
    fn test_validation() {
        let state = create_test_simulation_state();
        let reference_data = create_test_reference_data();
        
        let mut validator = ModelValidator::new(state);
        validator.set_reference_data(reference_data);
        
        let result = validator.validate("Test Validation", "Validation for testing");
        assert!(result.is_ok());
        
        let validation_result = result.unwrap();
        
        // Verificar métricas básicas
        assert!(validation_result.metrics.mean_absolute_error >= 0.0);
        assert!(validation_result.metrics.root_mean_squared_error >= 0.0);
        assert!(validation_result.metrics.r_squared <= 1.0);
        
        // Verificar que temos valores simulados para cada ponto de referência
        assert_eq!(validation_result.simulated_values.len(), validation_result.reference_data.values.len());
    }
    
    #[test]
    fn test_synthetic_data() {
        let state = create_test_simulation_state();
        let mut validator = ModelValidator::new(state);
        
        let synthetic_data = validator.create_synthetic_reference_data(100, 0.05);
        assert_eq!(synthetic_data.coordinates.len(), 100);
        assert_eq!(synthetic_data.values.len(), 100);
        
        validator.set_reference_data(synthetic_data);
        
        let result = validator.validate("Synthetic Validation", "Validation with synthetic data");
        assert!(result.is_ok());
    }
    
    #[test]
    fn test_report_generation() {
        let state = create_test_simulation_state();
        let reference_data = create_test_reference_data();
        
        let mut validator = ModelValidator::new(state);
        validator.set_reference_data(reference_data);
        
        let result = validator.validate("Test Validation", "Validation for testing");
        assert!(result.is_ok());
        
        let report_result = validator.generate_validation_report("test_validation_report.md");
        assert!(report_result.is_ok());
        
        // Verificar se o arquivo foi criado
        let path = Path::new("test_validation_report.md");
        assert!(path.exists());
        
        // Limpar
        std::fs::remove_file(path).unwrap();
    }
}
