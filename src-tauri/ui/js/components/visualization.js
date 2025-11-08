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
        if (!this.torchMesh || !torchParams) return;
        
        const position = torchParams.position || { r: 0, z: 1 };
        const furnaceHeight = this.furnaceOutline ? this.furnaceOutline.geometry.parameters.height : 2.0;
        
        // Convert cylindrical coordinates (r, z) to Cartesian (x, y, z)
        // r is radial distance from center axis
        // z is height along cylinder axis
        const r = position.r || 0;
        const z = position.z || furnaceHeight / 2;
        
        // Place torch at (r, 0, 0) in cylindrical coords = (r, z, 0) in Cartesian
        // Y-axis is the cylinder axis in Three.js
        this.torchMesh.position.set(r, z, 0);
        
        if (this.torchLight) {
            this.torchLight.position.copy(this.torchMesh.position);
        }
        
        console.log('[VisualizationPanel] Torch position updated:', { r, z, cartesian: this.torchMesh.position });
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
     * Main render loop
     * @private
     */
    render() {
        if (!this.isRendering) return;
        
        this.animationId = requestAnimationFrame(this.render);
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
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
     * Load simulation data and create heatmap visualization
     */
    loadSimulationData(simulationResults) {
        try {
            console.log('[VisualizationPanel] Loading simulation data...');
            
            // Ensure visualization is initialized before loading data
            if (!this.isInitialized) {
                console.warn('[VisualizationPanel] Visualization not initialized, cannot load data yet');
                throw new Error('Visualization not initialized');
            }
            
            this.simulationData = simulationResults;
            this.totalTimeSteps = simulationResults.timeSteps ? simulationResults.timeSteps.length : 0;
            this.currentTimeStep = 0;
            
            // Update temperature range from data
            this.updateTemperatureRange();
            
            // Update furnace geometry and torch position from simulation parameters
            if (simulationResults.metadata && simulationResults.metadata.parameters) {
                const params = simulationResults.metadata.parameters;
                
                // Update furnace geometry if we have furnace parameters
                if (params.furnace) {
                    this.updateFurnaceGeometryFromParams(params.furnace);
                }
                
                // Update torch position
                if (params.torch) {
                    this.updateTorchPosition(params.torch);
                }
            }
            
            // Create heatmap mesh
            this.createHeatmapMesh();
            
            // Set initial time step and force color update
            this.setTimeStep(0);
            
            // Force an immediate color update to ensure particles are visible
            if (this.heatmapGroup && this.particlePositions) {
                this.updateHeatmapColors();
                console.log('[VisualizationPanel] Initial heatmap colors applied');
            }
            
            console.log('[VisualizationPanel] Simulation data loaded successfully');
            
            // Prepare animation data if we have multiple time steps
            let animationReady = false;
            if (this.totalTimeSteps > 1) {
                this.prepareForAnimation(simulationResults);
                animationReady = true;
            }
            
            // Emit visualization loaded event with complete data for animation coordination
            this.eventBus.emit('visualization:loaded', {
                timeSteps: this.totalTimeSteps,
                duration: simulationResults.duration || (this.totalTimeSteps * 0.5), // Default 0.5s per step
                temperatureRange: {
                    min: this.minTemperature,
                    max: this.maxTemperature
                },
                animationReady: animationReady,
                simulationData: {
                    timeSteps: simulationResults.timeSteps,
                    duration: simulationResults.duration,
                    metadata: simulationResults.metadata
                }
            });
            
        } catch (error) {
            console.error('[VisualizationPanel] Failed to load simulation data:', error);
            this.eventBus.emit('visualization:error', {
                type: 'data_loading',
                message: error.message,
                error: error
            });
        }
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
                smoothTransitions: true,
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
     * Pre-process temperature data for efficient animation
     * @private
     */
    preprocessTemperatureData() {
        if (!this.simulationData || !this.simulationData.temperatureData) {
            return;
        }
        
        // For now, we'll use the existing mock data generation
        // In a real implementation, this would optimize the data structure
        // for fast time step switching during animation
        
        console.log('[VisualizationPanel] Temperature data preprocessed for animation');
    }

    /**
     * Update temperature range from simulation data
     * @private
     */
    updateTemperatureRange() {
        if (!this.simulationData || !this.simulationData.temperatureData) {
            return;
        }
        
        let min = Infinity;
        let max = -Infinity;
        
        // Find min/max across all time steps
        this.simulationData.temperatureData.forEach(timeStepData => {
            timeStepData.forEach(temp => {
                min = Math.min(min, temp);
                max = Math.max(max, temp);
            });
        });
        
        this.minTemperature = min;
        this.maxTemperature = max;
        
        console.log('[VisualizationPanel] Temperature range:', { min, max });
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
        const gridResolution = 18; // Points per dimension (balanced for quality and performance)
        const particles = [];
        const colors = [];
        
        // Store particle positions for temperature mapping
        this.particlePositions = [];
        
        // Generate points in cylindrical coordinates throughout the volume
        const radialSteps = Math.floor(gridResolution * 0.7); // More radial coverage
        const angularSteps = gridResolution * 3; // More angular resolution for better coverage
        const heightSteps = gridResolution;
        
        for (let rIndex = 0; rIndex <= radialSteps; rIndex++) {
            const r = (rIndex / radialSteps) * furnaceRadius;
            
            // For center point, only create one particle
            const thetaSteps = (rIndex === 0) ? 1 : angularSteps;
            
            for (let thetaIndex = 0; thetaIndex < thetaSteps; thetaIndex++) {
                const theta = (thetaIndex / thetaSteps) * Math.PI * 2;
                
                for (let yIndex = 0; yIndex <= heightSteps; yIndex++) {
                    const y = (yIndex / heightSteps) * furnaceHeight - (furnaceHeight / 2);
                    
                    // Convert cylindrical to Cartesian coordinates
                    const x = r * Math.cos(theta);
                    const z = r * Math.sin(theta);
                    
                    // Add particle position
                    particles.push(x, y, z);
                    
                    // Store position for temperature mapping
                    this.particlePositions.push({ x, y, z, r, theta });
                    
                    // Default color (will be updated with temperature data)
                    colors.push(0.3, 0.3, 0.8); // Blue default
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
        console.log('[VisualizationPanel] Grid resolution:', { radialSteps, angularSteps, heightSteps });
    }


    /**
     * Set current time step and update visualization
     */
    setTimeStep(timeStep) {
        if (!this.simulationData || !this.heatmapGroup) {
            return;
        }
        
        this.currentTimeStep = Math.max(0, Math.min(timeStep, this.totalTimeSteps - 1));
        
        // Update heatmap colors for current time step
        this.updateHeatmapColors();
        
        console.log('[VisualizationPanel] Time step set to:', this.currentTimeStep);
        
        this.eventBus.emit('visualization:timeStepChanged', {
            timeStep: this.currentTimeStep,
            totalTimeSteps: this.totalTimeSteps
        });
    }

    /**
     * Update heatmap colors based on current time step
     * Updates all particles to show 3D heat distribution throughout the volume
     * @private
     */
    updateHeatmapColors() {
        if (!this.heatmapGroup || !this.particlePositions || !this.simulationData) {
            console.warn('[VisualizationPanel] Cannot update heatmap colors - missing data');
            return;
        }
        
        const geometry = this.heatmapGroup.geometry;
        const colors = geometry.attributes.color;
        
        if (!colors) {
            console.error('[VisualizationPanel] No color attribute on heatmap geometry');
            return;
        }
        
        // Get temperature data for current time step
        const temperatureData = this.getTemperatureDataForTimeStep(this.currentTimeStep);
        
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
        
        // Update each particle color based on its position
        this.particlePositions.forEach((pos, index) => {
            // Normalize position coordinates
            const normalizedR = pos.r / furnaceRadius;
            const normalizedY = (pos.y + furnaceHeight / 2) / furnaceHeight;
            
            // Get temperature for this 3D position
            const temperature = this.getTemperatureAt3DPosition(
                normalizedR,
                normalizedY,
                temperatureData
            );
            
            // Convert temperature to color
            const color = this.temperatureToColor(temperature);
            
            // Update particle color
            colors.setXYZ(index, color.r, color.g, color.b);
        });
        
        // Mark colors as needing update
        colors.needsUpdate = true;
        
        // Log sample temperature data for debugging
        if (this.particlePositions.length > 0) {
            const sampleTemp = this.getTemperatureAt3DPosition(0, 0.5, temperatureData);
            console.log('[VisualizationPanel] Sample temperature at center:', sampleTemp.toFixed(1), 'K');
        }
        
        console.log('[VisualizationPanel] 3D volumetric heatmap colors updated for time step:', this.currentTimeStep);
    }
    
    /**
     * Get temperature at a 3D position in the cylinder
     * @private
     */
    getTemperatureAt3DPosition(normalizedR, normalizedZ, temperatureData) {
        if (!temperatureData) {
            return this.minTemperature;
        }
        
        // Use furnaceGeometry if available, otherwise use furnaceOutline.geometry
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
        
        // Get torch position for heat source calculation
        const torchR = this.torchMesh ? (this.torchMesh.position.x / furnaceRadius) : 0;
        const torchZ = this.torchMesh ? ((this.torchMesh.position.y + furnaceHeight / 2) / furnaceHeight) : 0.5;
        
        // Calculate distance from torch position in 3D
        const dr = normalizedR - torchR;
        const dz = normalizedZ - torchZ;
        const distance3D = Math.sqrt(dr * dr + dz * dz);
        
        // Calculate heat spread based on time progression
        const timeProgress = this.currentTimeStep / Math.max(1, this.totalTimeSteps - 1);
        const heatSpread = 0.2 + timeProgress * 0.6; // Heat spreads over time
        
        // Calculate temperature based on distance from heat source
        let temperature = this.minTemperature;
        if (distance3D < heatSpread) {
            const intensity = 1 - (distance3D / heatSpread);
            temperature = this.minTemperature + intensity * (this.maxTemperature - this.minTemperature);
        }
        
        return temperature;
    }

    /**
     * Get temperature data for a specific time step
     * @private
     */
    getTemperatureDataForTimeStep(timeStep) {
        if (!this.simulationData || !this.simulationData.temperatureData) {
            return null;
        }
        
        // For now, generate mock temperature data
        // In real implementation, this would come from simulation results
        const mockData = this.generateMockTemperatureData();
        return mockData;
    }

    /**
     * Generate mock temperature data for demonstration
     * @private
     */
    generateMockTemperatureData() {
        const data = [];
        const time = this.currentTimeStep / Math.max(1, this.totalTimeSteps - 1);
        
        // Create a temperature distribution that changes over time
        for (let i = 0; i < 100; i++) {
            const r = (i % 10) / 10; // Radial position (0-1)
            const z = Math.floor(i / 10) / 10; // Axial position (0-1)
            
            // Create a heat source at the center that spreads over time
            const distanceFromCenter = Math.sqrt(r * r + (z - 0.5) * (z - 0.5));
            const heatSpread = 0.3 + time * 0.4; // Heat spreads over time
            
            let temperature = this.minTemperature;
            if (distanceFromCenter < heatSpread) {
                const intensity = 1 - (distanceFromCenter / heatSpread);
                temperature = this.minTemperature + intensity * (this.maxTemperature - this.minTemperature);
            }
            
            data.push(temperature);
        }
        
        return data;
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
     * Get temperature at a specific 3D point
     * @private
     */
    getTemperatureAtPoint(point) {
        if (!this.simulationData) {
            return this.minTemperature + Math.random() * (this.maxTemperature - this.minTemperature);
        }
        
        // Convert 3D point to cylindrical coordinates
        const r = Math.sqrt(point.x ** 2 + point.z ** 2);
        const z = point.y;
        
        // Get temperature data for current time step
        const temperatureData = this.getTemperatureDataForTimeStep(this.currentTimeStep);
        
        if (!temperatureData) {
            return this.minTemperature;
        }
        
        // Simple interpolation - in real implementation, this would be more sophisticated
        const normalizedR = Math.min(1, r / 1.0); // Assuming radius of 1.0
        const normalizedZ = Math.min(1, Math.max(0, z / 2.0)); // Assuming height of 2.0
        
        const rIndex = Math.floor(normalizedR * 9); // 10 radial segments
        const zIndex = Math.floor(normalizedZ * 9); // 10 axial segments
        const dataIndex = zIndex * 10 + rIndex;
        
        return temperatureData[Math.min(dataIndex, temperatureData.length - 1)];
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
     * Get current status
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
            webglSupported: this.validateWebGLSupport()
        };
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