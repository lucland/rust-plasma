# Data Loading Progress Implementation

## Overview

This document describes the implementation of Task 12: Frontend data loading progress for the animation playback feature. The implementation provides visual feedback during data loading, allows playback to start with partial data, and implements background loading of remaining frames.

## Features Implemented

### 1. Loading Indicator During Initial Data Fetch
- **Location**: `AnimationUI.showDataLoadingProgress()`
- **Behavior**: Displays a loading overlay with spinner when initial data fetch begins
- **Events**: Triggered by `cache:loading-start` event

### 2. Progress Percentage During Batch Loading
- **Location**: `AnimationUI.updateDataLoadingProgress()`
- **Behavior**: Shows real-time progress percentage and frame count (e.g., "Loading animation data... 45% (45 / 100 frames)")
- **Events**: Updated by `cache:loading-progress` event
- **Calculation**: Progress = (loaded frames / total frames) × 100

### 3. Estimated Time Remaining
- **Location**: `AnimationUI.estimateLoadingTime()`
- **Behavior**: Displays estimated seconds remaining based on loading rate
- **Algorithm**: Assumes ~100ms per frame as baseline, calculates remaining time
- **Display**: Shows as "~5s remaining" in the loading text

### 4. Playback with Partial Data (First 10 Frames)
- **Location**: `DataCacheManager.initialize()` and `DataCacheManager.isReadyForPlayback()`
- **Behavior**: 
  - Loads initial batch of 10 frames (configurable via `batchSize`)
  - Emits `cache:ready` event when initial batch is loaded
  - Enables playback controls immediately after initial batch
  - Background loading continues for remaining frames
- **Validation**: `isReadyForPlayback()` checks if minimum frames are cached

### 5. Cache Status Display (Frames Loaded / Total Frames)
- **Location**: `AnimationUI.showCacheStatus()`
- **Behavior**: Shows persistent indicator during background loading
- **Display**: "⏳ Loading remaining frames in background..."
- **Styling**: Subtle info-colored banner that doesn't obstruct controls

### 6. Background Loading of Remaining Frames
- **Location**: `DataCacheManager.startBackgroundLoading()`
- **Behavior**:
  - Automatically starts after initial batch is loaded
  - Loads frames in batches of 20 (configurable)
  - Non-blocking - doesn't prevent playback
  - Includes 100ms delay between batches to avoid overwhelming system
  - Emits progress events during background loading
  - Emits `cache:loading-complete` when all frames are loaded

## Architecture

### Event Flow

```
1. User completes simulation
   ↓
2. AnimationController.initializeWithData() called
   ↓
3. DataCacheManager.initialize() starts
   ↓
4. Emit: cache:loading-start
   → AnimationUI shows loading overlay
   ↓
5. Load initial batch (10 frames)
   ↓
6. Emit: cache:loading-progress (multiple times)
   → AnimationUI updates progress bar and percentage
   ↓
7. Emit: cache:ready
   → AnimationUI enables playback controls
   → AnimationController loads first frame
   ↓
8. Start background loading
   ↓
9. Emit: cache:background-loading-start
   → AnimationUI shows cache status indicator
   ↓
10. Load remaining frames in background
    ↓
11. Emit: cache:loading-progress (continuous)
    → AnimationUI updates progress
    ↓
12. Emit: cache:loading-complete
    → AnimationUI hides all loading indicators
```

### Component Interactions

```
┌─────────────────────────────────────────────────────────┐
│                    AnimationController                   │
│  - Coordinates initialization                           │
│  - Waits for cache readiness                            │
│  - Loads first frame                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│                   DataCacheManager                       │
│  - Manages frame loading                                │
│  - Emits progress events                                │
│  - Handles background loading                           │
│  - Tracks cache status                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓ (events)
┌─────────────────────────────────────────────────────────┐
│                      AnimationUI                         │
│  - Displays loading progress                            │
│  - Shows cache status                                   │
│  - Enables/disables controls                            │
│  - Updates progress indicators                          │
└─────────────────────────────────────────────────────────┘
```

