# Design Document - Frontend Rebuild

## Overview

This design document outlines the architecture for rebuilding the Plasma Furnace Simulator frontend from scratch. The new frontend will be built using Tauri v2 with a clean HTML/CSS/JavaScript stack, focusing on simplicity, maintainability, and predictable state management.

The design emphasizes a minimal viable product approach, starting with essential functionality and building incrementally. The existing Rust simulation backend will remain unchanged, with the new frontend communicating through well-defined Tauri commands.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Tauri WebView)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Parameters    │  │   Simulation    │  │  Visualization  │ │
│  │     Panel       │  │    Controls     │  │     Panel       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    State Management Layer                   │
├─────────────────────────────────────────────────────────────┤
│                    Tauri Command Interface                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Rust Backend (Existing)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Simulation    │  │     Physics     │  │   Data Export   │ │
│  │     Engine      │  │     Models      │  │   & Results     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### State Management Architecture

The application will use a simple, predictable state machine with clear transitions:

```
┌─────────────┐    validate params    ┌─────────────┐
│   INITIAL   │ ──────────────────── ▶│   READY     │
│  (loading)  │                       │ (can run)   │
└─────────────┘                       └─────────────┘
                                              │
                                              │ run simulation
                                              ▼
┌─────────────┐    simulation done    ┌─────────────┐
│   RESULTS   │ ◀──────────────────── │   RUNNING   │
│(visualizing)│                       │ (progress)  │
└─────────────┘                       └─────────────┘
       │                                      │
       │ new simulation                       │ cancel/error
       └──────────────────────────────────────┘
```

## Components and Interfaces

### 1. Application Shell (`app.js`)

**Responsibility**: Main application initialization and state coordination

**Key Functions**:
- Initialize application state
- Coordinate between components
- Handle global error states
- Manage application lifecycle

**Interface**:
```javascript
class App {
  constructor()
  init()
  setState(newState)
  getState()
  handleError(error)
}
```

### 2. Parameter Panel (`parameters.js`)

**Responsibility**: Handle all simulation parameter input and validation

**Key Functions**:
- Render parameter input form
- Validate input values in real-time
- Emit parameter change events
- Display validation errors

**Interface**:
```javascript
class ParameterPanel {
  constructor(container, eventBus)
  render()
  getParameters()
  setParameters(params)
  validate()
  onParameterChange(callback)
}
```

**Parameter Structure**:
```javascript
{
  furnace: {
    height: 2.0,      // meters (1.0-5.0)
    radius: 1.0       // meters (0.5-2.0)
  },
  torch: {
    power: 150,       // kW (50-300)
    position: {
      r: 0.0,         // radial position (0-radius)
      z: 1.0          // axial position (0-height)
    },
    efficiency: 0.8   // (0.7-0.9)
  },
  material: "Steel",  // "Steel" | "Aluminum" | "Concrete"
  simulation: {
    duration: 60,     // seconds (10-300)
    timeStep: 0.5     // seconds (0.1-1.0)
  }
}
```

### 3. Simulation Controller (`simulation.js`)

**Responsibility**: Manage simulation execution and progress tracking

**Key Functions**:
- Execute simulation via Tauri commands
- Track simulation progress
- Handle simulation cancellation
- Manage simulation state transitions

**Interface**:
```javascript
class SimulationController {
  constructor(eventBus)
  async runSimulation(parameters)
  cancelSimulation()
  getProgress()
  onProgressUpdate(callback)
  onComplete(callback)
  onError(callback)
}
```

### 4. Visualization Panel (`visualization.js`)

**Responsibility**: Render 3D heatmap and animation controls

**Key Functions**:
- Initialize 3D rendering context
- Render temperature heatmap
- Handle user interactions (rotate, zoom, pan)
- Manage time animation
- Display temperature values on hover

**Interface**:
```javascript
class VisualizationPanel {
  constructor(container, eventBus)
  loadData(simulationResults)
  render()
  setTimeStep(timeIndex)
  playAnimation()
  pauseAnimation()
  setAnimationSpeed(speed)
  onHover(callback)
}
```

### 5. Event Bus (`eventBus.js`)

**Responsibility**: Coordinate communication between components

**Key Events**:
- `parameters:changed` - Parameter values updated
- `parameters:validated` - Validation state changed
- `simulation:start` - Simulation execution begins
- `simulation:progress` - Progress update received
- `simulation:complete` - Simulation finished successfully
- `simulation:error` - Simulation failed
- `visualization:loaded` - 3D scene ready
- `animation:play/pause` - Animation state changed

**Interface**:
```javascript
class EventBus {
  on(event, callback)
  off(event, callback)
  emit(event, data)
}
```

## Data Models

### Simulation Parameters Model

```javascript
class SimulationParameters {
  constructor(params = {}) {
    this.furnace = { height: 2.0, radius: 1.0, ...params.furnace }
    this.torch = { 
      power: 150, 
      position: { r: 0.0, z: 1.0 }, 
      efficiency: 0.8,
      ...params.torch 
    }
    this.material = params.material || "Steel"
    this.simulation = { 
      duration: 60, 
      timeStep: 0.5, 
      ...params.simulation 
    }
  }

  validate() {
    const errors = []
    // Validation logic
    return { isValid: errors.length === 0, errors }
  }

  toJSON() {
    return { furnace: this.furnace, torch: this.torch, material: this.material, simulation: this.simulation }
  }
}
```

