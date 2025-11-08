/**
 * main.js
 * Responsibility: Main application entry point that initializes all components
 * 
 * Main functions:
 * - Application initialization
 * - Tab navigation
 * - Global event handling
 * - Parameter persistence
 * - Debug panel initialization
 */

/**
 * Plasma Furnace Simulator Application
 * Main entry point for the application UI
 */
const PlasmaApp = (function() {
    /**
     * Initialize the application
     */
    const init = () => {
        // Initialize tab system with callback to handle tab changes
        PlasmaUtils.TabSystem.init('.nav-link', '.tab-content', 'active', handleTabChange);
        
        // Initialize global event listeners
        initEventListeners();
        
        // Initialize project buttons
        initProjectButtons();
        
        // Initialize geometry module
        if (typeof initGeometry === 'function') {
            initGeometry();
        }
        
        // Initialize debug panel
        if (typeof initDebugPanel === 'function') {
            initDebugPanel();
        }
        
        // Update status
        PlasmaUtils.Status.update('Ready', 'info');
        
        console.log('Plasma Furnace Simulator UI initialized');
    };
    
    /**
     * Handle tab changes and ensure parameter values persist
     */
    const handleTabChange = (newTabId, previousTabId) => {
        console.log(`Tab changed from ${previousTabId} to ${newTabId}`);
        
        // If we're leaving the parameters tab, store the current values
        if (previousTabId === 'parameters-tab') {
            saveCurrentParameters();
        }
        
        // If we're entering the parameters tab, restore values
        if (newTabId === 'parameters-tab') {
            restoreParameters();
        }
    };
    
    /**
     * Initialize global event listeners
     */
    const initEventListeners = () => {
        // Parameter change events
        document.addEventListener('plasma-parameter-changed', (event) => {
            const { group, name, value } = event.detail;
            console.log(`Parameter changed: ${group}.${name} = ${value}`);
            
            // We could update visualizations or other UI elements based on parameter changes
        });
        
        // Handle "Run Simulation" button
        const runSimButton = PlasmaUtils.DOM.getById('run-simulation');
        if (runSimButton) {
            runSimButton.addEventListener('click', async () => {
                await runSimulation();
            });
        }
        
        // Handle simulation control buttons
        const startSimBtn = PlasmaUtils.DOM.getById('start-sim');
        const pauseSimBtn = PlasmaUtils.DOM.getById('pause-sim');
        const stopSimBtn = PlasmaUtils.DOM.getById('stop-sim');
        
        if (startSimBtn) {
            startSimBtn.addEventListener('click', async () => {
                startSimBtn.disabled = true;
                pauseSimBtn.disabled = false;
                stopSimBtn.disabled = false;
                await startSimulation();
            });
        }
        
        if (pauseSimBtn) {
            pauseSimBtn.addEventListener('click', async () => {
                pauseSimBtn.disabled = true;
                startSimBtn.disabled = false;
                await pauseSimulation();
            });
        }
        
        if (stopSimBtn) {
            stopSimBtn.addEventListener('click', async () => {
                startSimBtn.disabled = false;
                pauseSimBtn.disabled = true;
                stopSimBtn.disabled = true;
                await stopSimulation();
            });
        }
    };
    
    /**
     * Initialize project buttons (save/load)
     */
    const initProjectButtons = () => {
        const saveProjectBtn = PlasmaUtils.DOM.getById('save-project');
        const loadProjectBtn = PlasmaUtils.DOM.getById('load-project');
        
        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', async () => {
                if (PlasmaParameters) {
                    const result = await PlasmaParameters.saveParameters();
                    if (result) {
                        PlasmaUtils.Status.update('Project saved successfully', 'success');
                    }
                }
            });
        }
        
        if (loadProjectBtn) {
            loadProjectBtn.addEventListener('click', async () => {
                // In a real app, we'd have a file picker or project selection UI
                // For now, just attempt to load default parameters
                try {
                    const params = await PlasmaAPI.getParameters();
                    if (params && PlasmaParameters) {
                        PlasmaParameters.loadParameters(params);
                        PlasmaUtils.Status.update('Project loaded successfully', 'success');
                    }
                } catch (error) {
                    console.error('Failed to load project:', error);
                    PlasmaUtils.Status.update('Failed to load project', 'error');
                }
            });
        }
    };
    
    /**
     * Start the simulation with current parameters
     */
    const startSimulation = async () => {
        try {
            PlasmaUtils.Status.update('Starting simulation...', 'info');
            
            // Get current parameters from the parameters module
            let parameters = {};
            if (PlasmaParameters) {
                parameters = PlasmaParameters.getParameters();
            }
            
            // Show simulation controls
            const simControls = PlasmaUtils.DOM.getById('simulation-controls');
            if (simControls) {
                simControls.classList.remove('d-none');
            }
            
            // Call the start simulation API
            const result = await PlasmaAPI.startSimulation(parameters);
            
            if (result && result.success) {
                PlasmaUtils.Status.update('Simulation running...', 'success');
                
                // Set up interval to check simulation status
                let simulationId = result.simulationId;
                checkSimulationProgress(simulationId);
                
                return simulationId;
            } else {
                PlasmaUtils.Status.update('Failed to start simulation', 'error');
                return null;
            }
        } catch (error) {
            console.error('Error starting simulation:', error);
            PlasmaUtils.Status.update('Error starting simulation', 'error');
            return null;
        }
    };

    /**
     * Run the simulation with current parameters
     */
    const runSimulation = async () => {
        try {
            PlasmaUtils.Status.update('Starting simulation...', 'info');
            
            // Get current parameters from the parameters module
            let parameters = {};
            if (PlasmaParameters) {
                parameters = PlasmaParameters.getParameters();
            }
            
            // Show simulation controls
            const simControls = PlasmaUtils.DOM.getById('simulation-controls');
            if (simControls) {
                simControls.classList.remove('d-none');
            }
            
            // Call the simulation API
            const result = await PlasmaAPI.runSimulation(parameters);
            
            if (result && result.success) {
                PlasmaUtils.Status.update('Simulation running...', 'success');
                
                // Set up interval to check simulation status
                let simulationId = result.simulationId;
                checkSimulationProgress(simulationId);
                
                return simulationId;
            } else {
                PlasmaUtils.Status.update('Failed to start simulation', 'error');
                return null;
            }
        } catch (error) {
            console.error('Error running simulation:', error);
            PlasmaUtils.Status.update('Error running simulation', 'error');
            return null;
        }
    };
    
    /**
     * Check simulation progress
     * @param {string} simId - Simulation ID
     */
    const checkSimulationProgress = async (simId) => {
        if (!simId) return;
        
        try {
            const status = await PlasmaAPI.getSimulationStatus(simId);
            
            if (status.complete) {
                PlasmaUtils.Status.update('Simulation complete', 'success');
                
                // Load and display visualization data
                if (PlasmaVisualization) {
                    try {
                        await PlasmaVisualization.loadVisualizationData(simId);
                        
                        // Switch to visualization tab to show results
                        const visualizationLink = PlasmaUtils.DOM.get('[data-tab="visualization"]');
                        if (visualizationLink) {
                            visualizationLink.click();
                        }
                    } catch (error) {
                        console.error('Failed to load visualization data:', error);
                        PlasmaUtils.Status.update('Simulation complete, but visualization failed to load', 'warning');
                    }
                }
                
                // Reset simulation controls
                resetSimulationControls();
            } else if (status.error) {
                PlasmaUtils.Status.update(`Simulation error: ${status.error}`, 'error');
                resetSimulationControls();
            } else {
                // Update progress if available
                if (status.progress) {
                    PlasmaUtils.Status.update(`Simulation progress: ${Math.round(status.progress * 100)}%`, 'info');
                }
                
                // Check again after a delay
                setTimeout(() => checkSimulationProgress(simId), 1000);
            }
        } catch (error) {
            console.error('Error checking simulation status:', error);
            PlasmaUtils.Status.update('Error checking simulation status', 'error');
        }
    };
    
    /**
     * Pause the current simulation
     */
    const pauseSimulation = async () => {
        // Implementation would depend on having a current simulation ID stored
        PlasmaUtils.Status.update('Simulation paused', 'info');
    };
    
    /**
     * Stop the current simulation
     */
    const stopSimulation = async () => {
        try {
            // In a real implementation, we'd store the current simulation ID
            // For now, use a placeholder ID
            const simulationId = 'current_sim';
            
            const result = await PlasmaAPI.stopSimulation(simulationId);
            
            if (result && result.success) {
                PlasmaUtils.Status.update('Simulation stopped', 'warning');
            } else {
                PlasmaUtils.Status.update('Failed to stop simulation', 'error');
            }
        } catch (error) {
            console.error('Error stopping simulation:', error);
            PlasmaUtils.Status.update('Error stopping simulation', 'error');
        }
        
        resetSimulationControls();
    };
    
    /**
     * Reset simulation control buttons
     */
    const resetSimulationControls = () => {
        const startSimBtn = PlasmaUtils.DOM.getById('start-sim');
        const pauseSimBtn = PlasmaUtils.DOM.getById('pause-sim');
        const stopSimBtn = PlasmaUtils.DOM.getById('stop-sim');
        
        if (startSimBtn) startSimBtn.disabled = false;
        if (pauseSimBtn) pauseSimBtn.disabled = true;
        if (stopSimBtn) stopSimBtn.disabled = true;
    };
    
    /**
     * Save current parameter values to local storage
     */
    const saveCurrentParameters = () => {
        try {
            // Save geometry parameters
            const heightInput = document.getElementById('cylinder-height');
            const diameterInput = document.getElementById('cylinder-diameter');
            
            if (heightInput && diameterInput) {
                const geometryParams = {
                    height: heightInput.value,
                    diameter: diameterInput.value
                };
                localStorage.setItem('plasma-geometry-params', JSON.stringify(geometryParams));
                console.log('Parameters saved:', geometryParams);
            }
            
            // Save other parameter groups as needed
        } catch (error) {
            console.error('Error saving parameters:', error);
        }
    };
    
    /**
     * Restore parameters from local storage
     */
    const restoreParameters = () => {
        try {
            // Restore geometry parameters
            const geometryParamsStr = localStorage.getItem('plasma-geometry-params');
            if (geometryParamsStr) {
                const geometryParams = JSON.parse(geometryParamsStr);
                const heightInput = document.getElementById('cylinder-height');
                const diameterInput = document.getElementById('cylinder-diameter');
                
                if (heightInput && geometryParams.height) {
                    heightInput.value = geometryParams.height;
                }
                
                if (diameterInput && geometryParams.diameter) {
                    diameterInput.value = geometryParams.diameter;
                }
                
                console.log('Parameters restored:', geometryParams);
            }
            
            // Restore other parameter groups as needed
        } catch (error) {
            console.error('Error restoring parameters:', error);
        }
    };
    
    // Return public API
    return {
        init,
        saveCurrentParameters,
        restoreParameters,
        runSimulation,
        startSimulation,
        stopSimulation
    };
})();

// Initialize app when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if dependencies are available
    if (!window.PlasmaUtils) {
        console.error('PlasmaUtils not loaded! Check that utils.js is properly included.');
        return;
    }
    
    if (!window.PlasmaAPI) {
        console.error('PlasmaAPI not loaded! Check that api.js is properly included.');
        return;
    }
    
    // Initialize the application
    PlasmaApp.init();
});
