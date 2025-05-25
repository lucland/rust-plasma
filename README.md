# Phase Change Modeling Approaches

This document outlines the approaches considered for modeling phase changes (melting, vaporization) in the plasma heat transfer simulation.

## 1. Current Approach (Simplified "Available Energy")

*   **Mechanism:** Calculates temperature first using `solve_time_step` (incorporating an effective heat capacity $c_{p,eff}$ that attempts to smooth out latent heat effects). Then, `update_phase_change_fractions` explicitly checks if the calculated temperature $T$ exceeds a phase change temperature ($T_{phase}$). If it does, it calculates the "available energy" above $T_{phase}$ ($\Delta E \approx m c_p (T - T_{phase})$) and compares it to the remaining latent heat required ($\Delta E_{latent} = m L (1 - f)$). A portion of the available energy, up to the required latent heat, is used to update the phase fraction $f$, effectively consuming latent heat.
*   **Order:** Melting is processed before vaporization.
*   **Pros:**
    *   Relatively simple to implement initially.
    *   Keeps the primary solver focused on temperature.
*   **Cons:**
    *   **Energy Conservation Issues:** The decoupling of the temperature solve (using $c_{p,eff}$) and the explicit fraction update can lead to inaccuracies in energy conservation, especially with large time steps or sharp interfaces. The energy "absorbed" by $c_{p,eff}$ might not perfectly match the energy consumed in the fraction update.
    *   **Isotherm Handling:** Can struggle to maintain a sharp isotherm (the region exactly at $T_{phase}$). Temperatures might overshoot $T_{phase}$ in the solver before being partially corrected by the fraction update.
    *   **Approximation:** Calculating available energy as $m c_p (T - T_{phase})$ is a simplification of the energy balance during the phase transition.

## 2. Proposed Approach: Enthalpy Method

*   **Mechanism:** Reformulates the heat equation to solve for specific enthalpy $H$ instead of temperature $T$. Enthalpy naturally incorporates both sensible heat ($\int c_p dT$) and latent heat ($L$) in a continuous function. Temperature is derived from enthalpy using the enthalpy-temperature relationship, which includes "plateaus" at phase change temperatures where enthalpy increases while temperature remains constant. The relationship between enthalpy, temperature, and phase fraction ($T(H)$, $f(H)$) is defined based on material properties.
    *   The discretized heat equation becomes an equation for $H^{n+1}$.
    *   $\rho \frac{H^{n+1} - H^n}{\Delta t} = \nabla \cdot (k \nabla T)^n + S^n$ (or an implicit/Crank-Nicolson version).
    *   Note that $k$ and $\nabla T$ still depend on temperature, requiring the $T(H)$ relationship, introducing non-linearity. This is typically handled by using values from the previous time step or iteration ($k(T^n)$, $T^n$) when solving for $H^{n+1}$.
*   **Post-Solve:** After solving for the enthalpy field $H^{n+1}$, the corresponding temperature $T^{n+1}$ and phase fractions $f^{n+1}$ are calculated directly from the $T(H)$ and $f(H)$ relationships for each cell.
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

$$\frac{T_{i,j}^{n+1} - T_{i,j}^{n}}{\Delta t} = \alpha \left( \nabla^2 T \right)_{i,j}^n + \frac{S_{i,j}^n}{\rho c_p}$$

Where:
- $T_{i,j}^n$ is the temperature at radial node $i$ and axial node $j$ at time step $n$.
- $\Delta t$ is the time step size.
- $\alpha = k / (\rho c_p)$ is the thermal diffusivity.
- $\nabla^2 T$ is the Laplacian operator (discretized using central differences in cylindrical coordinates).
- $S_{i,j}^n$ represents the source terms (plasma heating, radiation, convection).

**Advantages:**
- Simple to implement.
- Computationally inexpensive per time step.

**Disadvantages:**
- **Conditional Stability:** Explicit methods suffer from stability constraints. The simulation can become unstable (producing nonsensical results like oscillating or infinite temperatures) if the time step $\Delta t$ is too large relative to the mesh spacing ($\Delta r, \Delta z$) and thermal diffusivity. The stability limit (related to the CFL condition) often forces the use of very small time steps, increasing the total simulation time.

## Refined Implementation: Crank-Nicolson (Implicit)

