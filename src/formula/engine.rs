//-----------------------------------------------------------------------------
// File: formula/engine.rs
// Main Responsibility: Core formula evaluation and management engine.
//
// This file implements the embedded formula engine that powers the customizable
// physics models in the plasma furnace simulator. It provides a sandboxed
// environment for safely evaluating user-defined mathematical formulas using
// the Rhai scripting language. The engine manages formula compilation, parameter
// validation, type conversion, and evaluation, and includes a library of
// predefined formulas for common material properties and physical phenomena.
//-----------------------------------------------------------------------------
// This file contains the following key components:
//
// 1. Formula - Main struct that represents a user-defined formula with:
//    - compile(): Compiles the formula string into an executable AST
//    - evaluate(): Executes the formula with given parameters
//    - validate(): Checks formula syntax and parameter compatibility
//
// 2. FormulaEngine - Manages formula compilation and execution:
//    - create_formula(): Builds a new formula from user input
//    - evaluate_formula(): Safely executes a formula with error handling
//    - register_builtin_formulas(): Adds predefined physics formulas
//    - get_formula_library(): Returns available formulas by category
//
// 3. FormulaParameter - Defines parameters accepted by formulas
// 4. ParameterType/Value - Type system for formula inputs and outputs
// 5. FormulaCategory - Classification system for organizing formulas
// 6. FormulaResult - Return type with success/error handling

// Implementação do motor de fórmulas para simulação de plasma

use rhai::{Engine, AST, Scope, Dynamic, Map, Array, FnPtr};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::fmt;

/// Estrutura que representa uma fórmula personalizada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Formula {
    /// Nome da fórmula
    pub name: String,
    /// Descrição da fórmula
    pub description: String,
    /// Código fonte da fórmula em linguagem Rhai
    pub source: String,
    /// AST compilada da fórmula (não serializada)
    #[serde(skip)]
    pub ast: Option<AST>,
    /// Lista de parâmetros da fórmula
    pub parameters: Vec<FormulaParameter>,
    /// Categoria da fórmula
    pub category: FormulaCategory,
    /// Unidade de medida do resultado
    pub result_unit: String,
}

/// Estrutura que representa um parâmetro de fórmula
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaParameter {
    /// Nome do parâmetro
    pub name: String,
    /// Descrição do parâmetro
    pub description: String,
    /// Tipo do parâmetro
    pub param_type: ParameterType,
    /// Valor padrão do parâmetro
    pub default_value: ParameterValue,
    /// Unidade de medida do parâmetro
    pub unit: String,
    /// Valor mínimo permitido (opcional)
    pub min_value: Option<ParameterValue>,
    /// Valor máximo permitido (opcional)
    pub max_value: Option<ParameterValue>,
}

/// Enumeração que representa os tipos de parâmetros
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum ParameterType {
    /// Número inteiro
    Integer,
    /// Número de ponto flutuante
    Float,
    /// Valor booleano
    Boolean,
    /// String de texto
    String,
    /// Array de valores
    Array,
    /// Mapa de valores
    Map,
}

/// Enumeração que representa as categorias de fórmulas
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum FormulaCategory {
    /// Propriedades do material
    MaterialProperty,
    /// Fonte de calor
    HeatSource,
    /// Condição de contorno
    BoundaryCondition,
    /// Modelo físico
    PhysicalModel,
    /// Pós-processamento
    PostProcessing,
    /// Utilitário
    Utility,
}

/// Estrutura que representa um valor de parâmetro
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterValue {
    /// Valor inteiro
    Integer(i64),
    /// Valor de ponto flutuante
    Float(f64),
    /// Valor booleano
    Boolean(bool),
    /// Valor de string
    String(String),
    /// Valor de array
    Array(Vec<ParameterValue>),
    /// Valor de mapa
    Map(HashMap<String, ParameterValue>),
}

