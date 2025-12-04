/**
 * AnimationController - Manages time animation state and playback
 * 
 * Handles animation state management including play/pause, time navigation,
 * speed control, and coordination with visualization updates.
 */
class AnimationController {
    constructor(eventBus, dataCacheManager = null) {
        this.eventBus = eventBus;
        this.dataCacheManager = dataCacheManager;
        
        // Animation configuration (must be set before loading persisted speed)
        this.config = {
            minSpeed: 0.5,
            maxSpeed: 10.0,
            availableSpeeds: [0.5, 1.0, 2.0, 5.0, 10.0],
            autoResetAtEnd: true,
            smoothTransitions: true,
            preloadEnabled: true
        };
        
        // Load persisted speed from localStorage
        const persistedSpeed = this.loadPersistedSpeed();
        
        // Animation state
        this.state = {
            isPlaying: false,
            currentTime: 0,
            totalTime: 0,
            currentTimeStep: 0,
            totalTimeSteps: 0,
            animationSpeed: persistedSpeed,
            timeStepDuration: 0.5, // Default time step duration in seconds
            lastUpdateTime: null,
            animationId: null,
            isLoading: false,
            loadingTimeStep: null,
            isInitialized: false
        };
        
        // Animation metadata
        this.metadata = null;
        this.simulationId = null;
        
        // Bind methods to preserve context
        this.play = this.play.bind(this);
        this.pause = this.pause.bind(this);
        this.toggle = this.toggle.bind(this);
        this.setTimeStep = this.setTimeStep.bind(this);
        this.setSpeed = this.setSpeed.bind(this);
        this.update = this.update.bind(this);
        this.reset = this.reset.bind(this);
        this.initializeWithData = this.initializeWithData.bind(this);
        this.loadFrame = this.loadFrame.bind(this);
        
        console.log('[AnimationController] Created with config:', this.config);
    }

    /**
     * Initialize animation with simulation data (legacy method)
     * @param {Object} simulationData - Simulation results with time steps
     */
    initialize(simulationData) {
        try {
            if (!simulationData || !simulationData.timeSteps) {
                throw new Error('Invalid simulation data: missing time steps');
            }
            
            // Extract time information from simulation data
            this.state.totalTimeSteps = simulationData.timeSteps.length;
            this.state.totalTime = simulationData.duration || (this.state.totalTimeSteps * this.state.timeStepDuration);
            this.state.timeStepDuration = this.state.totalTime / Math.max(1, this.state.totalTimeSteps - 1);
            
            // Reset to initial state
            this.state.currentTime = 0;
            this.state.currentTimeStep = 0;
            this.state.isPlaying = false;
            this.state.lastUpdateTime = null;
            this.state.isInitialized = true;
            
            // Stop any existing animation
            if (this.state.animationId) {
                cancelAnimationFrame(this.state.animationId);
                this.state.animationId = null;
            }
            
            console.log('[AnimationController] Initialized with:', {
                totalTimeSteps: this.state.totalTimeSteps,
                totalTime: this.state.totalTime,
                timeStepDuration: this.state.timeStepDuration
            });
            
            // Emit initialization event
            this.eventBus.emit('animation:initialized', {
                totalTimeSteps: this.state.totalTimeSteps,
                totalTime: this.state.totalTime,
                timeStepDuration: this.state.timeStepDuration
            });
            
            return true;
            
        } catch (error) {
            console.error('[AnimationController] Failed to initialize:', error);
            this.eventBus.emit('animation:error', {
                type: 'initialization',
                message: error.message,
                error: error
            });
            return false;
        }
    }

