# Requirements Document - Frontend Rebuild

## Introduction

This document defines the requirements for rebuilding the Plasma Furnace Simulator frontend from scratch with a simplified, focused approach. The goal is to create a clean, maintainable frontend that supports the core user flow: parameter input → simulation execution → 3D heatmap visualization. We will start with minimal functionality and build incrementally.

## Glossary

- **Plasma_Simulator**: The core Rust simulation engine (existing backend)
- **Frontend_Application**: The new Tauri-based user interface being rebuilt
- **Simulation_Parameters**: Essential input values needed to run a plasma furnace simulation
- **Heatmap_Visualization**: 3D visual representation of temperature distribution over time
- **Single_Torch_Configuration**: Simplified setup using only one plasma torch for initial implementation

## Requirements

### Requirement 1: Minimal Parameter Input Interface

**User Story:** As a researcher, I want a simple form to input essential simulation parameters, so that I can quickly configure a basic plasma furnace simulation.

#### Acceptance Criteria

1. WHEN I open the application, THE Frontend_Application SHALL display a clean parameter input form with only essential fields
2. WHEN I configure furnace geometry, THE Frontend_Application SHALL accept height (1.0-5.0m) and radius (0.5-2.0m) with validation
3. WHEN I set torch parameters, THE Frontend_Application SHALL accept power (50-300 kW), position (r, z coordinates), and efficiency (0.7-0.9)
4. WHEN I select material, THE Frontend_Application SHALL provide a dropdown with 3 basic materials (Steel, Aluminum, Concrete)
5. WHEN I set simulation time, THE Frontend_Application SHALL accept total duration (10-300 seconds) and time step (0.1-1.0 seconds)
6. WHEN I enter invalid values, THE Frontend_Application SHALL display clear error messages with valid ranges
7. WHEN all parameters are valid, THE Frontend_Application SHALL enable the "Run Simulation" button

### Requirement 2: Simple Simulation Execution

**User Story:** As a researcher, I want to start a simulation with one click and see progress, so that I can easily execute the thermal analysis.

#### Acceptance Criteria

1. WHEN I click "Run Simulation", THE Frontend_Application SHALL send parameters to the Plasma_Simulator backend
2. WHEN simulation starts, THE Frontend_Application SHALL display a progress indicator and disable parameter editing
3. WHEN simulation is running, THE Frontend_Application SHALL show estimated completion time
4. WHEN simulation completes, THE Frontend_Application SHALL receive temperature field data from the backend
5. WHEN simulation fails, THE Frontend_Application SHALL display error message and re-enable parameter editing
6. WHEN I want to cancel, THE Frontend_Application SHALL provide a "Cancel" button that stops the simulation

### Requirement 3: Basic 3D Heatmap Display

**User Story:** As a researcher, I want to see a 3D heatmap of temperature distribution, so that I can visualize the heat propagation in the furnace.

#### Acceptance Criteria

1. WHEN simulation completes, THE Frontend_Application SHALL display a 3D cylindrical heatmap using the temperature data
2. WHEN I interact with the 3D view, THE Frontend_Application SHALL support basic rotation, zoom, and pan operations
3. WHEN I hover over the heatmap, THE Frontend_Application SHALL display temperature values at that point
4. WHEN I adjust the color scale, THE Frontend_Application SHALL update the heatmap colors to match temperature ranges
5. WHEN rendering fails, THE Frontend_Application SHALL display an error message and suggest reducing mesh resolution

### Requirement 4: Time Animation Controls

**User Story:** As a researcher, I want to animate the temperature evolution over time, so that I can observe how heat propagates through the furnace.

#### Acceptance Criteria

1. WHEN simulation data is loaded, THE Frontend_Application SHALL provide play/pause controls for time animation
2. WHEN I press play, THE Frontend_Application SHALL animate through time steps showing temperature evolution
3. WHEN I use the time slider, THE Frontend_Application SHALL jump to specific time points in the simulation
4. WHEN I adjust animation speed, THE Frontend_Application SHALL change playback rate (0.5x to 4x speed)
5. WHEN animation reaches the end, THE Frontend_Application SHALL automatically pause and reset to beginning

### Requirement 5: Clean State Management

**User Story:** As a developer, I want predictable state management, so that the application behavior is reliable and maintainable.

#### Acceptance Criteria

1. WHEN the application starts, THE Frontend_Application SHALL initialize with default parameter values and empty simulation state
2. WHEN parameters change, THE Frontend_Application SHALL update only the parameter state without affecting simulation data
3. WHEN simulation runs, THE Frontend_Application SHALL transition to "running" state and preserve parameter values
4. WHEN simulation completes, THE Frontend_Application SHALL transition to "results" state with visualization data
5. WHEN I start a new simulation, THE Frontend_Application SHALL clear previous results and reset to parameter input state
6. IF state becomes inconsistent, THE Frontend_Application SHALL reset to initial state and log the error

### Requirement 6: Responsive UI Layout

**User Story:** As a researcher, I want a clean, organized interface, so that I can efficiently work with the simulation tools.

#### Acceptance Criteria

1. WHEN I view the application, THE Frontend_Application SHALL display parameters on the left and visualization on the right
2. WHEN the window is resized, THE Frontend_Application SHALL maintain usable proportions for both panels
3. WHEN simulation is not running, THE Frontend_Application SHALL show parameter form prominently
4. WHEN simulation results are available, THE Frontend_Application SHALL emphasize the visualization area
5. WHEN on smaller screens, THE Frontend_Application SHALL stack panels vertically while maintaining functionality

### Requirement 7: Bug Fixes and State Management Improvements

**User Story:** As a researcher, I want the application to work correctly without bugs, so that I can reliably run simulations and view results.

#### Acceptance Criteria

1. WHEN the application starts with default parameters, THE Frontend_Application SHALL enable the "Run Simulation" button without requiring parameter changes
2. WHEN I click the Play button, THE Frontend_Application SHALL start or pause the animation
3. WHEN simulation completes and animation loads, THE Frontend_Application SHALL automatically start playing the animation
4. WHEN I enter an invalid parameter value and then correct it, THE Frontend_Application SHALL clear the error state and enable simulation
5. WHEN I have simulation results displayed, THE Frontend_Application SHALL allow me to run a new simulation with updated parameters
6. WHEN I change parameter values after a simulation, THE Frontend_Application SHALL use the new values for the next simulation run
7. WHEN I view the 3D heatmap, THE Frontend_Application SHALL display a closed cylinder with top and bottom caps
8. WHEN I view the 3D heatmap, THE Frontend_Application SHALL show the torch as a point inside the cylinder
9. WHEN I view the 3D heatmap, THE Frontend_Application SHALL display 3D heat propagation throughout the cylinder volume, not just on the walls

## Non-Functional Requirements

### Performance Requirements
- **UI Responsiveness**: <100ms response to user interactions
- **3D Rendering**: 30+ FPS for basic heatmap visualization
- **Memory Usage**: <1GB for typical simulations
- **Startup Time**: <3 seconds to fully loaded interface

### Usability Requirements
- **Learning Curve**: New users can run simulation within 5 minutes
- **Error Handling**: Clear, actionable error messages for all failure cases
- **Visual Feedback**: Immediate feedback for all user actions
- **Accessibility**: Keyboard navigation and screen reader compatibility

### Technical Requirements
- **Framework**: Tauri v2 with HTML/CSS/JavaScript frontend
- **State Management**: Simple, predictable state transitions
- **Backend Integration**: Clean API communication with existing Rust simulation engine
- **Cross-platform**: Windows and macOS compatibility
- **Code Quality**: Modular, maintainable code structure