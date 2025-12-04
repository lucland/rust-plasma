/**
 * Main JavaScript file for Plasma Furnace Simulator Frontend Rebuild
 * Integrates with new core state management system
 */

// Import core classes (will be loaded via script tags)
// EventBus, AppState, and App classes are loaded from separate files

// Global application instance
let app = null;

// Component instances
let parameterPanel = null;
let simulationController = null;
let visualizationPanel = null;

// DOM elements
const elements = {
    // Header
    runButton: null,
    
    // Simulation controls
    simulationControls: null,
    progressFill: null,
    progressPercentage: null,
    progressTime: null,
    cancelButton: null,
    
    // Animation controls
    animationControls: null,
    playPauseButton: null,
    playPauseIcon: null,
    timeSlider: null,
    currentTimeDisplay: null,
    totalTimeDisplay: null,
    animationSpeedSelect: null,
    
    // Visualization
    visualizationContainer: null,
    visualizationCanvas: null,
    visualizationPlaceholder: null,
    visualizationLoading: null,
    visualizationError: null,
    temperatureLegend: null,
    hoverInfo: null,
    
    // Status
    appStatus: null
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 [MAIN] Plasma Furnace Simulator - Frontend Rebuild');
    console.log('🔧 [MAIN] DOM Content Loaded - Starting initialization...');
    
    // Check Tauri API availability
    console.log('🔍 [MAIN] Checking Tauri API...');
    console.log('🔍 [MAIN] window.__TAURI__ =', window.__TAURI__);
    console.log('🔍 [MAIN] window.__TAURI_INTERNALS__ =', window.__TAURI_INTERNALS__);
    
    if (!window.__TAURI__) {
        console.error('❌ [MAIN] Tauri API not available!');
        console.log('🔍 [MAIN] Available window properties:', Object.keys(window).filter(k => k.includes('TAURI') || k.includes('tauri')));
    } else {
        console.log('✅ [MAIN] Tauri API is available');
        console.log('📦 [MAIN] Tauri API structure:', Object.keys(window.__TAURI__));
    }
    console.log('📊 [MAIN] Browser Info:', {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        webGL: !!window.WebGLRenderingContext,
        timestamp: new Date().toISOString()
    });
    
    // Also log to Rust terminal
    if (window.__TAURI__) {
        await logToRustTerminal('info', 'MAIN', 'Frontend application starting - DOM loaded');
        await logToRustTerminal('info', 'MAIN', `Browser: ${navigator.userAgent.substring(0, 50)}...`);
        await logToRustTerminal('info', 'MAIN', `Viewport: ${window.innerWidth}x${window.innerHeight}`);
    }
    
    try {
        console.log('🏗️ [MAIN] Creating main App instance...');
        // Create and initialize the main application
        app = new App();
        
        console.log('⚡ [MAIN] Initializing App...');
        const initialized = await app.init();
        
        if (initialized) {
            console.log('✅ [MAIN] App initialized successfully, setting up UI...');
            
            // Initialize UI components
            console.log('🎯 [MAIN] Step 1: Initializing DOM elements...');
            initializeElements();
            
            console.log('🎯 [MAIN] Step 2: Initializing components...');
            initializeComponents();
            
            console.log('🎯 [MAIN] Step 3: Setting up event listeners...');
            initializeEventListeners();
            
            console.log('🎯 [MAIN] Step 4: Setting up state integration...');
            setupStateIntegration();
            
            console.log('🎉 [MAIN] Application initialization completed successfully!');
            console.log('📋 [MAIN] Application Status:', {
                app: !!app,
                parameterPanel: !!parameterPanel,
                simulationController: !!simulationController,
                visualizationPanel: !!visualizationPanel,
                elementsFound: Object.keys(elements).filter(key => elements[key]).length
            });
        } else {
            console.error('❌ [MAIN] Application initialization failed');
        }
    } catch (error) {
        console.error('💥 [MAIN] Failed to initialize application:', error);
        console.error('📍 [MAIN] Error stack:', error.stack);
    }
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
    console.log('🔍 [MAIN] Searching for DOM elements...');
    
    // Header elements
    elements.runButton = document.getElementById('run-simulation');
    console.log('🎯 [MAIN] Run button:', elements.runButton ? '✅ Found' : '❌ Missing');
    
    // Simulation control elements
    elements.simulationControls = document.getElementById('simulation-controls');
    elements.progressFill = document.getElementById('progress-fill');
    elements.progressPercentage = document.getElementById('progress-percentage');
    elements.progressTime = document.getElementById('progress-time');
    elements.cancelButton = document.getElementById('cancel-simulation');
    console.log('🎯 [MAIN] Simulation controls:', {
        controls: !!elements.simulationControls,
        progressFill: !!elements.progressFill,
        progressPercentage: !!elements.progressPercentage,
        progressTime: !!elements.progressTime,
        cancelButton: !!elements.cancelButton
    });
    
    // Animation control elements
    elements.animationControls = document.getElementById('animation-controls');
    elements.playPauseButton = document.getElementById('play-pause');
    elements.playPauseIcon = document.getElementById('play-pause-icon');
    elements.timeSlider = document.getElementById('time-slider');
    elements.currentTimeDisplay = document.getElementById('current-time');
    elements.totalTimeDisplay = document.getElementById('total-time');
    elements.animationSpeedSelect = document.getElementById('animation-speed');
    console.log('🎯 [MAIN] Animation controls:', {
        controls: !!elements.animationControls,
        playPauseButton: !!elements.playPauseButton,
        playPauseIcon: !!elements.playPauseIcon,
        timeSlider: !!elements.timeSlider,
        currentTimeDisplay: !!elements.currentTimeDisplay,
        totalTimeDisplay: !!elements.totalTimeDisplay,
        animationSpeedSelect: !!elements.animationSpeedSelect
    });
    
    // Visualization elements
    elements.visualizationContainer = document.getElementById('visualization-container');
    elements.visualizationCanvas = document.getElementById('visualization-canvas');
    elements.visualizationPlaceholder = document.getElementById('visualization-placeholder');
    elements.visualizationLoading = document.getElementById('visualization-loading');
    elements.visualizationError = document.getElementById('visualization-error');
    elements.temperatureLegend = document.getElementById('temperature-legend');
    elements.hoverInfo = document.getElementById('hover-info');
    console.log('🎯 [MAIN] Visualization elements:', {
        container: !!elements.visualizationContainer,
        canvas: !!elements.visualizationCanvas,
        placeholder: !!elements.visualizationPlaceholder,
        loading: !!elements.visualizationLoading,
        error: !!elements.visualizationError,
        legend: !!elements.temperatureLegend,
        hoverInfo: !!elements.hoverInfo
    });
    
    // Status elements
    elements.appStatus = document.getElementById('app-status');
    console.log('🎯 [MAIN] Status elements:', {
        appStatus: !!elements.appStatus
    });
    
    // Count found elements
    const foundElements = Object.keys(elements).filter(key => elements[key]).length;
    const totalElements = Object.keys(elements).length;
    console.log(`📊 [MAIN] DOM Elements Summary: ${foundElements}/${totalElements} found`);
    
    if (foundElements < totalElements) {
        const missingElements = Object.keys(elements).filter(key => !elements[key]);
        console.warn('⚠️ [MAIN] Missing DOM elements:', missingElements);
    }
}

