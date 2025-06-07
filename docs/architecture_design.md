# Arquitetura do Sistema - Simulador de Fornalha de Plasma

## Visão Geral da Arquitetura

O Simulador de Fornalha de Plasma será desenvolvido seguindo uma arquitetura híbrida em camadas, com um frontend em Flutter Desktop e um backend em Rust, comunicando-se através de Dart FFI (Foreign Function Interface). Esta arquitetura foi escolhida para combinar a facilidade de desenvolvimento de interfaces multiplataforma do Flutter com o alto desempenho computacional do Rust para as simulações numéricas.

```
[Usuário]
   ↓
[Flutter Desktop App (.exe/.app)]
   ↓ Dart FFI
[Biblioteca de Simulação Rust (.dll/.dylib)]
```

## Componentes Principais

### 1. Frontend (Flutter Desktop)

#### 1.1 Estrutura de Diretórios
```
/lib
  main.dart                 # Ponto de entrada da aplicação
  /app
    app.dart                # Configuração da aplicação
    routes.dart             # Definição de rotas
  /models                   # Modelos de dados
    simulation_params.dart  # Parâmetros de simulação
    simulation_results.dart # Resultados da simulação
    material_data.dart      # Dados de materiais
  /state                    # Gerenciamento de estado (Riverpod)
    simulation_state.dart   # Estado da simulação
    ui_state.dart           # Estado da interface
  /services                 # Serviços
    ffi_bridge.dart         # Ponte FFI para Rust
    file_service.dart       # Serviço de arquivos
  /screens                  # Telas da aplicação
    home_screen.dart        # Tela inicial
    simulation_setup.dart   # Configuração da simulação
    visualization.dart      # Visualização de resultados
    formula_editor.dart     # Editor de fórmulas
    validation.dart         # Validação do modelo
  /widgets                  # Widgets reutilizáveis
    /inputs                 # Widgets de entrada
    /visualization          # Widgets de visualização
    /common                 # Widgets comuns
  /utils                    # Utilitários
    constants.dart          # Constantes
    validators.dart         # Validadores
    formatters.dart         # Formatadores
```

#### 1.2 Responsabilidades
- Interface do usuário e experiência de usuário
- Gerenciamento de estado da aplicação (Riverpod)
- Visualização 2D/3D dos resultados da simulação
- Comunicação com o backend via FFI
- Persistência de dados e configurações
- Exportação e importação de dados

#### 1.3 Tecnologias e Pacotes
- **Flutter**: Framework UI multiplataforma
- **Riverpod**: Gerenciamento de estado
- **fl_chart**: Visualização 2D
- **flutter_gl**: Visualização 3D
- **ffi**: Comunicação com código nativo
- **path_provider**: Acesso ao sistema de arquivos
- **file_picker**: Seleção de arquivos
- **json_serializable**: Serialização de dados

### 2. Backend (Rust)

#### 2.1 Estrutura de Diretórios
```
/src
  lib.rs                    # Ponto de entrada e API FFI
  /simulation               # Núcleo de simulação
    mesh.rs                 # Malha de discretização
    physics.rs              # Modelos físicos
    solver.rs               # Solucionador numérico
    state.rs                # Estado da simulação
  /plugins                  # Sistema de plugins
    plugin_trait.rs         # Trait para plugins
    builtin_plugins.rs      # Plugins integrados
  /formula                  # Avaliação de fórmulas
    sandbox.rs              # Sandbox para avaliação segura
    parser.rs               # Parser de fórmulas
  /errors                   # Tratamento de erros
    error_codes.rs          # Códigos de erro
    error_types.rs          # Tipos de erro
  /logging                  # Sistema de logs
    logger.rs               # Configuração de logs
  /ffi                      # Interface FFI
    bindings.rs             # Definições de bindings
    conversions.rs          # Conversões de tipos
Cargo.toml                  # Configuração do projeto
/tests                      # Testes
  /unit                     # Testes unitários
  /integration              # Testes de integração
  /validation               # Testes de validação
/benches                    # Benchmarks
```

#### 2.2 Responsabilidades
- Implementação dos modelos físicos e matemáticos
- Solucionador numérico da equação de calor
- Gerenciamento de malha e discretização
- Cálculo de métricas e análise de resultados
- Avaliação segura de fórmulas personalizadas
- Exportação de dados em formatos CSV/JSON
- Exposição de API via FFI para o frontend

