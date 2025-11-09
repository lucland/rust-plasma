# Implementation Plan

## CRITICAL FINDING
The Rust backend already implements production-quality physics simulation. The frontend is bypassing it and using mock data. **Solution: Integrate the existing backend, don't reimplement physics in JavaScript.**

- [x] 1. Remove mock simulation code from frontend
  - Delete `generateMockTemperatureData()` method from `SimulationController`
  - Delete `createMockResults()` method
  - Remove all mock physics calculations and temperature generation logic
  - Keep `transformParameters()` method (already correctly converts normalized to absolute coordinates)
  - _Requirements: All - Foundation for using real backend_

- [x] 2. Implement Tauri backend command calls
  - Update `runSimulation()` to call `window.__TAURI__.invoke('run_simulation', {parameters})`
  - Remove mock simulation logic and replace with actual backend call
  - Store simulation ID returned from backend
  - Handle backend errors and display to user
  - Add logging for backend communication
  - _Requirements: 1.4, 2.2, 5.4_

- [x] 3. Set up real-time progress event listeners
  - Implement `setupProgressListener()` to listen for `simulation-progress` events from Tauri
  - Update UI progress bar with real backend progress data
  - Handle progress updates for current simulation only (check simulation ID)
  - Update progress percentage, current time, and estimated remaining time
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 4. Implement simulation completion handling
  - Listen for `simulation-completed` event from Tauri backend
  - Call `get_simulation_results()` Tauri command to retrieve temperature data
  - Process backend results format into visualization format
  - Emit `simulation:completed` event to visualization panel
  - _Requirements: 1.5, 4.4, 6.4_

- [x] 5. Implement result data processing
  - Create `processResults()` method to convert backend data format to frontend format
  - Extract time steps array from backend results
  - Extract temperature field data (2D grid for each time step)
  - Extract metadata (total time, time steps completed, mesh resolution)
  - Ensure temperature data is in correct format for visualization panel
  - _Requirements: 2.4, 3.5, 5.5_

- [x] 6. Update visualization panel to handle real data
  - Modify `VisualizationPanel` to accept real temperature field data from backend
  - Update particle generation to use actual temperature values (not mock)
  - Ensure color mapping reflects real temperature range from backend
  - Update time step navigation to use actual simulation time steps
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 7. Verify torch position accuracy with backend
  - Run simulation with torch at (r=0, z=0.5) and verify hottest point is at center-middle
  - Run simulation with torch at (r=0.5, z=0.25) and verify hottest point is at 50% radius, 25% height
  - Run simulation with torch at (r=1, z=1) and verify hottest point is at edge-top
  - Visually inspect heat map to confirm heat source location matches parameters
  - Backend already implements Gaussian distribution: `Q(r) = (P*η)/(2πσ²) * exp(-d²/(2σ²))`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Test physics-based absolute distance heat spread
  - Run simulation with 4m tall furnace, 60s duration, Steel material
  - Run simulation with 2m tall furnace, 60s duration, Steel material, same torch power
  - Verify heat spreads same absolute distance (meters) in both cases
  - Backend uses thermal diffusivity α = k/(ρ*cp) for Steel ≈ 1.2×10⁻⁵ m²/s
  - Document actual spread distances from backend results
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 9. Test material-dependent diffusion rates
  - Run identical simulations with Steel, Aluminum, and Concrete
  - Verify Aluminum (α ≈ 9.7×10⁻⁵ m²/s) shows fastest heat spread
  - Verify Steel (α ≈ 1.2×10⁻⁵ m²/s) shows medium heat spread
  - Verify Concrete (α ≈ 5.0×10⁻⁷ m²/s) shows slowest heat spread
  - Backend MaterialLibrary already implements these materials with correct properties
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Verify time-dependent evolution
  - Check that backend results show heat concentrated at torch at early time steps
  - Verify heat spreads outward as simulation progresses
  - Backend solver implements: `∂T/∂t = α * [1/r * ∂/∂r(r * ∂T/∂r) + ∂²T/∂z²] + Q/(ρ*cp)`
  - Verify animation shows smooth temporal evolution
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 11. Validate backend physics implementation
  - Verify backend uses correct Gaussian heat distribution formula
  - Verify backend applies proper boundary conditions (convection + radiation at walls)
  - Verify backend CFL stability condition is enforced: `Δt ≤ min(Δr², Δz²) / (2α)`
  - Check backend logs for any physics warnings or errors
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Handle backend simulation errors gracefully
  - Implement error handling for backend connection failures
  - Display user-friendly error messages for simulation failures
  - Handle timeout scenarios (simulations taking too long)
  - Implement retry logic for transient failures
  - Add fallback behavior if backend is unavailable
  - _Requirements: 5.5, 6.5_

- [x] 13. Add cancellation support
  - Implement `cancelSimulation()` to call `cancel_simulation` Tauri command
  - Update UI to show cancellation in progress
  - Handle `simulation-cancelled` event from backend
  - Clean up simulation state after cancellation
  - _Requirements: 4.4_

- [x] 14. Performance testing and optimization
  - Measure end-to-end simulation time for different mesh resolutions
  - Verify backend completes simulations in reasonable time (< 5 minutes for balanced mesh)
  - Test with multiple torch configurations
  - Verify memory usage is acceptable
  - Check for any performance bottlenecks in data transfer between backend and frontend
  - _Requirements: All requirements validated_

- [x] 15. Integration testing with real backend
  - Run full simulation workflow: parameter input → backend execution → results display
  - Test all three materials (Steel, Aluminum, Concrete)
  - Test different furnace geometries (varying height and radius)
  - Test different torch positions and powers
  - Verify visualization correctly displays backend results
  - Document any discrepancies between expected and actual behavior
  - _Requirements: All requirements validated_

## Notes

**Backend is Production-Ready**: The Rust backend (`src/simulation/`) already implements:
- ✅ Gaussian torch heat distribution with proper physics
- ✅ Material library with 10+ materials and thermal diffusivity
- ✅ Forward Euler solver with CFL stability
- ✅ Cylindrical mesh with proper coordinate system
- ✅ Boundary conditions (convection + radiation)
- ✅ Multi-torch support with superposition
- ✅ Tauri commands for frontend integration

**Frontend Changes Required**: Minimal - just remove mock code and call backend properly.

**No JavaScript Physics Engine Needed**: All physics calculations happen in Rust backend.
