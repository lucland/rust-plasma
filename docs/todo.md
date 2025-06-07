# Desenvolvimento do Simulador de Fornalha de Plasma

## Planejamento e Configuração
- [x] Ler e analisar os requisitos do software
- [x] Esclarecer requisitos com o usuário
- [ ] Projetar a arquitetura do sistema
  - [x] Definir estrutura do projeto Rust (backend) - *Basic structure exists*
  - [ ] Definir estrutura do projeto Flutter (frontend)
  - [x] Projetar interface FFI entre Rust e Dart - *Core sim control done, others stubbed*
- [x] Configurar ambiente de desenvolvimento para macOS - *User confirmed working*
- [x] Configurar estrutura básica do projeto - *Basic structure exists*

## Implementação por Features

### Feature 1: Núcleo de Simulação Básica
- [x] Backend (Rust)
  - [x] Implementar estruturas de dados para parâmetros de entrada - *Basic structs exist*
  - [x] Implementar malha de discretização cilíndrica - *Basic mesh exists*
  - [x] Implementar solucionador básico da equação de calor - *Explicit Euler replaced with Crank-Nicolson + SOR*
    - [ ] Refinar condições de contorno (convecção, radiação, fluxo)
    - [~] Refinar/Validar modelo de mudança de fase (Refatorado para Método da Entalpia com Solver Euler Explícito - *Implícito Pendente*)
    - [ ] Revisar/Validar termos fonte (`calculate_sources`)
  - [~] Implementar exportação de resultados - *FFI stub implemented, backend logic TODO*
- [ ] Frontend (Flutter)
  - [ ] Criar tela de entrada de parâmetros básicos
  - [ ] Implementar visualização 2D básica dos resultados
  - [x] Implementar interface FFI para comunicação com o backend - *Core bridge exists*
    - [x] Implementar FFI para controle de simulação (init, run, pause, resume, state, destroy)
    - [x] Implementar FFI para obter dados de temperatura
    - [x] Refinar tratamento de erros FFI (thread-local)
    - [x] Refinar gerenciamento de thread FFI (`destroy_simulation`)
    - [~] Implementar FFI para fórmulas (get, save, delete, validate, eval, assoc) - *FFI stubs implemented, backend logic TODO*
    - [~] Implementar FFI para métricas e exportação - *FFI stubs implemented, backend logic TODO*
    - [~] Implementar FFI para validação (import, free, create, validate, report) - *FFI stubs implemented, backend logic TODO (complex FFI conversion needed)*
    - [~] Implementar FFI para estudos paramétricos - *FFI stubs implemented, backend logic TODO*
  - [ ] Testar integração básica

### Feature 2: Configuração de Geometria e Tochas
- [x] Backend (Rust)
  - [x] Implementar configuração de múltiplas tochas - *Basic structure exists*
  - [ ] Implementar cálculos de transferência de calor das tochas (`calculate_sources`)
- [ ] Frontend (Flutter)
  - [ ] Criar interface para configuração de geometria
  - [ ] Criar interface para configuração de tochas
  - [ ] Implementar visualização da configuração

### Feature 3: Propriedades de Materiais
- [x] Backend (Rust)
  - [x] Implementar banco de dados de materiais - *Basic library exists*
  - [x] Implementar funções de propriedades dependentes de temperatura - *Basic getters exist*
- [ ] Frontend (Flutter)
  - [ ] Criar interface para seleção e configuração de materiais
  - [ ] Implementar visualização de propriedades

### Feature 4: Visualização Avançada
- [ ] Backend (Rust)
  - [ ] Preparar dados para visualização 3D (`generate_3d_temperature` exists, may need refinement)
- [ ] Frontend (Flutter)
  - [ ] Implementar visualização 3D
  - [ ] Implementar controles de playback
  - [ ] Implementar seleção de estilos de visualização

### Feature 5: Editor de Fórmulas
- [ ] Backend (Rust)
  - [ ] Implementar sandbox para avaliação segura de fórmulas (`crate::formulas` assumed)
- [ ] Frontend (Flutter)
  - [ ] Criar interface para visualização e edição de fórmulas
  - [ ] Implementar validação e feedback

### Feature 6: Métricas e Exportação
- [ ] Backend (Rust)
  - [ ] Implementar cálculo de métricas (composição de gás de síntese, valor de aquecimento, etc.) (`crate::metrics` assumed)
  - [ ] Implementar exportação de dados completos (CSV/JSON) (`crate::export` assumed)
- [ ] Frontend (Flutter)
  - [ ] Criar interface para visualização de métricas
  - [ ] Implementar controles de exportação

### Feature 7: Validação de Modelo
- [ ] Backend (Rust)
  - [ ] Implementar comparação com dados analíticos/experimentais (`crate::validation` assumed)
  - [ ] Implementar cálculo de métricas de erro (`crate::validation` assumed)
- [ ] Frontend (Flutter)
  - [ ] Criar interface para importação de dados de validação
  - [ ] Implementar visualização de comparação e desvios

### Feature 8: Estudos Paramétricos
- [ ] Backend (Rust)
  - [ ] Implementar execução de múltiplas simulações com parâmetros variados (`crate::parametric` assumed)
- [ ] Frontend (Flutter)
  - [ ] Criar interface para definição de estudos paramétricos
  - [ ] Implementar visualização de resultados agregados

## Testes e Documentação
- [ ] Implementar testes unitários para o backend
- [ ] Implementar testes de integração
- [ ] Implementar testes de validação científica
- [ ] Criar documentação do usuário
- [ ] Criar tutorial de instalação para Windows e macOS
- [x] Criar documentação dos métodos do solver (`solver_methods.md`)
- [x] Criar documentação da modelagem de mudança de fase (`phase_change_modeling.md`)

## Entrega Final
- [ ] Empacotar aplicativo para macOS
- [ ] Criar tutorial para geração de executável para Windows
- [ ] Entregar produto final com documentação
