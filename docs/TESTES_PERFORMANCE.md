# Guia de Testes de Performance para o Simulador de Fornalha de Plasma

Este guia fornece instruções detalhadas para realizar testes de performance tanto no backend (Rust) quanto no frontend (Flutter) do Simulador de Fornalha de Plasma.

## Índice

1. [Testes de Performance do Backend](#testes-de-performance-do-backend)
   - [Benchmarks com Criterion](#benchmarks-com-criterion)
   - [Profiling com Flamegraph](#profiling-com-flamegraph)
   - [Análise de Uso de Memória](#análise-de-uso-de-memória)
   - [Testes de Carga](#testes-de-carga)
2. [Testes de Performance do Frontend](#testes-de-performance-do-frontend)
   - [Perfil de Performance do Flutter](#perfil-de-performance-do-flutter)
   - [DevTools do Flutter](#devtools-do-flutter)
   - [Análise de Renderização](#análise-de-renderização)
   - [Testes de Responsividade](#testes-de-responsividade)
3. [Testes de Integração de Performance](#testes-de-integração-de-performance)
   - [Latência de Comunicação FFI](#latência-de-comunicação-ffi)
   - [Throughput de Dados](#throughput-de-dados)
4. [Interpretação de Resultados](#interpretação-de-resultados)
   - [Identificação de Gargalos](#identificação-de-gargalos)
   - [Comparação de Resultados](#comparação-de-resultados)
5. [Otimização de Performance](#otimização-de-performance)
   - [Estratégias para Backend](#estratégias-para-backend)
   - [Estratégias para Frontend](#estratégias-para-frontend)

## Testes de Performance do Backend

### Benchmarks com Criterion

O backend utiliza a biblioteca Criterion para benchmarks precisos. Os benchmarks estão definidos no diretório `backend/benches/`.

#### Executando Benchmarks

```bash
# No macOS
cd ~/Projects/plasma_furnace_simulator/backend
cargo bench

# No Windows
cd C:\Projects\plasma_furnace_simulator\backend
cargo bench
```

Isso executará todos os benchmarks definidos e gerará relatórios detalhados.

#### Analisando Resultados

Os resultados são apresentados no terminal e também salvos em HTML no diretório `target/criterion/`. Abra os arquivos HTML em um navegador para visualizar gráficos e estatísticas detalhadas.

#### Criando Novos Benchmarks

Para criar um novo benchmark, adicione um arquivo ao diretório `backend/benches/` ou modifique o arquivo existente `solver_benchmark.rs`:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use plasma_simulation::simulation::{mesh::CylindricalMesh, solver::Solver};

fn solver_benchmark(c: &mut Criterion) {
    let mesh = CylindricalMesh::new(50, 36, 100, 0.01, 0.5);
    let solver = Solver::new(0.001, 1000, 1e-6);
    
    c.bench_function("solve_step_50x36x100", |b| {
        b.iter(|| solver.solve_step(black_box(&mesh)))
    });
}

criterion_group!(benches, solver_benchmark);
criterion_main!(benches);
```

### Profiling com Flamegraph

Flamegraph é uma ferramenta poderosa para visualizar onde o tempo está sendo gasto no código.

#### Instalação

```bash
# No macOS
cargo install flamegraph
brew install dtrace  # Necessário no macOS

# No Windows
cargo install flamegraph
# Nota: No Windows, você precisará do Windows Performance Toolkit
```

#### Gerando Flamegraph

```bash
# No macOS
cd ~/Projects/plasma_furnace_simulator/backend
cargo flamegraph --bin plasma_simulation

# No Windows
cd C:\Projects\plasma_furnace_simulator\backend
cargo flamegraph --bin plasma_simulation
```

Isso gerará um arquivo `flamegraph.svg` que pode ser aberto em um navegador.

#### Interpretando Flamegraph

- O eixo x representa a porcentagem do tempo total de execução
- O eixo y representa a pilha de chamadas
- As barras mais largas indicam funções que consomem mais tempo
- As cores são apenas para distinção visual, não têm significado específico

### Análise de Uso de Memória

#### Com DHAT (Rust)

```bash
# Instalar DHAT
cargo install dhat-rs

# Modificar o código para usar DHAT
# Adicione ao Cargo.toml:
# [features]
# dhat-heap = ["dhat"]
# [dependencies]
# dhat = { version = "0.3", optional = true }

# No arquivo main.rs ou lib.rs:
#[cfg(feature = "dhat-heap")]
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

fn main() {
    #[cfg(feature = "dhat-heap")]
    let _profiler = dhat::Profiler::new_heap();
    
    // Resto do código
}

# Executar com DHAT
cargo run --features dhat-heap
```

#### Com Valgrind (Linux/macOS)

```bash
# No macOS
brew install valgrind
cd ~/Projects/plasma_furnace_simulator/backend
valgrind --tool=massif ./target/release/plasma_simulation

# Analisar resultados
ms_print massif.out.12345 > massif.txt
```

### Testes de Carga

Para testar como o backend se comporta sob carga, crie um script que execute simulações com diferentes tamanhos de malha e parâmetros.

```rust
// Em um arquivo de teste ou benchmark
fn test_load() {
    let mesh_sizes = [(10, 10, 10), (50, 36, 100), (100, 72, 200)];
    
    for (r, a, z) in mesh_sizes {
        let mesh = CylindricalMesh::new(r, a, z, 0.01, 0.5);
        let solver = Solver::new(0.001, 1000, 1e-6);
        
        let start = std::time::Instant::now();
        for _ in 0..100 {
            solver.solve_step(&mesh);
        }
        let duration = start.elapsed();
        
        println!("Mesh {}x{}x{}: {:?}", r, a, z, duration);
    }
}
```

## Testes de Performance do Frontend

### Perfil de Performance do Flutter

O Flutter oferece diferentes modos de compilação que afetam a performance:

- **Debug**: Otimizado para desenvolvimento, com assertions e código de depuração
- **Profile**: Otimizado para análise de performance, sem código de depuração
- **Release**: Totalmente otimizado para produção

#### Executando em Modo Profile

```bash
# No macOS
cd ~/Projects/plasma_furnace_simulator/frontend
flutter run --profile -d macos

# No Windows
cd C:\Projects\plasma_furnace_simulator\frontend
flutter run --profile -d windows
```

### DevTools do Flutter

O DevTools é uma suíte de ferramentas de performance e depuração para Flutter.

#### Iniciando o DevTools

```bash
# Instalar DevTools
flutter pub global activate devtools

# Iniciar DevTools
flutter pub global run devtools

# Ou conectar-se ao DevTools a partir da URL fornecida no console
# quando o aplicativo está em execução
```

#### Usando o Performance View

1. Conecte-se ao DevTools enquanto o aplicativo está em execução
2. Vá para a aba "Performance"
3. Clique em "Record" para iniciar a gravação
4. Interaja com o aplicativo
5. Clique em "Stop" para parar a gravação
6. Analise os resultados:
   - Timeline de UI e GPU
   - Frames por segundo
   - Eventos de renderização
   - Alocações de memória

#### Usando o Memory View

1. Vá para a aba "Memory"
2. Observe o uso de memória em tempo real
3. Tire snapshots de memória para análise detalhada
4. Identifique vazamentos de memória comparando snapshots

### Análise de Renderização

Para identificar problemas de renderização, você pode ativar várias flags de depuração:

```dart
// Em main.dart, antes de runApp()
import 'package:flutter/rendering.dart';

void main() {
  // Mostrar bordas de todos os widgets
  debugPaintSizeEnabled = true;
  
  // Mostrar regiões de repintura
  debugRepaintRainbowEnabled = true;
  
  // Mostrar camadas de renderização
  debugPaintLayerBordersEnabled = true;
  
  // Mostrar pilhas de chamadas para operações de layout e pintura
  debugPrintMarkNeedsLayoutStacks = true;
  debugPrintMarkNeedsPaintStacks = true;
  
  runApp(MyApp());
}
```

### Testes de Responsividade

Para testar a responsividade da UI:

1. Use o widget `PerformanceOverlay` para monitorar a performance em tempo real:

```dart
MaterialApp(
  home: Stack(
    children: [
      MyApp(),
      const Positioned(
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        child: PerformanceOverlay.allEnabled(),
      ),
    ],
  ),
)
```

2. Teste com diferentes tamanhos de tela usando o Device Preview:

```bash
flutter pub add device_preview
```

```dart
import 'package:device_preview/device_preview.dart';

void main() {
  runApp(
    DevicePreview(
      enabled: true,
      builder: (context) => MyApp(),
    ),
  );
}
```

## Testes de Integração de Performance

### Latência de Comunicação FFI

Para medir a latência da comunicação entre Flutter e Rust via FFI:

```dart
// Em um arquivo de teste ou benchmark
void measureFFILatency() {
  final stopwatch = Stopwatch()..start();
  
  for (int i = 0; i < 1000; i++) {
    // Chamada FFI simples
    ffiBridge.simpleFunction();
  }
  
  final elapsed = stopwatch.elapsedMilliseconds;
  print('1000 chamadas FFI: ${elapsed}ms (${elapsed / 1000}ms por chamada)');
}
```

### Throughput de Dados

Para medir a taxa de transferência de dados entre Flutter e Rust:

```dart
// Em um arquivo de teste ou benchmark
void measureDataThroughput() {
  const dataSizes = [1024, 10240, 102400, 1024000];
  
  for (final size in dataSizes) {
    final data = List.filled(size, 42.0);
    
    final stopwatch = Stopwatch()..start();
    
    // Enviar dados para Rust
    ffiBridge.processData(data);
    
    final elapsed = stopwatch.elapsedMilliseconds;
    final mbPerSecond = (size * 8 / 1024 / 1024) / (elapsed / 1000);
    
    print('Tamanho: ${size} bytes, Tempo: ${elapsed}ms, Taxa: ${mbPerSecond.toStringAsFixed(2)} Mbps');
  }
}
```

## Interpretação de Resultados

### Identificação de Gargalos

Ao analisar os resultados dos testes de performance, procure por:

1. **Funções que consomem muito tempo**: No Flamegraph, são as barras mais largas
2. **Alocações de memória excessivas**: Visíveis nas ferramentas de análise de memória
3. **Frames lentos**: No DevTools, frames que excedem 16ms (para 60fps)
4. **Operações de layout frequentes**: Indicadas por mensagens de depuração quando `debugPrintMarkNeedsLayoutStacks` está ativado

### Comparação de Resultados

Mantenha um registro dos resultados de performance para comparar ao longo do tempo:

```bash
# Criar um diretório para resultados
mkdir -p performance_results

# Salvar resultados de benchmark
cargo bench | tee performance_results/backend_bench_$(date +%Y%m%d).txt

# Comparar com resultados anteriores
diff performance_results/backend_bench_20250401.txt performance_results/backend_bench_20250421.txt
```

## Otimização de Performance

### Estratégias para Backend

1. **Paralelização**: Use `rayon` para paralelizar cálculos:

```rust
use rayon::prelude::*;

// Antes
for cell in cells {
    process_cell(cell);
}

// Depois
cells.par_iter().for_each(|cell| {
    process_cell(cell);
});
```

2. **Algoritmos Eficientes**: Escolha algoritmos com complexidade adequada:

```rust
// Antes: O(n²)
for i in 0..n {
    for j in 0..n {
        // Operação
    }
}

// Depois: O(n log n)
// Usar algoritmo mais eficiente
```

3. **Otimização de Memória**: Reduza alocações:

```rust
// Antes
fn process() {
    let mut vec = Vec::new();
    for i in 0..1000 {
        vec.push(i);
    }
}

// Depois
fn process() {
    let mut vec = Vec::with_capacity(1000);
    for i in 0..1000 {
        vec.push(i);
    }
}
```

4. **SIMD (Single Instruction, Multiple Data)**: Use instruções vetoriais:

```rust
// Adicionar ao Cargo.toml
# [dependencies]
# packed_simd = "0.3.8"

// No código
use packed_simd::f32x4;

// Antes
fn sum(a: &[f32], b: &[f32]) -> Vec<f32> {
    a.iter().zip(b.iter()).map(|(a, b)| a + b).collect()
}

// Depois
fn sum_simd(a: &[f32], b: &[f32]) -> Vec<f32> {
    let mut result = Vec::with_capacity(a.len());
    
    for i in (0..a.len()).step_by(4) {
        let a_vec = f32x4::from_slice_unaligned(&a[i..]);
        let b_vec = f32x4::from_slice_unaligned(&b[i..]);
        let sum = a_vec + b_vec;
        
        sum.store_unaligned(&mut result[i..]);
    }
    
    result
}
```

### Estratégias para Frontend

1. **Reduzir Reconstruções de Widget**: Use `const` e `final` adequadamente:

```dart
// Antes
Widget build(BuildContext context) {
  return Container(
    padding: EdgeInsets.all(16.0),
    child: Text('Hello'),
  );
}

// Depois
Widget build(BuildContext context) {
  return const Container(
    padding: EdgeInsets.all(16.0),
    child: Text('Hello'),
  );
}
```

2. **Usar RepaintBoundary**: Isole partes da UI que mudam frequentemente:

```dart
// Antes
Widget build(BuildContext context) {
  return Column(
    children: [
      Header(),
      Content(),
      AnimatedFooter(),
    ],
  );
}

// Depois
Widget build(BuildContext context) {
  return Column(
    children: [
      Header(),
      Content(),
      RepaintBoundary(
        child: AnimatedFooter(),
      ),
    ],
  );
}
```

3. **Lazy Loading**: Carregue dados sob demanda:

```dart
// Antes
ListView(
  children: List.generate(1000, (index) => ExpensiveWidget(index)),
)

// Depois
ListView.builder(
  itemCount: 1000,
  itemBuilder: (context, index) => ExpensiveWidget(index),
)
```

4. **Caching**: Armazene resultados de operações caras:

```dart
// Antes
Widget build(BuildContext context) {
  final result = expensiveCalculation();
  return Text(result.toString());
}

// Depois
class MyCachedWidget extends StatefulWidget {
  @override
  _MyCachedWidgetState createState() => _MyCachedWidgetState();
}

class _MyCachedWidgetState extends State<MyCachedWidget> {
  late final result = expensiveCalculation();
  
  @override
  Widget build(BuildContext context) {
    return Text(result.toString());
  }
}
```

5. **Compute**: Execute operações pesadas em threads separadas:

```dart
// Antes
onPressed: () {
  final result = expensiveOperation();
  setState(() {
    this.result = result;
  });
}

// Depois
onPressed: () async {
  final result = await compute(expensiveOperation, null);
  setState(() {
    this.result = result;
  });
}
```
