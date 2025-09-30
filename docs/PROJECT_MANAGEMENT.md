# Project Management Feature

## Overview

The Project Management feature provides comprehensive project handling capabilities for the Plasma Furnace Simulator, allowing users to create, save, load, and manage simulation projects with metadata and parameter validation.

## Features

### Core Functionality

1. **Project Creation**
   - Create new projects with custom names and descriptions
   - Create projects from predefined templates
   - Automatic metadata generation (creation date, version, etc.)

2. **Project Persistence**
   - Save projects to JSON files (.pfp format)
   - Load projects from files with validation
   - Automatic parameter validation on load

3. **Recent Files Management**
   - Track recently opened projects
   - Quick access to recent projects from sidebar
   - Automatic cleanup of non-existent files

4. **Project Templates**
   - Predefined templates for common use cases:
     - Small Furnace (Laboratory)
     - Industrial Furnace (Industrial)
     - High Power Research (Research)
     - Medical Waste Processing (Waste Management)

5. **Project Metadata**
   - Project name and description
   - Creation and modification timestamps
   - Version tracking
   - Custom tags for organization
   - Author information (optional)

### User Interface

#### Header Controls
- **New**: Create a new project
- **Save**: Save current project to file
- **Load**: Load project from file
- **Project Info**: Click to edit project settings (when project is loaded)

#### Sidebar Features
- **Project Templates**: Dropdown to create projects from templates
- **Recent Projects**: List of recently opened projects with quick access

#### Project Settings Modal
- Edit project name and description
- Manage project tags
- View creation and modification dates
- Save metadata changes

## Technical Implementation

### Backend (Rust)

#### Core Structures
```rust
pub struct Project {
    pub metadata: ProjectMetadata,
    pub parameters: SimulationParameters,
    pub file_path: Option<PathBuf>,
}

pub struct ProjectMetadata {
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub version: String,
    pub author: Option<String>,
    pub tags: Vec<String>,
}
```

#### Key Components
- **ProjectManager**: Manages project state and file operations
- **Project Templates**: Predefined parameter configurations
- **Validation**: Comprehensive parameter validation
- **Recent Files**: Persistent recent files tracking

#### Tauri Commands
- `create_new_project`: Create new project
- `save_project`: Save project to file
- `load_project`: Load project from file
- `get_current_project`: Get current project state
- `update_project_parameters`: Update project parameters
- `get_recent_files`: Get recent files list
- `get_project_templates`: Get available templates
- `create_project_from_template`: Create from template
- `update_project_metadata`: Update project metadata

### Frontend (JavaScript)

#### ProjectManager Module
- Handles all project-related UI interactions
- Manages project state synchronization
- Provides API wrapper functions
- Handles modal dialogs and user interactions

#### Integration Points
- **Parameters Module**: Syncs with parameter forms
- **Main Application**: Updates window title and status
- **Menu System**: Responds to menu actions
- **Status System**: Provides user feedback

## File Format

Projects are saved in JSON format with the `.pfp` (Plasma Furnace Project) extension:

```json
{
  "metadata": {
    "name": "Industrial Furnace Test",
    "description": "Large-scale industrial furnace simulation",
    "created_at": "2024-01-15T10:30:00Z",
    "modified_at": "2024-01-15T14:45:00Z",
    "version": "1.0.0",
    "author": null,
    "tags": ["industrial", "test"]
  },
  "parameters": {
    "geometry": { ... },
    "mesh": { ... },
    "torches": { ... },
    "materials": { ... },
    "boundary": { ... },
    "simulation": { ... }
  },
  "file_path": "/path/to/project.pfp"
}
```

## Validation

### Parameter Validation
- Geometry: Height (1.0-10.0m), Radius (0.5-5.0m)
- Mesh: Nodes (10-500 each direction)
- Simulation: Positive time values, CFL factor (0.0-1.0)
- Boundary: Temperatures above absolute zero
- Materials: Positive physical properties, emissivity (0.0-1.0)
- Torches: Positive power, efficiency (0.0-1.0), normalized positions

### File Validation
- JSON format validation
- Parameter range checking
- Missing field handling
- Version compatibility

## Usage Examples

### Creating a New Project
```javascript
// Create from scratch
const project = await ProjectManager.createNewProject('My Test Project', 'A test simulation');

// Create from template
const project = await ProjectManager.createFromTemplate('industrial_furnace', 'Industrial Test');
```

### Saving and Loading
```javascript
// Save current project
await ProjectManager.saveProject('/path/to/project.pfp');

// Load existing project
const project = await ProjectManager.loadProject('/path/to/existing.pfp');
```

### Updating Metadata
```javascript
await ProjectManager.updateProjectMetadata(
    'Updated Project Name',
    'Updated description',
    ['tag1', 'tag2']
);
```

## Error Handling

The system provides comprehensive error handling with user-friendly messages:

- **File System Errors**: Permission issues, disk space, invalid paths
- **Validation Errors**: Parameter out of range, missing required fields
- **Format Errors**: Invalid JSON, corrupted files, version mismatches
- **Template Errors**: Unknown template IDs, template loading failures

## Future Enhancements

1. **Auto-save**: Automatic project saving at intervals
2. **Version Control**: Project history and change tracking
3. **Export/Import**: Support for additional file formats
4. **Collaboration**: Multi-user project sharing
5. **Cloud Storage**: Integration with cloud storage services
6. **Project Comparison**: Compare parameters between projects
7. **Batch Operations**: Bulk project operations
8. **Advanced Templates**: User-defined custom templates

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **5.1**: Project configuration saving in JSON format
- **5.2**: Complete parameter storage and restoration
- **5.3**: Parameter validation and consistency checking
- **5.4**: Recent files list for quick access
- **5.5**: Clear error messages and alternative actions
- **5.6**: Sensible default values for new projects

The implementation provides a robust foundation for project management that can be extended with additional features as needed.