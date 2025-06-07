# Documentação Técnica do Simulador de Fornalha de Plasma

## Visão Geral da Arquitetura

O Simulador de Fornalha de Plasma é uma aplicação desktop multiplataforma projetada para simular a transferência de calor em fornalhas de plasma. A arquitetura do sistema segue uma abordagem híbrida em camadas:

1. **Frontend (Flutter)**: Interface gráfica multiplataforma que permite aos usuários configurar simulações, visualizar resultados e interagir com o sistema.

2. **Backend (Rust)**: Núcleo de simulação de alto desempenho responsável pelos cálculos numéricos intensivos de transferência de calor.

3. **Integração (FFI)**: Camada de comunicação entre o frontend e o backend usando Dart FFI (Foreign Function Interface).

## Estrutura do Projeto

```
plasma_furnace_simulator/
├── backend/                  # Código Rust para simulação numérica
│   ├── src/
│   │   ├── simulation/       # Núcleo de simulação
│   │   │   ├── mesh.rs       # Malha de discretização cilíndrica
│   │   │   ├── physics.rs    # Modelos físicos
│   │   │   ├── solver.rs     # Solucionador numérico
│   │   │   ├── state.rs      # Estado da simulação
│   │   │   ├── materials.rs  # Propriedades de materiais
│   │   │   ├── metrics.rs    # Cálculo de métricas
│   │   │   ├── validation.rs # Validação de modelos
│   │   │   ├── parametric.rs # Estudos paramétricos
│   │   │   └── mod.rs        # Módulo de simulação
│   │   ├── formula/          # Motor de fórmulas
│   │   │   ├── engine.rs     # Motor de interpretação
│   │   │   ├── integration.rs # Integração com simulação
│   │   │   └── mod.rs        # Módulo de fórmulas
│   │   ├── ffi/              # Interface FFI
│   │   │   ├── bindings.rs   # Definições de funções FFI
│   │   │   ├── conversions.rs # Conversão de tipos
│   │   │   └── mod.rs        # Módulo FFI
│   │   ├── lib.rs            # Ponto de entrada da biblioteca
│   │   └── tests.rs          # Testes unitários
│   └── Cargo.toml            # Configuração do projeto Rust
│
└── frontend/                 # Aplicação Flutter
    ├── lib/
    │   ├── app/              # Configuração da aplicação
    │   ├── models/           # Modelos de dados
    │   ├── state/            # Gerenciamento de estado
    │   ├── services/         # Serviços e ponte FFI
    │   ├── screens/          # Telas da aplicação
    │   ├── widgets/          # Componentes de UI
    │   │   ├── inputs/       # Widgets de entrada
    │   │   ├── visualization/ # Widgets de visualização
    │   │   ├── parametric/   # Widgets para estudos paramétricos
    │   │   └── common/       # Widgets comuns
    │   ├── utils/            # Utilitários
    │   └── main.dart         # Ponto de entrada da aplicação
    ├── test/                 # Testes do frontend
    └── pubspec.yaml          # Configuração do projeto Flutter
```

## Backend (Rust)

### Módulo de Simulação

#### Malha de Discretização (`mesh.rs`)

A malha de discretização cilíndrica é a base espacial para a simulação. Ela divide o espaço da fornalha em células discretas onde as equações de transferência de calor são resolvidas.

```rust
pub struct CylindricalMesh {
    radial_cells: usize,
    angular_cells: usize,
    axial_cells: usize,
    cell_size: f64,
    radius: f64,
}
```

- `radial_cells`: Número de células na direção radial
- `angular_cells`: Número de células na direção angular
- `axial_cells`: Número de células na direção axial
- `cell_size`: Tamanho da célula (em metros)
- `radius`: Raio da fornalha (em metros)

#### Modelos Físicos (`physics.rs`)

Este módulo implementa os modelos físicos para transferência de calor, incluindo condução, convecção e radiação.

