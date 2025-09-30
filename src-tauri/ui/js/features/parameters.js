/**
 * parameters.js
 * Responsibility: Handle parameter input, validation, and management
 * 
 * Main functions:
 * - Parameter form initialization
 * - Parameter validation with real-time feedback
 * - Material property management
 * - Mesh preset handling
 * - Torch configuration
 * - Parameter serialization/deserialization
 */

const PlasmaParameters = (function() {
    // State
    let currentParameters = {};
    let parameterGroups = [
        'geometry',
        'mesh', 
        'torches',
        'materials',
        'boundary',
        'simulation'
    ];

    // Material property database
    const materialDatabase = {
        'carbon-steel': {
            name: 'Carbon Steel',
            density: 7850,
            thermalConductivity: 50.0,
            specificHeat: 460,
            emissivity: 0.8,
            meltingPoint: 1811
        },
        'stainless-steel': {
            name: 'Stainless Steel',
            density: 8000,
            thermalConductivity: 16.0,
            specificHeat: 500,
            emissivity: 0.28,
            meltingPoint: 1673
        },
        'aluminum': {
            name: 'Aluminum',
            density: 2700,
            thermalConductivity: 237.0,
            specificHeat: 900,
            emissivity: 0.09,
            meltingPoint: 933
        },
        'copper': {
            name: 'Copper',
            density: 8960,
            thermalConductivity: 401.0,
            specificHeat: 385,
            emissivity: 0.04,
            meltingPoint: 1358
        },
        'iron': {
            name: 'Iron',
            density: 7874,
            thermalConductivity: 80.0,
            specificHeat: 449,
            emissivity: 0.64,
            meltingPoint: 1811
        },
        'graphite': {
            name: 'Graphite',
            density: 2200,
            thermalConductivity: 168.0,
            specificHeat: 710,
            emissivity: 0.85,
            meltingPoint: 3800
        },
        'concrete': {
            name: 'Concrete',
            density: 2300,
            thermalConductivity: 1.7,
            specificHeat: 880,
            emissivity: 0.94,
            meltingPoint: 1473
        },
        'glass': {
            name: 'Glass',
            density: 2500,
            thermalConductivity: 1.4,
            specificHeat: 840,
            emissivity: 0.94,
            meltingPoint: 1473
        },
        'wood': {
            name: 'Wood',
            density: 600,
            thermalConductivity: 0.17,
            specificHeat: 1600,
            emissivity: 0.9,
            meltingPoint: 573
        },
        'ceramic': {
            name: 'Ceramic',
            density: 3800,
            thermalConductivity: 2.0,
            specificHeat: 750,
            emissivity: 0.95,
            meltingPoint: 2073
        }
    };

    // Mesh presets
    const meshPresets = {
        'fast': { nr: 50, nz: 50, description: 'Fast (50×50) - Quick simulation, lower accuracy' },
        'balanced': { nr: 100, nz: 100, description: 'Balanced (100×100) - Good balance of speed and accuracy' },
        'high': { nr: 200, nz: 200, description: 'High (200×200) - High accuracy, slower simulation' }
    };

    let torchCount = 0;
    
    /**
     * Initialize parameter functionality
     */
    const init = () => {
        if (!window.PlasmaUtils) {
            console.error("PlasmaUtils not loaded!");
            return;
        }
        
        // Initialize parameter group tabs
        PlasmaUtils.ParameterTabs.init('.tab', '.parameter-group');
        
        // Initialize tooltips
        PlasmaUtils.Tooltips.init();
        
        // Initialize all parameter sections
        initGeometryParameters();
        initMeshParameters();
        initTorchParameters();
        initMaterialParameters();
        initBoundaryParameters();
        initSimulationParameters();
        
        // Initialize parameter actions
        initParameterActions();
        
        // Load default parameters
        loadDefaultParameters();
        
        // Log initialization
        console.log("Parameter system initialized");
    };
    
    /**
     * Initialize geometry parameters
     */
    const initGeometryParameters = () => {
        const heightInput = PlasmaUtils.DOM.getById('cylinder-height');
        const radiusInput = PlasmaUtils.DOM.getById('cylinder-radius');
        
        [heightInput, radiusInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    validateAndUpdateParameter(input);
                });
            }
        });
    };

    /**
     * Initialize mesh parameters
     */
    const initMeshParameters = () => {
        const meshPresetSelect = PlasmaUtils.DOM.getById('mesh-preset');
        const customMeshSettings = PlasmaUtils.DOM.getById('custom-mesh-settings');
        const nrInput = PlasmaUtils.DOM.getById('mesh-nr');
        const nzInput = PlasmaUtils.DOM.getById('mesh-nz');

        if (meshPresetSelect) {
            meshPresetSelect.addEventListener('change', () => {
                const preset = meshPresetSelect.value;
                
                if (preset === 'custom') {
                    customMeshSettings.classList.remove('d-none');
                } else {
                    customMeshSettings.classList.add('d-none');
                    if (meshPresets[preset]) {
                        nrInput.value = meshPresets[preset].nr;
                        nzInput.value = meshPresets[preset].nz;
                    }
                }
                updateMeshInfo();
            });
        }

        [nrInput, nzInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    validateAndUpdateParameter(input);
                    updateMeshInfo();
                });
            }
        });

        // Initialize mesh info
        updateMeshInfo();
    };

    /**
     * Initialize torch parameters
     */
    const initTorchParameters = () => {
        const addTorchBtn = PlasmaUtils.DOM.getById('add-torch');
        
        if (addTorchBtn) {
            addTorchBtn.addEventListener('click', () => {
                addTorchConfiguration();
            });
        }

        // Add initial torch
        addTorchConfiguration();
    };

    /**
     * Initialize material parameters
     */
    const initMaterialParameters = () => {
        const materialSelect = PlasmaUtils.DOM.getById('material-type');
        const customMaterialDiv = PlasmaUtils.DOM.getById('custom-material-properties');
        
        if (materialSelect) {
            materialSelect.addEventListener('change', () => {
                const materialType = materialSelect.value;
                
                if (materialType === 'custom') {
                    customMaterialDiv.classList.remove('d-none');
                    enableCustomMaterialInputs();
                } else {
                    customMaterialDiv.classList.add('d-none');
                    updateMaterialProperties(materialType);
                }
            });
        }

        // Initialize with default material
        updateMaterialProperties('carbon-steel');
    };

    /**
     * Initialize boundary parameters
     */
    const initBoundaryParameters = () => {
        const wallBoundarySelect = PlasmaUtils.DOM.getById('wall-boundary-type');
        const convectionSettings = PlasmaUtils.DOM.getById('convection-settings');
        
        if (wallBoundarySelect) {
            wallBoundarySelect.addEventListener('change', () => {
                const boundaryType = wallBoundarySelect.value;
                
                if (boundaryType === 'mixed') {
                    convectionSettings.classList.remove('d-none');
                } else {
                    convectionSettings.classList.add('d-none');
                }
            });
        }

        // Initialize validation for all boundary inputs
        const boundaryInputs = PlasmaUtils.DOM.getAll('#boundary input[type="number"]');
        boundaryInputs.forEach(input => {
            input.addEventListener('input', () => {
                validateAndUpdateParameter(input);
            });
        });
    };

    /**
     * Initialize simulation parameters
     */
    const initSimulationParameters = () => {
        const simulationInputs = PlasmaUtils.DOM.getAll('#simulation input[type="number"], #simulation select');
        
        simulationInputs.forEach(input => {
            input.addEventListener('input', () => {
                validateAndUpdateParameter(input);
            });
        });
    };

    /**
     * Initialize parameter actions
     */
    const initParameterActions = () => {
        const resetBtn = PlasmaUtils.DOM.getById('reset-parameters');
        const validateBtn = PlasmaUtils.DOM.getById('validate-parameters');
        const applyBtn = PlasmaUtils.DOM.getById('apply-parameters');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetToDefaults();
            });
        }

        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                validateAllParameters();
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                applyParameters();
            });
        }
    };
    
    /**
     * Validate and update parameter from input
     * @param {HTMLInputElement} input - The input element
     */
    const validateAndUpdateParameter = (input) => {
        let isValid = true;
        
        // Validate based on input type
        if (input.type === 'number') {
            isValid = PlasmaUtils.FormValidation.validateNumeric(input);
        }
        
        // Update parameter if valid
        if (isValid) {
            updateParameterFromInput(input);
        }
        
        // Update validation status
        updateValidationStatus();
        
        return isValid;
    };

    /**
     * Update the internal parameter object from an input element
     * @param {HTMLInputElement} input - The input element
     */
    const updateParameterFromInput = (input) => {
        const paramId = input.id;
        const parts = paramId.split('-');
        let group, name;
        
        // Map input IDs to parameter structure
        if (parts[0] === 'cylinder') {
            group = 'geometry';
            name = 'cylinder' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        } else if (parts[0] === 'mesh') {
            group = 'mesh';
            name = parts.slice(1).join('').replace(/([A-Z])/g, (match, letter) => letter.toLowerCase());
        } else if (parts[0] === 'material' || parts[0] === 'custom') {
            group = 'materials';
            name = parts.slice(1).join('').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        } else {
            group = parts[0];
            name = parts.slice(1).join('').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        }
        
        // Ensure group exists
        if (!currentParameters[group]) {
            currentParameters[group] = {};
        }
        
        // Update parameter value
        let value = input.value;
        if (input.type === 'number') {
            value = parseFloat(value);
        } else if (input.type === 'checkbox') {
            value = input.checked;
        }
        
        currentParameters[group][name] = value;
        
        // Trigger parameter change event
        const event = new CustomEvent('plasma-parameter-changed', {
            detail: { group, name, value, input }
        });
        document.dispatchEvent(event);
    };

    /**
     * Update mesh information display
     */
    const updateMeshInfo = () => {
        const nrInput = PlasmaUtils.DOM.getById('mesh-nr');
        const nzInput = PlasmaUtils.DOM.getById('mesh-nz');
        const totalNodesSpan = PlasmaUtils.DOM.getById('total-nodes');
        const estimatedMemorySpan = PlasmaUtils.DOM.getById('estimated-memory');
        const expectedPerformanceSpan = PlasmaUtils.DOM.getById('expected-performance');
        
        if (nrInput && nzInput && totalNodesSpan) {
            const nr = parseInt(nrInput.value) || 100;
            const nz = parseInt(nzInput.value) || 100;
            const totalNodes = nr * nz;
            
            // Update display
            totalNodesSpan.textContent = totalNodes.toLocaleString();
            
            // Estimate memory usage (rough calculation)
            const memoryMB = Math.round(totalNodes * 8 * 10 / 1024 / 1024); // 8 bytes per double, ~10 arrays
            estimatedMemorySpan.textContent = `~${memoryMB} MB`;
            
            // Estimate performance
            let performance = '';
            if (totalNodes < 5000) {
                performance = '~30 seconds';
            } else if (totalNodes < 20000) {
                performance = '~2 minutes';
            } else if (totalNodes < 50000) {
                performance = '~5 minutes';
            } else {
                performance = '~15+ minutes';
            }
            expectedPerformanceSpan.textContent = performance;
        }
    };

    /**
     * Add a new torch configuration
     */
    const addTorchConfiguration = () => {
        torchCount++;
        const torchList = PlasmaUtils.DOM.getById('torch-list');
        
        const torchDiv = PlasmaUtils.DOM.create('div', {
            className: 'torch-config',
            id: `torch-${torchCount}`
        });
        
        torchDiv.innerHTML = `
            <div class="torch-config-header">
                <div class="torch-config-title">Torch ${torchCount}</div>
                <div class="torch-config-actions">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="PlasmaParameters.removeTorch(${torchCount})">Remove</button>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group-col">
                    <label class="form-label">
                        Position R
                        <span class="parameter-info" data-info="Radial position (0 = center, 1 = wall)">?</span>
                    </label>
                    <div class="form-group-with-units">
                        <input type="number" class="form-input" id="torch-${torchCount}-r" 
                            min="0" max="1" step="0.1" value="0.5" required>
                        <span class="form-unit-addon">-</span>
                    </div>
                </div>
                <div class="form-group-col">
                    <label class="form-label">
                        Position Z
                        <span class="parameter-info" data-info="Axial position (0 = bottom, 1 = top)">?</span>
                    </label>
                    <div class="form-group-with-units">
                        <input type="number" class="form-input" id="torch-${torchCount}-z"
                            min="0" max="1" step="0.1" value="0.1" required>
                        <span class="form-unit-addon">-</span>
                    </div>
                </div>
            </div>
            
            <div class="form-group-row">
                <div class="form-group-col">
                    <label class="form-label">
                        Power
                        <span class="parameter-info" data-info="Torch power output. Range: 10-500 kW">?</span>
                    </label>
                    <div class="form-group-with-units">
                        <input type="number" class="form-input" id="torch-${torchCount}-power"
                            min="10" max="500" step="1" value="100" required>
                        <span class="form-unit-addon">kW</span>
                    </div>
                </div>
                <div class="form-group-col">
                    <label class="form-label">
                        Efficiency
                        <span class="parameter-info" data-info="Torch efficiency. Range: 0.5-0.95">?</span>
                    </label>
                    <div class="form-group-with-units">
                        <input type="number" class="form-input" id="torch-${torchCount}-efficiency"
                            min="0.5" max="0.95" step="0.01" value="0.8" required>
                        <span class="form-unit-addon">-</span>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    Gaussian Spread (σ)
                    <span class="parameter-info" data-info="Heat distribution spread parameter. Range: 0.01-0.5">?</span>
                </label>
                <div class="form-group-with-units">
                    <input type="number" class="form-input" id="torch-${torchCount}-sigma"
                        min="0.01" max="0.5" step="0.01" value="0.1" required>
                    <span class="form-unit-addon">m</span>
                </div>
            </div>
        `;
        
        torchList.appendChild(torchDiv);
        
        // Initialize validation for new torch inputs
        const torchInputs = PlasmaUtils.DOM.getAll(`#torch-${torchCount} input[type="number"]`);
        torchInputs.forEach(input => {
            input.addEventListener('input', () => {
                validateAndUpdateParameter(input);
            });
        });
        
        // Initialize tooltips for new elements
        PlasmaUtils.Tooltips.init(`#torch-${torchCount} .parameter-info`);
    };

    /**
     * Remove a torch configuration
     * @param {number} torchId - ID of torch to remove
     */
    const removeTorch = (torchId) => {
        const torchDiv = PlasmaUtils.DOM.getById(`torch-${torchId}`);
        if (torchDiv) {
            torchDiv.remove();
        }
    };

    /**
     * Update material properties display
     * @param {string} materialType - Material type key
     */
    const updateMaterialProperties = (materialType) => {
        const material = materialDatabase[materialType];
        if (!material) return;
        
        const densityInput = PlasmaUtils.DOM.getById('material-density');
        const conductivityInput = PlasmaUtils.DOM.getById('material-conductivity');
        const specificHeatInput = PlasmaUtils.DOM.getById('material-specific-heat');
        const emissivityInput = PlasmaUtils.DOM.getById('material-emissivity');
        const meltingPointInput = PlasmaUtils.DOM.getById('material-melting-point');
        
        if (densityInput) densityInput.value = material.density;
        if (conductivityInput) conductivityInput.value = material.thermalConductivity;
        if (specificHeatInput) specificHeatInput.value = material.specificHeat;
        if (emissivityInput) emissivityInput.value = material.emissivity;
        if (meltingPointInput) meltingPointInput.value = material.meltingPoint;
        
        // Update parameters
        currentParameters.materials = {
            materialType: materialType,
            density: material.density,
            thermalConductivity: material.thermalConductivity,
            specificHeat: material.specificHeat,
            emissivity: material.emissivity,
            meltingPoint: material.meltingPoint
        };
    };

    /**
     * Enable custom material inputs
     */
    const enableCustomMaterialInputs = () => {
        const customInputs = PlasmaUtils.DOM.getAll('#custom-material-properties input');
        customInputs.forEach(input => {
            input.removeAttribute('readonly');
            input.addEventListener('input', () => {
                validateAndUpdateParameter(input);
            });
        });
    };
    
    /**
     * Update validation status display
     */
    const updateValidationStatus = () => {
        const statusSpan = PlasmaUtils.DOM.getById('validation-status');
        if (!statusSpan) return;
        
        const invalidInputs = PlasmaUtils.DOM.getAll('.form-input.is-invalid');
        
        if (invalidInputs.length === 0) {
            statusSpan.textContent = 'All parameters valid';
            statusSpan.className = 'text-success';
        } else {
            statusSpan.textContent = `${invalidInputs.length} parameter(s) need attention`;
            statusSpan.className = 'text-warning';
        }
    };

    /**
     * Validate all parameters
     */
    const validateAllParameters = () => {
        const allInputs = PlasmaUtils.DOM.getAll('.form-input[type="number"]');
        let allValid = true;
        
        allInputs.forEach(input => {
            const isValid = PlasmaUtils.FormValidation.validateNumeric(input);
            if (!isValid) allValid = false;
        });
        
        updateValidationStatus();
        
        if (allValid) {
            PlasmaUtils.Status.update('All parameters validated successfully', 'success');
        } else {
            PlasmaUtils.Status.update('Some parameters are invalid', 'warning');
        }
        
        return allValid;
    };

    /**
     * Reset parameters to defaults
     */
    const resetToDefaults = () => {
        if (confirm('Reset all parameters to default values? This will lose any unsaved changes.')) {
            loadDefaultParameters();
            PlasmaUtils.Status.update('Parameters reset to defaults', 'info');
        }
    };

    /**
     * Apply current parameters
     */
    const applyParameters = async () => {
        if (!validateAllParameters()) {
            PlasmaUtils.Status.update('Cannot apply: some parameters are invalid', 'error');
            return false;
        }
        
        try {
            PlasmaUtils.Status.update('Applying parameters...', 'info');
            
            // Collect all current parameter values
            collectAllParameters();
            
            // Save parameters via API
            const result = await PlasmaAPI.saveParameters(currentParameters);
            
            if (result && result.success) {
                PlasmaUtils.Status.update('Parameters applied successfully', 'success');
                
                // Trigger parameter applied event
                const event = new CustomEvent('plasma-parameters-applied', {
                    detail: { parameters: currentParameters }
                });
                document.dispatchEvent(event);
                
                return true;
            } else {
                PlasmaUtils.Status.update('Failed to apply parameters', 'error');
                return false;
            }
        } catch (error) {
            console.error('Failed to apply parameters:', error);
            PlasmaUtils.Status.update('Error applying parameters', 'error');
            return false;
        }
    };

    /**
     * Collect all parameters from form inputs
     */
    const collectAllParameters = () => {
        // Collect geometry parameters
        const heightInput = PlasmaUtils.DOM.getById('cylinder-height');
        const radiusInput = PlasmaUtils.DOM.getById('cylinder-radius');
        
        currentParameters.geometry = {
            cylinderHeight: parseFloat(heightInput?.value || 2.0),
            cylinderRadius: parseFloat(radiusInput?.value || 0.5)
        };

        // Collect mesh parameters
        const meshPreset = PlasmaUtils.DOM.getById('mesh-preset')?.value || 'balanced';
        const nrInput = PlasmaUtils.DOM.getById('mesh-nr');
        const nzInput = PlasmaUtils.DOM.getById('mesh-nz');
        
        currentParameters.mesh = {
            preset: meshPreset,
            nr: parseInt(nrInput?.value || 100),
            nz: parseInt(nzInput?.value || 100)
        };

        // Collect torch parameters
        const torches = [];
        const torchDivs = PlasmaUtils.DOM.getAll('.torch-config');
        
        torchDivs.forEach((torchDiv, index) => {
            const torchId = torchDiv.id.split('-')[1];
            const rInput = PlasmaUtils.DOM.getById(`torch-${torchId}-r`);
            const zInput = PlasmaUtils.DOM.getById(`torch-${torchId}-z`);
            const powerInput = PlasmaUtils.DOM.getById(`torch-${torchId}-power`);
            const efficiencyInput = PlasmaUtils.DOM.getById(`torch-${torchId}-efficiency`);
            const sigmaInput = PlasmaUtils.DOM.getById(`torch-${torchId}-sigma`);
            
            if (rInput && zInput && powerInput && efficiencyInput && sigmaInput) {
                torches.push({
                    id: parseInt(torchId),
                    position: {
                        r: parseFloat(rInput.value),
                        z: parseFloat(zInput.value)
                    },
                    power: parseFloat(powerInput.value),
                    efficiency: parseFloat(efficiencyInput.value),
                    sigma: parseFloat(sigmaInput.value)
                });
            }
        });
        
        currentParameters.torches = { torches };

        // Collect material parameters (already updated in real-time)
        
        // Collect boundary parameters
        const initialTempInput = PlasmaUtils.DOM.getById('initial-temperature');
        const ambientTempInput = PlasmaUtils.DOM.getById('ambient-temperature');
        const wallBoundarySelect = PlasmaUtils.DOM.getById('wall-boundary-type');
        const convectionCoeffInput = PlasmaUtils.DOM.getById('convection-coefficient');
        const surfaceEmissivityInput = PlasmaUtils.DOM.getById('surface-emissivity');
        
        currentParameters.boundary = {
            initialTemperature: parseFloat(initialTempInput?.value || 298),
            ambientTemperature: parseFloat(ambientTempInput?.value || 298),
            wallBoundaryType: wallBoundarySelect?.value || 'mixed',
            convectionCoefficient: parseFloat(convectionCoeffInput?.value || 10.0),
            surfaceEmissivity: parseFloat(surfaceEmissivityInput?.value || 0.8)
        };

        // Collect simulation parameters
        const totalTimeInput = PlasmaUtils.DOM.getById('total-time');
        const outputIntervalInput = PlasmaUtils.DOM.getById('output-interval');
        const solverMethodSelect = PlasmaUtils.DOM.getById('solver-method');
        const cflFactorInput = PlasmaUtils.DOM.getById('cfl-factor');
        
        currentParameters.simulation = {
            totalTime: parseFloat(totalTimeInput?.value || 60),
            outputInterval: parseFloat(outputIntervalInput?.value || 1.0),
            solverMethod: solverMethodSelect?.value || 'forward-euler',
            cflFactor: parseFloat(cflFactorInput?.value || 0.5)
        };
    };

    /**
     * Load default parameters
     */
    const loadDefaultParameters = async () => {
        try {
            const params = await PlasmaAPI.getParameters();
            if (params) {
                loadParameters(params);
            }
        } catch (error) {
            console.error('Failed to load default parameters:', error);
            // Load hardcoded defaults if API fails
            loadParameters({
                geometry: { cylinderHeight: 2.0, cylinderRadius: 0.5 },
                mesh: { preset: 'balanced', nr: 100, nz: 100 },
                torches: { torches: [] },
                materials: { materialType: 'carbon-steel' },
                boundary: { 
                    initialTemperature: 298, 
                    ambientTemperature: 298,
                    wallBoundaryType: 'mixed',
                    convectionCoefficient: 10.0,
                    surfaceEmissivity: 0.8
                },
                simulation: {
                    totalTime: 60,
                    outputInterval: 1.0,
                    solverMethod: 'forward-euler',
                    cflFactor: 0.5
                }
            });
        }
    };
    
    /**
     * Load parameters into the form
     * @param {Object} params - Parameter object
     */
    const loadParameters = (params) => {
        currentParameters = { ...params };
        
        // Load geometry parameters
        if (params.geometry) {
            const heightInput = PlasmaUtils.DOM.getById('cylinder-height');
            const radiusInput = PlasmaUtils.DOM.getById('cylinder-radius');
            
            if (heightInput) heightInput.value = params.geometry.cylinderHeight || 2.0;
            if (radiusInput) radiusInput.value = params.geometry.cylinderRadius || 0.5;
        }

        // Load mesh parameters
        if (params.mesh) {
            const meshPresetSelect = PlasmaUtils.DOM.getById('mesh-preset');
            const nrInput = PlasmaUtils.DOM.getById('mesh-nr');
            const nzInput = PlasmaUtils.DOM.getById('mesh-nz');
            
            if (meshPresetSelect) meshPresetSelect.value = params.mesh.preset || 'balanced';
            if (nrInput) nrInput.value = params.mesh.nr || 100;
            if (nzInput) nzInput.value = params.mesh.nz || 100;
            
            updateMeshInfo();
        }

        // Load material parameters
        if (params.materials) {
            const materialSelect = PlasmaUtils.DOM.getById('material-type');
            if (materialSelect) {
                materialSelect.value = params.materials.materialType || 'carbon-steel';
                updateMaterialProperties(params.materials.materialType || 'carbon-steel');
            }
        }

        // Validate all loaded parameters
        setTimeout(() => {
            validateAllParameters();
        }, 100);
    };
    
    /**
     * Get current parameters
     * @returns {Object} - Current parameters
     */
    const getParameters = () => {
        collectAllParameters();
        return { ...currentParameters };
    };
    
    // Return public API
    return {
        init,
        loadParameters,
        getParameters,
        validateAllParameters,
        applyParameters,
        removeTorch,
        parameterGroups
    };
})();

// Initialize on load if parameters tab exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('parameters-tab')) {
        PlasmaParameters.init();
    }
});