    /**
     * Initialize animation with backend metadata and data cache manager
     * @param {string} simulationId - Simulation identifier
     * @param {Object} metadata - Animation metadata from backend
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initializeWithData(simulationId, metadata) {
        try {
            console.log('[AnimationController] Initializing with data:', { simulationId, metadata });
            
            // Validate inputs
            if (!simulationId) {
                throw new Error('Simulation ID is required');
            }
            
            if (!metadata) {
                throw new Error('Animation metadata is required');
            }
            
            if (!metadata.total_time_steps || metadata.total_time_steps < 1) {
                throw new Error('Invalid metadata: total_time_steps must be >= 1');
            }
            
            if (!this.dataCacheManager) {
                throw new Error('DataCacheManager is required for data-driven playback');
            }
            
            // Store metadata
            this.simulationId = simulationId;
            this.metadata = metadata;
            
            // Extract time information from metadata
            this.state.totalTimeSteps = metadata.total_time_steps;
            this.state.totalTime = metadata.simulation_duration || 0;
            this.state.timeStepDuration = metadata.time_interval || 
                (this.state.totalTime / Math.max(1, this.state.totalTimeSteps - 1));
            
            // Reset to initial state
            this.state.currentTime = 0;
            this.state.currentTimeStep = 0;
            this.state.isPlaying = false;
            this.state.lastUpdateTime = null;
            this.state.isLoading = false;
            this.state.loadingTimeStep = null;
            
            // Stop any existing animation
            if (this.state.animationId) {
                cancelAnimationFrame(this.state.animationId);
                this.state.animationId = null;
            }
            
            // Initialize data cache manager (this will load initial batch and start background loading)
            console.log('[AnimationController] Initializing data cache...');
            await this.dataCacheManager.initialize(simulationId, metadata);
            
            // Wait for cache to be ready for playback (initial batch loaded)
            console.log('[AnimationController] Waiting for cache to be ready...');
            const maxWaitTime = 30000; // 30 seconds max wait
            const startTime = Date.now();
            
            while (!this.dataCacheManager.isReadyForPlayback()) {
                if (Date.now() - startTime > maxWaitTime) {
                    throw new Error('Timeout waiting for initial data to load');
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Load first frame
            console.log('[AnimationController] Loading initial frame...');
            await this.loadFrame(0);
            
            // Mark as initialized
            this.state.isInitialized = true;
            
            console.log('[AnimationController] Initialized with data:', {
                simulationId: this.simulationId,
                totalTimeSteps: this.state.totalTimeSteps,
                totalTime: this.state.totalTime,
                timeStepDuration: this.state.timeStepDuration,
                temperatureRange: metadata.temperature_range,
                meshDimensions: metadata.mesh_dimensions,
                cacheStatus: this.dataCacheManager.getCacheStatus()
            });
            
            // Emit initialization event
            this.eventBus.emit('animation:initialized', {
                simulationId: this.simulationId,
                totalTimeSteps: this.state.totalTimeSteps,
                totalTime: this.state.totalTime,
                timeStepDuration: this.state.timeStepDuration,
                metadata: this.metadata
            });
            
            return true;
            
        } catch (error) {
            console.error('[AnimationController] Failed to initialize with data:', error);
            
            // Determine error type for better user messaging
            let errorType = 'initialization';
            let errorMessage = error.message;
            
            if (error.message.includes('backend') || error.message.includes('Backend') || 
                error.message.includes('unavailable') || error.message.includes('connection')) {
                errorType = 'backend-unavailable';
                errorMessage = 'Cannot connect to simulation backend. The backend may be unavailable or the simulation data may not exist.';
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorType = 'timeout';
                errorMessage = 'Loading animation data timed out. The simulation may be too large or the backend may be slow.';
            } else if (error.message.includes('metadata') || error.message.includes('invalid')) {
                errorType = 'invalid-data';
                errorMessage = 'Animation data is invalid or corrupted. Please re-run the simulation.';
            }
            
            // Emit error event with detailed information
            this.eventBus.emit('animation:error', {
                type: errorType,
                message: errorMessage,
                error: error,
                recoverable: errorType === 'backend-unavailable' || errorType === 'timeout',
                simulationId: simulationId
            });
            
            // Reset initialization state
            this.state.isInitialized = false;
            this.simulationId = null;
            this.metadata = null;
            
            return false;
        }
    }

    /**
     * Load a specific frame from the data cache with error handling
     * @param {number} timeStep - Time step to load
     * @param {boolean} throwOnError - Whether to throw error or handle gracefully (default: false)
     * @returns {Promise<Object>} Frame data
     */
    async loadFrame(timeStep, throwOnError = false) {
        try {
            // Validate time step
            if (timeStep < 0 || timeStep >= this.state.totalTimeSteps) {
                throw new Error(`Invalid time step: ${timeStep}. Valid range: 0-${this.state.totalTimeSteps - 1}`);
            }
            
            // Check if data cache manager is available
            if (!this.dataCacheManager) {
                throw new Error('DataCacheManager not available');
            }
            
            // Set loading state
            this.state.isLoading = true;
            this.state.loadingTimeStep = timeStep;
            
            // Emit loading start event
            this.eventBus.emit('animation:frame-loading', {
                timeStep: timeStep,
                time: timeStep * this.state.timeStepDuration
            });
            
            // Load frame data from cache (with retry logic)
            const frameData = await this.dataCacheManager.getTimeStepData(timeStep);
            
            // Clear loading state
            this.state.isLoading = false;
            this.state.loadingTimeStep = null;
            
            // Emit frame loaded event
            this.eventBus.emit('animation:frame-loaded', {
                timeStep: timeStep,
                time: frameData.time || (timeStep * this.state.timeStepDuration),
                data: frameData
            });
            
            // Trigger preloading if enabled
            if (this.config.preloadEnabled && this.state.isPlaying) {
                this.dataCacheManager.preloadFrames(timeStep, 'forward');
            }
            
            return frameData;
            
        } catch (error) {
            console.error(`[AnimationController] Failed to load frame ${timeStep}:`, error);
            
            // Clear loading state
            this.state.isLoading = false;
            this.state.loadingTimeStep = null;
            
            // Emit error event
            this.eventBus.emit('animation:error', {
                type: 'frame-load',
                message: `Failed to load frame ${timeStep}: ${error.message}`,
                timeStep: timeStep,
                error: error,
                recoverable: true
            });
            
            // Pause playback on error
            if (this.state.isPlaying) {
                console.log('[AnimationController] Pausing playback due to frame load error');
                this.pause();
            }
            
            // Either throw or return null based on throwOnError flag
            if (throwOnError) {
                throw error;
            } else {
                return null;
            }
        }
    }

