/**
 * geometry.js
 * Responsibility: Handle furnace geometry UI interactions and backend communication
 * 
 * Main functions:
 * - Initialize geometry input fields
 * - Validate geometry inputs
 * - Send geometry updates to backend
 * - Handle backend responses
 */

// Import Tauri API
const { invoke } = window.__TAURI__.tauri;

/**
 * Initialize the geometry module
 */
export function initGeometry() {
    // Get references to input elements
    const heightInput = document.getElementById('cylinder-height');
    const diameterInput = document.getElementById('cylinder-diameter');
    const geometryForm = document.getElementById('geometry-form');
    const statusMessage = document.getElementById('geometry-status');
    
    // Set default values (if needed)
    if (heightInput && !heightInput.value) {
        heightInput.value = "2.0";
    }
    
    if (diameterInput && !diameterInput.value) {
        diameterInput.value = "1.0";
    }
    
    // Add form submission handler
    if (geometryForm) {
        geometryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get values from form
            const height = parseFloat(heightInput.value);
            const diameter = parseFloat(diameterInput.value);
            
            // Validate input
            if (!validateGeometry(height, diameter, statusMessage)) {
                return;
            }
            
            // Show loading state
            setStatus(statusMessage, "Updating geometry...", "pending");
            
            try {
                // Call the backend command to update geometry
                const response = await invoke('update_geometry', {
                    height,
                    diameter
                });
                
                // Handle success
                console.log('Geometry updated:', response);
                setStatus(statusMessage, `Success: ${response.message}`, "success");
                
                // Trigger any UI updates needed
                if (response.success) {
                    // Here we might update visualizations or other components
                    // that depend on the geometry
                }
            } catch (error) {
                // Handle error
                console.error('Error updating geometry:', error);
                setStatus(statusMessage, `Error: ${error}`, "error");
            }
        });
    }
    
    // Add input validation listeners
    if (heightInput) {
        heightInput.addEventListener('input', () => {
            validateInput(heightInput, 0.1, 10, 'Height must be between 0.1m and 10m');
        });
    }
    
    if (diameterInput) {
        diameterInput.addEventListener('input', () => {
            validateInput(diameterInput, 0.1, 5, 'Diameter must be between 0.1m and 5m');
        });
    }
}

/**
 * Validate geometry values
 * @param {number} height - Cylinder height in meters
 * @param {number} diameter - Cylinder diameter in meters
 * @param {HTMLElement} statusElement - Element to display validation messages
 * @returns {boolean} - True if valid, false otherwise
 */
function validateGeometry(height, diameter, statusElement) {
    // Check for NaN
    if (isNaN(height) || isNaN(diameter)) {
        setStatus(statusElement, "Error: Height and diameter must be numbers", "error");
        return false;
    }
    
    // Check positive values
    if (height <= 0 || diameter <= 0) {
        setStatus(statusElement, "Error: Height and diameter must be positive", "error");
        return false;
    }
    
    // Check reasonable ranges
    if (height < 0.1 || height > 10) {
        setStatus(statusElement, "Error: Height must be between 0.1m and 10m", "error");
        return false;
    }
    
    if (diameter < 0.1 || diameter > 5) {
        setStatus(statusElement, "Error: Diameter must be between 0.1m and 5m", "error");
        return false;
    }
    
    return true;
}

/**
 * Validate an individual input element
 * @param {HTMLInputElement} inputElement - The input element to validate
 * @param {number} min - Minimum valid value
 * @param {number} max - Maximum valid value
 * @param {string} errorMessage - Message to display for invalid input
 */
function validateInput(inputElement, min, max, errorMessage) {
    const value = parseFloat(inputElement.value);
    
    // Check if input is a valid number within range
    const isValid = !isNaN(value) && value >= min && value <= max;
    
    if (isValid) {
        inputElement.classList.remove('invalid');
        inputElement.classList.add('valid');
        inputElement.setCustomValidity('');
    } else {
        inputElement.classList.remove('valid');
        inputElement.classList.add('invalid');
        inputElement.setCustomValidity(errorMessage);
    }
}

/**
 * Set status message with appropriate styling
 * @param {HTMLElement} element - Element to update
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', 'pending')
 */
function setStatus(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    
    // Reset classes
    element.classList.remove('success', 'error', 'pending');
    
    // Add appropriate class
    if (type) {
        element.classList.add(type);
    }
    
    // Make sure the element is visible
    element.style.display = 'block';
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initGeometry();
});