impl ParameterValue {
    /// Converte o valor do parâmetro para um valor dinâmico do Rhai
    pub fn to_dynamic(&self) -> Dynamic {
        match self {
            ParameterValue::Integer(i) => (*i).into(),
            ParameterValue::Float(f) => (*f).into(),
            ParameterValue::Boolean(b) => (*b).into(),
            ParameterValue::String(s) => s.clone().into(),
            ParameterValue::Array(arr) => {
                let mut rhai_array = Array::new();
                for item in arr {
                    rhai_array.push(item.to_dynamic());
                }
                rhai_array.into()
            }
            ParameterValue::Map(map) => {
                let mut rhai_map = Map::new();
                for (key, value) in map {
                    rhai_map.insert(key.clone().into(), value.to_dynamic());
                }
                rhai_map.into()
            }
        }
    }

    /// Cria um valor de parâmetro a partir de um valor dinâmico do Rhai
    pub fn from_dynamic(value: &Dynamic) -> Result<Self, String> {
        if value.is_int() {
            Ok(ParameterValue::Integer(value.as_int().unwrap()))
        } else if value.is_float() {
            Ok(ParameterValue::Float(value.as_float().unwrap()))
        } else if value.is_bool() {
            Ok(ParameterValue::Boolean(value.as_bool().unwrap()))
        } else if value.is_string() {
            Ok(ParameterValue::String(value.as_string().unwrap().to_string()))
        } else if value.is_array() {
            let rhai_array = value.clone().into_array().unwrap();
            let mut arr = Vec::new();
            for item in rhai_array {
                arr.push(ParameterValue::from_dynamic(&item)?);
            }
            Ok(ParameterValue::Array(arr))
        } else if value.is_map() {
            let rhai_map = value.clone().into_map().unwrap();
            let mut map = HashMap::new();
            for (key, value) in rhai_map {
                let key_str = key.to_string();
                map.insert(key_str, ParameterValue::from_dynamic(&value)?);
            }
            Ok(ParameterValue::Map(map))
        } else {
            Err(format!("Tipo de valor não suportado: {}", value.type_name()))
        }
    }
}

impl fmt::Display for ParameterValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParameterValue::Integer(i) => write!(f, "{}", i),
            ParameterValue::Float(fl) => write!(f, "{}", fl),
            ParameterValue::Boolean(b) => write!(f, "{}", b),
            ParameterValue::String(s) => write!(f, "\"{}\"", s),
            ParameterValue::Array(arr) => {
                write!(f, "[")?;
                for (i, item) in arr.iter().enumerate() {
                    if i > 0 {
                        write!(f, ", ")?;
                    }
                    write!(f, "{}", item)?;
                }
                write!(f, "]")
            }
            ParameterValue::Map(map) => {
                write!(f, "{{")?;
                for (i, (key, value)) in map.iter().enumerate() {
                    if i > 0 {
                        write!(f, ", ")?;
                    }
                    write!(f, "\"{}\": {}", key, value)?;
                }
                write!(f, "}}")
            }
        }
    }
}

/// Estrutura que representa o resultado da avaliação de uma fórmula
#[derive(Debug, Clone)]
pub struct FormulaResult {
    /// Valor resultante da avaliação
    pub value: ParameterValue,
    /// Tempo de execução em microssegundos
    pub execution_time_us: u128,
    /// Mensagens de log geradas durante a avaliação
    pub logs: Vec<String>,
}

/// Estrutura que representa o motor de fórmulas
pub struct FormulaEngine {
    /// Motor Rhai para avaliação de fórmulas
    engine: Engine,
    /// Biblioteca de fórmulas pré-definidas
    formulas: HashMap<String, Formula>,
    /// Buffer de logs para capturar saídas durante a avaliação
    log_buffer: Arc<Mutex<Vec<String>>>,
}

