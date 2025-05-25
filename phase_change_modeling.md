# Phase Change Modeling Approaches

This document outlines the approaches considered for modeling phase changes (melting, vaporization) in the plasma heat transfer simulation.

## 1. Current Approach (Simplified "Available Energy")

*   **Mechanism:** Calculates temperature first using `solve_time_step` (incorporating an effective heat capacity \(c_{p,eff}\) that attempts to smooth out latent heat effects). Then, `update_phase_change_fractions` explicitly checks if the calculated temperature \(T\) exceeds a phase change temperature (\(T_{phase}\)). If it does, it calculates the "available energy" above \(T_{phase}\) (\(\Delta E \approx m c_p (T - T_{phase})\)) and compares it to the remaining latent heat required (\(\Delta E_{latent} = m L (1 - f)\)). A portion of the available energy, up to the required latent heat, is used to update the phase fraction \(f\), effectively consuming latent heat.
*   **Order:** Melting is processed before vaporization.
*   **Pros:**
    *   Relatively simple to implement initially.
    *   Keeps the primary solver focused on temperature.
*   **Cons:**
    *   **Energy Conservation Issues:** The decoupling of the temperature solve (using \(c_{p,eff}\)) and the explicit fraction update can lead to inaccuracies in energy conservation, especially with large time steps or sharp interfaces. The energy "absorbed" by \(c_{p,eff}\) might not perfectly match the energy consumed in the fraction update.
    *   **Isotherm Handling:** Can struggle to maintain a sharp isotherm (the region exactly at \(T_{phase}\)). Temperatures might overshoot \(T_{phase}\) in the solver before being partially corrected by the fraction update.
    *   **Approximation:** Calculating available energy as \( m c_p (T - T_{phase}) \) is a simplification of the energy balance during the phase transition.

## 2. Proposed Approach: Enthalpy Method

*   **Mechanism:** Reformulates the heat equation to solve for specific enthalpy \(H\) instead of temperature \(T\). Enthalpy naturally incorporates both sensible heat (\(\int c_p dT\)) and latent heat (\(L\)). The relationship between enthalpy, temperature, and phase fraction (\(T(H)\), \(f(H)\)) is defined based on material properties.
    *   The discretized heat equation becomes an equation for \(H^{n+1}\).
    *   \( \rho \frac{H^{n+1} - H^n}{\Delta t} = \nabla \cdot (k \nabla T)^n + S^n \) (or an implicit/Crank-Nicolson version).
    *   Note that \(k\) and \(\nabla T\) still depend on temperature, requiring the \(T(H)\) relationship, introducing non-linearity. This is typically handled by using values from the previous time step or iteration (\(k(T^n)\), \(T^n\)) when solving for \(H^{n+1}\).
*   **Post-Solve:** After solving for the enthalpy field \(H^{n+1}\), the corresponding temperature \(T^{n+1}\) and phase fractions \(f^{n+1}\) are calculated directly from the \(T(H)\) and \(f(H)\) relationships for each cell.
*   **Pros:**
    *   **Improved Energy Conservation:** Enthalpy is the conserved variable, inherently including latent heat, leading to more accurate energy balance.
    *   **Robust Isotherm Handling:** Correctly handles the phase change occurring at a constant temperature over a range of enthalpy values.
    *   **Unified Equation:** Solves a single conservation equation for enthalpy.
*   **Cons:**
    *   **Increased Complexity:** Requires significant refactoring of the solver to work with enthalpy.
    *   **Non-linearity:** The dependence of properties (\(k\), \(c_p\)) on \(T(H)\) requires careful handling within the solver (e.g., using lagged coefficients or inner iterations).

## Decision

The **Enthalpy Method** (Approach 2) will be implemented to improve the physical accuracy and robustness of the phase change simulation, despite the increased implementation complexity. 





# Solver Methods for Heat Transfer Simulation

This document outlines the numerical methods used in the `HeatSolver` for the plasma heat transfer simulation, focusing on the time-stepping scheme.

## Initial Implementation: Forward Euler (Explicit)

