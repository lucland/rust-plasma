/**
 * LoadingManager - Comprehensive loading states and progress indicators
 * 
 * Manages loading spinners, progress bars, and visual feedback for all user actions
 * with estimated completion times and smooth transitions.
 */
class LoadingManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeLoaders = new Map();
        this.progressTrackers = new Map();
        this.loadingStates = new Map();
        
        // Loading state definitions
        this.loadingTypes = {
            simulation: {
                title: 'Running Simulation',
                description: 'Computing thermal dynamics...',
                showProgress: true,
                showTime: true,
                cancellable: true
            },
            visualization: {
                title: 'Loading Visualization',
                description: 'Preparing 3D heatmap...',
                showProgress: false,
                showTime: false,
                cancellable: false
            },
            parameters: {
                title: 'Validating Parameters',
                description: 'Checking parameter values...',
                showProgress: false,
                showTime: false,
                cancellable: false
            },
            initialization: {
                title: 'Initializing Application',
                description: 'Loading components...',
                showProgress: true,
                showTime: false,
                cancellable: false
            },
            export: {
                title: 'Exporting Results',
                description: 'Preparing data export...',
                showProgress: true,
                showTime: true,
                cancellable: true
            }
        };

        // Bind methods
        this.showLoading = this.showLoading.bind(this);
        this.hideLoading = this.hideLoading.bind(this);
        this.updateProgress = this.updateProgress.bind(this);
        this.setEstimatedTime = this.setEstimatedTime.bind(this);

        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize DOM elements
        this.initializeDOMElements();
    }

    /**
     * Set up event listeners for automatic loading state management
     * @private
     */
    setupEventListeners() {
        // Simulation events
        this.eventBus.on('simulation:started', () => {
            this.showLoading('simulation', {
                title: 'Running Simulation',
                description: 'Computing thermal dynamics and heat transfer...'
            });
        });

        this.eventBus.on('simulation:progress', (data) => {
            this.updateProgress('simulation', data.progress, data.estimatedTime);
        });

        this.eventBus.on('simulation:completed', () => {
            this.hideLoading('simulation');
        });

        this.eventBus.on('simulation:cancelled', () => {
            this.hideLoading('simulation');
        });

        this.eventBus.on('simulation:error', () => {
            this.hideLoading('simulation');
        });

        // Visualization events
        this.eventBus.on('visualization:loading', () => {
            this.showLoading('visualization', {
                title: 'Loading 3D Visualization',
                description: 'Preparing temperature heatmap...'
            });
        });

        this.eventBus.on('visualization:loaded', () => {
            this.hideLoading('visualization');
        });

        this.eventBus.on('visualization:error', () => {
            this.hideLoading('visualization');
        });

        // Parameter validation events
        this.eventBus.on('parameters:validating', () => {
            this.showLoading('parameters', {
                title: 'Validating Parameters',
                description: 'Checking parameter values...',
                duration: 500 // Short validation
            });
        });

        this.eventBus.on('parameters:validated', () => {
            this.hideLoading('parameters');
        });

        // Application initialization
        this.eventBus.on('app:initializing', (data) => {
            this.showLoading('initialization', {
                title: 'Initializing Application',
                description: `Loading ${data.component || 'components'}...`
            });
        });

        this.eventBus.on('app:initialized', () => {
            this.hideLoading('initialization');
        });
    }

    /**
     * Initialize DOM elements for loading indicators
     * @private
     */
    initializeDOMElements() {
        // Create global loading overlay if it doesn't exist
        if (!document.getElementById('global-loading-overlay')) {
            this.createGlobalLoadingOverlay();
        }

        // Create inline loading indicators
        this.createInlineLoadingIndicators();

        // Create progress bars
        this.createProgressBars();
    }

    /**
     * Create global loading overlay
     * @private
     */
    createGlobalLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.style.display = 'none';
        
        overlay.innerHTML = `
            <div class="loading-modal">
                <div class="loading-header">
                    <h3 class="loading-title" id="global-loading-title">Loading...</h3>
                    <button class="loading-cancel" id="global-loading-cancel" style="display: none;">
                        <span>✕</span>
                    </button>
                </div>
                <div class="loading-body">
                    <div class="loading-spinner-large" id="global-loading-spinner"></div>
                    <p class="loading-description" id="global-loading-description">Please wait...</p>
                    <div class="loading-progress" id="global-loading-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="global-progress-fill"></div>
                        </div>
                        <div class="progress-info">
                            <span class="progress-percentage" id="global-progress-percentage">0%</span>
                            <span class="progress-time" id="global-progress-time"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Set up cancel button
        const cancelButton = overlay.querySelector('#global-loading-cancel');
        cancelButton.addEventListener('click', () => {
            this.cancelCurrentOperation();
        });
    }

    /**
     * Create inline loading indicators for specific components
     * @private
     */
    createInlineLoadingIndicators() {
        // Add loading states to parameter panel
        const parameterPanel = document.getElementById('parameters-panel');
        if (parameterPanel && !parameterPanel.querySelector('.inline-loading')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'inline-loading';
            loadingDiv.id = 'parameters-loading';
            loadingDiv.style.display = 'none';
            loadingDiv.innerHTML = `
                <div class="inline-loading-content">
                    <div class="loading-spinner-small"></div>
                    <span class="loading-text">Validating parameters...</span>
                </div>
            `;
            parameterPanel.appendChild(loadingDiv);
        }

        // Add loading states to visualization panel (already exists in HTML)
        const visualizationLoading = document.getElementById('visualization-loading');
        if (visualizationLoading) {
            // Enhance existing loading state
            const loadingContent = visualizationLoading.querySelector('.loading-content');
            if (loadingContent && !loadingContent.querySelector('.loading-progress')) {
                const progressDiv = document.createElement('div');
                progressDiv.className = 'loading-progress';
                progressDiv.id = 'visualization-progress';
                progressDiv.style.display = 'none';
                progressDiv.innerHTML = `
                    <div class="progress-bar-small">
                        <div class="progress-fill" id="visualization-progress-fill"></div>
                    </div>
                    <div class="progress-text">
                        <span id="visualization-progress-percentage">0%</span>
                    </div>
                `;
                loadingContent.appendChild(progressDiv);
            }
        }
    }

    /**
     * Create progress bars for simulation controls
     * @private
     */
    createProgressBars() {
        // Enhance existing simulation progress bar
        const simulationControls = document.getElementById('simulation-controls');
        if (simulationControls) {
            const progressSection = simulationControls.querySelector('.progress-section');
            if (progressSection && !progressSection.querySelector('.progress-details')) {
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'progress-details';
                detailsDiv.id = 'simulation-progress-details';
                detailsDiv.innerHTML = `
                    <div class="progress-stats">
                        <span class="progress-step" id="progress-step">Step 0 of 0</span>
                        <span class="progress-rate" id="progress-rate">0 steps/sec</span>
                    </div>
                    <div class="progress-eta">
                        <span class="eta-label">ETA:</span>
                        <span class="eta-time" id="eta-time">--:--</span>
                    </div>
                `;
                progressSection.appendChild(detailsDiv);
            }
        }
    }

    /**
     * Show loading state for a specific type
     * @param {string} type - Loading type (simulation, visualization, etc.)
     * @param {Object} options - Loading options
     */
    showLoading(type, options = {}) {
        const config = { ...this.loadingTypes[type], ...options };
        
        // Store loading state
        this.loadingStates.set(type, {
            ...config,
            startTime: Date.now(),
            visible: true
        });

        // Show appropriate loading UI
        if (config.global || type === 'initialization') {
            this.showGlobalLoading(type, config);
        } else {
            this.showInlineLoading(type, config);
        }

        // Emit loading event
        this.eventBus.emit('loading:started', { type, config });

        // Auto-hide after duration if specified
        if (config.duration) {
            setTimeout(() => {
                this.hideLoading(type);
            }, config.duration);
        }
    }

    /**
     * Show global loading overlay
     * @private
     */
    showGlobalLoading(type, config) {
        const overlay = document.getElementById('global-loading-overlay');
        const title = document.getElementById('global-loading-title');
        const description = document.getElementById('global-loading-description');
        const progress = document.getElementById('global-loading-progress');
        const cancelButton = document.getElementById('global-loading-cancel');

        if (overlay && title && description) {
            title.textContent = config.title || 'Loading...';
            description.textContent = config.description || 'Please wait...';
            
            // Show/hide progress bar
            if (progress) {
                progress.style.display = config.showProgress ? 'block' : 'none';
            }
            
            // Show/hide cancel button
            if (cancelButton) {
                cancelButton.style.display = config.cancellable ? 'block' : 'none';
            }

            overlay.style.display = 'flex';
            
            // Add fade-in animation
            overlay.classList.add('loading-fade-in');
        }
    }

    /**
     * Show inline loading for specific components
     * @private
     */
    showInlineLoading(type, config) {
        switch (type) {
            case 'simulation':
                this.showSimulationLoading(config);
                break;
            case 'visualization':
                this.showVisualizationLoading(config);
                break;
            case 'parameters':
                this.showParametersLoading(config);
                break;
        }
    }

    /**
     * Show simulation loading state
     * @private
     */
    showSimulationLoading(config) {
        const simulationControls = document.getElementById('simulation-controls');
        const runButton = document.getElementById('run-simulation');
        
        if (simulationControls) {
            simulationControls.style.display = 'block';
            
            // Update progress text
            const progressText = simulationControls.querySelector('#progress-percentage');
            if (progressText) {
                progressText.textContent = '0%';
            }
            
            const progressTime = simulationControls.querySelector('#progress-time');
            if (progressTime) {
                progressTime.textContent = 'Starting...';
            }
        }
        
        // Disable run button
        if (runButton) {
            runButton.disabled = true;
            runButton.textContent = 'Running...';
        }
    }

    /**
     * Show visualization loading state
     * @private
     */
    showVisualizationLoading(config) {
        const visualizationLoading = document.getElementById('visualization-loading');
        const visualizationPlaceholder = document.getElementById('visualization-placeholder');
        
        if (visualizationLoading) {
            visualizationLoading.style.display = 'flex';
            
            // Update loading text
            const loadingText = visualizationLoading.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = config.description || 'Loading visualization...';
            }
        }
        
        if (visualizationPlaceholder) {
            visualizationPlaceholder.style.display = 'none';
        }
    }

    /**
     * Show parameters loading state
     * @private
     */
    showParametersLoading(config) {
        const parametersLoading = document.getElementById('parameters-loading');
        
        if (parametersLoading) {
            parametersLoading.style.display = 'block';
            
            // Update loading text
            const loadingText = parametersLoading.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = config.description || 'Validating parameters...';
            }
        }
    }

    /**
     * Hide loading state for a specific type
     * @param {string} type - Loading type
     */
    hideLoading(type) {
        const loadingState = this.loadingStates.get(type);
        if (!loadingState || !loadingState.visible) {
            return;
        }

        // Update loading state
        this.loadingStates.set(type, { ...loadingState, visible: false });

        // Hide appropriate loading UI
        if (loadingState.global || type === 'initialization') {
            this.hideGlobalLoading();
        } else {
            this.hideInlineLoading(type);
        }

        // Clean up progress tracker
        this.progressTrackers.delete(type);

        // Emit loading complete event
        this.eventBus.emit('loading:completed', { 
            type, 
            duration: Date.now() - loadingState.startTime 
        });
    }

    /**
     * Hide global loading overlay
     * @private
     */
    hideGlobalLoading() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.add('loading-fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('loading-fade-in', 'loading-fade-out');
            }, 300);
        }
    }

    /**
     * Hide inline loading for specific components
     * @private
     */
    hideInlineLoading(type) {
        switch (type) {
            case 'simulation':
                this.hideSimulationLoading();
                break;
            case 'visualization':
                this.hideVisualizationLoading();
                break;
            case 'parameters':
                this.hideParametersLoading();
                break;
        }
    }

    /**
     * Hide simulation loading state
     * @private
     */
    hideSimulationLoading() {
        const simulationControls = document.getElementById('simulation-controls');
        const runButton = document.getElementById('run-simulation');
        
        if (simulationControls) {
            simulationControls.style.display = 'none';
        }
        
        // Re-enable run button
        if (runButton) {
            runButton.disabled = false;
            runButton.textContent = 'Run Simulation';
        }
    }

    /**
     * Hide visualization loading state
     * @private
     */
    hideVisualizationLoading() {
        const visualizationLoading = document.getElementById('visualization-loading');
        
        if (visualizationLoading) {
            visualizationLoading.style.display = 'none';
        }
    }

    /**
     * Hide parameters loading state
     * @private
     */
    hideParametersLoading() {
        const parametersLoading = document.getElementById('parameters-loading');
        
        if (parametersLoading) {
            parametersLoading.style.display = 'none';
        }
    }

    /**
     * Update progress for a specific loading type
     * @param {string} type - Loading type
     * @param {number} progress - Progress percentage (0-100)
     * @param {number} [estimatedTime] - Estimated completion time in seconds
     */
    updateProgress(type, progress, estimatedTime = null) {
        const loadingState = this.loadingStates.get(type);
        if (!loadingState || !loadingState.visible) {
            return;
        }

        // Update progress tracker
        const tracker = this.progressTrackers.get(type) || {};
        tracker.progress = Math.max(0, Math.min(100, progress));
        tracker.estimatedTime = estimatedTime;
        tracker.lastUpdate = Date.now();
        this.progressTrackers.set(type, tracker);

        // Update UI elements
        this.updateProgressUI(type, tracker);

        // Emit progress event
        this.eventBus.emit('loading:progress', { type, ...tracker });
    }

    /**
     * Update progress UI elements
     * @private
     */
    updateProgressUI(type, tracker) {
        const { progress, estimatedTime } = tracker;

        // Update global progress if visible
        const globalProgress = document.getElementById('global-loading-progress');
        if (globalProgress && globalProgress.style.display !== 'none') {
            const progressFill = document.getElementById('global-progress-fill');
            const progressPercentage = document.getElementById('global-progress-percentage');
            const progressTime = document.getElementById('global-progress-time');

            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            if (progressPercentage) {
                progressPercentage.textContent = `${Math.round(progress)}%`;
            }
            if (progressTime && estimatedTime) {
                progressTime.textContent = `ETA: ${this.formatTime(estimatedTime)}`;
            }
        }

        // Update type-specific progress
        if (type === 'simulation') {
            this.updateSimulationProgress(tracker);
        } else if (type === 'visualization') {
            this.updateVisualizationProgress(tracker);
        }
    }

    /**
     * Update simulation progress UI
     * @private
     */
    updateSimulationProgress(tracker) {
        const { progress, estimatedTime } = tracker;
        
        // Update main progress bar
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressTimeElement = document.getElementById('progress-time');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(progress)}%`;
        }
        if (progressTimeElement && estimatedTime) {
            progressTimeElement.textContent = `ETA: ${this.formatTime(estimatedTime)}`;
        }

        // Update detailed progress info
        const progressStep = document.getElementById('progress-step');
        const progressRate = document.getElementById('progress-rate');
        const etaTime = document.getElementById('eta-time');

        if (progressStep && tracker.currentStep && tracker.totalSteps) {
            progressStep.textContent = `Step ${tracker.currentStep} of ${tracker.totalSteps}`;
        }
        if (progressRate && tracker.stepsPerSecond) {
            progressRate.textContent = `${tracker.stepsPerSecond.toFixed(1)} steps/sec`;
        }
        if (etaTime && estimatedTime) {
            etaTime.textContent = this.formatTime(estimatedTime);
        }
    }

    /**
     * Update visualization progress UI
     * @private
     */
    updateVisualizationProgress(tracker) {
        const { progress } = tracker;
        
        const progressFill = document.getElementById('visualization-progress-fill');
        const progressPercentage = document.getElementById('visualization-progress-percentage');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(progress)}%`;
        }
    }

    /**
     * Set estimated completion time
     * @param {string} type - Loading type
     * @param {number} seconds - Estimated seconds to completion
     */
    setEstimatedTime(type, seconds) {
        const tracker = this.progressTrackers.get(type) || {};
        tracker.estimatedTime = seconds;
        this.progressTrackers.set(type, tracker);
        
        this.updateProgressUI(type, tracker);
    }

    /**
     * Cancel current operation
     * @private
     */
    cancelCurrentOperation() {
        // Find active cancellable operations
        for (const [type, state] of this.loadingStates) {
            if (state.visible && state.cancellable) {
                this.eventBus.emit(`${type}:cancel`);
                this.hideLoading(type);
            }
        }
    }

    /**
     * Format time in seconds to human-readable format
     * @private
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}h`;
        }
    }

    /**
     * Check if any loading is active
     * @returns {boolean} True if any loading is active
     */
    isLoading() {
        for (const [, state] of this.loadingStates) {
            if (state.visible) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get active loading types
     * @returns {Array} Array of active loading types
     */
    getActiveLoading() {
        const active = [];
        for (const [type, state] of this.loadingStates) {
            if (state.visible) {
                active.push(type);
            }
        }
        return active;
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            activeLoaders: Array.from(this.loadingStates.keys()),
            progressTrackers: Object.fromEntries(this.progressTrackers),
            isLoading: this.isLoading()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
} else if (typeof window !== 'undefined') {
    window.LoadingManager = LoadingManager;
}