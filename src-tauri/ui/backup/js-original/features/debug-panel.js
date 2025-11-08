/**
 * debug-panel.js
 * Responsibility: Provide a debug UI panel to inspect application state
 * 
 * Main functions:
 * - Display current state values from backend
 * - Provide refresh button to update displayed values
 * - Toggle visibility of debug panel
 */

// Import Tauri API
const { invoke } = window.__TAURI__.tauri;

// Debug panel state
let debugPanelVisible = false;

/**
 * Create and initialize the debug panel
 */
export function initDebugPanel() {
    // Create debug panel if it doesn't exist
    if (!document.getElementById('debug-panel')) {
        createDebugPanel();
    }

    // Add toggle button to page
    const toggleButton = document.createElement('button');
    toggleButton.id = 'debug-toggle';
    toggleButton.textContent = 'Debug';
    toggleButton.className = 'debug-toggle btn btn-sm btn-primary';
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '40px';
    toggleButton.style.right = '20px';
    toggleButton.style.zIndex = '9999';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.border = '1px solid #fff';
    toggleButton.style.borderRadius = '4px';
    
    toggleButton.addEventListener('click', toggleDebugPanel);
    document.body.appendChild(toggleButton);

    // Initial update
    updateDebugPanel();
}

/**
 * Create the debug panel DOM elements
 */
function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.className = 'debug-panel';
    panel.style.display = 'none';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '300px';
    panel.style.padding = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    panel.style.color = 'white';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'monospace';
    panel.style.zIndex = '9998';
    panel.style.borderRadius = '5px';
    panel.style.maxHeight = '80vh';
    panel.style.overflowY = 'auto';

    // Header
    const header = document.createElement('h3');
    header.textContent = 'Debug Panel';
    header.style.margin = '0 0 10px 0';
    panel.appendChild(header);

    // Geometry section
    const geometrySection = document.createElement('div');
    geometrySection.className = 'debug-section';
    
    const geometryTitle = document.createElement('h4');
    geometryTitle.textContent = 'Furnace Geometry';
    geometryTitle.style.margin = '10px 0 5px 0';
    geometrySection.appendChild(geometryTitle);

    const geometryContent = document.createElement('pre');
    geometryContent.id = 'debug-geometry';
    geometryContent.textContent = 'Loading...';
    geometrySection.appendChild(geometryContent);
    
    panel.appendChild(geometrySection);

    // Mesh section
    const meshSection = document.createElement('div');
    meshSection.className = 'debug-section';
    
    const meshTitle = document.createElement('h4');
    meshTitle.textContent = 'Mesh State';
    meshTitle.style.margin = '10px 0 5px 0';
    meshSection.appendChild(meshTitle);

    const meshContent = document.createElement('pre');
    meshContent.id = 'debug-mesh';
    meshContent.textContent = 'Loading...';
    meshSection.appendChild(meshContent);
    
    panel.appendChild(meshSection);

    // Refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.style.marginTop = '10px';
    refreshButton.addEventListener('click', updateDebugPanel);
    panel.appendChild(refreshButton);

    document.body.appendChild(panel);
}

/**
 * Toggle debug panel visibility
 */
function toggleDebugPanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) {
        debugPanelVisible = !debugPanelVisible;
        panel.style.display = debugPanelVisible ? 'block' : 'none';
        
        if (debugPanelVisible) {
            updateDebugPanel();
        }
    }
}

/**
 * Update debug panel content with latest state values
 */
async function updateDebugPanel() {
    if (!debugPanelVisible) return;

    try {
        // Get current state values from backend
        const debugData = await invoke('get_debug_state');
        
        // Update geometry section
        const geometryContent = document.getElementById('debug-geometry');
        if (geometryContent && debugData.geometry) {
            geometryContent.textContent = 
                `Height: ${debugData.geometry.cylinder_height.toFixed(2)} m\n` +
                `Diameter: ${debugData.geometry.cylinder_diameter.toFixed(2)} m`;
        }
        
        // Update mesh section
        const meshContent = document.getElementById('debug-mesh');
        if (meshContent) {
            meshContent.textContent = 
                `Mesh Created: ${debugData.mesh_created}\n`;
        }
    } catch (error) {
        console.error('Error fetching debug data:', error);
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to allow other components to initialize
    setTimeout(initDebugPanel, 500);
});
