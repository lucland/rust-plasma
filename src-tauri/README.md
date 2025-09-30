# Plasma Furnace Simulator - Desktop Application

This is the Tauri-based desktop application for the Plasma Furnace Simulator.

## Development

### Prerequisites
- Rust (latest stable)
- Node.js (for Tauri CLI)
- Tauri CLI: `cargo install tauri-cli`

### Running in Development Mode
```bash
cd src-tauri
cargo tauri dev
```

### Building for Production
```bash
cd src-tauri
cargo tauri build
```

### Testing Commands
Open `ui/test.html` in the Tauri app to test individual commands.

## Features Implemented

### Tauri Commands
- `get_parameters` - Get current simulation parameters
- `save_parameters` - Save simulation parameters
- `load_parameter_template` - Load parameter templates
- `start_simulation` - Start a simulation
- `stop_simulation` - Stop a running simulation
- `get_progress` - Get simulation progress
- `get_simulation_status` - Get detailed simulation status
- `get_simulation_results` - Get simulation results
- `update_geometry` - Update furnace geometry
- `get_debug_state` - Get application debug state

### UI Features
- Parameter input forms (geometry, torches, materials, etc.)
- Simulation control buttons
- 3D visualization placeholder
- Project save/load functionality
- Tab-based navigation
- Status updates and progress indication

## Architecture

### Backend (Rust)
- `src/lib.rs` - Main application setup and menu system
- `src/simulation.rs` - Simulation control commands
- `src/parameters.rs` - Parameter management
- `src/state.rs` - Application state management

### Frontend (HTML/CSS/JS)
- `ui/index.html` - Main application interface
- `ui/css/` - Modular CSS organization
- `ui/js/` - JavaScript modules for features
- `ui/js/core/api.js` - Backend API wrapper
- `ui/js/main.js` - Application initialization

## Next Steps

This implementation provides the foundation for:
1. 3D heat visualization (Task 8)
2. Enhanced parameter configuration (Task 9)
3. Simulation playback controls (Task 10)
4. Project management features (Task 11)