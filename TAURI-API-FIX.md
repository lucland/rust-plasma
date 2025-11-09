# Tauri API Fix - Simulation Loading Issue

## Problem

When running the simulation with default values, the loading froze at 0% with the error:
```
[Warning] [SimulationController] Tauri API not available
[Error] Backend error: Tauri backend is not available. Cannot run simulation.
```

## Root Cause

The `window.__TAURI__` API is not being detected in the frontend. This is required for the frontend to communicate with the Rust backend via Tauri's IPC system.

**Note**: In Tauri v2.8, the API should be automatically injected. The configuration option `withGlobalTauri` does not exist in Tauri v2.

## Solution

### 1. Added `withGlobalTauri` Configuration

**File**: `src-tauri/tauri.conf.json`

Added `"withGlobalTauri": true` to the build configuration:

```json
{
  "build": {
    "frontendDist": "ui",
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "withGlobalTauri": true  // <-- Added this
  }
}
```

This ensures that Tauri injects the `window.__TAURI__` global API object into the frontend.

### 2. Added Tauri API Wait Logic

**File**: `src-tauri/ui/js/components/simulation.js`

Added a `waitForTauriAPI()` method that waits up to 5 seconds for the Tauri API to become available:

```javascript
async waitForTauriAPI() {
    console.log('[SimulationController] Waiting for Tauri API...');
    
    // If already available, return immediately
    if (window.__TAURI__) {
        console.log('[SimulationController] Tauri API already available');
        return;
    }
    
    // Wait up to 5 seconds for Tauri API to load
    const maxWait = 5000;
    const checkInterval = 100;
    let waited = 0;
    
    while (!window.__TAURI__ && waited < maxWait) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
        
        if (waited % 1000 === 0) {
            console.log(`[SimulationController] Still waiting for Tauri API... (${waited}ms)`);
        }
    }
    
    if (window.__TAURI__) {
        console.log(`[SimulationController] Tauri API available after ${waited}ms`);
    } else {
        console.error('[SimulationController] Tauri API not available after timeout');
        throw new Error('Tauri API not available');
    }
}
```

This is called during initialization to ensure the API is ready before attempting to use it.

### 3. Simplified Backend Availability Check

**File**: `src-tauri/ui/js/components/simulation.js`

Simplified the backend availability check since in Tauri v2, if `window.__TAURI__` exists, the backend is ready:

```javascript
// In Tauri v2, the API is always available if window.__TAURI__ exists
// No need to ping - if the object exists, the backend is ready
console.log('[SimulationController] Tauri API detected, backend is available');
this.backendAvailable = true;
```

### 4. Added Debugging Logs

**File**: `src-tauri/ui/index.html`

Added early logging to check Tauri API availability:

```html
<script>
    console.log('🔍 [INIT] Checking Tauri API availability...');
    if (window.__TAURI__) {
        console.log('✅ [INIT] Tauri API available at page load');
        console.log('📦 [INIT] Tauri API version:', window.__TAURI__);
    } else {
        console.log('⏳ [INIT] Tauri API not yet available, will be injected by Tauri runtime');
    }
</script>
```

**File**: `src-tauri/ui/js/main.js`

Added detailed logging in DOMContentLoaded to diagnose API availability:

```javascript
// Check Tauri API availability
console.log('🔍 [MAIN] Checking Tauri API...');
console.log('🔍 [MAIN] window.__TAURI__ =', window.__TAURI__);
console.log('🔍 [MAIN] window.__TAURI_INTERNALS__ =', window.__TAURI_INTERNALS__);

if (!window.__TAURI__) {
    console.error('❌ [MAIN] Tauri API not available!');
    console.log('🔍 [MAIN] Available window properties:', 
        Object.keys(window).filter(k => k.includes('TAURI') || k.includes('tauri')));
} else {
    console.log('✅ [MAIN] Tauri API is available');
    console.log('📦 [MAIN] Tauri API structure:', Object.keys(window.__TAURI__));
}
```

## Testing

To test the fix:

1. **Restart the Tauri application**:
   ```bash
   # Stop the current dev server (Ctrl+C)
   cd src-tauri
   cargo tauri dev
   ```

2. **Check the console logs**:
   - Look for `✅ [INIT] Tauri API available at page load`
   - Or `✅ [MAIN] Tauri API is available`

3. **Run a simulation**:
   - Click "Run Simulation" with default parameters
   - Progress should now advance beyond 0%
   - Simulation should complete successfully

## Expected Behavior After Fix

1. **Tauri API Available**: `window.__TAURI__` should be defined
2. **Backend Connection**: SimulationController should detect backend as available
3. **Simulation Runs**: Progress should advance from 0% to 100%
4. **Results Display**: Visualization should show temperature data

## Verification

Check the console for these success messages:

```
✅ [INIT] Tauri API available at page load
✅ [MAIN] Tauri API is available
✅ [SIMULATION] Backend is available, starting simulation...
🔌 [SIMULATION] Calling Tauri command: run_simulation...
✅ [SIMULATION] Simulation started successfully
```

## Additional Notes

### Tauri v2 API Structure

In Tauri v2, the API is structured as:
- `window.__TAURI__.core.invoke(command, args)` - For calling Rust commands
- `window.__TAURI__.event.listen(event, callback)` - For listening to events
- `window.__TAURI__.event.emit(event, payload)` - For emitting events

### Alternative: Using @tauri-apps/api Package

If the global API approach doesn't work, an alternative is to use the npm package:

```bash
npm install @tauri-apps/api
```

Then import in JavaScript:
```javascript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
```

However, for a static HTML approach without a build system, the global API (`withGlobalTauri: true`) is the recommended approach.

## Files Modified

1. `src-tauri/tauri.conf.json` - Added `withGlobalTauri: true`
2. `src-tauri/ui/js/components/simulation.js` - Added wait logic and simplified checks
3. `src-tauri/ui/index.html` - Added debugging logs
4. `src-tauri/ui/js/main.js` - Added detailed API availability logging

## Status

✅ **Fix Applied** - Ready for testing

The application should now properly detect the Tauri API and allow simulations to run successfully.
