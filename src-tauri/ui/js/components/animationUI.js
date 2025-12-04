/**
 * AnimationUI - User interface controls for animation playback
 * 
 * Provides interactive controls for playing, pausing, scrubbing, and adjusting
 * playback speed of simulation animations. Integrates with AnimationController
 * to manage playback state and visualization updates.
 */
class AnimationUI {
    constructor(container, animationController, eventBus, visualizationPanel = null, errorHandler = null) {
        this.container = container;
        this.animationController = animationController;
        this.eventBus = eventBus;
        this.visualizationPanel = visualizationPanel;
        this.errorHandler = errorHandler;
        
        // UI elements (will be created in render())
        this.controlsContainer = null;
        this.playButton = null;
        this.pauseButton = null;
        this.speedSelector = null;
        this.timelineSlider = null;
        this.timelineContainer = null;
        this.timeMarkers = null;
        this.timeDisplay = null;
        this.stepDisplay = null;
        this.loadingIndicator = null;
        this.progressBar = null;
        this.exportButton = null;
        this.exportDialog = null;
        
        // State
        this.isVisible = false;
        this.isDraggingTimeline = false;
        this.wasPlayingBeforeScrub = false;
        this.loadingProgress = 0;
        this.snapToFrame = true; // Enable snap-to-frame by default
        this.isExporting = false;
        
        // Bind methods
        this.render = this.render.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handlePlayClick = this.handlePlayClick.bind(this);
        this.handlePauseClick = this.handlePauseClick.bind(this);
        this.handleSpeedChange = this.handleSpeedChange.bind(this);
        this.handleTimelineInput = this.handleTimelineInput.bind(this);
        this.handleTimelineChange = this.handleTimelineChange.bind(this);
        this.handleTimelineMouseDown = this.handleTimelineMouseDown.bind(this);
        this.handleTimelineMouseUp = this.handleTimelineMouseUp.bind(this);
        this.handleTimelineMouseMove = this.handleTimelineMouseMove.bind(this);
        this.handleTimelineTouchStart = this.handleTimelineTouchStart.bind(this);
        this.handleTimelineTouchEnd = this.handleTimelineTouchEnd.bind(this);
        this.handleTimelineTouchMove = this.handleTimelineTouchMove.bind(this);
        this.updateTimeDisplay = this.updateTimeDisplay.bind(this);
        this.updateProgressBar = this.updateProgressBar.bind(this);
        this.showLoadingProgress = this.showLoadingProgress.bind(this);
        this.enableControls = this.enableControls.bind(this);
        this.updatePlaybackButtons = this.updatePlaybackButtons.bind(this);
        this.createTimeMarkers = this.createTimeMarkers.bind(this);
        this.updateTimeMarkers = this.updateTimeMarkers.bind(this);
        
        // Subscribe to animation events
        this.setupEventListeners();
        
        console.log('[AnimationUI] Created');
    }

    /**
     * Set up event listeners for animation controller events
     */
    setupEventListeners() {
        // Animation state changes
        this.eventBus.on('animation:initialized', (data) => {
            console.log('[AnimationUI] Animation initialized:', data);
            this.updateTimeDisplay(0, 0, data.totalTimeSteps);
            this.createTimeMarkers(data.totalTime, data.totalTimeSteps);
            this.enableControls(true);
            this.updatePlaybackButtons();
        });
        
        this.eventBus.on('animation:play', () => {
            console.log('[AnimationUI] Animation playing');
            this.updatePlaybackButtons();
        });
        
        this.eventBus.on('animation:pause', () => {
            console.log('[AnimationUI] Animation paused');
            this.updatePlaybackButtons();
        });
        
        this.eventBus.on('animation:timeChanged', (data) => {
            // Only update UI if not currently dragging timeline
            if (!this.isDraggingTimeline) {
                this.updateTimeDisplay(data.time, data.timeStep, data.totalTimeSteps);
                this.updateProgressBar(data.progress * 100);
            }
        });
        
        this.eventBus.on('animation:speedChanged', (data) => {
            console.log('[AnimationUI] Speed changed:', data.speed);
            if (this.speedSelector) {
                this.speedSelector.value = data.speed;
            }
        });
        
        this.eventBus.on('animation:ended', () => {
            console.log('[AnimationUI] Animation ended');
            this.updatePlaybackButtons();
        });
        
        this.eventBus.on('animation:reset', () => {
            console.log('[AnimationUI] Animation reset');
            this.updatePlaybackButtons();
        });
        
        this.eventBus.on('animation:frame-loading', (data) => {
            console.log('[AnimationUI] Frame loading:', data.timeStep);
            this.showLoadingIndicator(true);
        });
        
        this.eventBus.on('animation:frame-loaded', (data) => {
            console.log('[AnimationUI] Frame loaded:', data.timeStep);
            this.showLoadingIndicator(false);
        });
        
        this.eventBus.on('animation:error', (data) => {
            console.error('[AnimationUI] Animation error:', data);
            this.enableControls(false);
        });

        // Data cache loading events
        this.eventBus.on('cache:loading-start', (data) => {
            console.log('[AnimationUI] Cache loading started:', data);
            this.showDataLoadingProgress(0, data.totalFrames, data.initialBatch);
            this.enableControls(false); // Disable controls during initial load
        });

        this.eventBus.on('cache:loading-progress', (data) => {
            console.log('[AnimationUI] Cache loading progress:', data);
            this.updateDataLoadingProgress(data.progress, data.loaded, data.total);
        });

        this.eventBus.on('cache:ready', (data) => {
            console.log('[AnimationUI] Cache ready for playback:', data);
            // Enable controls once initial batch is loaded
            this.enableControls(true);
            // Continue showing progress for background loading
            this.updateDataLoadingProgress(data.progress, data.cachedFrames, data.totalFrames);
        });

        this.eventBus.on('cache:background-loading-start', (data) => {
            console.log('[AnimationUI] Background loading started:', data);
            // Show cache status indicator
            this.showCacheStatus(true);
        });

        this.eventBus.on('cache:loading-complete', (data) => {
            console.log('[AnimationUI] All frames loaded:', data);
            this.hideDataLoadingProgress();
            this.showCacheStatus(false);
        });

        this.eventBus.on('cache:error', (data) => {
            console.error('[AnimationUI] Cache error:', data);
            this.showDataLoadingError(data.error);
        });

        this.eventBus.on('cache:load-error', (data) => {
            console.error('[AnimationUI] Frame load error:', data);
            if (data.retriesExhausted) {
                this.showFrameLoadError(data.timeStep, data.error, data.attempts);
            }
        });

        this.eventBus.on('cache:retry', (data) => {
            console.log('[AnimationUI] Retrying frame load:', data);
            this.showRetryIndicator(data.timeStep, data.attempt, data.maxRetries);
        });

        this.eventBus.on('cache:retry-all', (data) => {
            console.log('[AnimationUI] Retrying all failed frames:', data);
            this.showRetryAllIndicator(data.totalFrames);
        });

        this.eventBus.on('cache:retry-all-complete', (data) => {
            console.log('[AnimationUI] Retry all completed:', data);
            this.hideRetryAllIndicator();
        });

        this.eventBus.on('animation:error', (data) => {
            console.error('[AnimationUI] Animation error:', data);
            this.showAnimationError(data.type, data.message);
            
            // Disable controls on critical errors
            if (data.type === 'initialization' || data.type === 'backend-unavailable') {
                this.enableControls(false);
                this.showRetryButton(true);
            }
        });
    }

