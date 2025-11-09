/**
 * SimulationController - Manages simulation execution and progress tracking
 * 
 * Handles simulation lifecycle, progress monitoring, cancellation support,
 * and timeout handling. Integrates with Tauri backend commands.
 */
class SimulationController {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentSimulation = null;
        this.progressInterval = null;
        this.timeoutHandle = null;
        this.defaultTimeout = 300000; // 5 minutes default timeout
        this.isInitialized = false;
        
        // Error handling configuration
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        this.backendCheckInterval = null;
        this.backendAvailable = null; // null = unknown, true = available, false = unavailable
        this.lastBackendCheck = null;
        this.backendCheckTimeout = 30000; // 30 seconds cache
        
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.runSimulation = this.runSimulation.bind(this);
        this.cancelSimulation = this.cancelSimulation.bind(this);
        this.checkProgress = this.checkProgress.bind(this);
        this.handleTimeout = this.handleTimeout.bind(this);
        this.checkBackendAvailability = this.checkBackendAvailability.bind(this);
        this.retryOperation = this.retryOperation.bind(this);
        this.handleBackendError = this.handleBackendError.bind(this);
        
        console.log('[SimulationController] Created');
    }

    /**
     * Initialize the simulation controller
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        try {
            // Wait for Tauri API to be available
            await this.waitForTauriAPI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check backend availability
            await this.checkBackendAvailability();
            
            this.isInitialized = true;
            console.log('[SimulationController] Initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('[SimulationController] Failed to initialize:', error);
            this.eventBus.emit('error:simulation', {
                type: 'initialization_failed',
                message: 'Failed to initialize simulation controller',
                error: error
            });
            return false;
        }
    }
    
    /**
     * Wait for Tauri API to be available
     * @returns {Promise<void>}
     */
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
    
    /**
     * Set up event listeners for Tauri events
     */
    setupEventListeners() {
        // Listen for UI events
        this.eventBus.on('simulation:run', this.runSimulation);
        this.eventBus.on('simulation:cancel', this.cancelSimulation);
        
        // Listen for retry requests
        this.eventBus.on('error:retry', (errorInfo) => {
            if (errorInfo.context === 'simulation' && errorInfo.retryable) {
                this.retryLastSimulation();
            }
        });
    }
    
    /**
     * Check if Tauri backend is available
     * @returns {Promise<boolean>} True if backend is available
     */
    async checkBackendAvailability() {
        // Use cached result if recent
        if (this.lastBackendCheck && 
            (Date.now() - this.lastBackendCheck) < this.backendCheckTimeout) {
            return this.backendAvailable;
        }
        
        console.log('[SimulationController] Checking backend availability...');
        
        try {
            // Check if Tauri API is available
            if (!window.__TAURI__) {
                console.warn('[SimulationController] Tauri API not available');
                this.backendAvailable = false;
                this.lastBackendCheck = Date.now();
                return false;
            }
            
            // In Tauri v2, the API is always available if window.__TAURI__ exists
            // No need to ping - if the object exists, the backend is ready
            console.log('[SimulationController] Tauri API detected, backend is available');
            this.backendAvailable = true;
            
            this.lastBackendCheck = Date.now();
            return this.backendAvailable;
            
        } catch (error) {
            console.error('[SimulationController] Backend availability check failed:', error);
            this.backendAvailable = false;
            this.lastBackendCheck = Date.now();
            return false;
        }
    }
    
    /**
     * Retry an operation with exponential backoff
     * @param {Function} operation - Async operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} Operation result
     */
    async retryOperation(operation, maxRetries = this.maxRetries, baseDelay = this.retryDelay) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[SimulationController] Attempt ${attempt + 1}/${maxRetries + 1}`);
                
                // Check backend availability before retry
                if (attempt > 0) {
                    const isAvailable = await this.checkBackendAvailability();
                    if (!isAvailable) {
                        throw new Error('Backend is not available');
                    }
                }
                
                const result = await operation();
                
                if (attempt > 0) {
                    console.log(`[SimulationController] Operation succeeded on attempt ${attempt + 1}`);
                    this.eventBus.emit('simulation:retry-success', { attempt: attempt + 1 });
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`[SimulationController] Attempt ${attempt + 1} failed:`, error.message);
                
                // Don't retry on validation errors or user cancellations
                if (this.isNonRetryableError(error)) {
                    console.log('[SimulationController] Non-retryable error, aborting retry');
                    throw error;
                }
                
                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                    console.log(`[SimulationController] Waiting ${delay}ms before retry...`);
                    
                    this.eventBus.emit('simulation:retrying', {
                        attempt: attempt + 1,
                        maxRetries: maxRetries + 1,
                        nextRetryIn: delay,
                        error: error.message
                    });
                    
                    await this.sleep(delay);
                }
            }
        }
        
        // All retries exhausted
        console.error('[SimulationController] All retry attempts exhausted');
        throw lastError;
    }
    
    /**
     * Check if error is non-retryable
     * @param {Error} error - Error to check
     * @returns {boolean} True if error should not be retried
     */
    isNonRetryableError(error) {
        const message = error.message?.toLowerCase() || '';
        
        // Don't retry validation errors
        if (message.includes('invalid') || 
            message.includes('validation') ||
            message.includes('parameter')) {
            return true;
        }
        
        // Don't retry user cancellations
        if (message.includes('cancel')) {
            return true;
        }
        
        // Don't retry if explicitly marked as non-retryable
        if (error.retryable === false) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle backend errors with appropriate user feedback
     * @param {Error} error - Error object
     * @param {string} operation - Operation that failed
     * @param {Object} context - Additional context
     */
    handleBackendError(error, operation, context = {}) {
        console.error(`[SimulationController] Backend error during ${operation}:`, error);
        
        const errorMessage = error.message || 'Unknown error';
        const isConnectionError = this.isConnectionError(error);
        const isTimeoutError = this.isTimeoutError(error);
        
        let errorType = 'backend_error';
        let userMessage = `Failed to ${operation}`;
        let suggestions = [];
        let retryable = true;
        
        if (isConnectionError) {
            errorType = 'connection_failed';
            userMessage = 'Cannot connect to the simulation backend';
            suggestions = [
                'Check that the application is running properly',
                'Try restarting the application',
                'Check your system resources'
            ];
            retryable = true;
        } else if (isTimeoutError) {
            errorType = 'timeout';
            userMessage = 'The operation took too long and timed out';
            suggestions = [
                'Try reducing the simulation duration or mesh resolution',
                'Check your system resources',
                'Try again with simpler parameters'
            ];
            retryable = true;
        } else if (errorMessage.includes('memory')) {
            errorType = 'memory_error';
            userMessage = 'The simulation ran out of memory';
            suggestions = [
                'Reduce the mesh resolution',
                'Reduce the simulation duration',
                'Close other applications to free up memory'
            ];
            retryable = false;
        } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
            errorType = 'validation_error';
            userMessage = `Invalid parameters: ${errorMessage}`;
            suggestions = [
                'Check that all parameter values are within valid ranges',
                'Try using default parameter values',
                'Review the parameter requirements'
            ];
            retryable = false;
        } else {
            userMessage = `Backend error: ${errorMessage}`;
            suggestions = [
                'Try running the simulation again',
                'Check the application logs for details',
                'Try with different parameters'
            ];
            retryable = true;
        }
        
        // Emit error event for UI handling
        this.eventBus.emit('simulation:error', {
            type: errorType,
            operation: operation,
            message: userMessage,
            originalError: errorMessage,
            retryable: retryable,
            suggestions: suggestions,
            context: context,
            timestamp: new Date().toISOString()
        });
        
        return {
            type: errorType,
            message: userMessage,
            retryable: retryable
        };
    }
    
    /**
     * Check if error is a connection error
     * @param {Error} error - Error to check
     * @returns {boolean} True if connection error
     */
    isConnectionError(error) {
        const message = error.message?.toLowerCase() || '';
        return message.includes('connection') ||
               message.includes('network') ||
               message.includes('not available') ||
               message.includes('unavailable') ||
               !window.__TAURI__;
    }
    
    /**
     * Check if error is a timeout error
     * @param {Error} error - Error to check
     * @returns {boolean} True if timeout error
     */
    isTimeoutError(error) {
        const message = error.message?.toLowerCase() || '';
        return message.includes('timeout') ||
               message.includes('timed out') ||
               message.includes('time limit');
    }
    
    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Retry the last simulation with same parameters
     * @returns {Promise<Object>} Simulation result
     */
    async retryLastSimulation() {
        if (!this.currentSimulation || !this.currentSimulation.parameters) {
            console.warn('[SimulationController] No simulation to retry');
            return { success: false, message: 'No simulation to retry' };
        }
        
        console.log('[SimulationController] Retrying last simulation...');
        const parameters = this.currentSimulation.parameters;
        
        // Clear current simulation state
        this.cleanup();
        this.currentSimulation = null;
        
        // Retry the simulation
        return await this.runSimulation(parameters);
    }
    
    /**
     * Set up real-time progress event listeners from Tauri backend
     * Listens for simulation-progress events and updates UI accordingly
     */
    setupProgressListener() {
        if (!window.__TAURI__) {
            console.warn('[SimulationController] Tauri not available, cannot set up progress listener');
            return;
        }
        
        console.log('[SimulationController] Setting up progress listener for simulation:', this.currentSimulation?.id);
        
        // Listen for simulation progress events from backend
        window.__TAURI__.event.listen('simulation-progress', (event) => {
            const { simulation_id, progress } = event.payload;
            
            // Only handle progress updates for the current simulation
            if (this.currentSimulation && simulation_id === this.currentSimulation.id) {
                console.log('[SimulationController] Progress update received:', {
                    simulationId: simulation_id,
                    percent: progress.progress_percent,
                    currentTime: progress.current_time,
                    status: progress.status
                });
                
                // Update progress data
                this.updateProgress(progress);
            } else {
                console.log('[SimulationController] Ignoring progress update for different simulation:', simulation_id);
            }
        });
        
        // Listen for simulation completion events from backend
        window.__TAURI__.event.listen('simulation-completed', (event) => {
            const { simulation_id } = event.payload;
            
            // Only handle completion for the current simulation
            if (this.currentSimulation && simulation_id === this.currentSimulation.id) {
                console.log('[SimulationController] Completion event received for simulation:', simulation_id);
                this.handleSimulationCompletion(event.payload);
            } else {
                console.log('[SimulationController] Ignoring completion event for different simulation:', simulation_id);
            }
        });
        
        console.log('[SimulationController] Progress listener set up successfully');
    }
    
    /**
     * Start a new simulation with the given parameters
     * @param {Object} parameters - Simulation parameters
     * @param {Object} options - Execution options (timeout, etc.)
     * @returns {Promise<Object>} Simulation result
     */
    async runSimulation(parameters, options = {}) {
        console.log('🚀 [SIMULATION] Starting simulation process...');
        console.log('📊 [SIMULATION] Input parameters:', parameters);
        console.log('⚙️ [SIMULATION] Options:', options);
        
        try {
            console.log('✅ [SIMULATION] Validating parameters...');
            
            // Transform frontend parameters to backend format
            const backendParameters = this.transformParameters(parameters);
            console.log('🔄 [SIMULATION] Transformed parameters:', backendParameters);
            
            // Validate parameters
            const validation = this.validateParameters(backendParameters);
            console.log('✅ [SIMULATION] Parameter validation result:', validation);
            
            if (!validation.isValid) {
                console.error('❌ [SIMULATION] Parameter validation failed:', validation.errors);
                throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
            }
            
            console.log('🔍 [SIMULATION] Checking for existing simulation...');
            // Check if simulation is already running
            if (this.currentSimulation && this.isSimulationActive()) {
                console.error('❌ [SIMULATION] Another simulation is already running:', this.currentSimulation);
                throw new Error('Another simulation is already running');
            }
            
            console.log('⏰ [SIMULATION] Setting up timeout...');
            // Set timeout
            const timeout = options.timeout || this.defaultTimeout;
            console.log('⏰ [SIMULATION] Timeout set to:', timeout, 'ms');
            this.setupTimeout(timeout);
            
            console.log('📡 [SIMULATION] Emitting simulation:starting event...');
            // Emit simulation starting event
            this.eventBus.emit('simulation:starting', { parameters, options });
            
            console.log('🔌 [SIMULATION] Checking backend availability...');
            
            // Check backend availability with retry
            const isAvailable = await this.checkBackendAvailability();
            if (!isAvailable) {
                const error = new Error('Tauri backend is not available. Cannot run simulation.');
                this.handleBackendError(error, 'check backend availability', { parameters });
                throw error;
            }
            
            console.log('🔌 [SIMULATION] Backend is available, starting simulation...');
            
            // Call Tauri command with retry logic for transient failures
            console.log('🔌 [SIMULATION] Calling Tauri command: run_simulation...');
            const result = await this.retryOperation(async () => {
                return await window.__TAURI__.core.invoke('run_simulation', { parameters: backendParameters });
            });
            console.log('🔌 [SIMULATION] Tauri command result:', result);
            
            if (result.success) {
                console.log('✅ [SIMULATION] Simulation started successfully, storing info...');
                // Store simulation info
                this.currentSimulation = {
                    id: result.simulation_id,
                    parameters: parameters,
                    startTime: new Date(),
                    status: 'running',
                    progress: {
                        percent: 0,
                        currentTime: 0,
                        estimatedRemaining: null
                    }
                };
                
                console.log('📊 [SIMULATION] Current simulation info:', this.currentSimulation);
                
                console.log('📡 [SIMULATION] Setting up progress listener...');
                // Set up real-time progress listener for backend events
                this.setupProgressListener();
                
                console.log('📈 [SIMULATION] Starting progress monitoring...');
                // Start progress monitoring
                this.startProgressMonitoring();
                
                console.log('📡 [SIMULATION] Emitting simulation:started event...');
                // Emit simulation started event
                this.eventBus.emit('simulation:started', {
                    simulationId: result.simulation_id,
                    parameters: parameters
                });
                
                console.log('🎉 [SIMULATION] Simulation started successfully:', result.simulation_id);
                
                return {
                    success: true,
                    simulationId: result.simulation_id,
                    message: 'Simulation started successfully'
                };
            } else {
                console.error('❌ [SIMULATION] Tauri command failed:', result);
                throw new Error(result.message || 'Failed to start simulation');
            }
            
        } catch (error) {
            console.error('💥 [SIMULATION] Failed to start simulation:', error);
            console.error('📍 [SIMULATION] Error stack:', error.stack);
            
            console.log('🧹 [SIMULATION] Cleaning up after error...');
            // Clean up on error
            this.cleanup();
            
            console.log('📡 [SIMULATION] Handling backend error...');
            // Handle backend error with user-friendly messaging
            this.handleBackendError(error, 'start simulation', { 
                parameters: parameters,
                backendParameters: backendParameters 
            });
            
            throw error;
        }
    }
    

    
    /**
     * Cancel the currently running simulation
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelSimulation() {
        try {
            if (!this.currentSimulation || !this.isSimulationActive()) {
                console.warn('[SimulationController] No active simulation to cancel');
                return { success: false, message: 'No active simulation to cancel' };
            }
            
            console.log('[SimulationController] Cancelling simulation:', this.currentSimulation.id);
            
            // Update status to show cancellation in progress
            this.currentSimulation.status = 'cancelling';
            
            // Emit cancellation in progress event for UI updates
            this.eventBus.emit('simulation:cancelling', {
                simulationId: this.currentSimulation.id,
                message: 'Cancellation in progress...'
            });
            
            // Check backend availability
            const isAvailable = await this.checkBackendAvailability();
            if (!isAvailable) {
                console.warn('[SimulationController] Backend not available, forcing local cleanup');
                // Force cleanup even if backend is unavailable
                this.currentSimulation.status = 'cancelled';
                this.cleanup();
                
                this.eventBus.emit('simulation:cancelled', {
                    simulationId: this.currentSimulation.id,
                    message: 'Simulation cancelled (backend unavailable)'
                });
                
                return {
                    success: true,
                    message: 'Simulation cancelled locally'
                };
            }
            
            // Call Tauri command to cancel simulation with retry
            const result = await this.retryOperation(async () => {
                return await window.__TAURI__.core.invoke('cancel_simulation', { 
                    simulationId: this.currentSimulation.id 
                });
            }, 2, 1000); // Fewer retries for cancellation
            
            if (result.success) {
                // Update simulation status
                this.currentSimulation.status = 'cancelled';
                
                // Clean up
                this.cleanup();
                
                // Emit cancellation event
                this.eventBus.emit('simulation:cancelled', {
                    simulationId: this.currentSimulation.id,
                    message: 'Simulation cancelled successfully'
                });
                
                console.log('[SimulationController] Simulation cancelled successfully');
                
                return {
                    success: true,
                    message: 'Simulation cancelled successfully'
                };
            } else {
                throw new Error(result.message || 'Failed to cancel simulation');
            }
            
        } catch (error) {
            console.error('[SimulationController] Failed to cancel simulation:', error);
            
            // Revert status if cancellation failed
            if (this.currentSimulation) {
                this.currentSimulation.status = 'running';
            }
            
            // Handle backend error
            this.handleBackendError(error, 'cancel simulation', {
                simulationId: this.currentSimulation?.id
            });
            
            throw error;
        }
    }
    
    /**
     * Get current simulation status and progress
     * @returns {Promise<Object>} Current status
     */
    async getStatus() {
        if (!this.currentSimulation) {
            return {
                hasActiveSimulation: false,
                status: 'none'
            };
        }
        
        try {
            // Get latest status from backend
            const result = await window.__TAURI__.core.invoke('get_simulation_status', { simulationId: this.currentSimulation.id });
            
            if (result.progress) {
                // Update local progress
                this.updateProgress(result.progress);
            }
            
            return {
                hasActiveSimulation: this.isSimulationActive(),
                simulationId: this.currentSimulation.id,
                status: this.currentSimulation.status,
                progress: this.currentSimulation.progress,
                startTime: this.currentSimulation.startTime,
                parameters: this.currentSimulation.parameters
            };
            
        } catch (error) {
            console.error('[SimulationController] Failed to get status:', error);
            return {
                hasActiveSimulation: false,
                status: 'error',
                error: error.message
            };
        }
    }
    
    /**
     * Start monitoring simulation progress
     */
    startProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        this.progressInterval = setInterval(async () => {
            try {
                await this.checkProgress();
            } catch (error) {
                console.error('[SimulationController] Progress check failed:', error);
            }
        }, 1000); // Check every second
        
        console.log('[SimulationController] Started progress monitoring');
    }
    
    /**
     * Check simulation progress
     */
    async checkProgress() {
        if (!this.currentSimulation || !this.isSimulationActive()) {
            this.stopProgressMonitoring();
            return;
        }
        
        try {
            // Check backend availability first
            const isAvailable = await this.checkBackendAvailability();
            if (!isAvailable) {
                console.warn('[SimulationController] Backend unavailable during progress check');
                // Don't fail immediately, backend might come back
                return;
            }
            
            const result = await window.__TAURI__.core.invoke('get_simulation_progress', { 
                simulationId: this.currentSimulation.id 
            });
            
            if (result.progress) {
                this.updateProgress(result.progress);
                
                // Check if simulation completed
                if (result.progress.status === 'Completed') {
                    await this.handleSimulationCompletion(result.progress);
                } else if (result.progress.status === 'Failed') {
                    await this.handleSimulationFailure(result.progress);
                } else if (result.progress.status === 'Cancelled') {
                    await this.handleSimulationCancellation(result.progress);
                }
            }
            
        } catch (error) {
            console.error('[SimulationController] Failed to check progress:', error);
            
            // Don't spam errors for progress checks, just log
            // Only emit error if it's a critical issue
            if (this.isConnectionError(error)) {
                console.warn('[SimulationController] Connection lost during progress check');
                // Backend might be temporarily unavailable
            } else {
                // Emit progress error event for other errors
                this.eventBus.emit('simulation:progress-error', {
                    simulationId: this.currentSimulation.id,
                    error: error.message,
                    retryable: true
                });
            }
        }
    }
    
    /**
     * Update simulation progress with real backend data
     * Updates progress percentage, current time, and estimated remaining time
     */
    updateProgress(progressData) {
        if (!this.currentSimulation) {
            console.warn('[SimulationController] Cannot update progress: no current simulation');
            return;
        }
        
        // Update local progress with real backend data
        this.currentSimulation.progress = {
            percent: progressData.progress_percent || 0,
            currentTime: progressData.current_time || 0,
            totalTime: progressData.total_time || 0,
            timeStepsCompleted: progressData.time_steps_completed || 0,
            estimatedRemaining: progressData.estimated_remaining_seconds,
            lastUpdate: new Date(progressData.last_update)
        };
        
        // Update status
        this.currentSimulation.status = this.mapBackendStatus(progressData.status);
        
        console.log('[SimulationController] Progress updated:', {
            simulationId: this.currentSimulation.id,
            percent: this.currentSimulation.progress.percent.toFixed(1) + '%',
            currentTime: this.currentSimulation.progress.currentTime.toFixed(2) + 's',
            estimatedRemaining: this.currentSimulation.progress.estimatedRemaining 
                ? this.currentSimulation.progress.estimatedRemaining.toFixed(1) + 's'
                : 'calculating...',
            status: this.currentSimulation.status
        });
        
        // Emit progress update event for UI components to consume
        this.eventBus.emit('simulation:progress', {
            simulationId: this.currentSimulation.id,
            progress: this.currentSimulation.progress,
            status: this.currentSimulation.status
        });
    }
    
    /**
     * Handle simulation completion
     * Listens for simulation-completed event from Tauri backend,
     * retrieves temperature data, processes results, and emits to visualization panel
     */
    async handleSimulationCompletion(completionPayload) {
        console.log('🎉 [SIMULATION] Simulation completed:', this.currentSimulation.id);
        console.log('📊 [SIMULATION] Completion payload:', completionPayload);
        
        if (!this.currentSimulation) {
            console.warn('[SimulationController] No current simulation to complete');
            return;
        }
        
        this.currentSimulation.status = 'completed';
        this.currentSimulation.completionTime = new Date();
        
        // Stop monitoring
        this.stopProgressMonitoring();
        this.clearTimeout();
        
        // Get simulation results from backend
        try {
            console.log('📡 [SIMULATION] Calling get_simulation_results for:', this.currentSimulation.id);
            
            // Check backend availability
            const isAvailable = await this.checkBackendAvailability();
            if (!isAvailable) {
                throw new Error('Backend is not available to retrieve results');
            }
            
            // Call Tauri command to retrieve temperature data with retry
            const resultsResponse = await this.retryOperation(async () => {
                return await window.__TAURI__.core.invoke('get_simulation_results', { 
                    simulationId: this.currentSimulation.id 
                });
            });
            
            console.log('✅ [SIMULATION] Results retrieved from backend:', {
                simulationId: resultsResponse.simulation_id,
                status: resultsResponse.status,
                hasResults: !!resultsResponse.results,
                hasTemperatureData: !!resultsResponse.results?.temperature?.data
            });
            
            // Process backend results format into visualization format
            const processedResults = this.processResults(resultsResponse.results);
            
            console.log('🔄 [SIMULATION] Results processed for visualization:', {
                timeSteps: processedResults.timeSteps?.length,
                duration: processedResults.duration,
                hasTemperatureData: !!processedResults.temperatureData,
                hasMetadata: !!processedResults.metadata
            });
            
            // Emit simulation:completed event to visualization panel
            this.eventBus.emit('simulation:completed', {
                simulationId: this.currentSimulation.id,
                results: processedResults,
                duration: Date.now() - this.currentSimulation.startTime.getTime(),
                progress: this.currentSimulation.progress,
                parameters: this.currentSimulation.parameters
            });
            
            console.log('📡 [SIMULATION] Emitted simulation:completed event to visualization panel');
            
        } catch (error) {
            console.error('❌ [SIMULATION] Failed to get results:', error);
            console.error('📍 [SIMULATION] Error stack:', error.stack);
            
            // Handle backend error with user-friendly messaging
            this.handleBackendError(error, 'retrieve simulation results', {
                simulationId: this.currentSimulation.id
            });
            
            throw error;
        }
    }

    /**
     * Process backend results format into visualization format
     * Extracts time steps, temperature field data, and metadata
     * @private
     */
    processResults(rawResults) {
        console.log('🔄 [SIMULATION] Processing backend results...');
        
        if (!rawResults) {
            throw new Error('No simulation results available from backend');
        }

        // Extract metadata from backend results
        const metadata = rawResults.metadata || {};
        const totalTime = metadata.total_time || this.currentSimulation.parameters?.simulation?.duration || 60;
        const timeStepsCompleted = metadata.time_steps || 0;
        
        console.log('📊 [SIMULATION] Backend metadata:', {
            totalTime,
            timeStepsCompleted,
            hasTemperatureData: !!rawResults.temperature
        });

        // Extract time steps array from backend results
        const timeSteps = [];
        const timeStepInterval = timeStepsCompleted > 0 ? totalTime / timeStepsCompleted : 0.5;
        
        for (let i = 0; i < timeStepsCompleted; i++) {
            timeSteps.push({
                time: i * timeStepInterval,
                step: i
            });
        }
        
        console.log('⏱️ [SIMULATION] Generated time steps:', {
            count: timeSteps.length,
            interval: timeStepInterval,
            firstTime: timeSteps[0]?.time,
            lastTime: timeSteps[timeSteps.length - 1]?.time
        });

        // Extract temperature field data (2D grid for each time step)
        // Backend returns temperature.data as a 2D array (grid)
        const temperatureData = rawResults.temperature?.data || [];
        
        console.log('🌡️ [SIMULATION] Temperature data:', {
            isArray: Array.isArray(temperatureData),
            length: temperatureData.length,
            firstRowLength: Array.isArray(temperatureData[0]) ? temperatureData[0].length : 'N/A',
            minTemp: rawResults.temperature?.min,
            maxTemp: rawResults.temperature?.max
        });

        // Ensure temperature data is in correct format for visualization panel
        // Visualization expects: { timeSteps, duration, temperatureData, metadata }
        const processedResults = {
            timeSteps: timeSteps,
            duration: totalTime,
            temperatureData: temperatureData,
            meshData: rawResults.mesh_data || null,
            metadata: {
                parameters: this.currentSimulation.parameters,
                completionTime: metadata.completion_time || new Date().toISOString(),
                simulationId: this.currentSimulation.id,
                totalTime: totalTime,
                timeStepsCompleted: timeStepsCompleted,
                meshResolution: metadata.mesh_resolution || null,
                temperatureRange: {
                    min: rawResults.temperature?.min || 300,
                    max: rawResults.temperature?.max || 2000
                }
            }
        };
        
        console.log('✅ [SIMULATION] Results processed successfully:', {
            timeSteps: processedResults.timeSteps.length,
            duration: processedResults.duration,
            hasTemperatureData: !!processedResults.temperatureData,
            temperatureDataSize: Array.isArray(processedResults.temperatureData) ? processedResults.temperatureData.length : 'N/A'
        });

        return processedResults;
    }


    
    /**
     * Handle simulation failure
     */
    async handleSimulationFailure(progressData) {
        console.error('[SimulationController] Simulation failed:', this.currentSimulation.id);
        
        this.currentSimulation.status = 'failed';
        
        // Extract failure reason
        const failureReason = progressData.status?.Failed || 
                             progressData.error || 
                             'Simulation failed for unknown reason';
        
        // Clean up
        this.cleanup();
        
        // Create error object for better handling
        const error = new Error(failureReason);
        
        // Handle backend error with user-friendly messaging
        this.handleBackendError(error, 'run simulation', {
            simulationId: this.currentSimulation.id,
            progress: this.currentSimulation.progress,
            failureReason: failureReason
        });
        
        // Emit failure event
        this.eventBus.emit('simulation:failed', {
            simulationId: this.currentSimulation.id,
            error: failureReason,
            progress: this.currentSimulation.progress,
            retryable: true
        });
    }
    
    /**
     * Handle simulation cancellation
     */
    async handleSimulationCancellation(progressData) {
        console.log('[SimulationController] Simulation cancelled:', this.currentSimulation.id);
        
        this.currentSimulation.status = 'cancelled';
        
        // Clean up
        this.cleanup();
        
        // Emit cancellation event
        this.eventBus.emit('simulation:cancelled', {
            simulationId: this.currentSimulation.id,
            progress: this.currentSimulation.progress
        });
    }
    

    
    /**
     * Set up simulation timeout
     */
    setupTimeout(timeoutMs) {
        this.clearTimeout();
        
        this.timeoutHandle = setTimeout(() => {
            this.handleTimeout();
        }, timeoutMs);
        
        console.log(`[SimulationController] Set timeout for ${timeoutMs}ms`);
    }
    
    /**
     * Handle simulation timeout
     */
    async handleTimeout() {
        console.warn('[SimulationController] Simulation timeout reached');
        
        if (this.currentSimulation && this.isSimulationActive()) {
            const simulationId = this.currentSimulation.id;
            
            try {
                // Attempt to cancel the simulation
                await this.cancelSimulation();
                
                // Create timeout error
                const error = new Error('Simulation exceeded maximum time limit');
                
                // Handle as backend error
                this.handleBackendError(error, 'complete simulation', {
                    simulationId: simulationId,
                    timeout: this.defaultTimeout,
                    reason: 'timeout'
                });
                
                // Emit timeout event
                this.eventBus.emit('simulation:timeout', {
                    simulationId: simulationId,
                    message: 'Simulation timed out and was cancelled',
                    retryable: true,
                    suggestions: [
                        'Try reducing the simulation duration',
                        'Reduce the mesh resolution for faster computation',
                        'Increase the time step size',
                        'Check system resources and close other applications'
                    ]
                });
                
            } catch (error) {
                console.error('[SimulationController] Failed to cancel timed out simulation:', error);
                
                // Force cleanup
                this.cleanup();
                
                // Handle the cancellation error
                this.handleBackendError(error, 'cancel timed out simulation', {
                    simulationId: simulationId,
                    originalReason: 'timeout'
                });
                
                // Emit timeout error event
                this.eventBus.emit('simulation:timeout-error', {
                    simulationId: simulationId,
                    error: error.message,
                    retryable: false
                });
            }
        }
    }
    
    /**
     * Stop progress monitoring
     */
    stopProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            console.log('[SimulationController] Stopped progress monitoring');
        }
    }
    
    /**
     * Clear timeout
     */
    clearTimeout() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        console.log('🧹 [SIMULATION] Cleaning up resources...');
        
        this.stopProgressMonitoring();
        this.clearTimeout();
        
        console.log('✅ [SIMULATION] Resources cleaned up');
    }
    
    /**
     * Check if simulation is currently active
     */
    isSimulationActive() {
        return this.currentSimulation && 
               ['running', 'initializing'].includes(this.currentSimulation.status);
    }
    
    /**
     * Transform frontend parameters to backend format
     */
    transformParameters(frontendParams) {
        console.log('🔄 [SIMULATION] Transforming frontend parameters:', frontendParams);
        
        // Get furnace dimensions
        const furnaceHeight = frontendParams.furnace?.height || 2.0;
        const furnaceRadius = frontendParams.furnace?.radius || 1.0;
        
        // Torch positions should be normalized (0-1) - backend will convert to absolute
        const normalizedR = frontendParams.torch?.position?.r || 0;
        const normalizedZ = frontendParams.torch?.position?.z || 0.5;
        
        const backendParams = {
            geometry: {
                cylinder_height: furnaceHeight,
                cylinder_radius: furnaceRadius
            },
            mesh: {
                preset: "balanced",
                nr: 50,
                nz: 50
            },
            torches: {
                torches: [{
                    id: 1,
                    power: frontendParams.torch?.power || 150,
                    position: {
                        r: normalizedR,  // Send normalized coordinates (0-1)
                        z: normalizedZ   // Backend will convert to absolute
                    },
                    efficiency: frontendParams.torch?.efficiency || 0.8,
                    sigma: 0.1
                }]
            },
            materials: {
                material_type: frontendParams.material === "Steel" ? "Carbon Steel" : frontendParams.material || "Carbon Steel",
                density: 7850.0,
                thermal_conductivity: 50.0,
                specific_heat: 500.0,
                emissivity: 0.8,
                melting_point: 1811.0
            },
            boundary: {
                initial_temperature: 300.0,
                ambient_temperature: 300.0,
                wall_boundary_type: "mixed",
                convection_coefficient: 10.0,
                surface_emissivity: 0.8
            },
            simulation: {
                total_time: frontendParams.simulation?.duration || 60,
                output_interval: frontendParams.simulation?.timeStep || 0.5,
                solver_method: "forward-euler",
                cfl_factor: 0.5
            }
        };
        
        console.log('✅ [SIMULATION] Transformed to backend format:', backendParams);
        console.log('📍 [SIMULATION] Torch position (normalized 0-1):', {
            r: normalizedR,
            z: normalizedZ,
            note: 'Backend will convert to absolute coordinates'
        });
        return backendParams;
    }

    /**
     * Validate simulation parameters
     */
    validateParameters(parameters) {
        const errors = [];
        
        // Basic validation
        if (!parameters) {
            errors.push('Parameters are required');
            return { isValid: false, errors };
        }
        
        // Geometry validation
        if (!parameters.geometry) {
            errors.push('Geometry parameters are required');
        } else {
            if (!parameters.geometry.cylinder_height || parameters.geometry.cylinder_height <= 0) {
                errors.push('Cylinder height must be positive');
            }
            if (!parameters.geometry.cylinder_radius || parameters.geometry.cylinder_radius <= 0) {
                errors.push('Cylinder radius must be positive');
            }
        }
        
        // Torch validation
        if (!parameters.torches || !parameters.torches.torches || parameters.torches.torches.length === 0) {
            errors.push('At least one torch is required');
        }
        
        // Simulation settings validation
        if (!parameters.simulation) {
            errors.push('Simulation settings are required');
        } else {
            if (!parameters.simulation.total_time || parameters.simulation.total_time <= 0) {
                errors.push('Total simulation time must be positive');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Map backend status to frontend status
     */
    mapBackendStatus(backendStatus) {
        if (typeof backendStatus === 'string') {
            return backendStatus.toLowerCase();
        }
        
        if (typeof backendStatus === 'object') {
            if (backendStatus.Failed) return 'failed';
            if (backendStatus.Completed) return 'completed';
            if (backendStatus.Running) return 'running';
            if (backendStatus.Cancelled) return 'cancelled';
            if (backendStatus.Initializing) return 'initializing';
        }
        
        return 'unknown';
    }
    
    /**
     * Invoke Tauri backend command with error handling and logging
     * @param {string} command - The Tauri command name
     * @param {Object} payload - The command payload
     * @returns {Promise<any>} The command result
     */
    async invokeTauriCommand(command, payload) {
        if (!window.__TAURI__) {
            const error = new Error('Tauri backend is not available. Please ensure the application is running in Tauri environment.');
            console.error('❌ [SIMULATION] Tauri not available');
            throw error;
        }
        
        console.log(`🔌 [SIMULATION] Invoking Tauri command: ${command}`);
        console.log(`📦 [SIMULATION] Command payload:`, payload);
        
        try {
            // Tauri v2 API: invoke(command, payload)
            const result = await window.__TAURI__.core.invoke(command, payload);
            
            console.log(`✅ [SIMULATION] Tauri command ${command} succeeded:`, result);
            return result;
        } catch (error) {
            console.error(`❌ [SIMULATION] Tauri command ${command} failed:`, error);
            console.error(`📍 [SIMULATION] Error details:`, {
                message: error.message,
                stack: error.stack,
                command: command,
                payload: payload
            });
            
            // Create a more user-friendly error message
            let userMessage = `Backend command '${command}' failed`;
            if (error.message) {
                userMessage += `: ${error.message}`;
            }
            
            throw new Error(userMessage);
        }
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            hasCurrentSimulation: !!this.currentSimulation,
            currentSimulation: this.currentSimulation,
            isMonitoring: !!this.progressInterval,
            hasTimeout: !!this.timeoutHandle
        };
    }
    
    /**
     * Destroy the controller and clean up all resources
     */
    destroy() {
        console.log('[SimulationController] Destroying controller');
        
        // Clean up resources
        this.cleanup();
        
        // Remove event listeners
        this.eventBus.off('simulation:run', this.runSimulation);
        this.eventBus.off('simulation:cancel', this.cancelSimulation);
        
        // Clear current simulation
        this.currentSimulation = null;
        
        console.log('[SimulationController] Controller destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationController;
} else if (typeof window !== 'undefined') {
    window.SimulationController = SimulationController;
}