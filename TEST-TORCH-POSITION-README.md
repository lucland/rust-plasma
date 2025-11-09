# Torch Position Verification Tests

## Overview

This test suite verifies that the Rust backend correctly positions the plasma torch heat source at specified coordinates using Gaussian distribution.

**Task:** Task 7 from `.kiro/specs/physics-heat-simulation/tasks.md`

**Requirements:** 1.1, 1.2, 1.3 from physics-heat-simulation spec

## Quick Start

### Option 1: Automated Test Suite (Recommended)

```bash
# Run the test script
./run-torch-position-tests.sh

# Then in the application:
# 1. Open browser dev tools (Cmd+Option+I / F12)
# 2. Navigate to test page: window.location.href = 'test-torch-position-verification.html'
# 3. Click "Run All Tests"
```

### Option 2: Manual Testing via Main UI

```bash
# Start the application
cd src-tauri
cargo tauri dev

# Then use the main UI to:
# 1. Set torch position parameters
# 2. Run simulation
# 3. Visually verify heat source location in 3D visualization
```

## Test Cases

### Test 1: Center-Middle Position ✓
- **Torch:** r=0.0, z=0.5 (normalized)
- **Expected:** Hottest point at center of cylinder, middle height
- **Verification:** Maximum temperature at (r=0, z=0.5)

### Test 2: 50% Radius, 25% Height ✓
- **Torch:** r=0.5, z=0.25 (normalized)
- **Expected:** Hottest point at 50% radius, 25% height
- **Verification:** Maximum temperature at (r=0.5, z=0.25)

### Test 3: Edge-Top Position ✓
- **Torch:** r=1.0, z=1.0 (normalized)
- **Expected:** Hottest point at edge of cylinder, top
- **Verification:** Maximum temperature at (r=1.0, z=1.0)

## Files

- **`test-torch-position-verification.html`** - Automated test suite (browser-based)
- **`src-tauri/ui/test-torch-position-verification.html`** - Copy in Tauri UI directory
- **`run-torch-position-tests.sh`** - Helper script to start tests
- **`.kiro/specs/physics-heat-simulation/task-7-verification-guide.md`** - Detailed guide

## Expected Results

Each test should:
- ✅ Complete simulation successfully
- ✅ Find hotspot within ±15% of expected position
- ✅ Show Gaussian heat distribution pattern
- ✅ Display physically reasonable temperatures (300K - 10,000K)

## Backend Implementation

The backend uses Gaussian distribution for torch heat:

```rust
Q(r) = (P * η) / (2π * σ²) * exp(-d² / (2σ²))
```

Where:
- **P** = torch power (kW)
- **η** = efficiency (0-1)
- **σ** = beam width (m)
- **d** = distance from torch position (m)

## Coordinate System

- **Frontend:** Normalized coordinates (0-1)
  - r: 0 (center) to 1 (edge)
  - z: 0 (bottom) to 1 (top)

- **Backend:** Absolute coordinates (meters)
  - r: 0 to furnace_radius (e.g., 0 to 1.0m)
  - z: 0 to furnace_height (e.g., 0 to 2.0m)

- **Transformation:** `SimulationController.transformParameters()`
  - Converts normalized → absolute before sending to backend

## Troubleshooting

### Tests fail with "Tauri backend not available"
- Make sure you're running the test in the Tauri application, not a regular browser
- Start the app with `cargo tauri dev`

### Hotspot not at expected position
- Check coordinate transformation in `SimulationController.transformParameters()`
- Verify backend receives correct absolute coordinates
- Check backend logs for torch position

### Simulation timeout
- Reduce simulation duration (use 10s instead of 60s)
- Use coarser mesh resolution
- Check backend logs for errors

### No heat visible
- Increase torch power (try 150-200 kW)
- Increase simulation duration
- Check temperature range in visualization

## Success Criteria

- ✅ All 3 tests pass (hotspot within tolerance)
- ✅ Visual inspection confirms heat source location
- ✅ Heat distribution follows Gaussian pattern
- ✅ No backend errors or crashes
- ✅ Each simulation completes in < 30 seconds

## Next Steps

After verifying torch position accuracy:

1. **Task 8:** Test physics-based absolute distance heat spread
2. **Task 9:** Test material-dependent diffusion rates
3. **Task 10:** Verify time-dependent evolution

## References

- **Spec:** `.kiro/specs/physics-heat-simulation/`
- **Backend:** `src/simulation/physics.rs`
- **Frontend:** `src-tauri/ui/js/components/simulation.js`
- **Visualization:** `src-tauri/ui/js/components/visualization.js`