impl FormulaEngine {
    /// Cria uma nova instância do motor de fórmulas
    pub fn new() -> Self {
        let mut engine = Engine::new();
        
        // Configurar o motor Rhai
        engine.set_max_expr_depths(64, 64);
        engine.set_max_operations(100000);
        engine.set_optimization_level(rhai::OptimizationLevel::Full);
        
        // Criar buffer de logs
        let log_buffer = Arc::new(Mutex::new(Vec::new()));
        let log_buffer_clone = log_buffer.clone();
        
        // Registrar função de log
        engine.register_fn("print", move |text: &str| {
            if let Ok(mut buffer) = log_buffer_clone.lock() {
                buffer.push(text.to_string());
            }
        });
        
        // Registrar funções matemáticas básicas
        engine.register_fn("sin", |x: f64| x.sin());
        engine.register_fn("cos", |x: f64| x.cos());
        engine.register_fn("tan", |x: f64| x.tan());
        engine.register_fn("asin", |x: f64| x.asin());
        engine.register_fn("acos", |x: f64| x.acos());
        engine.register_fn("atan", |x: f64| x.atan());
        engine.register_fn("atan2", |y: f64, x: f64| y.atan2(x));
        engine.register_fn("sinh", |x: f64| x.sinh());
        engine.register_fn("cosh", |x: f64| x.cosh());
        engine.register_fn("tanh", |x: f64| x.tanh());
        engine.register_fn("exp", |x: f64| x.exp());
        engine.register_fn("log", |x: f64| x.ln());
        engine.register_fn("log10", |x: f64| x.log10());
        engine.register_fn("sqrt", |x: f64| x.sqrt());
        engine.register_fn("pow", |x: f64, y: f64| x.powf(y));
        engine.register_fn("abs", |x: f64| x.abs());
        engine.register_fn("floor", |x: f64| x.floor());
        engine.register_fn("ceil", |x: f64| x.ceil());
        engine.register_fn("round", |x: f64| x.round());
        
        // Registrar constantes físicas
        let mut scope = Scope::new();
        scope.push_constant("PI", std::f64::consts::PI);
        scope.push_constant("E", std::f64::consts::E);
        scope.push_constant("STEFAN_BOLTZMANN", 5.67e-8); // W/(m²·K⁴)
        scope.push_constant("GRAVITY", 9.81); // m/s²
        
        // Criar instância do motor de fórmulas
        let mut formula_engine = Self {
            engine,
            formulas: HashMap::new(),
            log_buffer,
        };
        
        // Adicionar fórmulas pré-definidas
        formula_engine.add_predefined_formulas();
        
        formula_engine
    }
    
    /// Adiciona fórmulas pré-definidas ao motor
    fn add_predefined_formulas(&mut self) {
        // Fórmula para condutividade térmica dependente da temperatura
        let thermal_conductivity_formula = Formula {
            name: "Condutividade Térmica Dependente da Temperatura".to_string(),
            description: "Calcula a condutividade térmica como função da temperatura usando um polinômio de segundo grau".to_string(),
            source: r#"
                // Polinômio de segundo grau: k0 + k1*T + k2*T^2
                let t_norm = (temperature - t_ref) / 100.0;
                return k0 + k1 * t_norm + k2 * t_norm * t_norm;
            "#.to_string(),
            ast: None,
            parameters: vec![
                FormulaParameter {
                    name: "temperature".to_string(),
                    description: "Temperatura atual".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(25.0),
                    unit: "°C".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "t_ref".to_string(),
                    description: "Temperatura de referência".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(25.0),
                    unit: "°C".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "k0".to_string(),
                    description: "Coeficiente constante".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(45.0),
                    unit: "W/(m·K)".to_string(),
                    min_value: Some(ParameterValue::Float(0.0)),
                    max_value: None,
                },
                FormulaParameter {
                    name: "k1".to_string(),
                    description: "Coeficiente linear".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(-0.05),
                    unit: "W/(m·K)/100°C".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "k2".to_string(),
                    description: "Coeficiente quadrático".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "W/(m·K)/(100°C)²".to_string(),
                    min_value: None,
                    max_value: None,
                },
            ],
            category: FormulaCategory::MaterialProperty,
            result_unit: "W/(m·K)".to_string(),
        };
        
        // Fórmula para fonte de calor de plasma
        let plasma_heat_source_formula = Formula {
            name: "Fonte de Calor de Plasma".to_string(),
            description: "Calcula a fonte de calor de uma tocha de plasma usando um modelo gaussiano".to_string(),
            source: r#"
                // Distância do ponto à tocha
                let dx = x - torch_x;
                let dy = y - torch_y;
                let dz = z - torch_z;
                let distance_squared = dx*dx + dy*dy + dz*dz;
                
                // Modelo gaussiano
                let gaussian = exp(-distance_squared / (2.0 * radius * radius));
                
                // Fonte de calor (W/m³)
                return power * gaussian / (radius * radius * radius * pow(2.0 * PI, 1.5));
            "#.to_string(),
            ast: None,
            parameters: vec![
                FormulaParameter {
                    name: "x".to_string(),
                    description: "Coordenada x do ponto".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "y".to_string(),
                    description: "Coordenada y do ponto".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "z".to_string(),
                    description: "Coordenada z do ponto".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "torch_x".to_string(),
                    description: "Coordenada x da tocha".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "torch_y".to_string(),
                    description: "Coordenada y da tocha".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "torch_z".to_string(),
                    description: "Coordenada z da tocha".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.0),
                    unit: "m".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "power".to_string(),
                    description: "Potência da tocha".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(1000.0),
                    unit: "W".to_string(),
                    min_value: Some(ParameterValue::Float(0.0)),
                    max_value: None,
                },
                FormulaParameter {
                    name: "radius".to_string(),
                    description: "Raio efetivo da tocha".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(0.01),
                    unit: "m".to_string(),
                    min_value: Some(ParameterValue::Float(0.001)),
                    max_value: None,
                },
            ],
            category: FormulaCategory::HeatSource,
            result_unit: "W/m³".to_string(),
        };
        
