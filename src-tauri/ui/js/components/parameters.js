/**
 * ParameterPanel Component
 * Handles parameter input form, validation, and user interaction
 */

class ParameterPanel {
    constructor(container, eventBus) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.eventBus = eventBus;
        this.parameters = new SimulationParameters();
        this.validationRanges = SimulationParameters.getValidationRanges();
        
        // Form elements
        this.form = null;
        this.fields = new Map();
        this.errorElements = new Map();
        this.statusElement = null;
        
        // State
        this.isValid = false;
        this.isDirty = false;
        
        this.init();
    }

    /**
     * Initialize the parameter panel
     */
    init() {
        if (!this.container) {
            console.error('ParameterPanel: Container not found');
            return;
        }

        this.setupFormElements();
        this.setupEventListeners();
        this.updateDynamicValidation();
        const validation = this.validateAll();
        
        console.log('ParameterPanel initialized with validation:', validation);
        
        // Emit initial validation state so the app knows parameters are ready
        if (this.eventBus && validation.isValid) {
            console.log('📡 [PARAMS] Emitting initial parameters:validated event');
            this.eventBus.emit('parameters:validated', {
                isValid: true,
                parameters: this.parameters.toJSON(),
                validation: validation,
                changedField: null
            });
        }
    }

    /**
     * Set up form element references
     */
    setupFormElements() {
        this.form = this.container.querySelector('#parameter-form');
        this.statusElement = this.container.querySelector('#parameter-status');
        
        if (!this.form) {
            console.error('ParameterPanel: Form not found');
            return;
        }

        // Map all form fields
        const fieldMappings = {
            'furnace.height': 'furnace-height',
            'furnace.radius': 'furnace-radius',
            'torch.power': 'torch-power',
            'torch.position.r': 'torch-position-r',
            'torch.position.z': 'torch-position-z',
            'torch.efficiency': 'torch-efficiency',
            'material': 'material-type',
            'simulation.duration': 'simulation-duration',
            'simulation.timeStep': 'simulation-timestep'
        };

        for (const [fieldPath, elementId] of Object.entries(fieldMappings)) {
            const element = document.getElementById(elementId);
            const errorElement = document.getElementById(elementId + '-error');
            
            if (element) {
                this.fields.set(fieldPath, element);
                if (errorElement) {
                    this.errorElements.set(fieldPath, errorElement);
                }
            }
        }
    }

    /**
     * Set up event listeners for form interactions
     */
    setupEventListeners() {
        if (!this.form) return;

        // Listen for input changes on all form fields
        this.form.addEventListener('input', (event) => {
            this.handleFieldChange(event.target);
        });

        this.form.addEventListener('change', (event) => {
            this.handleFieldChange(event.target);
        });

        // Listen for form submission (prevent default)
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleFormSubmit();
        });

        // Listen for parameter updates from other components
        if (this.eventBus) {
            this.eventBus.on('parameters:update', (params) => {
                this.setParameters(params);
            });

            this.eventBus.on('parameters:reset', () => {
                this.resetToDefaults();
            });
        }
    }

    /**
     * Handle individual field changes
     */
    handleFieldChange(field) {
        console.log('📝 [PARAMS] USER ACTION: Field changed:', {
            fieldName: field?.name,
            fieldValue: field?.value,
            fieldType: field?.type
        });
        
        if (!field || !field.name) {
            console.warn('⚠️ [PARAMS] Invalid field object:', field);
            return;
        }
        
        // Prevent recursive updates
        if (this.isUpdating) {
            console.log('⚠️ [PARAMS] Already updating, skipping to prevent recursion');
            return;
        }
        
        this.isUpdating = true;

        try {
            const fieldPath = this.getFieldPath(field.name);
            console.log('📝 [PARAMS] Field path mapping:', {
                formFieldName: field.name,
                fieldPath: fieldPath
            });
            
            if (!fieldPath) {
                console.warn('⚠️ [PARAMS] No field path found for:', field.name);
                return;
            }

            console.log('📝 [PARAMS] Marking parameters as dirty');
            this.isDirty = true;

            console.log('📝 [PARAMS] Updating parameter value...');
            // Update parameters object
            this.updateParameterValue(fieldPath, field.value);
            console.log('📝 [PARAMS] Updated parameters:', this.parameters.toJSON());

            console.log('📝 [PARAMS] Updating dynamic validation...');
            // Update dynamic validation (e.g., torch position limits based on furnace size)
            this.updateDynamicValidation();

            console.log('📝 [PARAMS] Validating changed field...');
            // Validate the changed field
            const fieldValidation = this.validateField(fieldPath);
            console.log('📝 [PARAMS] Field validation result:', {
                field: fieldPath,
                isValid: fieldValidation,
                value: field.value
            });

            console.log('📝 [PARAMS] Validating all parameters...');
            // Validate all parameters and emit events
            const wasValid = this.isValid;
            const validation = this.validateAll();
            
            console.log('📝 [PARAMS] Validation results:', {
                wasValid: wasValid,
                isNowValid: this.isValid,
                validationChanged: wasValid !== this.isValid,
                errorCount: validation.errors.length,
                errors: validation.errors
            });

            // Emit parameter change event with detailed validation info
            if (this.eventBus) {
                console.log('📡 [PARAMS] Emitting parameters:changed event...');
                const eventData = {
                    field: fieldPath,
                    value: this.getParameterValue(fieldPath),
                    parameters: this.parameters.toJSON(),
                    isValid: this.isValid,
                    validationChanged: wasValid !== this.isValid,
                    validation: validation
                };
                
                console.log('📡 [PARAMS] Event data:', eventData);
                this.eventBus.emit('parameters:changed', eventData);

                // Emit specific validation event if validation state changed
                if (wasValid !== this.isValid) {
                    console.log('📡 [PARAMS] Validation state changed, emitting parameters:validated event...');
                    const validationEventData = {
                        isValid: this.isValid,
                        parameters: this.parameters.toJSON(),
                        validation: validation,
                        changedField: fieldPath
                    };
                    
                    console.log('📡 [PARAMS] Validation event data:', validationEventData);
                    this.eventBus.emit('parameters:validated', validationEventData);
                }
            } else {
                console.warn('⚠️ [PARAMS] No eventBus available for emitting events');
            }
            
            console.log('✅ [PARAMS] Field change handling completed');
        } finally {
            // Always clear the updating flag, even if an error occurs
            this.isUpdating = false;
        }
    }

    /**
     * Handle form submission
     */
    handleFormSubmit() {
        this.validateAll();
        
        if (this.isValid && this.eventBus) {
            this.eventBus.emit('parameters:submit', {
                parameters: this.parameters.toJSON()
            });
        }
    }

    /**
     * Update dynamic validation rules (e.g., position limits based on furnace size)
     */
    updateDynamicValidation() {
        // Update torch position limits based on furnace dimensions
        const radiusField = this.fields.get('torch.position.r');
        const heightField = this.fields.get('torch.position.z');
        
        if (radiusField) {
            radiusField.max = this.parameters.furnace.radius;
            const helpText = radiusField.parentElement.querySelector('.form-help');
            if (helpText) {
                helpText.textContent = `0 - ${this.parameters.furnace.radius} meters`;
            }
        }
        
        if (heightField) {
            heightField.max = this.parameters.furnace.height;
            const helpText = heightField.parentElement.querySelector('.form-help');
            if (helpText) {
                helpText.textContent = `0 - ${this.parameters.furnace.height} meters`;
            }
        }
    }

    /**
     * Validate a specific field
     */
    validateField(fieldPath) {
        const validation = this.parameters.validateField(fieldPath);
        const field = this.fields.get(fieldPath);
        const errorElement = this.errorElements.get(fieldPath);

        if (!field) return validation.isValid;

        // Update field appearance and ARIA attributes
        if (validation.isValid) {
            field.classList.remove('invalid');
            field.classList.add('valid');
            field.setAttribute('aria-invalid', 'false');
        } else {
            field.classList.remove('valid');
            field.classList.add('invalid');
            field.setAttribute('aria-invalid', 'true');
        }

        // Update error message with accessibility support
        if (errorElement) {
            errorElement.textContent = validation.error || '';
            errorElement.style.display = validation.error ? 'block' : 'none';
            
            // Update ARIA attributes for error announcement
            if (validation.error) {
                errorElement.setAttribute('aria-live', 'polite');
                // Ensure field is associated with error message
                const describedBy = field.getAttribute('aria-describedby') || '';
                if (!describedBy.includes(errorElement.id)) {
                    field.setAttribute('aria-describedby', 
                        describedBy ? `${describedBy} ${errorElement.id}` : errorElement.id);
                }
            } else {
                errorElement.removeAttribute('aria-live');
            }
        }

        return validation.isValid;
    }

    /**
     * Validate all parameters
     */
    validateAll() {
        const validation = this.parameters.validate();
        this.isValid = validation.isValid;

        // Update individual field validations
        for (const fieldPath of this.fields.keys()) {
            this.validateField(fieldPath);
        }

        // Update overall status
        this.updateStatus(validation);

        return validation;
    }

    /**
     * Update the parameter status display
     */
    updateStatus(validation) {
        if (!this.statusElement) return;

        const statusText = this.statusElement.querySelector('.status-text');
        if (!statusText) return;

        if (validation.isValid) {
            this.statusElement.className = 'parameter-status valid';
            this.statusElement.setAttribute('aria-live', 'polite');
            statusText.textContent = 'Parameters are valid - ready to run simulation';
        } else {
            this.statusElement.className = 'parameter-status invalid';
            this.statusElement.setAttribute('aria-live', 'assertive');
            const errorCount = validation.errors.length;
            statusText.textContent = `${errorCount} parameter error${errorCount !== 1 ? 's' : ''} - please fix before running simulation`;
        }
    }

    /**
     * Get current parameters
     */
    getParameters() {
        return this.parameters.toJSON();
    }

    /**
     * Set parameters and update form
     */
    setParameters(params) {
        this.parameters = new SimulationParameters(params);
        this.updateFormFromParameters();
        this.updateDynamicValidation();
        this.validateAll();
    }

    /**
     * Reset parameters to defaults
     */
    resetToDefaults() {
        this.parameters = new SimulationParameters();
        this.updateFormFromParameters();
        this.updateDynamicValidation();
        this.validateAll();
        this.isDirty = false;

        if (this.eventBus) {
            this.eventBus.emit('parameters:reset-complete', {
                parameters: this.parameters.toJSON()
            });
        }
    }

    /**
     * Update form fields from current parameters
     */
    updateFormFromParameters() {
        const formData = this.parameters.toFormData();
        
        for (const [fieldPath, field] of this.fields) {
            const formFieldName = this.getFormFieldName(fieldPath);
            if (formFieldName && formData.hasOwnProperty(formFieldName)) {
                field.value = formData[formFieldName];
            }
        }
    }

    /**
     * Get parameter summary for display
     */
    getSummary() {
        return this.parameters.getSummary();
    }

    /**
     * Check if parameters have been modified
     */
    isDirtyState() {
        return this.isDirty;
    }

    /**
     * Mark parameters as clean (saved)
     */
    markClean() {
        this.isDirty = false;
    }

    /**
     * Enable or disable the form
     */
    setEnabled(enabled) {
        if (!this.form) return;

        const formElements = this.form.querySelectorAll('input, select, button');
        formElements.forEach(element => {
            element.disabled = !enabled;
        });

        this.form.classList.toggle('disabled', !enabled);
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Processing...') {
        this.setEnabled(false);
        if (this.statusElement) {
            const statusText = this.statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
            }
            this.statusElement.className = 'parameter-status loading';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.setEnabled(true);
        this.validateAll();
    }

    /**
     * Helper methods
     */

    /**
     * Convert form field name to parameter path
     */
    getFieldPath(formFieldName) {
        const mappings = {
            'furnace-height': 'furnace.height',
            'furnace-radius': 'furnace.radius',
            'torch-power': 'torch.power',
            'torch-position-r': 'torch.position.r',
            'torch-position-z': 'torch.position.z',
            'torch-efficiency': 'torch.efficiency',
            'material-type': 'material',
            'simulation-duration': 'simulation.duration',
            'simulation-timestep': 'simulation.timeStep'
        };
        return mappings[formFieldName];
    }

    /**
     * Convert parameter path to form field name
     */
    getFormFieldName(fieldPath) {
        const mappings = {
            'furnace.height': 'furnace-height',
            'furnace.radius': 'furnace-radius',
            'torch.power': 'torch-power',
            'torch.position.r': 'torch-position-r',
            'torch.position.z': 'torch-position-z',
            'torch.efficiency': 'torch-efficiency',
            'material': 'material-type',
            'simulation.duration': 'simulation-duration',
            'simulation.timeStep': 'simulation-timestep'
        };
        return mappings[fieldPath];
    }

    /**
     * Update parameter value from field path and value
     */
    updateParameterValue(fieldPath, value) {
        const pathParts = fieldPath.split('.');
        let target = this.parameters;

        // Navigate to the parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!target[pathParts[i]]) {
                target[pathParts[i]] = {};
            }
            target = target[pathParts[i]];
        }

        // Set the value with appropriate type conversion
        const finalKey = pathParts[pathParts.length - 1];
        if (fieldPath === 'material') {
            target[finalKey] = value;
        } else {
            target[finalKey] = parseFloat(value) || 0;
        }
    }

    /**
     * Get parameter value from field path
     */
    getParameterValue(fieldPath) {
        const pathParts = fieldPath.split('.');
        let value = this.parameters;

        for (const part of pathParts) {
            if (value && typeof value === 'object' && value.hasOwnProperty(part)) {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParameterPanel;
} else {
    window.ParameterPanel = ParameterPanel;
}