    /**
     * Start animation playback
     */
    play() {
        // Check if initialized (for data-driven playback)
        if (this.dataCacheManager && !this.state.isInitialized) {
            console.warn('[AnimationController] Cannot play: not initialized with data');
            return false;
        }
        
        if (this.state.totalTimeSteps <= 1) {
            console.warn('[AnimationController] Cannot play: insufficient time steps');
            return false;
        }
        
        if (this.state.isPlaying) {
            console.log('[AnimationController] Already playing');
            return true;
        }
        
        // Check if currently loading
        if (this.state.isLoading) {
            console.warn('[AnimationController] Cannot play: frame is loading');
            return false;
        }
        
        // If at the end, reset to beginning
        if (this.state.currentTimeStep >= this.state.totalTimeSteps - 1) {
            if (this.config.autoResetAtEnd) {
                this.reset();
            } else {
                console.log('[AnimationController] At end, cannot play without reset');
                return false;
            }
        }
        
        this.state.isPlaying = true;
        this.state.lastUpdateTime = performance.now();
        
        // Start animation loop
        this.startAnimationLoop();
        
        console.log('[AnimationController] Animation started');
        
        this.eventBus.emit('animation:play', {
            currentTime: this.state.currentTime,
            currentTimeStep: this.state.currentTimeStep,
            speed: this.state.animationSpeed
        });
        
        return true;
    }