/**
 * Initialize component instances
 */
function initializeComponents() {
    console.log('🔧 [MAIN] Starting component initialization...');
    
    // Initialize parameter panel
    console.log('📝 [MAIN] Initializing ParameterPanel...');
    const parameterContainer = document.getElementById('parameters-panel');
    console.log('📝 [MAIN] Parameter container found:', !!parameterContainer);
    console.log('📝 [MAIN] App and EventBus available:', !!(app && app.eventBus));
    
    if (parameterContainer && app && app.eventBus) {
        try {
            parameterPanel = new ParameterPanel(parameterContainer, app.eventBus);
            console.log('✅ [MAIN] ParameterPanel component initialized successfully');
            console.log('📝 [MAIN] ParameterPanel status:', {
                isValid: parameterPanel.isValid,
                isDirty: parameterPanel.isDirty,
                fieldsCount: parameterPanel.fields.size
            });
        } catch (error) {
            console.error('❌ [MAIN] Failed to create ParameterPanel:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize ParameterPanel - missing dependencies:', {
            container: !!parameterContainer,
            app: !!app,
            eventBus: !!(app && app.eventBus)
        });
    }
    
    // Initialize simulation controller
    console.log('⚙️ [MAIN] Initializing SimulationController...');
    if (app && app.eventBus) {
        try {
            simulationController = new SimulationController(app.eventBus);
            app.registerComponent('simulationController', simulationController);
            console.log('✅ [MAIN] SimulationController component initialized successfully');
        } catch (error) {
            console.error('❌ [MAIN] Failed to create SimulationController:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize SimulationController - missing eventBus:', {
            app: !!app,
            eventBus: !!(app && app.eventBus)
        });
    }
    
    // Initialize visualization panel
    console.log('🎨 [MAIN] Initializing VisualizationPanel...');
    const visualizationContainer = document.getElementById('visualization-panel');
    console.log('🎨 [MAIN] Visualization container found:', !!visualizationContainer);
    
    if (visualizationContainer && app && app.eventBus) {
        try {
            visualizationPanel = new VisualizationPanel(visualizationContainer, app.eventBus);
            app.registerComponent('visualizationPanel', visualizationPanel);
            console.log('🎨 [MAIN] VisualizationPanel instance created, initializing 3D context...');
            
            // Initialize the 3D rendering context
            visualizationPanel.init().then(success => {
                if (success) {
                    console.log('✅ [MAIN] VisualizationPanel 3D context initialized successfully');
                    console.log('🎨 [MAIN] VisualizationPanel status:', visualizationPanel.getStatus());
                    visualizationPanel.showPlaceholder();
                    console.log('🎨 [MAIN] Placeholder state shown');
                } else {
                    console.error('❌ [MAIN] Failed to initialize VisualizationPanel 3D context');
                    visualizationPanel.showError('Failed to initialize 3D rendering. Please check WebGL support.');
                }
            }).catch(error => {
                console.error('💥 [MAIN] VisualizationPanel initialization error:', error);
            });
        } catch (error) {
            console.error('❌ [MAIN] Failed to create VisualizationPanel:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize VisualizationPanel - missing dependencies:', {
            container: !!visualizationContainer,
            app: !!app,
            eventBus: !!(app && app.eventBus)
        });
    }
    
    // Initialize data cache manager first (needed by animation controller)
    console.log('💾 [MAIN] Initializing DataCacheManager...');
    if (app && app.eventBus) {
        try {
            const dataCacheManager = new DataCacheManager(app.eventBus, 50);
            app.registerComponent('dataCacheManager', dataCacheManager);
            console.log('✅ [MAIN] DataCacheManager component initialized successfully');
        } catch (error) {
            console.error('❌ [MAIN] Failed to create DataCacheManager:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize DataCacheManager - missing eventBus');
    }
    
    // Initialize animation controller with data cache manager
    console.log('🎬 [MAIN] Initializing AnimationController...');
    if (app && app.eventBus) {
        try {
            const dataCacheManager = app.getComponent('dataCacheManager');
            const animationController = new AnimationController(app.eventBus, dataCacheManager);
            app.registerComponent('animation', animationController);
            console.log('✅ [MAIN] AnimationController component initialized successfully');
            console.log('🔗 [MAIN] AnimationController connected to DataCacheManager');
        } catch (error) {
            console.error('❌ [MAIN] Failed to create AnimationController:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize AnimationController - missing eventBus');
    }
    
    // Initialize animation UI
    console.log('🎬 [MAIN] Initializing AnimationUI...');
    const visualizationPanelElement = document.getElementById('visualization-panel');
    console.log('🎬 [MAIN] Visualization panel element found:', !!visualizationPanelElement);
    
    if (visualizationPanelElement && app && app.eventBus) {
        try {
            // Get animation controller and visualization panel
            const animationController = app.getComponent('animation');
            if (animationController) {
                // Pass visualization panel reference to AnimationUI for coordination
                const animationUI = new AnimationUI(
                    visualizationPanelElement, 
                    animationController, 
                    app.eventBus,
                    visualizationPanel  // Pass visualization panel for frame coordination
                );
                app.registerComponent('animationUI', animationUI);
                
                // Render the UI controls
                animationUI.render();
                
                console.log('✅ [MAIN] AnimationUI component initialized and rendered successfully');
                console.log('🔗 [MAIN] AnimationUI connected to VisualizationPanel');
            } else {
                console.error('❌ [MAIN] AnimationController not available for AnimationUI');
            }
        } catch (error) {
            console.error('❌ [MAIN] Failed to create AnimationUI:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize AnimationUI - missing dependencies:', {
            container: !!visualizationPanelElement,
            app: !!app,
            eventBus: !!(app && app.eventBus)
        });
    }
    
    // Initialize metadata display
    console.log('📊 [MAIN] Initializing MetadataDisplay...');
    const visualizationContainerElement = document.getElementById('visualization-container');
    console.log('📊 [MAIN] Visualization container element found:', !!visualizationContainerElement);
    
    if (visualizationContainerElement && app && app.eventBus) {
        try {
            const metadataDisplay = new MetadataDisplay(visualizationContainerElement, app.eventBus);
            app.registerComponent('metadataDisplay', metadataDisplay);
            
            // Render the metadata overlay
            metadataDisplay.render();
            
            console.log('✅ [MAIN] MetadataDisplay component initialized and rendered successfully');
        } catch (error) {
            console.error('❌ [MAIN] Failed to create MetadataDisplay:', error);
        }
    } else {
        console.error('❌ [MAIN] Failed to initialize MetadataDisplay - missing dependencies:', {
            container: !!visualizationContainerElement,
            app: !!app,
            eventBus: !!(app && app.eventBus)
        });
    }
    
    console.log('📊 [MAIN] Component initialization summary:', {
        parameterPanel: !!parameterPanel,
        simulationController: !!simulationController,
        visualizationPanel: !!visualizationPanel,
        appComponents: app ? app.components.size : 0
    });
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    console.log('👂 [MAIN] Setting up event listeners...');
    
    // Run simulation button
    if (elements.runButton) {
        elements.runButton.addEventListener('click', handleRunSimulation);
        console.log('✅ [MAIN] Run simulation button listener added');
    } else {
        console.warn('⚠️ [MAIN] Run simulation button not found - listener not added');
    }
    
    // Cancel simulation button
    if (elements.cancelButton) {
        elements.cancelButton.addEventListener('click', handleCancelSimulation);
        console.log('✅ [MAIN] Cancel simulation button listener added');
    } else {
        console.warn('⚠️ [MAIN] Cancel simulation button not found - listener not added');
    }
    
    // Animation controls
    if (elements.playPauseButton) {
        elements.playPauseButton.addEventListener('click', handlePlayPause);
        console.log('✅ [MAIN] Play/pause button listener added');
    } else {
        console.warn('⚠️ [MAIN] Play/pause button not found - listener not added');
    }
    
    if (elements.timeSlider) {
        elements.timeSlider.addEventListener('input', handleTimeSliderChange);
        console.log('✅ [MAIN] Time slider listener added');
    } else {
        console.warn('⚠️ [MAIN] Time slider not found - listener not added');
    }
    
    if (elements.animationSpeedSelect) {
        elements.animationSpeedSelect.addEventListener('change', handleAnimationSpeedChange);
        console.log('✅ [MAIN] Animation speed select listener added');
    } else {
        console.warn('⚠️ [MAIN] Animation speed select not found - listener not added');
    }
    
    // Visualization controls
    const resetCameraButton = document.getElementById('reset-camera');
    if (resetCameraButton) {
        resetCameraButton.addEventListener('click', handleResetCamera);
        console.log('✅ [MAIN] Reset camera button listener added');
    } else {
        console.warn('⚠️ [MAIN] Reset camera button not found - listener not added');
    }
    
    const retryVisualizationButton = document.getElementById('retry-visualization');
    if (retryVisualizationButton) {
        retryVisualizationButton.addEventListener('click', handleRetryVisualization);
        console.log('✅ [MAIN] Retry visualization button listener added');
    } else {
        console.warn('⚠️ [MAIN] Retry visualization button not found - listener not added');
    }
    
    // Window resize for responsive canvas
    window.addEventListener('resize', handleWindowResize);
    console.log('✅ [MAIN] Window resize listener added');
    
    console.log('📊 [MAIN] Event listeners setup complete');
}

/**
 * Update run button state
 */
function updateRunButtonState(isValid, phase) {
    if (!elements.runButton) return;
    
    // Button should be enabled when:
    // - Parameters are valid AND
    // - We're in READY or RESULTS state (not RUNNING or INITIAL)
    const shouldEnable = isValid && (phase === 'READY' || phase === 'RESULTS');
    elements.runButton.disabled = !shouldEnable;
    
    // Update button text based on state
    if (phase === 'RESULTS') {
        elements.runButton.textContent = 'Run New Simulation';
    } else {
        elements.runButton.textContent = 'Run Simulation';
    }
}

/**
 * Handle run simulation button click
 */
async function handleRunSimulation() {
    console.log('🚀 [MAIN] USER ACTION: Run Simulation button clicked');
    console.log('🔍 [MAIN] Checking component availability...');
    
    if (!app || !app.appState || !parameterPanel || !simulationController) {
        console.error('❌ [MAIN] App components not initialized:', {
            app: !!app,
            appState: !!(app && app.appState),
            parameterPanel: !!parameterPanel,
            simulationController: !!simulationController
        });
        return;
    }

    console.log('✅ [MAIN] All components available, getting parameters...');
    
    // Get current parameters from parameter panel
    const parameters = parameterPanel.getParameters();
    console.log('📝 [MAIN] Current parameters:', parameters);
    
    const validation = parameterPanel.validateAll();
    console.log('✅ [MAIN] Parameter validation result:', validation);
    
    if (!validation.isValid) {
        console.error('❌ [MAIN] Cannot run simulation - parameters are invalid:', validation.errors);
        console.log('🔧 [MAIN] Validation errors:', validation.errors.map(e => `${e.field}: ${e.message}`));
        return;
    }

    console.log('🎯 [MAIN] Parameters valid, starting simulation...');
    const currentState = app.appState.getState();
    console.log('📊 [MAIN] Current app state:', currentState);
    
    try {
        // If we're in RESULTS state, first transition to READY to clear previous results
        if (currentState.phase === 'RESULTS') {
            console.log('🔄 [MAIN] Clearing previous results, transitioning RESULTS -> READY...');
            const readySuccess = app.appState.transition('READY', {
                simulation: {
                    progress: 0,
                    results: null,
                    startTime: null,
                    endTime: null
                },
                visualization: {
                    currentTime: 0,
                    isPlaying: false,
                    animationSpeed: 1.0,
                    timeSteps: []
                }
            }, 'Starting new simulation');
            
            if (!readySuccess) {
                console.error('❌ [MAIN] Failed to clear previous results');
                return;
            }
        }
        
        console.log('🔄 [MAIN] Transitioning to RUNNING state...');
        // Transition to RUNNING state
        const success = app.appState.transition('RUNNING', {
            simulation: {
                progress: 0,
                startTime: new Date().toISOString()
            }
        }, 'User initiated simulation');
        
        console.log('🔄 [MAIN] State transition result:', success);
        
        if (success) {
            console.log('⚡ [MAIN] Calling SimulationController.runSimulation...');
            // Start simulation using SimulationController
            const result = await simulationController.runSimulation(parameters, {
                timeout: 300000 // 5 minutes timeout
            });
            
            console.log('✅ [MAIN] Simulation started successfully:', result);
        } else {
            console.error('❌ [MAIN] Failed to start simulation - invalid state transition');
            console.log('📊 [MAIN] Current state after failed transition:', app.appState.getState());
        }
    } catch (error) {
        console.error('💥 [MAIN] Failed to start simulation:', error);
        console.error('📍 [MAIN] Error stack:', error.stack);
        
        console.log('🔄 [MAIN] Transitioning back to READY state due to error...');
        // Transition back to READY state on error
        const rollbackSuccess = app.appState.transition('READY', {
            simulation: {
                progress: 0,
                error: error.message
            }
        }, 'Simulation start failed');
        
        console.log('🔄 [MAIN] Rollback transition result:', rollbackSuccess);
    }
}

/**
 * Handle cancel simulation button click
 */
async function handleCancelSimulation() {
    console.log('🛑 [MAIN] USER ACTION: Cancel Simulation button clicked');
    
    if (!app || !app.appState || !simulationController) {
        console.error('❌ [MAIN] App components not initialized for cancellation:', {
            app: !!app,
            appState: !!(app && app.appState),
            simulationController: !!simulationController
        });
        return;
    }

    console.log('🛑 [MAIN] Initiating simulation cancellation...');
    console.log('📊 [MAIN] Current simulation status:', simulationController.getDebugInfo());
    
    try {
        console.log('🛑 [MAIN] Calling SimulationController.cancelSimulation...');
        // Cancel simulation using SimulationController
        const result = await simulationController.cancelSimulation();
        console.log('✅ [MAIN] Simulation cancelled successfully:', result);
        
        console.log('🔄 [MAIN] Checking current state before transition...');
        const currentState = app.appState.getState();
        console.log('📊 [MAIN] Current state before cancellation transition:', currentState.phase);
        
        // Only transition if not already in READY state
        if (currentState.phase !== 'READY') {
            console.log('🔄 [MAIN] Transitioning to READY state after cancellation...');
            const transitionResult = app.appState.transition('READY', {
                simulation: {
                    progress: 0,
                    results: null,
                    endTime: new Date().toISOString()
                }
            }, 'User cancelled simulation');
            console.log('🔄 [MAIN] Cancellation transition result:', transitionResult);
        } else {
            console.log('ℹ️ [MAIN] Already in READY state, no transition needed');
        }
        
    } catch (error) {
        console.error('💥 [MAIN] Failed to cancel simulation:', error);
        console.error('📍 [MAIN] Cancellation error stack:', error.stack);
        
        console.log('🔄 [MAIN] Forcing transition to READY state despite cancellation failure...');
        // Still transition to READY state even if cancellation failed
        const forceTransitionResult = app.appState.transition('READY', {
            simulation: {
                progress: 0,
                error: error.message,
                endTime: new Date().toISOString()
            }
        }, 'Simulation cancellation failed');
        
        console.log('🔄 [MAIN] Force transition result:', forceTransitionResult);
    }
}

/**
 * Update progress display with real backend data
 * Updates progress bar, percentage, current time, and estimated remaining time
 */
function updateProgress(progressData) {
    const progress = progressData.percent || 0;
    
    // Update progress bar fill
    if (elements.progressFill) {
        elements.progressFill.style.width = progress + '%';
    }
    
    // Update progress percentage
    if (elements.progressPercentage) {
        elements.progressPercentage.textContent = Math.round(progress) + '%';
    }
    
    // Update progress time with current time and estimated remaining
    if (elements.progressTime) {
        let timeText = '';
        
        // Show current time if available
        if (progressData.currentTime !== undefined) {
            timeText = `Time: ${progressData.currentTime.toFixed(1)}s`;
            
            // Add total time if available
            if (progressData.totalTime !== undefined) {
                timeText += ` / ${progressData.totalTime.toFixed(1)}s`;
            }
        }
        
        // Add estimated remaining time if available
        if (progressData.estimatedRemaining !== null && progressData.estimatedRemaining !== undefined) {
            const remaining = progressData.estimatedRemaining;
            if (timeText) {
                timeText += ` | Remaining: ${remaining.toFixed(1)}s`;
            } else {
                timeText = `Estimated: ${remaining.toFixed(1)}s`;
            }
        }
        
        elements.progressTime.textContent = timeText || 'Calculating...';
    }
}

/**
 * Handle play/pause button click
 */
function handlePlayPause() {
    console.log('▶️ [MAIN] USER ACTION: Play/Pause button clicked');
    
    const animationController = app.getComponent('animation');
    console.log('🎬 [MAIN] Animation controller available:', !!animationController);
    
    if (animationController) {
        console.log('🎬 [MAIN] Current animation state:', animationController.getState());
        console.log('🎬 [MAIN] Toggling animation...');
        const result = animationController.toggle();
        console.log('🎬 [MAIN] Toggle result:', result);
    } else {
        console.error('❌ [MAIN] Animation controller not available');
        console.log('📊 [MAIN] Available components:', app ? Array.from(app.components.keys()) : 'No app');
    }
}

/**
 * Handle time slider change
 */
function handleTimeSliderChange(event) {
    const sliderValue = parseFloat(event.target.value);
    console.log('🎚️ [MAIN] USER ACTION: Time slider changed to:', sliderValue);
    
    const animationController = app.getComponent('animation');
    console.log('🎬 [MAIN] Animation controller available:', !!animationController);
    
    if (animationController) {
        const state = animationController.getState();
        console.log('🎬 [MAIN] Current animation state:', state);
        
        const targetTimeStep = Math.round((sliderValue / 100) * (state.totalTimeSteps - 1));
        console.log('🎚️ [MAIN] Calculated target time step:', targetTimeStep);
        
        console.log('🎬 [MAIN] Setting animation time step...');
        const result = animationController.setTimeStep(targetTimeStep);
        console.log('🎬 [MAIN] Set time step result:', result);
    } else {
        console.log('🔄 [MAIN] Fallback: Using direct visualization control');
        // Fallback to direct visualization control
        const timeStep = parseInt(event.target.value);
        console.log('🎚️ [MAIN] Direct time step value:', timeStep);
        
        if (visualizationPanel && visualizationPanel.simulationData) {
            console.log('🎨 [MAIN] Setting visualization time step directly...');
            visualizationPanel.setTimeStep(timeStep);
        } else {
            console.warn('⚠️ [MAIN] No visualization panel or simulation data available');
            console.log('📊 [MAIN] Visualization panel status:', {
                panel: !!visualizationPanel,
                hasData: !!(visualizationPanel && visualizationPanel.simulationData)
            });
        }
    }
}

/**
 * Handle animation speed change
 */
function handleAnimationSpeedChange(event) {
    const speed = parseFloat(event.target.value);
    const animationController = app.getComponent('animation');
    
    if (animationController) {
        animationController.setSpeed(speed);
    } else {
        console.error('Animation controller not available');
    }
}

/**
 * Handle reset camera button click
 */
function handleResetCamera() {
    if (visualizationPanel) {
        visualizationPanel.resetCamera();
        console.log('Camera reset to default position');
    }
}

/**
 * Handle retry visualization button click
 */
function handleRetryVisualization() {
    if (visualizationPanel) {
        console.log('Retrying visualization initialization...');
        visualizationPanel.init().then(success => {
            if (success) {
                console.log('Visualization retry successful');
                if (visualizationPanel.simulationData) {
                    visualizationPanel.showVisualization();
                } else {
                    visualizationPanel.showPlaceholder();
                }
            } else {
                console.error('Visualization retry failed');
                visualizationPanel.showError('Retry failed. Please check WebGL support.');
            }
        });
    }
}

/**
 * Handle window resize
 */
function handleWindowResize() {
    console.log('📐 [MAIN] USER ACTION: Window resized to:', {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
    });
    
    // Resize visualization canvas if needed
    if (visualizationPanel && visualizationPanel.isInitialized) {
        console.log('📐 [MAIN] Calling visualization panel resize...');
        visualizationPanel.onWindowResize();
        console.log('✅ [MAIN] Visualization panel resized');
    } else {
        console.log('⚠️ [MAIN] Visualization panel not available for resize:', {
            panel: !!visualizationPanel,
            initialized: !!(visualizationPanel && visualizationPanel.isInitialized)
        });
    }
}

/**
 * Show different visualization states
 */
function showVisualizationState(state) {
    const states = ['placeholder', 'loading', 'error', 'results'];
    
    states.forEach(s => {
        const element = document.getElementById('visualization-' + s);
        if (element) {
            element.style.display = s === state ? 'flex' : 'none';
        }
    });
    
    // Special handling for canvas
    if (elements.visualizationCanvas) {
        elements.visualizationCanvas.style.display = state === 'results' ? 'block' : 'none';
    }
}

/**
 * Set up integration with new state management system
 */
function setupStateIntegration() {
    if (!app || !app.eventBus || !app.appState) {
        console.error('App not properly initialized');
        return;
    }

    // Subscribe to state changes
    app.eventBus.on('state:changed', handleStateChange);
    
    // Parameter events - wire parameter changes to simulation readiness
    app.eventBus.on('parameters:changed', handleParametersChange);
    app.eventBus.on('parameters:submit', handleParametersSubmit);
    app.eventBus.on('parameters:validated', handleParametersValidated);
    
    // UI coordination events
    app.eventBus.on('ui:error', handleUIError);
    app.eventBus.on('ui:reset', handleUIReset);
    app.eventBus.on('ui:enable-simulation', handleEnableSimulation);
    app.eventBus.on('ui:simulation-started', handleSimulationStarted);
    app.eventBus.on('ui:simulation-completed', handleSimulationCompleted);
    
    // Subscribe to simulation controller events
    app.eventBus.on('simulation:starting', handleSimulationStarting);
    app.eventBus.on('simulation:started', handleSimulationStartedEvent);
    app.eventBus.on('simulation:progress', handleSimulationProgress);
    app.eventBus.on('simulation:completed', handleSimulationCompletedEvent);
    app.eventBus.on('simulation:failed', handleSimulationFailed);
    app.eventBus.on('simulation:cancelling', handleSimulationCancelling);
    app.eventBus.on('simulation:cancelled', handleSimulationCancelledEvent);
    app.eventBus.on('simulation:timeout', handleSimulationTimeout);
    app.eventBus.on('simulation:error', handleSimulationError);
    
    // Subscribe to visualization events
    app.eventBus.on('visualization:initialized', handleVisualizationInitialized);
    app.eventBus.on('visualization:loaded', handleVisualizationLoaded);
    app.eventBus.on('visualization:error', handleVisualizationError);
    app.eventBus.on('visualization:timeStepChanged', handleVisualizationTimeStepChanged);
    
    // Subscribe to animation events
    app.eventBus.on('animation:initialized', handleAnimationInitialized);
    app.eventBus.on('animation:play', handleAnimationPlay);
    app.eventBus.on('animation:pause', handleAnimationPause);
    app.eventBus.on('animation:timeChanged', handleAnimationTimeChanged);
    app.eventBus.on('animation:speedChanged', handleAnimationSpeedChanged);
    app.eventBus.on('animation:ended', handleAnimationEnded);
    app.eventBus.on('animation:error', handleAnimationError);
    app.eventBus.on('animation:frame-loaded', handleAnimationFrameLoaded);
    app.eventBus.on('animation:frame-loading', handleAnimationFrameLoading);
    
    console.log('State integration set up successfully');
}

/**
 * Handle state changes from the state management system
 */
function handleStateChange(data) {
    const { from, to, state, reason } = data;
    console.log(`UI handling state change: ${from} -> ${to} (${reason})`);
    
    // Update UI based on new state
    switch (to) {
        case 'INITIAL':
            updateAppStatus('Initializing...');
            showVisualizationState('placeholder');
            break;
            
        case 'READY':
            updateAppStatus('Ready');
            if (visualizationPanel) {
                visualizationPanel.showPlaceholder();
            } else {
                showVisualizationState('placeholder');
            }
            if (parameterPanel) {
                updateRunButtonState(parameterPanel.isValid, 'READY');
                parameterPanel.hideLoading();
            }
            break;
            
        case 'RUNNING':
            updateAppStatus('Running simulation...');
            updateRunButtonState(false, 'RUNNING');
            if (visualizationPanel) {
                visualizationPanel.showLoading('Simulation running...');
            }
            if (parameterPanel) {
                parameterPanel.showLoading('Simulation running...');
            }
            break;
            
        case 'RESULTS':
            updateAppStatus('Simulation complete');
            if (parameterPanel) {
                updateRunButtonState(parameterPanel.isValid, 'RESULTS');
                parameterPanel.hideLoading();
            }
            break;
    }
}

/**
 * Handle parameter changes from parameter panel
 * Wire parameter changes to simulation readiness
 */
function handleParametersChange(data) {
    const { parameters, isValid, field, value, validationChanged } = data;
    
    console.log('[Main] Parameters changed:', field, '=', value, 'Valid:', isValid);
    
    // Update run button state based on validation
    const currentState = app.appState ? app.appState.getState() : { phase: 'INITIAL' };
    updateRunButtonState(isValid, currentState.phase);
    
    // Update app state with new parameters
    if (app.appState) {
        app.appState.updateParameters(parameters);
        
        // If validation state changed and parameters are now valid, 
        // ensure we transition to READY state
        if (validationChanged && isValid && currentState.phase === 'INITIAL') {
            const transitioned = app.appState.transition('READY', {}, 'Parameters validated and ready');
            if (transitioned) {
                console.log('[Main] Transitioned to READY state after parameter validation');
            }
        }
    }
    
    // Emit parameter validation event for other components
    app.eventBus.emit('parameters:validation-changed', {
        isValid,
        parameters,
        field,
        value
    });
}

/**
 * Handle parameter form submission
 */
function handleParametersSubmit(data) {
    const { parameters } = data;
    console.log('[Main] Parameters submitted:', parameters);
    
    // Update state and potentially trigger simulation
    if (app.appState) {
        app.appState.updateParameters(parameters);
        
        // If we're in READY state and parameters are valid, could auto-start simulation
        // For now, just ensure we're in READY state
        const currentState = app.appState.getState();
        if (currentState.phase === 'INITIAL') {
            app.appState.transition('READY', {}, 'Parameters submitted');
        }
    }
}

/**
 * Handle parameter validation changes
 */
function handleParametersValidated(data) {
    const { isValid, parameters } = data;
    console.log('[Main] Parameters validation changed:', isValid);
    
    // Update UI state based on validation
    if (app.appState) {
        const currentState = app.appState.getState();
        
        // Transition to READY if parameters are valid and we're in INITIAL state
        if (isValid && currentState.phase === 'INITIAL') {
            app.appState.transition('READY', { parameters }, 'Parameters validated');
        }
        // Could transition back to INITIAL if parameters become invalid
        // but for better UX, we'll stay in READY and just disable the run button
        
        // Update run button state based on validation
        updateRunButtonState(isValid, currentState.phase);
    }
}

/**
 * Handle UI errors
 */
function handleUIError(errorInfo) {
    console.error('UI Error:', errorInfo);
    updateAppStatus(`Error: ${errorInfo.message}`);
    
    // Show error in appropriate UI location
    if (errorInfo.type === 'validation') {
        // Update run button state to disabled for validation errors
        updateRunButtonState(false, app.appState?.getState()?.phase || 'INITIAL');
    } else if (errorInfo.type === 'simulation') {
        showVisualizationState('error');
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = errorInfo.message;
        }
    }
}

/**
 * Handle UI reset
 */
function handleUIReset(state) {
    showVisualizationState('placeholder');
    updateRunButtonState(false);
    updateAppStatus('Ready');
}

/**
 * Handle enable simulation
 */
function handleEnableSimulation(state) {
    updateRunButtonState(true);
}

/**
 * Handle simulation started
 */
function handleSimulationStarted(state) {
    if (elements.simulationControls) {
        elements.simulationControls.style.display = 'block';
    }
    showVisualizationState('loading');
}

/**
 * Handle simulation completed
 */
function handleSimulationCompleted(state) {
    if (elements.simulationControls) {
        elements.simulationControls.style.display = 'none';
    }
    
    // Animation controls will be shown by the AnimationUI component
    // when animation is initialized
    
    // Show visualization with loaded data
    if (visualizationPanel) {
        visualizationPanel.showVisualization();
        
        // Enable reset camera button
        const resetCameraButton = document.getElementById('reset-camera');
        if (resetCameraButton) {
            resetCameraButton.disabled = false;
        }
    } else {
        showVisualizationState('results');
    }
    
    if (elements.temperatureLegend) {
        elements.temperatureLegend.style.display = 'block';
    }
}

/**
 * Update application status
 */
function updateAppStatus(status) {
    if (elements.appStatus) {
        elements.appStatus.textContent = status;
    }
}

/**
 * Handle simulation starting event
 */
function handleSimulationStarting(data) {
    console.log('Simulation starting:', data);
    updateAppStatus('Initializing simulation...');
}

/**
 * Handle simulation started event from controller
 */
function handleSimulationStartedEvent(data) {
    console.log('Simulation started:', data);
    updateAppStatus('Simulation running...');
    
    if (elements.simulationControls) {
        elements.simulationControls.style.display = 'block';
    }
    
    showVisualizationState('loading');
}

/**
 * Handle simulation progress updates
 */
function handleSimulationProgress(data) {
    console.log('Simulation progress:', data);
    updateProgress(data.progress);
    
    // Update status with current time
    if (data.progress.currentTime !== undefined) {
        updateAppStatus(`Running... ${data.progress.currentTime.toFixed(1)}s / ${data.progress.totalTime.toFixed(1)}s`);
    }
}

/**
 * Handle simulation completion event from controller
 * Connect simulation completion to visualization loading and animation initialization
 */
async function handleSimulationCompletedEvent(data) {
    console.log('[Main] Simulation completed, connecting to visualization:', data);
    
    if (!app || !app.appState) {
        console.error('[Main] App not initialized');
        return;
    }
    
    // Transition to RESULTS state first
    const transitioned = app.appState.transition('RESULTS', {
        simulation: {
            progress: 100,
            results: data.results,
            endTime: new Date().toISOString(),
            duration: data.duration
        },
        visualization: {
            currentTime: 0,
            currentTimeStep: 0,
            simulationId: data.simulationId
        }
    }, 'Simulation completed successfully');
    
    if (!transitioned) {
        console.error('[Main] Failed to transition to RESULTS state');
        return;
    }
    
    // Load data into visualization panel
    if (visualizationPanel) {
        console.log('[Main] Loading simulation data into visualization...');
        
        // Use the processed results from simulation controller
        // or create mock data if results are not available
        let resultsToLoad = data.results;
        
        if (!resultsToLoad || !resultsToLoad.timeSteps) {
            console.log('[Main] Creating mock results for visualization');
            const currentParams = app.appState.getState().parameters;
            resultsToLoad = createMockSimulationResults(currentParams);
        }
        
        // Load data into visualization
        visualizationPanel.loadSimulationData(resultsToLoad);
        
        // The visualization panel will emit 'visualization:loaded' when ready
        // which will trigger animation initialization
    } else {
        console.error('[Main] Visualization panel not available');
    }
    
    updateAppStatus('Simulation completed - loading visualization...');
    
    // Check if animation is needed (multiple time steps)
    const results = data.results || {};
    const hasMultipleTimeSteps = results.timeSteps && results.timeSteps.length > 1;
    
    if (!hasMultipleTimeSteps) {
        console.log('[Main] Single time step result - animation not needed');
        updateAppStatus('Visualization loaded');
        return;
    }
    
    // Wire up animation controls to simulation completion
    // This implements task 14: Wire up animation controls to simulation completion
    try {
        console.log('[Main] Task 14: Wiring up animation controls to simulation completion');
        
        // Step 1: Fetch animation metadata from backend
        console.log('[Main] Step 1: Fetching animation metadata from backend...');
        updateAppStatus('Loading animation data...');
        
        const simulationId = data.simulationId || 'current';
        let metadata = null;
        
        try {
            metadata = await window.__TAURI__.invoke('get_animation_metadata', {
                simulationId: simulationId
            });
            console.log('[Main] Animation metadata fetched:', metadata);
        } catch (error) {
            console.error('[Main] Failed to fetch animation metadata:', error);
            console.log('[Main] Falling back to creating metadata from results');
            
            // Fallback: Create metadata from results if backend call fails
            const results = data.results || {};
            if (results && results.timeSteps) {
                metadata = {
                    total_time_steps: results.timeSteps.length,
                    simulation_duration: results.duration || 60,
                    time_interval: results.duration / Math.max(1, results.timeSteps.length - 1),
                    temperature_range: results.temperatureRange || { min: 300, max: 2000 },
                    mesh_dimensions: results.meshData ? 
                        [results.meshData.nr || 10, results.meshData.nz || 10] : 
                        [10, 10],
                    furnace_dimensions: results.meshData ?
                        [results.meshData.radius || 1.0, results.meshData.height || 2.0] :
                        [1.0, 2.0]
                };
                console.log('[Main] Created fallback metadata:', metadata);
            } else {
                throw new Error('Cannot create animation metadata: no results available');
            }
        }
        
        // Validate metadata
        if (!metadata || !metadata.total_time_steps || metadata.total_time_steps < 1) {
            throw new Error('Invalid animation metadata: missing or invalid total_time_steps');
        }
        
        // Step 2: Initialize data cache manager
        console.log('[Main] Step 2: Initializing data cache manager...');
        const dataCacheManager = app.getComponent('dataCacheManager');
        
        if (!dataCacheManager) {
            console.log('[Main] Creating new DataCacheManager instance...');
            const newDataCacheManager = new DataCacheManager(app.eventBus, 50);
            app.registerComponent('dataCacheManager', newDataCacheManager);
            
            // Set data cache manager on animation controller
            const animationController = app.getComponent('animation');
            if (animationController) {
                animationController.setDataCacheManager(newDataCacheManager);
                console.log('[Main] Data cache manager set on animation controller');
            }
        }
        
        const cacheManager = app.getComponent('dataCacheManager');
        if (!cacheManager) {
            throw new Error('Failed to create or retrieve DataCacheManager');
        }
        
        // Step 3: Initialize animation controller with data
        console.log('[Main] Step 3: Initializing animation controller with data...');
        const animationController = app.getComponent('animation');
        
        if (!animationController) {
            throw new Error('Animation controller not available');
        }
        
        // Initialize animation with backend data
        const animationInitialized = await animationController.initializeWithData(simulationId, metadata);
        
        if (!animationInitialized) {
            throw new Error('Failed to initialize animation controller with data');
        }
        
        console.log('[Main] Animation controller initialized successfully');
        
        // Step 4: Show animation controls after data loads
        console.log('[Main] Step 4: Showing animation controls...');
        const animationUI = app.getComponent('animationUI');
        
        if (animationUI) {
            animationUI.show();
            console.log('[Main] Animation controls shown');
        } else {
            console.warn('[Main] AnimationUI component not available');
        }
        
        // Step 5: Enable playback controls when ready
        console.log('[Main] Step 5: Enabling playback controls...');
        if (animationUI) {
            animationUI.enableControls(true);
            console.log('[Main] Playback controls enabled');
        }
        
        // Step 6: Set initial state to first frame (already done by initializeWithData)
        console.log('[Main] Step 6: Initial state set to first frame');
        
        // Update status
        updateAppStatus('Animation ready - playback enabled');
        console.log('[Main] Task 14 completed: Animation controls wired up successfully');
        
        // Emit event to notify other components
        app.eventBus.emit('animation:ready', {
            simulationId: simulationId,
            metadata: metadata,
            totalTimeSteps: metadata.total_time_steps,
            duration: metadata.simulation_duration
        });
        
    } catch (error) {
        console.error('[Main] Task 14 failed: Error wiring up animation controls:', error);
        updateAppStatus(`Animation initialization failed: ${error.message}`);
        
        // Emit error event
        app.eventBus.emit('animation:initialization-failed', {
            error: error.message,
            simulationId: data.simulationId
        });
        
        // Show error to user
        if (visualizationPanel) {
            visualizationPanel.showError(`Failed to initialize animation: ${error.message}`);
        }
    }
}

/**
 * Create mock simulation results for testing
 */
function createMockSimulationResults(parameters) {
    const duration = parameters?.simulation?.duration || 60;
    const timeStepDuration = parameters?.simulation?.timeStep || 0.5;
    const timeStepCount = Math.floor(duration / timeStepDuration);
    
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
        temperatureData: generateMockTemperatureData(timeStepCount),
        meshData: {
            vertices: [],
            faces: [],
            radius: parameters?.furnace?.radius || 1.0,
            height: parameters?.furnace?.height || 2.0
        },
        metadata: {
            parameters: parameters,
            completionTime: new Date().toISOString(),
            isMockData: true
        }
    };
}

/**
 * Generate mock temperature data for testing
 */
function generateMockTemperatureData(timeStepCount) {
    const temperatureData = [];
    
    for (let t = 0; t < timeStepCount; t++) {
        const timeStepData = [];
        const progress = t / Math.max(1, timeStepCount - 1);
        
        // Generate temperature field for this time step
        for (let i = 0; i < 100; i++) {
            const r = (i % 10) / 10; // Radial position (0-1)
            const z = Math.floor(i / 10) / 10; // Axial position (0-1)
            
            // Create a heat source that spreads over time
            const distanceFromCenter = Math.sqrt(r * r + (z - 0.5) * (z - 0.5));
            const heatSpread = 0.2 + progress * 0.5; // Heat spreads over time
            
            let temperature = 300; // Room temperature
            if (distanceFromCenter < heatSpread) {
                const intensity = 1 - (distanceFromCenter / heatSpread);
                temperature = 300 + intensity * 1500; // Up to 1800K
            }
            
            timeStepData.push(temperature);
        }
        
        temperatureData.push(timeStepData);
    }
    
    return temperatureData;
}

/**
 * Handle simulation failure
 */
function handleSimulationFailed(data) {
    console.error('Simulation failed:', data);
    
    if (!app || !app.appState) {
        console.error('App not initialized');
        return;
    }
    
    // Transition back to READY state
    app.appState.transition('READY', {
        simulation: {
            progress: 0,
            error: data.error,
            endTime: new Date().toISOString()
        }
    }, 'Simulation failed');
    
    updateAppStatus(`Simulation failed: ${data.error}`);
    showVisualizationState('error');
    
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = data.error;
    }
}

/**
 * Handle simulation cancelling event (cancellation in progress)
 */
function handleSimulationCancelling(data) {
    console.log('Simulation cancelling:', data);
    
    updateAppStatus('Cancelling simulation...');
    
    // Update cancel button to show cancellation in progress
    if (elements.cancelButton) {
        elements.cancelButton.disabled = true;
        elements.cancelButton.textContent = 'Cancelling...';
        elements.cancelButton.classList.add('btn-loading');
    }
    
    // Update progress text to show cancellation
    if (elements.progressTime) {
        elements.progressTime.textContent = 'Cancelling simulation...';
    }
}

/**
 * Handle simulation cancellation event from controller
 */
function handleSimulationCancelledEvent(data) {
    console.log('Simulation cancelled:', data);
    
    if (!app || !app.appState) {
        console.error('App not initialized');
        return;
    }
    
    // Hide simulation controls
    if (elements.simulationControls) {
        elements.simulationControls.style.display = 'none';
    }
    
    // Reset cancel button state
    if (elements.cancelButton) {
        elements.cancelButton.disabled = false;
        elements.cancelButton.textContent = 'Cancel';
        elements.cancelButton.classList.remove('btn-loading');
    }
    
    // Transition back to READY state
    app.appState.transition('READY', {
        simulation: {
            progress: 0,
            cancelled: true,
            endTime: new Date().toISOString()
        }
    }, 'Simulation cancelled');
    
    updateAppStatus('Simulation cancelled');
}

/**
 * Handle simulation timeout
 */
function handleSimulationTimeout(data) {
    console.warn('Simulation timeout:', data);
    
    updateAppStatus('Simulation timed out');
    
    // Show timeout message
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = 'Simulation timed out and was cancelled';
    }
    
    showVisualizationState('error');
}

/**
 * Handle simulation errors
 */
function handleSimulationError(data) {
    console.error('Simulation error:', data);
    
    updateAppStatus(`Error: ${data.message}`);
    
    // Show error message
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = data.message;
    }
    
    if (data.type === 'start_failed' || data.type === 'cancel_failed') {
        if (visualizationPanel) {
            visualizationPanel.showError(data.message);
        } else {
            showVisualizationState('error');
        }
    }
}

/**
 * Handle visualization initialization
 */
function handleVisualizationInitialized(data) {
    console.log('Visualization initialized:', data);
    updateAppStatus('3D visualization ready');
    
    // Enable reset camera button
    const resetCameraButton = document.getElementById('reset-camera');
    if (resetCameraButton) {
        resetCameraButton.disabled = false;
    }
}

/**
 * Handle visualization data loaded
 * Connect visualization loading to animation initialization
 */
function handleVisualizationLoaded(data) {
    console.log('[Main] Visualization data loaded, initializing animation:', data);
    updateAppStatus('Visualization loaded - initializing animation...');
    
    // Update time slider range
    if (elements.timeSlider && data.timeSteps) {
        elements.timeSlider.max = data.timeSteps - 1;
        elements.timeSlider.value = 0;
    }
    
    // Update temperature legend
    if (data.temperatureRange) {
        const legendMin = document.getElementById('legend-min');
        const legendMax = document.getElementById('legend-max');
        
        if (legendMin) {
            legendMin.textContent = Math.round(data.temperatureRange.min);
        }
        
        if (legendMax) {
            legendMax.textContent = Math.round(data.temperatureRange.max);
        }
    }
    
    // Initialize animation if we have multiple time steps
    if (data.animationReady && data.timeSteps > 1) {
        const animationController = app.getComponent('animation');
        if (animationController) {
            console.log('[Main] Initializing animation controller with visualization data');
            
            const animationData = {
                timeSteps: Array.from({ length: data.timeSteps }, (_, i) => ({
                    time: i * (data.duration / Math.max(1, data.timeSteps - 1)),
                    step: i
                })),
                duration: data.duration
            };
            
            const initialized = animationController.initialize(animationData);
            if (initialized) {
                console.log('[Main] Animation controller initialized successfully');
                updateAppStatus('Animation ready');
                
                // Auto-play animation after loading
                console.log('[Main] Auto-starting animation playback...');
                setTimeout(() => {
                    animationController.play();
                    console.log('[Main] Animation auto-play started');
                }, 100); // Small delay to ensure UI is ready
            } else {
                console.error('[Main] Failed to initialize animation controller');
                updateAppStatus('Visualization loaded (animation unavailable)');
            }
        } else {
            console.warn('[Main] Animation controller not available');
            updateAppStatus('Visualization loaded (animation unavailable)');
        }
    } else {
        console.log('[Main] Animation not needed (single time step)');
        updateAppStatus('Visualization loaded');
    }
}

/**
 * Handle visualization errors
 */
function handleVisualizationError(data) {
    console.error('Visualization error:', data);
    
    let errorMessage = data.message;
    if (data.type === 'initialization') {
        errorMessage = 'Failed to initialize 3D rendering. Please check WebGL support.';
    } else if (data.type === 'rendering') {
        errorMessage = 'Rendering error occurred. Try reducing mesh resolution.';
    }
    
    updateAppStatus(`Visualization error: ${errorMessage}`);
    
    if (visualizationPanel) {
        visualizationPanel.showError(errorMessage);
    }
}

/**
 * Handle visualization time step changes
 */
function handleVisualizationTimeStepChanged(data) {
    console.log('Visualization time step changed:', data);
    
    // Update time slider position
    if (elements.timeSlider) {
        elements.timeSlider.value = data.timeStep;
    }
    
    // Update current time display
    if (elements.currentTimeDisplay && app.appState) {
        const state = app.appState.getState();
        const duration = parseFloat(state.parameters['simulation-duration']) || 60;
        const currentTime = (data.timeStep / Math.max(1, data.totalTimeSteps - 1)) * duration;
        elements.currentTimeDisplay.textContent = currentTime.toFixed(1) + 's';
    }
}

/**
 * Get comprehensive debug information about all components
 */
function getDebugInfo() {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        browser: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled
        },
        window: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            location: window.location.href
        },
        app: app ? {
            initialized: app.isInitialized,
            componentCount: app.components.size,
            components: Array.from(app.components.keys()),
            status: app.getStatus()
        } : null,
        parameterPanel: parameterPanel ? {
            isValid: parameterPanel.isValid,
            isDirty: parameterPanel.isDirty,
            fieldsCount: parameterPanel.fields.size,
            parameters: parameterPanel.getParameters()
        } : null,
        simulationController: simulationController ? simulationController.getDebugInfo() : null,
        visualizationPanel: visualizationPanel ? visualizationPanel.getStatus() : null,
        elements: {
            found: Object.keys(elements).filter(key => elements[key]).length,
            total: Object.keys(elements).length,
            missing: Object.keys(elements).filter(key => !elements[key])
        },
        tauri: {
            available: !!window.__TAURI__,
            version: window.__TAURI__ ? 'Available' : 'Not Available'
        },
        threeJS: {
            available: typeof THREE !== 'undefined',
            version: typeof THREE !== 'undefined' ? THREE.REVISION : 'Not Available'
        }
    };
    
    return debugInfo;
}