        // Fórmula para coeficiente de convecção
        let convection_coefficient_formula = Formula {
            name: "Coeficiente de Convecção".to_string(),
            description: "Calcula o coeficiente de convecção usando a correlação de Nusselt para convecção natural em uma parede vertical".to_string(),
            source: r#"
                // Propriedades do ar a temperatura média
                let t_film = (t_surface + t_ambient) / 2.0;
                
                // Coeficientes para ar (aproximados)
                let beta = 1.0 / (t_film + 273.15); // Coeficiente de expansão térmica (1/K)
                let nu = 1.5e-5 * pow(t_film / 25.0, 0.7); // Viscosidade cinemática (m²/s)
                let alpha = 2.2e-5 * pow(t_film / 25.0, 0.7); // Difusividade térmica (m²/s)
                let k_air = 0.026 * pow(t_film / 25.0, 0.3); // Condutividade térmica do ar (W/(m·K))
                
                // Número de Grashof
                let delta_t = abs(t_surface - t_ambient);
                let gr = GRAVITY * beta * delta_t * pow(height, 3) / pow(nu, 2);
                
                // Número de Prandtl
                let pr = nu / alpha;
                
                // Número de Rayleigh
                let ra = gr * pr;
                
                // Número de Nusselt
                let nu_l;
                if (ra < 1.0e9) {
                    // Regime laminar
                    nu_l = 0.59 * pow(ra, 0.25);
                } else {
                    // Regime turbulento
                    nu_l = 0.1 * pow(ra, 1.0/3.0);
                }
                
                // Coeficiente de convecção
                return nu_l * k_air / height;
            "#.to_string(),
            ast: None,
            parameters: vec![
                FormulaParameter {
                    name: "t_surface".to_string(),
                    description: "Temperatura da superfície".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(100.0),
                    unit: "°C".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "t_ambient".to_string(),
                    description: "Temperatura ambiente".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(25.0),
                    unit: "°C".to_string(),
                    min_value: None,
                    max_value: None,
                },
                FormulaParameter {
                    name: "height".to_string(),
                    description: "Altura da superfície".to_string(),
                    param_type: ParameterType::Float,
                    default_value: ParameterValue::Float(1.0),
                    unit: "m".to_string(),
                    min_value: Some(ParameterValue::Float(0.01)),
                    max_value: None,
                },
            ],
            category: FormulaCategory::BoundaryCondition,
            result_unit: "W/(m²·K)".to_string(),
        };
        