    /**
     * Render the animation UI controls
     */
    render() {
        if (!this.container) {
            console.error('[AnimationUI] No container provided');
            return;
        }
        
        // Create main controls container
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'animation-controls';
        this.controlsContainer.style.display = 'none'; // Hidden by default
        
        // Create playback controls section
        const playbackSection = this.createPlaybackControls();
        
        // Create time controls section
        const timeSection = this.createTimeControls();
        
        // Create speed controls section
        const speedSection = this.createSpeedControls();
        
        // Create export button
        const exportButton = this.createExportButton();
        
        // Create loading indicator
        this.loadingIndicator = this.createLoadingIndicator();
        
        // Assemble the UI
        this.controlsContainer.appendChild(playbackSection);
        this.controlsContainer.appendChild(timeSection);
        this.controlsContainer.appendChild(speedSection);
        this.controlsContainer.appendChild(exportButton);
        this.controlsContainer.appendChild(this.loadingIndicator);
        
        // Add to container
        this.container.appendChild(this.controlsContainer);
        
        // Create export dialog (hidden by default)
        this.createExportDialog();
        
        console.log('[AnimationUI] Rendered');
    }

    /**
     * Create playback control buttons (play/pause)
     */
    createPlaybackControls() {
        const section = document.createElement('div');
        section.className = 'playback-controls';
        
        // Play button
        this.playButton = document.createElement('button');
        this.playButton.className = 'btn btn-primary';
        this.playButton.innerHTML = '▶ Play';
        this.playButton.title = 'Play animation (Space)';
        this.playButton.addEventListener('click', this.handlePlayClick);
        
        // Pause button
        this.pauseButton = document.createElement('button');
        this.pauseButton.className = 'btn btn-secondary';
        this.pauseButton.innerHTML = '⏸ Pause';
        this.pauseButton.title = 'Pause animation (Space)';
        this.pauseButton.style.display = 'none';
        this.pauseButton.addEventListener('click', this.handlePauseClick);
        
        section.appendChild(this.playButton);
        section.appendChild(this.pauseButton);
        
        return section;
    }

    /**
     * Create time controls (timeline slider and time display)
     */
    createTimeControls() {
        const section = document.createElement('div');
        section.className = 'time-controls';
        
        // Timeline container with markers
        this.timelineContainer = document.createElement('div');
        this.timelineContainer.className = 'timeline-container';
        
        // Time markers (will be populated when animation is initialized)
        this.timeMarkers = document.createElement('div');
        this.timeMarkers.className = 'time-markers';
        
        // Timeline slider
        this.timelineSlider = document.createElement('input');
        this.timelineSlider.type = 'range';
        this.timelineSlider.className = 'time-slider';
        this.timelineSlider.min = '0';
        this.timelineSlider.max = '100';
        this.timelineSlider.value = '0';
        this.timelineSlider.step = '0.1'; // Allow fine-grained scrubbing
        this.timelineSlider.title = 'Scrub through animation timeline (drag to navigate)';
        
        // Add event listeners for scrubbing
        this.timelineSlider.addEventListener('input', this.handleTimelineInput);
        this.timelineSlider.addEventListener('change', this.handleTimelineChange);
        this.timelineSlider.addEventListener('mousedown', this.handleTimelineMouseDown);
        this.timelineSlider.addEventListener('mouseup', this.handleTimelineMouseUp);
        this.timelineSlider.addEventListener('mousemove', this.handleTimelineMouseMove);
        this.timelineSlider.addEventListener('touchstart', this.handleTimelineTouchStart);
        this.timelineSlider.addEventListener('touchend', this.handleTimelineTouchEnd);
        this.timelineSlider.addEventListener('touchmove', this.handleTimelineTouchMove);
        
        // Assemble timeline
        this.timelineContainer.appendChild(this.timeMarkers);
        this.timelineContainer.appendChild(this.timelineSlider);
        
        // Time display
        const timeDisplayContainer = document.createElement('div');
        timeDisplayContainer.className = 'time-display';
        
        this.timeDisplay = document.createElement('span');
        this.timeDisplay.className = 'time-text';
        this.timeDisplay.textContent = '0.0s / 0.0s';
        
        this.stepDisplay = document.createElement('span');
        this.stepDisplay.className = 'step-text';
        this.stepDisplay.textContent = 'Step: 0 / 0';
        
        timeDisplayContainer.appendChild(this.timeDisplay);
        timeDisplayContainer.appendChild(this.stepDisplay);
        
        section.appendChild(this.timelineContainer);
        section.appendChild(timeDisplayContainer);
        
        return section;
    }

    /**
     * Create speed control selector
     */
    createSpeedControls() {
        const section = document.createElement('div');
        section.className = 'speed-controls';
        
        // Label
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = 'Speed:';
        label.htmlFor = 'animation-speed-selector';
        
        // Speed selector
        this.speedSelector = document.createElement('select');
        this.speedSelector.id = 'animation-speed-selector';
        this.speedSelector.className = 'form-select';
        this.speedSelector.title = 'Animation playback speed';
        
        // Get available speeds from animation controller
        const availableSpeeds = this.animationController.getAvailableSpeeds();
        const currentSpeed = this.animationController.getState().animationSpeed;
        
        availableSpeeds.forEach(speed => {
            const option = document.createElement('option');
            option.value = speed;
            option.textContent = `${speed}x`;
            // Select the current speed (which may be persisted from previous session)
            if (speed === currentSpeed) {
                option.selected = true;
            }
            this.speedSelector.appendChild(option);
        });
        
        this.speedSelector.addEventListener('change', this.handleSpeedChange);
        
        section.appendChild(label);
        section.appendChild(this.speedSelector);
        
        return section;
    }

