# Design Document

## Overview

**CRITICAL FINDING**: The Rust backend already implements comprehensive physics-based simulation with:
- `physics.rs`: Gaussian torch heat distribution, radiation/convection losses
- `materials.rs`: Temperature-dependent properties for 10+ materials with thermal diffusivity
- `solver.rs`: Forward Euler solver with CFL stability checks
- `mesh.rs`: Cylindrical coordinate system with proper volume/area calculations
- `simulation.rs`: Tauri commands for running simulations

**The frontend is currently bypassing this backend and using mock JavaScript data.** This design focuses on **integrating the existing Rust backend** rather than reimplementing physics in JavaScript. The solution involves:
1. Removing mock simulation code from frontend
2. Properly calling Tauri backend commands
3. Handling real simulation results and progress updates
4. Maintaining coordinate transformation between UI (normalized 0-1) and backend (absolute meters)

## Architecture

### Component Structure

```
Frontend (JavaScript)
├── SimulationController (simulation.js)
│   ├── runSimulation() - Call Tauri backend
│   ├── handleProgressUpdates() - Listen to backend events
│   └── transformParameters() - Convert UI params to backend format
│
Backend (Rust - Already Implemented)
├── simulation.rs (Tauri commands)
│   ├── run_simulation() - Start simulation
│   ├── get_simulation_progress() - Progress updates
│   └── get_simulation_results() - Retrieve results
├── physics.rs
│   ├── PlasmaTorch::calculate_heat_flux() - Gaussian distribution
│   └── PlasmaPhysics::calculate_heat_source() - Multi-torch superposition
├── materials.rs
│   ├── MaterialLibrary - 10+ materials with thermal properties
│   └── Property::evaluate() - Temperature-dependent properties
├── solver.rs
│   ├── HeatSolver::solve_time_step() - Forward Euler method
│   └── calculate_stable_timestep() - CFL condition
└── mesh.rs
    └── CylindricalMesh - Coordinate system and geometry
```

### Key Design Decisions

**1. Use Existing Rust Backend (NOT JavaScript Mock)**
- **Rationale**: Backend already implements production-quality physics
- **Benefit**: Accurate physics, better performance, maintainable code
- **Change**: Remove `generateMockTemperatureData()` and call Tauri commands instead

**2. Coordinate System Architecture**
- **UI Layer**: Normalized coordinates (0-1) for user input
- **Backend Layer**: Absolute coordinates (meters) for physics calculations
- **Transformation**: Frontend converts normalized → absolute before sending to backend
- **Already Implemented**: Backend `convert_parameters_to_config()` handles this

**3. Real-Time Progress Updates**
- Backend emits `simulation-progress` events via Tauri
- Frontend listens and updates UI progress bar
- Simulation runs asynchronously in Rust (tokio tasks)

**4. Result Handling**
- Backend stores temperature field data
- Frontend requests results via `get_simulation_results()`
- Visualization panel renders real physics data

## Components and Interfaces

### 1. Backend Integration (Rust - Already Implemented)

**Material Properties** (`materials.rs`):
- `MaterialLibrary::get_material(name)` - Returns material with thermal properties
- Supports: Carbon Steel, Stainless Steel, Aluminum, Copper, Iron, Graphite, Concrete, Glass, Wood, Ceramic
- Temperature-dependent properties via formulas: `k(T)`, `cp(T)`
- Thermal diffusivity calculated as: `α = k / (ρ * cp)`

**Physics Engine** (`physics.rs`):
- `PlasmaTorch::calculate_heat_flux(r, z)` - Gaussian heat distribution
  ```rust
  Q(r) = (P * η) / (2π * σ²) * exp(-d²/(2σ²))
  ```
- `PlasmaPhysics::calculate_heat_source(r, z)` - Multi-torch superposition
- `calculate_radiation_loss(T)` - Stefan-Boltzmann law
- `calculate_convection_loss(T)` - Newton's law of cooling

**Solver** (`solver.rs`):
- `HeatSolver::solve_time_step()` - Forward Euler method
- `calculate_stable_timestep()` - CFL condition: `Δt ≤ min(Δr², Δz²) / (2α)`
- Implements heat equation in cylindrical coordinates:
  ```
  ∂T/∂t = α * [1/r * ∂/∂r(r * ∂T/∂r) + ∂²T/∂z²] + Q/(ρ*cp)
  ```

**Mesh** (`mesh.rs`):
- `CylindricalMesh::new(radius, height, nr, nz)` - Create mesh
- Proper cylindrical coordinate system with volume/area calculations
- Boundary type detection (Axis, OuterWall, Bottom, Top, Interior)

