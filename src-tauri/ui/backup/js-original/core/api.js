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
        'run_simulation': () => ({ success: true, simulationId: 'sim_' + Date.now() }),
        'start_simulation': () => ({ success: true, simulationId: 'sim_' + Date.now() }),
        'stop_simulation': () => ({ success: true, status: 'stopped' }),
        'get_simulation_status': () => ({ complete: false, progress: 0.5, error: null }),
        'get_progress': () => ({ complete: false, progress: 0.5, error: null }),
        'get_visualization_data': () => ({
            mesh_points: [
                {x: 0.0, y: 0.0, z: 0.0}, {x: 0.5, y: 0.0, z: 0.0}, {x: 1.0, y: 0.0, z: 0.0},
                {x: 0.0, y: 0.0, z: 1.0}, {x: 0.5, y: 0.0, z: 1.0}, {x: 1.0, y: 0.0, z: 1.0},
                {x: 0.0, y: 0.0, z: 2.0}, {x: 0.5, y: 0.0, z: 2.0}, {x: 1.0, y: 0.0, z: 2.0}
            ],
            time_steps: [
                {
                    time: 0.0,
                    temperature_values: [300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0]
                },
                {
                    time: 15.0,
                    temperature_values: [320.0, 350.0, 330.0, 400.0, 500.0, 450.0, 350.0, 400.0, 370.0]
                },
                {
                    time: 30.0,
                    temperature_values: [340.0, 400.0, 360.0, 500.0, 700.0, 550.0, 400.0, 500.0, 420.0]
                },
                {
                    time: 45.0,
                    temperature_values: [360.0, 450.0, 380.0, 550.0, 850.0, 650.0, 450.0, 600.0, 480.0]
                },
                {
                    time: 60.0,
                    temperature_values: [380.0, 500.0, 400.0, 600.0, 1000.0, 750.0, 500.0, 700.0, 550.0]
                }
            ],
            metadata: {
                min_temperature: 300.0,
                max_temperature: 1000.0,
                simulation_time: 60.0,
                mesh_resolution: [3, 3],
                total_time_steps: 5,
                time_interval: 15.0
            }
        }),
        'get_time_step_data': (params) => {
            const timeSteps = [
                { time: 0.0, temperature_values: [300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0, 300.0] },
                { time: 15.0, temperature_values: [320.0, 350.0, 330.0, 400.0, 500.0, 450.0, 350.0, 400.0, 370.0] },
                { time: 30.0, temperature_values: [340.0, 400.0, 360.0, 500.0, 700.0, 550.0, 400.0, 500.0, 420.0] },
                { time: 45.0, temperature_values: [360.0, 450.0, 380.0, 550.0, 850.0, 650.0, 450.0, 600.0, 480.0] },
                { time: 60.0, temperature_values: [380.0, 500.0, 400.0, 600.0, 1000.0, 750.0, 500.0, 700.0, 550.0] }
            ];
            const step = params.time_step || 0;
            return {
                ...timeSteps[step % timeSteps.length],
                step_index: step,
                total_steps: timeSteps.length
            };
        },
        'get_playback_info': () => ({
            total_time_steps: 5,
            time_interval: 15.0,
            total_time: 60.0,
            min_temperature: 300.0,
            max_temperature: 1000.0,
            mesh_resolution: [3, 3]
        }),
        
        // Project management mock responses
        'create_new_project': (params) => ({
            success: true,
            message: 'Project created successfully',
            project: {
                metadata: {
                    name: params.name || 'New Project',
                    description: params.description || 'A new plasma furnace simulation project',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: []
                },
                parameters: mockResponses['get_parameters'](),
                file_path: null
            }
        }),
        
        'save_project': (params) => ({
            success: true,
            message: 'Project saved successfully',
            project: {
                metadata: {
                    name: 'Mock Project',
                    description: 'A mock project for development',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: []
                },
                parameters: mockResponses['get_parameters'](),
                file_path: params.file_path
            }
        }),
        
        'load_project': (params) => ({
            success: true,
            message: 'Project loaded successfully',
            project: {
                metadata: {
                    name: 'Loaded Project',
                    description: 'A loaded project from file',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: ['loaded']
                },
                parameters: mockResponses['get_parameters'](),
                file_path: params.file_path
            }
        }),
        
        'get_current_project': () => ({
            success: true,
            message: 'Current project retrieved',
            project: null
        }),
        
        'update_project_parameters': (params) => ({
            success: true,
            message: 'Project parameters updated successfully',
            project: {
                metadata: {
                    name: 'Updated Project',
                    description: 'Project with updated parameters',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: []
                },
                parameters: params.parameters,
                file_path: null
            }
        }),
        
        'get_recent_files': () => ({
            success: true,
            files: [
                {
                    path: '/path/to/project1.pfp',
                    name: 'Industrial Furnace Test',
                    last_opened: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    path: '/path/to/project2.pfp',
                    name: 'Medical Waste Processing',
                    last_opened: new Date(Date.now() - 172800000).toISOString()
                }
            ]
        }),
        
        'get_project_templates': () => ({
            success: true,
            templates: [
                {
                    id: 'small_furnace',
                    name: 'Small Furnace',
                    description: 'Small-scale furnace for laboratory testing',
                    category: 'Laboratory',
                    parameters: mockResponses['get_parameters']()
                },
                {
                    id: 'industrial_furnace',
                    name: 'Industrial Furnace',
                    description: 'Large-scale industrial furnace for waste processing',
                    category: 'Industrial',
                    parameters: mockResponses['get_parameters']()
                },
                {
                    id: 'high_power_research',
                    name: 'High Power Research',
                    description: 'High-power plasma configuration for research applications',
                    category: 'Research',
                    parameters: mockResponses['get_parameters']()
                },
                {
                    id: 'medical_waste',
                    name: 'Medical Waste Processing',
                    description: 'Optimized for medical waste incineration',
                    category: 'Waste Management',
                    parameters: mockResponses['get_parameters']()
                }
            ]
        }),
        
        'create_project_from_template': (params) => ({
            success: true,
            message: `Project created from template: ${params.template_id}`,
            project: {
                metadata: {
                    name: params.name || 'Template Project',
                    description: 'Project created from template',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: [params.template_id]
                },
                parameters: mockResponses['get_parameters'](),
                file_path: null
            }
        }),
        
        'update_project_metadata': (params) => ({
            success: true,
            message: 'Project metadata updated successfully',
            project: {
                metadata: {
                    name: params.name || 'Updated Project',
                    description: params.description || 'Updated description',
                    created_at: new Date().toISOString(),
                    modified_at: new Date().toISOString(),
                    version: '1.0.0',
                    author: null,
                    tags: params.tags || []
                },
                parameters: mockResponses['get_parameters'](),
                file_path: null
            }
        })
    };
    
    return {
        // Parameter handling
        getParameters: async () => invoke('get_parameters'),
        
        saveParameters: async (parameters) => invoke('save_parameters', { parameters }),
        
        loadParameters: async (id) => invoke('load_parameters', { id }),
        
        // Simulation control
        runSimulation: async (parameters) => invoke('run_simulation', { parameters }),
        
        startSimulation: async (parameters) => invoke('start_simulation', { parameters }),
        
        stopSimulation: async (id) => invoke('stop_simulation', { id }),
        
        // Simulation status and progress
        getSimulationStatus: async (id) => invoke('get_simulation_status', { id }),
        
        getProgress: async (id) => invoke('get_progress', { id }),
        
        // Results and visualization
        getSimulationResults: async (id) => invoke('get_simulation_results', { id }),
        
        getVisualizationData: async (id) => invoke('get_visualization_data', { id }),
        
        // Playback controls
        getTimeStepData: async (simulationId, timeStep) => invoke('get_time_step_data', { simulation_id: simulationId, time_step: timeStep }),
        
        getPlaybackInfo: async (simulationId) => invoke('get_playback_info', { simulation_id: simulationId }),
        
        // Parameter templates
        getParameterTemplates: async () => invoke('get_parameter_templates'),
        
        loadParameterTemplate: async (templateId) => invoke('load_parameter_template', { templateId }),
        
        // Project management
        createNewProject: async (name, description, templateId) => invoke('create_new_project', { name, description, template_id: templateId }),
        
        saveProject: async (filePath) => invoke('save_project', { file_path: filePath }),
        
        loadProject: async (filePath) => invoke('load_project', { file_path: filePath }),
        
        getCurrentProject: async () => invoke('get_current_project'),
        
        updateProjectParameters: async (parameters) => invoke('update_project_parameters', { parameters }),
        
        getRecentFiles: async () => invoke('get_recent_files'),
        
        getProjectTemplates: async () => invoke('get_project_templates'),
        
        createProjectFromTemplate: async (templateId, name) => invoke('create_project_from_template', { template_id: templateId, name }),
        
        updateProjectMetadata: async (name, description, tags) => invoke('update_project_metadata', { name, description, tags }),
        
        // Generic invoke method for direct access
        invoke
    };
})();

// Export the API
window.PlasmaAPI = PlasmaAPI;