    /**
     * Create export button
     */
    createExportButton() {
        this.exportButton = document.createElement('button');
        this.exportButton.className = 'btn btn-secondary export-btn';
        this.exportButton.innerHTML = '📷 Export';
        this.exportButton.title = 'Export animation frames as images';
        this.exportButton.addEventListener('click', () => this.showExportDialog());
        
        return this.exportButton;
    }

    /**
     * Create loading progress indicator
     */
    createLoadingIndicator() {
        const container = document.createElement('div');
        container.className = 'inline-loading';
        container.style.display = 'none';
        
        const content = document.createElement('div');
        content.className = 'inline-loading-content';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner-small';
        
        const text = document.createElement('span');
        text.className = 'loading-text';
        text.textContent = 'Loading frame...';
        
        // Progress bar for batch loading
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar-small';
        this.progressBar.style.display = 'none';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = '0%';
        this.progressBar.appendChild(progressFill);
        
        content.appendChild(spinner);
        content.appendChild(text);
        container.appendChild(content);
        container.appendChild(this.progressBar);
        
        return container;
    }

    /**
     * Handle play button click
     */
    handlePlayClick() {
        console.log('[AnimationUI] Play button clicked');
        const success = this.animationController.play();
        if (success) {
            this.updatePlaybackButtons();
        }
    }

    /**
     * Handle pause button click
     */
    handlePauseClick() {
        console.log('[AnimationUI] Pause button clicked');
        const success = this.animationController.pause();
        if (success) {
            this.updatePlaybackButtons();
        }
    }

    /**
     * Handle speed selector change
     */
    handleSpeedChange(event) {
        const speed = parseFloat(event.target.value);
        console.log('[AnimationUI] Speed changed to:', speed);
        this.animationController.setSpeed(speed);
    }

    /**
     * Handle timeline slider input (scrubbing in real-time)
     */
    handleTimelineInput(event) {
        if (!this.isDraggingTimeline) {
            return; // Only process during active scrubbing
        }
        
        const progress = parseFloat(event.target.value) / 100;
        const state = this.animationController.getState();
        
        // Calculate target time step with optional snap-to-frame
        let targetTimeStep;
        if (this.snapToFrame) {
            targetTimeStep = Math.round(progress * (state.totalTimeSteps - 1));
        } else {
            // Allow smooth interpolation between frames
            targetTimeStep = Math.floor(progress * (state.totalTimeSteps - 1));
        }
        
        // Clamp to valid range
        targetTimeStep = Math.max(0, Math.min(targetTimeStep, state.totalTimeSteps - 1));
        
        // Calculate time for display
        const targetTime = targetTimeStep * state.totalTime / Math.max(1, state.totalTimeSteps - 1);
        
        // Update display immediately for smooth feedback
        this.updateTimeDisplay(targetTime, targetTimeStep, state.totalTimeSteps);
        
        // Update visualization in real-time during scrub
        this.animationController.setTimeStep(targetTimeStep).catch(error => {
            console.error('[AnimationUI] Failed to update frame during scrubbing:', error);
        });
    }

    /**
     * Handle timeline slider change (final value after scrubbing)
     */
    handleTimelineChange(event) {
        const progress = parseFloat(event.target.value) / 100;
        const state = this.animationController.getState();
        const targetTimeStep = Math.round(progress * (state.totalTimeSteps - 1));
        
        console.log('[AnimationUI] Timeline changed to step:', targetTimeStep);
        
        // Ensure final frame is loaded
        this.animationController.setTimeStep(targetTimeStep).catch(error => {
            console.error('[AnimationUI] Failed to load final frame:', error);
        });
    }

    /**
     * Handle timeline slider mouse down (start scrubbing)
     */
    handleTimelineMouseDown(event) {
        console.log('[AnimationUI] Timeline scrubbing started (mouse)');
        
        // Store playback state before scrubbing
        const state = this.animationController.getState();
        this.wasPlayingBeforeScrub = state.isPlaying;
        
        // Pause playback automatically during scrubbing
        if (state.isPlaying) {
            this.animationController.pause();
            console.log('[AnimationUI] Paused playback for scrubbing');
        }
        
        // Mark as dragging
        this.isDraggingTimeline = true;
        
        // Add document-level mouse move and up listeners for better tracking
        document.addEventListener('mousemove', this.handleTimelineMouseMove);
        document.addEventListener('mouseup', this.handleTimelineMouseUp);
    }

    /**
     * Handle timeline slider mouse move (during scrubbing)
     */
    handleTimelineMouseMove(event) {
        if (!this.isDraggingTimeline) {
            return;
        }
        
        // The input event will handle the actual scrubbing
        // This is just for tracking the drag state
    }

    /**
     * Handle timeline slider mouse up (end scrubbing)
     */
    handleTimelineMouseUp(event) {
        if (!this.isDraggingTimeline) {
            return;
        }
        
        console.log('[AnimationUI] Timeline scrubbing ended (mouse)');
        this.isDraggingTimeline = false;
        
        // Remove document-level listeners
        document.removeEventListener('mousemove', this.handleTimelineMouseMove);
        document.removeEventListener('mouseup', this.handleTimelineMouseUp);
        
        // Update UI state
        this.updatePlaybackButtons();
        
        // Note: We don't automatically resume playback after scrubbing
        // User must explicitly click play to resume
    }

    /**
     * Handle timeline slider touch start (start scrubbing on mobile)
     */
    handleTimelineTouchStart(event) {
        console.log('[AnimationUI] Timeline scrubbing started (touch)');
        
        // Store playback state before scrubbing
        const state = this.animationController.getState();
        this.wasPlayingBeforeScrub = state.isPlaying;
        
        // Pause playback automatically during scrubbing
        if (state.isPlaying) {
            this.animationController.pause();
            console.log('[AnimationUI] Paused playback for scrubbing');
        }
        
        // Mark as dragging
        this.isDraggingTimeline = true;
        
        // Add document-level touch listeners
        document.addEventListener('touchmove', this.handleTimelineTouchMove);
        document.addEventListener('touchend', this.handleTimelineTouchEnd);
    }

    /**
     * Handle timeline slider touch move (during scrubbing on mobile)
     */
    handleTimelineTouchMove(event) {
        if (!this.isDraggingTimeline) {
            return;
        }
        
        // The input event will handle the actual scrubbing
    }

    /**
     * Handle timeline slider touch end (end scrubbing on mobile)
     */
    handleTimelineTouchEnd(event) {
        if (!this.isDraggingTimeline) {
            return;
        }
        
        console.log('[AnimationUI] Timeline scrubbing ended (touch)');
        this.isDraggingTimeline = false;
        
        // Remove document-level listeners
        document.removeEventListener('touchmove', this.handleTimelineTouchMove);
        document.removeEventListener('touchend', this.handleTimelineTouchEnd);
        
        // Update UI state
        this.updatePlaybackButtons();
    }

