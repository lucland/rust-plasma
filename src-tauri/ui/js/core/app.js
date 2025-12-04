/**
 * App - Main application controller class
 * 
 * Coordinates all components, manages application lifecycle,
 * and handles global error states and recovery.
 */
class App {
    constructor() {
        this.eventBus = null;
        this.appState = null;
        this.errorHandler = null;
        this.loadingManager = null;
        this.errorDisplay = null;
        this.components = new Map();
        this.isInitialized = false;
        this.errorRecoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleUnhandledError = this.handleUnhandledError.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }

    /**
     * Initialize the application
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        console.log('🚀 [APP] Starting Plasma Furnace Simulator initialization...');
        console.log('📊 [APP] System info:', {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        });
        
        try {
            console.log('🔧 [APP] Step 1: Initializing core systems...');
            // Initialize core systems
            await this.initializeCore();

            console.log('🔧 [APP] Step 2: Initializing components...');
            // Initialize components
            await this.initializeComponents();

            console.log('🔧 [APP] Step 3: Setting up global error handling...');
            // Set up global error handling
            this.setupGlobalErrorHandling();

            console.log('🔧 [APP] Step 4: Setting up application lifecycle management...');
            // Set up application lifecycle management
            this.setupLifecycleManagement();

            // Mark as initialized
            this.isInitialized = true;

            console.log('🎉 [APP] Application initialized successfully!');
            console.log('📊 [APP] Final status:', this.getStatus());
            
            console.log('📡 [APP] Emitting app:initialized event...');
            // Emit initialization complete event
            this.eventBus.emit('app:initialized', {
                timestamp: new Date().toISOString(),
                components: Array.from(this.components.keys()),
                status: this.getStatus()
            });

            return true;

        } catch (error) {
            console.error('💥 [APP] Initialization failed:', error);
            console.error('📍 [APP] Error stack:', error.stack);
            
            console.log('🔧 [APP] Attempting error handling...');
            await this.handleError(error, 'initialization');
            return false;
        }
    }

    /**
     * Initialize core systems (EventBus, ErrorHandler, and AppState)
     * @private
     */
    async initializeCore() {
        // Initialize EventBus
        this.eventBus = new EventBus();
        this.eventBus.setDebugMode(true);

        // Initialize ErrorHandler
        this.errorHandler = new ErrorHandler(this.eventBus);

        // Initialize LoadingManager
        this.loadingManager = new LoadingManager(this.eventBus);

        // Initialize ErrorDisplay
        this.errorDisplay = new ErrorDisplay(this.eventBus);

        // Initialize KeyboardHandler
        this.keyboardHandler = new KeyboardHandler(this.eventBus);

        // Initialize AppState
        this.appState = new AppState(this.eventBus);

        // Subscribe to state changes
        this.eventBus.on('state:changed', this.handleStateChange);
        this.eventBus.on('error', this.handleError);

        console.log('[App] Core systems initialized');
    }

