#[cfg(test)]
mod tests {
    use super::*;
    use crate::simulation::mesh::CylindricalMesh;
    use crate::simulation::physics::PlasmaPhysics;
    use crate::simulation::solver::Solver;
    use crate::simulation::state::SimulationState;
    use crate::simulation::parametric::{
        ParametricStudyManager, ParametricStudyConfig, ParametricParameter,
        ScaleType, OptimizationGoal
    };
    use std::collections::HashMap;

    // Configuração básica para testes
    fn setup_test_environment() -> (CylindricalMesh, Solver, PlasmaPhysics) {
        let mesh = CylindricalMesh::new(10, 8, 10, 0.1, 1.0);
        let solver = Solver::new(0.1, 100, 1e-6);
        let physics = PlasmaPhysics::new();
        
        (mesh, solver, physics)
    }

    #[test]
    fn test_cylindrical_mesh_creation() {
        let mesh = CylindricalMesh::new(20, 16, 20, 0.05, 1.5);
        
        assert_eq!(mesh.get_radial_cells(), 20);
        assert_eq!(mesh.get_angular_cells(), 16);
        assert_eq!(mesh.get_axial_cells(), 20);
        assert_eq!(mesh.get_cell_size(), 0.05);
        assert_eq!(mesh.get_radius(), 1.5);
        
        // Verificar dimensões totais
        assert_eq!(mesh.get_total_cells(), 20 * 16 * 20);
    }

    #[test]
    fn test_solver_basic_simulation() {
        let (mesh, mut solver, physics) = setup_test_environment();
        let mut state = SimulationState::new(mesh);
        
        // Definir condições iniciais
        state.set_initial_temperature(300.0);
        
        // Executar algumas iterações
        let result = solver.solve_steps(&mut state, &physics, 10);
        
        // Verificar se a simulação foi executada sem erros
        assert!(result.is_ok());
        
        // Verificar se a temperatura máxima é maior que a inicial
        // (devido à fonte de calor do plasma)
        let max_temp = state.get_max_temperature();
        assert!(max_temp > 300.0);
    }

    #[test]
    fn test_physics_heat_source() {
        let (mesh, _, mut physics) = setup_test_environment();
        
        // Configurar fonte de calor
        physics.set_torch_power(100.0);
        physics.set_torch_efficiency(0.8);
        
        // Verificar potência efetiva
        let effective_power = physics.get_effective_power();
        assert_eq!(effective_power, 80.0); // 100.0 * 0.8
        
        // Verificar distribuição de calor em um ponto
        let heat_flux = physics.calculate_heat_source(0.1, 0.0, 0.5);
        assert!(heat_flux > 0.0);
    }

    #[test]
    fn test_parametric_study_configuration() {
        // Criar parâmetros para o estudo
        let parameters = vec![
            ParametricParameter {
                name: "torch_power".to_string(),
                description: "Potência da tocha de plasma".to_string(),
                unit: "kW".to_string(),
                min_value: 50.0,
                max_value: 150.0,
                num_points: 3,
                scale_type: ScaleType::Linear,
                specific_values: None,
            },
            ParametricParameter {
                name: "thermal_conductivity".to_string(),
                description: "Condutividade térmica do material".to_string(),
                unit: "W/(m·K)".to_string(),
                min_value: 20.0,
                max_value: 80.0,
                num_points: 2,
                scale_type: ScaleType::Linear,
                specific_values: None,
            },
        ];
        
        // Criar configuração do estudo
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
        
        // Verificar configuração
        assert_eq!(config.name, "Teste de Estudo Paramétrico");
        assert_eq!(config.parameters.len(), 2);
        assert_eq!(config.target_metric, "max_temperature");
        assert_eq!(config.optimization_goal, OptimizationGoal::Maximize);
        
        // Criar gerenciador de estudos paramétricos
        let (mesh, solver, physics) = setup_test_environment();
        let manager = ParametricStudyManager::new(config, solver, physics, mesh);
        
        // Gerar combinações de parâmetros
        let combinations = manager.generate_parameter_combinations().unwrap();
        
        // Verificar número de combinações (3 valores para potência * 2 valores para condutividade)
        assert_eq!(combinations.len(), 6);
    }