    /**
     * Update time display showing current time and step
     */
    updateTimeDisplay(currentTime, currentTimeStep, totalTimeSteps) {
        if (!this.timeDisplay || !this.stepDisplay) {
            return;
        }
        
        const state = this.animationController.getState();
        const totalTime = state.totalTime || 0;
        
        // Format time display
        this.timeDisplay.textContent = `${currentTime.toFixed(1)}s / ${totalTime.toFixed(1)}s`;
        
        // Format step display
        this.stepDisplay.textContent = `Step: ${currentTimeStep + 1} / ${totalTimeSteps}`;
    }

    /**
     * Update progress bar position
     */
    updateProgressBar(progress) {
        if (!this.timelineSlider) {
            return;
        }
        
        // Only update if not currently dragging
        if (!this.isDraggingTimeline) {
            this.timelineSlider.value = progress;
        }
    }

    /**
     * Show or hide loading progress indicator
     */
    showLoadingProgress(percent) {
        if (!this.loadingIndicator || !this.progressBar) {
            return;
        }
        
        if (percent > 0 && percent < 100) {
            this.loadingIndicator.style.display = 'block';
            this.progressBar.style.display = 'block';
            
            const progressFill = this.progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${percent}%`;
            }
            
            const loadingText = this.loadingIndicator.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = `Loading frames... ${Math.round(percent)}%`;
            }
        } else if (percent >= 100) {
            this.loadingIndicator.style.display = 'none';
            this.progressBar.style.display = 'none';
        }
        
        this.loadingProgress = percent;
    }

    /**
     * Show or hide loading indicator
     */
    showLoadingIndicator(show) {
        if (!this.loadingIndicator) {
            return;
        }
        
        if (show) {
            this.loadingIndicator.style.display = 'block';
            this.progressBar.style.display = 'none';
            
            const loadingText = this.loadingIndicator.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = 'Loading frame...';
            }
        } else {
            // Only hide if not showing batch loading progress
            if (this.loadingProgress === 0 || this.loadingProgress >= 100) {
                this.loadingIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Enable or disable all controls
     */
    enableControls(enabled) {
        if (!this.playButton || !this.pauseButton || !this.speedSelector || !this.timelineSlider) {
            return;
        }
        
        this.playButton.disabled = !enabled;
        this.pauseButton.disabled = !enabled;
        this.speedSelector.disabled = !enabled;
        this.timelineSlider.disabled = !enabled;
        
        console.log(`[AnimationUI] Controls ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update play/pause button visibility based on playback state
     */
    updatePlaybackButtons() {
        if (!this.playButton || !this.pauseButton) {
            return;
        }
        
        const state = this.animationController.getState();
        
        if (state.isPlaying) {
            this.playButton.style.display = 'none';
            this.pauseButton.style.display = 'inline-flex';
        } else {
            this.playButton.style.display = 'inline-flex';
            this.pauseButton.style.display = 'none';
        }
        
        // Update button states based on position
        if (state.isAtEnd) {
            this.playButton.title = 'Play from beginning (Space)';
        } else {
            this.playButton.title = 'Play animation (Space)';
        }
    }

    /**
     * Create time markers on the timeline at key intervals
     */
    createTimeMarkers(totalTime, totalTimeSteps) {
        if (!this.timeMarkers) {
            console.warn('[AnimationUI] Time markers container not available');
            return;
        }
        
        // Clear existing markers
        this.timeMarkers.innerHTML = '';
        
        if (totalTime <= 0 || totalTimeSteps <= 1) {
            return;
        }
        
        // Determine number of markers based on total time
        // Aim for markers every 5-10 seconds, but adjust based on duration
        let markerInterval;
        if (totalTime <= 30) {
            markerInterval = 5; // Every 5 seconds for short simulations
        } else if (totalTime <= 120) {
            markerInterval = 10; // Every 10 seconds for medium simulations
        } else if (totalTime <= 300) {
            markerInterval = 30; // Every 30 seconds for longer simulations
        } else {
            markerInterval = 60; // Every minute for very long simulations
        }
        
        // Create markers at intervals
        const numMarkers = Math.floor(totalTime / markerInterval);
        
        for (let i = 0; i <= numMarkers; i++) {
            const markerTime = i * markerInterval;
            
            // Don't create marker beyond total time
            if (markerTime > totalTime) {
                break;
            }
            
            // Calculate position as percentage
            const position = (markerTime / totalTime) * 100;
            
            // Create marker element
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${position}%`;
            
            // Create marker label
            const label = document.createElement('span');
            label.className = 'time-marker-label';
            label.textContent = `${markerTime.toFixed(0)}s`;
            
            marker.appendChild(label);
            this.timeMarkers.appendChild(marker);
        }
        
        // Always add a marker at the end
        const endMarker = document.createElement('div');
        endMarker.className = 'time-marker time-marker-end';
        endMarker.style.left = '100%';
        
        const endLabel = document.createElement('span');
        endLabel.className = 'time-marker-label';
        endLabel.textContent = `${totalTime.toFixed(1)}s`;
        
        endMarker.appendChild(endLabel);
        this.timeMarkers.appendChild(endMarker);
        
        console.log(`[AnimationUI] Created ${numMarkers + 2} time markers (interval: ${markerInterval}s)`);
    }

    /**
     * Update time markers (if timeline duration changes)
     */
    updateTimeMarkers() {
        const state = this.animationController.getState();
        if (state.totalTime > 0 && state.totalTimeSteps > 1) {
            this.createTimeMarkers(state.totalTime, state.totalTimeSteps);
        }
    }

    /**
     * Enable or disable snap-to-frame behavior
     */
    setSnapToFrame(enabled) {
        this.snapToFrame = Boolean(enabled);
        console.log(`[AnimationUI] Snap-to-frame ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if snap-to-frame is enabled
     */
    isSnapToFrameEnabled() {
        return this.snapToFrame;
    }

    /**
     * Show the animation controls
     */
    show() {
        if (!this.controlsContainer) {
            console.warn('[AnimationUI] Controls not rendered yet');
            return;
        }
        
        this.controlsContainer.style.display = 'flex';
        this.controlsContainer.classList.add('visible');
        this.isVisible = true;
        
        console.log('[AnimationUI] Controls shown');
    }

    /**
     * Hide the animation controls
     */
    hide() {
        if (!this.controlsContainer) {
            return;
        }
        
        this.controlsContainer.style.display = 'none';
        this.controlsContainer.classList.remove('visible');
        this.isVisible = false;
        
        console.log('[AnimationUI] Controls hidden');
    }

    /**
     * Check if controls are visible
     */
    isControlsVisible() {
        return this.isVisible;
    }

    /**
     * Get current UI state
     */
    getState() {
        return {
            isVisible: this.isVisible,
            isDraggingTimeline: this.isDraggingTimeline,
            loadingProgress: this.loadingProgress
        };
    }

    /**
     * Show data loading progress overlay
     */
    showDataLoadingProgress(progress, totalFrames, initialBatch) {
        if (!this.loadingIndicator) {
            return;
        }

        this.loadingIndicator.style.display = 'block';
        this.progressBar.style.display = 'block';

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Loading animation data... (0 / ${totalFrames} frames)`;
        }

        const progressFill = this.progressBar.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }

        console.log('[AnimationUI] Data loading progress shown');
    }

    /**
     * Update data loading progress
     */
    updateDataLoadingProgress(progress, loaded, total) {
        if (!this.loadingIndicator || !this.progressBar) {
            return;
        }

        const progressFill = this.progressBar.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            const percent = Math.round(progress);
            loadingText.textContent = `Loading animation data... ${percent}% (${loaded} / ${total} frames)`;
            
            // Add estimated time if available
            if (progress > 0 && progress < 100) {
                const estimatedRemaining = this.estimateLoadingTime(progress, loaded, total);
                if (estimatedRemaining !== null) {
                    loadingText.textContent += ` | ~${estimatedRemaining}s remaining`;
                }
            }
        }

        console.log(`[AnimationUI] Data loading progress: ${Math.round(progress)}% (${loaded}/${total})`);
    }

    /**
     * Estimate remaining loading time
     * @private
     */
    estimateLoadingTime(progress, loaded, total) {
        if (progress <= 0 || loaded <= 0) {
            return null;
        }

        // Simple estimation based on current progress
        const remaining = total - loaded;
        const avgTimePerFrame = 0.1; // Assume 100ms per frame
        const estimated = remaining * avgTimePerFrame;

        return Math.max(1, Math.round(estimated));
    }

    /**
     * Hide data loading progress overlay
     */
    hideDataLoadingProgress() {
        if (!this.loadingIndicator) {
            return;
        }

        // Fade out the loading indicator
        this.loadingIndicator.style.display = 'none';
        this.progressBar.style.display = 'none';

        console.log('[AnimationUI] Data loading progress hidden');
    }

    /**
     * Show data loading error
     */
    showDataLoadingError(errorMessage) {
        if (!this.loadingIndicator) {
            return;
        }

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Error loading animation data: ${errorMessage}`;
            loadingText.style.color = '#ff4444';
        }

        // Hide progress bar on error
        if (this.progressBar) {
            this.progressBar.style.display = 'none';
        }

        console.error('[AnimationUI] Data loading error displayed:', errorMessage);
    }

    /**
     * Show cache status indicator (for background loading)
     */
    showCacheStatus(show) {
        // Create cache status indicator if it doesn't exist
        if (!this.cacheStatusIndicator && show) {
            this.cacheStatusIndicator = document.createElement('div');
            this.cacheStatusIndicator.className = 'cache-status-indicator';
            this.cacheStatusIndicator.innerHTML = `
                <div class="cache-status-content">
                    <span class="cache-status-icon">⏳</span>
                    <span class="cache-status-text">Loading remaining frames in background...</span>
                </div>
            `;
            
            // Add to controls container
            if (this.controlsContainer) {
                this.controlsContainer.appendChild(this.cacheStatusIndicator);
            }
        }

        if (this.cacheStatusIndicator) {
            this.cacheStatusIndicator.style.display = show ? 'block' : 'none';
        }

        console.log(`[AnimationUI] Cache status indicator ${show ? 'shown' : 'hidden'}`);
    }

    /**
     * Create export dialog
     */
    createExportDialog() {
        // Create dialog overlay
        this.exportDialog = document.createElement('div');
        this.exportDialog.className = 'export-dialog-overlay';
        this.exportDialog.style.display = 'none';
        
        // Create dialog content
        const dialogContent = document.createElement('div');
        dialogContent.className = 'export-dialog';
        
        // Dialog header
        const header = document.createElement('div');
        header.className = 'export-dialog-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Export Animation Frames';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', () => this.hideExportDialog());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Dialog body
        const body = document.createElement('div');
        body.className = 'export-dialog-body';
        
        // Export type selection
        const typeGroup = document.createElement('div');
        typeGroup.className = 'form-group';
        
        const typeLabel = document.createElement('label');
        typeLabel.className = 'form-label';
        typeLabel.textContent = 'Export Type:';
        
        const typeSelect = document.createElement('select');
        typeSelect.id = 'export-type';
        typeSelect.className = 'form-select';
        
        const singleOption = document.createElement('option');
        singleOption.value = 'single';
        singleOption.textContent = 'Current Frame Only';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Frames (Sequence)';
        
        typeSelect.appendChild(singleOption);
        typeSelect.appendChild(allOption);
        
        typeGroup.appendChild(typeLabel);
        typeGroup.appendChild(typeSelect);
        
        // Resolution selection
        const resGroup = document.createElement('div');
        resGroup.className = 'form-group';
        
        const resLabel = document.createElement('label');
        resLabel.className = 'form-label';
        resLabel.textContent = 'Resolution:';
        
        const resSelect = document.createElement('select');
        resSelect.id = 'export-resolution';
        resSelect.className = 'form-select';
        
        const resOptions = [
            { value: 'current', label: 'Current (Canvas Size)' },
            { value: '1920x1080', label: 'Full HD (1920×1080)' },
            { value: '2560x1440', label: '2K (2560×1440)' },
            { value: '3840x2160', label: '4K (3840×2160)' }
        ];
        
        resOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            resSelect.appendChild(option);
        });
        
        resGroup.appendChild(resLabel);
        resGroup.appendChild(resSelect);
        
        // Format selection
        const formatGroup = document.createElement('div');
        formatGroup.className = 'form-group';
        
        const formatLabel = document.createElement('label');
        formatLabel.className = 'form-label';
        formatLabel.textContent = 'Format:';
        
        const formatSelect = document.createElement('select');
        formatSelect.id = 'export-format';
        formatSelect.className = 'form-select';
        
        const pngOption = document.createElement('option');
        pngOption.value = 'png';
        pngOption.textContent = 'PNG (Lossless)';
        
        const jpegOption = document.createElement('option');
        jpegOption.value = 'jpeg';
        jpegOption.textContent = 'JPEG (Compressed)';
        
        formatSelect.appendChild(pngOption);
        formatSelect.appendChild(jpegOption);
        
        formatGroup.appendChild(formatLabel);
        formatGroup.appendChild(formatSelect);
        
        // Progress indicator (hidden initially)
        const progressContainer = document.createElement('div');
        progressContainer.id = 'export-progress';
        progressContainer.className = 'export-progress';
        progressContainer.style.display = 'none';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = '0%';
        
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.textContent = 'Exporting frames...';
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        // Assemble body
        body.appendChild(typeGroup);
        body.appendChild(resGroup);
        body.appendChild(formatGroup);
        body.appendChild(progressContainer);
        
        // Dialog footer
        const footer = document.createElement('div');
        footer.className = 'export-dialog-footer';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.hideExportDialog());
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-primary';
        exportBtn.id = 'export-confirm-btn';
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => this.handleExportConfirm());
        