To overcome the stability limitations of the explicit method, the solver was refactored to use the **Crank-Nicolson** method. This is an implicit method that averages the spatial derivative terms between the current time step ($n$) and the next time step ($n+1$):

$$\frac{T^{n+1} - T^{n}}{\Delta t} = \frac{\alpha}{2} \left( \nabla^2 T^n + \nabla^2 T^{n+1} \right) + \frac{S^n + S^{n+1}}{2 \rho c_p}$$

(Note: Source terms $S$ are often treated explicitly or semi-implicitly for simplicity; here we assume they are evaluated predominantly at step $n$ or averaged).

Rearranging the equation to group terms at \( n+1 \) on the left side results in a system of linear algebraic equations for the unknown temperatures \( T^{n+1} \) at each node:

$$A T^{n+1} = b$$

Where:
- $T^{n+1}$ is the vector of unknown temperatures at the next time step.
- $A$ is a matrix derived from the discretized $\nabla^2 T^{n+1}$ terms and the time derivative term.
- $b$ is a vector containing known values from the current time step $T^n$, source terms, and boundary conditions.

**Advantages:**
- **Unconditional Stability:** The Crank-Nicolson method is unconditionally stable for the linear heat equation, meaning larger time steps ($\Delta t$) can generally be used without causing numerical instability. This often leads to faster overall simulations despite the increased cost per step.
- **Second-Order Accuracy in Time:** It offers better temporal accuracy compared to the first-order forward Euler method.

**Disadvantages:**
- **Computationally More Complex:** Requires solving a system of linear equations $A T^{n+1} = b$ at each time step.
- **Implementation Complexity:** Setting up the matrix $A$ and solving the system is more complex than the direct calculation in the explicit method.

## Solving the Linear System: Successive Over-Relaxation (SOR)

Since the matrix $A$ arising from the finite difference discretization is typically large, sparse, and often diagonally dominant, an iterative method is suitable for solving $A T^{n+1} = b$. The **Successive Over-Relaxation (SOR)** method was chosen:

- It is an extension of the Gauss-Seidel method.
- It introduces a relaxation factor $\omega$ (typically $1 < \omega < 2$) to potentially accelerate convergence.
- It iteratively updates the temperature at each node based on the latest available values from neighboring nodes until the solution converges within a specified tolerance or a maximum number of iterations is reached.

This iterative approach avoids the need to explicitly store and invert the large matrix $A$.





# Reference Guide - Plasma Furnace Simulator

This reference guide provides detailed information about the functionalities, parameters, and APIs of the Plasma Furnace Simulator.

## Simulation Parameters

### Geometry and Mesh

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `meshRadialCells` | Number of cells in radial direction | - | 10-100 |
| `meshAngularCells` | Number of cells in angular direction | - | 8-64 |
| `meshAxialCells` | Number of cells in axial direction | - | 10-100 |
| `meshCellSize` | Cell size | m | 0.01-0.1 |
| `furnaceRadius` | Furnace radius | m | 0.5-5.0 |
| `furnaceHeight` | Furnace height | m | 1.0-10.0 |

### Simulation Conditions

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `initialTemperature` | Initial temperature | K | 273-1273 |
| `ambientTemperature` | Ambient temperature | K | 273-323 |
| `simulationTimeStep` | Time step | s | 0.001-1.0 |
| `simulationDuration` | Total simulation duration | s | 1-3600 |
| `maxIterations` | Maximum iterations per step | - | 10-1000 |
| `convergenceTolerance` | Convergence tolerance | - | 1e-6-1e-3 |

### Plasma Torch Properties

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `torchPower` | Torch power | kW | 10-500 |
| `torchEfficiency` | Torch efficiency | - | 0.5-0.95 |
| `torchPosition` | Torch position (x, y, z) | m | - |
| `torchDirection` | Torch direction (vector) | - | - |
| `torchDiameter` | Torch diameter | m | 0.01-0.1 |
| `torchTemperature` | Plasma temperature | K | 5000-20000 |

### Material Properties

