/**
 * api.js
 * Responsibility: Interface with the Tauri backend API
 * 
 * Main functions:
 * - Parameter handling (save/load)
 * - Simulation control
 * - Data retrieval
 */

const PlasmaAPI = (function() {
    // Import Tauri API - using a try/catch to handle both Tauri and development environments
    let tauri;
    try {
        // This will be defined when running in Tauri environment
        tauri = window.__TAURI__;
    } catch (e) {
        console.warn('Tauri API not available, using mock data for development');
    }

    // Check if we're running in Tauri environment
    const isTauri = !!tauri;
    
    /**
     * Invoke a Tauri command
     * @param {string} command - Command name
     * @param {Object} params - Command parameters
     * @returns {Promise} - Promise that resolves with command result
     */
    const invoke = async (command, params = {}) => {
        if (isTauri) {
            try {
                return await tauri.invoke(command, params);
            } catch (error) {
                console.error(`Error invoking ${command}:`, error);
                throw error;
            }
        } else {
            // For development environment, return mock data
            console.log(`Mock invoke: ${command}`, params);
            return mockResponses[command] ? mockResponses[command](params) : null;
        }
    };
    
    // Mock responses for development without Tauri
    const mockResponses = {
        'get_parameters': () => ({
            geometry: {
                cylinderHeight: 2.0,
                cylinderDiameter: 1.0
            },
            torches: {
                count: 2,
                positions: [
                    { x: 0.2, y: 0.1, z: 0.5 },
                    { x: 0.8, y: 0.1, z: 0.5 }
                ],
                power: 100
            }
        }),
        'save_parameters': () => ({ success: true, id: 'param_' + Date.now() }),
        'run_simulation': () => ({ success: true, simulationId: 'sim_' + Date.now() })
    };
    
    return {
        // Parameter handling
        getParameters: async () => invoke('get_parameters'),
        
        saveParameters: async (parameters) => invoke('save_parameters', { parameters }),
        
        loadParameters: async (id) => invoke('load_parameters', { id }),
        
        // Simulation control
        runSimulation: async (parameters) => invoke('run_simulation', { parameters }),
        
        pauseSimulation: async (id) => invoke('pause_simulation', { id }),
        
        stopSimulation: async (id) => invoke('stop_simulation', { id }),
        
        // Simulation status
        getSimulationStatus: async (id) => invoke('get_simulation_status', { id }),
        
        // Results and visualization
        getSimulationResults: async (id) => invoke('get_simulation_results', { id }),
        
        // Parameter templates
        getParameterTemplates: async () => invoke('get_parameter_templates'),
        
        loadParameterTemplate: async (templateId) => invoke('load_parameter_template', { templateId })
    };
})();

// Export the API
window.PlasmaAPI = PlasmaAPI;
