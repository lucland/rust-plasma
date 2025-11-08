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
        
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.runSimulation = this.runSimulation.bind(this);
        this.cancelSimulation = this.cancelSimulation.bind(this);
        this.checkProgress = this.checkProgress.bind(this);
        this.handleTimeout = this.handleTimeout.bind(this);
        this.handleProgressUpdate = this.handleProgressUpdate.bind(this);
        this.handleSimulationComplete = this.handleSimulationComplete.bind(this);
        
        console.log('[SimulationController] Created');
    }

    /**
     * Initialize the simulation controller
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('[SimulationController] Initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('[SimulationController] Failed to initialize:', error);
            return false;
        }
    }
    
    /**
     * Set up event listeners for Tauri events
     */
    setupEventListeners() {
        // Listen for Tauri events if available
        if (window.__TAURI__) {
            // Listen for simulation progress events from backend
            window.__TAURI__.event.listen('simulation-progress', this.handleProgressUpdate);
            window.__TAURI__.event.listen('simulation-completed', this.handleSimulationComplete);
        }
        
        // Listen for UI events
        this.eventBus.on('simulation:run', this.runSimulation);
        this.eventBus.on('simulation:cancel', this.cancelSimulation);
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
            
            console.log('🔌 [SIMULATION] Checking Tauri availability...');
            console.log('🔌 [SIMULATION] Tauri available:', !!window.__TAURI__);
            
            if (!window.__TAURI__) {
                console.log('⚠️ [SIMULATION] Tauri not available, using mock simulation...');
                // Mock simulation for testing
                return await this.runMockSimulation(parameters, options);
            }
            
            console.log('🔌 [SIMULATION] Calling Tauri command: run_simulation...');
            // Call Tauri command to start simulation
            const result = await this.invokeSimulationCommand('run_simulation', backendParameters);
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
            
            console.log('📡 [SIMULATION] Emitting simulation:error event...');
            // Emit error event
            this.eventBus.emit('simulation:error', {
                type: 'start_failed',
                message: error.message,
                parameters: parameters,
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Run mock simulation for testing when Tauri is not available
     * @private
     */
    async runMockSimulation(parameters, options) {
        console.log('🎭 [SIMULATION] Running mock simulation...');
        
        // Create mock simulation ID
        const simulationId = 'mock_' + Date.now();
        
        // Store simulation info
        this.currentSimulation = {
            id: simulationId,
            parameters: parameters,
            startTime: new Date(),
            status: 'running',
            progress: {
                percent: 0,
                currentTime: 0,
                estimatedRemaining: null
            }
        };
        
        console.log('📊 [SIMULATION] Mock simulation info:', this.currentSimulation);
        
        // Emit simulation started event
        this.eventBus.emit('simulation:started', {
            simulationId: simulationId,
            parameters: parameters
        });
        
        // Simulate progress over time
        console.log('📈 [SIMULATION] Starting mock progress simulation...');
        this.simulateMockProgress();
        
        return {
            success: true,
            simulationId: simulationId,
            message: 'Mock simulation started successfully'
        };
    }
    
    /**
     * Simulate progress for mock simulation
     * @private
     */
    simulateMockProgress() {
        let progress = 0;
        const totalDuration = 10000; // 10 seconds for mock
        const updateInterval = 500; // Update every 500ms
        const progressIncrement = (updateInterval / totalDuration) * 100;
        
        const progressTimer = setInterval(() => {
            progress += progressIncrement;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressTimer);
                
                console.log('🎭 [SIMULATION] Mock simulation completed');
                this.handleSimulationCompletion({ status: 'Completed' });
                return;
            }
            
            // Update progress
            this.updateProgress({
                progress_percent: progress,
                current_time: (progress / 100) * (this.currentSimulation.parameters?.simulation?.duration || 60),
                total_time: this.currentSimulation.parameters?.simulation?.duration || 60,
                status: 'Running'
            });
        }, updateInterval);
        
        // Store timer for cleanup
        this.mockProgressTimer = progressTimer;
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
            
            // Call Tauri command to cancel simulation
            const result = await this.invokeSimulationCommand('cancel_simulation', this.currentSimulation.id);
            
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
            
            // Emit error event
            this.eventBus.emit('simulation:error', {
                type: 'cancel_failed',
                message: error.message,
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
            const result = await this.invokeSimulationCommand('get_simulation_status', this.currentSimulation.id);
            
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
            const result = await this.invokeSimulationCommand('get_simulation_progress', this.currentSimulation.id);
            
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
            
            // Emit progress error event
            this.eventBus.emit('simulation:progress-error', {
                simulationId: this.currentSimulation.id,
                error: error.message
            });
        }
    }
    
    /**
     * Update simulation progress
     */
    updateProgress(progressData) {
        if (!this.currentSimulation) return;
        
        // Update local progress
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
        
        // Emit progress update event
        this.eventBus.emit('simulation:progress', {
            simulationId: this.currentSimulation.id,
            progress: this.currentSimulation.progress,
            status: this.currentSimulation.status
        });
    }
    
    /**
     * Handle simulation completion
     */
    async handleSimulationCompletion(progressData) {
        console.log('[SimulationController] Simulation completed:', this.currentSimulation.id);
        
        this.currentSimulation.status = 'completed';
        this.currentSimulation.completionTime = new Date();
        
        // Stop monitoring
        this.stopProgressMonitoring();
        this.clearTimeout();
        
        // Get simulation results
        try {
            const results = await this.invokeSimulationCommand('get_simulation_results', this.currentSimulation.id);
            
            // Process results for animation
            const processedResults = this.processResultsForAnimation(results.results);
            
            // Emit completion event with processed results
            this.eventBus.emit('simulation:completed', {
                simulationId: this.currentSimulation.id,
                results: processedResults,
                duration: Date.now() - this.currentSimulation.startTime.getTime(),
                progress: this.currentSimulation.progress,
                parameters: this.currentSimulation.parameters
            });
            
        } catch (error) {
            console.error('[SimulationController] Failed to get results:', error);
            
            // Create mock results for testing animation
            const mockResults = this.createMockResults();
            
            // Emit completion event with mock results
            this.eventBus.emit('simulation:completed', {
                simulationId: this.currentSimulation.id,
                results: mockResults,
                duration: Date.now() - this.currentSimulation.startTime.getTime(),
                parameters: this.currentSimulation.parameters,
                error: 'Using mock data - backend results unavailable'
            });
        }
    }

    /**
     * Process simulation results for animation compatibility
     * @private
     */
    processResultsForAnimation(rawResults) {
        if (!rawResults) {
            return this.createMockResults();
        }

        // Extract time step information
        const timeSteps = [];
        const duration = this.currentSimulation.parameters?.simulation?.total_time || 60;
        const timeStepCount = Math.floor(duration / (this.currentSimulation.parameters?.simulation?.time_step || 0.5));

        // Create time step array
        for (let i = 0; i < timeStepCount; i++) {
            timeSteps.push({
                time: i * (duration / timeStepCount),
                step: i
            });
        }

        return {
            timeSteps: timeSteps,
            duration: duration,
            temperatureData: rawResults.temperature_data || [],
            meshData: rawResults.mesh_data || null,
            metadata: {
                parameters: this.currentSimulation.parameters,
                completionTime: new Date().toISOString(),
                simulationId: this.currentSimulation.id
            }
        };
    }

    /**
     * Create mock results for testing animation
     * @private
     */
    createMockResults() {
        // Use actual simulation parameters if available
        const simParams = this.currentSimulation?.parameters?.simulation;
        const duration = simParams?.total_time || 60; // Use actual duration or default to 60 seconds
        const timeStepDuration = simParams?.time_step || 0.5; // Use actual time step or default to 0.5 seconds
        const timeStepCount = Math.floor(duration / timeStepDuration);
        
        console.log('[SimulationController] Creating mock results with:', {
            duration,
            timeStepDuration,
            timeStepCount,
            parameters: this.currentSimulation?.parameters
        });
        
        const timeSteps = [];
        for (let i = 0; i < timeStepCount; i++) {
            timeSteps.push({
                time: i * timeStepDuration,
                step: i
            });
        }

        return {
            timeSteps: timeSteps,
            duration: duration,
            temperatureData: this.generateMockTemperatureData(timeStepCount),
            meshData: null,
            metadata: {
                parameters: this.currentSimulation.parameters,
                completionTime: new Date().toISOString(),
                simulationId: this.currentSimulation.id,
                isMockData: true
            }
        };
    }

    /**
     * Generate mock temperature data for 3D volumetric visualization
     * Creates realistic heat propagation patterns throughout the cylinder volume
     * @private
     */
    generateMockTemperatureData(timeStepCount) {
        const temperatureData = [];
        
        // Get furnace parameters from current simulation
        const params = this.currentSimulation?.parameters;
        const furnaceRadius = params?.geometry?.cylinder_radius || 1.0;
        const furnaceHeight = params?.geometry?.cylinder_height || 2.0;
        
        // Get torch parameters
        const torches = params?.torches?.torches || [];
        const torch = torches[0] || { position: { r: 0, z: furnaceHeight / 2 }, power: 150 };
        const torchR = torch.position?.r ?? 0;
        const torchZ = torch.position?.z ?? (furnaceHeight / 2);
        const torchPower = torch.power ?? 150;
        
        // Normalize torch position
        const normalizedTorchR = torchR / furnaceRadius;
        const normalizedTorchZ = torchZ / furnaceHeight;
        
        console.log('[SimulationController] Generating 3D temperature data with torch at:', {
            r: normalizedTorchR,
            z: normalizedTorchZ,
            power: torchPower
        });
        
        for (let t = 0; t < timeStepCount; t++) {
            const timeStepData = [];
            const timeProgress = t / Math.max(1, timeStepCount - 1);
            
            // Generate temperature field for a 3D grid
            const gridSize = 10; // 10x10 grid for r and z
            
            for (let i = 0; i < gridSize * gridSize; i++) {
                const rIndex = i % gridSize;
                const zIndex = Math.floor(i / gridSize);
                
                const normalizedR = rIndex / (gridSize - 1); // 0 to 1
                const normalizedZ = zIndex / (gridSize - 1); // 0 to 1
                
                // Calculate 3D distance from torch position
                const dr = normalizedR - normalizedTorchR;
                const dz = normalizedZ - normalizedTorchZ;
                const distance3D = Math.sqrt(dr * dr + dz * dz);
                
                // Heat propagation model
                const heatDiffusion = Math.exp(-distance3D * 2.5); // Heat decreases with distance
                const timeEffect = Math.min(1, timeProgress * 1.5); // Heat builds up over time
                const powerEffect = torchPower / 150; // Scale by torch power
                
                // Base temperature + heat from torch
                let temperature = 300 + (1500 * heatDiffusion * timeEffect * powerEffect);
                
                // Add realistic variation
                const noise = (Math.sin(normalizedR * 10 + t * 0.5) + Math.cos(normalizedZ * 8 + t * 0.3)) * 15;
                temperature += noise;
                
                // Add radial cooling effect (cooler near walls)
                const wallDistance = 1 - normalizedR;
                const coolingEffect = Math.exp(-wallDistance * 3) * 80;
                temperature -= coolingEffect;
                
                // Clamp temperature to realistic range
                temperature = Math.max(300, Math.min(1800, temperature));
                
                timeStepData.push(temperature);
            }
            
            temperatureData.push(timeStepData);
        }
        
        console.log('[SimulationController] Generated', temperatureData.length, 'time steps of 3D temperature data');
        return temperatureData;
    }
    
    /**
     * Handle simulation failure
     */
    async handleSimulationFailure(progressData) {
        console.error('[SimulationController] Simulation failed:', this.currentSimulation.id);
        
        this.currentSimulation.status = 'failed';
        
        // Clean up
        this.cleanup();
        
        // Emit failure event
        this.eventBus.emit('simulation:failed', {
            simulationId: this.currentSimulation.id,
            error: progressData.status.Failed || 'Simulation failed',
            progress: this.currentSimulation.progress
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
     * Handle progress update from Tauri event
     */
    handleProgressUpdate(event) {
        if (event.payload && event.payload.simulation_id === this.currentSimulation?.id) {
            this.updateProgress(event.payload.progress);
        }
    }
    
    /**
     * Handle simulation completion from Tauri event
     */
    handleSimulationComplete(event) {
        if (event.payload && event.payload.simulation_id === this.currentSimulation?.id) {
            this.handleSimulationCompletion(event.payload);
        }
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
            try {
                // Attempt to cancel the simulation
                await this.cancelSimulation();
                
                // Emit timeout event
                this.eventBus.emit('simulation:timeout', {
                    simulationId: this.currentSimulation.id,
                    message: 'Simulation timed out and was cancelled'
                });
                
            } catch (error) {
                console.error('[SimulationController] Failed to cancel timed out simulation:', error);
                
                // Force cleanup
                this.cleanup();
                
                // Emit timeout error event
                this.eventBus.emit('simulation:timeout-error', {
                    simulationId: this.currentSimulation?.id,
                    error: error.message
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
        
        // Clean up mock progress timer if it exists
        if (this.mockProgressTimer) {
            console.log('🧹 [SIMULATION] Clearing mock progress timer...');
            clearInterval(this.mockProgressTimer);
            this.mockProgressTimer = null;
        }
        
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
        
        const backendParams = {
            geometry: {
                cylinder_height: frontendParams.furnace?.height || 2.0,
                cylinder_radius: frontendParams.furnace?.radius || 1.0
            },
            torches: {
                torches: [{
                    power: frontendParams.torch?.power || 150,
                    position: {
                        r: frontendParams.torch?.position?.r || 0,
                        z: frontendParams.torch?.position?.z || 1
                    },
                    efficiency: frontendParams.torch?.efficiency || 0.8
                }]
            },
            material: frontendParams.material || "Steel",
            simulation: {
                total_time: frontendParams.simulation?.duration || 60,
                time_step: frontendParams.simulation?.timeStep || 0.5
            }
        };
        
        console.log('✅ [SIMULATION] Transformed to backend format:', backendParams);
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
     * Invoke Tauri simulation command
     */
    async invokeSimulationCommand(command, ...args) {
        if (!window.__TAURI__) {
            throw new Error('Tauri API not available');
        }
        
        try {
            const result = await window.__TAURI__.core.invoke(command, ...args);
            return result;
        } catch (error) {
            console.error(`[SimulationController] Tauri command ${command} failed:`, error);
            throw new Error(`Backend command failed: ${error}`);
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