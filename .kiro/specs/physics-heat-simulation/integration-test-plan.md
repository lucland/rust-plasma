# Integration Test Plan - Real Backend Simulation

## Overview

This document describes the comprehensive integration testing strategy for validating the complete simulation workflow from parameter input through backend execution to results display.

## Test Objectives

1. Validate full workflow: parameter input → backend execution → results display
2. Test all three materials (Steel, Aluminum, Concrete) with real backend
3. Test different furnace geometries (varying height and radius)
4. Test different torch positions and powers
5. Verify visualization correctly displays backend results
6. Document any discrepancies between expected and actual behavior

## Requirements Coverage

All requirements from the physics-heat-simulation spec are validated:

- **Requirement 1**: Torch Position Accuracy
- **Requirement 2**: Physics-Based Heat Diffusion
- **Requirement 3**: Material-Dependent Thermal Properties
- **Requirement 4**: Time-Dependent Heat Evolution
- **Requirement 5**: Coordinate System Consistency
- **Requirement 6**: Validation Against Physical Limits

## Test Environment

### Prerequisites

- Rust toolchain (cargo, rustc)
- Tauri development environment
- Node.js (for frontend testing)
- Modern web browser with WebGL support

### Test Files

1. **HTML Test Interface**: `test-integration-full-workflow.html`
   - Interactive test runner with UI
   - Real-time progress tracking
   - Detailed logging and results display

2. **Shell Script Runner**: `scripts/run_integration_tests.sh`
   - Command-line test execution
   - Automated test suite
   - CI/CD integration ready

3. **Test Documentation**: This file

## Test Suites

### Suite 1: Material Tests

Tests heat diffusion with different material properties to validate material-dependent thermal diffusivity.

#### Test Cases

| Test ID | Material | Expected Behavior | Requirements |
|---------|----------|-------------------|--------------|
| material-steel | Steel | α ≈ 1.2×10⁻⁵ m²/s, medium heat spread | 3.1, 3.4 |
| material-aluminum | Aluminum | α ≈ 9.7×10⁻⁵ m²/s, fastest heat spread | 3.2, 3.4 |
| material-concrete | Concrete | α ≈ 5.0×10⁻⁷ m²/s, slowest heat spread | 3.3, 3.4 |

#### Test Parameters

```json
{
  "geometry": {
    "cylinder_height": 2.0,
    "cylinder_radius": 1.0
  },
  "mesh": {
    "preset": "fast",
    "nr": 10,
    "nz": 10
  },
  "torches": {
    "torches": [{
      "position": { "r": 0.0, "z": 0.0 },
      "power": 150.0,
      "efficiency": 0.8,
      "sigma": 0.1
    }]
  },
  "simulation": {
    "total_time": 30.0,
    "solver_method": "forward-euler",
    "cfl_factor": 0.5,
    "output_interval": 1.0
  },
  "boundary": {
    "initial_temperature": 300.0,
    "ambient_temperature": 300.0
  },
  "materials": {
    "material_type": "Steel|Aluminum|Concrete"
  }
}
```

#### Validation Criteria

1. Simulation completes successfully for all materials
2. Aluminum shows fastest heat spread (highest α)
3. Steel shows medium heat spread
4. Concrete shows slowest heat spread (lowest α)
5. Temperature values remain within physical limits (300K - 2000K)

### Suite 2: Geometry Tests

Tests different furnace dimensions to validate physics-based absolute distance heat spread.

#### Test Cases

| Test ID | Height (m) | Radius (m) | Expected Behavior | Requirements |
|---------|------------|------------|-------------------|--------------|
| geometry-2x1 | 2.0 | 1.0 | Baseline geometry | 2.1, 2.2 |
| geometry-4x1 | 4.0 | 1.0 | Same absolute spread as 2x1 | 2.2, 2.3 |
| geometry-2x0.5 | 2.0 | 0.5 | Smaller radius, same physics | 2.1, 2.2 |

#### Validation Criteria

1. Heat spreads same absolute distance (meters) regardless of furnace size
2. Larger furnaces don't show proportionally larger heat spread
3. Physics calculations use absolute coordinates, not normalized
4. Boundary conditions properly applied at all geometries

### Suite 3: Torch Position Tests

Tests torch positioning accuracy to validate heat source location.

#### Test Cases

| Test ID | Position (r, z) | Description | Expected Behavior | Requirements |
|---------|-----------------|-------------|-------------------|--------------|
| torch-0-0 | (0.0, 0.0) | Bottom Center | Hottest at center-bottom | 1.1, 1.5 |
| torch-0.5-0.5 | (0.5, 0.5) | Middle | Hottest at 50% radius, 50% height | 1.2, 1.5 |
| torch-1-1 | (1.0, 1.0) | Top Edge | Hottest at edge-top | 1.3, 1.5 |

#### Validation Criteria