        // Adicionar fórmulas ao motor
        self.add_formula("thermal_conductivity", thermal_conductivity_formula);
        self.add_formula("plasma_heat_source", plasma_heat_source_formula);
        self.add_formula("convection_coefficient", convection_coefficient_formula);
    }
    
    /// Adiciona uma fórmula ao motor
    pub fn add_formula(&mut self, id: &str, mut formula: Formula) -> Result<(), String> {
        // Compilar a fórmula
        match self.engine.compile(&formula.source) {
            Ok(ast) => {
                formula.ast = Some(ast);
                self.formulas.insert(id.to_string(), formula);
                Ok(())
            }
            Err(err) => Err(format!("Erro ao compilar fórmula: {}", err)),
        }
    }
    
    /// Remove uma fórmula do motor
    pub fn remove_formula(&mut self, id: &str) -> bool {
        self.formulas.remove(id).is_some()
    }
    
    /// Obtém uma fórmula pelo ID
    pub fn get_formula(&self, id: &str) -> Option<&Formula> {
        self.formulas.get(id)
    }
    
    /// Obtém uma cópia de uma fórmula pelo ID
    pub fn get_formula_clone(&self, id: &str) -> Option<Formula> {
        self.formulas.get(id).cloned()
    }
    
    /// Obtém todas as fórmulas
    pub fn get_all_formulas(&self) -> Vec<(String, Formula)> {
        self.formulas.iter()
            .map(|(id, formula)| (id.clone(), formula.clone()))
            .collect()
    }
    
    /// Obtém todas as fórmulas de uma categoria
    pub fn get_formulas_by_category(&self, category: FormulaCategory) -> Vec<(String, Formula)> {
        self.formulas.iter()
            .filter(|(_, formula)| formula.category == category)
            .map(|(id, formula)| (id.clone(), formula.clone()))
            .collect()
    }
    
    /// Avalia uma fórmula com os parâmetros fornecidos
    pub fn evaluate_formula(&self, id: &str, parameters: &HashMap<String, ParameterValue>) -> Result<FormulaResult, String> {
        // Obter a fórmula
        let formula = self.get_formula(id)
            .ok_or_else(|| format!("Fórmula não encontrada: {}", id))?;
        
        // Verificar se a fórmula foi compilada
        let ast = formula.ast.as_ref()
            .ok_or_else(|| format!("Fórmula não compilada: {}", id))?;
        
        // Criar escopo com os parâmetros
        let mut scope = Scope::new();
        
        // Adicionar parâmetros ao escopo
        for param in &formula.parameters {
            let value = parameters.get(&param.name)
                .unwrap_or(&param.default_value);
            
            scope.push(param.name.clone(), value.to_dynamic());
        }
        
        // Limpar buffer de logs
        if let Ok(mut buffer) = self.log_buffer.lock() {
            buffer.clear();
        }
        
        // Medir tempo de execução
        let start_time = std::time::Instant::now();
        
        // Avaliar a fórmula
        let result = match self.engine.eval_ast_with_scope::<Dynamic>(&mut scope, ast) {
            Ok(value) => {
                let param_value = ParameterValue::from_dynamic(&value)?;
                let execution_time_us = start_time.elapsed().as_micros();
                
                // Obter logs
                let logs = if let Ok(buffer) = self.log_buffer.lock() {
                    buffer.clone()
                } else {
                    Vec::new()
                };
                
                FormulaResult {
                    value: param_value,
                    execution_time_us,
                    logs,
                }
            }
            Err(err) => {
                return Err(format!("Erro ao avaliar fórmula: {}", err));
            }
        };
        
        Ok(result)
    }
    
    /// Valida uma fórmula com os parâmetros fornecidos
    pub fn validate_formula(&self, source: &str, parameters: &[FormulaParameter]) -> Result<(), String> {
        // Compilar a fórmula
        let ast = match self.engine.compile(source) {
            Ok(ast) => ast,
            Err(err) => {
                return Err(format!("Erro de compilação: {}", err));
            }
        };
        
        // Criar escopo com os parâmetros
        let mut scope = Scope::new();
        
        // Adicionar parâmetros ao escopo
        for param in parameters {
            scope.push(param.name.clone(), param.default_value.to_dynamic());
        }
        
        // Tentar avaliar a fórmula
        match self.engine.eval_ast_with_scope::<Dynamic>(&mut scope, &ast) {
            Ok(_) => Ok(()),
            Err(err) => Err(format!("Erro de avaliação: {}", err)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_formula_engine_creation() {
        let engine = FormulaEngine::new();
        
        // Verificar se as fórmulas pré-definidas foram adicionadas
        assert!(engine.get_formula("thermal_conductivity").is_some());
        assert!(engine.get_formula("plasma_heat_source").is_some());
        assert!(engine.get_formula("convection_coefficient").is_some());
    }
    
    #[test]
    fn test_formula_evaluation() {
        let engine = FormulaEngine::new();
        
        // Parâmetros para a fórmula de condutividade térmica
        let mut params = HashMap::new();
        params.insert("temperature".to_string(), ParameterValue::Float(100.0));
        params.insert("t_ref".to_string(), ParameterValue::Float(25.0));
        params.insert("k0".to_string(), ParameterValue::Float(45.0));
        params.insert("k1".to_string(), ParameterValue::Float(-0.05));
        params.insert("k2".to_string(), ParameterValue::Float(0.0));
        
        // Avaliar a fórmula
        let result = engine.evaluate_formula("thermal_conductivity", &params).unwrap();
        
        // Verificar o resultado
        match result.value {
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
    fn test_formula_validation() {
        let engine = FormulaEngine::new();
        
        // Fórmula válida
        let valid_source = "return a + b * c;";
        let parameters = vec![
            FormulaParameter {
                name: "a".to_string(),
                description: "Parâmetro A".to_string(),
                param_type: ParameterType::Float,
                default_value: ParameterValue::Float(1.0),
                unit: "".to_string(),
                min_value: None,
                max_value: None,
            },
            FormulaParameter {
                name: "b".to_string(),
                description: "Parâmetro B".to_string(),
                param_type: ParameterType::Float,
                default_value: ParameterValue::Float(2.0),
                unit: "".to_string(),
                min_value: None,
                max_value: None,
            },
            FormulaParameter {
                name: "c".to_string(),
                description: "Parâmetro C".to_string(),
                param_type: ParameterType::Float,
                default_value: ParameterValue::Float(3.0),
                unit: "".to_string(),
                min_value: None,
                max_value: None,
            },
        ];
        
        // Validar fórmula válida
        assert!(engine.validate_formula(valid_source, &parameters).is_ok());
        
        // Fórmula inválida (erro de sintaxe)
        let invalid_syntax = "return a + b * ;";
        assert!(engine.validate_formula(invalid_syntax, &parameters).is_err());
        
        // Fórmula inválida (parâmetro não definido)
        let invalid_params = "return a + b * c + d;";
        assert!(engine.validate_formula(invalid_params, &parameters).is_err());
    }
    
    #[test]
    fn test_parameter_value_conversion() {
        // Testar conversão de inteiro
        let int_value = ParameterValue::Integer(42);
        let dynamic_int = int_value.to_dynamic();
        assert!(dynamic_int.is_int());
        assert_eq!(dynamic_int.as_int().unwrap(), 42);
        
        let converted_int = ParameterValue::from_dynamic(&dynamic_int).unwrap();
        match converted_int {
            ParameterValue::Integer(i) => assert_eq!(i, 42),
            _ => panic!("Tipo incorreto após conversão"),
        }
        
        // Testar conversão de float
        let float_value = ParameterValue::Float(3.14);
        let dynamic_float = float_value.to_dynamic();
        assert!(dynamic_float.is_float());
        assert!((dynamic_float.as_float().unwrap() - 3.14).abs() < 1e-6);
        
        let converted_float = ParameterValue::from_dynamic(&dynamic_float).unwrap();
        match converted_float {
            ParameterValue::Float(f) => assert!((f - 3.14).abs() < 1e-6),
            _ => panic!("Tipo incorreto após conversão"),
        }
        
        // Testar conversão de string
        let string_value = ParameterValue::String("hello".to_string());
        let dynamic_string = string_value.to_dynamic();
        assert!(dynamic_string.is_string());
        assert_eq!(dynamic_string.as_string().unwrap(), "hello");
        
        let converted_string = ParameterValue::from_dynamic(&dynamic_string).unwrap();
        match converted_string {
            ParameterValue::String(s) => assert_eq!(s, "hello"),
            _ => panic!("Tipo incorreto após conversão"),
        }
    }
}