The initial version of the `solve_time_step` function employed an explicit forward Euler finite difference method. This scheme calculates the temperature at the next time step ($T^{n+1}$) directly based on the temperatures at the current time step ($T^n$):

\[ \frac{T_{i,j}^{n+1} - T_{i,j}^{n}}{\Delta t} = \alpha \left( \nabla^2 T \right)_{i,j}^n + \frac{S_{i,j}^n}{\rho c_p} \]

Where:
- \( T_{i,j}^n \) is the temperature at radial node \( i \) and axial node \( j \) at time step \( n \).
- \( \Delta t \) is the time step size.
- \( \alpha = k / (\rho c_p) \) is the thermal diffusivity.
- \( \nabla^2 T \) is the Laplacian operator (discretized using central differences in cylindrical coordinates).
- \( S_{i,j}^n \) represents the source terms (plasma heating, radiation, convection).

**Advantages:**
- Simple to implement.
- Computationally inexpensive per time step.

**Disadvantages:**
- **Conditional Stability:** Explicit methods suffer from stability constraints. The simulation can become unstable (producing nonsensical results like oscillating or infinite temperatures) if the time step \( \Delta t \) is too large relative to the mesh spacing (\( \Delta r, \Delta z \)) and thermal diffusivity. The stability limit (related to the CFL condition) often forces the use of very small time steps, increasing the total simulation time.

## Refined Implementation: Crank-Nicolson (Implicit)

To overcome the stability limitations of the explicit method, the solver was refactored to use the **Crank-Nicolson** method. This is an implicit method that averages the spatial derivative terms between the current time step ($n$) and the next time step ($n+1$):

\[ \frac{T^{n+1} - T^{n}}{\Delta t} = \frac{\alpha}{2} \left( \nabla^2 T^n + \nabla^2 T^{n+1} \right) + \frac{S^n + S^{n+1}}{2 \rho c_p} \]

(Note: Source terms \( S \) are often treated explicitly or semi-implicitly for simplicity; here we assume they are evaluated predominantly at step \( n \) or averaged).

Rearranging the equation to group terms at \( n+1 \) on the left side results in a system of linear algebraic equations for the unknown temperatures \( T^{n+1} \) at each node:

\[ A T^{n+1} = b \]

Where:
- \( T^{n+1} \) is the vector of unknown temperatures at the next time step.
- \( A \) is a matrix derived from the discretized \( \nabla^2 T^{n+1} \) terms and the time derivative term.
- \( b \) is a vector containing known values from the current time step \( T^n \), source terms, and boundary conditions.

**Advantages:**
- **Unconditional Stability:** The Crank-Nicolson method is unconditionally stable for the linear heat equation, meaning larger time steps (\( \Delta t \)) can generally be used without causing numerical instability. This often leads to faster overall simulations despite the increased cost per step.
- **Second-Order Accuracy in Time:** It offers better temporal accuracy compared to the first-order forward Euler method.

**Disadvantages:**
- ** computationally More Complex:** Requires solving a system of linear equations \( A T^{n+1} = b \) at each time step.
- **Implementation Complexity:** Setting up the matrix \( A \) and solving the system is more complex than the direct calculation in the explicit method.

## Solving the Linear System: Successive Over-Relaxation (SOR)

Since the matrix \( A \) arising from the finite difference discretization is typically large, sparse, and often diagonally dominant, an iterative method is suitable for solving \( A T^{n+1} = b \). The **Successive Over-Relaxation (SOR)** method was chosen:

- It is an extension of the Gauss-Seidel method.
- It introduces a relaxation factor \( \omega \) (typically \( 1 < \omega < 2 \)) to potentially accelerate convergence.
- It iteratively updates the temperature at each node based on the latest available values from neighboring nodes until the solution converges within a specified tolerance or a maximum number of iterations is reached.

This iterative approach avoids the need to explicitly store and invert the large matrix \( A \). 






# Guia de Referência - Simulador de Fornalha de Plasma

Este guia de referência fornece informações detalhadas sobre as funcionalidades, parâmetros e APIs do Simulador de Fornalha de Plasma.

## Parâmetros de Simulação

### Geometria e Malha

