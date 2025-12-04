# Design Document

## Overview

The Animation Playback feature enables researchers to visualize temporal evolution of plasma furnace simulations through an interactive playback system. The design integrates with the existing simulation engine, visualization canvas, and animation controller to provide smooth, efficient playback of temperature field data across time steps.

The system follows a data-driven architecture where the Rust backend provides time-series temperature data, the frontend caches and manages this data efficiently, and the visualization canvas renders each frame with proper color mapping and 3D particle updates.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Tauri UI)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Animation UI    │◄───┤ Animation        │              │
│  │  Controls        │    │ Controller       │              │
│  │  - Play/Pause    │    │ - State Machine  │              │
│  │  - Speed Control │    │ - Time Tracking  │              │
│  │  - Timeline      │    │ - Event Emitter  │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                       │                          │
│           │    ┌──────────────────▼─────────┐               │
│           │    │  Data Cache Manager        │               │
│           │    │  - Batch Loading           │               │
│           │    │  - LRU Cache               │               │
│           │    │  - Preload Strategy        │               │
│           │    └──────────────────┬─────────┘               │
│           │                       │                          │
│           └───────────────────────┼──────────────┐          │
│                                   │              │          │
│                          ┌────────▼──────────┐   │          │
│                          │  Visualization    │◄──┘          │
│                          │  Canvas           │              │
│                          │  - 3D Rendering   │              │
│                          │  - Particle Update│              │
│                          │  - Color Mapping  │              │
│                          └────────┬──────────┘              │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │  Tauri IPC Bridge  │
                          └─────────┬──────────┘
                                    │
┌───────────────────────────────────┼──────────────────────────┐
│                     Backend (Rust)│                          │
├───────────────────────────────────┼──────────────────────────┤
│                                   │                          │
│                          ┌────────▼──────────┐              │
│                          │  Simulation       │              │
│                          │  Results Manager  │              │
│                          │  - Time Step Data │              │
│                          │  - Metadata       │              │
│                          │  - Export API     │              │
│                          └────────┬──────────┘              │
│                                   │                          │
│                          ┌────────▼──────────┐              │
│                          │  Metrics Module   │              │
│                          │  - Temperature    │              │
│                          │    Grids          │              │
│                          │  - Time Series    │              │
│                          │  - Statistics     │              │
│                          └───────────────────┘              │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Simulation Completion**: Backend emits completion event with metadata
2. **Data Request**: Frontend requests time-series temperature data
3. **Cache Population**: Data Cache Manager loads initial batch
4. **Visualization Init**: Visualization Canvas prepares 3D particle system
5. **Playback Control**: Animation Controller manages frame timing
6. **Frame Rendering**: Visualization updates particle colors per frame
7. **User Interaction**: Timeline scrubbing, speed control, pause/resume

## Components and Interfaces

### 1. Backend: Time-Series Data Provider

**Location**: `src/simulation/metrics.rs`, `src-tauri/src/simulation.rs`

**Responsibilities**:
- Store temperature field data for each time step during simulation
- Provide efficient retrieval of time-step data via Tauri commands
- Export metadata (time values, temperature ranges, mesh dimensions)

**New Tauri Commands**:

```rust
/// Get complete time-series data for animation
#[tauri::command]
pub async fn get_animation_data(
    simulation_id: String
) -> Result<AnimationData, String>

/// Get temperature data for a specific time step (for on-demand loading)
#[tauri::command]
pub async fn get_time_step_data(
    simulation_id: String,
    time_step: usize
) -> Result<TimeStepData, String>

/// Get animation metadata (time steps, duration, temperature range)
#[tauri::command]
pub async fn get_animation_metadata(
    simulation_id: String
) -> Result<AnimationMetadata, String>
```

**Data Structures**:

```rust
#[derive(Serialize, Deserialize)]
pub struct AnimationData {
    pub time_steps: Vec<TimeStepData>,
    pub metadata: AnimationMetadata,
}

#[derive(Serialize, Deserialize)]
pub struct TimeStepData {
    pub time: f64,                    // Simulation time in seconds
    pub temperature_grid: Vec<Vec<f64>>, // 2D grid [row][col]
    pub step_index: usize,
}

#[derive(Serialize, Deserialize)]
pub struct AnimationMetadata {
    pub total_time_steps: usize,
    pub simulation_duration: f64,
    pub time_interval: f64,
    pub temperature_range: (f64, f64),
    pub mesh_dimensions: (usize, usize), // (nr, nz)
    pub furnace_dimensions: (f64, f64),  // (radius, height)
}
```

### 2. Frontend: Data Cache Manager

**Location**: `src-tauri/ui/js/core/data-cache.js` (new file)

**Responsibilities**:
- Batch loading of time-step data from backend
- LRU cache management to limit memory usage
- Preloading strategy for smooth playback
- Progress tracking for data loading

**Interface**:

```javascript
class DataCacheManager {
    constructor(eventBus, maxCacheSize = 50) {
        this.cache = new Map(); // timeStep -> TimeStepData
        this.maxCacheSize = maxCacheSize;
        this.loadingQueue = [];
        this.preloadWindow = 10; // Preload next 10 frames
    }

    async initialize(simulationId, metadata) {
        // Load initial batch of frames
    }

    async getTimeStepData(timeStep) {
        // Return cached data or fetch from backend
    }

    preloadFrames(currentTimeStep, direction = 'forward') {
        // Preload frames ahead of playback
    }

    clearCache() {
        // Clear all cached data
    }

    getCacheStatus() {
        // Return cache statistics
    }
}
```

**Caching Strategy**:
- **Initial Load**: Load first 10 frames immediately
- **Preload Window**: Always keep next 10 frames loaded
- **LRU Eviction**: Remove least recently used frames when cache is full
- **Bidirectional**: Support both forward and backward playback

### 3. Frontend: Animation Controller (Enhanced)

**Location**: `src-tauri/ui/js/components/animation.js` (existing, enhanced)

**New Methods**:

```javascript
class AnimationController {
    // Existing methods remain...

    async initializeWithData(simulationId, metadata) {
        // Initialize with backend metadata
        // Set up data cache manager
        // Prepare for playback
    }

    async loadFrame(timeStep) {
        // Load specific frame from cache
        // Trigger visualization update
    }

    setPlaybackMode(mode) {
        // 'realtime' | 'stepped' | 'smooth'
    }

    exportCurrentFrame() {
        // Export current frame as PNG
    }

    exportAllFrames(options) {
        // Export all frames as image sequence
    }
}
```

**State Machine**:

```
┌─────────────┐
│ Uninitialized│
└──────┬───────┘
       │ initialize()
       ▼
┌─────────────┐
│   Ready     │◄────────┐
└──────┬───────┘         │
       │ play()          │ pause()
       ▼                 │
┌─────────────┐          │
│   Playing   ├──────────┘
└──────┬───────┘
       │ end reached
       ▼
┌─────────────┐
│   Ended     │
└──────┬───────┘
       │ reset()
       ▼
   (back to Ready)
```

### 4. Frontend: Visualization Canvas (Enhanced)

**Location**: `src-tauri/ui/js/components/visualization.js` (existing, enhanced)

**Enhanced Methods**:

```javascript
class VisualizationPanel {
    // Existing methods remain...

    async loadAnimationData(animationData) {
        // Load complete animation dataset
        // Initialize particle system for animation
    }

    async updateToTimeStep(timeStep, temperatureData) {
        // Update particle colors for specific time step
        // Smooth transition if enabled
    }

    enableSmoothTransitions(enabled) {
        // Enable/disable interpolation between frames
    }

    updateFrameMetadata(timeStep, time) {
        // Update on-screen display of current time/step
    }

    captureFrame(resolution = 'current') {
        // Capture current canvas as image
    }
}
```