#### 2.3 Tecnologias e Crates
- **ndarray**: Computação numérica e álgebra linear
- **rhai**: Avaliação segura de scripts/fórmulas
- **serde**: Serialização/deserialização
- **anyhow/thiserror**: Tratamento de erros
- **log/env_logger**: Logging
- **rayon**: Paralelização

### 3. Camada de Comunicação (FFI)

#### 3.1 Mecanismo de Comunicação
1. Rust expõe uma API C-ABI através de funções FFI
2. Dart carrega a biblioteca dinâmica e invoca as funções via `dart:ffi`
3. Dados são transferidos através de ponteiros e buffers

#### 3.2 Principais Funções FFI
```rust
// Inicialização
#[no_mangle]
pub extern "C" fn initialize_simulation() -> *mut SimulationContext;

// Configuração
#[no_mangle]
pub extern "C" fn set_simulation_parameters(
    ctx: *mut SimulationContext,
    params: *const SimulationParameters,
) -> i32;

// Execução
#[no_mangle]
pub extern "C" fn run_simulation(
    ctx: *mut SimulationContext,
    progress_callback: extern "C" fn(f32),
) -> i32;

// Obtenção de resultados
#[no_mangle]
pub extern "C" fn get_temperature_data(
    ctx: *mut SimulationContext,
    time_step: i32,
    buffer: *mut f32,
    buffer_size: usize,
) -> i32;

// Limpeza
#[no_mangle]
pub extern "C" fn destroy_simulation(ctx: *mut SimulationContext);
```

#### 3.3 Tratamento de Erros
- Códigos de erro padronizados retornados pelas funções FFI
- Mensagens de erro detalhadas disponíveis via funções auxiliares
- Timeouts para operações de longa duração

## Fluxo de Dados

### 1. Configuração da Simulação
1. Usuário configura parâmetros via interface Flutter
2. Flutter serializa parâmetros em estrutura compatível com FFI
3. Parâmetros são passados para o backend Rust via FFI
4. Backend valida parâmetros e configura o estado da simulação

### 2. Execução da Simulação
1. Flutter solicita execução da simulação via FFI
2. Rust executa a simulação com callback de progresso
3. Flutter atualiza a interface com o progresso
4. Resultados são mantidos na memória do backend

### 3. Visualização de Resultados
1. Flutter solicita dados de temperatura para um passo de tempo específico
2. Rust copia os dados para um buffer compartilhado
3. Flutter processa os dados e renderiza visualizações 2D/3D
4. Usuário interage com controles de playback para visualizar a evolução temporal

### 4. Exportação de Dados
1. Usuário solicita exportação via interface Flutter
2. Flutter solicita ao backend a geração do arquivo de exportação
3. Rust serializa os dados completos em CSV/JSON
4. Flutter salva o arquivo no local escolhido pelo usuário

## Considerações de Desempenho

### 1. Otimização do Solucionador Numérico
- Implementação multithreaded usando Rayon
- Algoritmos otimizados para matrizes esparsas
- Pré-alocação de memória para evitar realocações durante a simulação

### 2. Transferência de Dados FFI
- Uso de buffers pré-alocados para minimizar cópias
- Transferência de dados em chunks para visualização progressiva
- Compressão de dados para grandes conjuntos de resultados

### 3. Renderização
- Ajuste dinâmico da qualidade de renderização baseado no desempenho
- Uso de shaders otimizados para visualização 3D
- Carregamento progressivo para grandes conjuntos de dados

## Extensibilidade

### 1. Sistema de Plugins
- Interface de plugin bem definida para extensões físicas
- Carregamento dinâmico de plugins em tempo de execução
- Sandbox de segurança para plugins de terceiros

### 2. Editor de Fórmulas
- Avaliação segura de expressões matemáticas
- Limites de recursos para prevenir execução maliciosa
- Biblioteca de funções pré-definidas para uso comum

## Empacotamento e Distribuição

### 1. macOS
- Compilação da biblioteca Rust como `.dylib`
- Empacotamento do aplicativo Flutter como `.app`
- Criação de `.dmg` para distribuição

### 2. Windows
- Compilação da biblioteca Rust como `.dll`
- Empacotamento do aplicativo Flutter como `.exe`
- Criação de instalador com Inno Setup

## Próximos Passos

1. Configurar ambiente de desenvolvimento para macOS
2. Criar estrutura básica do projeto (Rust e Flutter)
3. Implementar prova de conceito da comunicação FFI
4. Desenvolver o núcleo de simulação básica (Feature 1)
