/**
 * AnimationUI - User interface controls for animation playback
 * 
 * Manages the animation control UI including play/pause buttons, time slider,
 * speed controls, and visual state feedback.
 */
class AnimationUI {
    constructor(container, eventBus, animationController) {
        this.container = container;
        this.eventBus = eventBus;
        this.animationController = animationController;
        
        // UI elements
        this.elements = {
            controlsContainer: null,
            playPauseButton: null,
            playPauseIcon: null,
            stepBackwardButton: null,
            stepForwardButton: null,
            timeSlider: null,
            currentTimeDisplay: null,
            totalTimeDisplay: null,
            speedSelect: null,
            resetButton: null
        };
        
        // State
        this.isInitialized = false;
        this.isUpdating = false; // Prevent feedback loops during updates
        
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.handlePlayPause = this.handlePlayPause.bind(this);
        this.handleStepBackward = this.handleStepBackward.bind(this);
        this.handleStepForward = this.handleStepForward.bind(this);
        this.handleTimeSliderChange = this.handleTimeSliderChange.bind(this);
        this.handleSpeedChange = this.handleSpeedChange.bind(this);
        this.handleReset = this.handleReset.bind(this);
        
        console.log('[AnimationUI] Created');
    }

    /**
     * Initialize the animation UI
     */
    init() {
        try {
            console.log('[AnimationUI] Initializing animation controls...');
            
            // Find UI elements
            this.findUIElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI state
            this.initializeUIState();
            
            // Set up animation controller event listeners
            this.setupAnimationEvents();
            
            this.isInitialized = true;
            console.log('[AnimationUI] Animation controls initialized successfully');
            
            return true;
            
        } catch (error) {
            console.error('[AnimationUI] Failed to initialize animation controls:', error);
            this.eventBus.emit('animationUI:error', {
                type: 'initialization',
                message: error.message,
                error: error
            });
            return false;
        }
    }