### Application State Model

```javascript
class AppState {
  constructor() {
    this.phase = 'INITIAL'  // INITIAL | READY | RUNNING | RESULTS
    this.parameters = new SimulationParameters()
    this.simulation = {
      progress: 0,
      estimatedTime: null,
      results: null
    }
    this.visualization = {
      currentTime: 0,
      isPlaying: false,
      animationSpeed: 1.0
    }
    this.errors = []
  }

  canRunSimulation() {
    return this.phase === 'READY' && this.parameters.validate().isValid
  }

  transition(newPhase, data = {}) {
    const validTransitions = {
      'INITIAL': ['READY'],
      'READY': ['RUNNING'],
      'RUNNING': ['RESULTS', 'READY'],
      'RESULTS': ['READY']
    }
    
    if (validTransitions[this.phase]?.includes(newPhase)) {
      this.phase = newPhase
      Object.assign(this, data)
      return true
    }
    return false
  }
}
```

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid parameter values
2. **Simulation Errors**: Backend computation failures
3. **Rendering Errors**: 3D visualization failures
4. **Communication Errors**: Tauri command failures

### Error Handling Strategy

```javascript
class ErrorHandler {
  static handle(error, context) {
    const errorInfo = {
      type: error.type || 'unknown',
      message: error.message,
      context: context,
      timestamp: new Date().toISOString()
    }

    // Log error
    console.error('Application Error:', errorInfo)

    // Display user-friendly message
    switch (error.type) {
      case 'validation':
        return `Invalid ${error.field}: ${error.message}`
      case 'simulation':
        return `Simulation failed: ${error.message}. Please check parameters and try again.`
      case 'rendering':
        return `Visualization error: ${error.message}. Try reducing mesh resolution.`
      default:
        return `An unexpected error occurred: ${error.message}`
    }
  }
}
```

## Testing Strategy

### Unit Testing
- **Parameter validation logic**: Test all validation rules and edge cases
- **State transitions**: Verify state machine behavior
- **Data models**: Test serialization and validation methods
- **Event bus**: Test event emission and subscription

### Integration Testing
- **Tauri command integration**: Test backend communication
- **Component interaction**: Test event flow between components
- **End-to-end workflows**: Test complete user scenarios

### Manual Testing Approach
- **Immediate visual feedback**: Each component renders basic UI immediately
- **Incremental development**: Test each feature as it's built
- **Progressive enhancement**: Start with basic functionality, add features iteratively

## File Structure

```
src-tauri/ui/
├── index.html              # Main application page
├── css/
│   ├── main.css           # Global styles and layout
│   ├── components/
│   │   ├── parameters.css # Parameter panel styles
│   │   ├── controls.css   # Simulation controls
│   │   └── visualization.css # 3D visualization area
│   └── design-system/
│       ├── variables.css  # CSS custom properties
│       └── layout.css     # Grid and flexbox utilities
├── js/
│   ├── main.js           # Application entry point
│   ├── core/
│   │   ├── app.js        # Main application class
│   │   ├── eventBus.js   # Event coordination
│   │   ├── state.js      # State management
│   │   └── errors.js     # Error handling
│   ├── components/
│   │   ├── parameters.js # Parameter input panel
│   │   ├── simulation.js # Simulation controller
│   │   └── visualization.js # 3D rendering
│   └── models/
│       ├── parameters.js # Parameter data model
│       └── results.js    # Simulation results model
└── assets/
    └── icons/            # UI icons and graphics
```

## Implementation Phases

### Phase 1: Basic Structure
1. Create HTML layout with parameter and visualization panels
2. Implement basic CSS styling and responsive layout
3. Set up event bus and state management
4. Create parameter input form with validation

### Phase 2: Backend Integration
1. Implement Tauri command interface
2. Add simulation execution and progress tracking
3. Handle simulation results data
4. Implement error handling and user feedback

### Phase 3: 3D Visualization
1. Set up 3D rendering context (Three.js or WebGL)
2. Implement basic cylindrical heatmap rendering
3. Add user interaction (rotate, zoom, pan)
4. Display temperature values on hover

### Phase 4: Animation and Polish
1. Implement time animation controls
2. Add playback speed control
3. Improve visual design and user experience
4. Add keyboard shortcuts and accessibility features

## Performance Considerations

### Rendering Optimization
- Use efficient 3D rendering techniques (instanced geometry, texture atlases)
- Implement level-of-detail for large meshes
- Cache rendered frames for smooth animation playback

### Memory Management
- Limit simulation data retention (keep only current and adjacent time steps)
- Use efficient data structures for temperature field storage
- Implement garbage collection for unused visualization objects

### Responsiveness
- Use requestAnimationFrame for smooth animations
- Debounce parameter validation to avoid excessive computation
- Implement progressive loading for large datasets