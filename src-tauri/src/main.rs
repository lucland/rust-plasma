// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Import our lib functions
use plasma_furnace_app::run;

/**
 * main.rs
 * Responsibility: Main entry point for the Plasma Furnace Simulator application
 * 
 * Main functions:
 * - Application initialization
 * - Menu system setup
 */

fn main() {
    // Call our app_lib run function to initialize and run the application
    // This way, we avoid defining our invoke handlers in two places
    run();
}