## API Reference

### DataCacheManager Methods

#### `initialize(simulationId, metadata)`
Initializes the cache and loads initial batch of frames.
- **Parameters**:
  - `simulationId`: String - Simulation identifier
  - `metadata`: Object - Animation metadata with `total_time_steps`
- **Returns**: Promise<void>
- **Events Emitted**:
  - `cache:loading-start`
  - `cache:loading-progress`
  - `cache:ready`
  - `cache:background-loading-start`

#### `startBackgroundLoading(startFrame)`
Starts background loading of remaining frames.
- **Parameters**:
  - `startFrame`: Number - Frame index to start from
- **Returns**: Promise<void>
- **Events Emitted**:
  - `cache:background-loading-start`
  - `cache:loading-progress`
  - `cache:loading-complete`

#### `isReadyForPlayback()`
Checks if enough frames are loaded to start playback.
- **Returns**: Boolean - True if ready
- **Criteria**: At least `batchSize` frames cached

#### `getLoadingProgress()`
Gets current loading progress information.
- **Returns**: Object with:
  - `isLoading`: Boolean
  - `progress`: Number (0-100)
  - `loaded`: Number
  - `total`: Number
  - `isComplete`: Boolean
  - `isReadyForPlayback`: Boolean
  - `estimatedTimeRemaining`: Number|null

#### `getEstimatedTimeRemaining()`
Calculates estimated time remaining for loading.
- **Returns**: Number|null - Seconds remaining or null if unknown

### AnimationUI Methods

#### `showDataLoadingProgress(progress, totalFrames, initialBatch)`
Shows the loading progress overlay.
- **Parameters**:
  - `progress`: Number - Current progress (0-100)
  - `totalFrames`: Number - Total frames to load
  - `initialBatch`: Number - Size of initial batch

#### `updateDataLoadingProgress(progress, loaded, total)`
Updates the loading progress display.
- **Parameters**:
  - `progress`: Number - Progress percentage (0-100)
  - `loaded`: Number - Frames loaded
  - `total`: Number - Total frames

#### `hideDataLoadingProgress()`
Hides the loading progress overlay.

#### `showCacheStatus(show)`
Shows or hides the cache status indicator.
- **Parameters**:
  - `show`: Boolean - Whether to show the indicator

#### `estimateLoadingTime(progress, loaded, total)`
Estimates remaining loading time.
- **Parameters**:
  - `progress`: Number - Current progress
  - `loaded`: Number - Frames loaded
  - `total`: Number - Total frames
- **Returns**: Number|null - Estimated seconds

## Events

### Cache Events

#### `cache:loading-start`
Emitted when initial data loading begins.
```javascript
{
  totalFrames: 100,
  initialBatch: 10
}
```

#### `cache:loading-progress`
Emitted during frame loading with progress updates.
```javascript
{
  loaded: 45,
  total: 100,
  progress: 45.0,
  batchProgress: 50.0,
  batchTotal: 20,
  batchLoaded: 10
}
```

#### `cache:ready`
Emitted when initial batch is loaded and playback can start.
```javascript
{
  cachedFrames: 10,
  totalFrames: 100,
  progress: 10.0
}
```

#### `cache:background-loading-start`
Emitted when background loading of remaining frames begins.
```javascript
{
  startFrame: 10,
  totalFrames: 100,
  remainingFrames: 90
}
```

#### `cache:loading-complete`
Emitted when all frames are loaded.
```javascript
{
  cachedFrames: 100,
  totalFrames: 100,
  progress: 100
}
```

#### `cache:error`
Emitted when a loading error occurs.
```javascript
{
  type: 'initialization' | 'background-loading',
  error: 'Error message'
}
```

## Configuration

### DataCacheManager Configuration