**Rendering Optimization**:
- **Particle Color Update**: Only update color buffer, not geometry
- **Batch Updates**: Update all particles in single operation
- **GPU Acceleration**: Use Three.js BufferGeometry for efficiency
- **Frame Skipping**: Skip frames if rendering falls behind

### 5. Frontend: Animation UI Controls

**Location**: `src-tauri/ui/js/components/animation-ui.js` (new file)

**Responsibilities**:
- Render playback controls (play, pause, speed, timeline)
- Handle user interactions
- Display temporal metadata
- Show loading progress

**UI Components**:

```javascript
class AnimationUI {
    constructor(container, animationController, eventBus) {
        this.playButton = null;
        this.pauseButton = null;
        this.speedSelector = null;
        this.timelineSlider = null;
        this.timeDisplay = null;
        this.progressBar = null;
    }

    render() {
        // Create and inject UI elements
    }

    updateTimeDisplay(time, timeStep, totalTimeSteps) {
        // Update time/step display
    }

    updateProgressBar(progress) {
        // Update timeline slider position
    }

    showLoadingProgress(percent) {
        // Show data loading progress
    }

    enableControls(enabled) {
        // Enable/disable all controls
    }
}
```

**UI Layout**:

```
┌─────────────────────────────────────────────────────────┐
│                  Visualization Canvas                    │
│                                                           │
│                    [3D Heatmap View]                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Animation Controls                                      │
│  ┌──┐ ┌──┐ ┌──┐  │  Speed: [0.5x][1x][2x][5x][10x]     │
│  │◄◄│ │▶▶│ │▶│  │                                       │
│  └──┘ └──┘ └──┘  │  Time: 12.5s / 60.0s  Step: 25/120  │
│                                                           │
│  ├────────●──────────────────────────────────────────┤  │
│  0s                                                 60s  │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Frontend Data Structures

```javascript
// Animation State
{
    isPlaying: boolean,
    currentTimeStep: number,
    totalTimeSteps: number,
    currentTime: number,      // seconds
    totalTime: number,        // seconds
    playbackSpeed: number,    // multiplier (0.5 - 10.0)
    loadingProgress: number,  // 0-100
    cacheStatus: {
        cachedFrames: number,
        totalFrames: number,
        memoryUsage: number   // MB
    }
}

// Time Step Data (cached)
{
    timeStep: number,
    time: number,
    temperatureGrid: number[][], // [row][col]
    metadata: {
        minTemp: number,
        maxTemp: number,
        gridSize: [number, number]
    }
}