    #[test]
    fn test_material_properties() {
        let (_, _, mut physics) = setup_test_environment();
        
        // Configurar propriedades do material
        physics.set_thermal_conductivity(50.0);
        physics.set_specific_heat(1000.0);
        physics.set_density(5000.0);
        physics.set_emissivity(0.8);
        
        // Verificar propriedades
        assert_eq!(physics.get_thermal_conductivity(), 50.0);
        assert_eq!(physics.get_specific_heat(), 1000.0);
        assert_eq!(physics.get_density(), 5000.0);
        assert_eq!(physics.get_emissivity(), 0.8);
        
        // Verificar difusividade térmica
        let expected_diffusivity = 50.0 / (5000.0 * 1000.0);
        assert!((physics.get_thermal_diffusivity() - expected_diffusivity).abs() < 1e-10);
    }

    #[test]
    fn test_simulation_state() {
        let mesh = CylindricalMesh::new(5, 4, 5, 0.1, 0.5);
        let mut state = SimulationState::new(mesh);
        
        // Definir temperatura inicial
        state.set_initial_temperature(300.0);
        
        // Verificar temperatura em alguns pontos
        for r in 0..5 {
            for theta in 0..4 {
                for z in 0..5 {
                    assert_eq!(state.get_temperature(r, theta, z), 300.0);
                }
            }
        }
        
        // Modificar temperatura em um ponto
        state.set_temperature(2, 1, 3, 500.0);
        assert_eq!(state.get_temperature(2, 1, 3), 500.0);
        
        // Verificar temperaturas mínima e máxima
        assert_eq!(state.get_min_temperature(), 300.0);
        assert_eq!(state.get_max_temperature(), 500.0);
    }

    #[test]
    fn test_formula_evaluation() {
        use crate::formula::engine::FormulaEngine;
        
        // Criar motor de fórmulas
        let mut engine = FormulaEngine::new();
        
        // Registrar variáveis
        engine.register_variable("x", 2.0);
        engine.register_variable("y", 3.0);
        
        // Avaliar expressões simples
        let result1 = engine.evaluate("x + y").unwrap();
        assert_eq!(result1, 5.0);
        
        let result2 = engine.evaluate("x * y").unwrap();
        assert_eq!(result2, 6.0);
        
        let result3 = engine.evaluate("(x + y) * 2").unwrap();
        assert_eq!(result3, 10.0);
        
        // Verificar erro em expressão inválida
        let result4 = engine.evaluate("x + z");
        assert!(result4.is_err());
    }

    #[test]
    fn test_metrics_calculation() {
        let (mesh, mut solver, physics) = setup_test_environment();
        let mut state = SimulationState::new(mesh);
        
        // Definir condições iniciais
        state.set_initial_temperature(300.0);
        
        // Executar algumas iterações
        let _ = solver.solve_steps(&mut state, &physics, 10);
        
        // Calcular métricas
        use crate::simulation::metrics::MetricsAnalyzer;
        let metrics_analyzer = MetricsAnalyzer::new(&state);
        let metrics = metrics_analyzer.calculate_metrics();
        
        // Verificar métricas básicas
        assert!(metrics.max_temperature > 300.0);
        assert!(metrics.min_temperature >= 300.0);
        assert!(metrics.avg_temperature > 300.0);
        assert!(metrics.max_gradient >= 0.0);
    }

    #[test]
    fn test_validation_metrics() {
        use crate::simulation::validation::ValidationAnalyzer;
        
        // Criar dados de referência e simulados
        let reference_values = vec![100.0, 200.0, 300.0, 400.0, 500.0];
        let simulated_values = vec![110.0, 190.0, 310.0, 390.0, 510.0];
        
        // Calcular métricas de validação
        let analyzer = ValidationAnalyzer::new();
        let metrics = analyzer.calculate_error_metrics(&reference_values, &simulated_values).unwrap();
        
        // Verificar métricas de erro
        assert!(metrics.mean_absolute_error > 0.0);
        assert!(metrics.root_mean_squared_error > 0.0);
        assert!(metrics.mean_absolute_percentage_error > 0.0);
        assert!(metrics.r_squared <= 1.0);
        assert!(metrics.r_squared >= 0.0);
    }
}
