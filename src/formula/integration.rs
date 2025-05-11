//-----------------------------------------------------------------------------
// File: formula/integration.rs
// Main Responsibility: Integrate formula engine with the simulation solver.
//
// This file implements the integration layer between the formula engine and the
// simulation solver. It provides high-level functionality for mapping specific
// physics functions (like thermal conductivity, specific heat, heat sources)
// to user-defined formulas. The FormulaManager acts as an intermediary that
// manages these mappings, evaluates the appropriate formulas when needed by
// the solver, and handles import/export of formula configurations for saving
// user customizations between sessions.
//-----------------------------------------------------------------------------
// This file includes the following key methods:
//
// FormulaManager::new() - Creates a new instance of the formula manager with an empty mapping
// FormulaManager::register_formula() - Registers a custom formula for a specific function type
// FormulaManager::evaluate() - Evaluates a formula for a given function type with provided parameters
// FormulaManager::get_formula() - Retrieves the formula associated with a specific function type
// FormulaManager::remove_formula() - Removes a formula mapping for a specific function type
// FormulaManager::import_mappings() - Imports formula mappings from a serialized configuration
// FormulaManager::export_mappings() - Exports the current formula mappings to a serialized format
// FormulaManager::validate_formula() - Validates that a formula is suitable for a given function type

// Implementação da integração do motor de fórmulas com o solucionador

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use super::engine::{FormulaEngine, Formula, ParameterValue, FormulaCategory};

/// Estrutura que representa um gerenciador de fórmulas para o solucionador
pub struct FormulaManager {
    /// Motor de fórmulas
    engine: FormulaEngine,
    /// Mapeamento de funções para fórmulas
    function_mappings: HashMap<String, String>,
}

/// Enumeração que representa os tipos de funções que podem ser substituídas por fórmulas
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum FunctionType {
    /// Condutividade térmica
    ThermalConductivity,
    /// Calor específico
    SpecificHeat,
    /// Densidade
    Density,
    /// Fonte de calor
    HeatSource,
    /// Coeficiente de convecção
    ConvectionCoefficient,
    /// Emissividade
    Emissivity,
    /// Condição de contorno
    BoundaryCondition,
}

impl FunctionType {
    /// Converte o tipo de função para uma string
    pub fn to_string(&self) -> String {
        match self {
            FunctionType::ThermalConductivity => "thermal_conductivity".to_string(),
            FunctionType::SpecificHeat => "specific_heat".to_string(),
            FunctionType::Density => "density".to_string(),
            FunctionType::HeatSource => "heat_source".to_string(),
            FunctionType::ConvectionCoefficient => "convection_coefficient".to_string(),
            FunctionType::Emissivity => "emissivity".to_string(),
            FunctionType::BoundaryCondition => "boundary_condition".to_string(),
        }
    }
    
    /// Cria um tipo de função a partir de uma string
    pub fn from_string(s: &str) -> Option<Self> {
        match s {
            "thermal_conductivity" => Some(FunctionType::ThermalConductivity),
            "specific_heat" => Some(FunctionType::SpecificHeat),
            "density" => Some(FunctionType::Density),
            "heat_source" => Some(FunctionType::HeatSource),
            "convection_coefficient" => Some(FunctionType::ConvectionCoefficient),
            "emissivity" => Some(FunctionType::Emissivity),
            "boundary_condition" => Some(FunctionType::BoundaryCondition),
            _ => None,
        }
    }
    
    /// Retorna a categoria de fórmula correspondente ao tipo de função
    pub fn to_category(&self) -> FormulaCategory {
        match self {
            FunctionType::ThermalConductivity |
            FunctionType::SpecificHeat |
            FunctionType::Density |
            FunctionType::Emissivity => FormulaCategory::MaterialProperty,
            FunctionType::HeatSource => FormulaCategory::HeatSource,
            FunctionType::ConvectionCoefficient |
            FunctionType::BoundaryCondition => FormulaCategory::BoundaryCondition,
        }
    }
}