    /**
     * Find and store references to UI elements
     * @private
     */
    findUIElements() {
        this.elements.controlsContainer = this.container.querySelector('#animation-controls');
        if (!this.elements.controlsContainer) {
            throw new Error('Animation controls container not found');
        }
        
        // Playback controls
        this.elements.playPauseButton = this.container.querySelector('#play-pause');
        this.elements.playPauseIcon = this.container.querySelector('#play-pause-icon');
        this.elements.stepBackwardButton = this.container.querySelector('#step-backward');
        this.elements.stepForwardButton = this.container.querySelector('#step-forward');
        
        // Time controls
        this.elements.timeSlider = this.container.querySelector('#time-slider');
        this.elements.currentTimeDisplay = this.container.querySelector('#current-time');
        this.elements.totalTimeDisplay = this.container.querySelector('#total-time');
        
        // Speed controls
        this.elements.speedSelect = this.container.querySelector('#animation-speed');
        
        // Additional controls (if present)
        this.elements.resetButton = this.container.querySelector('#reset-animation');
        
        // Validate required elements
        const requiredElements = [
            'playPauseButton', 'playPauseIcon', 'stepBackwardButton', 
            'stepForwardButton', 'timeSlider', 'currentTimeDisplay', 
            'totalTimeDisplay', 'speedSelect'
        ];
        
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                throw new Error(`Required UI element not found: ${elementName}`);
            }
        }
        
        console.log('[AnimationUI] UI elements found and validated');
    }

    /**
     * Set up event listeners for UI interactions
     * @private
     */
    setupEventListeners() {
        // Play/pause button
        this.elements.playPauseButton.addEventListener('click', this.handlePlayPause);
        
        // Step controls
        this.elements.stepBackwardButton.addEventListener('click', this.handleStepBackward);
        this.elements.stepForwardButton.addEventListener('click', this.handleStepForward);
        
        // Time slider
        this.elements.timeSlider.addEventListener('input', this.handleTimeSliderChange);
        this.elements.timeSlider.addEventListener('change', this.handleTimeSliderChange);
        
        // Speed control
        this.elements.speedSelect.addEventListener('change', this.handleSpeedChange);
        
        // Reset button (if present)
        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', this.handleReset);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        console.log('[AnimationUI] Event listeners set up');
    }

    /**
     * Initialize UI state
     * @private
     */
    initializeUIState() {
        // Set initial disabled state
        this.setControlsEnabled(false);
        
        // Set initial values
        this.elements.timeSlider.value = 0;
        this.elements.currentTimeDisplay.textContent = '0.0s';
        this.elements.totalTimeDisplay.textContent = '--';
        this.elements.playPauseIcon.textContent = '▶';
        
        // Initialize speed select with available options
        this.initializeSpeedSelect();
        
        console.log('[AnimationUI] UI state initialized');
    }

    /**
     * Initialize speed select options
     * @private
     */
    initializeSpeedSelect() {
        const availableSpeeds = this.animationController.getAvailableSpeeds();
        
        // Clear existing options
        this.elements.speedSelect.innerHTML = '';
        
        // Add speed options
        availableSpeeds.forEach(speed => {
            const option = document.createElement('option');
            option.value = speed;
            option.textContent = `${speed}x`;
            
            // Select default speed (1x)
            if (speed === 1.0) {
                option.selected = true;
            }
            
            this.elements.speedSelect.appendChild(option);
        });
        
        console.log('[AnimationUI] Speed select initialized with options:', availableSpeeds);
    }

    /**
     * Set up animation controller event listeners
     * @private
     */
    setupAnimationEvents() {
        // Animation state changes
        this.eventBus.on('animation:play', this.handleAnimationPlay.bind(this));
        this.eventBus.on('animation:pause', this.handleAnimationPause.bind(this));
        this.eventBus.on('animation:timeChanged', this.handleAnimationTimeChanged.bind(this));
        this.eventBus.on('animation:speedChanged', this.handleAnimationSpeedChanged.bind(this));
        this.eventBus.on('animation:reset', this.handleAnimationReset.bind(this));
        this.eventBus.on('animation:ended', this.handleAnimationEnded.bind(this));
        this.eventBus.on('animation:initialized', this.handleAnimationInitialized.bind(this));
        
        console.log('[AnimationUI] Animation event listeners set up');
    }

    /**
     * Handle play/pause button click
     * @private
     */
    handlePlayPause() {
        if (!this.animationController.canPlay()) {
            console.log('[AnimationUI] Cannot play animation');
            return;
        }
        
        this.animationController.toggle();
    }

    /**
     * Handle step backward button click
     * @private
     */
    handleStepBackward() {
        this.animationController.stepBackward();
    }

    /**
     * Handle step forward button click
     * @private
     */
    handleStepForward() {
        this.animationController.stepForward();
    }

    /**
     * Handle time slider change
     * @private
     */
    handleTimeSliderChange(event) {
        if (this.isUpdating) return; // Prevent feedback loops
        
        const sliderValue = parseFloat(event.target.value);
        const animationState = this.animationController.getState();
        
        // Convert slider value (0-100) to time step
        const targetTimeStep = Math.round((sliderValue / 100) * (animationState.totalTimeSteps - 1));
        
        this.animationController.setTimeStep(targetTimeStep);
    }

    /**
     * Handle speed select change
     * @private
     */
    handleSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        this.animationController.setSpeed(speed);
    }

    /**
     * Handle reset button click
     * @private
     */
    handleReset() {
        this.animationController.reset();
    }

    /**
     * Handle keyboard shortcuts
     * @private
     */
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts when animation controls are visible and enabled
        if (!this.isInitialized || !this.isControlsVisible()) {
            return;
        }
        
        // Prevent shortcuts when user is typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.handlePlayPause();
                break;
                
            case 'ArrowLeft':
                event.preventDefault();
                this.handleStepBackward();
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                this.handleStepForward();
                break;
                
            case 'Home':
                event.preventDefault();
                this.animationController.reset();
                break;
                
            case 'End':
                event.preventDefault();
                const state = this.animationController.getState();
                this.animationController.setTimeStep(state.totalTimeSteps - 1);
                break;
        }
    }

    /**
     * Handle animation play event
     * @private
     */
    handleAnimationPlay(data) {
        this.isUpdating = true;
        
        this.elements.playPauseIcon.textContent = '⏸';
        this.elements.playPauseButton.title = 'Pause animation (Space)';
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for play state');
    }

    /**
     * Handle animation pause event
     * @private
     */
    handleAnimationPause(data) {
        this.isUpdating = true;
        
        this.elements.playPauseIcon.textContent = '▶';
        this.elements.playPauseButton.title = 'Play animation (Space)';
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for pause state');
    }

    /**
     * Handle animation time change event
     * @private
     */
    handleAnimationTimeChanged(data) {
        this.isUpdating = true;
        
        // Update time slider
        const progress = data.progress * 100;
        this.elements.timeSlider.value = progress;
        
        // Update time displays
        this.elements.currentTimeDisplay.textContent = `${data.time.toFixed(1)}s`;
        
        // Update step controls state
        this.updateStepControlsState(data);
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for time change:', {
            timeStep: data.timeStep,
            time: data.time,
            progress: data.progress
        });
    }

    /**
     * Handle animation speed change event
     * @private
     */
    handleAnimationSpeedChanged(data) {
        this.isUpdating = true;
        
        this.elements.speedSelect.value = data.speed;
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for speed change:', data.speed);
    }

    /**
     * Handle animation reset event
     * @private
     */
    handleAnimationReset(data) {
        this.isUpdating = true;
        
        // Reset UI to initial state
        this.elements.timeSlider.value = 0;
        this.elements.currentTimeDisplay.textContent = '0.0s';
        this.elements.playPauseIcon.textContent = '▶';
        this.elements.playPauseButton.title = 'Play animation (Space)';
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for reset');
    }

    /**
     * Handle animation ended event
     * @private
     */
    handleAnimationEnded(data) {
        console.log('[AnimationUI] Animation ended, auto-paused');
        
        // UI will be updated by the pause event that follows
    }

    /**
     * Handle animation initialized event
     * @private
     */
    handleAnimationInitialized(data) {
        this.isUpdating = true;
        
        // Update total time display
        this.elements.totalTimeDisplay.textContent = `${data.totalTime.toFixed(1)}s`;
        
        // Update time slider max value and enable it
        this.elements.timeSlider.max = 100;
        this.elements.timeSlider.disabled = false;
        
        // Enable controls
        this.setControlsEnabled(true);
        
        // Show animation controls
        this.showControls();
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated for animation initialization:', data);
    }

    /**
     * Update step controls state based on current position
     * @private
     */
    updateStepControlsState(data) {
        const isAtBeginning = data.timeStep === 0;
        const isAtEnd = data.timeStep >= data.totalTimeSteps - 1;
        
        this.elements.stepBackwardButton.disabled = isAtBeginning;
        this.elements.stepForwardButton.disabled = isAtEnd;
        
        // Update button titles
        this.elements.stepBackwardButton.title = isAtBeginning ? 
            'At beginning' : 'Step backward (←)';
        this.elements.stepForwardButton.title = isAtEnd ? 
            'At end' : 'Step forward (→)';
    }

    /**
     * Enable or disable animation controls
     * @param {boolean} enabled - Whether controls should be enabled
     */
    setControlsEnabled(enabled) {
        this.elements.playPauseButton.disabled = !enabled;
        this.elements.stepBackwardButton.disabled = !enabled;
        this.elements.stepForwardButton.disabled = !enabled;
        this.elements.timeSlider.disabled = !enabled;
        this.elements.speedSelect.disabled = !enabled;
        
        if (this.elements.resetButton) {
            this.elements.resetButton.disabled = !enabled;
        }
        
        console.log('[AnimationUI] Controls enabled:', enabled);
    }

    /**
     * Show animation controls
     */
    showControls() {
        if (this.elements.controlsContainer) {
            this.elements.controlsContainer.style.display = 'block';
            console.log('[AnimationUI] Animation controls shown');
        }
    }

    /**
     * Hide animation controls
     */
    hideControls() {
        if (this.elements.controlsContainer) {
            this.elements.controlsContainer.style.display = 'none';
            console.log('[AnimationUI] Animation controls hidden');
        }
    }

    /**
     * Check if controls are currently visible
     * @returns {boolean} True if controls are visible
     */
    isControlsVisible() {
        return this.elements.controlsContainer && 
               this.elements.controlsContainer.style.display !== 'none';
    }

    /**
     * Update UI with current animation state
     */
    updateUI() {
        if (!this.isInitialized) return;
        
        const state = this.animationController.getState();
        
        this.isUpdating = true;
        
        // Update play/pause button
        this.elements.playPauseIcon.textContent = state.isPlaying ? '⏸' : '▶';
        this.elements.playPauseButton.title = state.isPlaying ? 
            'Pause animation (Space)' : 'Play animation (Space)';
        
        // Update time slider and displays
        const progress = state.progress * 100;
        this.elements.timeSlider.value = progress;
        this.elements.currentTimeDisplay.textContent = `${state.currentTime.toFixed(1)}s`;
        this.elements.totalTimeDisplay.textContent = `${state.totalTime.toFixed(1)}s`;
        
        // Update speed select
        this.elements.speedSelect.value = state.animationSpeed;
        
        // Update step controls
        this.updateStepControlsState({
            timeStep: state.currentTimeStep,
            totalTimeSteps: state.totalTimeSteps
        });
        
        // Enable/disable controls based on availability
        this.setControlsEnabled(state.canPlay || state.canStep);
        
        this.isUpdating = false;
        
        console.log('[AnimationUI] UI updated with current state');
    }

    /**
     * Get current UI state
     * @returns {Object} Current UI state
     */
    getState() {
        return {
            initialized: this.isInitialized,
            visible: this.isControlsVisible(),
            enabled: !this.elements.playPauseButton.disabled,
            updating: this.isUpdating
        };
    }

    /**
     * Dispose of UI resources
     */
    dispose() {
        console.log('[AnimationUI] Disposing UI resources...');
        
        // Remove event listeners
        if (this.elements.playPauseButton) {
            this.elements.playPauseButton.removeEventListener('click', this.handlePlayPause);
        }
        if (this.elements.stepBackwardButton) {
            this.elements.stepBackwardButton.removeEventListener('click', this.handleStepBackward);
        }
        if (this.elements.stepForwardButton) {
            this.elements.stepForwardButton.removeEventListener('click', this.handleStepForward);
        }
        if (this.elements.timeSlider) {
            this.elements.timeSlider.removeEventListener('input', this.handleTimeSliderChange);
            this.elements.timeSlider.removeEventListener('change', this.handleTimeSliderChange);
        }
        if (this.elements.speedSelect) {
            this.elements.speedSelect.removeEventListener('change', this.handleSpeedChange);
        }
        if (this.elements.resetButton) {
            this.elements.resetButton.removeEventListener('click', this.handleReset);
        }
        
        document.removeEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Clear element references
        this.elements = {};
        this.isInitialized = false;
        
        console.log('[AnimationUI] UI resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationUI;
} else if (typeof window !== 'undefined') {
    window.AnimationUI = AnimationUI;
}