    /**
     * Initialize application components
     * @private
     */
    async initializeComponents() {
        try {
            // Initialize parameter panel
            const parametersContainer = document.getElementById('parameters-panel');
            if (parametersContainer) {
                const parameterPanel = new ParameterPanel(parametersContainer, this.eventBus);
                await parameterPanel.init();
                this.registerComponent('parameters', parameterPanel);
            }

            // Initialize simulation controller
            const simulationController = new SimulationController(this.eventBus);
            await simulationController.init();
            this.registerComponent('simulation', simulationController);

            // Initialize visualization panel
            const visualizationContainer = document.getElementById('visualization-panel');
            if (visualizationContainer) {
                const visualizationPanel = new VisualizationPanel(visualizationContainer, this.eventBus);
                await visualizationPanel.init();
                this.registerComponent('visualization', visualizationPanel);
            }

            // Initialize animation controller
            const animationController = new AnimationController(this.eventBus);
            this.registerComponent('animation', animationController);

            // Initialize animation UI (pass visualization panel reference for export functionality)
            const animationContainer = document.getElementById('visualization-panel');
            if (animationContainer) {
                const visualizationPanel = this.getComponent('visualization');
                const animationUI = new AnimationUI(animationContainer, animationController, this.eventBus, visualizationPanel);
                animationUI.render();
                this.registerComponent('animationUI', animationUI);
            }

            // Set up component coordination
            this.setupComponentCoordination();

            console.log('[App] Components initialized successfully');

        } catch (error) {
            console.error('[App] Component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up coordination between components
     * @private
     */
    setupComponentCoordination() {
        // Wire parameter changes to simulation readiness
        this.eventBus.on('parameters:changed', (data) => {
            const { isValid, validationChanged } = data;
            
            // If parameters become valid, ensure we can transition to READY
            if (isValid && validationChanged && this.appState.getPhase() === 'INITIAL') {
                console.log('[App] Parameters validated, enabling simulation');
                this.eventBus.emit('ui:enable-simulation', this.appState.getState());
            }
        });

        // Connect simulation completion to visualization loading
        this.eventBus.on('simulation:completed', (data) => {
            console.log('[App] Coordinating simulation completion with visualization');
            
            // The main.js handler will load data into visualization
            // We just ensure proper state transitions here
            const visualizationPanel = this.getComponent('visualization');
            if (visualizationPanel && data.results) {
                console.log('[App] Visualization panel available for data loading');
            }
        });

        // Ensure proper state transitions throughout user flow
        this.eventBus.on('visualization:loaded', (data) => {
            console.log('[App] Visualization loaded, coordinating with animation');
            
            // Animation initialization will be handled by main.js
            // We ensure the state is properly maintained
            if (data.animationReady && data.timeSteps > 1) {
                console.log('[App] Animation ready for', data.timeSteps, 'time steps');
                this.eventBus.emit('app:animation-ready', {
                    timeSteps: data.timeSteps,
                    duration: data.duration
                });
            }
        });

        // Coordinate animation initialization with UI updates
        this.eventBus.on('animation:initialized', (data) => {
            console.log('[App] Animation initialized, updating UI state');
            
            // Ensure animation UI is shown and enabled
            const animationUI = this.getComponent('animationUI');
            if (animationUI) {
                animationUI.showControls();
            }
        });

        // Handle state transitions for proper user flow
        this.eventBus.on('state:changed', (data) => {
            const { from, to, reason } = data;
            console.log(`[App] State transition coordinated: ${from} -> ${to} (${reason})`);
            
            // Coordinate component states based on application state
            this.coordinateComponentStates(to, data.state);
        });

        console.log('[App] Component coordination set up');
    }

    /**
     * Coordinate component states based on application state
     * @private
     */
    coordinateComponentStates(phase, state) {
        const parameterPanel = this.getComponent('parameters');
        const simulationController = this.getComponent('simulation');
        const visualizationPanel = this.getComponent('visualization');
        const animationUI = this.getComponent('animationUI');

        switch (phase) {
            case 'INITIAL':
                // Reset all components to initial state
                if (parameterPanel) {
                    parameterPanel.setEnabled(true);
                }
                if (visualizationPanel) {
                    visualizationPanel.showPlaceholder();
                }
                if (animationUI) {
                    animationUI.hideControls();
                }
                break;

            case 'READY':
                // Enable parameter editing, show simulation can be run
                if (parameterPanel) {
                    parameterPanel.setEnabled(true);
                    parameterPanel.hideLoading();
                }
                if (visualizationPanel) {
                    visualizationPanel.showPlaceholder();
                }
                break;

            case 'RUNNING':
                // Disable parameter editing, show progress
                if (parameterPanel) {
                    parameterPanel.setEnabled(false);
                    parameterPanel.showLoading('Simulation running...');
                }
                if (visualizationPanel) {
                    visualizationPanel.showLoading('Simulation running...');
                }
                if (animationUI) {
                    animationUI.hideControls();
                }
                break;

            case 'RESULTS':
                // Enable parameter editing for new simulation, show results
                if (parameterPanel) {
                    parameterPanel.setEnabled(true);
                    parameterPanel.hideLoading();
                }
                if (visualizationPanel) {
                    visualizationPanel.showVisualization();
                }
                // Animation UI will be shown when animation is initialized
                break;
        }
    }

    /**
     * Register a component with the application
     * @param {string} name - Component name
     * @param {Object} component - Component instance
     */
    registerComponent(name, component) {
        if (this.components.has(name)) {
            console.warn(`[App] Component ${name} already registered, replacing...`);
        }

        this.components.set(name, component);
        
        console.log(`[App] Registered component: ${name}`);
        
        this.eventBus.emit('component:registered', {
            name,
            component,
            totalComponents: this.components.size
        });
    }

    /**
     * Get a registered component
     * @param {string} name - Component name
     * @returns {Object|null} Component instance or null if not found
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Handle state changes
     * @private
     */
    handleStateChange(data) {
        const { from, to, state, reason } = data;
        
        console.log(`🔄 [APP] STATE CHANGE: ${from} -> ${to} (${reason})`);
        console.log('📊 [APP] New state data:', state);
        console.log('🧩 [APP] Available components:', Array.from(this.components.keys()));

        // Coordinate component updates based on state changes
        console.log(`🎯 [APP] Handling ${to} state...`);
        switch (to) {
            case 'INITIAL':
                console.log('🔄 [APP] Processing INITIAL state...');
                this.handleInitialState(state);
                break;
            case 'READY':
                console.log('🔄 [APP] Processing READY state...');
                this.handleReadyState(state);
                break;
            case 'RUNNING':
                console.log('🔄 [APP] Processing RUNNING state...');
                this.handleRunningState(state);
                break;
            case 'RESULTS':
                console.log('🔄 [APP] Processing RESULTS state...');
                this.handleResultsState(state);
                break;
            default:
                console.warn('⚠️ [APP] Unknown state:', to);
        }

        // Reset error recovery attempts on successful state change
        this.errorRecoveryAttempts = 0;
        console.log('✅ [APP] State change handling completed');
    }

    /**
     * Handle INITIAL state
     * @private
     */
    handleInitialState(state) {
        // Initialize UI to default state
        this.eventBus.emit('ui:reset', state);
    }

    /**
     * Handle READY state
     * @private
     */
    handleReadyState(state) {
        // Enable simulation controls
        this.eventBus.emit('ui:enable-simulation', state);
    }

    /**
     * Handle RUNNING state
     * @private
     */
    handleRunningState(state) {
        // Show progress indicators, disable parameter editing
        this.eventBus.emit('ui:simulation-started', state);
    }

    /**
     * Handle RESULTS state
     * @private
     */
    handleResultsState(state) {
        // Show visualization, enable animation controls
        this.eventBus.emit('ui:simulation-completed', state);
    }

    /**
     * Handle application errors using the ErrorHandler
     * @param {Error|Object} error - Error object or error data
     * @param {string} context - Error context
     */
    async handleError(error, context = 'unknown') {
        console.error(`[App] Error in ${context}:`, error);

        // Use ErrorHandler to process the error
        const processedError = this.errorHandler.handle(error, context);
        
        // Emit processed error for UI feedback
        this.eventBus.emit('ui:error', processedError);

        // Attempt recovery based on error type
        if (processedError.recoverable && this.errorRecoveryAttempts < this.maxRecoveryAttempts) {
            this.errorRecoveryAttempts++;
            console.log(`[App] Attempting error recovery (attempt ${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts})`);
            
            const recovered = await this.attemptRecovery(processedError);
            
            if (recovered) {
                console.log('[App] Error recovery successful');
                this.eventBus.emit('app:recovered', processedError);
            } else {
                console.error('[App] Error recovery failed');
                this.handleUnrecoverableError(processedError);
            }
        } else {
            this.handleUnrecoverableError(processedError);
        }
    }



    /**
     * Attempt error recovery
     * @private
     */
    async attemptRecovery(errorInfo) {
        try {
            switch (errorInfo.type) {
                case 'validation':
                    return this.recoverFromValidationError();
                case 'network':
                    return await this.recoverFromNetworkError();
                case 'simulation':
                    return this.recoverFromSimulationError();
                case 'state':
                    return this.recoverFromStateError();
                default:
                    return false;
            }
        } catch (recoveryError) {
            console.error('[App] Recovery attempt failed:', recoveryError);
            return false;
        }
    }

    /**
     * Recover from validation errors
     * @private
     */
    recoverFromValidationError() {
        // Reset to default parameters
        this.appState.updateParameters(this.appState.getDefaultParameters());
        return true;
    }

    /**
     * Recover from network errors
     * @private
     */
    async recoverFromNetworkError() {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true; // Assume network is back
    }

    /**
     * Recover from simulation errors
     * @private
     */
    recoverFromSimulationError() {
        // Reset to READY state
        return this.appState.transition('READY', {}, 'Recovery from simulation error');
    }

    /**
     * Recover from state errors
     * @private
     */
    recoverFromStateError() {
        // Reset application state
        return this.appState.reset();
    }

    /**
     * Handle unrecoverable errors
     * @private
     */
    handleUnrecoverableError(errorInfo) {
        console.error('[App] Unrecoverable error:', errorInfo);
        
        // Show critical error UI
        this.eventBus.emit('ui:critical-error', errorInfo);
        
        // Disable application functionality
        this.eventBus.emit('app:disabled', errorInfo);
    }

    /**
     * Set up global error handling
     * @private
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', this.handleUnhandledError);
        
        // Handle uncaught errors
        window.addEventListener('error', this.handleUnhandledError);
        
        console.log('[App] Global error handling set up');
    }

    /**
     * Handle unhandled errors
     * @private
     */
    handleUnhandledError(event) {
        const error = event.error || event.reason || new Error('Unknown error');
        this.handleError(error, 'unhandled');
        
        // Prevent default browser error handling
        event.preventDefault();
    }

    /**
     * Set up application lifecycle management
     * @private
     */
    setupLifecycleManagement() {
        // Handle page unload
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.eventBus.emit('app:hidden');
            } else {
                this.eventBus.emit('app:visible');
            }
        });
        
        console.log('[App] Lifecycle management set up');
    }

