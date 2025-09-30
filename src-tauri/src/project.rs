/**
 * project.rs
 * Responsibility: Project management for the Plasma Furnace Simulator
 * 
 * Main functions:
 * - Project structure definitions with metadata and configuration
 * - Project save/load functionality in JSON format
 * - Recent files list management
 * - Default project templates
 * - Parameter validation on load
 */

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;
use chrono::{DateTime, Utc};
use log::info;
use tauri::State;
use std::sync::{Arc, Mutex};

use crate::parameters::SimulationParameters;

/// Project metadata containing information about the project
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectMetadata {
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub version: String,
    pub author: Option<String>,
    pub tags: Vec<String>,
}

impl Default for ProjectMetadata {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            name: "Untitled Project".to_string(),
            description: "A new plasma furnace simulation project".to_string(),
            created_at: now,
            modified_at: now,
            version: "1.0.0".to_string(),
            author: None,
            tags: vec![],
        }
    }
}

/// Complete project structure containing metadata, configuration, and results
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Project {
    pub metadata: ProjectMetadata,
    pub parameters: SimulationParameters,
    pub file_path: Option<PathBuf>,
}

impl Project {
    /// Create a new project with default parameters
    pub fn new(name: String, description: Option<String>) -> Self {
        let mut metadata = ProjectMetadata::default();
        metadata.name = name;
        if let Some(desc) = description {
            metadata.description = desc;
        }

        Self {
            metadata,
            parameters: SimulationParameters::default(),
            file_path: None,
        }
    }

    /// Create a project from existing parameters
    pub fn from_parameters(name: String, parameters: SimulationParameters) -> Self {
        let mut project = Self::new(name, None);
        project.parameters = parameters;
        project
    }

    /// Update the modified timestamp
    pub fn touch(&mut self) {
        self.metadata.modified_at = Utc::now();
    }

    /// Validate project parameters
    pub fn validate(&self) -> Result<(), String> {
        // Validate geometry parameters
        if self.parameters.geometry.cylinder_height <= 0.0 {
            return Err("Cylinder height must be positive".to_string());
        }
        if self.parameters.geometry.cylinder_radius <= 0.0 {
            return Err("Cylinder radius must be positive".to_string());
        }
        if self.parameters.geometry.cylinder_height < 1.0 || self.parameters.geometry.cylinder_height > 10.0 {
            return Err("Cylinder height must be between 1.0 and 10.0 meters".to_string());
        }
        if self.parameters.geometry.cylinder_radius < 0.5 || self.parameters.geometry.cylinder_radius > 5.0 {
            return Err("Cylinder radius must be between 0.5 and 5.0 meters".to_string());
        }

        // Validate mesh parameters
        if self.parameters.mesh.nr < 10 || self.parameters.mesh.nr > 500 {
            return Err("Radial nodes must be between 10 and 500".to_string());
        }
        if self.parameters.mesh.nz < 10 || self.parameters.mesh.nz > 500 {
            return Err("Axial nodes must be between 10 and 500".to_string());
        }

        // Validate simulation settings
        if self.parameters.simulation.total_time <= 0.0 {
            return Err("Total simulation time must be positive".to_string());
        }
        if self.parameters.simulation.output_interval <= 0.0 {
            return Err("Output interval must be positive".to_string());
        }
        if self.parameters.simulation.cfl_factor <= 0.0 || self.parameters.simulation.cfl_factor > 1.0 {
            return Err("CFL factor must be between 0.0 and 1.0".to_string());
        }

        // Validate boundary conditions
        if self.parameters.boundary.initial_temperature < 273.0 {
            return Err("Initial temperature must be above absolute zero (273K)".to_string());
        }
        if self.parameters.boundary.ambient_temperature < 273.0 {
            return Err("Ambient temperature must be above absolute zero (273K)".to_string());
        }

        // Validate material properties
        if self.parameters.materials.density <= 0.0 {
            return Err("Material density must be positive".to_string());
        }
        if self.parameters.materials.thermal_conductivity <= 0.0 {
            return Err("Thermal conductivity must be positive".to_string());
        }
        if self.parameters.materials.specific_heat <= 0.0 {
            return Err("Specific heat must be positive".to_string());
        }
        if self.parameters.materials.emissivity < 0.0 || self.parameters.materials.emissivity > 1.0 {
            return Err("Emissivity must be between 0.0 and 1.0".to_string());
        }

        // Validate torch parameters
        for (i, torch) in self.parameters.torches.torches.iter().enumerate() {
            if torch.power <= 0.0 {
                return Err(format!("Torch {} power must be positive", i + 1));
            }
            if torch.efficiency <= 0.0 || torch.efficiency > 1.0 {
                return Err(format!("Torch {} efficiency must be between 0.0 and 1.0", i + 1));
            }
            if torch.sigma <= 0.0 {
                return Err(format!("Torch {} sigma must be positive", i + 1));
            }
            if torch.position.r < 0.0 || torch.position.r > 1.0 {
                return Err(format!("Torch {} radial position must be between 0.0 and 1.0", i + 1));
            }
            if torch.position.z < 0.0 || torch.position.z > 1.0 {
                return Err(format!("Torch {} axial position must be between 0.0 and 1.0", i + 1));
            }
        }

        Ok(())
    }
}