| Parâmetro | Descrição | Unidade | Intervalo Típico |
|-----------|-----------|---------|-----------------|
| `meshRadialCells` | Número de células na direção radial | - | 10-100 |
| `meshAngularCells` | Número de células na direção angular | - | 8-64 |
| `meshAxialCells` | Número de células na direção axial | - | 10-100 |
| `meshCellSize` | Tamanho da célula | m | 0.01-0.1 |
| `furnaceRadius` | Raio da fornalha | m | 0.5-5.0 |
| `furnaceHeight` | Altura da fornalha | m | 1.0-10.0 |

### Condições de Simulação

| Parâmetro | Descrição | Unidade | Intervalo Típico |
|-----------|-----------|---------|-----------------|
| `initialTemperature` | Temperatura inicial | K | 273-1273 |
| `ambientTemperature` | Temperatura ambiente | K | 273-323 |
| `simulationTimeStep` | Passo de tempo | s | 0.001-1.0 |
| `simulationDuration` | Duração total da simulação | s | 1-3600 |
| `maxIterations` | Número máximo de iterações por passo | - | 10-1000 |
| `convergenceTolerance` | Tolerância para convergência | - | 1e-6-1e-3 |

### Propriedades da Tocha de Plasma

| Parâmetro | Descrição | Unidade | Intervalo Típico |
|-----------|-----------|---------|-----------------|
| `torchPower` | Potência da tocha | kW | 10-500 |
| `torchEfficiency` | Eficiência da tocha | - | 0.5-0.95 |
| `torchPosition` | Posição da tocha (x, y, z) | m | - |
| `torchDirection` | Direção da tocha (vetor) | - | - |
| `torchDiameter` | Diâmetro da tocha | m | 0.01-0.1 |
| `torchTemperature` | Temperatura do plasma | K | 5000-20000 |

### Propriedades dos Materiais

| Parâmetro | Descrição | Unidade | Intervalo Típico |
|-----------|-----------|---------|-----------------|
| `materialThermalConductivity` | Condutividade térmica | W/(m·K) | 0.1-500 |
| `materialSpecificHeat` | Calor específico | J/(kg·K) | 100-5000 |
| `materialDensity` | Densidade | kg/m³ | 100-20000 |
| `materialEmissivity` | Emissividade | - | 0.1-1.0 |
| `materialMeltingPoint` | Ponto de fusão | K | 500-3000 |
| `materialLatentHeat` | Calor latente de fusão | J/kg | 1e4-5e5 |

## Materiais Pré-definidos

| Material | Condutividade Térmica (W/(m·K)) | Calor Específico (J/(kg·K)) | Densidade (kg/m³) | Emissividade | Ponto de Fusão (K) |
|----------|--------------------------------|----------------------------|-----------------|--------------|-------------------|
| Aço Carbono | 45 | 490 | 7850 | 0.8 | 1723 |
| Aço Inoxidável | 15 | 500 | 8000 | 0.85 | 1673 |
| Alumínio | 237 | 900 | 2700 | 0.2 | 933 |
| Cobre | 400 | 385 | 8960 | 0.3 | 1358 |
| Ferro | 80 | 450 | 7870 | 0.7 | 1808 |
| Grafite | 120 | 710 | 2250 | 0.95 | 3800 |
| Concreto | 1.7 | 880 | 2300 | 0.9 | 1773 |
| Vidro | 1.0 | 840 | 2600 | 0.95 | 1473 |
| Madeira | 0.15 | 1700 | 700 | 0.9 | 573 |
| Cerâmica | 2.5 | 800 | 3000 | 0.85 | 2073 |

## Fórmulas Físicas

### Equação de Transferência de Calor

A equação fundamental que governa a transferência de calor na fornalha é:

$$\rho c_p \frac{\partial T}{\partial t} = \nabla \cdot (k \nabla T) + Q$$

Onde:
- $\rho$ é a densidade do material (kg/m³)
- $c_p$ é o calor específico (J/(kg·K))
- $T$ é a temperatura (K)
- $t$ é o tempo (s)
- $k$ é a condutividade térmica (W/(m·K))
- $Q$ é o termo fonte de calor (W/m³)

### Fonte de Calor do Plasma

