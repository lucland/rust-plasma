/**
 * formula-editor.js
 * Responsibility: Formula editor and management functionality
 * 
 * Main functions:
 * - Formula validation and evaluation
 * - Material property formula management
 * - Physics formula management
 * - Constants management
 * - Formula editor with syntax highlighting
 */

const PlasmaFormulaEditor = (function() {
    let currentFormulas = {
        material: [],
        physics: []
    };
    
    let currentConstants = {
        builtin: [],
        custom: []
    };
    
    let formulaReference = null;
    
    /**
     * Initialize the formula editor
     */
    const init = () => {
        initTabSystem();
        initEventListeners();
        loadFormulaReference();
        loadExistingFormulas();
        loadConstants();
        
        console.log('Formula editor initialized');
    };
    
    /**
     * Initialize formula tab system
     */
    const initTabSystem = () => {
        const tabs = document.querySelectorAll('[data-formula-group]');
        const groups = document.querySelectorAll('.formula-group');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all tabs and groups
                tabs.forEach(t => t.classList.remove('active'));
                groups.forEach(g => g.classList.add('d-none'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding group
                const groupId = tab.getAttribute('data-formula-group');
                const group = document.getElementById(`${groupId}-formulas`) || 
                             document.getElementById(`${groupId}-management`) ||
                             document.getElementById(`formula-${groupId}`);
                if (group) {
                    group.classList.remove('d-none');
                }
            });
        });
    };
    
    /**
     * Initialize event listeners
     */
    const initEventListeners = () => {
        // Add formula buttons
        const addMaterialBtn = document.getElementById('add-material-formula');
        const addPhysicsBtn = document.getElementById('add-physics-formula');
        const addConstantBtn = document.getElementById('add-constant');
        
        if (addMaterialBtn) {
            addMaterialBtn.addEventListener('click', () => showMaterialFormulaModal());
        }
        
        if (addPhysicsBtn) {
            addPhysicsBtn.addEventListener('click', () => showPhysicsFormulaModal());
        }
        
        if (addConstantBtn) {
            addConstantBtn.addEventListener('click', () => showConstantModal());
        }
        
        // Formula editor buttons
        const testFormulaBtn = document.getElementById('test-formula');
        const validateFormulaBtn = document.getElementById('validate-formula');
        const clearFormulaBtn = document.getElementById('clear-formula');
        
        if (testFormulaBtn) {
            testFormulaBtn.addEventListener('click', testFormula);
        }
        
        if (validateFormulaBtn) {
            validateFormulaBtn.addEventListener('click', validateFormula);
        }
        
        if (clearFormulaBtn) {
            clearFormulaBtn.addEventListener('click', clearFormula);
        }
        
        // Modal save buttons
        const saveMaterialBtn = document.getElementById('save-material-formula');
        const savePhysicsBtn = document.getElementById('save-physics-formula');
        const saveConstantBtn = document.getElementById('save-constant');
        
        if (saveMaterialBtn) {
            saveMaterialBtn.addEventListener('click', saveMaterialFormula);
        }
        
        if (savePhysicsBtn) {
            savePhysicsBtn.addEventListener('click', savePhysicsFormula);
        }
        
        if (saveConstantBtn) {
            saveConstantBtn.addEventListener('click', saveConstant);
        }
        
        // Modal test buttons
        const testMaterialBtn = document.getElementById('test-material-formula');
        const testPhysicsBtn = document.getElementById('test-physics-formula');
        
        if (testMaterialBtn) {
            testMaterialBtn.addEventListener('click', () => testModalFormula('material'));
        }
        
        if (testPhysicsBtn) {
            testPhysicsBtn.addEventListener('click', () => testModalFormula('physics'));
        }
        
        // Action buttons
        const validateAllBtn = document.getElementById('validate-all-formulas');
        if (validateAllBtn) {
            validateAllBtn.addEventListener('click', validateAllFormulas);
        }
        
        // Modal close handlers
        initModalHandlers();
    };
    
    /**
     * Initialize modal handlers
     */
    const initModalHandlers = () => {
        const modals = ['material-formula-modal', 'physics-formula-modal', 'constant-modal'];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const closeBtn = modal.querySelector('.btn-close');
                const cancelBtn = modal.querySelector('.btn-secondary');
                const backdrop = modal.querySelector('.modal-backdrop');
                
                [closeBtn, cancelBtn, backdrop].forEach(element => {
                    if (element) {
                        element.addEventListener('click', () => hideModal(modalId));
                    }
                });
            }
        });
    };
    
    /**
     * Load formula reference data
     */
    const loadFormulaReference = async () => {
        try {
            const reference = await PlasmaAPI.invoke('get_formula_reference');
            formulaReference = reference;
            
            displayAvailableFunctions(reference.functions);
            displayAvailableVariables(reference.variables);
            
        } catch (error) {
            console.error('Failed to load formula reference:', error);
            updateFormulaStatus('Failed to load formula reference', 'error');
        }
    };
    
    /**
     * Load existing formulas
     */
    const loadExistingFormulas = async () => {
        try {
            // Load material formulas
            const materialFormulas = await PlasmaAPI.invoke('get_material_formulas');
            currentFormulas.material = materialFormulas;
            displayMaterialFormulas(materialFormulas);
            
            // Load physics formulas
            const physicsFormulas = await PlasmaAPI.invoke('get_physics_formulas');
            currentFormulas.physics = physicsFormulas;
            displayPhysicsFormulas(physicsFormulas);
            
            updateFormulaStatus(`Loaded ${materialFormulas.length} material and ${physicsFormulas.length} physics formulas`, 'success');
            
        } catch (error) {
            console.error('Failed to load formulas:', error);
            updateFormulaStatus('Failed to load existing formulas', 'error');
        }
    };
    
    /**
     * Load constants
     */
    const loadConstants = async () => {
        try {
            const reference = await PlasmaAPI.invoke('get_formula_reference');
            currentConstants.builtin = reference.constants;
            
            displayBuiltinConstants(reference.constants);
            displayCustomConstants([]); // Will be populated when custom constants are added
            
        } catch (error) {
            console.error('Failed to load constants:', error);
        }
    };
    
    /**
     * Display available functions
     */
    const displayAvailableFunctions = (functions) => {
        const container = document.getElementById('available-functions');
        if (!container) return;
        
        container.innerHTML = functions.map(func => 
            `<div class="reference-item">
                <code class="text-primary">${func}</code>
            </div>`
        ).join('');
    };
    
    /**
     * Display available variables
     */
    const displayAvailableVariables = (variables) => {
        const container = document.getElementById('available-variables');
        if (!container) return;
        
        const descriptions = {
            'T': 'Temperature (K)',
            'r': 'Radial position (m)',
            'z': 'Axial position (m)',
            't': 'Time (s)',
            'pressure': 'Pressure (Pa)',
            'density': 'Density (kg/m³)',
            'power': 'Power (W)',
            'efficiency': 'Efficiency (0-1)',
            'sigma': 'Gaussian spread (m)',
            'emissivity': 'Emissivity (0-1)',
            'T_ambient': 'Ambient temperature (K)'
        };
        
        container.innerHTML = variables.map(variable => 
            `<div class="reference-item">
                <code class="text-success">${variable}</code>
                <small class="text-muted d-block">${descriptions[variable] || ''}</small>
            </div>`
        ).join('');
    };
    
    /**
     * Display material formulas
     */
    const displayMaterialFormulas = (formulas) => {
        const container = document.getElementById('material-formulas-list');
        if (!container) return;
        
        if (formulas.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-4">No material formulas defined</div>';
            return;
        }
        
        container.innerHTML = formulas.map(formula => 
            `<div class="formula-item card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="formula-name">${formula.name}</h5>
                            <code class="formula-code">${formula.formula}</code>
                            ${formula.description ? `<p class="text-muted mt-2 mb-0">${formula.description}</p>` : ''}
                        </div>
                        <div class="formula-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="PlasmaFormulaEditor.editMaterialFormula('${formula.name}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="PlasmaFormulaEditor.deleteMaterialFormula('${formula.name}')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>`
        ).join('');
    };
    
    /**
     * Display physics formulas
     */
    const displayPhysicsFormulas = (formulas) => {
        const container = document.getElementById('physics-formulas-list');
        if (!container) return;
        
        if (formulas.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-4">No physics formulas defined</div>';
            return;
        }
        
        container.innerHTML = formulas.map(formula => 
            `<div class="formula-item card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="formula-name">${formula.name}</h5>
                            <code class="formula-code">${formula.formula}</code>
                            ${formula.description ? `<p class="text-muted mt-2 mb-0">${formula.description}</p>` : ''}
                        </div>
                        <div class="formula-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="PlasmaFormulaEditor.editPhysicsFormula('${formula.name}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="PlasmaFormulaEditor.deletePhysicsFormula('${formula.name}')">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>`
        ).join('');
    };
    
    /**
     * Display built-in constants
     */
    const displayBuiltinConstants = (constants) => {
        const container = document.getElementById('builtin-constants-list');
        if (!container) return;
        
        container.innerHTML = constants.map(constant => 
            `<div class="constant-item mb-2">
                <div class="d-flex justify-content-between">
                    <code class="text-primary">${constant.name}</code>
                    <span class="text-muted">${constant.value.toExponential(3)}</span>
                </div>
                ${constant.description ? `<small class="text-muted">${constant.description}</small>` : ''}
            </div>`
        ).join('');
    };
    
    /**
     * Display custom constants
     */
    const displayCustomConstants = (constants) => {
        const container = document.getElementById('custom-constants-list');
        if (!container) return;
        
        if (constants.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-3">No custom constants defined</div>';
            return;
        }
        
        container.innerHTML = constants.map(constant => 
            `<div class="constant-item mb-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <code class="text-success">${constant.name}</code>
                        <span class="text-muted ml-2">${constant.value}</span>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="PlasmaFormulaEditor.deleteConstant('${constant.name}')">
                        ×
                    </button>
                </div>
                ${constant.description ? `<small class="text-muted">${constant.description}</small>` : ''}
            </div>`
        ).join('');
    };
    
    /**
     * Show material formula modal
     */
    const showMaterialFormulaModal = (formulaName = null) => {
        const modal = document.getElementById('material-formula-modal');
        const title = modal.querySelector('.modal-title');
        const nameInput = document.getElementById('material-property-name');
        const formulaInput = document.getElementById('material-formula-input');
        
        if (formulaName) {
            // Edit mode
            title.textContent = 'Edit Material Property Formula';
            const formula = currentFormulas.material.find(f => f.name === formulaName);
            if (formula) {
                nameInput.value = formula.name;
                formulaInput.value = formula.formula;
                nameInput.disabled = true;
            }
        } else {
            // Add mode
            title.textContent = 'Add Material Property Formula';
            nameInput.value = '';
            formulaInput.value = '';
            nameInput.disabled = false;
        }
        
        showModal('material-formula-modal');
    };
    
    /**
     * Show physics formula modal
     */
    const showPhysicsFormulaModal = (formulaName = null) => {
        const modal = document.getElementById('physics-formula-modal');
        const title = modal.querySelector('.modal-title');
        const nameInput = document.getElementById('physics-property-name');
        const formulaInput = document.getElementById('physics-formula-input');
        
        if (formulaName) {
            // Edit mode
            title.textContent = 'Edit Physics Formula';
            const formula = currentFormulas.physics.find(f => f.name === formulaName);
            if (formula) {
                nameInput.value = formula.name;
                formulaInput.value = formula.formula;
                nameInput.disabled = true;
            }
        } else {
            // Add mode
            title.textContent = 'Add Physics Formula';
            nameInput.value = '';
            formulaInput.value = '';
            nameInput.disabled = false;
        }
        
        showModal('physics-formula-modal');
    };
    
    /**
     * Show constant modal
     */
    const showConstantModal = () => {
        document.getElementById('constant-name').value = '';
        document.getElementById('constant-value').value = '';
        document.getElementById('constant-description').value = '';
        showModal('constant-modal');
    };
    
    /**
     * Show modal
     */
    const showModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('d-none');
        }
    };
    
    /**
     * Hide modal
     */
    const hideModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('d-none');
        }
    };
    
    /**
     * Save material formula
     */
    const saveMaterialFormula = async () => {
        const name = document.getElementById('material-property-name').value.trim();
        const formula = document.getElementById('material-formula-input').value.trim();
        
        if (!name || !formula) {
            updateModalValidation('material-formula-validation', 'Please fill in all fields', 'error');
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('add_material_formula', { property: name, formula });
            
            if (success) {
                hideModal('material-formula-modal');
                loadExistingFormulas(); // Reload to show updated list
                updateFormulaStatus(`Material formula '${name}' saved successfully`, 'success');
            } else {
                updateModalValidation('material-formula-validation', 'Failed to save formula', 'error');
            }
        } catch (error) {
            console.error('Error saving material formula:', error);
            updateModalValidation('material-formula-validation', error.toString(), 'error');
        }
    };
    
    /**
     * Save physics formula
     */
    const savePhysicsFormula = async () => {
        const name = document.getElementById('physics-property-name').value.trim();
        const formula = document.getElementById('physics-formula-input').value.trim();
        
        if (!name || !formula) {
            updateModalValidation('physics-formula-validation', 'Please fill in all fields', 'error');
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('add_physics_formula', { property: name, formula });
            
            if (success) {
                hideModal('physics-formula-modal');
                loadExistingFormulas(); // Reload to show updated list
                updateFormulaStatus(`Physics formula '${name}' saved successfully`, 'success');
            } else {
                updateModalValidation('physics-formula-validation', 'Failed to save formula', 'error');
            }
        } catch (error) {
            console.error('Error saving physics formula:', error);
            updateModalValidation('physics-formula-validation', error.toString(), 'error');
        }
    };
    
    /**
     * Save constant
     */
    const saveConstant = async () => {
        const name = document.getElementById('constant-name').value.trim();
        const value = parseFloat(document.getElementById('constant-value').value);
        
        if (!name || isNaN(value)) {
            alert('Please provide a valid name and numeric value');
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('add_constant', { name, value });
            
            if (success) {
                hideModal('constant-modal');
                loadConstants(); // Reload constants
                updateFormulaStatus(`Constant '${name}' added successfully`, 'success');
            } else {
                alert('Failed to add constant');
            }
        } catch (error) {
            console.error('Error adding constant:', error);
            alert('Error adding constant: ' + error.toString());
        }
    };
    
    /**
     * Test formula in modal
     */
    const testModalFormula = async (type) => {
        const formulaInput = document.getElementById(`${type}-formula-input`);
        const tempInput = document.getElementById(`${type}-test-temp`);
        const resultInput = document.getElementById(`${type}-test-result`);
        const validationDiv = document.getElementById(`${type}-formula-validation`);
        
        const formula = formulaInput.value.trim();
        const temperature = parseFloat(tempInput.value);
        
        if (!formula) {
            updateModalValidation(`${type}-formula-validation`, 'Please enter a formula', 'error');
            return;
        }
        
        if (isNaN(temperature)) {
            updateModalValidation(`${type}-formula-validation`, 'Please enter a valid temperature', 'error');
            return;
        }
        
        try {
            const result = await PlasmaAPI.invoke('evaluate_formula', { 
                formula, 
                temperature,
                variables: {} 
            });
            
            if (result.success) {
                resultInput.value = result.value.toFixed(6);
                updateModalValidation(`${type}-formula-validation`, 'Formula evaluated successfully', 'success');
            } else {
                resultInput.value = 'Error';
                updateModalValidation(`${type}-formula-validation`, result.error, 'error');
            }
        } catch (error) {
            console.error('Error testing formula:', error);
            resultInput.value = 'Error';
            updateModalValidation(`${type}-formula-validation`, error.toString(), 'error');
        }
    };
    
    /**
     * Test formula in main editor
     */
    const testFormula = async () => {
        const formulaInput = document.getElementById('formula-input');
        const tempInput = document.getElementById('test-temperature');
        const resultInput = document.getElementById('formula-result');
        const feedbackDiv = document.getElementById('formula-validation-feedback');
        
        const formula = formulaInput.value.trim();
        const temperature = parseFloat(tempInput.value);
        
        if (!formula) {
            updateValidationFeedback('Please enter a formula', 'error');
            return;
        }
        
        if (isNaN(temperature)) {
            updateValidationFeedback('Please enter a valid temperature', 'error');
            return;
        }
        
        try {
            const result = await PlasmaAPI.invoke('evaluate_formula', { 
                formula, 
                temperature,
                variables: {} 
            });
            
            if (result.success) {
                resultInput.value = result.value.toFixed(6);
                updateValidationFeedback('Formula evaluated successfully', 'success');
            } else {
                resultInput.value = 'Error';
                updateValidationFeedback(result.error, 'error');
            }
        } catch (error) {
            console.error('Error testing formula:', error);
            resultInput.value = 'Error';
            updateValidationFeedback(error.toString(), 'error');
        }
    };
    
    /**
     * Validate formula syntax
     */
    const validateFormula = async () => {
        const formulaInput = document.getElementById('formula-input');
        const formula = formulaInput.value.trim();
        
        if (!formula) {
            updateValidationFeedback('Please enter a formula', 'error');
            return;
        }
        
        try {
            const result = await PlasmaAPI.invoke('validate_formula', { formula });
            
            if (result.valid) {
                updateValidationFeedback('Formula syntax is valid', 'success');
            } else {
                updateValidationFeedback(result.error, 'error');
            }
        } catch (error) {
            console.error('Error validating formula:', error);
            updateValidationFeedback(error.toString(), 'error');
        }
    };
    
    /**
     * Clear formula editor
     */
    const clearFormula = () => {
        document.getElementById('formula-input').value = '';
        document.getElementById('formula-result').value = '';
        document.getElementById('formula-validation-feedback').innerHTML = '';
    };
    
    /**
     * Validate all formulas
     */
    const validateAllFormulas = async () => {
        try {
            const result = await PlasmaAPI.invoke('validate_all_formulas');
            
            if (result.valid) {
                updateFormulaStatus('All formulas are valid', 'success');
            } else {
                updateFormulaStatus(`Validation errors: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error validating all formulas:', error);
            updateFormulaStatus('Error validating formulas: ' + error.toString(), 'error');
        }
    };
    
    /**
     * Delete material formula
     */
    const deleteMaterialFormula = async (name) => {
        if (!confirm(`Are you sure you want to delete the material formula '${name}'?`)) {
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('remove_material_formula', { property: name });
            
            if (success) {
                loadExistingFormulas(); // Reload to show updated list
                updateFormulaStatus(`Material formula '${name}' deleted`, 'success');
            } else {
                updateFormulaStatus(`Failed to delete formula '${name}'`, 'error');
            }
        } catch (error) {
            console.error('Error deleting material formula:', error);
            updateFormulaStatus('Error deleting formula: ' + error.toString(), 'error');
        }
    };
    
    /**
     * Delete physics formula
     */
    const deletePhysicsFormula = async (name) => {
        if (!confirm(`Are you sure you want to delete the physics formula '${name}'?`)) {
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('remove_physics_formula', { property: name });
            
            if (success) {
                loadExistingFormulas(); // Reload to show updated list
                updateFormulaStatus(`Physics formula '${name}' deleted`, 'success');
            } else {
                updateFormulaStatus(`Failed to delete formula '${name}'`, 'error');
            }
        } catch (error) {
            console.error('Error deleting physics formula:', error);
            updateFormulaStatus('Error deleting formula: ' + error.toString(), 'error');
        }
    };
    
    /**
     * Delete constant
     */
    const deleteConstant = async (name) => {
        if (!confirm(`Are you sure you want to delete the constant '${name}'?`)) {
            return;
        }
        
        try {
            const success = await PlasmaAPI.invoke('remove_constant', { name });
            
            if (success) {
                loadConstants(); // Reload constants
                updateFormulaStatus(`Constant '${name}' deleted`, 'success');
            } else {
                updateFormulaStatus(`Failed to delete constant '${name}'`, 'error');
            }
        } catch (error) {
            console.error('Error deleting constant:', error);
            updateFormulaStatus('Error deleting constant: ' + error.toString(), 'error');
        }
    };
    
    /**
     * Update formula status
     */
    const updateFormulaStatus = (message, type = 'info') => {
        const statusElement = document.getElementById('formula-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'muted'}`;
        }
    };
    
    /**
     * Update validation feedback
     */
    const updateValidationFeedback = (message, type = 'info') => {
        const feedbackDiv = document.getElementById('formula-validation-feedback');
        if (feedbackDiv) {
            feedbackDiv.innerHTML = `<div class="text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'muted'}">${message}</div>`;
        }
    };
    
    /**
     * Update modal validation
     */
    const updateModalValidation = (elementId, message, type = 'info') => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'muted'}">${message}</div>`;
        }
    };
    
    // Public API
    return {
        init,
        editMaterialFormula: showMaterialFormulaModal,
        editPhysicsFormula: showPhysicsFormulaModal,
        deleteMaterialFormula,
        deletePhysicsFormula,
        deleteConstant
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the formulas tab
    const formulasTab = document.getElementById('formulas-tab');
    if (formulasTab) {
        PlasmaFormulaEditor.init();
    }
});

// Export for global access
window.PlasmaFormulaEditor = PlasmaFormulaEditor;