/**
 * Log comprehensive debug information
 */
function logDebugInfo() {
    const debugInfo = getDebugInfo();
    console.log('🔍 [DEBUG] Comprehensive System Status:');
    console.log('📊 [DEBUG] Browser Info:', debugInfo.browser);
    console.log('🖥️ [DEBUG] Window Info:', debugInfo.window);
    console.log('🚀 [DEBUG] App Status:', debugInfo.app);
    console.log('📝 [DEBUG] Parameter Panel:', debugInfo.parameterPanel);
    console.log('⚙️ [DEBUG] Simulation Controller:', debugInfo.simulationController);
    console.log('🎨 [DEBUG] Visualization Panel:', debugInfo.visualizationPanel);
    console.log('🎯 [DEBUG] DOM Elements:', debugInfo.elements);
    console.log('🔌 [DEBUG] Tauri Status:', debugInfo.tauri);
    console.log('📚 [DEBUG] Three.js Status:', debugInfo.threeJS);
    
    // Also send to Rust terminal if Tauri is available
    if (window.__TAURI__) {
        logToRustTerminal('info', 'DEBUG', 'Frontend debug info logged to browser console');
    }
    
    return debugInfo;
}

/**
 * Send a log message to the Rust terminal
 */
async function logToRustTerminal(level, component, message) {
    if (window.__TAURI__) {
        try {
            await window.__TAURI__.core.invoke('log_frontend_message', {
                level: level,
                component: component,
                message: message
            });
        } catch (error) {
            console.error('Failed to send log to Rust terminal:', error);
        }
    }
}

