/**
 * EventBus - Simple publish/subscribe event system for component communication
 * 
 * Provides a centralized event system for coordinating between components
 * with debugging support for state transitions.
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
        this.debugMode = true; // Enable event logging for debugging
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (typeof event !== 'string') {
            throw new Error('Event name must be a string');
        }
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event).add(callback);

        if (this.debugMode) {
            console.log(`[EventBus] Subscribed to event: ${event}`);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) {
            return;
        }

        const eventListeners = this.listeners.get(event);
        eventListeners.delete(callback);

        // Clean up empty event listener sets
        if (eventListeners.size === 0) {
            this.listeners.delete(event);
        }

        if (this.debugMode) {
            console.log(`[EventBus] Unsubscribed from event: ${event}`);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        if (typeof event !== 'string') {
            throw new Error('Event name must be a string');
        }

        const timestamp = new Date().toISOString();
        
        // Log event for debugging
        if (this.debugMode) {
            console.log(`[EventBus] Emitting event: ${event}`, data);
        }

        // Store in event history for debugging
        this.addToHistory(event, data, timestamp);

        // Call all listeners for this event
        if (this.listeners.has(event)) {
            const eventListeners = this.listeners.get(event);
            
            eventListeners.forEach(callback => {
                try {
                    callback(data, event, timestamp);
                } catch (error) {
                    console.error(`[EventBus] Error in event listener for ${event}:`, error);
                    
                    // Emit error event for global error handling
                    if (event !== 'error') {
                        this.emit('error', {
                            type: 'listener_error',
                            originalEvent: event,
                            error: error,
                            timestamp: timestamp
                        });
                    }
                }
            });
        }
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data, eventName, timestamp) => {
            unsubscribe();
            callback(data, eventName, timestamp);
        });
        
        return unsubscribe;
    }

    /**
     * Check if there are any listeners for an event
     * @param {string} event - Event name
     * @returns {boolean} True if there are listeners
     */
    hasListeners(event) {
        return this.listeners.has(event) && this.listeners.get(event).size > 0;
    }

    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).size : 0;
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} [event] - Event name (optional, removes all if not provided)
     */
    removeAllListeners(event = null) {
        if (event) {
            this.listeners.delete(event);
            if (this.debugMode) {
                console.log(`[EventBus] Removed all listeners for event: ${event}`);
            }
        } else {
            this.listeners.clear();
            if (this.debugMode) {
                console.log('[EventBus] Removed all listeners for all events');
            }
        }
    }

    /**
     * Add event to history for debugging
     * @private
     */
    addToHistory(event, data, timestamp) {
        this.eventHistory.push({
            event,
            data,
            timestamp,
            listenerCount: this.getListenerCount(event)
        });

        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history for debugging
     * @param {number} [limit] - Maximum number of events to return
     * @returns {Array} Event history
     */
    getEventHistory(limit = null) {
        if (limit && limit > 0) {
            return this.eventHistory.slice(-limit);
        }
        return [...this.eventHistory];
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        if (this.debugMode) {
            console.log('[EventBus] Event history cleared');
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug information about the event bus
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        const eventCounts = {};
        for (const [event, listeners] of this.listeners) {
            eventCounts[event] = listeners.size;
        }

        return {
            totalEvents: this.listeners.size,
            eventCounts,
            historySize: this.eventHistory.length,
            debugMode: this.debugMode
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
} else if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}