    /**
     * Pause animation playback
     */
    pause() {
        if (!this.state.isPlaying) {
            console.log('[AnimationController] Already paused');
            return true;
        }
        
        this.state.isPlaying = false;
        this.state.lastUpdateTime = null;
        
        // Stop animation loop
        if (this.state.animationId) {
            cancelAnimationFrame(this.state.animationId);
            this.state.animationId = null;
        }
        
        console.log('[AnimationController] Animation paused');
        
        this.eventBus.emit('animation:pause', {
            currentTime: this.state.currentTime,
            currentTimeStep: this.state.currentTimeStep
        });
        
        return true;
    }

    /**
     * Toggle play/pause state
     */
    toggle() {
        if (this.state.isPlaying) {
            return this.pause();
        } else {
            return this.play();
        }
    }

    /**
     * Set current time step directly
     * @param {number} timeStep - Target time step (0 to totalTimeSteps-1)
     * @returns {Promise<boolean>} True if successful
     */
    async setTimeStep(timeStep) {
        const clampedTimeStep = Math.max(0, Math.min(timeStep, this.state.totalTimeSteps - 1));
        
        if (clampedTimeStep === this.state.currentTimeStep) {
            return true; // No change needed
        }
        
        const previousTimeStep = this.state.currentTimeStep;
        
        try {
            // Load frame data if using data cache manager
            if (this.dataCacheManager && this.state.isInitialized) {
                await this.loadFrame(clampedTimeStep);
            }
            
            // Update state
            this.state.currentTimeStep = clampedTimeStep;
            this.state.currentTime = clampedTimeStep * this.state.timeStepDuration;
            
            console.log('[AnimationController] Time step changed:', {
                from: previousTimeStep,
                to: clampedTimeStep,
                time: this.state.currentTime
            });
            
            // Emit time change event
            this.eventBus.emit('animation:timeChanged', {
                timeStep: this.state.currentTimeStep,
                time: this.state.currentTime,
                totalTimeSteps: this.state.totalTimeSteps,
                totalTime: this.state.totalTime,
                progress: this.getProgress()
            });
            
            return true;
            
        } catch (error) {
            console.error('[AnimationController] Failed to set time step:', error);
            
            // Revert to previous time step on error
            this.state.currentTimeStep = previousTimeStep;
            this.state.currentTime = previousTimeStep * this.state.timeStepDuration;
            
            return false;
        }
    }

    /**
     * Set current time directly (will find closest time step)
     * @param {number} time - Target time in seconds
     */
    setTime(time) {
        const clampedTime = Math.max(0, Math.min(time, this.state.totalTime));
        const timeStep = Math.round(clampedTime / this.state.timeStepDuration);
        return this.setTimeStep(timeStep);
    }

    /**
     * Step forward one time step
     */
    stepForward() {
        return this.setTimeStep(this.state.currentTimeStep + 1);
    }

    /**
     * Step backward one time step
     */
    stepBackward() {
        return this.setTimeStep(this.state.currentTimeStep - 1);
    }

    /**
     * Set animation speed
     * @param {number} speed - Animation speed multiplier (0.5 to 10.0)
     */
    setSpeed(speed) {
        const clampedSpeed = Math.max(this.config.minSpeed, Math.min(speed, this.config.maxSpeed));
        
        if (clampedSpeed === this.state.animationSpeed) {
            return true; // No change needed
        }
        
        const previousSpeed = this.state.animationSpeed;
        this.state.animationSpeed = clampedSpeed;
        
        // Persist speed selection to localStorage
        this.persistSpeed(clampedSpeed);
        
        console.log('[AnimationController] Speed changed:', {
            from: previousSpeed,
            to: clampedSpeed
        });
        
        this.eventBus.emit('animation:speedChanged', {
            speed: this.state.animationSpeed,
            availableSpeeds: this.config.availableSpeeds
        });
        
        return true;
    }

    /**
     * Load persisted speed from localStorage
     * @returns {number} Persisted speed or default (1.0)
     * @private
     */
    loadPersistedSpeed() {
        try {
            const persistedSpeed = localStorage.getItem('animation_playback_speed');
            if (persistedSpeed !== null) {
                const speed = parseFloat(persistedSpeed);
                // Validate the persisted speed is within valid range
                if (!isNaN(speed) && speed >= this.config.minSpeed && speed <= this.config.maxSpeed) {
                    console.log('[AnimationController] Loaded persisted speed:', speed);
                    return speed;
                }
            }
        } catch (error) {
            console.warn('[AnimationController] Failed to load persisted speed:', error);
        }
        
        // Return default speed if no valid persisted value
        return 1.0;
    }