/// Recent files entry
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecentFile {
    pub path: PathBuf,
    pub name: String,
    pub last_opened: DateTime<Utc>,
}

/// Project manager state
pub struct ProjectManager {
    pub current_project: Mutex<Option<Project>>,
    pub recent_files: Mutex<Vec<RecentFile>>,
    pub app_data_dir: PathBuf,
}

impl ProjectManager {
    /// Create a new project manager
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            current_project: Mutex::new(None),
            recent_files: Mutex::new(Vec::new()),
            app_data_dir,
        }
    }

    /// Initialize project manager and load recent files
    pub fn initialize(&self) -> Result<(), String> {
        // Ensure app data directory exists
        if let Err(e) = fs::create_dir_all(&self.app_data_dir) {
            return Err(format!("Failed to create app data directory: {}", e));
        }

        // Load recent files
        self.load_recent_files()?;

        info!("Project manager initialized");
        Ok(())
    }

    /// Save project to file
    pub fn save_project(&self, project: &mut Project, file_path: &Path) -> Result<(), String> {
        // Update modified timestamp
        project.touch();
        project.file_path = Some(file_path.to_path_buf());

        // Validate project before saving
        project.validate()?;

        // Serialize project to JSON
        let json_content = serde_json::to_string_pretty(project)
            .map_err(|e| format!("Failed to serialize project: {}", e))?;

        // Write to file
        fs::write(file_path, json_content)
            .map_err(|e| format!("Failed to write project file: {}", e))?;

        // Update current project
        *self.current_project.lock().unwrap() = Some(project.clone());

        // Add to recent files
        self.add_to_recent_files(file_path, &project.metadata.name)?;

        info!("Project saved to: {:?}", file_path);
        Ok(())
    }

    /// Load project from file
    pub fn load_project(&self, file_path: &Path) -> Result<Project, String> {
        // Check if file exists
        if !file_path.exists() {
            return Err(format!("Project file does not exist: {:?}", file_path));
        }

        // Read file content
        let json_content = fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read project file: {}", e))?;

        // Deserialize project
        let mut project: Project = serde_json::from_str(&json_content)
            .map_err(|e| format!("Failed to parse project file: {}", e))?;

        // Validate loaded project
        project.validate()?;

        // Set file path
        project.file_path = Some(file_path.to_path_buf());

        // Update current project
        *self.current_project.lock().unwrap() = Some(project.clone());

        // Add to recent files
        self.add_to_recent_files(file_path, &project.metadata.name)?;

        info!("Project loaded from: {:?}", file_path);
        Ok(project)
    }

    /// Add file to recent files list
    fn add_to_recent_files(&self, file_path: &Path, name: &str) -> Result<(), String> {
        let mut recent_files = self.recent_files.lock().unwrap();

        // Remove existing entry if present
        recent_files.retain(|f| f.path != file_path);

        // Add new entry at the beginning
        recent_files.insert(0, RecentFile {
            path: file_path.to_path_buf(),
            name: name.to_string(),
            last_opened: Utc::now(),
        });

        // Keep only the last 10 files
        recent_files.truncate(10);

        // Save recent files
        self.save_recent_files()?;

        Ok(())
    }

    /// Load recent files from disk
    fn load_recent_files(&self) -> Result<(), String> {
        let recent_files_path = self.app_data_dir.join("recent_files.json");

        if recent_files_path.exists() {
            let json_content = fs::read_to_string(&recent_files_path)
                .map_err(|e| format!("Failed to read recent files: {}", e))?;

            let files: Vec<RecentFile> = serde_json::from_str(&json_content)
                .map_err(|e| format!("Failed to parse recent files: {}", e))?;

            // Filter out files that no longer exist
            let existing_files: Vec<RecentFile> = files
                .into_iter()
                .filter(|f| f.path.exists())
                .collect();

            *self.recent_files.lock().unwrap() = existing_files;
        }

        Ok(())
    }

    /// Save recent files to disk
    fn save_recent_files(&self) -> Result<(), String> {
        let recent_files_path = self.app_data_dir.join("recent_files.json");
        let recent_files = self.recent_files.lock().unwrap();

        let json_content = serde_json::to_string_pretty(&*recent_files)
            .map_err(|e| format!("Failed to serialize recent files: {}", e))?;

        fs::write(&recent_files_path, json_content)
            .map_err(|e| format!("Failed to write recent files: {}", e))?;

        Ok(())
    }

    /// Get current project
    pub fn get_current_project(&self) -> Option<Project> {
        self.current_project.lock().unwrap().clone()
    }

    /// Get recent files
    pub fn get_recent_files(&self) -> Vec<RecentFile> {
        self.recent_files.lock().unwrap().clone()
    }
}

