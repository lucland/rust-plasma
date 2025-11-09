# Task 7: Torch Position Verification Guide

## Overview

This document provides instructions for verifying that the Rust backend correctly positions the heat source at specified torch coordinates using Gaussian distribution.

**Formula:** `Q(r) = (P*η)/(2πσ²) * exp(-d²/(2σ²))`

**Requirements:** 1.1, 1.2, 1.3 from physics-heat-simulation spec

## Test Cases

### Test 1: Center-Middle Position
- **Torch Position (normalized):** r=0.0, z=0.5
- **Torch Position (absolute):** r=0.0m, z=1.0m (for 2m tall furnace)
- **Expected Result:** Hottest point at center of cylinder, middle height
- **Verification:** Heat map should show maximum temperature at (r=0, z=0.5)

### Test 2: 50% Radius, 25% Height
- **Torch Position (normalized):** r=0.5, z=0.25
- **Torch Position (absolute):** r=0.5m, z=0.5m (for 1m radius, 2m tall furnace)
- **Expected Result:** Hottest point at 50% radius, 25% height
- **Verification:** Heat map should show maximum temperature at (r=0.5, z=0.25)

### Test 3: Edge-Top Position
- **Torch Position (normalized):** r=1.0, z=1.0
- **Torch Position (absolute):** r=1.0m, z=2.0m (for 1m radius, 2m tall furnace)
- **Expected Result:** Hottest point at edge of cylinder, top
- **Verification:** Heat map should show maximum temperature at (r=1.0, z=1.0)

## Running the Tests

### Method 1: Automated Test Suite (Recommended)

1. **Start the Tauri application:**
   ```bash
   cd src-tauri
   cargo tauri dev
   ```

2. **Open the test page:**
   - Navigate to: `http://localhost:1420/test-torch-position-verification.html`
   - Or open the file directly in the Tauri window

3. **Run tests:**
   - Click "Run All Tests" to execute all three test cases sequentially
   - Or click individual test buttons to run specific tests
   - Tests will automatically:
     - Submit simulation parameters to backend
     - Wait for simulation completion
     - Analyze temperature distribution
     - Verify hotspot location matches expected position
     - Display pass/fail results with detailed analysis

4. **Review results:**
   - Each test shows:
     - Expected vs. actual hotspot position
     - Position error (Δr, Δz)
     - Distance from expected position
     - Temperature range
     - Simplified heat map visualization
   - Tests pass if hotspot is within ±15% tolerance of expected position

### Method 2: Manual Verification via Main UI

1. **Start the application:**
   ```bash
   cd src-tauri
   cargo tauri dev
   ```

2. **For Test 1 (Center-Middle):**
   - Set furnace height: 2.0m
   - Set furnace radius: 1.0m
   - Set torch position: r=0.0, z=0.5 (use sliders or input fields)
   - Set torch power: 150 kW
   - Set material: Steel
   - Set simulation duration: 10s
   - Click "Run Simulation"
   - Wait for completion
   - **Verify:** In the 3D visualization, the hottest region (red/yellow) should be at the center of the cylinder, middle height

3. **For Test 2 (50% Radius, 25% Height):**
   - Keep furnace dimensions: 2.0m height, 1.0m radius
   - Set torch position: r=0.5, z=0.25
   - Run simulation
   - **Verify:** Hottest region should be halfway between center and edge, at 25% height

4. **For Test 3 (Edge-Top):**
   - Keep furnace dimensions: 2.0m height, 1.0m radius
   - Set torch position: r=1.0, z=1.0
   - Run simulation
   - **Verify:** Hottest region should be at the edge of the cylinder, at the top

### Method 3: Backend Direct Testing (Advanced)

For developers who want to test the backend directly:

```rust
// In src/simulation/physics.rs or a test file
#[test]
fn test_torch_position_accuracy() {
    use crate::simulation::physics::PlasmaTorch;
    
    // Test 1: Center-Middle
    let torch = PlasmaTorch {
        position: (0.0, 1.0), // r=0, z=1.0m (middle of 2m furnace)
        power: 150.0,
        efficiency: 0.8,
        beam_width: 0.1,
    };
    
    // Calculate heat flux at torch position
    let heat_at_torch = torch.calculate_heat_flux(0.0, 1.0);
    
    // Calculate heat flux at nearby positions
    let heat_nearby = torch.calculate_heat_flux(0.1, 1.0);
    
    // Verify heat is maximum at torch position
    assert!(heat_at_torch > heat_nearby);
    
    // Test 2 and 3 follow similar pattern...
}
```

## Verification Criteria

### Pass Criteria
- ✅ Hotspot position within ±15% of expected normalized coordinates
- ✅ Maximum temperature occurs at or very near torch position
- ✅ Heat distribution follows Gaussian pattern (decreases with distance)
- ✅ No console errors during simulation
- ✅ Temperature values are physically reasonable (300K - 10,000K)

### Fail Criteria
- ❌ Hotspot position more than 15% away from expected location
- ❌ Maximum temperature occurs far from torch position
- ❌ Heat distribution does not follow expected pattern
- ❌ Backend errors or crashes
- ❌ Unrealistic temperature values

## Expected Backend Behavior

The Rust backend implements:

1. **Gaussian Heat Distribution:**
   ```rust
   Q(r) = (P * η) / (2π * σ²) * exp(-d² / (2σ²))
   ```
   Where:
   - P = torch power (kW)
   - η = efficiency (0-1)
   - σ = beam width (m)
   - d = distance from torch position (m)

2. **Coordinate System:**
   - Cylindrical coordinates (r, z)
   - r = radial distance from center axis (0 to radius)
   - z = height from bottom (0 to height)
   - Frontend uses normalized coordinates (0-1)
   - Backend uses absolute coordinates (meters)

3. **Heat Source Application:**
   - Heat is applied at the specified torch position
   - Heat spreads according to thermal diffusivity
   - Boundary conditions (convection + radiation) are applied at walls

## Troubleshooting

### Issue: Hotspot not at expected position
- **Check:** Coordinate transformation in `SimulationController.transformParameters()`
- **Verify:** Backend receives correct absolute coordinates
- **Debug:** Add logging to show torch position in backend

### Issue: Heat spread too uniform
- **Check:** Gaussian beam width parameter (should be small, e.g., 0.1m)
- **Verify:** Backend is using Gaussian distribution, not uniform heat source
- **Debug:** Check `PlasmaTorch::calculate_heat_flux()` implementation

### Issue: No heat visible
- **Check:** Torch power is sufficient (e.g., 150 kW)
- **Verify:** Simulation duration is long enough (at least 10s)
- **Debug:** Check temperature range in visualization

### Issue: Test timeout
- **Check:** Backend simulation is running (check logs)
- **Verify:** Mesh resolution is not too fine (use "medium" or "coarse")
- **Debug:** Reduce simulation duration or increase time step

## Success Metrics

After completing all three tests:

1. **Quantitative:**
   - All 3 tests pass (hotspot within tolerance)
   - Position error < 15% for each test
   - Temperature range is physically reasonable

2. **Qualitative:**
   - Visual inspection confirms heat source location
   - Heat distribution looks realistic (Gaussian pattern)
   - No visual artifacts or anomalies

3. **Performance:**
   - Each simulation completes in < 30 seconds
   - No backend errors or crashes
   - UI remains responsive during simulation

## Next Steps

After verifying torch position accuracy:

1. **Task 8:** Test physics-based absolute distance heat spread
2. **Task 9:** Test material-dependent diffusion rates
3. **Task 10:** Verify time-dependent evolution
4. **Task 11:** Validate backend physics implementation

## References

- **Requirements:** `.kiro/specs/physics-heat-simulation/requirements.md`
- **Design:** `.kiro/specs/physics-heat-simulation/design.md`
- **Backend Physics:** `src/simulation/physics.rs`
- **Frontend Integration:** `src-tauri/ui/js/components/simulation.js`
