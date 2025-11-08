/**
 * playback.js
 * Responsibility: Handle simulation playback controls and animation
 * 
 * Main functions:
 * - Control playback (play, pause, step, seek)
 * - Manage animation timing and interpolation
 * - Update visualization during playback
 * - Handle playback UI state
 */

const PlaybackController = (function() {
    // Playback state
    let isPlaying = false;
    let currentStep = 0;
    let totalSteps = 0;
    let playbackSpeed = 1.0;
    let animationId = null;
    let lastFrameTime = 0;
    let simulationId = null;
    let timeStepData = [];
    let playbackInfo = null;
    
    // UI elements
    let playPauseBtn, stepBackwardBtn, stepForwardBtn, resetPlaybackBtn;
    let timeSlider, currentTimeSpan, totalTimeSpan;
    let playbackSpeedSelect, currentStepSpan, totalStepsSpan, tempRangeSpan;
    let playbackControls, playPauseIcon, smoothInterpolationCheckbox;
    
    // Animation settings
    const FRAME_RATE = 30; // Target FPS
    const FRAME_INTERVAL = 1000 / FRAME_RATE;
    
    /**
     * Initialize playback controller
     */
    const init = () => {
        console.log("PlaybackController.init() called");
        
        // Get UI elements
        playbackControls = document.getElementById('playback-controls');
        playPauseBtn = document.getElementById('play-pause-btn');
        playPauseIcon = document.getElementById('play-pause-icon');
        stepBackwardBtn = document.getElementById('step-backward-btn');
        stepForwardBtn = document.getElementById('step-forward-btn');
        resetPlaybackBtn = document.getElementById('reset-playback-btn');
        timeSlider = document.getElementById('time-slider');
        currentTimeSpan = document.getElementById('current-time');
        totalTimeSpan = document.getElementById('total-time');
        playbackSpeedSelect = document.getElementById('playback-speed');
        currentStepSpan = document.getElementById('current-step');
        totalStepsSpan = document.getElementById('total-steps');
        tempRangeSpan = document.getElementById('temp-range');
        smoothInterpolationCheckbox = document.getElementById('smooth-interpolation');
        
        console.log("Playback UI elements found:", {
            playbackControls: !!playbackControls,
            playPauseBtn: !!playPauseBtn,
            timeSlider: !!timeSlider
        });
        
        if (!playbackControls || !playPauseBtn || !timeSlider) {
            console.error("Required playback UI elements not found");
            return;
        }
        
        // Initialize event listeners
        initEventListeners();
        
        // Initialize UI state
        updateUI();
        
        console.log("PlaybackController initialized");
    };
    
    /**
     * Initialize event listeners
     */
    const initEventListeners = () => {
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlayPause);
        }
        
        if (stepBackwardBtn) {
            stepBackwardBtn.addEventListener('click', stepBackward);
        }
        
        if (stepForwardBtn) {
            stepForwardBtn.addEventListener('click', stepForward);
        }
        
        if (resetPlaybackBtn) {
            resetPlaybackBtn.addEventListener('click', resetPlayback);
        }
        
        if (timeSlider) {
            timeSlider.addEventListener('input', onTimeSliderChange);
            timeSlider.addEventListener('change', onTimeSliderChange);
        }
        
        if (playbackSpeedSelect) {
            playbackSpeedSelect.addEventListener('change', onSpeedChange);
        }
    };
    
    /**
     * Load playback data for a simulation
     * @param {string} simId - Simulation ID
     */
    const loadPlaybackData = async (simId) => {
        console.log("Loading playback data for simulation:", simId);
        
        try {
            simulationId = simId;
            
            // Get playback info
            playbackInfo = await PlasmaAPI.getPlaybackInfo(simId);
            console.log("Playback info:", playbackInfo);
            
            if (!playbackInfo) {
                console.error("No playback info received");
                return false;
            }
            
            totalSteps = playbackInfo.total_time_steps;
            
            // Pre-load all time step data for smooth playback
            timeStepData = [];
            for (let i = 0; i < totalSteps; i++) {
                const stepData = await PlasmaAPI.getTimeStepData(simId, i);
                timeStepData.push(stepData);
            }
            
            console.log("Loaded time step data:", timeStepData.length, "steps");
            
            // Initialize playback state
            currentStep = 0;
            isPlaying = false;
            
            // Update UI
            updateUI();
            showPlaybackControls();
            
            // Load initial frame
            await updateVisualization();
            
            return true;
        } catch (error) {
            console.error("Failed to load playback data:", error);
            return false;
        }
    };
    
    /**
     * Show playback controls
     */
    const showPlaybackControls = () => {
        if (playbackControls) {
            playbackControls.style.display = 'block';
        }
    };
    
    /**
     * Hide playback controls
     */
    const hidePlaybackControls = () => {
        if (playbackControls) {
            playbackControls.style.display = 'none';
        }
        stop();
    };
    
    /**
     * Toggle play/pause
     */
    const togglePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };
    
    /**
     * Start playback
     */
    const play = () => {
        if (!timeStepData.length) {
            console.warn("No time step data available for playback");
            return;
        }
        
        isPlaying = true;
        lastFrameTime = performance.now();
        animationId = requestAnimationFrame(animationLoop);
        updateUI();
        
        console.log("Playback started");
    };
    
    /**
     * Pause playback
     */
    const pause = () => {
        isPlaying = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        updateUI();
        
        console.log("Playback paused");
    };
    
    /**
     * Stop playback and reset to beginning
     */
    const stop = () => {
        pause();
        currentStep = 0;
        updateUI();
        updateVisualization();
        
        console.log("Playback stopped");
    };
    
    /**
     * Step backward one frame
     */
    const stepBackward = () => {
        if (currentStep > 0) {
            currentStep--;
            updateUI();
            updateVisualization();
        }
    };
    
    /**
     * Step forward one frame
     */
    const stepForward = () => {
        if (currentStep < totalSteps - 1) {
            currentStep++;
            updateUI();
            updateVisualization();
        }
    };
    
    /**
     * Reset playback to beginning
     */
    const resetPlayback = () => {
        pause();
        currentStep = 0;
        updateUI();
        updateVisualization();
    };
    
    /**
     * Handle time slider change
     */
    const onTimeSliderChange = (event) => {
        const sliderValue = parseInt(event.target.value);
        const newStep = Math.floor((sliderValue / 100) * (totalSteps - 1));
        
        if (newStep !== currentStep) {
            currentStep = newStep;
            updateUI();
            updateVisualization();
        }
    };
    
    /**
     * Handle playback speed change
     */
    const onSpeedChange = (event) => {
        playbackSpeed = parseFloat(event.target.value);
        console.log("Playback speed changed to:", playbackSpeed);
    };
    
    /**
     * Animation loop for smooth playback with interpolation
     */
    const animationLoop = (currentTime) => {
        if (!isPlaying) return;
        
        const deltaTime = currentTime - lastFrameTime;
        const stepDuration = FRAME_INTERVAL / playbackSpeed;
        
        if (deltaTime >= stepDuration) {
            // Advance to next step
            if (currentStep < totalSteps - 1) {
                currentStep++;
                updateUI();
                updateVisualization({ enableInterpolation: false });
                lastFrameTime = currentTime;
            } else {
                // Reached end, stop playback
                pause();
                return;
            }
        } else if (currentStep < totalSteps - 1 && smoothInterpolationCheckbox && smoothInterpolationCheckbox.checked) {
            // Smooth interpolation between steps (only if enabled)
            const interpolationFactor = deltaTime / stepDuration;
            updateVisualization({ 
                enableInterpolation: true, 
                interpolationFactor: interpolationFactor 
            });
        }
        
        animationId = requestAnimationFrame(animationLoop);
    };
    
    /**
     * Update visualization with current time step data
     * @param {Object} options - Update options for interpolation
     */
    const updateVisualization = async (options = {}) => {
        if (!timeStepData.length || currentStep >= timeStepData.length) {
            return;
        }
        
        const stepData = timeStepData[currentStep];
        
        // Prepare interpolation options for smooth transitions
        const updateOptions = { ...options };
        
        // Add interpolation data if smooth transitions are enabled
        if (options.enableInterpolation && currentStep < timeStepData.length - 1) {
            updateOptions.nextStepData = timeStepData[currentStep + 1];
        }
        
        // Update visualization if PlasmaVisualization is available
        if (typeof PlasmaVisualization !== 'undefined' && PlasmaVisualization.updateTimeStep) {
            PlasmaVisualization.updateTimeStep(stepData, updateOptions);
        } else {
            console.warn("PlasmaVisualization.updateTimeStep not available");
        }
    };
    
    /**
     * Update UI elements with current state
     */
    const updateUI = () => {
        // Update play/pause button
        if (playPauseIcon) {
            playPauseIcon.textContent = isPlaying ? '⏸️' : '▶️';
        }
        
        // Update time slider
        if (timeSlider && totalSteps > 0) {
            const sliderValue = (currentStep / (totalSteps - 1)) * 100;
            timeSlider.value = sliderValue;
        }
        
        // Update time display
        if (currentTimeSpan && playbackInfo) {
            const currentTime = timeStepData[currentStep]?.time || 0;
            currentTimeSpan.textContent = `${currentTime.toFixed(1)}s`;
        }
        
        if (totalTimeSpan && playbackInfo) {
            totalTimeSpan.textContent = `${playbackInfo.total_time.toFixed(1)}s`;
        }
        
        // Update step display
        if (currentStepSpan) {
            currentStepSpan.textContent = currentStep.toString();
        }
        
        if (totalStepsSpan) {
            totalStepsSpan.textContent = totalSteps.toString();
        }
        
        // Update temperature range
        if (tempRangeSpan && playbackInfo) {
            const minTemp = Math.round(playbackInfo.min_temperature);
            const maxTemp = Math.round(playbackInfo.max_temperature);
            tempRangeSpan.textContent = `${minTemp}-${maxTemp}K`;
        }
        
        // Update button states
        if (stepBackwardBtn) {
            stepBackwardBtn.disabled = currentStep <= 0;
        }
        
        if (stepForwardBtn) {
            stepForwardBtn.disabled = currentStep >= totalSteps - 1;
        }
        
        if (resetPlaybackBtn) {
            resetPlaybackBtn.disabled = currentStep <= 0;
        }
    };
    
    /**
     * Seek to specific time step
     * @param {number} step - Target step index
     */
    const seekToStep = (step) => {
        if (step >= 0 && step < totalSteps) {
            currentStep = step;
            updateUI();
            updateVisualization();
        }
    };
    
    /**
     * Seek to specific time
     * @param {number} time - Target time in seconds
     */
    const seekToTime = (time) => {
        if (!playbackInfo || !timeStepData.length) return;
        
        // Find closest time step
        let closestStep = 0;
        let minDiff = Math.abs(timeStepData[0].time - time);
        
        for (let i = 1; i < timeStepData.length; i++) {
            const diff = Math.abs(timeStepData[i].time - time);
            if (diff < minDiff) {
                minDiff = diff;
                closestStep = i;
            }
        }
        
        seekToStep(closestStep);
    };
    
    /**
     * Get current playback state
     */
    const getState = () => {
        return {
            isPlaying,
            currentStep,
            totalSteps,
            playbackSpeed,
            currentTime: timeStepData[currentStep]?.time || 0,
            totalTime: playbackInfo?.total_time || 0
        };
    };
    
    /**
     * Clear playback data and reset state
     */
    const clear = () => {
        stop();
        timeStepData = [];
        playbackInfo = null;
        simulationId = null;
        currentStep = 0;
        totalSteps = 0;
        hidePlaybackControls();
        
        console.log("Playback data cleared");
    };
    
    // Return public API
    return {
        init,
        loadPlaybackData,
        showPlaybackControls,
        hidePlaybackControls,
        play,
        pause,
        stop,
        stepBackward,
        stepForward,
        resetPlayback,
        seekToStep,
        seekToTime,
        getState,
        clear
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('playback-controls')) {
        PlaybackController.init();
    }
});

// Export for global access
window.PlaybackController = PlaybackController;