1. Maximum temperature occurs at specified torch position
2. Heat distribution follows Gaussian pattern from torch
3. Coordinate transformation (normalized → absolute) is correct
4. Visualization displays heat source at correct location

### Suite 4: Power and Efficiency Tests

Tests different torch power levels and efficiency values.

#### Test Cases

| Test ID | Power (kW) | Efficiency | Expected Behavior | Requirements |
|---------|------------|------------|-------------------|--------------|
| power-low | 100 | 0.8 | Lower peak temperature | 2.4, 6.2 |
| power-medium | 150 | 0.8 | Medium peak temperature | 2.4, 6.2 |
| power-high | 200 | 0.8 | Higher peak temperature | 2.4, 6.2 |
| efficiency-low | 150 | 0.6 | Lower effective power | 2.4, 6.2 |
| efficiency-high | 150 | 0.9 | Higher effective power | 2.4, 6.2 |

#### Validation Criteria

1. Peak temperature increases with power
2. Peak temperature increases with efficiency
3. Heat spread rate remains consistent (depends on material, not power)
4. Energy conservation maintained

### Suite 5: Time Evolution Tests

Tests time-dependent heat evolution and animation.

#### Test Cases

| Test ID | Duration (s) | Time Steps | Expected Behavior | Requirements |
|---------|--------------|------------|-------------------|--------------|
| time-short | 15 | ~30 | Limited heat spread | 4.1, 4.2 |
| time-medium | 30 | ~60 | Medium heat spread | 4.2, 4.3 |
| time-long | 60 | ~120 | Extended heat spread | 4.2, 4.5 |

#### Validation Criteria

1. Heat concentrated at torch at t=0
2. Heat spreads outward over time
3. Heat spread proportional to sqrt(time)
4. Animation shows smooth temporal evolution
5. All time steps accessible for playback

## Test Execution

### Manual Testing (HTML Interface)

1. Open Tauri application: `cd src-tauri && cargo tauri dev`
2. Open test interface: `test-integration-full-workflow.html`
3. Click "Run All Tests" or run individual test suites
4. Monitor progress and review results
5. Check for discrepancies in the summary

### Automated Testing (Shell Script)

```bash
# Run full integration test suite
./scripts/run_integration_tests.sh

# Run with verbose output
RUST_LOG=debug ./scripts/run_integration_tests.sh
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Integration Tests
        run: ./scripts/run_integration_tests.sh
```

## Expected Results

### Success Criteria

- ✅ All simulations complete without errors
- ✅ Temperature values within physical limits (300K - 2000K)
- ✅ Material-dependent diffusion rates match expected values
- ✅ Torch positions accurately reflected in heat distribution
- ✅ Geometry changes don't affect absolute heat spread
- ✅ Visualization correctly displays backend results
- ✅ Animation playback works smoothly
- ✅ No memory leaks or performance issues

### Performance Benchmarks

| Mesh Preset | Grid Size | Expected Time | Memory Usage |
|-------------|-----------|---------------|--------------|
| Fast | 10x10 | < 30s | < 100 MB |
| Balanced | 20x20 | < 2 min | < 200 MB |
| High | 40x40 | < 5 min | < 500 MB |

## Discrepancy Tracking

### Known Issues

Document any discrepancies found during testing:

1. **Issue**: [Description]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Impact**: [High/Medium/Low]
   - **Status**: [Open/In Progress/Resolved]

### Reporting Template

```markdown
## Discrepancy Report

**Test ID**: [test-id]
**Date**: [YYYY-MM-DD]
**Tester**: [Name]

### Description
[Detailed description of the discrepancy]

### Expected Behavior
[What should happen according to requirements]

### Actual Behavior
[What actually happened]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Environment
- OS: [Operating System]
- Rust Version: [Version]
- Tauri Version: [Version]
- Browser: [Browser and version]

### Screenshots/Logs
[Attach relevant screenshots or log excerpts]

### Impact Assessment
- **Severity**: [Critical/High/Medium/Low]
- **Requirements Affected**: [List requirement IDs]
- **Workaround Available**: [Yes/No - describe if yes]

### Proposed Solution
[Suggested fix or next steps]
```

## Test Maintenance

### Updating Tests

When requirements or implementation changes:

1. Review affected test cases
2. Update test parameters if needed
3. Update validation criteria
4. Re-run affected test suites
5. Update documentation

### Adding New Tests

To add new test cases:

1. Identify requirement coverage gap
2. Design test case with clear validation criteria
3. Add to appropriate test suite
4. Update this documentation
5. Run test to verify it works
6. Add to automated test script if applicable

## Conclusion

This integration test plan provides comprehensive coverage of all requirements for the physics-heat-simulation feature. By testing the complete workflow with real backend simulation, we ensure that:

- The frontend correctly integrates with the Rust backend
- Physics calculations are accurate and match requirements
- Visualization displays real simulation data correctly
- The system performs well under various conditions
- All requirements are validated end-to-end

Regular execution of these tests ensures continued quality and catches regressions early in the development process.
