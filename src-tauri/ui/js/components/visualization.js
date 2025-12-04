/**
 * VisualizationPanel - 3D heatmap visualization component
 * 
 * Handles 3D rendering of temperature distribution using Three.js
 * Provides camera controls, heatmap rendering, and user interactions
 */
class VisualizationPanel {
    constructor(container, eventBus) {
        this.container = container;
        this.eventBus = eventBus;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Visualization data
        this.simulationData = null;
        this.currentTimeStep = 0;
        this.totalTimeSteps = 0;
        
        // Geometry and materials
        this.furnaceGeometry = null;
        this.heatmapGroup = null;  // 3D volumetric particle system for heat visualization
        this.temperatureTexture = null;
        
        // UI elements
        this.canvas = null;
        this.hoverInfo = null;
        
        // State
        this.isInitialized = false;
        this.isRendering = false;
        this.animationId = null;
        
        // Temperature range for color mapping
        this.minTemperature = 300; // Room temperature in Kelvin
        this.maxTemperature = 2000; // High temperature in Kelvin
        
        // Bind methods
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        
        console.log('[VisualizationPanel] Created');
    }

    /**
     * Initialize the 3D rendering context
     */
    async init() {
        console.log('🎨 [VISUALIZATION] Starting 3D rendering context initialization...');
        
        try {
            console.log('📚 [VISUALIZATION] Checking Three.js availability...');
            // Check if Three.js is loaded
            if (typeof THREE === 'undefined') {
                console.error('❌ [VISUALIZATION] Three.js library not loaded');
                throw new Error('Three.js library not loaded');
            }
            console.log('✅ [VISUALIZATION] Three.js library available:', THREE.REVISION);
            
            console.log('🖥️ [VISUALIZATION] Validating WebGL support...');
            // Check WebGL support
            if (!this.validateWebGLSupport()) {
                console.error('❌ [VISUALIZATION] WebGL not supported');
                throw new Error('WebGL is not supported by this browser');
            }
            console.log('✅ [VISUALIZATION] WebGL support validated');
            
            console.log('🎯 [VISUALIZATION] Finding canvas element...');
            // Find canvas element
            this.canvas = this.container.querySelector('#visualization-canvas');
            console.log('🎯 [VISUALIZATION] Canvas element found:', !!this.canvas);
            
            if (!this.canvas) {
                console.error('❌ [VISUALIZATION] Visualization canvas not found in container');
                console.log('🔍 [VISUALIZATION] Container contents:', this.container.innerHTML.substring(0, 200));
                throw new Error('Visualization canvas not found');
            }
            
            console.log('🎯 [VISUALIZATION] Canvas dimensions:', {
                width: this.canvas.clientWidth,
                height: this.canvas.clientHeight
            });
            
            console.log('ℹ️ [VISUALIZATION] Finding hover info element...');
            // Find hover info element
            this.hoverInfo = this.container.querySelector('#hover-info');
            console.log('ℹ️ [VISUALIZATION] Hover info element found:', !!this.hoverInfo);
            
            console.log('🏗️ [VISUALIZATION] Initializing Three.js components...');
            // Initialize Three.js scene
            this.initScene();
            this.initCamera();
            this.initRenderer();
            this.initControls();
            this.initLighting();
            
            console.log('🏭 [VISUALIZATION] Creating basic furnace geometry...');
            // Create basic furnace geometry
            this.createFurnaceGeometry();
            
            console.log('👂 [VISUALIZATION] Setting up event listeners...');
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('🔄 [VISUALIZATION] Starting render loop...');
            // Start render loop
            this.startRenderLoop();
            
            this.isInitialized = true;
            console.log('🎉 [VISUALIZATION] 3D rendering context initialized successfully');
            
            console.log('📡 [VISUALIZATION] Emitting visualization:initialized event...');
            // Emit initialization event
            this.eventBus.emit('visualization:initialized', {
                renderer: this.renderer.info,
                capabilities: this.renderer.capabilities,
                canvas: {
                    width: this.canvas.clientWidth,
                    height: this.canvas.clientHeight
                }
            });
            
            return true;
            
        } catch (error) {
            console.error('💥 [VISUALIZATION] Failed to initialize 3D rendering:', error);
            console.error('📍 [VISUALIZATION] Error stack:', error.stack);
            
            console.log('📡 [VISUALIZATION] Emitting visualization:error event...');
            this.eventBus.emit('visualization:error', {
                type: 'initialization',
                message: error.message,
                error: error
            });
            return false;
        }
    }

