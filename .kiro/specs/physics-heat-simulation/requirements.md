# Requirements Document

## Introduction

This specification addresses critical physics accuracy issues in the Plasma Furnace Simulator's heat propagation visualization. **Analysis reveals that the frontend is using mock JavaScript data instead of calling the production-ready Rust backend simulation engine.** The Rust backend already implements proper physics-based calculations including:
- Gaussian heat distribution from torch positions
- Material-specific thermal diffusivity
- Cylindrical coordinate system with proper boundary conditions
- Forward Euler solver with CFL stability

The current mock simulation does not accurately represent real-world physics, specifically: (1) torch position parameters are not affecting heat source location, and (2) heat spread is relative to furnace dimensions rather than absolute physical distances. **The solution is to integrate the existing Rust backend instead of creating a new JavaScript physics engine.**

## Glossary

- **Heat Simulator**: The frontend JavaScript component that generates mock temperature data for visualization when the Rust backend is unavailable
- **Torch Position**: The 3D coordinates (r, z) of the plasma torch heat source, normalized to 0-1 range where r=0 is center, r=1 is edge, z=0 is bottom, z=1 is top
- **Heat Diffusion**: The physical process by which thermal energy spreads through a medium over time
- **Thermal Diffusivity**: A material property (α) that determines how quickly heat spreads, measured in m²/s
- **Absolute Distance**: Physical distance measured in meters, independent of furnace geometry
- **Normalized Coordinates**: Position values scaled to 0-1 range relative to furnace dimensions
- **Temperature Field**: The 3D distribution of temperature values throughout the furnace volume at a given time
- **Time Step**: A discrete moment in the simulation timeline

## Requirements

### Requirement 1: Torch Position Accuracy

**User Story:** As a researcher, I want the heat source to appear at the exact position I specify using the torch position parameters, so that I can study how torch placement affects heating patterns.

#### Acceptance Criteria

1. WHEN the user sets torch position r=0.0 and z=0.5, THE Heat Simulator SHALL generate temperature data with maximum heat at the center (r=0) and middle height (z=0.5)

2. WHEN the user sets torch position r=0.5 and z=0.25, THE Heat Simulator SHALL generate temperature data with maximum heat at 50% radius and 25% height

3. WHEN the user sets torch position r=1.0 and z=1.0, THE Heat Simulator SHALL generate temperature data with maximum heat at the edge (r=1.0) and top (z=1.0)

4. WHEN the user changes torch position parameters, THE Heat Simulator SHALL recalculate the temperature field with the heat source at the new position

5. WHEN visualizing temperature data, THE System SHALL display the hottest region at the specified torch coordinates

### Requirement 2: Physics-Based Heat Diffusion

**User Story:** As a materials scientist, I want heat to spread according to real thermal diffusion physics with absolute distances in meters, so that simulation results are comparable to laboratory experiments regardless of furnace size.

#### Acceptance Criteria

1. WHEN calculating heat propagation, THE Heat Simulator SHALL use absolute distances in meters rather than normalized coordinates

2. WHEN the furnace height is 4 meters and simulation runs for 60 seconds, THE Heat Simulator SHALL spread heat approximately 2 meters from the source (based on thermal diffusivity)

3. WHEN the furnace height is changed to 2 meters with identical torch power and duration, THE Heat Simulator SHALL spread heat the same absolute distance (approximately 2 meters) from the source

4. WHEN torch power is increased, THE Heat Simulator SHALL increase the maximum temperature but maintain physics-based diffusion rates

5. WHEN simulation duration is doubled, THE Heat Simulator SHALL increase heat spread distance proportionally to sqrt(time) according to diffusion physics

### Requirement 3: Material-Dependent Thermal Properties

**User Story:** As a thermal engineer, I want different materials to exhibit their characteristic thermal diffusivity values, so that I can accurately model heating behavior for steel, aluminum, and concrete.

#### Acceptance Criteria

1. WHEN material is set to Steel, THE Heat Simulator SHALL use thermal diffusivity α ≈ 1.2×10⁻⁵ m²/s for heat spread calculations

2. WHEN material is set to Aluminum, THE Heat Simulator SHALL use thermal diffusivity α ≈ 9.7×10⁻⁵ m²/s for heat spread calculations

3. WHEN material is set to Concrete, THE Heat Simulator SHALL use thermal diffusivity α ≈ 5.0×10⁻⁷ m²/s for heat spread calculations

4. WHEN comparing identical simulations with different materials, THE Heat Simulator SHALL show faster heat spread for materials with higher thermal diffusivity

5. WHEN displaying results, THE System SHALL indicate which material properties were used in the simulation

### Requirement 4: Time-Dependent Heat Evolution

**User Story:** As a process engineer, I want to see realistic time-dependent heating patterns that follow the heat equation, so that I can predict heating times for different process conditions.

#### Acceptance Criteria

1. WHEN simulation time is t=0, THE Heat Simulator SHALL show heat concentrated only at the torch position

2. WHEN simulation progresses, THE Heat Simulator SHALL show heat spreading outward from the torch following the diffusion equation

3. WHEN calculating temperature at distance r from torch at time t, THE Heat Simulator SHALL use the relationship T ∝ exp(-r²/(4αt)) where α is thermal diffusivity

4. WHEN simulation reaches steady state, THE Heat Simulator SHALL show temperature gradients that reflect continuous heat input and boundary losses

5. WHEN animation plays, THE System SHALL display smooth temporal evolution of the temperature field

### Requirement 5: Coordinate System Consistency

**User Story:** As a developer maintaining the codebase, I want clear separation between normalized UI coordinates (0-1) and absolute physical coordinates (meters), so that coordinate transformations are correct and maintainable.

#### Acceptance Criteria

1. WHEN user inputs torch position, THE System SHALL store values in normalized coordinates (0-1 range)

2. WHEN calculating heat diffusion, THE Heat Simulator SHALL convert normalized coordinates to absolute meters using furnace dimensions

3. WHEN computing distance between two points, THE Heat Simulator SHALL use absolute metric distances in meters

4. WHEN logging debug information, THE System SHALL clearly label whether coordinates are normalized or absolute

5. WHEN parameters change, THE System SHALL correctly transform coordinates through all calculation stages

### Requirement 6: Validation Against Physical Limits

**User Story:** As a quality assurance engineer, I want the simulation to respect physical constraints and produce reasonable temperature values, so that results are scientifically credible.

#### Acceptance Criteria

1. WHEN calculating temperatures, THE Heat Simulator SHALL ensure all values remain between ambient temperature (300K) and plasma temperature (≤10,000K)

2. WHEN torch is at maximum power, THE Heat Simulator SHALL produce peak temperatures consistent with plasma torch capabilities

3. WHEN heat spreads to furnace boundaries, THE Heat Simulator SHALL apply appropriate boundary conditions (e.g., heat loss to environment)

4. WHEN simulation completes, THE System SHALL validate that total energy is conserved within acceptable numerical error

5. WHEN displaying results, THE System SHALL flag any physically unrealistic temperature values or gradients
