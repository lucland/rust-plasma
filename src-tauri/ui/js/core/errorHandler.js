/**
 * ErrorHandler - Comprehensive error handling system
 * 
 * Provides categorized error types, user-friendly message formatting,
 * and error logging with debugging support.
 */
class ErrorHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.errorLog = [];
        this.maxLogSize = 200;
        this.debugMode = true;
        
        // Error type definitions with user-friendly messages
        this.errorTypes = {
            validation: {
                severity: 'low',
                recoverable: true,
                category: 'User Input',
                icon: '⚠️'
            },
            simulation: {
                severity: 'medium',
                recoverable: true,
                category: 'Simulation',
                icon: '🔧'
            },
            rendering: {
                severity: 'medium',
                recoverable: true,
                category: 'Visualization',
                icon: '🎨'
            },
            network: {
                severity: 'medium',
                recoverable: true,
                category: 'Connection',
                icon: '🌐'
            },
            state: {
                severity: 'high',
                recoverable: true,
                category: 'Application State',
                icon: '⚙️'
            },
            initialization: {
                severity: 'critical',
                recoverable: false,
                category: 'System',
                icon: '🚨'
            },
            unknown: {
                severity: 'medium',
                recoverable: false,
                category: 'Unknown',
                icon: '❓'
            }
        };

        // User-friendly error message templates
        this.messageTemplates = {
            validation: {
                parameter_range: 'The value for {field} must be between {min} and {max}.',
                parameter_required: 'The field {field} is required.',
                parameter_invalid: 'The value for {field} is not valid. {details}',
                material_invalid: 'Please select a valid material from the dropdown.',
                geometry_invalid: 'The furnace geometry settings are not valid. Please check height and radius values.'
            },
            simulation: {
                execution_failed: 'The simulation could not complete. This might be due to invalid parameters or a system issue.',
                timeout: 'The simulation took too long to complete and was stopped.',
                cancelled: 'The simulation was cancelled by the user.',
                backend_error: 'There was an error in the simulation engine: {details}',
                memory_error: 'The simulation ran out of memory. Try reducing the mesh resolution or simulation duration.'
            },
            rendering: {
                webgl_error: 'Your browser or graphics card does not support the required 3D features.',
                mesh_error: 'Could not display the 3D visualization. Try reducing the mesh resolution.',
                data_error: 'The simulation results could not be visualized. The data may be corrupted.',
                performance_error: 'The 3D visualization is running slowly. Consider reducing quality settings.'
            },
            network: {
                connection_failed: 'Could not connect to the simulation backend. Please check your connection.',
                timeout: 'The request timed out. Please try again.',
                server_error: 'The server encountered an error. Please try again later.'
            },
            state: {
                invalid_transition: 'The application is in an unexpected state. Resetting to default.',
                data_corruption: 'Application data may be corrupted. Resetting to default values.',
                sync_error: 'Components are out of sync. Refreshing the application state.'
            },
            initialization: {
                component_failed: 'A critical component failed to initialize: {component}',
                system_incompatible: 'Your system may not be compatible with this application.',
                resources_unavailable: 'Required system resources are not available.'
            }
        };

        // Recovery suggestions for different error types
        this.recoverySuggestions = {
            validation: [
                'Check that all parameter values are within the valid ranges',
                'Make sure all required fields are filled out',
                'Try using the default parameter values'
            ],
            simulation: [
                'Verify your parameter values are realistic',
                'Try reducing the simulation duration or time step',
                'Check if you have sufficient system resources'
            ],
            rendering: [
                'Try refreshing the page',
                'Reduce the mesh resolution in settings',
                'Update your graphics drivers',
                'Use a different browser if the problem persists'
            ],
            network: [
                'Check your internet connection',
                'Try refreshing the page',
                'Wait a moment and try again'
            ],
            state: [
                'Try refreshing the page',
                'Reset the application to default settings',
                'Clear your browser cache if the problem persists'
            ],
            initialization: [
                'Refresh the page',
                'Try using a different browser',
                'Check if your system meets the minimum requirements'
            ]
        };

        // Bind methods
        this.handle = this.handle.bind(this);
        this.formatUserMessage = this.formatUserMessage.bind(this);
        this.logError = this.logError.bind(this);
    }

    /**
     * Handle an error with comprehensive processing
     * @param {Error|Object} error - Error object or error data
     * @param {string} context - Error context for categorization
     * @param {Object} additionalData - Additional error data
     * @returns {Object} Processed error information
     */
    handle(error, context = 'unknown', additionalData = {}) {
        // Create comprehensive error info
        const errorInfo = this.processError(error, context, additionalData);
        
        // Log the error
        this.logError(errorInfo);
        
        // Format user-friendly message
        const userMessage = this.formatUserMessage(errorInfo);
        
        // Emit error event for UI handling
        this.eventBus.emit('error:handled', {
            ...errorInfo,
            userMessage,
            suggestions: this.getSuggestions(errorInfo.type)
        });

        // Log for debugging
        if (this.debugMode) {
            console.group(`[ErrorHandler] ${errorInfo.type.toUpperCase()} Error`);
            console.error('Original Error:', error);
            console.log('Context:', context);
            console.log('Processed Info:', errorInfo);
            console.log('User Message:', userMessage);
            console.groupEnd();
        }

        return {
            ...errorInfo,
            userMessage,
            suggestions: this.getSuggestions(errorInfo.type)
        };
    }

    /**
     * Process raw error into structured error information
     * @private
     */
    processError(error, context, additionalData) {
        const timestamp = new Date().toISOString();
        const errorMessage = this.extractErrorMessage(error);
        const errorType = this.categorizeError(error, context);
        const errorDetails = this.extractErrorDetails(error, additionalData);

        return {
            id: this.generateErrorId(),
            type: errorType,
            message: errorMessage,
            context: context,
            timestamp: timestamp,
            severity: this.errorTypes[errorType].severity,
            recoverable: this.errorTypes[errorType].recoverable,
            category: this.errorTypes[errorType].category,
            icon: this.errorTypes[errorType].icon,
            details: errorDetails,
            originalError: error,
            stack: error?.stack || null,
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...additionalData
        };
    }

    /**
     * Extract error message from various error formats
     * @private
     */
    extractErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        if (error?.message) {
            return error.message;
        }
        if (error?.error?.message) {
            return error.error.message;
        }
        if (error?.toString) {
            return error.toString();
        }
        return 'An unknown error occurred';
    }

    /**
     * Categorize error based on error object and context
     * @private
     */
    categorizeError(error, context) {
        // Context-based categorization
        if (context === 'validation') return 'validation';
        if (context === 'simulation') return 'simulation';
        if (context === 'rendering' || context === 'visualization') return 'rendering';
        if (context === 'network' || context === 'tauri') return 'network';
        if (context === 'state' || context === 'state_transition') return 'state';
        if (context === 'initialization') return 'initialization';

        // Error type-based categorization
        if (error?.name === 'ValidationError') return 'validation';
        if (error?.name === 'NetworkError') return 'network';
        if (error?.name === 'TypeError' && context === 'rendering') return 'rendering';
        if (error?.name === 'ReferenceError') return 'initialization';

        // Message-based categorization
        const message = this.extractErrorMessage(error).toLowerCase();
        if (message.includes('validation') || message.includes('invalid')) return 'validation';
        if (message.includes('network') || message.includes('connection')) return 'network';
        if (message.includes('webgl') || message.includes('rendering')) return 'rendering';
        if (message.includes('simulation') || message.includes('solver')) return 'simulation';
        if (message.includes('state') || message.includes('transition')) return 'state';

        return 'unknown';
    }

    /**
     * Extract additional error details
     * @private
     */
    extractErrorDetails(error, additionalData) {
        const details = { ...additionalData };

        // Extract validation details
        if (error?.field) details.field = error.field;
        if (error?.value) details.value = error.value;
        if (error?.min !== undefined) details.min = error.min;
        if (error?.max !== undefined) details.max = error.max;
        if (error?.expected) details.expected = error.expected;
        if (error?.actual) details.actual = error.actual;

        // Extract simulation details
        if (error?.progress !== undefined) details.progress = error.progress;
        if (error?.phase) details.phase = error.phase;
        if (error?.component) details.component = error.component;

        return details;
    }

    /**
     * Format user-friendly error message
     * @private
     */
    formatUserMessage(errorInfo) {
        const { type, message, details } = errorInfo;
        
        // Try to find a specific template
        const templates = this.messageTemplates[type];
        if (templates) {
            // Look for specific error patterns
            const lowerMessage = message.toLowerCase();
            
            if (type === 'validation') {
                if (details.field && details.min !== undefined && details.max !== undefined) {
                    return this.interpolateTemplate(templates.parameter_range, details);
                }
                if (details.field && lowerMessage.includes('required')) {
                    return this.interpolateTemplate(templates.parameter_required, details);
                }
                if (lowerMessage.includes('material')) {
                    return templates.material_invalid;
                }
                if (lowerMessage.includes('geometry')) {
                    return templates.geometry_invalid;
                }
                return this.interpolateTemplate(templates.parameter_invalid, { ...details, details: message });
            }
            
            if (type === 'simulation') {
                if (lowerMessage.includes('timeout')) {
                    return templates.timeout;
                }
                if (lowerMessage.includes('cancel')) {
                    return templates.cancelled;
                }
                if (lowerMessage.includes('memory')) {
                    return templates.memory_error;
                }
                if (details.backendError) {
                    return this.interpolateTemplate(templates.backend_error, { details: details.backendError });
                }
                return templates.execution_failed;
            }
            
            if (type === 'rendering') {
                if (lowerMessage.includes('webgl')) {
                    return templates.webgl_error;
                }
                if (lowerMessage.includes('mesh')) {
                    return templates.mesh_error;
                }
                if (lowerMessage.includes('data')) {
                    return templates.data_error;
                }
                if (lowerMessage.includes('performance')) {
                    return templates.performance_error;
                }
            }
            
            if (type === 'network') {
                if (lowerMessage.includes('timeout')) {
                    return templates.timeout;
                }
                if (lowerMessage.includes('server')) {
                    return templates.server_error;
                }
                return templates.connection_failed;
            }
            
            if (type === 'state') {
                if (lowerMessage.includes('transition')) {
                    return templates.invalid_transition;
                }
                if (lowerMessage.includes('corruption')) {
                    return templates.data_corruption;
                }
                return templates.sync_error;
            }
            
            if (type === 'initialization') {
                if (details.component) {
                    return this.interpolateTemplate(templates.component_failed, details);
                }
                if (lowerMessage.includes('compatible')) {
                    return templates.system_incompatible;
                }
                return templates.resources_unavailable;
            }
        }

        // Fallback to generic message
        return this.createGenericMessage(errorInfo);
    }

    /**
     * Interpolate template with data
     * @private
     */
    interpolateTemplate(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Create generic error message
     * @private
     */
    createGenericMessage(errorInfo) {
        const { category, message, severity } = errorInfo;
        
        if (severity === 'critical') {
            return `A critical ${category.toLowerCase()} error occurred. Please refresh the page and try again.`;
        }
        
        if (severity === 'high') {
            return `A ${category.toLowerCase()} error occurred: ${message}. The application will attempt to recover.`;
        }
        
        return `${category} error: ${message}`;
    }

    /**
     * Get recovery suggestions for error type
     * @private
     */
    getSuggestions(errorType) {
        return this.recoverySuggestions[errorType] || [
            'Try refreshing the page',
            'Check your internet connection',
            'Contact support if the problem persists'
        ];
    }

    /**
     * Log error to internal log
     * @private
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Maintain log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // Also log to console for debugging
        if (this.debugMode) {
            const logLevel = this.getLogLevel(errorInfo.severity);
            console[logLevel](`[ErrorHandler] ${errorInfo.category}:`, errorInfo.message);
        }
    }

    /**
     * Get appropriate console log level for severity
     * @private
     */
    getLogLevel(severity) {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warn';
            case 'low': return 'info';
            default: return 'log';
        }
    }

    /**
     * Generate unique error ID
     * @private
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            bySeverity: {},
            recent: this.errorLog.slice(-10)
        };

        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear error log
     * @param {string} [type] - Optional error type to clear
     */
    clearLog(type = null) {
        if (type) {
            this.errorLog = this.errorLog.filter(error => error.type !== type);
        } else {
            this.errorLog = [];
        }
        
        if (this.debugMode) {
            console.log(`[ErrorHandler] Cleared ${type ? type + ' ' : ''}error log`);
        }
    }

    /**
     * Export error log for debugging
     * @returns {string} JSON string of error log
     */
    exportLog() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errors: this.errorLog
        }, null, 2);
    }

    /**
     * Set debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        console.log(`[ErrorHandler] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            errorCount: this.errorLog.length,
            errorTypes: Object.keys(this.errorTypes),
            debugMode: this.debugMode,
            stats: this.getErrorStats()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}