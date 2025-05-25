// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Window, Manager}; 
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder, PredefinedMenuItem, MenuEvent}; 

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle(); 

            // --- File Menu Items ---
            let quit_item = MenuItemBuilder::with_id("exit", "Exit").build(app_handle)?;

            // --- File Submenu ---
            let file_submenu = SubmenuBuilder::new(app_handle, "File")
                .item(&quit_item)
                .build()?;

            // --- Other Example App Menu Items ---
            let copy_item = PredefinedMenuItem::copy(app_handle, Some("Copy"))?;
            let hide_item = MenuItemBuilder::with_id("hide", "Hide").build(app_handle)?;
            
            // --- Main Application Menu ---
            let main_app_menu = MenuBuilder::new(app_handle)
                .item(&copy_item)       
                .item(&hide_item)       
                .item(&file_submenu) 
                .build()?;

            app_handle.set_menu(main_app_menu)?;
            Ok(())
        })
        .on_menu_event(|app_handle: &AppHandle, event: MenuEvent| { 
            let menu_item_id = event.id();
            match menu_item_id.as_ref() {
                "exit" => {
                    println!("'exit' menu item triggered, exiting application.");
                    app_handle.exit(0); 
                }
                "hide" => {
                    if let Some(focused_window) = app_handle.get_focused_window() {
                        println!("'hide' menu item triggered for window: {}", focused_window.label());
                        focused_window.hide().expect("Failed to hide window");
                    } else {
                        eprintln!("'hide' menu item triggered, but no window is currently focused.");
                    }
                }
                _ => {
                    println!("Menu item '{}' clicked, no specific action defined.", menu_item_id.as_ref());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!()) 
        .expect("error while running tauri application");
}