impl FormulaManager {
    /// Cria uma nova instância do gerenciador de fórmulas
    pub fn new() -> Self {
        Self {
            engine: FormulaEngine::new(),
            function_mappings: HashMap::new(),
        }
    }
    
    /// Obtém o motor de fórmulas
    pub fn get_engine(&self) -> &FormulaEngine {
        &self.engine
    }
    
    /// Obtém uma referência mutável ao motor de fórmulas
    pub fn get_engine_mut(&mut self) -> &mut FormulaEngine {
        &mut self.engine
    }
    
    /// Define uma fórmula para um tipo de função
    pub fn set_formula_for_function(&mut self, function_type: FunctionType, formula_id: &str) -> Result<(), String> {
        // Verificar se a fórmula existe
        if self.engine.get_formula(formula_id).is_none() {
            return Err(format!("Fórmula não encontrada: {}", formula_id));
        }
        
        // Verificar se a categoria da fórmula é compatível com o tipo de função
        let formula = self.engine.get_formula(formula_id).unwrap();
        if formula.category != function_type.to_category() {
            return Err(format!(
                "Categoria da fórmula incompatível: esperado {:?}, encontrado {:?}",
                function_type.to_category(),
                formula.category
            ));
        }
        
        // Definir o mapeamento
        self.function_mappings.insert(function_type.to_string(), formula_id.to_string());
        
        Ok(())
    }
    
    /// Remove uma fórmula de um tipo de função
    pub fn remove_formula_from_function(&mut self, function_type: FunctionType) -> bool {
        self.function_mappings.remove(&function_type.to_string()).is_some()
    }
    
    /// Obtém o ID da fórmula para um tipo de função
    pub fn get_formula_for_function(&self, function_type: FunctionType) -> Option<String> {
        self.function_mappings.get(&function_type.to_string()).cloned()
    }
    
    /// Avalia uma função com os parâmetros fornecidos
    pub fn evaluate_function(&self, function_type: FunctionType, parameters: &HashMap<String, ParameterValue>) -> Result<ParameterValue, String> {
        // Obter o ID da fórmula para a função
        let formula_id = self.get_formula_for_function(function_type)
            .ok_or_else(|| format!("Nenhuma fórmula definida para a função: {:?}", function_type))?;
        
        // Avaliar a fórmula
        let result = self.engine.evaluate_formula(&formula_id, parameters)?;
        
        Ok(result.value)
    }
    
    /// Obtém todas as fórmulas compatíveis com um tipo de função
    pub fn get_compatible_formulas(&self, function_type: FunctionType) -> Vec<(String, Formula)> {
        let category = function_type.to_category();
        self.engine.get_formulas_by_category(category)
    }
    
    /// Verifica se uma fórmula é compatível com um tipo de função
    pub fn is_formula_compatible(&self, formula_id: &str, function_type: FunctionType) -> bool {
        if let Some(formula) = self.engine.get_formula(formula_id) {
            formula.category == function_type.to_category()
        } else {
            false
        }
    }
    
    /// Exporta as configurações do gerenciador de fórmulas para JSON
    pub fn export_to_json(&self) -> String {
        let export_data = serde_json::json!({
            "function_mappings": self.function_mappings,
        });
        
        serde_json::to_string_pretty(&export_data).unwrap_or_else(|_| "{}".to_string())
    }
    