// Animation Configuration
{
    autoPlay: boolean,
    loopPlayback: boolean,
    smoothTransitions: boolean,
    preloadFrames: number,
    maxCacheSize: number,
    playbackSpeeds: number[]
}
```

## Error Handling

### Error Scenarios

1. **Backend Data Unavailable**
   - **Detection**: Tauri command returns error
   - **Handling**: Display error message, disable playback controls
   - **Recovery**: Retry button to reload data

2. **Insufficient Memory for Cache**
   - **Detection**: Cache size exceeds limit
   - **Handling**: Reduce cache size, increase eviction rate
   - **Recovery**: Warn user, continue with smaller cache

3. **Frame Loading Timeout**
   - **Detection**: Backend request exceeds timeout (5s)
   - **Handling**: Pause playback, show loading indicator
   - **Recovery**: Retry failed frame, continue when loaded

4. **Rendering Performance Issues**
   - **Detection**: Frame rate drops below threshold (15 FPS)
   - **Handling**: Reduce particle count, disable smooth transitions
   - **Recovery**: Show performance warning, suggest lower quality

5. **Invalid Temperature Data**
   - **Detection**: NaN or out-of-range values
   - **Handling**: Use fallback color, log warning
   - **Recovery**: Continue with valid data, skip invalid points

### Error Messages

```javascript
const ERROR_MESSAGES = {
    DATA_LOAD_FAILED: 'Failed to load animation data. Please try again.',
    INSUFFICIENT_MEMORY: 'Not enough memory for full animation cache. Playback may be slower.',
    FRAME_TIMEOUT: 'Frame loading timed out. Retrying...',
    PERFORMANCE_WARNING: 'Rendering performance is low. Consider reducing quality settings.',
    INVALID_DATA: 'Some temperature data is invalid and will be skipped.',
    BACKEND_ERROR: 'Backend error occurred. Please check simulation results.'
};
```

## Testing Strategy

### Unit Tests

1. **Data Cache Manager**
   - Test LRU eviction logic
   - Test preload window calculation
   - Test cache hit/miss scenarios
   - Test memory limit enforcement

2. **Animation Controller**
   - Test state transitions (play, pause, reset)
   - Test time step navigation
   - Test speed control
   - Test boundary conditions (start, end)

3. **Visualization Updates**
   - Test particle color mapping
   - Test temperature-to-color conversion
   - Test grid coordinate mapping
   - Test frame transition smoothness

### Integration Tests

1. **End-to-End Playback**
   - Load simulation results
   - Initialize animation
   - Play through all frames
   - Verify frame accuracy

2. **User Interaction**
   - Test timeline scrubbing
   - Test speed changes during playback
   - Test pause/resume
   - Test frame export

3. **Performance Tests**
   - Measure frame rate at different speeds
   - Measure memory usage with full cache
   - Measure backend data loading time
   - Measure rendering performance

### Manual Testing Scenarios

1. **Basic Playback**
   - Run simulation → Complete → Play animation
   - Verify smooth playback at 1x speed
   - Verify correct temperature colors

2. **Speed Control**
   - Change speed during playback
   - Verify frame timing adjusts correctly
   - Test all speed options (0.5x - 10x)

3. **Timeline Navigation**
   - Scrub timeline while paused
   - Scrub timeline while playing
   - Jump to specific time steps

4. **Frame Export**
   - Export single frame
   - Export all frames
   - Verify image quality and resolution

5. **Error Recovery**
   - Simulate backend failure
   - Simulate slow network
   - Verify error messages and recovery

## Performance Considerations

### Optimization Strategies

1. **Data Loading**
   - Batch requests to reduce IPC overhead
   - Compress temperature data if needed
   - Use binary format for large datasets

2. **Memory Management**
   - Limit cache size based on available memory
   - Use typed arrays for temperature data
   - Release unused frames promptly

3. **Rendering**
   - Update only color buffer, not geometry
   - Use GPU-accelerated color mapping
   - Implement frame skipping for high speeds

4. **User Experience**
   - Show loading progress for initial data
   - Preload frames ahead of playback
   - Provide responsive controls even during loading

### Performance Targets

- **Frame Rate**: 30 FPS minimum at 1x speed
- **Initial Load**: < 2 seconds for first 10 frames
- **Memory Usage**: < 500 MB for 120 time steps
- **Timeline Scrubbing**: < 100ms response time
- **Frame Export**: < 1 second per frame at 1080p

## Future Enhancements

1. **Advanced Playback**
   - Variable speed playback (smooth acceleration)
   - Frame interpolation for smoother animation
   - Synchronized multi-view playback

2. **Analysis Tools**
   - Temperature probe tool (click to track point)
   - Temperature graph over time
   - Comparison mode (side-by-side time steps)

3. **Export Options**
   - Video export (MP4, WebM)
   - Animated GIF export
   - Data export (CSV time series)

4. **Visualization Enhancements**
   - Isosurface rendering
   - Streamline visualization
   - Cross-section views

5. **Performance**
   - WebGL compute shaders for color mapping
   - Web Workers for data processing
   - Streaming data for very large simulations