| Parameter | Description | Unit | Typical Range |
|-----------|-----------|---------|------------------|
| `materialThermalConductivity` | Thermal conductivity | W/(m·K) | 0.1-500 |
| `materialSpecificHeat` | Specific heat | J/(kg·K) | 100-5000 |
| `materialDensity` | Density | kg/m³ | 100-20000 |
| `materialEmissivity` | Emissivity | - | 0.1-1.0 |
| `materialMeltingPoint` | Melting point | K | 500-3000 |
| `materialLatentHeat` | Latent heat of fusion | J/kg | 1e4-5e5 |

## Predefined Materials

| Material | Thermal Conductivity (W/(m·K)) | Specific Heat (J/(kg·K)) | Density (kg/m³) | Emissivity | Melting Point (K) |
|----------|--------------------------------|----------------------------|-----------------|--------------|-------------------|
| Carbon Steel | 45 | 490 | 7850 | 0.8 | 1723 |
| Stainless Steel | 15 | 500 | 8000 | 0.85 | 1673 |
| Aluminum | 237 | 900 | 2700 | 0.2 | 933 |
| Copper | 400 | 385 | 8960 | 0.3 | 1358 |
| Iron | 80 | 450 | 7870 | 0.7 | 1808 |
| Graphite | 120 | 710 | 2250 | 0.95 | 3800 |
| Concrete | 1.7 | 880 | 2300 | 0.9 | 1773 |
| Glass | 1.0 | 840 | 2600 | 0.95 | 1473 |
| Wood | 0.15 | 1700 | 700 | 0.9 | 573 |
| Ceramic | 2.5 | 800 | 3000 | 0.85 | 2073 |

## Physical Formulas

### Heat Transfer Equation

The fundamental equation governing heat transfer in the furnace is:

$$\rho c_p \frac{\partial T}{\partial t} = \nabla \cdot (k \nabla T) + Q$$

Where:
- $\rho$ is the material density (kg/m³)
- $c_p$ is the specific heat (J/(kg·K))
- $T$ is the temperature (K)
- $t$ is time (s)
- $k$ is the thermal conductivity (W/(m·K))
- $Q$ is the heat source term (W/m³)

### Plasma Heat Source

The plasma heat source is modeled as:

$$Q(r) = \frac{P \eta}{2\pi\sigma^2} \exp\left(-\frac{r^2}{2\sigma^2}\right)$$

Where:
- $P$ is the torch power (W)
- $\eta$ is the torch efficiency
- $r$ is the distance from the torch center (m)
- $\sigma$ is the dispersion parameter (m)

### Thermal Radiation

Heat transfer by radiation is modeled by the Stefan-Boltzmann law:

$$q_r = \varepsilon \sigma (T^4 - T_{amb}^4)$$

Where:
- $q_r$ is the radiative heat flux (W/m²)
- $\varepsilon$ is the surface emissivity
- $\sigma$ is the Stefan-Boltzmann constant (5.67×10⁻⁸ W/(m²·K⁴))
- $T$ is the surface temperature (K)
- $T_{amb}$ is the ambient temperature (K)

## Simulation Metrics

| Metric | Description | Unit |
|---------|-----------|---------|
| `maxTemperature` | Maximum temperature | K |
| `minTemperature` | Minimum temperature | K |
| `avgTemperature` | Average temperature | K |
| `maxGradient` | Maximum temperature gradient | K/m |
| `avgGradient` | Average temperature gradient | K/m |
| `maxHeatFlux` | Maximum heat flux | W/m² |
| `avgHeatFlux` | Average heat flux | W/m² |
| `totalEnergy` | Total energy in the system | J |
| `heatingRate` | Heating rate | K/s |
| `energyEfficiency` | Energy efficiency | % |

## Validation Metrics

| Metric | Description | Formula |
|---------|-----------|---------|
| `meanAbsoluteError` (MAE) | Mean Absolute Error | $\frac{1}{n}\sum_{i=1}^{n}|y_i-\hat{y}_i|$ |
| `meanSquaredError` (MSE) | Mean Squared Error | $\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2$ |
| `rootMeanSquaredError` (RMSE) | Root Mean Squared Error | $\sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}$ |
| `meanAbsolutePercentageError` (MAPE) | Mean Absolute Percentage Error | $\frac{100\%}{n}\sum_{i=1}^{n}\left\|\frac{y_i-\hat{y}_i}{y_i}\right\|$ |
| `rSquared` (R²) | Coefficient of Determination | $1-\frac{\sum_{i=1}^{n}(y_i-\hat{y}_i)^2}{\sum_{i=1}^{n}(y_i-\bar{y})^2}$ |