// Export for potential use by other modules
window.PlasmaSimulator = {
    app,
    parameterPanel,
    simulationController,
    visualizationPanel,
    elements,
    showVisualizationState,
    getDebugInfo,
    logDebugInfo,
    logToRustTerminal
};/**
 * H
andle animation initialization
 */
function handleAnimationInitialized(data) {
    console.log('Animation initialized:', data);
    updateAppStatus('Animation ready');
    
    // Update total time display
    if (elements.totalTimeDisplay) {
        elements.totalTimeDisplay.textContent = `${data.totalTime.toFixed(1)}s`;
    }
}

/**
 * Handle animation play
 */
function handleAnimationPlay(data) {
    console.log('Animation playing:', data);
    updateAppStatus('Animation playing');
}

/**
 * Handle animation pause
 */
function handleAnimationPause(data) {
    console.log('Animation paused:', data);
    updateAppStatus('Animation paused');
}

/**
 * Handle animation time change
 */
function handleAnimationTimeChanged(data) {
    // Update current time display
    if (elements.currentTimeDisplay) {
        elements.currentTimeDisplay.textContent = `${data.time.toFixed(1)}s`;
    }
    
    // Update time slider position
    if (elements.timeSlider) {
        const progress = data.progress * 100;
        elements.timeSlider.value = progress;
    }
}

