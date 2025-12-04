/**
 * MetadataDisplay - Temporal metadata overlay for visualization
 * 
 * Displays real-time information about the current animation frame including:
 * - Current simulation time
 * - Time step index and total steps
 * - Elapsed simulation duration
 * - Temperature range with color scale legend
 * - Current frame rate (FPS) during playback
 */
class MetadataDisplay {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        
        // UI elements (will be created in render())
        this.overlayContainer = null;
        this.timeDisplay = null;
        this.stepDisplay = null;
        this.durationDisplay = null;
        this.fpsDisplay = null;
        this.temperatureLegend = null;
        this.legendMin = null;
        this.legendMax = null;
        
        // State
        this.isVisible = false;
        this.currentTime = 0;
        this.currentTimeStep = 0;
        this.totalTimeSteps = 0;
        this.simulationDuration = 0;
        this.currentFps = 0;
        this.temperatureRange = { min: 300, max: 2000 };
        
        // Bind methods
        this.render = this.render.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.updateTimeInfo = this.updateTimeInfo.bind(this);
        this.updateTemperatureRange = this.updateTemperatureRange.bind(this);
        this.updateFps = this.updateFps.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        
        // Subscribe to events
        this.setupEventListeners();
        
        console.log('[MetadataDisplay] Created');
    }

    /**
     * Set up event listeners for visualization and animation events
     */
    setupEventListeners() {
        // Listen for animation time changes
        this.eventBus.on('animation:timeChanged', (data) => {
            this.updateTimeInfo(data.time, data.timeStep, data.totalTimeSteps);
        });
        
        // Listen for visualization metadata updates
        this.eventBus.on('visualization:metadataUpdated', (data) => {
            if (data.temperatureRange) {
                this.updateTemperatureRange(data.temperatureRange.min, data.temperatureRange.max);
            }
        });
        
        // Listen for FPS updates
        this.eventBus.on('visualization:fpsUpdated', (data) => {
            this.updateFps(data.fps);
        });
        
        // Listen for visualization loaded event to get initial metadata
        this.eventBus.on('visualization:loaded', (data) => {
            if (data.duration) {
                this.simulationDuration = data.duration;
                this.updateDurationDisplay();
            }
            if (data.temperatureRange) {
                this.updateTemperatureRange(data.temperatureRange.min, data.temperatureRange.max);
            }
            if (data.timeSteps) {
                this.totalTimeSteps = data.timeSteps;
            }
        });
        
        // Listen for animation initialization
        this.eventBus.on('animation:initialized', (data) => {
            if (data.totalTime) {
                this.simulationDuration = data.totalTime;
                this.updateDurationDisplay();
            }
            if (data.totalTimeSteps) {
                this.totalTimeSteps = data.totalTimeSteps;
            }
        });
        
        // Show metadata when animation starts playing
        this.eventBus.on('animation:play', () => {
            this.show();
        });
        
        console.log('[MetadataDisplay] Event listeners set up');
    }

    /**
     * Render the metadata display overlay
     */
    render() {
        if (!this.container) {
            console.error('[MetadataDisplay] No container provided');
            return;
        }
        
        // Create overlay container
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.className = 'metadata-overlay';
        this.overlayContainer.style.display = 'none'; // Hidden by default
        
        // Create time information section
        const timeSection = this.createTimeSection();
        
        // Create temperature legend section
        const legendSection = this.createLegendSection();
        
        // Create FPS display section
        const fpsSection = this.createFpsSection();
        
        // Assemble the overlay
        this.overlayContainer.appendChild(timeSection);
        this.overlayContainer.appendChild(legendSection);
        this.overlayContainer.appendChild(fpsSection);
        
        // Add to container
        this.container.appendChild(this.overlayContainer);
        
        console.log('[MetadataDisplay] Rendered');
    }

    /**
     * Create time information section
     * @private
     */
    createTimeSection() {
        const section = document.createElement('div');
        section.className = 'metadata-time-section';
        
        // Current time display
        const timeRow = document.createElement('div');
        timeRow.className = 'metadata-row';
        
        const timeLabel = document.createElement('span');
        timeLabel.className = 'metadata-label';
        timeLabel.textContent = 'Time:';
        
        this.timeDisplay = document.createElement('span');
        this.timeDisplay.className = 'metadata-value metadata-time';
        this.timeDisplay.textContent = '0.0s';
        
        timeRow.appendChild(timeLabel);
        timeRow.appendChild(this.timeDisplay);
        
        // Time step display
        const stepRow = document.createElement('div');
        stepRow.className = 'metadata-row';
        
        const stepLabel = document.createElement('span');
        stepLabel.className = 'metadata-label';
        stepLabel.textContent = 'Step:';
        
        this.stepDisplay = document.createElement('span');
        this.stepDisplay.className = 'metadata-value';
        this.stepDisplay.textContent = '0 / 0';
        
        stepRow.appendChild(stepLabel);
        stepRow.appendChild(this.stepDisplay);
        
        // Duration display
        const durationRow = document.createElement('div');
        durationRow.className = 'metadata-row';
        
        const durationLabel = document.createElement('span');
        durationLabel.className = 'metadata-label';
        durationLabel.textContent = 'Duration:';
        
        this.durationDisplay = document.createElement('span');
        this.durationDisplay.className = 'metadata-value';
        this.durationDisplay.textContent = '0.0s';
        
        durationRow.appendChild(durationLabel);
        durationRow.appendChild(this.durationDisplay);
        
        section.appendChild(timeRow);
        section.appendChild(stepRow);
        section.appendChild(durationRow);
        
        return section;
    }

    /**
     * Create temperature legend section
     * @private
     */
    createLegendSection() {
        const section = document.createElement('div');
        section.className = 'metadata-legend-section';
        
        // Legend title
        const title = document.createElement('div');
        title.className = 'metadata-legend-title';
        title.textContent = 'Temperature (K)';
        
        // Legend gradient and labels container
        const legendContainer = document.createElement('div');
        legendContainer.className = 'metadata-legend-container';
        
        // Color gradient bar
        const gradient = document.createElement('div');
        gradient.className = 'metadata-legend-gradient';
        
        // Temperature labels
        const labels = document.createElement('div');
        labels.className = 'metadata-legend-labels';
        
        this.legendMax = document.createElement('span');
        this.legendMax.className = 'metadata-legend-max';
        this.legendMax.textContent = '2000';
        
        this.legendMin = document.createElement('span');
        this.legendMin.className = 'metadata-legend-min';
        this.legendMin.textContent = '300';
        
        labels.appendChild(this.legendMax);
        labels.appendChild(this.legendMin);
        
        legendContainer.appendChild(gradient);
        legendContainer.appendChild(labels);
        
        section.appendChild(title);
        section.appendChild(legendContainer);
        
        return section;
    }

    /**
     * Create FPS display section
     * @private
     */
    createFpsSection() {
        const section = document.createElement('div');
        section.className = 'metadata-fps-section';
        
        const fpsRow = document.createElement('div');
        fpsRow.className = 'metadata-row';
        
        const fpsLabel = document.createElement('span');
        fpsLabel.className = 'metadata-label';
        fpsLabel.textContent = 'FPS:';
        
        this.fpsDisplay = document.createElement('span');
        this.fpsDisplay.className = 'metadata-value metadata-fps';
        this.fpsDisplay.textContent = '0';
        
        fpsRow.appendChild(fpsLabel);
        fpsRow.appendChild(this.fpsDisplay);
        
        section.appendChild(fpsRow);
        
        return section;
    }

    /**
     * Update time information display
     * @param {number} currentTime - Current simulation time in seconds
     * @param {number} currentTimeStep - Current time step index
     * @param {number} totalTimeSteps - Total number of time steps
     */
    updateTimeInfo(currentTime, currentTimeStep, totalTimeSteps) {
        if (!this.timeDisplay || !this.stepDisplay) {
            return;
        }
        
        // Update state
        this.currentTime = currentTime;
        this.currentTimeStep = currentTimeStep;
        this.totalTimeSteps = totalTimeSteps;
        
        // Update time display
        this.timeDisplay.textContent = `${currentTime.toFixed(1)}s`;
        
        // Update step display (1-indexed for user display)
        this.stepDisplay.textContent = `${currentTimeStep + 1} / ${totalTimeSteps}`;
    }

    /**
     * Update duration display
     * @private
     */
    updateDurationDisplay() {
        if (!this.durationDisplay) {
            return;
        }
        
        this.durationDisplay.textContent = `${this.simulationDuration.toFixed(1)}s`;
    }

    /**
     * Update temperature range and legend
     * @param {number} min - Minimum temperature in Kelvin
     * @param {number} max - Maximum temperature in Kelvin
     */
    updateTemperatureRange(min, max) {
        if (!this.legendMin || !this.legendMax) {
            return;
        }
        
        // Update state
        this.temperatureRange.min = min;
        this.temperatureRange.max = max;
        
        // Update legend labels
        this.legendMin.textContent = Math.round(min).toString();
        this.legendMax.textContent = Math.round(max).toString();
        
        console.log('[MetadataDisplay] Temperature range updated:', { min, max });
    }

    /**
     * Update FPS display
     * @param {number} fps - Current frame rate
     */
    updateFps(fps) {
        if (!this.fpsDisplay) {
            return;
        }
        
        this.currentFps = fps;
        this.fpsDisplay.textContent = fps.toString();
        
        // Add visual indicator for low FPS
        if (fps < 20) {
            this.fpsDisplay.classList.add('metadata-fps-low');
        } else if (fps < 30) {
            this.fpsDisplay.classList.remove('metadata-fps-low');
            this.fpsDisplay.classList.add('metadata-fps-medium');
        } else {
            this.fpsDisplay.classList.remove('metadata-fps-low', 'metadata-fps-medium');
        }
    }

    /**
     * Show the metadata overlay
     */
    show() {
        if (!this.overlayContainer) {
            console.warn('[MetadataDisplay] Overlay not rendered yet');
            return;
        }
        
        this.overlayContainer.style.display = 'block';
        this.isVisible = true;
        
        console.log('[MetadataDisplay] Overlay shown');
    }

    /**
     * Hide the metadata overlay
     */
    hide() {
        if (!this.overlayContainer) {
            return;
        }
        
        this.overlayContainer.style.display = 'none';
        this.isVisible = false;
        
        console.log('[MetadataDisplay] Overlay hidden');
    }

    /**
     * Toggle metadata overlay visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if overlay is visible
     * @returns {boolean} True if visible
     */
    isOverlayVisible() {
        return this.isVisible;
    }

    /**
     * Get current metadata state
     * @returns {Object} Current metadata state
     */
    getState() {
        return {
            isVisible: this.isVisible,
            currentTime: this.currentTime,
            currentTimeStep: this.currentTimeStep,
            totalTimeSteps: this.totalTimeSteps,
            simulationDuration: this.simulationDuration,
            currentFps: this.currentFps,
            temperatureRange: { ...this.temperatureRange }
        };
    }

    /**
     * Dispose of metadata display resources
     */
    dispose() {
        console.log('[MetadataDisplay] Disposing resources...');
        
        // Remove from DOM
        if (this.overlayContainer && this.overlayContainer.parentNode) {
            this.overlayContainer.parentNode.removeChild(this.overlayContainer);
        }
        
        // Clear references
        this.overlayContainer = null;
        this.timeDisplay = null;
        this.stepDisplay = null;
        this.durationDisplay = null;
        this.fpsDisplay = null;
        this.temperatureLegend = null;
        this.legendMin = null;
        this.legendMax = null;
        
        console.log('[MetadataDisplay] Resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetadataDisplay;
} else if (typeof window !== 'undefined') {
    window.MetadataDisplay = MetadataDisplay;
}
