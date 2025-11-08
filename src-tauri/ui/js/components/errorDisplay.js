/**
 * ErrorDisplay - User-friendly error message display component
 * 
 * Shows error messages with appropriate styling, recovery suggestions,
 * and user actions based on error type and severity.
 */
class ErrorDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeErrors = new Map();
        this.errorContainer = null;
        
        // Bind methods
        this.showError = this.showError.bind(this);
        this.hideError = this.hideError.bind(this);
        this.createErrorElement = this.createErrorElement.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize DOM
        this.initializeDOM();
    }

    /**
     * Set up event listeners for error handling
     * @private
     */
    setupEventListeners() {
        // Listen for processed errors from ErrorHandler
        this.eventBus.on('error:handled', (errorInfo) => {
            this.showError(errorInfo);
        });

        // Listen for UI error events
        this.eventBus.on('ui:error', (errorInfo) => {
            this.showError(errorInfo);
        });

        // Listen for error clearing events
        this.eventBus.on('error:clear', (data) => {
            if (data.id) {
                this.hideError(data.id);
            } else if (data.type) {
                this.clearErrorsByType(data.type);
            } else {
                this.clearAllErrors();
            }
        });
    }

    /**
     * Initialize DOM elements for error display
     * @private
     */
    initializeDOM() {
        // Create error container if it doesn't exist
        this.errorContainer = document.getElementById('error-container');
        if (!this.errorContainer) {
            this.createErrorContainer();
        }
    }

    /**
     * Create error container element
     * @private
     */
    createErrorContainer() {
        this.errorContainer = document.createElement('div');
        this.errorContainer.id = 'error-container';
        this.errorContainer.className = 'error-container';
        
        // Insert at the top of the app container
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.insertBefore(this.errorContainer, appContainer.firstChild);
        } else {
            document.body.appendChild(this.errorContainer);
        }
    }

    /**
     * Show an error message
     * @param {Object} errorInfo - Processed error information
     */
    showError(errorInfo) {
        // Don't show duplicate errors
        if (this.activeErrors.has(errorInfo.id)) {
            return;
        }

        // Create error element
        const errorElement = this.createErrorElement(errorInfo);
        
        // Store error reference
        this.activeErrors.set(errorInfo.id, {
            element: errorElement,
            info: errorInfo,
            timestamp: Date.now()
        });

        // Add to container
        this.errorContainer.appendChild(errorElement);

        // Animate in
        setTimeout(() => {
            errorElement.classList.add('error-show');
        }, 10);

        // Auto-hide low severity errors
        if (errorInfo.severity === 'low') {
            setTimeout(() => {
                this.hideError(errorInfo.id);
            }, 5000);
        }

        // Emit error displayed event
        this.eventBus.emit('error:displayed', errorInfo);
    }

    /**
     * Create error element
     * @private
     */
    createErrorElement(errorInfo) {
        const errorElement = document.createElement('div');
        errorElement.className = `error-message error-${errorInfo.severity}`;
        errorElement.setAttribute('data-error-id', errorInfo.id);
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');

        const icon = errorInfo.icon || this.getDefaultIcon(errorInfo.severity);
        const canDismiss = errorInfo.severity !== 'critical';
        const showSuggestions = errorInfo.suggestions && errorInfo.suggestions.length > 0;

        errorElement.innerHTML = `
            <div class="error-content">
                <div class="error-header">
                    <div class="error-icon">${icon}</div>
                    <div class="error-text">
                        <div class="error-title">${errorInfo.category} Error</div>
                        <div class="error-description">${errorInfo.userMessage}</div>
                    </div>
                    ${canDismiss ? `
                        <button class="error-dismiss" aria-label="Dismiss error">
                            <span>✕</span>
                        </button>
                    ` : ''}
                </div>
                ${showSuggestions ? `
                    <div class="error-suggestions">
                        <div class="suggestions-title">Try these solutions:</div>
                        <ul class="suggestions-list">
                            ${errorInfo.suggestions.map(suggestion => 
                                `<li class="suggestion-item">${suggestion}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${errorInfo.severity === 'critical' ? `
                    <div class="error-actions">
                        <button class="btn btn-primary error-action" data-action="reload">
                            Reload Application
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        // Set up event listeners
        this.setupErrorElementListeners(errorElement, errorInfo);

        return errorElement;
    }

    /**
     * Set up event listeners for error element
     * @private
     */
    setupErrorElementListeners(errorElement, errorInfo) {
        // Dismiss button
        const dismissButton = errorElement.querySelector('.error-dismiss');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                this.hideError(errorInfo.id);
            });
        }

        // Action buttons
        const actionButtons = errorElement.querySelectorAll('.error-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleErrorAction(action, errorInfo);
            });
        });

        // Auto-dismiss on click for low severity errors
        if (errorInfo.severity === 'low') {
            errorElement.addEventListener('click', () => {
                this.hideError(errorInfo.id);
            });
        }
    }

    /**
     * Handle error action buttons
     * @private
     */
    handleErrorAction(action, errorInfo) {
        switch (action) {
            case 'reload':
                window.location.reload();
                break;
            case 'retry':
                this.eventBus.emit('error:retry', errorInfo);
                this.hideError(errorInfo.id);
                break;
            case 'reset':
                this.eventBus.emit('app:reset');
                this.hideError(errorInfo.id);
                break;
            default:
                console.warn('[ErrorDisplay] Unknown action:', action);
        }
    }

    /**
     * Hide an error message
     * @param {string} errorId - Error ID to hide
     */
    hideError(errorId) {
        const errorData = this.activeErrors.get(errorId);
        if (!errorData) {
            return;
        }

        const { element } = errorData;
        
        // Animate out
        element.classList.add('error-hide');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeErrors.delete(errorId);
        }, 300);

        // Emit error hidden event
        this.eventBus.emit('error:hidden', errorId);
    }

    /**
     * Clear errors by type
     * @param {string} errorType - Error type to clear
     */
    clearErrorsByType(errorType) {
        for (const [errorId, errorData] of this.activeErrors) {
            if (errorData.info.type === errorType) {
                this.hideError(errorId);
            }
        }
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        for (const errorId of this.activeErrors.keys()) {
            this.hideError(errorId);
        }
    }

    /**
     * Get default icon for error severity
     * @private
     */
    getDefaultIcon(severity) {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚠️';
            case 'low': return 'ℹ️';
            default: return '❓';
        }
    }

    /**
     * Get active error count
     * @returns {number} Number of active errors
     */
    getActiveErrorCount() {
        return this.activeErrors.size;
    }

    /**
     * Get active errors by severity
     * @param {string} severity - Error severity
     * @returns {Array} Array of active errors with specified severity
     */
    getActiveErrorsBySeverity(severity) {
        const errors = [];
        for (const errorData of this.activeErrors.values()) {
            if (errorData.info.severity === severity) {
                errors.push(errorData.info);
            }
        }
        return errors;
    }

    /**
     * Check if there are any critical errors
     * @returns {boolean} True if there are critical errors
     */
    hasCriticalErrors() {
        return this.getActiveErrorsBySeverity('critical').length > 0;
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            activeErrorCount: this.activeErrors.size,
            errorsBySeverity: {
                critical: this.getActiveErrorsBySeverity('critical').length,
                high: this.getActiveErrorsBySeverity('high').length,
                medium: this.getActiveErrorsBySeverity('medium').length,
                low: this.getActiveErrorsBySeverity('low').length
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorDisplay;
} else if (typeof window !== 'undefined') {
    window.ErrorDisplay = ErrorDisplay;
}