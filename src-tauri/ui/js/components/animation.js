/**
 * AnimationController - Manages time animation state and playback
 * 
 * Handles animation state management including play/pause, time navigation,
 * speed control, and coordination with visualization updates.
 */
class AnimationController {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Animation state
        this.state = {
            isPlaying: false,
            currentTime: 0,
            totalTime: 0,
            currentTimeStep: 0,
            totalTimeSteps: 0,
            animationSpeed: 1.0,
            timeStepDuration: 0.5, // Default time step duration in seconds
            lastUpdateTime: null,
            animationId: null
        };
        
        // Animation configuration
        this.config = {
            minSpeed: 0.5,
            maxSpeed: 4.0,
            availableSpeeds: [0.5, 1.0, 2.0, 4.0],
            autoResetAtEnd: true,
            smoothTransitions: true
        };
        
        // Bind methods to preserve context
        this.play = this.play.bind(this);
        this.pause = this.pause.bind(this);
        this.toggle = this.toggle.bind(this);
        this.setTimeStep = this.setTimeStep.bind(this);
        this.setSpeed = this.setSpeed.bind(this);
        this.update = this.update.bind(this);
        this.reset = this.reset.bind(this);
        
        console.log('[AnimationController] Created with config:', this.config);
    }

    /**
     * Initialize animation with simulation data
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
     * Start animation playback
     */
    play() {
        if (this.state.totalTimeSteps <= 1) {
            console.warn('[AnimationController] Cannot play: insufficient time steps');
            return false;
        }
        
        if (this.state.isPlaying) {
            console.log('[AnimationController] Already playing');
            return true;
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
     */
    setTimeStep(timeStep) {
        const clampedTimeStep = Math.max(0, Math.min(timeStep, this.state.totalTimeSteps - 1));
        
        if (clampedTimeStep === this.state.currentTimeStep) {
            return true; // No change needed
        }
        
        const previousTimeStep = this.state.currentTimeStep;
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
     * @param {number} speed - Animation speed multiplier (0.5 to 4.0)
     */
    setSpeed(speed) {
        const clampedSpeed = Math.max(this.config.minSpeed, Math.min(speed, this.config.maxSpeed));
        
        if (clampedSpeed === this.state.animationSpeed) {
            return true; // No change needed
        }
        
        const previousSpeed = this.state.animationSpeed;
        this.state.animationSpeed = clampedSpeed;
        
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
            // Reached the end
            this.setTimeStep(this.state.totalTimeSteps - 1);
            
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
        } else {
            // Update to new time step if changed
            if (newTimeStep !== this.state.currentTimeStep) {
                this.setTimeStep(newTimeStep);
            } else {
                // Update time even if time step hasn't changed (for smooth progress)
                this.state.currentTime = newTime;
            }
        }
        
        // Continue animation loop
        this.state.animationId = requestAnimationFrame(this.update);
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
            canPlay: this.state.totalTimeSteps > 1,
            canStep: this.state.totalTimeSteps > 1,
            isAtEnd: this.state.currentTimeStep >= this.state.totalTimeSteps - 1,
            isAtBeginning: this.state.currentTimeStep === 0
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
     * Dispose of animation controller resources
     */
    dispose() {
        console.log('[AnimationController] Disposing resources...');
        
        // Stop animation
        this.pause();
        
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
            animationId: null
        };
        
        console.log('[AnimationController] Resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
} else if (typeof window !== 'undefined') {
    window.AnimationController = AnimationController;
}