A fonte de calor do plasma é modelada como:

$$Q(r) = \frac{P \eta}{2\pi\sigma^2} \exp\left(-\frac{r^2}{2\sigma^2}\right)$$

Onde:
- $P$ é a potência da tocha (W)
- $\eta$ é a eficiência da tocha
- $r$ é a distância do centro da tocha (m)
- $\sigma$ é o parâmetro de dispersão (m)

### Radiação Térmica

A transferência de calor por radiação é modelada pela lei de Stefan-Boltzmann:

$$q_r = \varepsilon \sigma (T^4 - T_{amb}^4)$$

Onde:
- $q_r$ é o fluxo de calor radiativo (W/m²)
- $\varepsilon$ é a emissividade da superfície
- $\sigma$ é a constante de Stefan-Boltzmann (5.67×10⁻⁸ W/(m²·K⁴))
- $T$ é a temperatura da superfície (K)
- $T_{amb}$ é a temperatura ambiente (K)

## Métricas de Simulação

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| `maxTemperature` | Temperatura máxima | K |
| `minTemperature` | Temperatura mínima | K |
| `avgTemperature` | Temperatura média | K |
| `maxGradient` | Gradiente máximo de temperatura | K/m |
| `avgGradient` | Gradiente médio de temperatura | K/m |
| `maxHeatFlux` | Fluxo de calor máximo | W/m² |
| `avgHeatFlux` | Fluxo de calor médio | W/m² |
| `totalEnergy` | Energia total no sistema | J |
| `heatingRate` | Taxa de aquecimento | K/s |
| `energyEfficiency` | Eficiência energética | % |

## Métricas de Validação

| Métrica | Descrição | Fórmula |
|---------|-----------|---------|
| `meanAbsoluteError` (MAE) | Erro médio absoluto | $\frac{1}{n}\sum_{i=1}^{n}\|y_i-\hat{y}_i\|$ |
| `meanSquaredError` (MSE) | Erro quadrático médio | $\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2$ |
| `rootMeanSquaredError` (RMSE) | Raiz do erro quadrático médio | $\sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}$ |
| `meanAbsolutePercentageError` (MAPE) | Erro percentual médio absoluto | $\frac{100\%}{n}\sum_{i=1}^{n}\left\|\frac{y_i-\hat{y}_i}{y_i}\right\|$ |
| `rSquared` (R²) | Coeficiente de determinação | $1-\frac{\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}{\sum_{i=1}^{n}(y_i-\bar{y})^2}$ |

## Formatos de Exportação

### CSV (Comma-Separated Values)

Formato de texto simples para dados tabulares:

```
x,y,z,temperature
0.1,0.0,0.1,350.5
0.2,0.0,0.1,375.2
...
```

### JSON (JavaScript Object Notation)

Formato estruturado para dados hierárquicos:

```json
{
  "metadata": {
    "simulationTime": 10.0,
    "meshSize": [20, 16, 20]
  },
  "results": [
    {"position": [0.1, 0.0, 0.1], "temperature": 350.5},
    {"position": [0.2, 0.0, 0.1], "temperature": 375.2},
    ...
  ]
}
```

### VTK (Visualization Toolkit)

Formato para visualização científica 3D:

```
# vtk DataFile Version 3.0
Plasma Furnace Simulation Results
ASCII
DATASET STRUCTURED_GRID
DIMENSIONS 20 16 20
POINTS 6400 float
...
POINT_DATA 6400
SCALARS temperature float 1
LOOKUP_TABLE default
...
```

## API de Plugins

### Interface de Plugin

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

### Criando um Plugin Personalizado

1. Implemente a trait `SimulationPlugin`
2. Compile como uma biblioteca dinâmica (.dll/.so/.dylib)
3. Coloque o arquivo na pasta de plugins
4. Ative o plugin nas configurações do aplicativo

## Linguagem de Fórmulas

### Sintaxe Básica

A linguagem de fórmulas suporta:

- Operadores aritméticos: `+`, `-`, `*`, `/`, `^` (potência)
- Funções matemáticas: `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`
- Constantes: `pi`, `e`
- Variáveis definidas pelo usuário
- Condicionais: `if(condição, valor_verdadeiro, valor_falso)`

