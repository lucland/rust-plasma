//! Tauri Desktop Application for Plasma Furnace Simulator
//! 
//! This module provides the desktop application interface using Tauri framework,
//! integrating the core simulation library with a modern web-based UI.
//! 
//! # Core Responsibilities
//! 
//! - Application initialization and setup
//! - Menu system creation and event handling
//! - Tauri command registration and routing
//! - State management and UI integration
//! - Bridge between frontend and simulation library

use std::sync::Arc;
use log::info;
use tauri::{AppHandle, Manager, Emitter};
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder, MenuEvent};

// Import core simulation library
use plasma_simulation::{init_logger as init_sim_logger, info as lib_info};

// Import our Tauri-specific modules
pub mod parameters;
pub mod simulation;
pub mod state;

// Re-export the types we'll need in main.rs
pub use parameters::*;
pub use simulation::*;
pub use state::*;

/// Main entry point for the application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize core simulation library logging
            init_sim_logger();
            
            // Setup Tauri logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Log library information
            let lib_info = lib_info();
            info!("Initializing {} v{}", lib_info.name, lib_info.version);
            info!("{}", lib_info.description);
            
            // Initialize application state
            app.manage(Arc::new(AppState::new()));
            info!("Application state initialized");
            
            // Setup menu system
            let app_handle = app.handle();

            // --- File Menu Items ---
            let quit_item = MenuItemBuilder::with_id("exit", "Exit").build(app_handle)?;
            let save_item = MenuItemBuilder::with_id("save", "Save Project").build(app_handle)?;
            let load_item = MenuItemBuilder::with_id("load", "Load Project").build(app_handle)?;

            // --- File Submenu ---
            let file_submenu = SubmenuBuilder::new(app_handle, "File")
                .item(&save_item)
                .item(&load_item)
                .separator()
                .item(&quit_item)
                .build()?;

            // --- Simulation Menu Items ---
            let run_sim_item = MenuItemBuilder::with_id("run_sim", "Run Simulation").build(app_handle)?;
            let stop_sim_item = MenuItemBuilder::with_id("stop_sim", "Stop Simulation").build(app_handle)?;

            // --- Simulation Submenu ---
            let sim_submenu = SubmenuBuilder::new(app_handle, "Simulation")
                .item(&run_sim_item)
                .item(&stop_sim_item)
                .build()?;

            // --- Help Menu Items ---
            let about_item = MenuItemBuilder::with_id("about", "About").build(app_handle)?;
            let docs_item = MenuItemBuilder::with_id("docs", "Documentation").build(app_handle)?;

            // --- Help Submenu ---
            let help_submenu = SubmenuBuilder::new(app_handle, "Help")
                .item(&about_item)
                .item(&docs_item)
                .build()?;

            // --- Main Application Menu ---
            let main_app_menu = MenuBuilder::new(app_handle)
                .item(&file_submenu)
                .item(&sim_submenu)
                .item(&help_submenu)
                .build()?;

            app_handle.set_menu(main_app_menu)?;
            Ok(())
        })
        .on_menu_event(|app_handle: &AppHandle, event: MenuEvent| { 
            let menu_item_id = event.id();
            match menu_item_id.as_ref() {
                "exit" => {
                    info!("'exit' menu item triggered, exiting application.");
                    app_handle.exit(0); 
                }
                "save" => {
                    info!("'save' menu item triggered.");
                    // Here we would trigger the save functionality
                    // We'll emit an event to the frontend
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "save");
                    }
                }
                "load" => {
                    info!("'load' menu item triggered.");
                    // Here we would trigger the load functionality
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "load");
                    }
                }
                "run_sim" => {
                    info!("'run simulation' menu item triggered.");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "run_sim");
                    }
                }
                "stop_sim" => {
                    info!("'stop simulation' menu item triggered.");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "stop_sim");
                    }
                }
                "about" => {
                    info!("'about' menu item triggered.");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "about");
                    }
                }
                "docs" => {
                    info!("'docs' menu item triggered.");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("menu-action", "docs");
                    }
                }
                _ => {
                    info!("Menu item '{}' clicked, no specific action defined.", menu_item_id.as_ref());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            parameters::get_parameters,
            parameters::save_parameters,
            parameters::load_parameter_template,
            simulation::run_simulation,
            simulation::get_simulation_status,
            simulation::get_simulation_results,
            state::update_geometry,
            state::get_debug_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
