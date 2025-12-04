/**
 * KeyboardHandler - Manages keyboard shortcuts and accessibility
 * 
 * Provides keyboard navigation, shortcuts, and accessibility features
 * for the Plasma Furnace Simulator interface.
 */
class KeyboardHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.keyboardNavigationActive = false;
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        
        // Status announcer for screen readers
        this.statusAnnouncer = null;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        
        this.init();
    }
    
    /**
     * Initialize keyboard handler
     */
    init() {
        this.createStatusAnnouncer();
        this.setupKeyboardShortcuts();
        this.setupEventListeners();
        this.setupFocusManagement();
        this.updateFocusableElements();
        
        console.log('[KeyboardHandler] Initialized with accessibility features');
    }
    
    /**
     * Create status announcer for screen readers
     */
    createStatusAnnouncer() {
        this.statusAnnouncer = document.createElement('div');
        this.statusAnnouncer.id = 'status-announcer';
        this.statusAnnouncer.setAttribute('aria-live', 'polite');
        this.statusAnnouncer.setAttribute('aria-atomic', 'true');
        this.statusAnnouncer.className = 'sr-only';
        document.body.appendChild(this.statusAnnouncer);
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Simulation controls
        this.addShortcut('ctrl+enter', () => {
            this.triggerRunSimulation();
        }, 'Run simulation');
        
        this.addShortcut('escape', () => {
            this.triggerCancelSimulation();
        }, 'Cancel simulation or close dialogs');
        
        // Animation controls
        this.addShortcut('space', (event) => {
            event.preventDefault();
            this.triggerPlayPause();
        }, 'Play/pause animation');
        
        this.addShortcut('arrowleft', () => {
            this.triggerStepBackward();
        }, 'Step backward in animation');
        
        this.addShortcut('arrowright', () => {
            this.triggerStepForward();
        }, 'Step forward in animation');
        
        // Visualization controls
        this.addShortcut('r', () => {
            this.triggerResetCamera();
        }, 'Reset camera view');
        
        // Navigation shortcuts
        this.addShortcut('tab', (event) => {
            this.handleTabNavigation(event);
        }, 'Navigate between elements');
        
        this.addShortcut('shift+tab', (event) => {
            this.handleTabNavigation(event, true);
        }, 'Navigate backward between elements');
        
        // Help shortcut
        this.addShortcut('f1', (event) => {
            event.preventDefault();
            this.showKeyboardHelp();
        }, 'Show keyboard shortcuts help');
        
        // Speed controls
        this.addShortcut('1', () => {
            this.setAnimationSpeed(0.5);
        }, 'Set animation speed to 0.5x');
        
        this.addShortcut('2', () => {
            this.setAnimationSpeed(1);
        }, 'Set animation speed to 1x');
        
        this.addShortcut('3', () => {
            this.setAnimationSpeed(2);
        }, 'Set animation speed to 2x');
        
        this.addShortcut('4', () => {
            this.setAnimationSpeed(4);
        }, 'Set animation speed to 4x');
    }
    
    /**
     * Add a keyboard shortcut
     */
    addShortcut(key, callback, description) {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, {
            callback,
            description,
            key: normalizedKey
        });
    }
    
    /**
     * Normalize key combination for consistent matching
     */
    normalizeKey(key) {
        return key.toLowerCase()
            .replace(/\s+/g, '')
            .replace('ctrl', 'control')
            .replace('cmd', 'meta');
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('focusin', this.handleFocus);
        document.addEventListener('focusout', this.handleBlur);
        
        // Listen for application events
        this.eventBus.on('app:initialized', () => {
            this.updateFocusableElements();
        });
        
        this.eventBus.on('state:changed', (data) => {
            this.handleStateChange(data);
        });
        
        this.eventBus.on('simulation:started', () => {
            this.announce('Simulation started');
        });
        
        this.eventBus.on('simulation:completed', () => {
            this.announce('Simulation completed. Visualization is now available.');
        });
        
        this.eventBus.on('simulation:failed', (data) => {
            this.announce(`Simulation failed: ${data.error}`);
        });
        
        this.eventBus.on('animation:play', (data) => {
            const timeStep = data.currentTimeStep !== undefined ? ` at step ${data.currentTimeStep + 1}` : '';
            this.announce(`Animation playing${timeStep}`);
        });
        
        this.eventBus.on('animation:pause', (data) => {
            const timeStep = data.currentTimeStep !== undefined ? ` at step ${data.currentTimeStep + 1}` : '';
            this.announce(`Animation paused${timeStep}`);
        });
    }
    
    /**
     * Set up focus management
     */
    setupFocusManagement() {
        // Add keyboard navigation class when tab is used
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
                this.keyboardNavigationActive = true;
            }
        });
        
        // Remove keyboard navigation class on mouse use
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
            this.keyboardNavigationActive = false;
        });
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        if (!this.isEnabled) return;
        
        const key = this.getKeyString(event);
        const shortcut = this.shortcuts.get(key);
        
        if (shortcut) {
            // Check if we should prevent default behavior
            if (this.shouldPreventDefault(key, event)) {
                event.preventDefault();
            }
            
            // Execute shortcut if conditions are met
            if (this.canExecuteShortcut(key, event)) {
                shortcut.callback(event);
            }
        }
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        // Handle any keyup-specific logic here
    }
    
    /**
     * Get key string from event
     */
    getKeyString(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) parts.push('control');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        
        parts.push(event.key.toLowerCase());
        
        return parts.join('+');
    }
    
    /**
     * Check if default behavior should be prevented
     */
    shouldPreventDefault(key, event) {
        const preventKeys = ['space', 'f1', 'ctrl+enter', 'control+enter'];
        return preventKeys.includes(key);
    }
    
    /**
     * Check if shortcut can be executed
     */
    canExecuteShortcut(key, event) {
        // Don't execute shortcuts when typing in form fields
        const activeElement = document.activeElement;
        const isFormField = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
        
        // Allow certain shortcuts even in form fields
        const allowedInForms = ['escape', 'f1', 'tab', 'shift+tab'];
        
        if (isFormField && !allowedInForms.includes(key)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Update list of focusable elements
     */
    updateFocusableElements() {
        const selector = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            'a[href]'
        ].join(', ');
        
        this.focusableElements = Array.from(document.querySelectorAll(selector));
        this.currentFocusIndex = this.focusableElements.indexOf(document.activeElement);
    }
    
    /**
     * Handle tab navigation
     */
    handleTabNavigation(event, reverse = false) {
        this.updateFocusableElements();
        
        if (this.focusableElements.length === 0) return;
        
        const direction = reverse ? -1 : 1;
        let newIndex = this.currentFocusIndex + direction;
        
        // Wrap around
        if (newIndex >= this.focusableElements.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = this.focusableElements.length - 1;
        }
        
        this.currentFocusIndex = newIndex;
        this.focusableElements[newIndex].focus();
    }
    
    /**
     * Handle focus events
     */
    handleFocus(event) {
        this.updateFocusableElements();
        this.currentFocusIndex = this.focusableElements.indexOf(event.target);
    }
    
    /**
     * Handle blur events
     */
    handleBlur(event) {
        // Handle any blur-specific logic here
    }
    
    /**
     * Handle state changes
     */
    handleStateChange(data) {
        const { to } = data;
        
        switch (to) {
            case 'READY':
                this.announce('Application ready. You can configure parameters and run simulation.');
                break;
            case 'RUNNING':
                this.announce('Simulation is running. Please wait for completion.');
                break;
            case 'RESULTS':
                this.announce('Simulation results are available. Use animation controls to explore the data.');
                break;
        }
    }
    
    /**
     * Trigger run simulation
     */
    triggerRunSimulation() {
        const runButton = document.getElementById('run-simulation');
        if (runButton && !runButton.disabled) {
            runButton.click();
            this.announce('Starting simulation');
        } else {
            this.announce('Cannot run simulation. Check parameters or wait for current simulation to complete.');
        }
    }
    
    /**
     * Trigger cancel simulation
     */
    triggerCancelSimulation() {
        const cancelButton = document.getElementById('cancel-simulation');
        if (cancelButton && cancelButton.style.display !== 'none') {
            cancelButton.click();
            this.announce('Cancelling simulation');
        }
    }
    
    /**
     * Trigger play/pause animation
     */
    triggerPlayPause() {
        // Try to get animation controller from app instance
        if (window.app) {
            const animationController = window.app.getComponent('animation');
            if (animationController) {
                const state = animationController.getState();
                if (state.isPlaying) {
                    animationController.pause();
                    this.announce('Animation paused');
                } else {
                    const success = animationController.play();
                    if (success) {
                        this.announce('Animation playing');
                    } else {
                        this.announce('Cannot play animation');
                    }
                }
                return;
            }
        }
        
        // Fallback: try to find play/pause button in DOM
        const playPauseButton = document.getElementById('play-pause');
        if (playPauseButton && playPauseButton.style.display !== 'none') {
            playPauseButton.click();
        }
    }
    
    /**
     * Trigger step backward
     */
    triggerStepBackward() {
        const stepBackButton = document.getElementById('step-backward');
        if (stepBackButton && !stepBackButton.disabled) {
            stepBackButton.click();
            this.announce('Stepped backward');
        }
    }
    
    /**
     * Trigger step forward
     */
    triggerStepForward() {
        const stepForwardButton = document.getElementById('step-forward');
        if (stepForwardButton && !stepForwardButton.disabled) {
            stepForwardButton.click();
            this.announce('Stepped forward');
        }
    }
    
    /**
     * Trigger reset camera
     */
    triggerResetCamera() {
        const resetButton = document.getElementById('reset-camera');
        if (resetButton && !resetButton.disabled) {
            resetButton.click();
            this.announce('Camera view reset');
        }
    }
    
    /**
     * Set animation speed
     */
    setAnimationSpeed(speed) {
        const speedSelect = document.getElementById('animation-speed');
        if (speedSelect) {
            speedSelect.value = speed;
            speedSelect.dispatchEvent(new Event('change'));
            this.announce(`Animation speed set to ${speed}x`);
        }
    }
    
    /**
     * Show keyboard shortcuts help
     */
    showKeyboardHelp() {
        const shortcuts = Array.from(this.shortcuts.values())
            .map(s => `${s.key.replace(/\+/g, ' + ').toUpperCase()}: ${s.description}`)
            .join('\n');
        
        const helpText = `Keyboard Shortcuts:\n\n${shortcuts}`;
        
        // Create or update help dialog
        let helpDialog = document.getElementById('keyboard-help-dialog');
        if (!helpDialog) {
            helpDialog = this.createHelpDialog();
        }
        
        const helpContent = helpDialog.querySelector('.help-content');
        helpContent.textContent = helpText;
        
        helpDialog.style.display = 'flex';
        helpDialog.focus();
        
        this.announce('Keyboard shortcuts help opened');
    }
    
    /**
     * Create help dialog
     */
    createHelpDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'keyboard-help-dialog';
        dialog.className = 'help-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-labelledby', 'help-title');
        dialog.setAttribute('aria-modal', 'true');
        dialog.tabIndex = -1;
        
        dialog.innerHTML = `
            <div class="help-overlay"></div>
            <div class="help-modal">
                <div class="help-header">
                    <h2 id="help-title">Keyboard Shortcuts</h2>
                    <button class="help-close" aria-label="Close help dialog">&times;</button>
                </div>
                <div class="help-content"></div>
                <div class="help-footer">
                    <button class="btn btn-primary help-ok">OK</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const closeButton = dialog.querySelector('.help-close');
        const okButton = dialog.querySelector('.help-ok');
        
        const closeDialog = () => {
            dialog.style.display = 'none';
            this.announce('Help dialog closed');
        };
        
        closeButton.addEventListener('click', closeDialog);
        okButton.addEventListener('click', closeDialog);
        
        // Close on escape
        dialog.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeDialog();
            }
        });
        
        document.body.appendChild(dialog);
        return dialog;
    }
    
    /**
     * Announce message to screen readers
     */
    announce(message) {
        if (this.statusAnnouncer) {
            this.statusAnnouncer.textContent = message;
            
            // Clear after a delay to allow for new announcements
            setTimeout(() => {
                this.statusAnnouncer.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * Enable keyboard handler
     */
    enable() {
        this.isEnabled = true;
    }
    
    /**
     * Disable keyboard handler
     */
    disable() {
        this.isEnabled = false;
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            enabled: this.isEnabled,
            keyboardNavigationActive: this.keyboardNavigationActive,
            shortcutsCount: this.shortcuts.size,
            focusableElementsCount: this.focusableElements.length,
            currentFocusIndex: this.currentFocusIndex
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardHandler;
} else if (typeof window !== 'undefined') {
    window.KeyboardHandler = KeyboardHandler;
}