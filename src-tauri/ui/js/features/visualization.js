/**
 * visualization.js
 * Responsibility: Handle 3D simulation visualization using Three.js
 * 
 * Main functions:
 * - Initialize Three.js 3D scene
 * - Render temperature heatmap in 3D
 * - Handle camera controls (rotate, zoom, pan)
 * - Real-time visualization updates
 */

const PlasmaVisualization = (function() {
    // Three.js components
    let scene, camera, renderer, controls;
    let heatmapMesh = null;
    let simulationData = null;
    let isInitialized = false;
    
    // UI elements
    let canvas, container, placeholder, loading, legend;
    let resetCameraBtn, wireframeBtn, testBtn;
    
    // Visualization settings
    let wireframeMode = false;
    
    /**
     * Initialize the 3D visualization system
     */
    const init = () => {
        console.log("PlasmaVisualization.init() called");
        
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error("Three.js not loaded! Make sure the script is included.");
            return;
        }
        console.log("Three.js version:", THREE.REVISION);
        
        // Get DOM elements
        canvas = document.getElementById('visualization-canvas');
        container = document.getElementById('visualization-container');
        placeholder = document.getElementById('visualization-placeholder');
        loading = document.getElementById('visualization-loading');
        legend = document.getElementById('temperature-legend');
        resetCameraBtn = document.getElementById('reset-camera');
        wireframeBtn = document.getElementById('toggle-wireframe');
        testBtn = document.getElementById('test-visualization');
        
        console.log("DOM elements found:", {
            canvas: !!canvas,
            container: !!container,
            placeholder: !!placeholder,
            testBtn: !!testBtn
        });
        
        if (!canvas || !container) {
            console.error("Visualization canvas or container not found");
            return;
        }
        
        // Initialize Three.js
        try {
            initThreeJS();
            console.log("Three.js initialized successfully");
        } catch (error) {
            console.error("Failed to initialize Three.js:", error);
            return;
        }
        
        // Initialize controls
        initControls();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        // Handle container resize with ResizeObserver
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                onWindowResize();
            });
            resizeObserver.observe(container);
        }
        
        isInitialized = true;
        console.log("3D Visualization system initialized");
    };
    
    /**
     * Initialize Three.js scene, camera, and renderer
     */
    const initThreeJS = () => {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);
        
        // Create camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        camera.position.set(3, 3, 3);
        camera.lookAt(0, 0, 1);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Add coordinate axes helper
        const axesHelper = new THREE.AxesHelper(2);
        scene.add(axesHelper);
        
        // Start render loop
        animate();
    };
    
    /**
     * Initialize UI controls
     */
    const initControls = () => {
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', resetCamera);
        }
        
        if (wireframeBtn) {
            wireframeBtn.addEventListener('click', toggleWireframe);
        }
        
        if (testBtn) {
            testBtn.addEventListener('click', loadTestVisualization);
        }
    };
    
    /**
     * Animation loop
     */
    const animate = () => {
        requestAnimationFrame(animate);
        
        if (controls) {
            controls.update();
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    };
    
    /**
     * Handle window resize
     */
    const onWindowResize = () => {
        if (!camera || !renderer || !container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Ensure minimum height
        const minHeight = Math.max(height, 400);
        
        camera.aspect = width / minHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, minHeight);
    };
    
    /**
     * Reset camera to default position
     */
    const resetCamera = () => {
        if (!camera || !controls) return;
        
        camera.position.set(3, 3, 3);
        camera.lookAt(0, 0, 1);
        controls.reset();
    };
    
    /**
     * Toggle wireframe mode
     */
    const toggleWireframe = () => {
        wireframeMode = !wireframeMode;
        
        if (heatmapMesh && heatmapMesh.material) {
            heatmapMesh.material.wireframe = wireframeMode;
        }
        
        if (wireframeBtn) {
            wireframeBtn.textContent = wireframeMode ? 'Solid' : 'Wireframe';
        }
    };
    
    /**
     * Create temperature color mapping
     * @param {number} temperature - Temperature value
     * @param {number} minTemp - Minimum temperature
     * @param {number} maxTemp - Maximum temperature
     * @returns {THREE.Color} Color for the temperature
     */
    const getTemperatureColor = (temperature, minTemp, maxTemp) => {
        // Normalize temperature to 0-1 range
        const normalized = (temperature - minTemp) / (maxTemp - minTemp);
        
        // Create color gradient: blue -> cyan -> green -> yellow -> red
        let r, g, b;
        
        if (normalized < 0.25) {
            // Blue to cyan
            const t = normalized / 0.25;
            r = 0;
            g = t;
            b = 1;
        } else if (normalized < 0.5) {
            // Cyan to green
            const t = (normalized - 0.25) / 0.25;
            r = 0;
            g = 1;
            b = 1 - t;
        } else if (normalized < 0.75) {
            // Green to yellow
            const t = (normalized - 0.5) / 0.25;
            r = t;
            g = 1;
            b = 0;
        } else {
            // Yellow to red
            const t = (normalized - 0.75) / 0.25;
            r = 1;
            g = 1 - t;
            b = 0;
        }
        
        return new THREE.Color(r, g, b);
    };
    
    /**
     * Create 3D heatmap mesh from visualization data
     * @param {Object} data - Visualization data with mesh_points and temperature_values
     */
    const createHeatmapMesh = (data) => {
        if (!data.mesh_points || !data.temperature_values) {
            console.error("Invalid visualization data");
            return null;
        }
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        const minTemp = data.metadata.min_temperature;
        const maxTemp = data.metadata.max_temperature;
        
        // Create vertices and colors
        for (let i = 0; i < data.mesh_points.length; i++) {
            const point = data.mesh_points[i];
            const temperature = data.temperature_values[i];
            
            positions.push(point.x, point.y, point.z);
            
            const color = getTemperatureColor(temperature, minTemp, maxTemp);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        // Create mesh
        const mesh = new THREE.Points(geometry, material);
        
        return mesh;
    };
    
    /**
     * Update temperature legend
     * @param {number} minTemp - Minimum temperature
     * @param {number} maxTemp - Maximum temperature
     */
    const updateLegend = (minTemp, maxTemp) => {
        if (!legend) return;
        
        const legendMax = document.getElementById('legend-max');
        const legendMin = document.getElementById('legend-min');
        
        if (legendMax) legendMax.textContent = Math.round(maxTemp);
        if (legendMin) legendMin.textContent = Math.round(minTemp);
        
        legend.style.display = 'block';
    };
    
    /**
     * Show loading state
     */
    const showLoading = () => {
        if (loading) {
            loading.classList.remove('d-none');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    /**
     * Hide loading state
     */
    const hideLoading = () => {
        if (loading) {
            loading.classList.add('d-none');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    /**
     * Show placeholder
     */
    const showPlaceholder = () => {
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        if (legend) {
            legend.style.display = 'none';
        }
    };
    
    /**
     * Render simulation data in 3D
     * @param {Object} data - Visualization data
     */
    const render = (data) => {
        if (!isInitialized || !scene) {
            console.error("Visualization not initialized");
            return;
        }
        
        showLoading();
        
        // Store data reference
        simulationData = data;
        
        // Remove existing heatmap
        if (heatmapMesh) {
            scene.remove(heatmapMesh);
            if (heatmapMesh.geometry) heatmapMesh.geometry.dispose();
            if (heatmapMesh.material) heatmapMesh.material.dispose();
        }
        
        // Create new heatmap mesh
        heatmapMesh = createHeatmapMesh(data);
        
        if (heatmapMesh) {
            scene.add(heatmapMesh);
            
            // Update legend
            updateLegend(data.metadata.min_temperature, data.metadata.max_temperature);
            
            // Fit camera to show the entire mesh
            const box = new THREE.Box3().setFromObject(heatmapMesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 2; // Add some padding
            
            camera.position.set(cameraZ, cameraZ, cameraZ);
            camera.lookAt(center);
            controls.target.copy(center);
            
            console.log("3D heatmap rendered successfully");
        }
        
        hideLoading();
    };
    
    /**
     * Update visualization with new data
     * @param {Object} data - New simulation data
     */
    const update = (data) => {
        render(data);
    };
    
    /**
     * Load and display visualization data from simulation
     * @param {string} simulationId - ID of the simulation
     */
    const loadVisualizationData = async (simulationId) => {
        if (!isInitialized) {
            console.error("Visualization not initialized");
            return;
        }
        
        try {
            showLoading();
            
            // Get visualization data from Tauri backend
            const data = await PlasmaAPI.getVisualizationData(simulationId);
            
            if (data) {
                render(data);
            } else {
                console.error("No visualization data received");
                hideLoading();
                showPlaceholder();
            }
        } catch (error) {
            console.error("Failed to load visualization data:", error);
            hideLoading();
            showPlaceholder();
        }
    };
    
    /**
     * Interpolate between two temperature arrays for smooth transitions
     * @param {Array} tempArray1 - First temperature array
     * @param {Array} tempArray2 - Second temperature array
     * @param {number} factor - Interpolation factor (0.0 to 1.0)
     * @returns {Array} Interpolated temperature array
     */
    const interpolateTemperatures = (tempArray1, tempArray2, factor) => {
        if (!tempArray1 || !tempArray2 || tempArray1.length !== tempArray2.length) {
            return tempArray1 || tempArray2 || [];
        }
        
        const result = [];
        for (let i = 0; i < tempArray1.length; i++) {
            const temp1 = tempArray1[i];
            const temp2 = tempArray2[i];
            const interpolated = temp1 + (temp2 - temp1) * factor;
            result.push(interpolated);
        }
        
        return result;
    };
    
    /**
     * Update visualization with new time step data during playback
     * @param {Object} timeStepData - Time step data with temperature values
     * @param {Object} options - Update options (interpolation, etc.)
     */
    const updateTimeStep = (timeStepData, options = {}) => {
        if (!isInitialized || !heatmapMesh || !simulationData) {
            console.warn("Cannot update time step: visualization not ready");
            return;
        }
        
        let temperatureValues = timeStepData.temperature_values;
        
        // Apply interpolation if requested and next step data is available
        if (options.interpolate && options.nextStepData && options.interpolationFactor !== undefined) {
            temperatureValues = interpolateTemperatures(
                timeStepData.temperature_values,
                options.nextStepData.temperature_values,
                options.interpolationFactor
            );
        }
        
        // Update temperature values in the existing mesh
        const colors = heatmapMesh.geometry.attributes.color;
        const minTemp = simulationData.metadata.min_temperature;
        const maxTemp = simulationData.metadata.max_temperature;
        
        // Handle different mesh point structures
        let colorIndex = 0;
        for (let i = 0; i < temperatureValues.length; i++) {
            const temperature = temperatureValues[i];
            const color = getTemperatureColor(temperature, minTemp, maxTemp);
            
            // For axisymmetric visualization, we may have multiple points per temperature value
            // Update all points that correspond to this temperature value
            const pointsPerTemp = simulationData.mesh_points.length / temperatureValues.length;
            
            for (let j = 0; j < pointsPerTemp && colorIndex < colors.count; j++) {
                colors.setXYZ(colorIndex, color.r, color.g, color.b);
                colorIndex++;
            }
        }
        
        // Mark colors as needing update
        colors.needsUpdate = true;
        
        console.log(`Updated visualization for time step: ${timeStepData.time}s`);
    };
    
    /**
     * Load playback visualization data and initialize playback controls
     * @param {string} simulationId - ID of the simulation
     */
    const loadPlaybackVisualization = async (simulationId) => {
        if (!isInitialized) {
            console.error("Visualization not initialized");
            return false;
        }
        
        try {
            showLoading();
            
            // Get visualization data with time steps
            const data = await PlasmaAPI.getVisualizationData(simulationId);
            
            if (data && data.time_steps && data.time_steps.length > 0) {
                // Render initial frame (first time step)
                const initialData = {
                    mesh_points: data.mesh_points,
                    temperature_values: data.time_steps[0].temperature_values,
                    metadata: data.metadata
                };
                
                render(initialData);
                
                // Load playback controller with this data
                if (typeof PlaybackController !== 'undefined') {
                    const success = await PlaybackController.loadPlaybackData(simulationId);
                    if (success) {
                        console.log("Playback visualization loaded successfully");
                        return true;
                    }
                }
            } else {
                console.error("No time step data available for playback");
                hideLoading();
                showPlaceholder();
                return false;
            }
        } catch (error) {
            console.error("Failed to load playback visualization:", error);
            hideLoading();
            showPlaceholder();
            return false;
        }
        
        return false;
    };
    
    /**
     * Clear visualization and show placeholder
     */
    const clear = () => {
        if (heatmapMesh && scene) {
            scene.remove(heatmapMesh);
            if (heatmapMesh.geometry) heatmapMesh.geometry.dispose();
            if (heatmapMesh.material) heatmapMesh.material.dispose();
            heatmapMesh = null;
        }
        
        simulationData = null;
        
        // Clear playback controls
        if (typeof PlaybackController !== 'undefined') {
            PlaybackController.clear();
        }
        
        showPlaceholder();
    };
    
    /**
     * Load test visualization data for development/testing
     */
    const loadTestVisualization = async () => {
        console.log("loadTestVisualization() called");
        
        if (!isInitialized) {
            console.error("Visualization not initialized");
            return;
        }
        
        try {
            console.log("Loading test visualization with playback...");
            const success = await loadPlaybackVisualization('test');
            
            if (success) {
                console.log("Test visualization with playback loaded successfully");
            } else {
                console.error("Failed to load test visualization with playback");
                // Fallback to static visualization
                showLoading();
                const testData = await PlasmaAPI.getVisualizationData('test');
                if (testData && testData.time_steps && testData.time_steps.length > 0) {
                    const staticData = {
                        mesh_points: testData.mesh_points,
                        temperature_values: testData.time_steps[0].temperature_values,
                        metadata: testData.metadata
                    };
                    render(staticData);
                } else {
                    hideLoading();
                    showPlaceholder();
                }
            }
        } catch (error) {
            console.error("Failed to load test visualization:", error);
            hideLoading();
            showPlaceholder();
        }
    };
    
    // Return public API
    return {
        init,
        render,
        update,
        updateTimeStep,
        loadVisualizationData,
        loadPlaybackVisualization,
        loadTestVisualization,
        clear,
        resetCamera,
        toggleWireframe
    };
})();

// Initialize on load if visualization tab exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('visualization-tab')) {
        PlasmaVisualization.init();
    }
});
