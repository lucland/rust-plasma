/**
 * parameters.js
 * Responsibility: Handle parameter input, validation, and management
 * 
 * Main functions:
 * - Parameter form initialization
 * - Parameter validation
 * - Parameter serialization/deserialization
 * - Template handling
 */

const PlasmaParameters = (function() {
    // State
    let currentParameters = {};
    let parameterGroups = [
        'geometry',
        'torches',
        'materials',
        'boundary',
        'phenomena',
        'simulation',
        'gasification'
    ];
    
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
        
        // Initialize form validation
        initFormValidation();
        
        // Initialize template dropdown
        initTemplateDropdown();
        
        // Load default parameters
        loadDefaultParameters();
        
        // Log initialization
        console.log("Parameter system initialized");
    };
    
    /**
     * Initialize form validation for all parameter inputs
     */
    const initFormValidation = () => {
        const numericInputs = PlasmaUtils.DOM.getAll('input[type="number"]');
        
        numericInputs.forEach(input => {
            input.addEventListener('input', () => {
                PlasmaUtils.FormValidation.validateNumeric(input);
                updateParameterFromInput(input);
            });
            
            // Validate on init
            PlasmaUtils.FormValidation.validateNumeric(input);
            updateParameterFromInput(input);
        });
    };
    
    /**
     * Initialize the parameter template dropdown
     */
    const initTemplateDropdown = () => {
        const templateSelect = PlasmaUtils.DOM.get('.template-select');
        if (!templateSelect) return;
        
        templateSelect.addEventListener('change', async () => {
            const templateId = templateSelect.value;
            if (!templateId) return;
            
            try {
                PlasmaUtils.Status.update('Loading template...', 'info');
                const template = await PlasmaAPI.loadParameterTemplate(templateId);
                if (template) {
                    loadParameters(template);
                    PlasmaUtils.Status.update('Template loaded successfully', 'success');
                }
            } catch (error) {
                console.error('Failed to load template:', error);
                PlasmaUtils.Status.update('Failed to load template', 'error');
            }
        });
    };
    
    /**
     * Update the internal parameter object from an input element
     * @param {HTMLInputElement} input - The input element
     */
    const updateParameterFromInput = (input) => {
        // Get parameter path from input ID (e.g. "cylinder-height" -> ["geometry", "cylinderHeight"])
        const paramId = input.id;
        
        // Extract group and parameter name
        const parts = paramId.split('-');
        let group, name;
        
        if (parts.length >= 2) {
            // For elements like "cylinder-height"
            if (parts[0] === 'cylinder') {
                group = 'geometry';
                // Convert cylinder-height to cylinderHeight
                name = 'cylinder' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            } else {
                group = parts[0];
                // Join remaining parts and camelCase them
                name = parts.slice(1).join('-')
                    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
            }
            
            // Ensure group exists in parameters
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
            
            // Trigger a custom event
            const event = new CustomEvent('plasma-parameter-changed', {
                detail: { group, name, value }
            });
            document.dispatchEvent(event);
        }
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
        }
    };
    
    /**
     * Load parameters into the form
     * @param {Object} params - Parameter object
     */
    const loadParameters = (params) => {
        currentParameters = params;
        
        // Update form inputs with parameter values
        for (const [group, groupParams] of Object.entries(params)) {
            for (const [name, value] of Object.entries(groupParams)) {
                // Convert camelCase to kebab-case
                const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                
                // Special case for cylinder parameters
                let inputId = '';
                if (group === 'geometry' && name.startsWith('cylinder')) {
                    // cylinderHeight -> cylinder-height
                    inputId = 'cylinder-' + name.substring(8).toLowerCase();
                } else {
                    inputId = `${group}-${kebabName}`;
                }
                
                const input = PlasmaUtils.DOM.getById(inputId);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = value;
                    } else {
                        input.value = value;
                    }
                    
                    // Trigger validation
                    if (input.type === 'number') {
                        PlasmaUtils.FormValidation.validateNumeric(input);
                    }
                }
            }
        }
    };
    
    /**
     * Get current parameters
     * @returns {Object} - Current parameters
     */
    const getParameters = () => {
        return { ...currentParameters };
    };
    
    /**
     * Save current parameters
     */
    const saveParameters = async () => {
        try {
            PlasmaUtils.Status.update('Saving parameters...', 'info');
            const result = await PlasmaAPI.saveParameters(currentParameters);
            if (result && result.success) {
                PlasmaUtils.Status.update('Parameters saved successfully', 'success');
                return true;
            } else {
                PlasmaUtils.Status.update('Failed to save parameters', 'error');
                return false;
            }
        } catch (error) {
            console.error('Failed to save parameters:', error);
            PlasmaUtils.Status.update('Error saving parameters', 'error');
            return false;
        }
    };
    
    // Return public API
    return {
        init,
        loadParameters,
        getParameters,
        saveParameters,
        parameterGroups
    };
})();

// Initialize on load if parameters tab exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('parameters-tab')) {
        PlasmaParameters.init();
    }
});