    /**
     * Persist speed to localStorage
     * @param {number} speed - Speed to persist
     * @private
     */
    persistSpeed(speed) {
        try {
            localStorage.setItem('animation_playback_speed', speed.toString());
            console.log('[AnimationController] Persisted speed:', speed);
        } catch (error) {
            console.warn('[AnimationController] Failed to persist speed:', error);
        }
    }

    /**
     * Reset animation to beginning
     */
    reset() {
        const wasPlaying = this.state.isPlaying;
        
        // Pause if playing
        if (wasPlaying) {
            this.pause();
        }
        
        // Reset to beginning
        this.state.currentTime = 0;
        this.state.currentTimeStep = 0;
        this.state.lastUpdateTime = null;
        
        console.log('[AnimationController] Animation reset to beginning');
        
        // Emit reset event
        this.eventBus.emit('animation:reset', {
            currentTime: this.state.currentTime,
            currentTimeStep: this.state.currentTimeStep
        });
        
        // Emit time change to update visualization
        this.eventBus.emit('animation:timeChanged', {
            timeStep: this.state.currentTimeStep,
            time: this.state.currentTime,
            totalTimeSteps: this.state.totalTimeSteps,
            totalTime: this.state.totalTime,
            progress: this.getProgress()
        });
        
        return true;
    }

    /**
     * Start the animation update loop
     * @private
     */
    startAnimationLoop() {
        if (this.state.animationId) {
            cancelAnimationFrame(this.state.animationId);
        }
        
        this.state.animationId = requestAnimationFrame(this.update);
    }

    /**
     * Animation update loop
     * @private
     */
    update(currentTime) {
        if (!this.state.isPlaying) {
            this.state.animationId = null;
            return;
        }
        
        // Skip update if currently loading a frame
        if (this.state.isLoading) {
            this.state.animationId = requestAnimationFrame(this.update);
            return;
        }
        
        // Calculate time delta
        const deltaTime = this.state.lastUpdateTime ? 
            (currentTime - this.state.lastUpdateTime) / 1000 : 0; // Convert to seconds
        
        this.state.lastUpdateTime = currentTime;
        
        // Update animation time
        const timeIncrement = deltaTime * this.state.animationSpeed;
        const newTime = this.state.currentTime + timeIncrement;
        const newTimeStep = Math.floor(newTime / this.state.timeStepDuration);
        
        // Check if we've reached the end
        if (newTimeStep >= this.state.totalTimeSteps - 1) {
            // Reached the end - use async handler
            this.handleAnimationEnd();
        } else {
            // Update to new time step if changed
            if (newTimeStep !== this.state.currentTimeStep) {
                // Load frame asynchronously
                this.setTimeStep(newTimeStep).catch(error => {
                    console.error('[AnimationController] Frame load failed during playback:', error);
                    // Pause on error
                    this.pause();
                });
            } else {
                // Update time even if time step hasn't changed (for smooth progress)
                this.state.currentTime = newTime;
            }
        }
        
        // Continue animation loop
        this.state.animationId = requestAnimationFrame(this.update);
    }

    /**
     * Handle animation end (reached last frame)
     * @private
     */
    async handleAnimationEnd() {
        try {
            // Set to last time step
            await this.setTimeStep(this.state.totalTimeSteps - 1);
            
            if (this.config.autoResetAtEnd) {
                // Auto-pause at end
                this.pause();
                
                this.eventBus.emit('animation:ended', {
                    totalTime: this.state.totalTime,
                    totalTimeSteps: this.state.totalTimeSteps
                });
            } else {
                // Continue playing (loop)
                this.reset();
            }
        } catch (error) {
            console.error('[AnimationController] Error handling animation end:', error);
            this.pause();
        }
    }