/**
 * Handle animation speed change
 */
function handleAnimationSpeedChanged(data) {
    console.log('Animation speed changed:', data);
    
    // Update speed select
    if (elements.animationSpeedSelect) {
        elements.animationSpeedSelect.value = data.speed;
    }
}

/**
 * Handle animation ended
 */
function handleAnimationEnded(data) {
    console.log('Animation ended:', data);
    updateAppStatus('Animation completed');
}

/**
 * Handle animation errors
 */
function handleAnimationError(data) {
    console.error('Animation error:', data);
    updateAppStatus(`Animation error: ${data.message}`);
}

/**
 * Handle animation frame loading
 * Task 15: Connect visualization panel to animation controller frame loading events
 */
function handleAnimationFrameLoading(data) {
    console.log('[Main] Animation frame loading:', data.timeStep);
    
    // Show loading indicator in visualization if needed
    if (visualizationPanel && visualizationPanel.showTimeStepLoading) {
        visualizationPanel.showTimeStepLoading(data.timeStep);
    }
}

/**
 * Handle animation frame loaded
 * Task 15: Connect visualization panel to animation controller frame loaded events
 */
function handleAnimationFrameLoaded(data) {
    console.log('[Main] Animation frame loaded:', data.timeStep);
    
    // Hide loading indicator in visualization
    if (visualizationPanel && visualizationPanel.hideTimeStepLoading) {
        visualizationPanel.hideTimeStepLoading();
    }
    
    // Update visualization to the loaded frame
    if (visualizationPanel && data.data) {
        // The visualization will be updated via animation:timeChanged event
        // This handler is just for loading state management
        console.log('[Main] Frame data available for time step:', data.timeStep);
    }
}