```javascript
// In constructor
this.batchSize = 10;           // Initial batch size
this.preloadWindow = 10;       // Frames to preload ahead
this.maxCacheSize = 50;        // Maximum cached frames

// In startBackgroundLoading
const backgroundBatchSize = 20; // Background batch size
const batchDelay = 100;         // Delay between batches (ms)
```

### Performance Tuning

- **Initial Batch Size**: Increase for faster initial load, decrease for quicker playback start
- **Background Batch Size**: Larger batches load faster but may cause UI lag
- **Batch Delay**: Increase to reduce system load, decrease for faster loading
- **Max Cache Size**: Adjust based on available memory

## CSS Styling

New CSS classes added to `main.css`:

- `.inline-loading` - Loading indicator container
- `.loading-spinner-small` - Small animated spinner
- `.loading-text` - Loading status text
- `.progress-bar-small` - Progress bar container
- `.progress-fill` - Progress bar fill
- `.cache-status-indicator` - Background loading indicator
- `.cache-status-content` - Cache status content
- `.cache-status-icon` - Animated cache icon
- `.cache-status-text` - Cache status text

## Testing

### Manual Testing

1. **Test Initial Loading**:
   - Run simulation
   - Observe loading overlay appears
   - Verify progress percentage updates
   - Confirm playback enables after initial batch

2. **Test Background Loading**:
   - Start playback with partial data
   - Verify cache status indicator appears
   - Confirm playback is smooth
   - Check indicator disappears when complete

3. **Test Progress Display**:
   - Monitor progress percentage accuracy
   - Verify frame count updates correctly
   - Check estimated time remaining

4. **Test Error Handling**:
   - Simulate backend failure
   - Verify error message displays
   - Confirm controls are disabled

### Automated Testing

Use `test-data-loading-progress.html` to test:
- Initial loading simulation
- Background loading simulation
- Progress updates
- Cache status indicator
- Error scenarios

## Requirements Mapping

This implementation satisfies the following requirements from the design document:

- **Requirement 6.1**: ✅ Backend prepares time step data for efficient retrieval
- **Requirement 6.2**: ✅ Animation controller requests and caches data in batches
- **Requirement 6.3**: ✅ Loading indicator with progress percentage displayed
- **Requirement 6.4**: ✅ Playback begins when sufficient data is cached (10 frames)
- **Requirement 6.5**: ✅ Error handling with user-friendly messages

## Future Enhancements

1. **Adaptive Batch Sizing**: Adjust batch size based on network speed
2. **Smart Preloading**: Predict playback direction and preload accordingly
3. **Compression**: Compress frame data for faster transfer
4. **Persistent Cache**: Cache frames to disk for faster subsequent loads
5. **Progress Persistence**: Save loading progress across sessions
6. **Bandwidth Throttling**: Limit loading speed to avoid overwhelming network

## Troubleshooting

### Issue: Loading Progress Not Showing
- **Check**: Verify `cache:loading-start` event is emitted
- **Check**: Ensure AnimationUI is properly initialized
- **Check**: Confirm event listeners are set up

### Issue: Playback Not Starting
- **Check**: Verify `isReadyForPlayback()` returns true
- **Check**: Confirm initial batch is loaded
- **Check**: Check for errors in console

### Issue: Background Loading Too Slow
- **Solution**: Increase `backgroundBatchSize`
- **Solution**: Decrease `batchDelay`
- **Solution**: Check network/backend performance

### Issue: UI Lag During Loading
- **Solution**: Decrease `backgroundBatchSize`
- **Solution**: Increase `batchDelay`
- **Solution**: Reduce progress event frequency

## Conclusion

The data loading progress implementation provides a smooth user experience by:
1. Showing clear visual feedback during loading
2. Allowing playback to start quickly with partial data
3. Loading remaining data in the background without blocking
4. Providing accurate progress information
5. Handling errors gracefully

The implementation is modular, event-driven, and easily configurable for different performance requirements.