    /**
     * Handle before unload
     * @private
     */
    handleBeforeUnload(event) {
        // Check if simulation is running
        if (this.appState && this.appState.getPhase() === 'RUNNING') {
            const message = 'Simulation is currently running. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    }

    /**
     * Get application status
     * @returns {Object} Application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            phase: this.appState ? this.appState.getPhase() : 'UNKNOWN',
            componentCount: this.components.size,
            errorRecoveryAttempts: this.errorRecoveryAttempts,
            eventBusInfo: this.eventBus ? this.eventBus.getDebugInfo() : null,
            stateInfo: this.appState ? this.appState.getDebugInfo() : null,
            errorInfo: this.errorHandler ? this.errorHandler.getDebugInfo() : null,
            loadingInfo: this.loadingManager ? this.loadingManager.getDebugInfo() : null,
            errorDisplayInfo: this.errorDisplay ? this.errorDisplay.getDebugInfo() : null,
            keyboardInfo: this.keyboardHandler ? this.keyboardHandler.getDebugInfo() : null
        };
    }

    /**
     * Shutdown the application
     */
    shutdown() {
        console.log('[App] Shutting down application...');
        
        // Emit shutdown event
        this.eventBus.emit('app:shutdown');
        
        // Clean up components
        this.components.clear();
        
        // Remove event listeners
        window.removeEventListener('unhandledrejection', this.handleUnhandledError);
        window.removeEventListener('error', this.handleUnhandledError);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        // Clear event bus
        if (this.eventBus) {
            this.eventBus.removeAllListeners();
        }
        
        this.isInitialized = false;
        
        console.log('[App] Application shutdown complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
} else if (typeof window !== 'undefined') {
    window.App = App;
}