### 2. Frontend SimulationController Updates

**Remove Mock Simulation**:
```javascript
// DELETE: generateMockTemperatureData()
// DELETE: createMockResults()
// DELETE: All mock physics calculations
```

**Add Backend Integration**:
```javascript
class SimulationController {
    async runSimulation(parameters, options) {
        // 1. Transform parameters (already implemented)
        const backendParams = this.transformParameters(parameters);
        
        // 2. Call Tauri backend
        const result = await window.__TAURI__.invoke('run_simulation', {
            parameters: backendParams
        });
        
        // 3. Store simulation ID
        this.currentSimulation = {
            id: result.simulation_id,
            parameters: parameters,
            startTime: new Date(),
            status: 'running'
        };
        
        // 4. Listen for progress updates
        this.setupProgressListener();
        
        return result;
    }
    
    setupProgressListener() {
        window.__TAURI__.event.listen('simulation-progress', (event) => {
            const { simulation_id, progress } = event.payload;
            
            if (simulation_id === this.currentSimulation?.id) {
                this.updateProgress(progress);
                this.eventBus.emit('simulation:progress', progress);
            }
        });
        
        window.__TAURI__.event.listen('simulation-completed', (event) => {
            const { simulation_id, results } = event.payload;
            
            if (simulation_id === this.currentSimulation?.id) {
                this.handleSimulationCompletion(results);
            }
        });
    }
    
    async getSimulationResults(simulationId) {
        const results = await window.__TAURI__.invoke('get_simulation_results', {
            simulationId: simulationId
        });
        
        return this.processResults(results);
    }
    
    processResults(rawResults) {
        // Convert backend results to visualization format
        return {
            duration: rawResults.metadata.total_time,
            timeSteps: this.extractTimeSteps(rawResults),
            temperatureData: rawResults.temperature.data,
            metadata: rawResults.metadata
        };
    }
}
```

### 3. Parameter Transformation (Already Implemented)

The `transformParameters()` method already converts normalized coordinates to absolute:

```javascript
transformParameters(frontendParams) {
    const furnaceHeight = frontendParams.furnace?.height || 2.0;
    const furnaceRadius = frontendParams.furnace?.radius || 1.0;
    
    // Convert normalized torch position (0-1) to absolute (meters)
    const normalizedR = frontendParams.torch?.position?.r || 0;
    const normalizedZ = frontendParams.torch?.position?.z || 0.5;
    const absoluteR = normalizedR * furnaceRadius;
    const absoluteZ = normalizedZ * furnaceHeight;
    
    return {
        geometry: {
            cylinder_height: furnaceHeight,
            cylinder_radius: furnaceRadius
        },
        torches: {
            torches: [{
                position: { r: absoluteR, z: absoluteZ },
                power: frontendParams.torch?.power || 150,
                efficiency: frontendParams.torch?.efficiency || 0.8
            }]
        },
        material: frontendParams.material || "Steel",
        simulation: {
            total_time: frontendParams.simulation?.duration || 60,
            time_step: frontendParams.simulation?.timeStep || 0.5
        }
    };
}
```

## Data Models

### Coordinate Representation

```javascript
// Normalized coordinates (UI/Visualization)
interface NormalizedPosition {
    r: number;  // 0 (center) to 1 (edge)
    z: number;  // 0 (bottom) to 1 (top)
}

// Absolute coordinates (Physics calculations)
interface AbsolutePosition {
    r: number;  // meters from center axis
    z: number;  // meters from bottom
}

// Furnace geometry
interface FurnaceGeometry {
    radius: number;  // meters
    height: number;  // meters
}
```

### Temperature Field Data

```javascript
interface TemperatureField {
    timeSteps: Array<{
        time: number;           // seconds
        temperatures: number[]; // Kelvin, flattened 2D grid
    }>;
    gridSize: number;          // grid resolution (e.g., 10x10)
    metadata: {
        material: string;
        torchPosition: NormalizedPosition;
        furnaceGeometry: FurnaceGeometry;
    };
}
```

## Error Handling

### Validation Checks

1. **Coordinate Bounds**:
   - Normalized coordinates must be in [0, 1]
   - Absolute coordinates must be within furnace geometry
   - Throw error if out of bounds

2. **Physical Constraints**:
   - Temperature must be ≥ 0 Kelvin
   - Time must be > 0 (use small epsilon for t=0)
   - Power must be > 0
   - Efficiency must be in [0, 1]

3. **Numerical Stability**:
   - Check for NaN/Infinity in calculations
   - Clamp temperatures to material limits
   - Handle division by zero in diffusion equation