/// Project template definition
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub parameters: SimulationParameters,
}

/// Get default project templates
pub fn get_default_templates() -> Vec<ProjectTemplate> {
    vec![
        ProjectTemplate {
            id: "small_furnace".to_string(),
            name: "Small Furnace".to_string(),
            description: "Small-scale furnace for laboratory testing".to_string(),
            category: "Laboratory".to_string(),
            parameters: create_small_furnace_params(),
        },
        ProjectTemplate {
            id: "industrial_furnace".to_string(),
            name: "Industrial Furnace".to_string(),
            description: "Large-scale industrial furnace for waste processing".to_string(),
            category: "Industrial".to_string(),
            parameters: create_industrial_furnace_params(),
        },
        ProjectTemplate {
            id: "high_power_research".to_string(),
            name: "High Power Research".to_string(),
            description: "High-power plasma configuration for research applications".to_string(),
            category: "Research".to_string(),
            parameters: create_high_power_params(),
        },
        ProjectTemplate {
            id: "medical_waste".to_string(),
            name: "Medical Waste Processing".to_string(),
            description: "Optimized for medical waste incineration".to_string(),
            category: "Waste Management".to_string(),
            parameters: create_medical_waste_params(),
        },
    ]
}

/// Create small furnace parameters
fn create_small_furnace_params() -> SimulationParameters {
    use crate::parameters::*;

    SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 1.5,
            cylinder_radius: 0.4,
        },
        mesh: MeshParameters {
            preset: "fast".to_string(),
            nr: 50,
            nz: 50,
        },
        torches: TorchParameters {
            torches: vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.5, z: 0.1 },
                    power: 75.0,
                    efficiency: 0.8,
                    sigma: 0.08,
                }
            ],
        },
        materials: MaterialParameters {
            material_type: "carbon-steel".to_string(),
            density: 7850.0,
            thermal_conductivity: 50.0,
            specific_heat: 460.0,
            emissivity: 0.8,
            melting_point: 1811.0,
        },
        boundary: BoundaryParameters {
            initial_temperature: 298.0,
            ambient_temperature: 298.0,
            wall_boundary_type: "mixed".to_string(),
            convection_coefficient: 10.0,
            surface_emissivity: 0.8,
        },
        simulation: SimulationSettings {
            total_time: 30.0,
            output_interval: 0.5,
            solver_method: "forward-euler".to_string(),
            cfl_factor: 0.5,
        },
    }
}

/// Create industrial furnace parameters
fn create_industrial_furnace_params() -> SimulationParameters {
    use crate::parameters::*;

    SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 3.0,
            cylinder_radius: 0.75,
        },
        mesh: MeshParameters {
            preset: "balanced".to_string(),
            nr: 100,
            nz: 100,
        },
        torches: TorchParameters {
            torches: vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.3, z: 0.1 },
                    power: 200.0,
                    efficiency: 0.85,
                    sigma: 0.12,
                },
                TorchConfig {
                    id: 2,
                    position: TorchPosition { r: 0.7, z: 0.1 },
                    power: 200.0,
                    efficiency: 0.85,
                    sigma: 0.12,
                }
            ],
        },
        materials: MaterialParameters {
            material_type: "stainless-steel".to_string(),
            density: 8000.0,
            thermal_conductivity: 16.0,
            specific_heat: 500.0,
            emissivity: 0.7,
            melting_point: 1673.0,
        },
        boundary: BoundaryParameters {
            initial_temperature: 298.0,
            ambient_temperature: 298.0,
            wall_boundary_type: "mixed".to_string(),
            convection_coefficient: 15.0,
            surface_emissivity: 0.7,
        },
        simulation: SimulationSettings {
            total_time: 120.0,
            output_interval: 2.0,
            solver_method: "forward-euler".to_string(),
            cfl_factor: 0.4,
        },
    }
}