    /**
     * Initialize Three.js scene
     * @private
     */
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Dark background
        
        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);
        
        console.log('[VisualizationPanel] Scene initialized');
    }

    /**
     * Initialize camera with appropriate settings for furnace visualization
     * @private
     */
    initCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        // Position camera to view cylindrical furnace
        this.camera.position.set(5, 3, 5);
        this.camera.lookAt(0, 1, 0); // Look at center of furnace
        
        console.log('[VisualizationPanel] Camera initialized');
    }

    /**
     * Initialize WebGL renderer
     * @private
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable shadows for better visual quality
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Set tone mapping for better color representation
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        console.log('[VisualizationPanel] Renderer initialized');
    }

    /**
     * Initialize camera controls for user interaction
     * @private
     */
    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        
        // Configure controls for furnace visualization
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        
        // Set limits for better user experience
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI * 0.9; // Prevent going under the furnace
        
        // Set target to center of furnace
        this.controls.target.set(0, 1, 0);
        
        console.log('[VisualizationPanel] Camera controls initialized');
    }

    /**
     * Initialize lighting for the scene
     * @private
     */
    initLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light for shadows and definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        
        this.scene.add(directionalLight);
        
        // Point light for additional illumination
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
        pointLight.position.set(-5, 5, -5);
        this.scene.add(pointLight);
        
        console.log('[VisualizationPanel] Lighting initialized');
    }

    /**
     * Create basic cylindrical geometry for furnace visualization
     * @private
     */
    createFurnaceGeometry() {
        // Default furnace dimensions (will be updated with actual parameters)
        const radius = 1.0;
        const height = 2.0;
        const radialSegments = 32;
        const heightSegments = 16;
        
        // Create cylindrical geometry with CLOSED ends (top and bottom caps)
        const geometry = new THREE.CylinderGeometry(
            radius, radius, height, 
            radialSegments, heightSegments, 
            false // Closed - includes top and bottom caps
        );
        
        // Create wireframe material for furnace outline
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.15  // Less prominent so particles stand out
        });
        
        // Create furnace outline mesh
        this.furnaceOutline = new THREE.Mesh(geometry, wireframeMaterial);
        this.furnaceOutline.position.y = height / 2;
        this.scene.add(this.furnaceOutline);
        
        // Store geometry for heatmap mesh creation
        this.furnaceGeometry = geometry.clone();
        
        // Create torch visualization (will be positioned based on parameters)
        this.createTorchVisualization();
        
        console.log('[VisualizationPanel] Closed cylinder geometry created with top and bottom caps');
    }
    
    /**
     * Create torch visualization as a point heat source
     * @private
     */
    createTorchVisualization() {
        // Remove existing torch if any
        if (this.torchMesh) {
            this.scene.remove(this.torchMesh);
            if (this.torchMesh.geometry) this.torchMesh.geometry.dispose();
            if (this.torchMesh.material) this.torchMesh.material.dispose();
        }
        
        // Create a small sphere to represent the torch
        const torchGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const torchMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400 // Bright orange-red for heat source
        });
        
        this.torchMesh = new THREE.Mesh(torchGeometry, torchMaterial);
        
        // Default position (center, middle height) - will be updated with actual parameters
        this.torchMesh.position.set(0, 1.0, 0);
        
        // Add a point light at torch position for visual effect
        this.torchLight = new THREE.PointLight(0xff4400, 1.5, 3);
        this.torchLight.position.copy(this.torchMesh.position);
        
        this.scene.add(this.torchMesh);
        this.scene.add(this.torchLight);
        
        console.log('[VisualizationPanel] Torch visualization created');
    }
    
    /**
     * Update torch position based on simulation parameters
     * @private
     */
    updateTorchPosition(torchParams) {
        if (!this.torchMesh) return;
        
        // Get furnace dimensions
        const furnaceHeight = this.furnaceOutline ? this.furnaceOutline.geometry.parameters.height : 2.0;
        
        // Always place torch at bottom center of cylinder
        // Y-axis is the cylinder axis in Three.js, with origin at center
        // Bottom of cylinder is at y = 0 (since cylinder position.y = height/2)
        const torchY = 0.05; // Slightly above the bottom to be visible
        
        this.torchMesh.position.set(0, torchY, 0);
        
        if (this.torchLight) {
            this.torchLight.position.copy(this.torchMesh.position);
        }
        
        console.log('[VisualizationPanel] Torch position updated to bottom center:', { 
            y: torchY, 
            furnaceHeight, 
            cartesian: this.torchMesh.position 
        });
    }

    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize);
        
        // Mouse interactions
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('click', this.onMouseClick);
        
        // EventBus events
        this.eventBus.on('simulation:completed', this.handleSimulationCompleted.bind(this));
        this.eventBus.on('animation:timeChanged', this.handleTimeChanged.bind(this));
        this.eventBus.on('parameters:changed', this.handleParametersChanged.bind(this));
        
        console.log('[VisualizationPanel] Event listeners set up');
    }

    /**
     * Start the render loop
     * @private
     */
    startRenderLoop() {
        this.isRendering = true;
        this.render();
        console.log('[VisualizationPanel] Render loop started');
    }

    /**
     * Main render loop with FPS tracking
     * @private
     */
    render() {
        if (!this.isRendering) return;
        
        this.animationId = requestAnimationFrame(this.render);
        
        // Track render performance
        const renderStart = performance.now();
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Track render time (for debugging, not included in frame update metrics)
        const renderTime = performance.now() - renderStart;
        
        // Log performance warnings if render is slow
        if (renderTime > 33) { // More than 33ms = below 30 FPS
            if (Math.random() < 0.01) { // Log occasionally to avoid spam
                console.warn('[VisualizationPanel] Slow render detected:', renderTime.toFixed(2) + 'ms');
            }
        }
    }

    /**
     * Handle window resize
     * @private
     */
    onWindowResize() {
        if (!this.camera || !this.renderer || !this.canvas) return;
        
        // Get dimensions from the parent container instead of canvas
        // This is more reliable during resize events
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Validate dimensions before applying
        if (width <= 0 || height <= 0) {
            console.warn('[VisualizationPanel] Invalid dimensions during resize:', width, 'x', height);
            return;
        }
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(width, height);
        
        console.log('[VisualizationPanel] Resized to', width, 'x', height);
    }

    /**
     * Handle mouse move for hover interactions
     * @private
     */
    onMouseMove(event) {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.01) { // 1% chance to log
            console.log('🖱️ [VISUALIZATION] USER ACTION: Mouse move on canvas');
        }
        
        if (!this.heatmapGroup || !this.simulationData) {
            if (Math.random() < 0.01) {
                console.log('🖱️ [VISUALIZATION] No heatmap or simulation data for hover:', {
                    heatmapGroup: !!this.heatmapGroup,
                    simulationData: !!this.simulationData
                });
            }
            return;
        }
        
        // Calculate mouse position in normalized device coordinates
        const rect = this.canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find intersection with heatmap
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const intersects = raycaster.intersectObject(this.heatmapGroup);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            if (Math.random() < 0.01) {
                console.log('🖱️ [VISUALIZATION] Hover intersection found:', {
                    point: intersection.point,
                    distance: intersection.distance
                });
            }
            this.showHoverInfo(intersection, event.clientX, event.clientY);
        } else {
            this.hideHoverInfo();
        }
    }

    /**
     * Handle mouse click interactions
     * @private
     */
    onMouseClick(event) {
        console.log('🖱️ [VISUALIZATION] USER ACTION: Canvas clicked');
        console.log('🖱️ [VISUALIZATION] Click details:', {
            clientX: event.clientX,
            clientY: event.clientY,
            button: event.button,
            hasHeatmap: !!this.heatmapGroup,
            hasSimulationData: !!this.simulationData
        });
        
        // Future: Could be used for selecting points or other interactions
        if (this.heatmapGroup && this.simulationData) {
            // Calculate mouse position for potential future interactions
            const rect = this.canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            console.log('🖱️ [VISUALIZATION] Normalized mouse coordinates:', mouse);
        }
    }

    /**
     * Show hover information
     * @private
     */
    showHoverInfo(intersection, clientX, clientY) {
        if (!this.hoverInfo) return;
        
        // Calculate temperature at intersection point
        const temperature = this.getTemperatureAtPoint(intersection.point);
        
        // Convert world coordinates to cylindrical coordinates
        const r = Math.sqrt(intersection.point.x ** 2 + intersection.point.z ** 2);
        const z = intersection.point.y;
        
        // Update hover info content
        const tempElement = this.hoverInfo.querySelector('#hover-temp');
        const rElement = this.hoverInfo.querySelector('#hover-r');
        const zElement = this.hoverInfo.querySelector('#hover-z');
        
        if (tempElement) tempElement.textContent = temperature.toFixed(1);
        if (rElement) rElement.textContent = r.toFixed(2);
        if (zElement) zElement.textContent = z.toFixed(2);
        
        // Position hover info near cursor
        this.hoverInfo.style.left = (clientX + 10) + 'px';
        this.hoverInfo.style.top = (clientY - 10) + 'px';
        this.hoverInfo.style.display = 'block';
    }

    /**
     * Hide hover information
     * @private
     */
    hideHoverInfo() {
        if (this.hoverInfo) {
            this.hoverInfo.style.display = 'none';
        }
    }

    /**
     * Load simulation data and create heatmap visualization with real backend data
     * Enhanced to handle both single-frame and animation datasets
     * @param {Object} simulationResults - Results from backend containing temperature data
     */
    loadSimulationData(simulationResults) {
        try {
            console.log('[VisualizationPanel] Loading real backend simulation data...');
            console.log('[VisualizationPanel] Results structure:', {
                hasTimeSteps: !!simulationResults.timeSteps,
                timeStepsCount: simulationResults.timeSteps?.length,
                hasTemperatureData: !!simulationResults.temperatureData,
                temperatureDataType: Array.isArray(simulationResults.temperatureData) ? 'array' : typeof simulationResults.temperatureData,
                hasMetadata: !!simulationResults.metadata,
                duration: simulationResults.duration,
                isAnimationDataset: this.isAnimationDataset(simulationResults)
            });
            
            // Ensure visualization is initialized before loading data
            if (!this.isInitialized) {
                console.warn('[VisualizationPanel] Visualization not initialized, cannot load data yet');
                throw new Error('Visualization not initialized');
            }
            
            // Validate that we have temperature data from backend
            if (!simulationResults.temperatureData || !Array.isArray(simulationResults.temperatureData)) {
                console.error('[VisualizationPanel] Invalid or missing temperature data from backend');
                throw new Error('No valid temperature data received from backend');
            }
            
            // Store simulation data
            this.simulationData = simulationResults;
            this.totalTimeSteps = simulationResults.timeSteps ? simulationResults.timeSteps.length : 1;
            this.currentTimeStep = 0;
            
            // Initialize performance monitoring
            this.initPerformanceMonitoring();
            
            console.log('[VisualizationPanel] Simulation data stored:', {
                totalTimeSteps: this.totalTimeSteps,
                temperatureGridSize: `${simulationResults.temperatureData.length}x${simulationResults.temperatureData[0]?.length || 0}`,
                isAnimationDataset: this.isAnimationDataset(simulationResults)
            });
            
            // Update temperature range from backend data
            this.updateTemperatureRange();
            console.log('[VisualizationPanel] Temperature range updated:', {
                min: this.minTemperature,
                max: this.maxTemperature
            });
            
            // Update furnace geometry and torch position from simulation parameters
            if (simulationResults.metadata && simulationResults.metadata.parameters) {
                const params = simulationResults.metadata.parameters;
                
                // Update furnace geometry if we have furnace parameters
                if (params.furnace) {
                    this.updateFurnaceGeometryFromParams(params.furnace);
                    console.log('[VisualizationPanel] Furnace geometry updated from parameters');
                }
                
                // Update torch position
                if (params.torch) {
                    this.updateTorchPosition(params.torch);
                    console.log('[VisualizationPanel] Torch position updated from parameters');
                }
            }
            
            // Create heatmap mesh with particle system
            this.createHeatmapMesh();
            console.log('[VisualizationPanel] Heatmap mesh created');
            
            // Set initial time step and apply backend temperature data
            this.setTimeStep(0);
            
            // Force an immediate color update with real backend data
            if (this.heatmapGroup && this.particlePositions) {
                this.updateHeatmapColors();
                console.log('[VisualizationPanel] Initial heatmap colors applied from backend data');
            }
            
            // Update frame metadata display
            this.updateFrameMetadata(0, this.getActualTimeForStep(0));
            
            console.log('[VisualizationPanel] ✅ Real backend simulation data loaded successfully');
            
            // Prepare animation data if we have multiple time steps
            let animationReady = false;
            if (this.totalTimeSteps > 1) {
                this.prepareForAnimation(simulationResults);
                animationReady = true;
                console.log('[VisualizationPanel] Animation prepared for', this.totalTimeSteps, 'time steps');
            }
            
            // Emit visualization loaded event with complete data for animation coordination
            this.eventBus.emit('visualization:loaded', {
                timeSteps: this.totalTimeSteps,
                duration: simulationResults.duration || (this.totalTimeSteps * 0.5),
                temperatureRange: {
                    min: this.minTemperature,
                    max: this.maxTemperature
                },
                animationReady: animationReady,
                simulationData: {
                    timeSteps: simulationResults.timeSteps,
                    duration: simulationResults.duration,
                    metadata: simulationResults.metadata
                },
                dataSource: 'backend' // Indicate this is real backend data
            });
            
        } catch (error) {
            console.error('[VisualizationPanel] ❌ Failed to load simulation data:', error);
            console.error('[VisualizationPanel] Error stack:', error.stack);
            this.eventBus.emit('visualization:error', {
                type: 'data_loading',
                message: error.message,
                error: error
            });
        }
    }

    /**
     * Check if simulation results contain animation dataset (multiple time steps)
     * @private
     * @param {Object} simulationResults - Results from backend
     * @returns {boolean} True if this is an animation dataset
     */
    isAnimationDataset(simulationResults) {
        if (!simulationResults.temperatureData || !Array.isArray(simulationResults.temperatureData)) {
            return false;
        }
        
        // Check if temperature data is 3D array [timeStep][row][col]
        return Array.isArray(simulationResults.temperatureData[0]) && 
               Array.isArray(simulationResults.temperatureData[0][0]);
    }

    /**
     * Prepare visualization for animation playback
     * @private
     */
    prepareForAnimation(simulationResults) {
        try {
            // Pre-process temperature data for smooth animation
            this.preprocessTemperatureData();
            
            // Set up animation configuration
            this.config = {
                showLoadingOnTimeChange: this.totalTimeSteps > 50, // Only for large datasets
                smoothTransitions: false, // Disabled by default for performance
                preloadFrames: Math.min(10, this.totalTimeSteps) // Preload up to 10 frames
            };
            
            console.log('[VisualizationPanel] Prepared for animation with config:', this.config);
            
            this.eventBus.emit('visualization:animationReady', {
                totalTimeSteps: this.totalTimeSteps,
                config: this.config
            });
            
        } catch (error) {
            console.error('[VisualizationPanel] Failed to prepare for animation:', error);
            this.eventBus.emit('visualization:error', {
                type: 'animation_preparation',
                message: error.message,
                error: error
            });
        }
    }

    /**
     * Update visualization to a specific time step (optimized for animation)
     * This is the main method used by animation controller for frame updates
     * @param {number} timeStep - The time step index to display
     * @param {Object} temperatureData - Optional pre-loaded temperature data for this time step
     */
    async updateToTimeStep(timeStep, temperatureData = null) {
        if (!this.simulationData || !this.heatmapGroup) {
            console.warn('[VisualizationPanel] Cannot update to time step - missing data');
            return;
        }
        
        // Clamp time step to valid range
        const clampedTimeStep = Math.max(0, Math.min(timeStep, this.totalTimeSteps - 1));
        
        // Track performance
        const startTime = performance.now();
        
        // Update current time step
        this.currentTimeStep = clampedTimeStep;
        
        // Get temperature data if not provided
        const tempData = temperatureData || this.getTemperatureDataForTimeStep(clampedTimeStep);
        
        if (!tempData) {
            console.error('[VisualizationPanel] No temperature data for time step:', clampedTimeStep);
            return;
        }
        
        // Update particle colors efficiently (only color buffer, not geometry)
        this.updateParticleColorsOptimized(tempData);
        
        // Get actual simulation time
        const actualTime = this.getActualTimeForStep(clampedTimeStep);
        
        // Update frame metadata display
        this.updateFrameMetadata(clampedTimeStep, actualTime);
        
        // Track performance
        const updateTime = performance.now() - startTime;
        this.recordFrameUpdatePerformance(updateTime);
        
        // Emit event
        this.eventBus.emit('visualization:frameUpdated', {
            timeStep: clampedTimeStep,
            actualTime: actualTime,
            updateTime: updateTime
        });
        
        console.log('[VisualizationPanel] Frame updated:', {
            timeStep: clampedTimeStep,
            actualTime: actualTime ? actualTime.toFixed(2) + 's' : 'N/A',
            updateTime: updateTime.toFixed(2) + 'ms'
        });
    }

    /**
     * Optimized particle color update - only updates color buffer without geometry recreation
     * @private
     * @param {Array} temperatureData - 2D temperature grid for current time step
     */
    updateParticleColorsOptimized(temperatureData) {
        if (!this.heatmapGroup || !this.particlePositions) {
            return;
        }
        
        const geometry = this.heatmapGroup.geometry;
        const colors = geometry.attributes.color;
        
        if (!colors) {
            console.error('[VisualizationPanel] No color attribute on heatmap geometry');
            return;
        }
        
        // Get furnace dimensions
        let furnaceHeight, furnaceRadius;
        const furnaceGeom = this.furnaceGeometry || (this.furnaceOutline ? this.furnaceOutline.geometry : null);
        
        if (furnaceGeom && furnaceGeom.parameters) {
            furnaceHeight = furnaceGeom.parameters.height;
            furnaceRadius = furnaceGeom.parameters.radiusTop;
        } else {
            const params = this.simulationData?.metadata?.parameters;
            furnaceHeight = params?.furnace?.height ?? 2.0;
            furnaceRadius = params?.furnace?.radius ?? 1.0;
        }
        
        // Update each particle color - optimized loop
        for (let i = 0; i < this.particlePositions.length; i++) {
            const pos = this.particlePositions[i];
            
            // Normalize position coordinates
            const normalizedR = pos.r / furnaceRadius;
            const normalizedY = (pos.y + furnaceHeight / 2) / furnaceHeight;
            
            // Get temperature for this position
            const temperature = this.getTemperatureAt3DPosition(
                normalizedR,
                normalizedY,
                temperatureData
            );
            
            // Convert temperature to color
            const color = this.temperatureToColor(temperature);
            
            // Update particle color directly
            colors.setXYZ(i, color.r, color.g, color.b);
        }
        
        // Mark colors as needing update (this is the only GPU operation needed)
        colors.needsUpdate = true;
    }

    /**
     * Enable or disable smooth transitions between frames
     * @param {boolean} enabled - Whether to enable smooth transitions
     */
    enableSmoothTransitions(enabled) {
        if (!this.config) {
            this.config = {};
        }
        
        this.config.smoothTransitions = enabled;
        console.log('[VisualizationPanel] Smooth transitions:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Update frame metadata display (time, step, temperature range)
     * @param {number} timeStep - Current time step index
     * @param {number} actualTime - Actual simulation time in seconds
     */
    updateFrameMetadata(timeStep, actualTime) {
        // Update temperature legend with current range
        this.updateTemperatureLegend();
        
        // Emit event with metadata for UI components to display
        this.eventBus.emit('visualization:metadataUpdated', {
            timeStep: timeStep,
            totalTimeSteps: this.totalTimeSteps,
            actualTime: actualTime,
            temperatureRange: {
                min: this.minTemperature,
                max: this.maxTemperature
            }
        });
    }

    /**
     * Initialize performance monitoring for animation playback
     * @private
     */
    initPerformanceMonitoring() {
        this.performanceMetrics = {
            frameUpdateTimes: [],
            maxSamples: 60, // Track last 60 frame updates
            lastFpsUpdate: performance.now(),
            frameCount: 0,
            currentFps: 0
        };
        
        console.log('[VisualizationPanel] Performance monitoring initialized');
    }

    /**
     * Record frame update performance
     * @private
     * @param {number} updateTime - Time taken to update frame in milliseconds
     */
    recordFrameUpdatePerformance(updateTime) {
        if (!this.performanceMetrics) {
            return;
        }
        
        // Add to samples
        this.performanceMetrics.frameUpdateTimes.push(updateTime);
        
        // Keep only recent samples
        if (this.performanceMetrics.frameUpdateTimes.length > this.performanceMetrics.maxSamples) {
            this.performanceMetrics.frameUpdateTimes.shift();
        }
        
        // Update frame count for FPS calculation
        this.performanceMetrics.frameCount++;
        
        // Calculate FPS every second
        const now = performance.now();
        const elapsed = now - this.performanceMetrics.lastFpsUpdate;
        
        if (elapsed >= 1000) {
            this.performanceMetrics.currentFps = Math.round(
                (this.performanceMetrics.frameCount * 1000) / elapsed
            );
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFpsUpdate = now;
            
            // Emit FPS update
            this.eventBus.emit('visualization:fpsUpdated', {
                fps: this.performanceMetrics.currentFps
            });
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance metrics including FPS and average frame update time
     */
    getPerformanceMetrics() {
        if (!this.performanceMetrics || this.performanceMetrics.frameUpdateTimes.length === 0) {
            return {
                fps: 0,
                avgFrameUpdateTime: 0,
                minFrameUpdateTime: 0,
                maxFrameUpdateTime: 0
            };
        }
        
        const times = this.performanceMetrics.frameUpdateTimes;
        const sum = times.reduce((a, b) => a + b, 0);
        const avg = sum / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        return {
            fps: this.performanceMetrics.currentFps,
            avgFrameUpdateTime: avg.toFixed(2),
            minFrameUpdateTime: min.toFixed(2),
            maxFrameUpdateTime: max.toFixed(2),
            sampleCount: times.length
        };
    }

    /**
     * Pre-process temperature data for efficient animation
     * Optimizes backend data structure for fast time step switching
     * @private
     */
    preprocessTemperatureData() {
        if (!this.simulationData || !this.simulationData.temperatureData) {
            console.warn('[VisualizationPanel] No temperature data to preprocess');
            return;
        }
        
        // Backend data is already in an efficient format (2D/3D arrays)
        // Future optimization: could cache interpolated values or create texture maps
        
        console.log('[VisualizationPanel] Backend temperature data ready for animation:', {
            dataType: Array.isArray(this.simulationData.temperatureData[0]?.[0]) ? '3D array' : '2D array',
            gridSize: `${this.simulationData.temperatureData.length}x${this.simulationData.temperatureData[0]?.length || 0}`
        });
    }

    /**
     * Update temperature range from simulation data
     * Uses backend-provided temperature range or calculates from data
     * @private
     */
    updateTemperatureRange() {
        if (!this.simulationData) {
            console.warn('[VisualizationPanel] No simulation data for temperature range');
            return;
        }
        
        // First, try to use temperature range from metadata (most accurate)
        if (this.simulationData.metadata && this.simulationData.metadata.temperatureRange) {
            this.minTemperature = this.simulationData.metadata.temperatureRange.min;
            this.maxTemperature = this.simulationData.metadata.temperatureRange.max;
            console.log('[VisualizationPanel] Temperature range from metadata:', { 
                min: this.minTemperature, 
                max: this.maxTemperature 
            });
            return;
        }
        
        // Fallback: calculate from temperature data
        if (!this.simulationData.temperatureData || !Array.isArray(this.simulationData.temperatureData)) {
            console.warn('[VisualizationPanel] No temperature data available for range calculation');
            return;
        }
        
        let min = Infinity;
        let max = -Infinity;
        
        // Handle both 2D [row][col] and 3D [timeStep][row][col] arrays
        const data = this.simulationData.temperatureData;
        
        const processGrid = (grid) => {
            if (!Array.isArray(grid)) return;
            
            grid.forEach(row => {
                if (Array.isArray(row)) {
                    row.forEach(temp => {
                        if (typeof temp === 'number' && !isNaN(temp)) {
                            min = Math.min(min, temp);
                            max = Math.max(max, temp);
                        }
                    });
                }
            });
        };
        
        // Check if this is a 3D array (multiple time steps)
        if (Array.isArray(data[0]) && Array.isArray(data[0][0])) {
            // 3D array: [timeStep][row][col]
            data.forEach(timeStepGrid => processGrid(timeStepGrid));
        } else {
            // 2D array: [row][col]
            processGrid(data);
        }
        
        // Only update if we found valid values
        if (min !== Infinity && max !== -Infinity) {
            this.minTemperature = min;
            this.maxTemperature = max;
            console.log('[VisualizationPanel] Temperature range calculated from data:', { min, max });
        } else {
            console.warn('[VisualizationPanel] Could not calculate temperature range, using defaults');
        }
    }

    /**
     * Create heatmap mesh with temperature visualization
     * Uses volumetric cross-sections to show 3D heat distribution
     * @private
     */
    createHeatmapMesh() {
        // Check if we have furnace geometry available
        if (!this.furnaceGeometry && !this.furnaceOutline) {
            console.error('[VisualizationPanel] No furnace geometry available for heatmap');
            return;
        }
        
        // Remove existing heatmap meshes
        if (this.heatmapGroup) {
            this.scene.remove(this.heatmapGroup);
            this.heatmapGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Create true 3D volumetric heatmap using particle system
        this.create3DVolumetricHeatmap();
        
        console.log('[VisualizationPanel] 3D volumetric heatmap created');
    }
    
    /**
     * Create 3D volumetric heatmap using particles throughout the cylinder volume
     * @private
     */
    create3DVolumetricHeatmap() {
        // Use furnaceGeometry if available, otherwise use furnaceOutline.geometry
        let geometry = this.furnaceGeometry || (this.furnaceOutline ? this.furnaceOutline.geometry : null);
        
        // Get dimensions - use geometry if available, otherwise use simulation parameters
        let furnaceHeight, furnaceRadius;
        
        if (geometry && geometry.parameters) {
            furnaceHeight = geometry.parameters.height;
            furnaceRadius = geometry.parameters.radiusTop;
        } else {
            // Fallback to simulation parameters
            console.warn('[VisualizationPanel] No geometry available, using simulation parameters');
            const params = this.simulationData?.metadata?.parameters;
            furnaceHeight = params?.furnace?.height ?? 2.0;
            furnaceRadius = params?.furnace?.radius ?? 1.0;
        }
        
        // Create a 3D grid of particles throughout the cylinder volume
        // Use a more even distribution by sampling points in a grid pattern
        // Get mesh resolution from simulation parameters or use default
        const meshResolution = this.simulationData?.metadata?.parameters?.advanced?.meshResolution || 'medium';
        
        // Map mesh resolution to grid density
        const resolutionMap = {
            'coarse': 12,   // ~5,500 particles
            'medium': 18,   // ~12,000 particles  
            'fine': 24      // ~29,000 particles
        };
        
        const gridResolution = resolutionMap[meshResolution] || 18;
        const particles = [];
        const colors = [];
        
        // Store particle positions for temperature mapping
        this.particlePositions = [];
        
        // Generate points using a more uniform distribution with jitter to fill gaps
        // Create a cubic grid and filter points that fall within the cylinder
        const xSteps = gridResolution;
        const ySteps = gridResolution;
        const zSteps = gridResolution;
        
        // Calculate step sizes
        const xStep = (2 * furnaceRadius) / xSteps;
        const yStep = furnaceHeight / ySteps;
        const zStep = (2 * furnaceRadius) / zSteps;
        
        // Add significant jitter to break up grid patterns and fill gaps
        const jitterAmount = 0.45; // Increased jitter to fill gaps better
        
        for (let xi = 0; xi < xSteps; xi++) {
            for (let zi = 0; zi < zSteps; zi++) {
                for (let yi = 0; yi < ySteps; yi++) {
                    // Base position with half-step offset to center particles in cells
                    let x = (xi + 0.5) * xStep - furnaceRadius;
                    let z = (zi + 0.5) * zStep - furnaceRadius;
                    let y = (yi + 0.5) * yStep - (furnaceHeight / 2);
                    
                    // Add jitter to break up grid patterns
                    x += (Math.random() - 0.5) * xStep * jitterAmount;
                    z += (Math.random() - 0.5) * zStep * jitterAmount;
                    y += (Math.random() - 0.5) * yStep * jitterAmount;
                    
                    // Check if point is within cylinder radius (with small margin)
                    const r = Math.sqrt(x * x + z * z);
                    if (r <= furnaceRadius * 0.98) { // Slightly inside to avoid edge artifacts
                        // Add particle position
                        particles.push(x, y, z);
                        
                        // Calculate cylindrical coordinates for temperature mapping
                        const theta = Math.atan2(z, x);
                        
                        // Store position for temperature mapping
                        this.particlePositions.push({ x, y, z, r, theta });
                        
                        // Default color (will be updated with temperature data)
                        colors.push(0.3, 0.3, 0.8); // Blue default
                    }
                }
            }
        }
        
        // Create geometry for particles
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
        particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create material for particles with additive blending for glow effect
        const material = new THREE.PointsMaterial({
            size: 0.05,  // Slightly larger for better visibility
            vertexColors: true,
            transparent: true,
            opacity: 0.85,  // More opaque for better visibility
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        // Create particle system
        this.heatmapGroup = new THREE.Points(particleGeometry, material);
        this.heatmapGroup.position.y = this.furnaceOutline ? this.furnaceOutline.position.y : (furnaceHeight / 2);
        
        // Add to scene
        this.scene.add(this.heatmapGroup);
        
        console.log(`[VisualizationPanel] Created 3D volumetric heatmap with ${particles.length / 3} particles`);
        console.log('[VisualizationPanel] Furnace dimensions:', { height: furnaceHeight, radius: furnaceRadius });
        console.log('[VisualizationPanel] Particle positions stored:', this.particlePositions.length);
        console.log('[VisualizationPanel] Grid resolution:', { xSteps, ySteps, zSteps });
    }


    /**
     * Set current time step and update visualization with real backend data
     * @param {number} timeStep - The time step index to display
     */
    setTimeStep(timeStep) {
        if (!this.simulationData || !this.heatmapGroup) {
            console.warn('[VisualizationPanel] Cannot set time step - missing data:', {
                hasSimulationData: !!this.simulationData,
                hasHeatmapGroup: !!this.heatmapGroup
            });
            return;
        }
        
        // Clamp time step to valid range
        const clampedTimeStep = Math.max(0, Math.min(timeStep, this.totalTimeSteps - 1));
        
        if (clampedTimeStep !== this.currentTimeStep) {
            this.currentTimeStep = clampedTimeStep;
            
            // Update heatmap colors for current time step using backend data
            this.updateHeatmapColors();
            
            // Get actual simulation time for this step
            const actualTime = this.getActualTimeForStep(clampedTimeStep);
            
            console.log('[VisualizationPanel] Time step updated:', {
                step: this.currentTimeStep,
                totalSteps: this.totalTimeSteps,
                actualTime: actualTime ? actualTime.toFixed(2) + 's' : 'N/A'
            });
            
            // Emit event with both step index and actual time
            this.eventBus.emit('visualization:timeStepChanged', {
                timeStep: this.currentTimeStep,
                totalTimeSteps: this.totalTimeSteps,
                actualTime: actualTime
            });
        }
    }
    
    /**
     * Get the actual simulation time (in seconds) for a given time step index
     * @private
     * @param {number} stepIndex - The time step index
     * @returns {number|null} The actual time in seconds, or null if not available
     */
    getActualTimeForStep(stepIndex) {
        if (!this.simulationData || !this.simulationData.timeSteps) {
            return null;
        }
        
        // Check if we have time step data
        if (Array.isArray(this.simulationData.timeSteps) && this.simulationData.timeSteps.length > stepIndex) {
            const timeStepData = this.simulationData.timeSteps[stepIndex];
            return timeStepData.time || null;
        }
        
        // Fallback: calculate based on duration and total steps
        if (this.simulationData.duration && this.totalTimeSteps > 0) {
            return (stepIndex / (this.totalTimeSteps - 1)) * this.simulationData.duration;
        }
        
        return null;
    }

    /**
     * Update heatmap colors based on current time step using real backend data
     * Updates all particles to show 3D heat distribution throughout the volume
     * @private
     */
    updateHeatmapColors() {
        if (!this.heatmapGroup || !this.particlePositions || !this.simulationData) {
            console.warn('[VisualizationPanel] Cannot update heatmap colors - missing data:', {
                hasHeatmapGroup: !!this.heatmapGroup,
                hasParticlePositions: !!this.particlePositions,
                hasSimulationData: !!this.simulationData
            });
            return;
        }
        
        const geometry = this.heatmapGroup.geometry;
        const colors = geometry.attributes.color;
        
        if (!colors) {
            console.error('[VisualizationPanel] No color attribute on heatmap geometry');
            return;
        }
        
        // Get temperature data for current time step from backend
        const temperatureData = this.getTemperatureDataForTimeStep(this.currentTimeStep);
        
        if (!temperatureData) {
            console.error('[VisualizationPanel] No temperature data available for time step:', this.currentTimeStep);
            return;
        }
        
        // Get furnace dimensions
        let furnaceHeight, furnaceRadius;
        const furnaceGeom = this.furnaceGeometry || (this.furnaceOutline ? this.furnaceOutline.geometry : null);
        
        if (furnaceGeom && furnaceGeom.parameters) {
            furnaceHeight = furnaceGeom.parameters.height;
            furnaceRadius = furnaceGeom.parameters.radiusTop;
        } else {
            // Fallback to simulation parameters
            const params = this.simulationData?.metadata?.parameters;
            furnaceHeight = params?.furnace?.height ?? 2.0;
            furnaceRadius = params?.furnace?.radius ?? 1.0;
        }
        
        console.log('[VisualizationPanel] Updating colors with backend data:', {
            timeStep: this.currentTimeStep,
            gridSize: Array.isArray(temperatureData) ? `${temperatureData.length}x${temperatureData[0]?.length || 0}` : 'invalid',
            particleCount: this.particlePositions.length,
            furnaceDimensions: { height: furnaceHeight, radius: furnaceRadius }
        });
        
        // Track temperature statistics for validation
        let minTempSeen = Infinity;
        let maxTempSeen = -Infinity;
        let validTemperatureCount = 0;
        
        // Update each particle color based on its position and backend temperature data
        this.particlePositions.forEach((pos, index) => {
            // Normalize position coordinates
            const normalizedR = pos.r / furnaceRadius;
            const normalizedY = (pos.y + furnaceHeight / 2) / furnaceHeight;
            
            // Get temperature for this 3D position from backend data
            const temperature = this.getTemperatureAt3DPosition(
                normalizedR,
                normalizedY,
                temperatureData
            );
            
            // Track statistics
            if (typeof temperature === 'number' && !isNaN(temperature)) {
                minTempSeen = Math.min(minTempSeen, temperature);
                maxTempSeen = Math.max(maxTempSeen, temperature);
                validTemperatureCount++;
            }
            
            // Convert temperature to color
            const color = this.temperatureToColor(temperature);
            
            // Update particle color
            colors.setXYZ(index, color.r, color.g, color.b);
        });
        
        // Mark colors as needing update
        colors.needsUpdate = true;
        
        console.log('[VisualizationPanel] Heatmap colors updated with real backend data:', {
            timeStep: this.currentTimeStep,
            particlesUpdated: validTemperatureCount,
            temperatureRange: {
                min: minTempSeen.toFixed(1),
                max: maxTempSeen.toFixed(1)
            }
        });
        
        // Log sample temperatures for validation
        if (this.particlePositions.length > 0) {
            const centerTemp = this.getTemperatureAt3DPosition(0, 0.5, temperatureData);
            const edgeTemp = this.getTemperatureAt3DPosition(1, 0.5, temperatureData);
            console.log('[VisualizationPanel] Sample temperatures:', {
                center: centerTemp.toFixed(1) + 'K',
                edge: edgeTemp.toFixed(1) + 'K'
            });
        }
    }
    
    /**
     * Get temperature at a 3D position in the cylinder using real backend data
     * Maps 3D particle position to 2D grid data from backend
     * @private
     */
    getTemperatureAt3DPosition(normalizedR, normalizedZ, temperatureData) {
        if (!temperatureData || !Array.isArray(temperatureData)) {
            console.warn('[VisualizationPanel] No valid temperature data for position lookup');
            return this.minTemperature;
        }
        
        // Backend returns temperature data as a 2D grid [row][col]
        // We need to map cylindrical coordinates (r, z) to grid indices
        
        // Clamp normalized coordinates to valid range [0, 1]
        const clampedR = Math.max(0, Math.min(1, normalizedR));
        const clampedZ = Math.max(0, Math.min(1, normalizedZ));
        
        // Get grid dimensions from the data
        const numRows = temperatureData.length; // Z direction (height)
        const numCols = temperatureData[0] ? temperatureData[0].length : 0; // R direction (radius)
        
        if (numRows === 0 || numCols === 0) {
            console.warn('[VisualizationPanel] Empty temperature grid');
            return this.minTemperature;
        }
        
        // Map normalized coordinates to grid indices
        // Z (height) maps to rows: 0 (bottom) -> 0, 1 (top) -> numRows-1
        // R (radius) maps to cols: 0 (center) -> 0, 1 (edge) -> numCols-1
        const rowIndex = Math.floor(clampedZ * (numRows - 1));
        const colIndex = Math.floor(clampedR * (numCols - 1));
        
        // Clamp indices to valid range
        const safeRow = Math.max(0, Math.min(numRows - 1, rowIndex));
        const safeCol = Math.max(0, Math.min(numCols - 1, colIndex));
        
        // Get temperature from grid
        const temperature = temperatureData[safeRow][safeCol];
        
        // Validate temperature value
        if (typeof temperature !== 'number' || isNaN(temperature)) {
            console.warn('[VisualizationPanel] Invalid temperature value at grid position:', { safeRow, safeCol, temperature });
            return this.minTemperature;
        }
        
        return temperature;
    }

    /**
     * Get temperature data for a specific time step
     * Uses real backend data instead of mock generation
     * @private
     */
    getTemperatureDataForTimeStep(timeStep) {
        if (!this.simulationData || !this.simulationData.temperatureData) {
            console.warn('[VisualizationPanel] No temperature data available');
            return null;
        }
        
        // Backend returns temperature data as a 2D array (grid)
        // For multiple time steps, it would be a 3D array [timeStep][row][col]
        // For now, backend returns a single 2D grid
        const temperatureData = this.simulationData.temperatureData;
        
        if (!Array.isArray(temperatureData)) {
            console.error('[VisualizationPanel] Temperature data is not an array:', typeof temperatureData);
            return null;
        }
        
        // If we have multiple time steps, select the appropriate one
        // Otherwise, use the single grid for all time steps
        if (Array.isArray(temperatureData[0]) && Array.isArray(temperatureData[0][0])) {
            // 3D array: [timeStep][row][col]
            const clampedTimeStep = Math.min(timeStep, temperatureData.length - 1);
            return temperatureData[clampedTimeStep];
        } else {
            // 2D array: [row][col] - single time step
            return temperatureData;
        }
    }

    /**
     * Get temperature for a specific vertex
     * @private
     */
    getTemperatureForVertex(vertexIndex, temperatureData) {
        if (!temperatureData) {
            return this.minTemperature;
        }
        
        // Simple mapping - in real implementation, this would interpolate
        // from the simulation mesh to the visualization mesh
        const dataIndex = vertexIndex % temperatureData.length;
        return temperatureData[dataIndex];
    }

    /**
     * Convert temperature to color using a heat colormap
     * @private
     */
    temperatureToColor(temperature) {
        // Normalize temperature to 0-1 range
        const normalized = (temperature - this.minTemperature) / (this.maxTemperature - this.minTemperature);
        const clamped = Math.max(0, Math.min(1, normalized));
        
        // Create heat colormap: blue -> cyan -> green -> yellow -> red
        let r, g, b;
        
        if (clamped < 0.25) {
            // Blue to cyan
            const t = clamped / 0.25;
            r = 0;
            g = t;
            b = 1;
        } else if (clamped < 0.5) {
            // Cyan to green
            const t = (clamped - 0.25) / 0.25;
            r = 0;
            g = 1;
            b = 1 - t;
        } else if (clamped < 0.75) {
            // Green to yellow
            const t = (clamped - 0.5) / 0.25;
            r = t;
            g = 1;
            b = 0;
        } else {
            // Yellow to red
            const t = (clamped - 0.75) / 0.25;
            r = 1;
            g = 1 - t;
            b = 0;
        }
        
        return { r, g, b };
    }

    /**
     * Get temperature at a specific 3D point using real backend data
     * Used for hover interactions and point queries
     * @private
     */
    getTemperatureAtPoint(point) {
        if (!this.simulationData) {
            console.warn('[VisualizationPanel] No simulation data for point temperature lookup');
            return this.minTemperature;
        }
        
        // Convert 3D point to cylindrical coordinates
        const r = Math.sqrt(point.x ** 2 + point.z ** 2);
        const z = point.y;
        
        // Get furnace dimensions
        let furnaceHeight, furnaceRadius;
        const furnaceGeom = this.furnaceGeometry || (this.furnaceOutline ? this.furnaceOutline.geometry : null);
        
        if (furnaceGeom && furnaceGeom.parameters) {
            furnaceHeight = furnaceGeom.parameters.height;
            furnaceRadius = furnaceGeom.parameters.radiusTop;
        } else {
            // Fallback to simulation parameters
            const params = this.simulationData?.metadata?.parameters;
            furnaceHeight = params?.furnace?.height ?? 2.0;
            furnaceRadius = params?.furnace?.radius ?? 1.0;
        }
        
        // Normalize coordinates
        // Note: Three.js cylinder has origin at center, so y ranges from -height/2 to +height/2
        const normalizedR = Math.min(1, Math.max(0, r / furnaceRadius));
        const normalizedZ = Math.min(1, Math.max(0, (z + furnaceHeight / 2) / furnaceHeight));
        
        // Get temperature data for current time step from backend
        const temperatureData = this.getTemperatureDataForTimeStep(this.currentTimeStep);
        
        if (!temperatureData) {
            console.warn('[VisualizationPanel] No temperature data for current time step');
            return this.minTemperature;
        }
        
        // Use the same mapping function as particle coloring for consistency
        const temperature = this.getTemperatureAt3DPosition(normalizedR, normalizedZ, temperatureData);
        
        return temperature;
    }

    /**
     * Handle simulation completion
     * @private
     */
    handleSimulationCompleted(data) {
        console.log('[VisualizationPanel] Simulation completed, loading data...');
        this.loadSimulationData(data.results);
    }

    /**
     * Handle time step changes during animation
     * @private
     */
    handleTimeChanged(data) {
        if (this.simulationData) {
            // Show loading state for time step changes if needed
            if (this.config && this.config.showLoadingOnTimeChange) {
                this.showTimeStepLoading(data.timeStep);
            }
            
            this.setTimeStep(data.timeStep);
            
            // Hide loading state after a brief delay to show smooth transition
            if (this.config && this.config.showLoadingOnTimeChange) {
                setTimeout(() => {
                    this.hideTimeStepLoading();
                }, 100);
            }
        }
    }

    /**
     * Show loading state for time step changes
     * @private
     */
    showTimeStepLoading(timeStep) {
        // Add a subtle loading indicator for time step changes
        const canvas = this.canvas;
        if (canvas) {
            canvas.style.opacity = '0.7';
            canvas.style.transition = 'opacity 0.1s ease';
        }
        
        console.log('[VisualizationPanel] Loading time step:', timeStep);
    }

    /**
     * Hide loading state for time step changes
     * @private
     */
    hideTimeStepLoading() {
        const canvas = this.canvas;
        if (canvas) {
            canvas.style.opacity = '1.0';
        }
    }

    /**
     * Handle parameter changes to update furnace geometry
     * @private
     */
    handleParametersChanged(data) {
        if (data.parameters && (data.parameters['furnace-height'] || data.parameters['furnace-radius'])) {
            this.updateFurnaceGeometry(data.parameters);
        }
    }

    /**
     * Update furnace geometry based on parameters
     * @private
     */
    updateFurnaceGeometry(parameters) {
        const height = parseFloat(parameters['furnace-height']) || 2.0;
        const radius = parseFloat(parameters['furnace-radius']) || 1.0;
        
        if (this.furnaceOutline) {
            this.scene.remove(this.furnaceOutline);
        }
        
        // Create new geometry with updated dimensions (closed cylinder with caps)
        const geometry = new THREE.CylinderGeometry(
            radius, radius, height, 
            32, 16, false // Closed - includes top and bottom caps
        );
        
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.15  // Less prominent so particles stand out
        });
        
        this.furnaceOutline = new THREE.Mesh(geometry, wireframeMaterial);
        this.furnaceOutline.position.y = height / 2;
        this.scene.add(this.furnaceOutline);
        
        // Update stored geometry
        this.furnaceGeometry = geometry.clone();
        
        // Update torch position to stay at bottom center
        if (this.torchMesh) {
            // Keep torch at bottom center (y = 0.05, slightly above bottom)
            this.torchMesh.position.set(0, 0.05, 0);
            if (this.torchLight) {
                this.torchLight.position.copy(this.torchMesh.position);
            }
        }
        
        console.log('[VisualizationPanel] Furnace geometry updated:', { height, radius });
    }

    /**
     * Update furnace geometry from simulation parameters object
     * @private
     */
    updateFurnaceGeometryFromParams(furnaceParams) {
        const height = furnaceParams.height ?? 2.0;
        const radius = furnaceParams.radius ?? 1.0;
        
        if (this.furnaceOutline) {
            this.scene.remove(this.furnaceOutline);
        }
        
        // Create new geometry with updated dimensions (closed cylinder with caps)
        const geometry = new THREE.CylinderGeometry(
            radius, radius, height, 
            32, 16, false // Closed - includes top and bottom caps
        );
        
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            wireframe: true,
            transparent: true,
            opacity: 0.15  // Less prominent so particles stand out
        });
        
        this.furnaceOutline = new THREE.Mesh(geometry, wireframeMaterial);
        this.furnaceOutline.position.y = height / 2;
        this.scene.add(this.furnaceOutline);
        
        // Update stored geometry
        this.furnaceGeometry = geometry.clone();
        
        console.log('[VisualizationPanel] Furnace geometry updated from simulation params:', { height, radius });
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        if (!this.camera || !this.controls) return;
        
        this.camera.position.set(5, 3, 5);
        this.controls.target.set(0, 1, 0);
        this.controls.update();
        
        console.log('[VisualizationPanel] Camera reset to default position');
    }

    /**
     * Show visualization container and hide other states
     */
    showVisualization() {
        const container = this.container.querySelector('.visualization-container');
        if (!container) return;
        
        // Hide all state elements
        const states = ['placeholder', 'loading', 'error'];
        states.forEach(state => {
            const element = container.querySelector(`#visualization-${state}`);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show canvas and legend
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
        
        const legend = container.querySelector('#temperature-legend');
        if (legend) {
            legend.style.display = 'block';
            this.updateTemperatureLegend();
        }
        
        console.log('[VisualizationPanel] Visualization shown');
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading visualization...') {
        const container = this.container.querySelector('.visualization-container');
        if (!container) return;
        
        // Hide other states
        const states = ['placeholder', 'error'];
        states.forEach(state => {
            const element = container.querySelector(`#visualization-${state}`);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        
        // Show loading
        const loading = container.querySelector('#visualization-loading');
        if (loading) {
            loading.style.display = 'flex';
            const loadingText = loading.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
        
        console.log('[VisualizationPanel] Loading state shown:', message);
    }

    /**
     * Show error state
     */
    showError(message = 'Visualization error occurred') {
        const container = this.container.querySelector('.visualization-container');
        if (!container) return;
        
        // Hide other states
        const states = ['placeholder', 'loading'];
        states.forEach(state => {
            const element = container.querySelector(`#visualization-${state}`);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        
        // Show error
        const error = container.querySelector('#visualization-error');
        if (error) {
            error.style.display = 'flex';
            const errorText = error.querySelector('#error-message');
            if (errorText) {
                errorText.textContent = message;
            }
        }
        
        console.log('[VisualizationPanel] Error state shown:', message);
    }

    /**
     * Show placeholder state
     */
    showPlaceholder() {
        const container = this.container.querySelector('.visualization-container');
        if (!container) return;
        
        // Hide other states
        const states = ['loading', 'error'];
        states.forEach(state => {
            const element = container.querySelector(`#visualization-${state}`);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide canvas and legend
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        
        const legend = container.querySelector('#temperature-legend');
        if (legend) {
            legend.style.display = 'none';
        }
        
        // Show placeholder
        const placeholder = container.querySelector('#visualization-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        
        console.log('[VisualizationPanel] Placeholder state shown');
    }

    /**
     * Update temperature legend with current range
     * @private
     */
    updateTemperatureLegend() {
        const legend = this.container.querySelector('#temperature-legend');
        if (!legend) return;
        
        const minElement = legend.querySelector('#legend-min');
        const maxElement = legend.querySelector('#legend-max');
        
        if (minElement) {
            minElement.textContent = Math.round(this.minTemperature);
        }
        
        if (maxElement) {
            maxElement.textContent = Math.round(this.maxTemperature);
        }
        
        console.log('[VisualizationPanel] Temperature legend updated');
    }

    /**
     * Handle rendering errors
     * @private
     */
    handleRenderingError(error) {
        console.error('[VisualizationPanel] Rendering error:', error);
        
        this.showError('Failed to render 3D visualization. Try reducing mesh resolution.');
        
        this.eventBus.emit('visualization:error', {
            type: 'rendering',
            message: error.message,
            error: error
        });
    }

    /**
     * Validate WebGL support
     * @private
     */
    validateWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                throw new Error('WebGL is not supported by this browser');
            }
            
            // Check for required extensions
            const requiredExtensions = ['OES_texture_float'];
            for (const ext of requiredExtensions) {
                if (!gl.getExtension(ext)) {
                    console.warn(`[VisualizationPanel] Extension ${ext} not available`);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('[VisualizationPanel] WebGL validation failed:', error);
            return false;
        }
    }

    /**
     * Get current status including performance metrics
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            rendering: this.isRendering,
            hasData: !!this.simulationData,
            currentTimeStep: this.currentTimeStep,
            totalTimeSteps: this.totalTimeSteps,
            temperatureRange: {
                min: this.minTemperature,
                max: this.maxTemperature
            },
            webglSupported: this.validateWebGLSupport(),
            performance: this.getPerformanceMetrics(),
            config: this.config || {}
        };
    }

    /**
     * Capture current frame as image data
     * @param {Object} options - Export options
     * @param {number} options.width - Output width (optional, defaults to current canvas width)
     * @param {number} options.height - Output height (optional, defaults to current canvas height)
     * @param {string} options.format - Image format ('png' or 'jpeg', defaults to 'png')
     * @param {number} options.quality - JPEG quality (0-1, defaults to 0.95)
     * @returns {string} Data URL of the captured frame
     */
    captureFrame(options = {}) {
        if (!this.renderer || !this.scene || !this.camera) {
            throw new Error('Visualization not initialized');
        }
        
        const {
            width = this.canvas.width,
            height = this.canvas.height,
            format = 'png',
            quality = 0.95
        } = options;
        
        console.log('[VisualizationPanel] Capturing frame:', { width, height, format, quality });
        
        // Store current size
        const currentWidth = this.canvas.width;
        const currentHeight = this.canvas.height;
        
        try {
            // Resize renderer if needed
            if (width !== currentWidth || height !== currentHeight) {
                this.renderer.setSize(width, height, false);
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
            
            // Render one frame
            this.renderer.render(this.scene, this.camera);
            
            // Capture canvas as data URL
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = this.canvas.toDataURL(mimeType, quality);
            
            // Restore original size if changed
            if (width !== currentWidth || height !== currentHeight) {
                this.renderer.setSize(currentWidth, currentHeight, false);
                this.camera.aspect = currentWidth / currentHeight;
                this.camera.updateProjectionMatrix();
            }
            
            console.log('[VisualizationPanel] Frame captured successfully');
            
            return dataUrl;
            
        } catch (error) {
            console.error('[VisualizationPanel] Failed to capture frame:', error);
            
            // Restore original size on error
            if (width !== currentWidth || height !== currentHeight) {
                this.renderer.setSize(currentWidth, currentHeight, false);
                this.camera.aspect = currentWidth / currentHeight;
                this.camera.updateProjectionMatrix();
            }
            
            throw error;
        }
    }

    /**
     * Export current frame as downloadable image
     * @param {Object} options - Export options
     * @param {string} options.filename - Output filename (optional)
     * @param {number} options.width - Output width (optional)
     * @param {number} options.height - Output height (optional)
     * @param {string} options.format - Image format ('png' or 'jpeg')
     * @param {number} options.quality - JPEG quality (0-1)
     */
    exportCurrentFrame(options = {}) {
        try {
            const {
                filename = `frame_${this.currentTimeStep}_${Date.now()}.png`,
                ...captureOptions
            } = options;
            
            console.log('[VisualizationPanel] Exporting current frame:', filename);
            
            // Capture frame
            const dataUrl = this.captureFrame(captureOptions);
            
            // Trigger download
            this.downloadDataUrl(dataUrl, filename);
            
            // Emit success event
            this.eventBus.emit('visualization:frameExported', {
                timeStep: this.currentTimeStep,
                filename: filename,
                success: true
            });
            
            console.log('[VisualizationPanel] Frame exported successfully:', filename);
            
        } catch (error) {
            console.error('[VisualizationPanel] Failed to export frame:', error);
            
            // Emit error event
            this.eventBus.emit('visualization:error', {
                type: 'frame-export',
                message: `Failed to export frame: ${error.message}`,
                error: error
            });
            
            throw error;
        }
    }

    /**
     * Export all frames as numbered image sequence
     * @param {Object} options - Export options
     * @param {string} options.filenamePrefix - Filename prefix (optional)
     * @param {number} options.width - Output width (optional)
     * @param {number} options.height - Output height (optional)
     * @param {string} options.format - Image format ('png' or 'jpeg')
     * @param {number} options.quality - JPEG quality (0-1)
     * @param {Function} options.onProgress - Progress callback (optional)
     * @returns {Promise<void>}
     */
    async exportAllFrames(options = {}) {
        if (!this.simulationData || this.totalTimeSteps <= 0) {
            throw new Error('No simulation data available for export');
        }
        
        const {
            filenamePrefix = 'frame',
            format = 'png',
            onProgress = null,
            ...captureOptions
        } = options;
        
        console.log('[VisualizationPanel] Starting batch export:', {
            totalFrames: this.totalTimeSteps,
            filenamePrefix,
            format
        });
        
        // Store current time step to restore later
        const originalTimeStep = this.currentTimeStep;
        
        try {
            // Emit export start event
            this.eventBus.emit('visualization:batchExportStarted', {
                totalFrames: this.totalTimeSteps
            });
            
            // Export each frame
            for (let i = 0; i < this.totalTimeSteps; i++) {
                // Update to this time step
                await this.updateToTimeStep(i);
                
                // Wait a bit for rendering to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Generate filename with zero-padded frame number
                const frameNumber = String(i).padStart(4, '0');
                const extension = format === 'jpeg' ? 'jpg' : 'png';
                const filename = `${filenamePrefix}_${frameNumber}.${extension}`;
                
                // Capture and download frame
                const dataUrl = this.captureFrame({ ...captureOptions, format });
                this.downloadDataUrl(dataUrl, filename);
                
                // Report progress
                const progress = ((i + 1) / this.totalTimeSteps) * 100;
                
                if (onProgress) {
                    onProgress(progress, i + 1, this.totalTimeSteps);
                }
                
                // Emit progress event
                this.eventBus.emit('visualization:batchExportProgress', {
                    current: i + 1,
                    total: this.totalTimeSteps,
                    progress: progress,
                    filename: filename
                });
                
                console.log(`[VisualizationPanel] Exported frame ${i + 1}/${this.totalTimeSteps}: ${filename}`);
                
                // Small delay between exports to avoid overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Restore original time step
            await this.updateToTimeStep(originalTimeStep);
            
            // Emit completion event
            this.eventBus.emit('visualization:batchExportCompleted', {
                totalFrames: this.totalTimeSteps,
                success: true
            });
            
            console.log('[VisualizationPanel] Batch export completed successfully');
            
        } catch (error) {
            console.error('[VisualizationPanel] Batch export failed:', error);
            
            // Restore original time step on error
            try {
                await this.updateToTimeStep(originalTimeStep);
            } catch (restoreError) {
                console.error('[VisualizationPanel] Failed to restore time step:', restoreError);
            }
            
            // Emit error event
            this.eventBus.emit('visualization:error', {
                type: 'batch-export',
                message: `Batch export failed: ${error.message}`,
                error: error
            });
            
            throw error;
        }
    }

    /**
     * Download data URL as file
     * @private
     * @param {string} dataUrl - Data URL to download
     * @param {string} filename - Output filename
     */
    downloadDataUrl(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('[VisualizationPanel] Download triggered:', filename);
    }

    /**
     * Cleanup resources
     */
    dispose() {
        console.log('[VisualizationPanel] Disposing resources...');
        
        // Stop render loop
        this.isRendering = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.onMouseMove);
            this.canvas.removeEventListener('click', this.onMouseClick);
        }
        
        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.scene) {
            this.scene.clear();
        }
        
        console.log('[VisualizationPanel] Resources disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizationPanel;
} else if (typeof window !== 'undefined') {
    window.VisualizationPanel = VisualizationPanel;
}