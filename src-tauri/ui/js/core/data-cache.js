/**
 * DataCacheManager - Efficient caching and preloading for animation time-series data
 * 
 * Manages LRU cache for animation frames with batch loading, preloading strategy,
 * and memory management to ensure smooth playback without excessive backend calls.
 */
class DataCacheManager {
    constructor(eventBus, maxCacheSize = 50) {
        this.eventBus = eventBus;
        this.maxCacheSize = maxCacheSize;
        
        // Cache storage: Map<timeStep, TimeStepData>
        this.cache = new Map();
        
        // LRU tracking: Map<timeStep, lastAccessTime>
        this.accessTimes = new Map();
        
        // Loading state tracking
        this.loadingQueue = new Set();
        this.loadingPromises = new Map();
        
        // Preload configuration
        this.preloadWindow = 10; // Number of frames to preload ahead
        this.batchSize = 10; // Number of frames to load in initial batch
        
        // Animation metadata
        this.metadata = null;
        this.simulationId = null;
        
        // Cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            loads: 0,
            evictions: 0,
            totalMemoryBytes: 0
        };
        
        // Debug mode
        this.debugMode = true;
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.getTimeStepData = this.getTimeStepData.bind(this);
        this.preloadFrames = this.preloadFrames.bind(this);
        this.clearCache = this.clearCache.bind(this);
    }

    /**
     * Initialize cache with animation metadata and load initial batch
     * @param {string} simulationId - Simulation identifier
     * @param {Object} metadata - Animation metadata from backend
     * @returns {Promise<void>}
     */
    async initialize(simulationId, metadata) {
        if (this.debugMode) {
            console.log('[DataCacheManager] Initializing with metadata:', metadata);
        }

        this.simulationId = simulationId;
        this.metadata = metadata;
        
        // Clear any existing cache
        this.clearCache();
        
        // Emit initialization event
        this.eventBus.emit('cache:initializing', {
            simulationId,
            totalFrames: metadata.total_time_steps,
            batchSize: this.batchSize
        });

        try {
            // Load initial batch of frames (first N frames)
            const initialFrames = Math.min(this.batchSize, metadata.total_time_steps);
            
            // Emit loading start event
            this.eventBus.emit('cache:loading-start', {
                totalFrames: metadata.total_time_steps,
                initialBatch: initialFrames
            });
            
            await this.loadBatch(0, initialFrames);
            
            if (this.debugMode) {
                console.log(`[DataCacheManager] Loaded initial batch: ${initialFrames} frames`);
            }

            // Emit ready event (playback can start with partial data)
            this.eventBus.emit('cache:ready', {
                cachedFrames: this.cache.size,
                totalFrames: metadata.total_time_steps,
                progress: (this.cache.size / metadata.total_time_steps) * 100
            });

            // Start background loading of remaining frames if needed
            if (initialFrames < metadata.total_time_steps) {
                this.startBackgroundLoading(initialFrames);
            } else {
                // All frames loaded
                this.eventBus.emit('cache:loading-complete', {
                    cachedFrames: this.cache.size,
                    totalFrames: metadata.total_time_steps
                });
            }

        } catch (error) {
            console.error('[DataCacheManager] Initialization failed:', error);
            this.eventBus.emit('cache:error', {
                type: 'initialization',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Load a batch of frames from the backend
     * @private
     * @param {number} startFrame - Starting frame index
     * @param {number} count - Number of frames to load
     * @param {boolean} emitProgress - Whether to emit progress events (default: true)
     * @returns {Promise<void>}
     */
    async loadBatch(startFrame, count, emitProgress = true) {
        const endFrame = Math.min(startFrame + count, this.metadata.total_time_steps);
        const loadPromises = [];
        const framesToLoad = [];

        for (let timeStep = startFrame; timeStep < endFrame; timeStep++) {
            // Skip if already cached or loading
            if (this.cache.has(timeStep) || this.loadingQueue.has(timeStep)) {
                continue;
            }

            framesToLoad.push(timeStep);
            loadPromises.push(this.loadFrame(timeStep));
        }

        // Track progress during batch loading
        let loadedCount = 0;
        const totalToLoad = framesToLoad.length;
        
        if (emitProgress && totalToLoad > 0) {
            // Emit initial progress
            this.eventBus.emit('cache:loading-progress', {
                loaded: this.cache.size,
                total: this.metadata.total_time_steps,
                progress: (this.cache.size / this.metadata.total_time_steps) * 100,
                batchProgress: 0,
                batchTotal: totalToLoad
            });
        }

        // Load frames with progress tracking
        for (const promise of loadPromises) {
            try {
                await promise;
                loadedCount++;
                
                if (emitProgress && totalToLoad > 0) {
                    const batchProgress = (loadedCount / totalToLoad) * 100;
                    const overallProgress = (this.cache.size / this.metadata.total_time_steps) * 100;
                    
                    this.eventBus.emit('cache:loading-progress', {
                        loaded: this.cache.size,
                        total: this.metadata.total_time_steps,
                        progress: overallProgress,
                        batchProgress: batchProgress,
                        batchTotal: totalToLoad,
                        batchLoaded: loadedCount
                    });
                }
            } catch (error) {
                console.error(`[DataCacheManager] Failed to load frame in batch:`, error);
                // Continue loading other frames even if one fails
            }
        }

        // Emit batch completion event
        this.eventBus.emit('cache:batch-loaded', {
            startFrame,
            endFrame,
            cachedFrames: this.cache.size,
            totalFrames: this.metadata.total_time_steps,
            progress: (this.cache.size / this.metadata.total_time_steps) * 100
        });
    }

    /**
     * Load a single frame from the backend with retry logic
     * @private
     * @param {number} timeStep - Time step index to load
     * @param {number} retryCount - Current retry attempt (default: 0)
     * @returns {Promise<Object>} Time step data
     */
    async loadFrame(timeStep, retryCount = 0) {
        // Check if already loading
        if (this.loadingPromises.has(timeStep)) {
            return this.loadingPromises.get(timeStep);
        }

        // Mark as loading
        this.loadingQueue.add(timeStep);

        // Create loading promise with retry logic
        const loadPromise = this.fetchTimeStepData(timeStep)
            .then(data => {
                // Store in cache
                this.cacheFrame(timeStep, data);
                
                // Remove from loading queue
                this.loadingQueue.delete(timeStep);
                this.loadingPromises.delete(timeStep);
                
                // Update statistics
                this.stats.loads++;
                
                if (this.debugMode) {
                    console.log(`[DataCacheManager] Loaded frame ${timeStep}`);
                }
                
                return data;
            })
            .catch(async error => {
                // Remove from loading queue on error
                this.loadingQueue.delete(timeStep);
                this.loadingPromises.delete(timeStep);
                
                console.error(`[DataCacheManager] Failed to load frame ${timeStep} (attempt ${retryCount + 1}):`, error);
                
                // Implement retry logic (max 3 attempts)
                const maxRetries = 3;
                if (retryCount < maxRetries) {
                    // Exponential backoff: 500ms, 1000ms, 2000ms
                    const retryDelay = 500 * Math.pow(2, retryCount);
                    
                    if (this.debugMode) {
                        console.log(`[DataCacheManager] Retrying frame ${timeStep} in ${retryDelay}ms...`);
                    }
                    
                    // Emit retry event
                    this.eventBus.emit('cache:retry', {
                        timeStep,
                        attempt: retryCount + 1,
                        maxRetries,
                        retryDelay,
                        error: error.message
                    });
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    
                    // Retry loading
                    return this.loadFrame(timeStep, retryCount + 1);
                } else {
                    // Max retries exceeded - emit error event
                    this.eventBus.emit('cache:load-error', {
                        timeStep,
                        error: error.message,
                        retriesExhausted: true,
                        attempts: maxRetries + 1
                    });
                    
                    throw error;
                }
            });

        // Store loading promise
        this.loadingPromises.set(timeStep, loadPromise);
        
        return loadPromise;
    }

    /**
     * Fetch time step data from backend via Tauri
     * @private
     * @param {number} timeStep - Time step index
     * @returns {Promise<Object>} Time step data
     */
    async fetchTimeStepData(timeStep) {
        try {
            // Call Tauri command to get time step data
            const data = await window.__TAURI__.invoke('get_time_step_data', {
                simulationId: this.simulationId,
                timeStep: timeStep
            });
            
            return data;
        } catch (error) {
            console.error(`[DataCacheManager] Backend fetch failed for frame ${timeStep}:`, error);
            throw new Error(`Failed to fetch frame ${timeStep}: ${error}`);
        }
    }

    /**
     * Cache a frame with LRU tracking
     * @private
     * @param {number} timeStep - Time step index
     * @param {Object} data - Time step data
     */
    cacheFrame(timeStep, data) {
        // Check if cache is full and eviction is needed
        if (this.cache.size >= this.maxCacheSize && !this.cache.has(timeStep)) {
            this.evictLRU();
        }

        // Store in cache
        this.cache.set(timeStep, data);
        
        // Update access time
        this.accessTimes.set(timeStep, Date.now());
        
        // Update memory statistics
        this.updateMemoryStats(data, 'add');
    }

    /**
     * Evict least recently used frame from cache
     * @private
     */
    evictLRU() {
        if (this.cache.size === 0) {
            return;
        }

        // Find least recently used frame
        let oldestTime = Infinity;
        let oldestFrame = null;

        for (const [timeStep, accessTime] of this.accessTimes) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestFrame = timeStep;
            }
        }

        if (oldestFrame !== null) {
            // Get data before removing for memory stats
            const data = this.cache.get(oldestFrame);
            
            // Remove from cache
            this.cache.delete(oldestFrame);
            this.accessTimes.delete(oldestFrame);
            
            // Update statistics
            this.stats.evictions++;
            this.updateMemoryStats(data, 'remove');
            
            if (this.debugMode) {
                console.log(`[DataCacheManager] Evicted frame ${oldestFrame} (LRU)`);
            }
            
            // Emit eviction event
            this.eventBus.emit('cache:evicted', {
                timeStep: oldestFrame,
                cacheSize: this.cache.size
            });
        }
    }

    /**
     * Get time step data from cache or load from backend
     * @param {number} timeStep - Time step index
     * @returns {Promise<Object>} Time step data
     */
    async getTimeStepData(timeStep) {
        // Validate time step
        if (timeStep < 0 || timeStep >= this.metadata.total_time_steps) {
            throw new Error(`Invalid time step: ${timeStep}. Valid range: 0-${this.metadata.total_time_steps - 1}`);
        }

        // Check cache first
        if (this.cache.has(timeStep)) {
            // Update access time for LRU
            this.accessTimes.set(timeStep, Date.now());
            
            // Update statistics
            this.stats.hits++;
            
            if (this.debugMode) {
                console.log(`[DataCacheManager] Cache hit for frame ${timeStep}`);
            }
            
            return this.cache.get(timeStep);
        }

        // Cache miss - load from backend
        this.stats.misses++;
        
        if (this.debugMode) {
            console.log(`[DataCacheManager] Cache miss for frame ${timeStep}, loading...`);
        }

        // Load frame (will be cached automatically)
        return await this.loadFrame(timeStep);
    }

    /**
     * Preload frames ahead of current position
     * @param {number} currentTimeStep - Current time step
     * @param {string} direction - Playback direction ('forward' or 'backward')
     */
    preloadFrames(currentTimeStep, direction = 'forward') {
        if (!this.metadata) {
            return;
        }

        const framesToPreload = [];
        
        if (direction === 'forward') {
            // Preload next N frames
            const endFrame = Math.min(
                currentTimeStep + this.preloadWindow,
                this.metadata.total_time_steps
            );
            
            for (let i = currentTimeStep + 1; i < endFrame; i++) {
                if (!this.cache.has(i) && !this.loadingQueue.has(i)) {
                    framesToPreload.push(i);
                }
            }
        } else if (direction === 'backward') {
            // Preload previous N frames
            const startFrame = Math.max(0, currentTimeStep - this.preloadWindow);
            
            for (let i = currentTimeStep - 1; i >= startFrame; i--) {
                if (!this.cache.has(i) && !this.loadingQueue.has(i)) {
                    framesToPreload.push(i);
                }
            }
        }

        // Load frames asynchronously (don't wait)
        if (framesToPreload.length > 0) {
            if (this.debugMode) {
                console.log(`[DataCacheManager] Preloading ${framesToPreload.length} frames ${direction}`);
            }
            
            // Load frames in background
            framesToPreload.forEach(timeStep => {
                this.loadFrame(timeStep).catch(error => {
                    // Silently handle preload errors
                    console.warn(`[DataCacheManager] Preload failed for frame ${timeStep}:`, error);
                });
            });
        }
    }

    /**
     * Update memory usage statistics
     * @private
     * @param {Object} data - Time step data
     * @param {string} operation - 'add' or 'remove'
     */
    updateMemoryStats(data, operation) {
        if (!data || !data.temperature_grid) {
            return;
        }

        // Estimate memory usage (rough calculation)
        // Each temperature value is a float64 (8 bytes)
        const rows = data.temperature_grid.length;
        const cols = data.temperature_grid[0]?.length || 0;
        const dataSize = rows * cols * 8; // 8 bytes per float64
        
        // Add overhead for object structure (rough estimate)
        const overhead = 200; // bytes for object metadata
        const totalSize = dataSize + overhead;

        if (operation === 'add') {
            this.stats.totalMemoryBytes += totalSize;
        } else if (operation === 'remove') {
            this.stats.totalMemoryBytes -= totalSize;
        }
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        const previousSize = this.cache.size;
        
        this.cache.clear();
        this.accessTimes.clear();
        this.loadingQueue.clear();
        this.loadingPromises.clear();
        
        // Reset statistics
        this.stats.totalMemoryBytes = 0;
        
        if (this.debugMode) {
            console.log(`[DataCacheManager] Cleared cache (${previousSize} frames)`);
        }
        
        // Emit clear event
        this.eventBus.emit('cache:cleared', {
            previousSize
        });
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStatus() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            : 0;

        return {
            cachedFrames: this.cache.size,
            totalFrames: this.metadata?.total_time_steps || 0,
            maxCacheSize: this.maxCacheSize,
            loadingFrames: this.loadingQueue.size,
            memoryUsageMB: (this.stats.totalMemoryBytes / (1024 * 1024)).toFixed(2),
            memoryUsageBytes: this.stats.totalMemoryBytes,
            hitRate: hitRate.toFixed(1),
            hits: this.stats.hits,
            misses: this.stats.misses,
            loads: this.stats.loads,
            evictions: this.stats.evictions,
            cacheUtilization: this.maxCacheSize > 0
                ? ((this.cache.size / this.maxCacheSize) * 100).toFixed(1)
                : 0
        };
    }

    /**
     * Check if a frame is cached
     * @param {number} timeStep - Time step index
     * @returns {boolean} True if frame is cached
     */
    isCached(timeStep) {
        return this.cache.has(timeStep);
    }

    /**
     * Check if a frame is currently loading
     * @param {number} timeStep - Time step index
     * @returns {boolean} True if frame is loading
     */
    isLoading(timeStep) {
        return this.loadingQueue.has(timeStep);
    }

    /**
     * Get cache coverage for a range of frames
     * @param {number} startFrame - Start frame index
     * @param {number} endFrame - End frame index
     * @returns {Object} Coverage information
     */
    getCoverage(startFrame, endFrame) {
        let cached = 0;
        let loading = 0;
        let missing = 0;

        for (let i = startFrame; i < endFrame; i++) {
            if (this.cache.has(i)) {
                cached++;
            } else if (this.loadingQueue.has(i)) {
                loading++;
            } else {
                missing++;
            }
        }

        const total = endFrame - startFrame;
        return {
            cached,
            loading,
            missing,
            total,
            cachedPercent: total > 0 ? ((cached / total) * 100).toFixed(1) : 0
        };
    }

    /**
     * Set preload window size
     * @param {number} size - Number of frames to preload ahead
     */
    setPreloadWindow(size) {
        this.preloadWindow = Math.max(1, Math.min(size, 50));
        
        if (this.debugMode) {
            console.log(`[DataCacheManager] Preload window set to ${this.preloadWindow}`);
        }
    }

    /**
     * Set maximum cache size
     * @param {number} size - Maximum number of frames to cache
     */
    setMaxCacheSize(size) {
        this.maxCacheSize = Math.max(10, size);
        
        // Evict frames if current cache exceeds new limit
        while (this.cache.size > this.maxCacheSize) {
            this.evictLRU();
        }
        
        if (this.debugMode) {
            console.log(`[DataCacheManager] Max cache size set to ${this.maxCacheSize}`);
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        console.log(`[DataCacheManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            ...this.getCacheStatus(),
            preloadWindow: this.preloadWindow,
            batchSize: this.batchSize,
            simulationId: this.simulationId,
            metadata: this.metadata,
            debugMode: this.debugMode
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            loads: 0,
            evictions: 0,
            totalMemoryBytes: this.stats.totalMemoryBytes // Keep memory count
        };
        
        if (this.debugMode) {
            console.log('[DataCacheManager] Statistics reset');
        }
    }

    /**
     * Start background loading of remaining frames
     * @private
     * @param {number} startFrame - Frame to start loading from
     */
    async startBackgroundLoading(startFrame) {
        if (!this.metadata) {
            console.warn('[DataCacheManager] Cannot start background loading - no metadata');
            return;
        }

        const totalFrames = this.metadata.total_time_steps;
        const remainingFrames = totalFrames - startFrame;

        if (remainingFrames <= 0) {
            console.log('[DataCacheManager] No remaining frames to load');
            return;
        }

        if (this.debugMode) {
            console.log(`[DataCacheManager] Starting background loading of ${remainingFrames} frames from frame ${startFrame}`);
        }

        // Emit background loading start event
        this.eventBus.emit('cache:background-loading-start', {
            startFrame,
            totalFrames,
            remainingFrames
        });

        try {
            // Load remaining frames in batches to avoid blocking
            const backgroundBatchSize = 20; // Larger batches for background loading
            let currentFrame = startFrame;

            while (currentFrame < totalFrames) {
                const batchEnd = Math.min(currentFrame + backgroundBatchSize, totalFrames);
                
                // Load batch without blocking (don't await)
                this.loadBatch(currentFrame, backgroundBatchSize, true).catch(error => {
                    console.error(`[DataCacheManager] Background batch loading failed:`, error);
                });

                // Small delay between batches to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));

                currentFrame = batchEnd;
            }

            // Emit background loading complete event
            this.eventBus.emit('cache:loading-complete', {
                cachedFrames: this.cache.size,
                totalFrames: this.metadata.total_time_steps,
                progress: 100
            });

            if (this.debugMode) {
                console.log('[DataCacheManager] Background loading completed');
            }

        } catch (error) {
            console.error('[DataCacheManager] Background loading failed:', error);
            this.eventBus.emit('cache:error', {
                type: 'background-loading',
                error: error.message
            });
        }
    }

    /**
     * Get estimated time remaining for loading
     * @returns {number|null} Estimated seconds remaining, or null if unknown
     */
    getEstimatedTimeRemaining() {
        if (!this.metadata || this.cache.size === 0) {
            return null;
        }

        const totalFrames = this.metadata.total_time_steps;
        const loadedFrames = this.cache.size;
        const remainingFrames = totalFrames - loadedFrames;

        if (remainingFrames <= 0) {
            return 0;
        }

        // Estimate based on average load time per frame
        // Assume ~100ms per frame as a rough estimate
        const estimatedTimePerFrame = 0.1; // seconds
        return remainingFrames * estimatedTimePerFrame;
    }

    /**
     * Check if initial batch is loaded and ready for playback
     * @returns {boolean} True if ready for playback
     */
    isReadyForPlayback() {
        if (!this.metadata) {
            return false;
        }

        // Ready if we have at least the initial batch loaded
        const minFramesForPlayback = Math.min(this.batchSize, this.metadata.total_time_steps);
        return this.cache.size >= minFramesForPlayback;
    }

    /**
     * Get loading progress information
     * @returns {Object} Loading progress details
     */
    getLoadingProgress() {
        if (!this.metadata) {
            return {
                isLoading: false,
                progress: 0,
                loaded: 0,
                total: 0,
                isComplete: false,
                isReadyForPlayback: false,
                estimatedTimeRemaining: null
            };
        }

        const totalFrames = this.metadata.total_time_steps;
        const loadedFrames = this.cache.size;
        const progress = (loadedFrames / totalFrames) * 100;
        const isComplete = loadedFrames >= totalFrames;
        const isLoading = this.loadingQueue.size > 0 || !isComplete;

        return {
            isLoading,
            progress,
            loaded: loadedFrames,
            total: totalFrames,
            isComplete,
            isReadyForPlayback: this.isReadyForPlayback(),
            estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
            loadingFrames: this.loadingQueue.size
        };
    }

    /**
     * Retry loading a specific frame
     * @param {number} timeStep - Time step to retry
     * @returns {Promise<Object>} Time step data
     */
    async retryFrame(timeStep) {
        if (this.debugMode) {
            console.log(`[DataCacheManager] Manual retry requested for frame ${timeStep}`);
        }

        // Remove from cache if it exists (to force reload)
        if (this.cache.has(timeStep)) {
            const data = this.cache.get(timeStep);
            this.cache.delete(timeStep);
            this.accessTimes.delete(timeStep);
            this.updateMemoryStats(data, 'remove');
        }

        // Remove from loading queue if it exists
        this.loadingQueue.delete(timeStep);
        this.loadingPromises.delete(timeStep);

        // Attempt to load the frame (will use retry logic)
        return this.loadFrame(timeStep);
    }

    /**
     * Retry loading all failed frames
     * @returns {Promise<void>}
     */
    async retryAllFailed() {
        if (!this.metadata) {
            throw new Error('Cache not initialized');
        }

        if (this.debugMode) {
            console.log('[DataCacheManager] Retrying all failed frames');
        }

        // Find all missing frames
        const missingFrames = [];
        for (let i = 0; i < this.metadata.total_time_steps; i++) {
            if (!this.cache.has(i) && !this.loadingQueue.has(i)) {
                missingFrames.push(i);
            }
        }

        if (missingFrames.length === 0) {
            if (this.debugMode) {
                console.log('[DataCacheManager] No failed frames to retry');
            }
            return;
        }

        if (this.debugMode) {
            console.log(`[DataCacheManager] Retrying ${missingFrames.length} failed frames`);
        }

        // Emit retry all event
        this.eventBus.emit('cache:retry-all', {
            totalFrames: missingFrames.length
        });

        // Load missing frames in batches
        const batchSize = 10;
        for (let i = 0; i < missingFrames.length; i += batchSize) {
            const batch = missingFrames.slice(i, i + batchSize);
            const promises = batch.map(timeStep => 
                this.loadFrame(timeStep).catch(error => {
                    console.error(`[DataCacheManager] Retry failed for frame ${timeStep}:`, error);
                    // Continue with other frames even if one fails
                    return null;
                })
            );

            await Promise.all(promises);
        }

        if (this.debugMode) {
            console.log('[DataCacheManager] Retry all completed');
        }

        // Emit completion event
        this.eventBus.emit('cache:retry-all-complete', {
            cachedFrames: this.cache.size,
            totalFrames: this.metadata.total_time_steps
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataCacheManager;
} else if (typeof window !== 'undefined') {
    window.DataCacheManager = DataCacheManager;
}