## Export Formats

### CSV (Comma-Separated Values)

Simple text format for tabular data:

```
x,y,z,temperature
0.1,0.0,0.1,350.5
0.2,0.0,0.1,375.2
...
```

### JSON (JavaScript Object Notation)

Structured format for hierarchical data:

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

Format for 3D scientific visualization:

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

## Plugin API

### Plugin Interface

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

### Creating a Custom Plugin

1. Implement the `SimulationPlugin` trait
2. Compile as a dynamic library (.dll/.so/.dylib)
3. Place the file in the plugins folder
4. Activate the plugin in the application settings

## Formula Language

### Basic Syntax

The formula language supports:

- Arithmetic operators: `+`, `-`, `*`, `/`, `^` (power)
- Mathematical functions: `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`
- Constants: `pi`, `e`
- User-defined variables
- Conditionals: `if(condition, true_value, false_value)`

### Examples

Gaussian heat source:
```
power * efficiency / (2 * pi * sigma^2) * exp(-r^2 / (2 * sigma^2))
```

Temperature-dependent thermal conductivity:
```
k_0 * (1 + alpha * (T - T_ref))
```

Variable emissivity:
```
if(T < T_transition, emissivity_low, emissivity_high)
```

## Project File Format

Projects are saved in the `.pfp` (Plasma Furnace Project) format, which is a ZIP file containing:

- `project.json`: Project metadata
- `simulation_parameters.json`: Simulation parameters
- `materials/`: Custom material definitions
- `formulas/`: Custom formulas
- `results/`: Simulation results
- `validation/`: Validation data
- `parametric_studies/`: Parametric study configurations and results

## Hardware Requirements for Complex Simulations

| Complexity | Mesh Cells | Recommended RAM | Recommended CPU | Estimated Time* |
|--------------|------------------|-----------------|-----------------|------------------|
| Low | < 50,000 | 8 GB | 4 cores | Minutes |
| Medium | 50,000 - 500,000 | 16 GB | 8 cores | Tens of minutes |
| High | 500,000 - 5,000,000 | 32 GB | 16+ cores | Hours |
| Very High | > 5,000,000 | 64+ GB | 32+ cores | Days |

*Estimated time for a simulation of 1 hour of real time

## Error Codes

| Code | Description | Solution |
|--------|-----------|----------|
| E001 | Invalid simulation parameters | Check parameter values |
| E002 | Mesh initialization failure | Reduce mesh size or increase available memory |
| E003 | Numerical instability detected | Reduce time step or use implicit solver |
| E004 | Convergence error | Increase maximum iterations or tolerance |
| E005 | Corrupted project file | Use a backup or create a new project |
| E006 | Data import error | Check data file format |
| E007 | Results export error | Check write permissions in the destination directory |
| E008 | Formula evaluation error | Check formula syntax |
| E009 | Plugin initialization error | Check plugin compatibility |
| E010 | 3D rendering error | Update graphics drivers or reduce visualization quality |

## Technical Glossary

| Term | Definition |
|-------|----------|
| **Advection** | Transport of a substance or property by a fluid due to the fluid's movement |
| **Conduction** | Heat transfer through a material without macroscopic movement of the material |
| **Convection** | Heat transfer due to fluid movement |
| **Thermal Diffusivity** | Property that characterizes the rate of heat diffusion through a material (k/ρcp) |
| **Discretization** | Process of converting continuous differential equations into discrete algebraic equations |
| **Navier-Stokes Equation** | Equations that describe fluid motion |
| **Isosurface** | Three-dimensional surface representing points of constant value |
| **Finite Volume Method** | Numerical technique for solving partial differential equations |
| **Courant Number** | Parameter relating time step to mesh size and phenomenon velocity |
| **Plasma** | State of matter composed of ionized gas |
| **Thermal Radiation** | Heat transfer by electromagnetic waves |
| **Transient Regime** | State where system properties vary with time |
| **Steady State Regime** | State where system properties do not vary with time |
| **Thermal Conductivity Tensor** | Representation of thermal conductivity in anisotropic materials |
| **Plasma Torch** | Device that generates a high-temperature plasma jet |