        footer.appendChild(cancelBtn);
        footer.appendChild(exportBtn);
        
        // Assemble dialog
        dialogContent.appendChild(header);
        dialogContent.appendChild(body);
        dialogContent.appendChild(footer);
        
        this.exportDialog.appendChild(dialogContent);
        
        // Add to document body
        document.body.appendChild(this.exportDialog);
        
        console.log('[AnimationUI] Export dialog created');
    }

    /**
     * Show export dialog
     */
    showExportDialog() {
        if (!this.exportDialog) {
            console.error('[AnimationUI] Export dialog not created');
            return;
        }
        
        if (!this.visualizationPanel) {
            console.error('[AnimationUI] Visualization panel not available for export');
            alert('Export functionality requires visualization panel');
            return;
        }
        
        // Reset dialog state
        const progressContainer = this.exportDialog.querySelector('#export-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        const exportBtn = this.exportDialog.querySelector('#export-confirm-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
        }
        
        // Show dialog
        this.exportDialog.style.display = 'flex';
        
        console.log('[AnimationUI] Export dialog shown');
    }

    /**
     * Hide export dialog
     */
    hideExportDialog() {
        if (!this.exportDialog) {
            return;
        }
        
        // Don't allow closing during export
        if (this.isExporting) {
            console.log('[AnimationUI] Cannot close dialog during export');
            return;
        }
        
        this.exportDialog.style.display = 'none';
        
        console.log('[AnimationUI] Export dialog hidden');
    }

    /**
     * Handle export confirmation
     */
    async handleExportConfirm() {
        if (!this.visualizationPanel) {
            console.error('[AnimationUI] Visualization panel not available');
            return;
        }
        
        if (this.isExporting) {
            console.log('[AnimationUI] Export already in progress');
            return;
        }
        
        // Get export options from dialog
        const typeSelect = this.exportDialog.querySelector('#export-type');
        const resSelect = this.exportDialog.querySelector('#export-resolution');
        const formatSelect = this.exportDialog.querySelector('#export-format');
        
        const exportType = typeSelect.value;
        const resolution = resSelect.value;
        const format = formatSelect.value;
        
        // Parse resolution
        let width, height;
        if (resolution === 'current') {
            width = undefined;
            height = undefined;
        } else {
            const [w, h] = resolution.split('x').map(Number);
            width = w;
            height = h;
        }
        
        console.log('[AnimationUI] Starting export:', { exportType, resolution, format, width, height });
        
        try {
            this.isExporting = true;
            
            // Disable export button
            const exportBtn = this.exportDialog.querySelector('#export-confirm-btn');
            if (exportBtn) {
                exportBtn.disabled = true;
            }
            
            if (exportType === 'single') {
                // Export current frame
                await this.exportSingleFrame({ width, height, format });
            } else {
                // Export all frames
                await this.exportAllFrames({ width, height, format });
            }
            
            // Close dialog on success
            this.hideExportDialog();
            
            // Show success message
            alert('Export completed successfully!');
            
        } catch (error) {
            console.error('[AnimationUI] Export failed:', error);
            alert(`Export failed: ${error.message}`);
            
            // Re-enable export button
            const exportBtn = this.exportDialog.querySelector('#export-confirm-btn');
            if (exportBtn) {
                exportBtn.disabled = false;
            }
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Export single frame
     */
    async exportSingleFrame(options) {
        console.log('[AnimationUI] Exporting single frame');
        
        const state = this.animationController.getState();
        const timeStep = state.currentTimeStep;
        const time = state.currentTime;
        
        const filename = `frame_${String(timeStep).padStart(4, '0')}_t${time.toFixed(2)}s.${options.format === 'jpeg' ? 'jpg' : 'png'}`;
        
        this.visualizationPanel.exportCurrentFrame({
            ...options,
            filename
        });
        
        console.log('[AnimationUI] Single frame exported:', filename);
    }

    /**
     * Export all frames with progress tracking
     */
    async exportAllFrames(options) {
        console.log('[AnimationUI] Exporting all frames');
        
        // Show progress indicator
        const progressContainer = this.exportDialog.querySelector('#export-progress');
        const progressFill = this.exportDialog.querySelector('#export-progress .progress-fill');
        const progressText = this.exportDialog.querySelector('#export-progress .progress-text');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        // Pause animation during export
        const wasPlaying = this.animationController.getState().isPlaying;
        if (wasPlaying) {
            this.animationController.pause();
        }
        
        try {
            await this.visualizationPanel.exportAllFrames({
                ...options,
                filenamePrefix: 'frame',
                onProgress: (progress, current, total) => {
                    // Update progress bar
                    if (progressFill) {
                        progressFill.style.width = `${progress}%`;
                    }
                    
                    if (progressText) {
                        progressText.textContent = `Exporting frame ${current} of ${total}... (${Math.round(progress)}%)`;
                    }
                }
            });
            
            console.log('[AnimationUI] All frames exported successfully');
            
        } finally {
            // Hide progress indicator
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            
            // Resume animation if it was playing
            if (wasPlaying) {
                this.animationController.play();
            }
        }
    }

    /**
     * Set visualization panel reference
     */
    setVisualizationPanel(visualizationPanel) {
        this.visualizationPanel = visualizationPanel;
        console.log('[AnimationUI] Visualization panel reference set');
    }

    /**
     * Set error handler reference
     */
    setErrorHandler(errorHandler) {
        this.errorHandler = errorHandler;
        console.log('[AnimationUI] Error handler reference set');
    }

    /**
     * Show frame load error with retry option
     */
    showFrameLoadError(timeStep, errorMessage, attempts) {
        // Create error notification if it doesn't exist
        if (!this.errorNotification) {
            this.errorNotification = document.createElement('div');
            this.errorNotification.className = 'error-notification';
            
            if (this.controlsContainer) {
                this.controlsContainer.appendChild(this.errorNotification);
            }
        }

        // Set error content
        this.errorNotification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <div class="error-message">
                    <strong>Failed to load frame ${timeStep}</strong>
                    <p>${errorMessage} (${attempts} attempts)</p>
                </div>
                <button class="btn btn-small btn-retry" data-frame="${timeStep}">
                    Retry Frame
                </button>
                <button class="btn btn-small btn-close-error">
                    ×
                </button>
            </div>
        `;

        // Add event listeners
        const retryBtn = this.errorNotification.querySelector('.btn-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.handleRetryFrame(timeStep));
        }

        const closeBtn = this.errorNotification.querySelector('.btn-close-error');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideErrorNotification());
        }

        // Show notification
        this.errorNotification.style.display = 'block';

        console.log('[AnimationUI] Frame load error displayed');
    }

    /**
     * Show animation error with ErrorHandler integration
     */
    showAnimationError(type, message) {
        // Use ErrorHandler if available for consistent error messaging
        let processedError = null;
        if (this.errorHandler) {
            processedError = this.errorHandler.handle(
                new Error(message),
                type === 'initialization' || type === 'backend-unavailable' ? 'network' : 'simulation',
                { animationError: true, errorType: type }
            );
            message = processedError.userMessage;
        }

        // Create error notification if it doesn't exist
        if (!this.errorNotification) {
            this.errorNotification = document.createElement('div');
            this.errorNotification.className = 'error-notification';
            
            if (this.controlsContainer) {
                this.controlsContainer.appendChild(this.errorNotification);
            }
        }

        // Determine error severity and icon
        let icon = '⚠️';
        let severity = 'warning';
        
        if (type === 'initialization' || type === 'backend-unavailable') {
            icon = '🚨';
            severity = 'critical';
        } else if (type === 'frame-load') {
            icon = '⚠️';
            severity = 'warning';
        }

        // Build suggestions HTML if available
        let suggestionsHtml = '';
        if (processedError && processedError.suggestions && processedError.suggestions.length > 0) {
            suggestionsHtml = '<ul class="error-suggestions">';
            processedError.suggestions.slice(0, 3).forEach(suggestion => {
                suggestionsHtml += `<li>${suggestion}</li>`;
            });
            suggestionsHtml += '</ul>';
        }

        // Set error content
        this.errorNotification.innerHTML = `
            <div class="error-content error-${severity}">
                <span class="error-icon">${icon}</span>
                <div class="error-message">
                    <strong>Animation Error</strong>
                    <p>${message}</p>
                    ${suggestionsHtml}
                </div>
                <button class="btn btn-small btn-close-error">
                    ×
                </button>
            </div>
        `;

        // Add close button listener
        const closeBtn = this.errorNotification.querySelector('.btn-close-error');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideErrorNotification());
        }

        // Show notification
        this.errorNotification.style.display = 'block';

        console.log('[AnimationUI] Animation error displayed:', type, message);
    }

    /**
     * Hide error notification
     */
    hideErrorNotification() {
        if (this.errorNotification) {
            this.errorNotification.style.display = 'none';
        }
    }

    /**
     * Show retry indicator for frame loading
     */
    showRetryIndicator(timeStep, attempt, maxRetries) {
        if (!this.loadingIndicator) {
            return;
        }

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Retrying frame ${timeStep}... (attempt ${attempt}/${maxRetries})`;
            loadingText.style.color = '#ff9800'; // Orange color for retry
        }

        this.loadingIndicator.style.display = 'block';
    }

    /**
     * Show retry all indicator
     */
    showRetryAllIndicator(totalFrames) {
        if (!this.loadingIndicator) {
            return;
        }

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Retrying ${totalFrames} failed frames...`;
            loadingText.style.color = '#ff9800'; // Orange color for retry
        }

        this.loadingIndicator.style.display = 'block';
        this.progressBar.style.display = 'block';
    }

    /**
     * Hide retry all indicator
     */
    hideRetryAllIndicator() {
        if (!this.loadingIndicator) {
            return;
        }

        this.loadingIndicator.style.display = 'none';
        this.progressBar.style.display = 'none';

        const loadingText = this.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.style.color = ''; // Reset color
        }
    }

    /**
     * Handle retry frame button click
     */
    async handleRetryFrame(timeStep) {
        console.log('[AnimationUI] Retrying frame:', timeStep);

        // Hide error notification
        this.hideErrorNotification();

        // Show loading indicator
        this.showLoadingIndicator(true);

        try {
            // Get data cache manager from animation controller
            const dataCacheManager = this.animationController.dataCacheManager;
            
            if (!dataCacheManager) {
                throw new Error('Data cache manager not available');
            }

            // Retry loading the frame
            await dataCacheManager.retryFrame(timeStep);

            // Hide loading indicator
            this.showLoadingIndicator(false);

            // Show success message
            console.log('[AnimationUI] Frame retry successful');

        } catch (error) {
            console.error('[AnimationUI] Frame retry failed:', error);
            
            // Show error again
            this.showFrameLoadError(timeStep, error.message, 'retry failed');
            
            // Hide loading indicator
            this.showLoadingIndicator(false);
        }
    }

    /**
     * Show retry button for critical errors
     */
    showRetryButton(show) {
        // Create retry button if it doesn't exist
        if (!this.retryButton && show) {
            this.retryButton = document.createElement('button');
            this.retryButton.className = 'btn btn-warning retry-all-btn';
            this.retryButton.innerHTML = '🔄 Retry Loading Data';
            this.retryButton.title = 'Retry loading animation data';
            this.retryButton.addEventListener('click', () => this.handleRetryAll());
            
            // Add to controls container
            if (this.controlsContainer) {
                this.controlsContainer.appendChild(this.retryButton);
            }
        }

        if (this.retryButton) {
            this.retryButton.style.display = show ? 'inline-flex' : 'none';
        }

        console.log(`[AnimationUI] Retry button ${show ? 'shown' : 'hidden'}`);
    }

    /**
     * Handle retry all button click
     */
    async handleRetryAll() {
        console.log('[AnimationUI] Retrying all failed frames');

        // Hide retry button
        this.showRetryButton(false);

        // Hide error notification
        this.hideErrorNotification();

        try {
            // Get data cache manager from animation controller
            const dataCacheManager = this.animationController.dataCacheManager;
            
            if (!dataCacheManager) {
                throw new Error('Data cache manager not available');
            }

            // Retry loading all failed frames
            await dataCacheManager.retryAllFailed();

            // Check if we now have enough data for playback
            if (dataCacheManager.isReadyForPlayback()) {
                // Enable controls
                this.enableControls(true);
                
                console.log('[AnimationUI] Retry all successful - controls enabled');
            } else {
                // Still not enough data - show error
                throw new Error('Insufficient data loaded after retry');
            }

        } catch (error) {
            console.error('[AnimationUI] Retry all failed:', error);
            
            // Show error and retry button again
            this.showAnimationError('retry-failed', `Failed to load animation data: ${error.message}`);
            this.showRetryButton(true);
        }
    }

    /**
     * Show performance warning
     */
    showPerformanceWarning(fps, targetFps = 30) {
        // Create performance warning if it doesn't exist
        if (!this.performanceWarning) {
            this.performanceWarning = document.createElement('div');
            this.performanceWarning.className = 'performance-warning';
            
            if (this.controlsContainer) {
                this.controlsContainer.appendChild(this.performanceWarning);
            }
        }

        // Set warning content
        this.performanceWarning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚡</span>
                <div class="warning-message">
                    <strong>Performance Warning</strong>
                    <p>Playback is running at ${fps.toFixed(1)} FPS (target: ${targetFps} FPS). Consider reducing playback speed or quality settings.</p>
                </div>
                <button class="btn btn-small btn-close-warning">
                    ×
                </button>
            </div>
        `;

        // Add close button listener
        const closeBtn = this.performanceWarning.querySelector('.btn-close-warning');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePerformanceWarning());
        }

        // Show warning
        this.performanceWarning.style.display = 'block';

        console.log('[AnimationUI] Performance warning displayed:', fps);
    }

    /**
     * Hide performance warning
     */
    hidePerformanceWarning() {
        if (this.performanceWarning) {
            this.performanceWarning.style.display = 'none';
        }
    }

    /**
     * Monitor playback performance
     */
    startPerformanceMonitoring() {
        if (this.performanceMonitorInterval) {
            return; // Already monitoring
        }

        let lastFrameTime = performance.now();
        let frameCount = 0;
        let fpsSum = 0;

        this.performanceMonitorInterval = setInterval(() => {
            const state = this.animationController.getState();
            
            if (!state.isPlaying) {
                return; // Don't monitor when paused
            }

            const currentTime = performance.now();
            const deltaTime = currentTime - lastFrameTime;
            
            if (deltaTime > 0) {
                const fps = 1000 / deltaTime;
                fpsSum += fps;
                frameCount++;

                // Check average FPS every 10 frames
                if (frameCount >= 10) {
                    const avgFps = fpsSum / frameCount;
                    
                    // Show warning if FPS drops below 15
                    if (avgFps < 15) {
                        this.showPerformanceWarning(avgFps);
                    } else if (avgFps >= 25) {
                        // Hide warning if performance improves
                        this.hidePerformanceWarning();
                    }

                    // Reset counters
                    frameCount = 0;
                    fpsSum = 0;
                }
            }

            lastFrameTime = currentTime;
        }, 100); // Check every 100ms

        console.log('[AnimationUI] Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
        if (this.performanceMonitorInterval) {
            clearInterval(this.performanceMonitorInterval);
            this.performanceMonitorInterval = null;
            console.log('[AnimationUI] Performance monitoring stopped');
        }
    }

    /**
     * Hide animation controls (e.g., during simulation running)
     */
    hideControls() {
        if (this.controlsContainer) {
            this.controlsContainer.style.display = 'none';
            this.isVisible = false;
            console.log('[AnimationUI] Controls hidden');
        }
    }

    /**
     * Show animation controls (e.g., when results are ready)
     */
    showControls() {
        if (this.controlsContainer) {
            this.controlsContainer.style.display = 'flex';
            this.isVisible = true;
            console.log('[AnimationUI] Controls shown');
        }
    }

    /**
     * Dispose of UI resources
     */
    dispose() {
        console.log('[AnimationUI] Disposing resources...');
        
        // Stop performance monitoring
        this.stopPerformanceMonitoring();
        
        // Remove event listeners
        if (this.playButton) {
            this.playButton.removeEventListener('click', this.handlePlayClick);
        }
        
        if (this.pauseButton) {
            this.pauseButton.removeEventListener('click', this.handlePauseClick);
        }
        
        if (this.speedSelector) {
            this.speedSelector.removeEventListener('change', this.handleSpeedChange);
        }
        
        if (this.timelineSlider) {
            this.timelineSlider.removeEventListener('input', this.handleTimelineInput);
            this.timelineSlider.removeEventListener('change', this.handleTimelineChange);
            this.timelineSlider.removeEventListener('mousedown', this.handleTimelineMouseDown);
            this.timelineSlider.removeEventListener('mousemove', this.handleTimelineMouseMove);
            this.timelineSlider.removeEventListener('touchstart', this.handleTimelineTouchStart);
            this.timelineSlider.removeEventListener('touchmove', this.handleTimelineTouchMove);
        }
        
        // Remove document-level listeners if still attached
        document.removeEventListener('mousemove', this.handleTimelineMouseMove);
        document.removeEventListener('mouseup', this.handleTimelineMouseUp);
        document.removeEventListener('touchmove', this.handleTimelineTouchMove);
        document.removeEventListener('touchend', this.handleTimelineTouchEnd);
        
        // Remove from DOM
        if (this.controlsContainer && this.controlsContainer.parentNode) {
            this.controlsContainer.parentNode.removeChild(this.controlsContainer);
        }
        
        if (this.exportDialog && this.exportDialog.parentNode) {
            this.exportDialog.parentNode.removeChild(this.exportDialog);
        }
        
        if (this.errorNotification && this.errorNotification.parentNode) {
            this.errorNotification.parentNode.removeChild(this.errorNotification);
        }
        
        if (this.performanceWarning && this.performanceWarning.parentNode) {
            this.performanceWarning.parentNode.removeChild(this.performanceWarning);
        }
        
        if (this.retryButton && this.retryButton.parentNode) {
            this.retryButton.parentNode.removeChild(this.retryButton);
        }
        
        // Clear references
        this.controlsContainer = null;
        this.playButton = null;
        this.pauseButton = null;
        this.speedSelector = null;
        this.timelineSlider = null;
        this.timelineContainer = null;
        this.timeMarkers = null;
        this.timeDisplay = null;
        this.stepDisplay = null;
        this.loadingIndicator = null;
        this.progressBar = null;
        this.errorNotification = null;
        this.performanceWarning = null;
        this.retryButton = null;
        
        console.log('[AnimationUI] Resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationUI;
} else if (typeof window !== 'undefined') {
    window.AnimationUI = AnimationUI;
}