/// Create high power research parameters
fn create_high_power_params() -> SimulationParameters {
    use crate::parameters::*;

    SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 2.5,
            cylinder_radius: 0.6,
        },
        mesh: MeshParameters {
            preset: "high".to_string(),
            nr: 200,
            nz: 200,
        },
        torches: TorchParameters {
            torches: vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.5, z: 0.1 },
                    power: 500.0,
                    efficiency: 0.9,
                    sigma: 0.15,
                }
            ],
        },
        materials: MaterialParameters {
            material_type: "graphite".to_string(),
            density: 2200.0,
            thermal_conductivity: 100.0,
            specific_heat: 710.0,
            emissivity: 0.9,
            melting_point: 3773.0,
        },
        boundary: BoundaryParameters {
            initial_temperature: 298.0,
            ambient_temperature: 298.0,
            wall_boundary_type: "mixed".to_string(),
            convection_coefficient: 20.0,
            surface_emissivity: 0.9,
        },
        simulation: SimulationSettings {
            total_time: 180.0,
            output_interval: 3.0,
            solver_method: "forward-euler".to_string(),
            cfl_factor: 0.3,
        },
    }
}

/// Create medical waste processing parameters
fn create_medical_waste_params() -> SimulationParameters {
    use crate::parameters::*;

    SimulationParameters {
        geometry: GeometryParameters {
            cylinder_height: 2.0,
            cylinder_radius: 0.5,
        },
        mesh: MeshParameters {
            preset: "balanced".to_string(),
            nr: 100,
            nz: 100,
        },
        torches: TorchParameters {
            torches: vec![
                TorchConfig {
                    id: 1,
                    position: TorchPosition { r: 0.4, z: 0.15 },
                    power: 150.0,
                    efficiency: 0.85,
                    sigma: 0.1,
                },
                TorchConfig {
                    id: 2,
                    position: TorchPosition { r: 0.6, z: 0.15 },
                    power: 150.0,
                    efficiency: 0.85,
                    sigma: 0.1,
                }
            ],
        },
        materials: MaterialParameters {
            material_type: "ceramic".to_string(),
            density: 3800.0,
            thermal_conductivity: 2.0,
            specific_heat: 880.0,
            emissivity: 0.85,
            melting_point: 2073.0,
        },
        boundary: BoundaryParameters {
            initial_temperature: 298.0,
            ambient_temperature: 298.0,
            wall_boundary_type: "mixed".to_string(),
            convection_coefficient: 12.0,
            surface_emissivity: 0.85,
        },
        simulation: SimulationSettings {
            total_time: 90.0,
            output_interval: 1.5,
            solver_method: "forward-euler".to_string(),
            cfl_factor: 0.45,
        },
    }
}

// Tauri Commands for Project Management

/// Response structure for project operations
#[derive(Serialize)]
pub struct ProjectResponse {
    pub success: bool,
    pub message: String,
    pub project: Option<Project>,
}

/// Response structure for recent files
#[derive(Serialize)]
pub struct RecentFilesResponse {
    pub success: bool,
    pub files: Vec<RecentFile>,
}

/// Response structure for project templates
#[derive(Serialize)]
pub struct TemplatesResponse {
    pub success: bool,
    pub templates: Vec<ProjectTemplate>,
}

/// Create a new project
#[tauri::command]
pub fn create_new_project(
    name: String,
    description: Option<String>,
    template_id: Option<String>,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Creating new project: {}", name);

    let project = if let Some(template_id) = template_id {
        // Create project from template
        let templates = get_default_templates();
        if let Some(template) = templates.iter().find(|t| t.id == template_id) {
            let mut project = Project::from_parameters(name, template.parameters.clone());
            if let Some(desc) = description {
                project.metadata.description = desc;
            }
            project
        } else {
            return Err(format!("Template not found: {}", template_id));
        }
    } else {
        // Create project with default parameters
        Project::new(name, description)
    };

    // Validate the project
    project.validate()?;

    // Set as current project
    *project_manager.current_project.lock().unwrap() = Some(project.clone());

    Ok(ProjectResponse {
        success: true,
        message: "Project created successfully".to_string(),
        project: Some(project),
    })
}