```rust
pub struct PlasmaPhysics {
    torch_power: f64,
    torch_efficiency: f64,
    thermal_conductivity: f64,
    specific_heat: f64,
    density: f64,
    emissivity: f64,
}
```

- `torch_power`: Potência da tocha de plasma (em kW)
- `torch_efficiency`: Eficiência da tocha (0-1)
- `thermal_conductivity`: Condutividade térmica do material (W/(m·K))
- `specific_heat`: Calor específico do material (J/(kg·K))
- `density`: Densidade do material (kg/m³)
- `emissivity`: Emissividade da superfície (0-1)

#### Solucionador Numérico (`solver.rs`)

O solucionador implementa métodos numéricos para resolver a equação de transferência de calor na malha discretizada.

```rust
pub struct Solver {
    time_step: f64,
    max_iterations: usize,
    convergence_tolerance: f64,
}
```

- `time_step`: Passo de tempo para a simulação (em segundos)
- `max_iterations`: Número máximo de iterações por passo de tempo
- `convergence_tolerance`: Tolerância para convergência

Principais métodos:
- `solve_step`: Avança a simulação um passo de tempo
- `solve_steps`: Avança a simulação múltiplos passos de tempo
- `solve_until`: Simula até atingir um tempo específico

#### Estado da Simulação (`state.rs`)

Mantém o estado atual da simulação, incluindo a distribuição de temperatura.

```rust
pub struct SimulationState {
    mesh: CylindricalMesh,
    temperature: Array3<f64>,
    current_time: f64,
}
```

- `mesh`: Referência à malha de discretização
- `temperature`: Array 3D com temperaturas em cada célula
- `current_time`: Tempo atual da simulação (em segundos)

### Módulo de Fórmulas

#### Motor de Interpretação (`engine.rs`)

Implementa um motor de interpretação de fórmulas usando a biblioteca Rhai.

```rust
pub struct FormulaEngine {
    engine: Engine,
    scope: Scope,
}
```

- `engine`: Motor de script Rhai
- `scope`: Escopo com variáveis registradas

Principais métodos:
- `register_variable`: Registra uma variável no escopo
- `evaluate`: Avalia uma expressão e retorna o resultado

### Interface FFI

#### Bindings (`bindings.rs`)

Define as funções exportadas para o frontend Flutter.

```rust
#[no_mangle]
pub extern "C" fn create_simulation(params: *const SimulationParameters) -> *mut SimulationHandle;

#[no_mangle]
pub extern "C" fn run_simulation_step(handle: *mut SimulationHandle) -> bool;

#[no_mangle]
pub extern "C" fn get_simulation_results(handle: *mut SimulationHandle) -> *mut SimulationResults;
```

## Frontend (Flutter)

### Modelos de Dados

#### Parâmetros de Simulação (`simulation_parameters.dart`)

```dart
class SimulationParameters {
  final int meshRadialCells;
  final int meshAngularCells;
  final int meshAxialCells;
  final double meshCellSize;
  final double furnaceRadius;
  final double initialTemperature;
  final double ambientTemperature;
  final double simulationTimeStep;
  final double simulationDuration;
  final double torchPower;
  final double torchEfficiency;
  final double materialThermalConductivity;
  final double materialSpecificHeat;
  final double materialDensity;
  final double materialEmissivity;
  
  // Construtor e métodos de serialização
}
```

#### Resultados da Simulação (`simulation_results.dart`)

```dart
class SimulationResults {
  final List<double> temperatureData;
  final int meshRadialCells;
  final int meshAngularCells;
  final int meshAxialCells;
  final double timeStep;
  final double currentTime;
  final double maxTemperature;
  final double minTemperature;
  final double avgTemperature;
  
  // Construtor e métodos de serialização
  
  double getTemperature(int r, int theta, int z) {
    // Calcula o índice no array linear
    final index = r + theta * meshRadialCells + z * meshRadialCells * meshAngularCells;
    return temperatureData[index];
  }
}
```

### Serviços

#### Ponte FFI (`ffi_bridge.dart`)

