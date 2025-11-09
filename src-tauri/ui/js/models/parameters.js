/**
 * SimulationParameters Data Model
 * Handles parameter structure, validation, and serialization for the Plasma Furnace Simulator
 */

class SimulationParameters {
    constructor(params = {}) {
        // Initialize with default values and merge with provided params
        this.furnace = {
            height: 2.0,  // meters (1.0-5.0)
            radius: 1.0,  // meters (0.5-2.0)
            ...params.furnace
        };
        
        this.torch = {
            power: 150,   // kW (50-300)
            position: {
                r: 0.0,   // radial position normalized (0=center, 1=edge)
                z: 0.5    // axial position normalized (0=bottom, 1=top)
            },
            efficiency: 0.8,  // (0.7-0.9)
            ...params.torch
        };
        
        // Merge torch position if provided
        if (params.torch?.position) {
            this.torch.position = { ...this.torch.position, ...params.torch.position };
        }
        
        this.material = params.material || "Steel";  // "Steel" | "Aluminum" | "Concrete"
        
        this.simulation = {
            duration: 60,    // seconds (10-300)
            timeStep: 0.5,   // seconds (0.1-1.0)
            ...params.simulation
        };
    }

    /**
     * Validate all parameters and return validation result
     * @returns {Object} { isValid: boolean, errors: Array<{field: string, message: string}> }
     */
    validate() {
        const errors = [];

        // Validate furnace parameters
        if (!this._isValidNumber(this.furnace.height, 1.0, 5.0)) {
            errors.push({
                field: 'furnace.height',
                message: 'Furnace height must be between 1.0 and 5.0 meters'
            });
        }

        if (!this._isValidNumber(this.furnace.radius, 0.5, 2.0)) {
            errors.push({
                field: 'furnace.radius',
                message: 'Furnace radius must be between 0.5 and 2.0 meters'
            });
        }

        // Validate torch parameters
        if (!this._isValidNumber(this.torch.power, 50, 300)) {
            errors.push({
                field: 'torch.power',
                message: 'Torch power must be between 50 and 300 kW'
            });
        }

        if (!this._isValidNumber(this.torch.position.r, 0, 1.0)) {
            errors.push({
                field: 'torch.position.r',
                message: 'Torch radial position must be between 0 (center) and 1 (edge)'
            });
        }

        if (!this._isValidNumber(this.torch.position.z, 0, 1.0)) {
            errors.push({
                field: 'torch.position.z',
                message: 'Torch axial position must be between 0 (bottom) and 1 (top)'
            });
        }

        if (!this._isValidNumber(this.torch.efficiency, 0.7, 0.9)) {
            errors.push({
                field: 'torch.efficiency',
                message: 'Torch efficiency must be between 0.7 and 0.9'
            });
        }

        // Validate material
        const validMaterials = ['Steel', 'Aluminum', 'Concrete'];
        if (!validMaterials.includes(this.material)) {
            errors.push({
                field: 'material',
                message: `Material must be one of: ${validMaterials.join(', ')}`
            });
        }

        // Validate simulation parameters
        if (!this._isValidNumber(this.simulation.duration, 10, 300)) {
            errors.push({
                field: 'simulation.duration',
                message: 'Simulation duration must be between 10 and 300 seconds'
            });
        }

        if (!this._isValidNumber(this.simulation.timeStep, 0.1, 1.0)) {
            errors.push({
                field: 'simulation.timeStep',
                message: 'Time step must be between 0.1 and 1.0 seconds'
            });
        }

        // Additional validation: time step should be reasonable relative to duration
        if (this.simulation.duration / this.simulation.timeStep > 1000) {
            errors.push({
                field: 'simulation.timeStep',
                message: 'Time step is too small relative to duration (would create >1000 time steps)'
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate a specific field
     * @param {string} fieldPath - Dot notation path to field (e.g., 'furnace.height')
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    validateField(fieldPath) {
        const fullValidation = this.validate();
        const fieldError = fullValidation.errors.find(error => error.field === fieldPath);
        
        return {
            isValid: !fieldError,
            error: fieldError ? fieldError.message : null
        };
    }

    /**
     * Get validation ranges for UI display
     * @returns {Object} Object containing min/max values for each parameter
     */
    static getValidationRanges() {
        return {
            furnace: {
                height: { min: 1.0, max: 5.0, unit: 'm' },
                radius: { min: 0.5, max: 2.0, unit: 'm' }
            },
            torch: {
                power: { min: 50, max: 300, unit: 'kW' },
                position: {
                    r: { min: 0, max: 'furnace.radius', unit: 'm' },
                    z: { min: 0, max: 'furnace.height', unit: 'm' }
                },
                efficiency: { min: 0.7, max: 0.9, unit: '' }
            },
            material: {
                options: ['Steel', 'Aluminum', 'Concrete']
            },
            simulation: {
                duration: { min: 10, max: 300, unit: 's' },
                timeStep: { min: 0.1, max: 1.0, unit: 's' }
            }
        };
    }

    /**
     * Create parameters from form data
     * @param {FormData|Object} formData - Form data or object with form values
     * @returns {SimulationParameters} New parameters instance
     */
    static fromFormData(formData) {
        const data = formData instanceof FormData ? Object.fromEntries(formData) : formData;
        
        return new SimulationParameters({
            furnace: {
                height: parseFloat(data['furnace-height']) || 2.0,
                radius: parseFloat(data['furnace-radius']) || 1.0
            },
            torch: {
                power: parseFloat(data['torch-power']) || 150,
                position: {
                    r: parseFloat(data['torch-position-r']) || 0.0,
                    z: parseFloat(data['torch-position-z']) || 0.5
                },
                efficiency: parseFloat(data['torch-efficiency']) || 0.8
            },
            material: data['material-type'] || 'Steel',
            simulation: {
                duration: parseFloat(data['simulation-duration']) || 60,
                timeStep: parseFloat(data['simulation-timestep']) || 0.5
            }
        });
    }

    /**
     * Convert to form data format for populating HTML forms
     * @returns {Object} Object with form field names as keys
     */
    toFormData() {
        return {
            'furnace-height': this.furnace.height,
            'furnace-radius': this.furnace.radius,
            'torch-power': this.torch.power,
            'torch-position-r': this.torch.position.r,
            'torch-position-z': this.torch.position.z,
            'torch-efficiency': this.torch.efficiency,
            'material-type': this.material,
            'simulation-duration': this.simulation.duration,
            'simulation-timestep': this.simulation.timeStep
        };
    }

    /**
     * Serialize to JSON for storage or transmission
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            furnace: { ...this.furnace },
            torch: {
                ...this.torch,
                position: { ...this.torch.position }
            },
            material: this.material,
            simulation: { ...this.simulation }
        };
    }

    /**
     * Create a deep copy of the parameters
     * @returns {SimulationParameters} New instance with same values
     */
    clone() {
        return new SimulationParameters(this.toJSON());
    }

    /**
     * Check if parameters are equal to another instance
     * @param {SimulationParameters} other - Other parameters to compare
     * @returns {boolean} True if all values are equal
     */
    equals(other) {
        if (!(other instanceof SimulationParameters)) {
            return false;
        }

        return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
    }

    /**
     * Get a human-readable summary of the parameters
     * @returns {string} Summary string
     */
    getSummary() {
        return `Furnace: ${this.furnace.height}m × ${this.furnace.radius}m, ` +
               `Torch: ${this.torch.power}kW at (${this.torch.position.r}, ${this.torch.position.z}), ` +
               `Material: ${this.material}, ` +
               `Simulation: ${this.simulation.duration}s (Δt=${this.simulation.timeStep}s)`;
    }

    /**
     * Helper method to validate numeric values within range
     * @private
     */
    _isValidNumber(value, min, max) {
        return typeof value === 'number' && 
               !isNaN(value) && 
               value >= min && 
               value <= max;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationParameters;
} else {
    window.SimulationParameters = SimulationParameters;
}