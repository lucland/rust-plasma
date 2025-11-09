/**
 * AppState - Application state management with state machine
 * 
 * Manages application state transitions with validation and persistence
 * for debugging state transitions and ensuring predictable behavior.
 */
class AppState {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // State machine definition
        this.validTransitions = {
            'INITIAL': ['READY'],
            'READY': ['RUNNING'],
            'RUNNING': ['RESULTS', 'READY'], // READY for cancellation/error
            'RESULTS': ['READY'] // New simulation
        };

        // Initialize state
        this.state = {
            phase: 'INITIAL',
            parameters: this.getDefaultParameters(),
            simulation: {
                progress: 0,
                estimatedTime: null,
                results: null,
                startTime: null,
                endTime: null
            },
            visualization: {
                currentTime: 0,
                isPlaying: false,
                animationSpeed: 1.0,
                timeSteps: []
            },
            errors: [],
            lastTransition: null
        };

        // State persistence for debugging
        this.stateHistory = [];
        this.maxHistorySize = 50;
        this.debugMode = true;

        // Bind methods to preserve context
        this.transition = this.transition.bind(this);
        this.canTransition = this.canTransition.bind(this);
        this.validateState = this.validateState.bind(this);

        // Initialize with first state
        this.recordStateChange('INITIAL', 'Application initialized');
    }

    /**
     * Get default parameter values
     * @returns {Object} Default parameters
     */
    getDefaultParameters() {
        return {
            furnace: {
                height: 2.0,
                radius: 1.0
            },
            torch: {
                power: 150,
                position: {
                    r: 0.0,
                    z: 1.0
                },
                efficiency: 0.8
            },
            material: "Steel",
            simulation: {
                duration: 60,
                timeStep: 0.5
            }
        };
    }

    /**
     * Get current state phase
     * @returns {string} Current phase
     */
    getPhase() {
        return this.state.phase;
    }

    /**
     * Get current state (read-only copy)
     * @returns {Object} Current state
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Check if a state transition is valid
     * @param {string} fromPhase - Current phase
     * @param {string} toPhase - Target phase
     * @returns {boolean} True if transition is valid
     */
    canTransition(fromPhase, toPhase) {
        return this.validTransitions[fromPhase]?.includes(toPhase) || false;
    }

    /**
     * Transition to a new state phase
     * @param {string} newPhase - Target phase
     * @param {Object} data - Additional state data to update
     * @param {string} reason - Reason for transition (for debugging)
     * @returns {boolean} True if transition was successful
     */
    transition(newPhase, data = {}, reason = '') {
        const currentPhase = this.state.phase;

        // Validate transition
        if (!this.canTransition(currentPhase, newPhase)) {
            const error = `Invalid state transition: ${currentPhase} -> ${newPhase}`;
            console.error('[AppState]', error);
            this.addError('state_transition', error);
            return false;
        }

        // Store previous state for rollback if needed
        const previousState = this.getState();

        try {
            // Update state
            this.state.phase = newPhase;
            this.state.lastTransition = {
                from: currentPhase,
                to: newPhase,
                timestamp: new Date().toISOString(),
                reason: reason
            };

            // Apply additional data updates
            if (data && typeof data === 'object') {
                this.updateStateData(data);
            }

            // Validate new state
            const validation = this.validateState();
            if (!validation.isValid) {
                throw new Error(`State validation failed: ${validation.errors.join(', ')}`);
            }

            // Record state change
            this.recordStateChange(newPhase, reason, data);

            // Emit state change event
            this.eventBus.emit('state:changed', {
                from: currentPhase,
                to: newPhase,
                state: this.getState(),
                reason: reason
            });

            if (this.debugMode) {
                console.log(`[AppState] Transition: ${currentPhase} -> ${newPhase}`, reason);
            }

            return true;

        } catch (error) {
            // Rollback on error
            this.state = previousState;
            console.error('[AppState] Transition failed, rolling back:', error);
            this.addError('state_transition', error.message);
            return false;
        }
    }

    /**
     * Update state data without changing phase
     * @param {Object} data - Data to update
     */
    updateStateData(data) {
        if (data.parameters) {
            this.state.parameters = { ...this.state.parameters, ...data.parameters };
        }
        if (data.simulation) {
            this.state.simulation = { ...this.state.simulation, ...data.simulation };
        }
        if (data.visualization) {
            this.state.visualization = { ...this.state.visualization, ...data.visualization };
        }
        if (data.errors) {
            this.state.errors = [...this.state.errors, ...data.errors];
        }
    }

    /**
     * Validate current state
     * @returns {Object} Validation result
     */
    validateState() {
        const errors = [];
        const state = this.state;

        // Validate phase
        if (!['INITIAL', 'READY', 'RUNNING', 'RESULTS'].includes(state.phase)) {
            errors.push(`Invalid phase: ${state.phase}`);
        }

        // Validate parameters based on phase
        if (state.phase === 'READY' || state.phase === 'RUNNING' || state.phase === 'RESULTS') {
            const paramValidation = this.validateParameters(state.parameters);
            if (!paramValidation.isValid) {
                errors.push(...paramValidation.errors);
            }
        }

        // Validate simulation state
        if (state.phase === 'RUNNING') {
            if (state.simulation.progress < 0 || state.simulation.progress > 100) {
                errors.push(`Invalid simulation progress: ${state.simulation.progress}`);
            }
        }

        // Validate visualization state
        if (state.phase === 'RESULTS') {
            if (!state.simulation.results) {
                errors.push('Results phase requires simulation results');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate simulation parameters
     * @param {Object} parameters - Parameters to validate
     * @returns {Object} Validation result
     */
    validateParameters(parameters) {
        const errors = [];

        // Validate furnace geometry
        if (!parameters.furnace) {
            errors.push('Furnace parameters required');
        } else {
            const { height, radius } = parameters.furnace;
            if (height < 1.0 || height > 5.0) {
                errors.push('Furnace height must be between 1.0 and 5.0 meters');
            }
            if (radius < 0.5 || radius > 2.0) {
                errors.push('Furnace radius must be between 0.5 and 2.0 meters');
            }
        }

        // Validate torch parameters
        if (!parameters.torch) {
            errors.push('Torch parameters required');
        } else {
            const { power, position, efficiency } = parameters.torch;
            if (power < 50 || power > 300) {
                errors.push('Torch power must be between 50 and 300 kW');
            }
            if (efficiency < 0.7 || efficiency > 0.9) {
                errors.push('Torch efficiency must be between 0.7 and 0.9');
            }
            if (position) {
                // Torch positions are normalized (0-1), not absolute coordinates
                if (position.r < 0 || position.r > 1) {
                    errors.push('Torch radial position must be between 0 and 1 (normalized)');
                }
                if (position.z < 0 || position.z > 1) {
                    errors.push('Torch axial position must be between 0 and 1 (normalized)');
                }
            }
        }

        // Validate material
        const validMaterials = ['Steel', 'Aluminum', 'Concrete'];
        if (!validMaterials.includes(parameters.material)) {
            errors.push(`Material must be one of: ${validMaterials.join(', ')}`);
        }

        // Validate simulation settings
        if (!parameters.simulation) {
            errors.push('Simulation parameters required');
        } else {
            const { duration, timeStep } = parameters.simulation;
            if (duration < 10 || duration > 300) {
                errors.push('Simulation duration must be between 10 and 300 seconds');
            }
            if (timeStep < 0.1 || timeStep > 1.0) {
                errors.push('Time step must be between 0.1 and 1.0 seconds');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Check if simulation can be run
     * @returns {boolean} True if simulation can be run
     */
    canRunSimulation() {
        return this.state.phase === 'READY' && 
               this.validateParameters(this.state.parameters).isValid;
    }

    /**
     * Update parameters
     * @param {Object} parameters - New parameters
     */
    updateParameters(parameters) {
        this.updateStateData({ parameters });
        
        // Check if we can transition to READY state
        if (this.state.phase === 'INITIAL' && this.validateParameters(parameters).isValid) {
            this.transition('READY', {}, 'Parameters validated');
        }

        // Don't emit parameters:changed here - it causes infinite loops
        // The parameter panel already emits this event when parameters change
    }

    /**
     * Add an error to the state
     * @param {string} type - Error type
     * @param {string} message - Error message
     */
    addError(type, message) {
        const error = {
            type,
            message,
            timestamp: new Date().toISOString(),
            phase: this.state.phase
        };

        this.state.errors.push(error);

        // Limit error history
        if (this.state.errors.length > 20) {
            this.state.errors.shift();
        }

        this.eventBus.emit('error', error);
    }

    /**
     * Clear errors
     * @param {string} [type] - Error type to clear (optional)
     */
    clearErrors(type = null) {
        if (type) {
            this.state.errors = this.state.errors.filter(error => error.type !== type);
        } else {
            this.state.errors = [];
        }
    }

    /**
     * Record state change for debugging
     * @private
     */
    recordStateChange(phase, reason, data = null) {
        const record = {
            phase,
            reason,
            timestamp: new Date().toISOString(),
            state: this.getState(),
            data
        };

        this.stateHistory.push(record);

        // Maintain history size
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * Get state history for debugging
     * @param {number} [limit] - Maximum number of records to return
     * @returns {Array} State history
     */
    getStateHistory(limit = null) {
        if (limit && limit > 0) {
            return this.stateHistory.slice(-limit);
        }
        return [...this.stateHistory];
    }

    /**
     * Reset state to initial
     */
    reset() {
        const wasReset = this.transition('INITIAL', {
            parameters: this.getDefaultParameters(),
            simulation: {
                progress: 0,
                estimatedTime: null,
                results: null,
                startTime: null,
                endTime: null
            },
            visualization: {
                currentTime: 0,
                isPlaying: false,
                animationSpeed: 1.0,
                timeSteps: []
            },
            errors: []
        }, 'Application reset');

        if (wasReset) {
            this.eventBus.emit('state:reset', this.getState());
        }

        return wasReset;
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            currentPhase: this.state.phase,
            validTransitions: this.validTransitions[this.state.phase] || [],
            canRunSimulation: this.canRunSimulation(),
            errorCount: this.state.errors.length,
            historySize: this.stateHistory.length,
            lastTransition: this.state.lastTransition,
            validation: this.validateState()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
} else if (typeof window !== 'undefined') {
    window.AppState = AppState;
}