```dart
class FFIBridge {
  // Carrega a biblioteca dinâmica
  final DynamicLibrary _lib = DynamicLibrary.open('libplasma_simulation.so');
  
  // Define as funções FFI
  late final _createSimulation = _lib.lookupFunction<
    Pointer<SimulationHandle> Function(Pointer<SimulationParameters>),
    Pointer<SimulationHandle> Function(Pointer<SimulationParameters>)
  >('create_simulation');
  
  // Métodos para chamar as funções FFI
  Future<SimulationHandle> createSimulation(SimulationParameters params) async {
    // Implementação
  }
  
  Future<bool> runSimulationStep(SimulationHandle handle) async {
    // Implementação
  }
  
  Future<SimulationResults> getSimulationResults(SimulationHandle handle) async {
    // Implementação
  }
}
```

### Gerenciamento de Estado

#### Estado da Simulação (`simulation_state.dart`)

```dart
class SimulationState extends StateNotifier<SimulationStateModel> {
  final FFIBridge _ffiBridge;
  
  SimulationState(this._ffiBridge) : super(SimulationStateModel.initial());
  
  Future<void> createSimulation(SimulationParameters params) async {
    // Implementação
  }
  
  Future<void> runSimulation() async {
    // Implementação
  }
  
  Future<void> pauseSimulation() async {
    // Implementação
  }
  
  Future<void> resetSimulation() async {
    // Implementação
  }
}
```

### Telas

#### Tela de Configuração (`simulation_setup.dart`)

```dart
class SimulationSetupScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Implementação da UI para configuração de simulação
  }
}
```

#### Tela de Simulação (`simulation_screen.dart`)

```dart
class SimulationScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Implementação da UI para visualização da simulação
  }
}
```

## Fluxo de Dados

1. O usuário configura os parâmetros da simulação na interface Flutter.
2. Os parâmetros são convertidos para o formato FFI e enviados para o backend Rust.
3. O backend cria uma instância de simulação com os parâmetros fornecidos.
4. O frontend solicita a execução de passos de simulação.
5. O backend executa os cálculos numéricos e atualiza o estado da simulação.
6. Os resultados são convertidos para o formato FFI e retornados ao frontend.
7. O frontend atualiza a visualização com os novos resultados.

## Considerações de Desempenho

### Otimizações no Backend

- Uso de arrays contíguos (`ndarray`) para armazenamento eficiente de dados
- Paralelização de cálculos usando `rayon`
- Algoritmos numéricos otimizados para transferência de calor
- Cache de resultados intermediários para evitar recálculos

### Otimizações no Frontend

- Renderização eficiente usando `flutter_gl` para visualizações 3D
- Uso de `compute` para operações pesadas em threads separadas
- Carregamento sob demanda de dados de simulação
- Uso de `RepaintBoundary` para limitar a área de redesenho

## Extensibilidade

### Sistema de Plugins

O sistema suporta plugins para estender suas funcionalidades:

```rust
pub trait SimulationPlugin {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn initialize(&mut self, state: &mut SimulationState);
    fn pre_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn post_step(&mut self, state: &mut SimulationState, physics: &PlasmaPhysics);
    fn finalize(&mut self, state: &mut SimulationState);
}
```

### Editor de Fórmulas

O editor de fórmulas permite personalizar as equações físicas:

```dart
class Formula {
  final String id;
  final String name;
  final String description;
  final String category;
  final String expression;
  final Map<String, FormulaParameter> parameters;
  final List<String> variables;
  final bool isBuiltIn;
  final Map<String, String> metadata;
  
  // Construtor e métodos
}
```

## Validação e Testes

### Testes Unitários

- Testes para componentes individuais do backend e frontend
- Verificação de corretude matemática
- Testes de limites e casos extremos

### Testes de Integração

- Verificação da comunicação entre frontend e backend
- Testes de fluxo completo de simulação

### Validação Científica

- Comparação com soluções analíticas conhecidas
- Verificação de conservação de energia
- Comparação com dados experimentais (quando disponíveis)
