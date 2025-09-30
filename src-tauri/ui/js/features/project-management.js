/**
 * project-management.js
 * Responsibility: Project management functionality for the frontend
 * 
 * Main functions:
 * - Project creation, saving, and loading
 * - Recent files management
 * - Project templates
 * - Project metadata management
 */

const ProjectManager = (function() {
    let currentProject = null;
    let recentFiles = [];
    let projectTemplates = [];

    /**
     * Initialize project management
     */
    const init = () => {
        initEventListeners();
        loadProjectTemplates();
        loadRecentFiles();
        console.log('Project Manager initialized');
    };

    /**
     * Initialize event listeners
     */
    const initEventListeners = () => {
        // Save project button
        const saveBtn = document.getElementById('save-project');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSaveProject);
        }

        // Load project button
        const loadBtn = document.getElementById('load-project');
        if (loadBtn) {
            loadBtn.addEventListener('click', handleLoadProject);
        }

        // New project button (if exists)
        const newBtn = document.getElementById('new-project');
        if (newBtn) {
            newBtn.addEventListener('click', handleNewProject);
        }

        // Project info click to open settings
        const projectInfo = document.getElementById('project-info');
        if (projectInfo) {
            projectInfo.addEventListener('click', () => {
                if (currentProject) {
                    showProjectSettingsModal();
                }
            });
            projectInfo.style.cursor = 'pointer';
        }

        // Modal event listeners
        initModalEventListeners();

        // Listen for menu events from Tauri
        if (window.__TAURI__) {
            window.__TAURI__.event.listen('menu-action', (event) => {
                const action = event.payload;
                switch (action) {
                    case 'save':
                        handleSaveProject();
                        break;
                    case 'load':
                        handleLoadProject();
                        break;
                    case 'new':
                        handleNewProject();
                        break;
                }
            });
        }
    };

    /**
     * Initialize modal event listeners
     */
    const initModalEventListeners = () => {
        const modal = document.getElementById('project-settings-modal');
        const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
        const saveButton = document.getElementById('save-project-metadata');

        // Close modal handlers
        closeButtons.forEach(btn => {
            btn.addEventListener('click', hideProjectSettingsModal);
        });

        // Close on backdrop click
        modal.querySelector('.modal-backdrop').addEventListener('click', hideProjectSettingsModal);

        // Save metadata handler
        if (saveButton) {
            saveButton.addEventListener('click', handleSaveProjectMetadata);
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('d-none')) {
                hideProjectSettingsModal();
            }
        });
    };

    /**
     * Create a new project
     */
    const createNewProject = async (name, description = null, templateId = null) => {
        try {
            const result = await PlasmaAPI.invoke('create_new_project', {
                name,
                description,
                template_id: templateId
            });

            if (result.success) {
                currentProject = result.project;
                updateUI();
                PlasmaUtils.Status.update('New project created', 'success');
                
                // Load parameters into the UI
                if (result.project && result.project.parameters) {
                    loadParametersIntoUI(result.project.parameters);
                }
                
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to create project');
            }
        } catch (error) {
            console.error('Error creating new project:', error);
            PlasmaUtils.Status.update('Failed to create project', 'error');
            throw error;
        }
    };

    /**
     * Save current project
     */
    const saveProject = async (filePath = null) => {
        try {
            // If no file path provided, show save dialog
            if (!filePath) {
                filePath = await showSaveDialog();
                if (!filePath) return null; // User cancelled
            }

            // Update project with current parameters
            await updateProjectWithCurrentParameters();

            const result = await PlasmaAPI.invoke('save_project', {
                file_path: filePath
            });

            if (result.success) {
                currentProject = result.project;
                updateUI();
                PlasmaUtils.Status.update('Project saved successfully', 'success');
                await loadRecentFiles(); // Refresh recent files
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            PlasmaUtils.Status.update('Failed to save project', 'error');
            throw error;
        }
    };

    /**
     * Load project from file
     */
    const loadProject = async (filePath = null) => {
        try {
            // If no file path provided, show open dialog
            if (!filePath) {
                filePath = await showOpenDialog();
                if (!filePath) return null; // User cancelled
            }

            const result = await PlasmaAPI.invoke('load_project', {
                file_path: filePath
            });

            if (result.success) {
                currentProject = result.project;
                updateUI();
                PlasmaUtils.Status.update('Project loaded successfully', 'success');
                
                // Load parameters into the UI
                if (result.project && result.project.parameters) {
                    loadParametersIntoUI(result.project.parameters);
                }
                
                await loadRecentFiles(); // Refresh recent files
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to load project');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            PlasmaUtils.Status.update('Failed to load project', 'error');
            throw error;
        }
    };

    /**
     * Get current project
     */
    const getCurrentProject = async () => {
        try {
            const result = await PlasmaAPI.invoke('get_current_project');
            if (result.success) {
                currentProject = result.project;
                return result.project;
            }
            return null;
        } catch (error) {
            console.error('Error getting current project:', error);
            return null;
        }
    };

    /**
     * Load project templates
     */
    const loadProjectTemplates = async () => {
        try {
            const result = await PlasmaAPI.invoke('get_project_templates');
            if (result.success) {
                projectTemplates = result.templates;
                updateTemplatesUI();
            }
        } catch (error) {
            console.error('Error loading project templates:', error);
        }
    };

    /**
     * Load recent files
     */
    const loadRecentFiles = async () => {
        try {
            const result = await PlasmaAPI.invoke('get_recent_files');
            if (result.success) {
                recentFiles = result.files;
                updateRecentFilesUI();
            }
        } catch (error) {
            console.error('Error loading recent files:', error);
        }
    };

    /**
     * Create project from template
     */
    const createFromTemplate = async (templateId, name = null) => {
        try {
            const result = await PlasmaAPI.invoke('create_project_from_template', {
                template_id: templateId,
                name
            });

            if (result.success) {
                currentProject = result.project;
                updateUI();
                PlasmaUtils.Status.update('Project created from template', 'success');
                
                // Load parameters into the UI
                if (result.project && result.project.parameters) {
                    loadParametersIntoUI(result.project.parameters);
                }
                
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to create project from template');
            }
        } catch (error) {
            console.error('Error creating project from template:', error);
            PlasmaUtils.Status.update('Failed to create project from template', 'error');
            throw error;
        }
    };

    /**
     * Update project parameters
     */
    const updateProjectParameters = async (parameters) => {
        try {
            const result = await PlasmaAPI.invoke('update_project_parameters', {
                parameters
            });

            if (result.success) {
                currentProject = result.project;
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to update project parameters');
            }
        } catch (error) {
            console.error('Error updating project parameters:', error);
            throw error;
        }
    };

    /**
     * Update project metadata
     */
    const updateProjectMetadata = async (name, description, tags) => {
        try {
            const result = await PlasmaAPI.invoke('update_project_metadata', {
                name,
                description,
                tags
            });

            if (result.success) {
                currentProject = result.project;
                updateUI();
                return result.project;
            } else {
                throw new Error(result.message || 'Failed to update project metadata');
            }
        } catch (error) {
            console.error('Error updating project metadata:', error);
            throw error;
        }
    };

    /**
     * Handle save project button click
     */
    const handleSaveProject = async () => {
        if (!currentProject) {
            // Create new project first
            const name = prompt('Enter project name:', 'Untitled Project');
            if (!name) return;
            
            await createNewProject(name);
        }
        
        await saveProject();
    };

    /**
     * Handle load project button click
     */
    const handleLoadProject = async () => {
        await loadProject();
    };

    /**
     * Handle new project button click
     */
    const handleNewProject = async () => {
        const name = prompt('Enter project name:', 'New Project');
        if (!name) return;
        
        await createNewProject(name);
    };

    /**
     * Show save dialog (simplified for now)
     */
    const showSaveDialog = async () => {
        // In a real implementation, this would use Tauri's file dialog
        // For now, use a simple prompt
        const fileName = prompt('Enter file name (without extension):', currentProject?.metadata?.name || 'project');
        if (!fileName) return null;
        
        return `${fileName}.pfp`; // Plasma Furnace Project file
    };

    /**
     * Show open dialog (simplified for now)
     */
    const showOpenDialog = async () => {
        // In a real implementation, this would use Tauri's file dialog
        // For now, use recent files or prompt
        if (recentFiles.length > 0) {
            const fileList = recentFiles.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
            const choice = prompt(`Select a recent file:\n${fileList}\n\nEnter number (1-${recentFiles.length}) or file path:`);
            
            if (!choice) return null;
            
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < recentFiles.length) {
                return recentFiles[index].path;
            } else {
                return choice; // Assume it's a file path
            }
        } else {
            return prompt('Enter project file path:');
        }
    };

    /**
     * Update project with current parameters from UI
     */
    const updateProjectWithCurrentParameters = async () => {
        if (!currentProject) return;

        try {
            // Get current parameters from the parameters module
            let parameters = {};
            if (window.PlasmaParameters) {
                parameters = PlasmaParameters.getParameters();
            }

            await updateProjectParameters(parameters);
        } catch (error) {
            console.error('Error updating project with current parameters:', error);
        }
    };

    /**
     * Load parameters into UI
     */
    const loadParametersIntoUI = (parameters) => {
        try {
            // Load parameters into the parameters module
            if (window.PlasmaParameters) {
                PlasmaParameters.loadParameters(parameters);
            }
        } catch (error) {
            console.error('Error loading parameters into UI:', error);
        }
    };

    /**
     * Update UI elements
     */
    const updateUI = () => {
        // Update window title
        if (currentProject) {
            document.title = `Plasma Furnace Simulator - ${currentProject.metadata.name}`;
        } else {
            document.title = 'Plasma Furnace Simulator';
        }

        // Update project info display (if exists)
        const projectInfo = document.getElementById('project-info');
        if (projectInfo) {
            if (currentProject) {
                const hasUnsavedChanges = false; // TODO: Implement change tracking
                const statusClass = hasUnsavedChanges ? 'modified' : 'saved';
                const statusText = hasUnsavedChanges ? 'Modified' : 'Saved';
                
                projectInfo.innerHTML = `
                    <div class="project-info">
                        <div class="d-flex align-items-center gap-2">
                            <h4>${currentProject.metadata.name}</h4>
                            <div class="project-status ${statusClass}">
                                <div class="project-status-indicator"></div>
                                <span>${statusText}</span>
                            </div>
                        </div>
                        <p class="text-muted">${currentProject.metadata.description}</p>
                        <small class="text-muted">Modified: ${new Date(currentProject.metadata.modified_at).toLocaleString()}</small>
                    </div>
                `;
            } else {
                projectInfo.innerHTML = `
                    <div class="project-info">
                        <span class="text-muted">No project loaded</span>
                    </div>
                `;
            }
        }
    };

    /**
     * Update templates UI
     */
    const updateTemplatesUI = () => {
        const templateSelect = document.querySelector('.template-select');
        if (templateSelect && projectTemplates.length > 0) {
            // Clear existing options except the first one
            while (templateSelect.children.length > 1) {
                templateSelect.removeChild(templateSelect.lastChild);
            }

            // Add template options
            projectTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = `${template.name} - ${template.description}`;
                templateSelect.appendChild(option);
            });

            // Add event listener for template selection
            templateSelect.addEventListener('change', async (e) => {
                if (e.target.value) {
                    const templateId = e.target.value;
                    const template = projectTemplates.find(t => t.id === templateId);
                    if (template) {
                        const name = prompt(`Create project from template "${template.name}".\nEnter project name:`, template.name);
                        if (name) {
                            await createFromTemplate(templateId, name);
                        }
                    }
                    e.target.value = ''; // Reset selection
                }
            });
        }
    };

    /**
     * Update recent files UI
     */
    const updateRecentFilesUI = () => {
        const recentFilesList = document.getElementById('recent-files-list');
        if (recentFilesList) {
            if (recentFiles.length === 0) {
                recentFilesList.innerHTML = '<div class="text-muted text-sm">No recent projects</div>';
                return;
            }

            recentFilesList.innerHTML = recentFiles.map(file => `
                <div class="recent-file-item" data-path="${file.path}">
                    <div class="file-name">${file.name}</div>
                    <div class="file-date">${new Date(file.last_opened).toLocaleDateString()}</div>
                </div>
            `).join('');

            // Add click handlers for recent files
            recentFilesList.querySelectorAll('.recent-file-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const filePath = item.dataset.path;
                    if (filePath) {
                        try {
                            await loadProject(filePath);
                        } catch (error) {
                            console.error('Failed to load recent project:', error);
                            PlasmaUtils.Status.update('Failed to load recent project', 'error');
                        }
                    }
                });
            });
        }
    };

    /**
     * Show project settings modal
     */
    const showProjectSettingsModal = () => {
        if (!currentProject) return;

        const modal = document.getElementById('project-settings-modal');
        const form = document.getElementById('project-metadata-form');

        // Populate form with current project data
        form.querySelector('#project-name').value = currentProject.metadata.name || '';
        form.querySelector('#project-description').value = currentProject.metadata.description || '';
        form.querySelector('#project-tags').value = (currentProject.metadata.tags || []).join(', ');
        
        // Update readonly fields
        document.getElementById('project-created').textContent = 
            new Date(currentProject.metadata.created_at).toLocaleString();
        document.getElementById('project-modified').textContent = 
            new Date(currentProject.metadata.modified_at).toLocaleString();

        // Show modal
        modal.classList.remove('d-none');
    };

    /**
     * Hide project settings modal
     */
    const hideProjectSettingsModal = () => {
        const modal = document.getElementById('project-settings-modal');
        modal.classList.add('d-none');
    };

    /**
     * Handle save project metadata
     */
    const handleSaveProjectMetadata = async () => {
        const form = document.getElementById('project-metadata-form');
        const formData = new FormData(form);

        const name = formData.get('name');
        const description = formData.get('description');
        const tagsString = formData.get('tags');
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        try {
            await updateProjectMetadata(name, description, tags);
            hideProjectSettingsModal();
            PlasmaUtils.Status.update('Project metadata updated', 'success');
        } catch (error) {
            console.error('Error saving project metadata:', error);
            PlasmaUtils.Status.update('Failed to update project metadata', 'error');
        }
    };

    // Public API
    return {
        init,
        createNewProject,
        saveProject,
        loadProject,
        getCurrentProject,
        createFromTemplate,
        updateProjectParameters,
        updateProjectMetadata,
        showProjectSettingsModal,
        hideProjectSettingsModal,
        getProjectTemplates: () => projectTemplates,
        getRecentFiles: () => recentFiles,
        getCurrentProject: () => currentProject
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.PlasmaAPI) {
        ProjectManager.init();
    }
});

// Make available globally
window.ProjectManager = ProjectManager;