    /**
     * Get current animation progress (0 to 1)
     * @returns {number} Progress from 0 to 1
     */
    getProgress() {
        if (this.state.totalTimeSteps <= 1) {
            return 0;
        }
        
        return this.state.currentTimeStep / (this.state.totalTimeSteps - 1);
    }

    /**
     * Get current animation state
     * @returns {Object} Current state
     */
    getState() {
        return {
            isPlaying: this.state.isPlaying,
            currentTime: this.state.currentTime,
            totalTime: this.state.totalTime,
            currentTimeStep: this.state.currentTimeStep,
            totalTimeSteps: this.state.totalTimeSteps,
            animationSpeed: this.state.animationSpeed,
            progress: this.getProgress(),
            canPlay: this.state.totalTimeSteps > 1 && !this.state.isLoading,
            canStep: this.state.totalTimeSteps > 1 && !this.state.isLoading,
            isAtEnd: this.state.currentTimeStep >= this.state.totalTimeSteps - 1,
            isAtBeginning: this.state.currentTimeStep === 0,
            isLoading: this.state.isLoading,
            loadingTimeStep: this.state.loadingTimeStep,
            isInitialized: this.state.isInitialized,
            metadata: this.metadata
        };
    }

    /**
     * Get available animation speeds
     * @returns {Array} Array of available speed values
     */
    getAvailableSpeeds() {
        return [...this.config.availableSpeeds];
    }

    /**
     * Check if animation can be played
     * @returns {boolean} True if animation can be played
     */
    canPlay() {
        return this.state.totalTimeSteps > 1 && 
               (this.state.currentTimeStep < this.state.totalTimeSteps - 1 || this.config.autoResetAtEnd);
    }

    /**
     * Set data cache manager
     * @param {DataCacheManager} dataCacheManager - Data cache manager instance
     */
    setDataCacheManager(dataCacheManager) {
        this.dataCacheManager = dataCacheManager;
        console.log('[AnimationController] Data cache manager set');
    }

    /**
     * Enable or disable frame preloading
     * @param {boolean} enabled - Whether to enable preloading
     */
    setPreloadEnabled(enabled) {
        this.config.preloadEnabled = Boolean(enabled);
        console.log(`[AnimationController] Frame preloading ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if animation is initialized with data
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.state.isInitialized;
    }

    /**
     * Get animation metadata
     * @returns {Object|null} Animation metadata
     */
    getMetadata() {
        return this.metadata;
    }

    /**
     * Get simulation ID
     * @returns {string|null} Simulation ID
     */
    getSimulationId() {
        return this.simulationId;
    }

    /**
     * Check if a frame is currently loading
     * @returns {boolean} True if loading
     */
    isLoadingFrame() {
        return this.state.isLoading;
    }

    /**
     * Get cache status from data cache manager
     * @returns {Object|null} Cache status or null if no cache manager
     */
    getCacheStatus() {
        if (!this.dataCacheManager) {
            return null;
        }
        
        return this.dataCacheManager.getCacheStatus();
    }

    /**
     * Dispose of animation controller resources
     */
    dispose() {
        console.log('[AnimationController] Disposing resources...');
        
        // Stop animation
        this.pause();
        
        // Clear data cache if available
        if (this.dataCacheManager) {
            this.dataCacheManager.clearCache();
        }
        
        // Clear state
        this.state = {
            isPlaying: false,
            currentTime: 0,
            totalTime: 0,
            currentTimeStep: 0,
            totalTimeSteps: 0,
            animationSpeed: 1.0,
            timeStepDuration: 0.5,
            lastUpdateTime: null,
            animationId: null,
            isLoading: false,
            loadingTimeStep: null,
            isInitialized: false
        };
        
        // Clear metadata
        this.metadata = null;
        this.simulationId = null;
        
        console.log('[AnimationController] Resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
} else if (typeof window !== 'undefined') {
    window.AnimationController = AnimationController;
}