    /// Importa as configurações do gerenciador de fórmulas a partir de JSON
    pub fn import_from_json(&mut self, json: &str) -> Result<(), String> {
        let import_data: serde_json::Value = serde_json::from_str(json)
            .map_err(|e| format!("Erro ao analisar JSON: {}", e))?;
        
        // Importar mapeamentos de funções
        if let Some(mappings) = import_data.get("function_mappings").and_then(|v| v.as_object()) {
            for (key, value) in mappings {
                if let Some(value_str) = value.as_str() {
                    if let Some(function_type) = FunctionType::from_string(key) {
                        // Verificar se a fórmula existe
                        if self.engine.get_formula(value_str).is_none() {
                            return Err(format!("Fórmula não encontrada: {}", value_str));
                        }
                        
                        // Definir o mapeamento
                        self.function_mappings.insert(key.clone(), value_str.to_string());
                    }
                }
            }
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::formula::engine::{FormulaParameter, ParameterType};
    
    #[test]
    fn test_formula_manager_creation() {
        let manager = FormulaManager::new();
        
        // Verificar se o motor de fórmulas foi inicializado corretamente
        assert!(manager.get_engine().get_formula("thermal_conductivity").is_some());
    }
    
    #[test]
    fn test_set_formula_for_function() {
        let mut manager = FormulaManager::new();
        
        // Definir uma fórmula para um tipo de função
        let result = manager.set_formula_for_function(
            FunctionType::ThermalConductivity,
            "thermal_conductivity"
        );
        
        assert!(result.is_ok());
        
        // Verificar se o mapeamento foi definido corretamente
        let formula_id = manager.get_formula_for_function(FunctionType::ThermalConductivity);
        assert_eq!(formula_id, Some("thermal_conductivity".to_string()));
    }
    
    #[test]
    fn test_evaluate_function() {
        let mut manager = FormulaManager::new();
        
        // Definir uma fórmula para um tipo de função
        manager.set_formula_for_function(
            FunctionType::ThermalConductivity,
            "thermal_conductivity"
        ).unwrap();
        
        // Parâmetros para a fórmula de condutividade térmica
        let mut params = HashMap::new();
        params.insert("temperature".to_string(), ParameterValue::Float(100.0));
        params.insert("t_ref".to_string(), ParameterValue::Float(25.0));
        params.insert("k0".to_string(), ParameterValue::Float(45.0));
        params.insert("k1".to_string(), ParameterValue::Float(-0.05));
        params.insert("k2".to_string(), ParameterValue::Float(0.0));
        
        // Avaliar a função
        let result = manager.evaluate_function(FunctionType::ThermalConductivity, &params).unwrap();
        
        // Verificar o resultado
        match result {
            ParameterValue::Float(value) => {
                // Valor esperado: k0 + k1 * (temperature - t_ref) / 100.0
                // = 45.0 + (-0.05) * (100.0 - 25.0) / 100.0
                // = 45.0 + (-0.05) * 0.75
                // = 45.0 - 0.0375
                // = 44.9625
                assert!((value - 44.9625).abs() < 1e-6);
            }
            _ => panic!("Tipo de resultado inesperado"),
        }
    }
    
    #[test]
    fn test_get_compatible_formulas() {
        let manager = FormulaManager::new();
        
        // Obter fórmulas compatíveis com o tipo de função
        let formulas = manager.get_compatible_formulas(FunctionType::ThermalConductivity);
        
        // Verificar se a fórmula de condutividade térmica está na lista
        assert!(formulas.iter().any(|(id, _)| id == "thermal_conductivity"));
    }
    
    #[test]
    fn test_export_import_json() {
        let mut manager = FormulaManager::new();
        
        // Definir uma fórmula para um tipo de função
        manager.set_formula_for_function(
            FunctionType::ThermalConductivity,
            "thermal_conductivity"
        ).unwrap();
        
        // Exportar para JSON
        let json = manager.export_to_json();
        
        // Criar um novo gerenciador
        let mut new_manager = FormulaManager::new();
        
        // Importar do JSON
        new_manager.import_from_json(&json).unwrap();
        
        // Verificar se o mapeamento foi importado corretamente
        let formula_id = new_manager.get_formula_for_function(FunctionType::ThermalConductivity);
        assert_eq!(formula_id, Some("thermal_conductivity".to_string()));
    }
}
