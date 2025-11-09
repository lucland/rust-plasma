/**
 * Tauri IPC Bridge - Compatibility layer for Tauri v2 API
 * 
 * This module provides a consistent interface for Tauri IPC communication,
 * handling different API versions and providing fallbacks.
 */

(function() {
    'use strict';
    
    console.log('🔌 [TAURI-BRIDGE] Initializing Tauri IPC bridge...');
    
    // Check what's actually available
    console.log('🔍 [TAURI-BRIDGE] Checking available APIs...');
    console.log('🔍 [TAURI-BRIDGE] window.__TAURI__ =', typeof window.__TAURI__);
    console.log('🔍 [TAURI-BRIDGE] window.__TAURI_INTERNALS__ =', typeof window.__TAURI_INTERNALS__);
    console.log('🔍 [TAURI-BRIDGE] window.__TAURI_IPC__ =', typeof window.__TAURI_IPC__);
    
    // List all Tauri-related properties
    const tauriProps = Object.keys(window).filter(k => 
        k.includes('TAURI') || k.includes('tauri') || k.includes('__')
    );
    console.log('🔍 [TAURI-BRIDGE] Tauri-related properties:', tauriProps);
    
    // If __TAURI__ doesn't exist, try to create it from __TAURI_INTERNALS__
    if (!window.__TAURI__ && window.__TAURI_INTERNALS__) {
        console.log('⚠️ [TAURI-BRIDGE] window.__TAURI__ not found, attempting to create from __TAURI_INTERNALS__');
        
        try {
            // Create a compatible API structure
            window.__TAURI__ = {
                core: {
                    invoke: async function(cmd, args = {}) {
                        console.log(`🔌 [TAURI-BRIDGE] Invoking command: ${cmd}`, args);
                        
                        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                            return await window.__TAURI_INTERNALS__.invoke(cmd, args);
                        }
                        
                        throw new Error('Tauri IPC not available');
                    }
                },
                event: {
                    listen: function(event, handler) {
                        console.log(`🔌 [TAURI-BRIDGE] Listening to event: ${event}`);
                        
                        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.listen) {
                            return window.__TAURI_INTERNALS__.listen(event, handler);
                        }
                        
                        console.warn(`⚠️ [TAURI-BRIDGE] Event listening not available for: ${event}`);
                        return () => {}; // Return empty unsubscribe function
                    },
                    emit: async function(event, payload) {
                        console.log(`🔌 [TAURI-BRIDGE] Emitting event: ${event}`, payload);
                        
                        if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.emit) {
                            return await window.__TAURI_INTERNALS__.emit(event, payload);
                        }
                        
                        console.warn(`⚠️ [TAURI-BRIDGE] Event emission not available for: ${event}`);
                    }
                }
            };
            
            console.log('✅ [TAURI-BRIDGE] Created window.__TAURI__ from __TAURI_INTERNALS__');
        } catch (error) {
            console.error('❌ [TAURI-BRIDGE] Failed to create __TAURI__ API:', error);
        }
    }
    
    // Final check
    if (window.__TAURI__) {
        console.log('✅ [TAURI-BRIDGE] Tauri API is available');
        console.log('📦 [TAURI-BRIDGE] API structure:', Object.keys(window.__TAURI__));
    } else {
        console.error('❌ [TAURI-BRIDGE] Tauri API is NOT available after bridge initialization');
        console.error('❌ [TAURI-BRIDGE] This application requires Tauri to function');
        
        // Create a mock API for development/debugging
        console.warn('⚠️ [TAURI-BRIDGE] Creating mock API for debugging...');
        window.__TAURI__ = {
            core: {
                invoke: async function(cmd, args = {}) {
                    console.error(`❌ [TAURI-BRIDGE] Mock invoke called: ${cmd}`, args);
                    throw new Error('Tauri backend is not available. Cannot run simulation.');
                }
            },
            event: {
                listen: function(event, handler) {
                    console.error(`❌ [TAURI-BRIDGE] Mock listen called: ${event}`);
                    return () => {};
                },
                emit: async function(event, payload) {
                    console.error(`❌ [TAURI-BRIDGE] Mock emit called: ${event}`, payload);
                }
            }
        };
    }
    
    console.log('🔌 [TAURI-BRIDGE] Bridge initialization complete');
})();