### Error Recovery

```javascript
try {
    temperature = physicsEngine.calculateTemperature(...);
} catch (error) {
    console.error('Physics calculation failed:', error);
    // Fallback to ambient temperature
    temperature = 300;
}

// Clamp to physical limits
temperature = Math.max(
    materialProps.getTemperatureLimits()[0],
    Math.min(temperature, materialProps.getTemperatureLimits()[1])
);
```

## Testing Strategy

### Unit Tests

1. **MaterialProperties**:
   - Verify correct thermal diffusivity for each material
   - Verify temperature limits are reasonable
   - Test invalid material names

2. **PhysicsEngine**:
   - Test coordinate transformations (normalized ↔ absolute)
   - Test distance calculations in cylindrical coordinates
   - Test heat diffusion formula with known values
   - Test boundary condition application

3. **Coordinate Transformations**:
   - Test round-trip: normalized → absolute → normalized
   - Test edge cases (0, 1, 0.5)
   - Test with different furnace geometries

### Integration Tests

1. **Torch Position Accuracy**:
   - Set torch at (0, 0.5), verify hottest point is at center-middle
   - Set torch at (1, 1), verify hottest point is at edge-top
   - Change position, verify heat source moves

2. **Physics-Based Diffusion**:
   - Run simulation with 4m furnace, measure heat spread
   - Run simulation with 2m furnace, verify same absolute spread
   - Verify heat spread increases with sqrt(time)

3. **Material Differences**:
   - Run identical simulations with Steel, Aluminum, Concrete
   - Verify Aluminum heats faster than Steel faster than Concrete
   - Verify temperature limits are respected

### Visual Validation

1. **Heat Source Location**:
   - Visual inspection: hottest region matches torch position
   - Color map: peak temperature at correct coordinates

2. **Heat Spread Pattern**:
   - Visual inspection: circular/spherical diffusion pattern
   - Time evolution: smooth outward propagation

3. **Material Behavior**:
   - Visual comparison: different spread rates for materials
   - Boundary effects: heat loss near walls

## Performance Considerations

### Computational Complexity

- Grid size: 10×10 = 100 points per time step
- Time steps: ~120 for 60-second simulation
- Total calculations: ~12,000 temperature evaluations
- Target: < 100ms total generation time

### Optimization Strategies

1. **Pre-computation**:
   - Calculate material properties once
   - Pre-compute furnace geometry factors
   - Cache torch absolute position

2. **Numerical Efficiency**:
   - Use fast exponential approximations if needed
   - Minimize sqrt() calls
   - Reuse distance calculations

3. **Grid Resolution**:
   - 10×10 grid balances quality vs. performance
   - Can be made configurable for future enhancement

### Memory Usage

- Temperature data: ~12,000 floats × 8 bytes = ~96 KB
- Acceptable for browser memory constraints
- No memory leaks in generation loop

## Implementation Notes

### File Organization

```
src-tauri/ui/js/
├── components/
│   └── simulation.js (updated)
├── physics/ (new)
│   ├── MaterialProperties.js
│   ├── PhysicsEngine.js
│   └── constants.js
└── utils/
    └── coordinates.js (coordinate transformation utilities)
```

### Backward Compatibility

- Existing parameter structure unchanged
- Existing API interfaces maintained
- Graceful fallback if physics engine fails
- Console warnings for deprecated behavior

### Future Enhancements

1. **3D Grid**: Extend to full 3D volumetric grid (r, θ, z)
2. **Multiple Torches**: Support multiple heat sources
3. **Phase Changes**: Model melting/vaporization
4. **Convection**: Add convective heat transfer
5. **Radiation**: Include radiative heat loss
6. **Real Backend**: Replace mock with actual Rust simulation

## Validation Criteria

### Acceptance Tests

1. ✅ Torch at (0.5, 0.5) shows heat at 50% radius, 50% height
2. ✅ 4m furnace and 2m furnace show same absolute heat spread (meters)
3. ✅ Aluminum heats faster than Steel heats faster than Concrete
4. ✅ Heat spreads proportionally to sqrt(time)
5. ✅ Temperatures stay within physical limits
6. ✅ No console errors during generation
7. ✅ Generation completes in < 100ms

### Physics Validation

Compare against analytical solution for point heat source:
```
T(r,t) = T₀ + Q/(4παt)^(3/2) * exp(-r²/(4αt))
```

Verify:
- Peak temperature location matches torch position
- Temperature decay with distance follows exponential
- Time evolution follows diffusion equation
- Material differences match thermal diffusivity ratios