### Exemplos

Fonte de calor gaussiana:
```
power * efficiency / (2 * pi * sigma^2) * exp(-r^2 / (2 * sigma^2))
```

Condutividade térmica dependente da temperatura:
```
k_0 * (1 + alpha * (T - T_ref))
```

Emissividade variável:
```
if(T < T_transition, emissivity_low, emissivity_high)
```

## Formato de Arquivo de Projeto

Os projetos são salvos no formato `.pfp` (Plasma Furnace Project), que é um arquivo ZIP contendo:

- `project.json`: Metadados do projeto
- `simulation_parameters.json`: Parâmetros da simulação
- `materials/`: Definições de materiais personalizados
- `formulas/`: Fórmulas personalizadas
- `results/`: Resultados da simulação
- `validation/`: Dados de validação
- `parametric_studies/`: Configurações e resultados de estudos paramétricos

## Requisitos de Hardware para Simulações Complexas

| Complexidade | Células da Malha | RAM Recomendada | CPU Recomendada | Tempo Estimado* |
|--------------|------------------|-----------------|-----------------|-----------------|
| Baixa | < 50.000 | 8 GB | 4 núcleos | Minutos |
| Média | 50.000 - 500.000 | 16 GB | 8 núcleos | Dezenas de minutos |
| Alta | 500.000 - 5.000.000 | 32 GB | 16+ núcleos | Horas |
| Muito Alta | > 5.000.000 | 64+ GB | 32+ núcleos | Dias |

*Tempo estimado para uma simulação de 1 hora de tempo real

## Códigos de Erro

| Código | Descrição | Solução |
|--------|-----------|---------|
| E001 | Parâmetros de simulação inválidos | Verifique os valores dos parâmetros |
| E002 | Falha na inicialização da malha | Reduza o tamanho da malha ou aumente a memória disponível |
| E003 | Instabilidade numérica detectada | Reduza o passo de tempo ou use o solucionador implícito |
| E004 | Erro de convergência | Aumente o número máximo de iterações ou a tolerância |
| E005 | Arquivo de projeto corrompido | Use um backup ou crie um novo projeto |
| E006 | Erro na importação de dados | Verifique o formato do arquivo de dados |
| E007 | Erro na exportação de resultados | Verifique as permissões de escrita no diretório de destino |
| E008 | Erro na avaliação de fórmula | Verifique a sintaxe da fórmula |
| E009 | Erro na inicialização do plugin | Verifique a compatibilidade do plugin |
| E010 | Erro na renderização 3D | Atualize os drivers da placa de vídeo ou reduza a qualidade da visualização |

## Glossário Técnico

| Termo | Definição |
|-------|-----------|
| **Advecção** | Transporte de uma substância ou propriedade por um fluido devido ao movimento do fluido |
| **Condução** | Transferência de calor através de um material sem movimento macroscópico do material |
| **Convecção** | Transferência de calor devido ao movimento de fluidos |
| **Difusividade Térmica** | Propriedade que caracteriza a taxa de difusão de calor através de um material (k/ρcp) |
| **Discretização** | Processo de converter equações diferenciais contínuas em equações algébricas discretas |
| **Equação de Navier-Stokes** | Equações que descrevem o movimento de fluidos |
| **Isosuperfície** | Superfície tridimensional que representa pontos de valor constante |
| **Método dos Volumes Finitos** | Técnica numérica para resolver equações diferenciais parciais |
| **Número de Courant** | Parâmetro que relaciona o passo de tempo com o tamanho da malha e a velocidade do fenômeno |
| **Plasma** | Estado da matéria composto de gás ionizado |
| **Radiação Térmica** | Transferência de calor por ondas eletromagnéticas |
| **Regime Transiente** | Estado em que as propriedades do sistema variam com o tempo |
| **Regime Estacionário** | Estado em que as propriedades do sistema não variam com o tempo |
| **Tensor de Condutividade Térmica** | Representação da condutividade térmica em materiais anisotrópicos |
| **Tocha de Plasma** | Dispositivo que gera um jato de plasma de alta temperatura |