/// Save current project to file
#[tauri::command]
pub fn save_project(
    file_path: String,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Saving project to: {}", file_path);

    let mut current_project = project_manager.current_project.lock().unwrap();
    
    if let Some(ref mut project) = *current_project {
        let path = Path::new(&file_path);
        
        // Ensure the directory exists
        if let Some(parent) = path.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("Failed to create directory: {}", e));
            }
        }

        project_manager.save_project(project, path)?;

        Ok(ProjectResponse {
            success: true,
            message: "Project saved successfully".to_string(),
            project: Some(project.clone()),
        })
    } else {
        Err("No current project to save".to_string())
    }
}

/// Load project from file
#[tauri::command]
pub fn load_project(
    file_path: String,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Loading project from: {}", file_path);

    let path = Path::new(&file_path);
    let project = project_manager.load_project(path)?;

    Ok(ProjectResponse {
        success: true,
        message: "Project loaded successfully".to_string(),
        project: Some(project),
    })
}

/// Get current project
#[tauri::command]
pub fn get_current_project(
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    let current_project = project_manager.get_current_project();

    Ok(ProjectResponse {
        success: true,
        message: "Current project retrieved".to_string(),
        project: current_project,
    })
}

/// Update current project parameters
#[tauri::command]
pub fn update_project_parameters(
    parameters: SimulationParameters,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Updating project parameters");

    let mut current_project = project_manager.current_project.lock().unwrap();
    
    if let Some(ref mut project) = *current_project {
        // Validate parameters
        let temp_project = Project::from_parameters("temp".to_string(), parameters.clone());
        temp_project.validate()?;

        // Update parameters
        project.parameters = parameters;
        project.touch();

        Ok(ProjectResponse {
            success: true,
            message: "Project parameters updated successfully".to_string(),
            project: Some(project.clone()),
        })
    } else {
        // Create new project with these parameters
        let project = Project::from_parameters("Untitled Project".to_string(), parameters);
        project.validate()?;
        
        *current_project = Some(project.clone());

        Ok(ProjectResponse {
            success: true,
            message: "New project created with parameters".to_string(),
            project: Some(project),
        })
    }
}

/// Get recent files
#[tauri::command]
pub fn get_recent_files(
    project_manager: State<Arc<ProjectManager>>,
) -> Result<RecentFilesResponse, String> {
    let recent_files = project_manager.get_recent_files();

    Ok(RecentFilesResponse {
        success: true,
        files: recent_files,
    })
}

/// Get project templates
#[tauri::command]
pub fn get_project_templates() -> Result<TemplatesResponse, String> {
    let templates = get_default_templates();

    Ok(TemplatesResponse {
        success: true,
        templates,
    })
}

/// Create project from template
#[tauri::command]
pub fn create_project_from_template(
    template_id: String,
    name: Option<String>,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Creating project from template: {}", template_id);

    let templates = get_default_templates();
    if let Some(template) = templates.iter().find(|t| t.id == template_id) {
        let project_name = name.unwrap_or_else(|| template.name.clone());
        let mut project = Project::from_parameters(project_name, template.parameters.clone());
        project.metadata.description = template.description.clone();
        project.metadata.tags.push(template.category.clone());

        // Validate the project
        project.validate()?;

        // Set as current project
        *project_manager.current_project.lock().unwrap() = Some(project.clone());

        Ok(ProjectResponse {
            success: true,
            message: format!("Project created from template: {}", template.name),
            project: Some(project),
        })
    } else {
        Err(format!("Template not found: {}", template_id))
    }
}

/// Update project metadata
#[tauri::command]
pub fn update_project_metadata(
    name: Option<String>,
    description: Option<String>,
    tags: Option<Vec<String>>,
    project_manager: State<Arc<ProjectManager>>,
) -> Result<ProjectResponse, String> {
    info!("Updating project metadata");

    let mut current_project = project_manager.current_project.lock().unwrap();
    
    if let Some(ref mut project) = *current_project {
        if let Some(name) = name {
            project.metadata.name = name;
        }
        if let Some(description) = description {
            project.metadata.description = description;
        }
        if let Some(tags) = tags {
            project.metadata.tags = tags;
        }
        project.touch();

        Ok(ProjectResponse {
            success: true,
            message: "Project metadata updated successfully".to_string(),
            project: Some(project.clone()),
        })
    } else {
        Err("No current project to update".to_string())
    }
}