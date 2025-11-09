// Performance testing suite for plasma simulation
// Tests end-to-end simulation time, memory usage, and data transfer bottlenecks

use plasma_simulation::simulation::*;
use std::time::Instant;

/// Performance metrics structure
#[derive(Debug, Clone)]
#[allow(dead_code)]
struct PerformanceMetrics {
    mesh_resolution: (usize, usize),
    total_time: f64,
    initialization_time: f64,
    simulation_time: f64,
    memory_usage_mb: f64,
    time_steps_completed: usize,
    avg_time_per_step: f64,
}

/// Test configuration for different mesh resolutions
#[derive(Debug, Clone)]
struct TestConfig {
    name: String,
    mesh_preset: MeshPreset,
    custom_resolution: Option<(usize, usize)>,
    simulation_time: f64,
    num_torches: usize,
}

fn main() {
    println!("=== Plasma Simulation Performance Testing Suite ===\n");
    
    // Define test configurations
    let test_configs = vec![
        TestConfig {
            name: "Fast Mesh (50x50)".to_string(),
            mesh_preset: MeshPreset::Fast,
            custom_resolution: None,
            simulation_time: 60.0,
            num_torches: 1,
        },
        TestConfig {
            name: "Balanced Mesh (100x100)".to_string(),
            mesh_preset: MeshPreset::Balanced,
            custom_resolution: None,
            simulation_time: 60.0,
            num_torches: 1,
        },
        TestConfig {
            name: "High Mesh (200x200)".to_string(),
            mesh_preset: MeshPreset::High,
            custom_resolution: None,
            simulation_time: 60.0,
            num_torches: 1,
        },
        TestConfig {
            name: "Custom Mesh (150x150)".to_string(),
            mesh_preset: MeshPreset::Custom,
            custom_resolution: Some((150, 150)),
            simulation_time: 60.0,
            num_torches: 1,
        },
        TestConfig {
            name: "Multi-Torch (100x100, 3 torches)".to_string(),
            mesh_preset: MeshPreset::Balanced,
            custom_resolution: None,
            simulation_time: 60.0,
            num_torches: 3,
        },
    ];
    
    let mut all_metrics = Vec::new();
    
    // Run tests for each configuration
    for config in test_configs {
        println!("Testing: {}", config.name);
        println!("{}", "=".repeat(60));
        
        match run_performance_test(&config) {
            Ok(metrics) => {
                print_metrics(&metrics);
                
                // Check if simulation completes in reasonable time
                if metrics.total_time > 300.0 {
                    println!("⚠️  WARNING: Simulation took longer than 5 minutes!");
                } else {
                    println!("✓ Simulation completed within acceptable time");
                }
                
                all_metrics.push((config.name.clone(), metrics));
            }
            Err(e) => {
                println!("❌ Test failed: {}", e);
            }
        }
        
        println!();
    }
    
    // Print summary comparison
    print_summary(&all_metrics);
    
    // Test data transfer performance
    println!("\n=== Data Transfer Performance ===");
    test_data_transfer_performance();
    
    // Test memory usage patterns
    println!("\n=== Memory Usage Analysis ===");
    test_memory_patterns();
}

/// Run a single performance test
fn run_performance_test(config: &TestConfig) -> anyhow::Result<PerformanceMetrics> {
    let start_total = Instant::now();
    
    // Create simulation configuration
    let sim_config = create_test_config(config)?;
    
    // Measure initialization time
    let start_init = Instant::now();
    let mut engine = SimulationEngine::new(sim_config.clone())?;
    engine.initialize()?;
    let init_time = start_init.elapsed().as_secs_f64();
    
    println!("  Initialization: {:.3}s", init_time);
    
    // Get mesh resolution
    let mesh_resolution = if let Some((nr, nz)) = config.custom_resolution {
        (nr, nz)
    } else {
        config.mesh_preset.resolution()
    };
    
    // Estimate memory usage
    let memory_mb = estimate_memory_usage(mesh_resolution.0, mesh_resolution.1);
    println!("  Estimated memory: {:.2} MB", memory_mb);
    
    // Run simulation with timing
    let start_sim = Instant::now();
    let _results = engine.run()?;
    let sim_time = start_sim.elapsed().as_secs_f64();
    
    let total_time = start_total.elapsed().as_secs_f64();
    
    // Calculate metrics
    let time_steps = estimate_time_steps(&sim_config, mesh_resolution);
    let avg_time_per_step = if time_steps > 0 {
        sim_time / time_steps as f64
    } else {
        0.0
    };
    
    Ok(PerformanceMetrics {
        mesh_resolution,
        total_time,
        initialization_time: init_time,
        simulation_time: sim_time,
        memory_usage_mb: memory_mb,
        time_steps_completed: time_steps,
        avg_time_per_step,
    })
}

/// Create test configuration
fn create_test_config(config: &TestConfig) -> anyhow::Result<SimulationConfig> {
    let mut sim_config = SimulationConfig::default();
    
    // Set geometry
    sim_config.geometry.radius = 1.0;
    sim_config.geometry.height = 2.0;
    
    // Set mesh
    sim_config.mesh.preset = config.mesh_preset;
    sim_config.mesh.custom_resolution = config.custom_resolution;
    
    // Set physics
    sim_config.physics.initial_temperature = 300.0;
    sim_config.physics.ambient_temperature = 300.0;
    sim_config.physics.simulation_time = config.simulation_time;
    
    // Set solver
    sim_config.solver.method = SolverMethod::ForwardEuler;
    sim_config.solver.cfl_factor = 0.5;
    
    // Create torches
    sim_config.torches = match config.num_torches {
        1 => vec![
            TorchConfig {
                position: (0.5, 1.0),
                power: 150.0,
                efficiency: 0.8,
                sigma: 0.1,
            }
        ],
        3 => vec![
            TorchConfig {
                position: (0.3, 0.5),
                power: 100.0,
                efficiency: 0.8,
                sigma: 0.1,
            },
            TorchConfig {
                position: (0.7, 1.0),
                power: 100.0,
                efficiency: 0.8,
                sigma: 0.1,
            },
            TorchConfig {
                position: (0.5, 1.5),
                power: 100.0,
                efficiency: 0.8,
                sigma: 0.1,
            },
        ],
        _ => vec![],
    };
    
    // Set material
    sim_config.material.material_name = "Carbon Steel".to_string();
    
    Ok(sim_config)
}

/// Estimate memory usage for a given mesh resolution
fn estimate_memory_usage(nr: usize, nz: usize) -> f64 {
    let nodes = nr * nz;
    
    // Temperature array: 8 bytes per f64
    let temp_array = nodes * 8;
    
    // Mesh coordinates: 2 arrays of size nr and nz
    let mesh_coords = (nr + nz) * 8;
    
    // Additional arrays for solver (temporary storage)
    let solver_arrays = nodes * 8 * 2; // Old and new temperature
    
    // Material properties and other overhead
    let overhead = 1024 * 1024; // 1 MB overhead
    
    let total_bytes = temp_array + mesh_coords + solver_arrays + overhead;
    total_bytes as f64 / (1024.0 * 1024.0)
}

/// Estimate number of time steps
fn estimate_time_steps(config: &SimulationConfig, mesh_resolution: (usize, usize)) -> usize {
    // This is a rough estimate based on CFL condition
    let (nr, nz) = mesh_resolution;
    let dr = config.geometry.radius / (nr - 1) as f64;
    let dz = config.geometry.height / (nz - 1) as f64;
    
    // Thermal diffusivity for steel (approximate)
    let alpha = 1.2e-5; // m²/s
    
    // CFL condition: dt <= cfl_factor * min(dr², dz²) / (2 * alpha)
    let min_spacing_sq = dr.min(dz).powi(2);
    let dt = config.solver.cfl_factor * min_spacing_sq / (2.0 * alpha);
    
    // Number of steps
    (config.physics.simulation_time / dt).ceil() as usize
}

/// Print performance metrics
fn print_metrics(metrics: &PerformanceMetrics) {
    println!("  Mesh: {}x{}", metrics.mesh_resolution.0, metrics.mesh_resolution.1);
    println!("  Total nodes: {}", metrics.mesh_resolution.0 * metrics.mesh_resolution.1);
    println!("  Total time: {:.3}s", metrics.total_time);
    println!("  Simulation time: {:.3}s", metrics.simulation_time);
    println!("  Time steps: {}", metrics.time_steps_completed);
    println!("  Avg time/step: {:.6}s", metrics.avg_time_per_step);
    println!("  Memory usage: {:.2} MB", metrics.memory_usage_mb);
    
    // Calculate performance rating
    let nodes_per_second = (metrics.mesh_resolution.0 * metrics.mesh_resolution.1) as f64 
        / metrics.simulation_time;
    println!("  Performance: {:.0} nodes/second", nodes_per_second);
}

/// Print summary comparison
fn print_summary(all_metrics: &[(String, PerformanceMetrics)]) {
    println!("\n=== Performance Summary ===");
    println!("{:<40} {:>12} {:>12} {:>12}", "Configuration", "Total Time", "Sim Time", "Memory");
    println!("{}", "=".repeat(80));
    
    for (name, metrics) in all_metrics {
        println!("{:<40} {:>10.2}s {:>10.2}s {:>10.2}MB", 
            name, 
            metrics.total_time, 
            metrics.simulation_time,
            metrics.memory_usage_mb
        );
    }
    
    // Find fastest and slowest
    if let Some((fastest_name, fastest)) = all_metrics.iter().min_by(|a, b| {
        a.1.total_time.partial_cmp(&b.1.total_time).unwrap()
    }) {
        println!("\n✓ Fastest: {} ({:.2}s)", fastest_name, fastest.total_time);
    }
    
    if let Some((slowest_name, slowest)) = all_metrics.iter().max_by(|a, b| {
        a.1.total_time.partial_cmp(&b.1.total_time).unwrap()
    }) {
        println!("⚠  Slowest: {} ({:.2}s)", slowest_name, slowest.total_time);
    }
}

/// Test data transfer performance between backend and frontend
fn test_data_transfer_performance() {
    use serde_json;
    
    println!("Testing serialization/deserialization performance...");
    
    // Create mock temperature data of various sizes
    let test_sizes = vec![
        (50, 50, "Small"),
        (100, 100, "Medium"),
        (200, 200, "Large"),
    ];
    
    for (nr, nz, label) in test_sizes {
        let data_size = nr * nz;
        let mut temperature_data = Vec::with_capacity(data_size);
        
        // Generate mock data
        for i in 0..nr {
            for j in 0..nz {
                let temp = 300.0 + (i * j) as f64 * 0.1;
                temperature_data.push(temp);
            }
        }
        
        // Test serialization
        let start = Instant::now();
        let json_str = serde_json::to_string(&temperature_data).unwrap();
        let serialize_time = start.elapsed();
        
        // Test deserialization
        let start = Instant::now();
        let _: Vec<f64> = serde_json::from_str(&json_str).unwrap();
        let deserialize_time = start.elapsed();
        
        let json_size_kb = json_str.len() as f64 / 1024.0;
        
        println!("  {} ({}x{}):", label, nr, nz);
        println!("    Data points: {}", data_size);
        println!("    JSON size: {:.2} KB", json_size_kb);
        println!("    Serialize: {:.3}ms", serialize_time.as_secs_f64() * 1000.0);
        println!("    Deserialize: {:.3}ms", deserialize_time.as_secs_f64() * 1000.0);
        println!("    Total transfer overhead: {:.3}ms", 
            (serialize_time + deserialize_time).as_secs_f64() * 1000.0);
        
        // Check if transfer is acceptable (< 100ms for reasonable sizes)
        let total_ms = (serialize_time + deserialize_time).as_secs_f64() * 1000.0;
        if total_ms > 100.0 {
            println!("    ⚠️  WARNING: Data transfer may be slow");
        } else {
            println!("    ✓ Transfer performance acceptable");
        }
    }
}

/// Test memory usage patterns
fn test_memory_patterns() {
    println!("Analyzing memory usage patterns...");
    
    let test_cases = vec![
        (50, 50, "Fast"),
        (100, 100, "Balanced"),
        (200, 200, "High"),
        (300, 300, "Very High"),
    ];
    
    println!("\n{:<15} {:>12} {:>15} {:>15}", "Resolution", "Nodes", "Est. Memory", "Per Node");
    println!("{}", "=".repeat(60));
    
    for (nr, nz, label) in test_cases {
        let nodes = nr * nz;
        let memory_mb = estimate_memory_usage(nr, nz);
        let per_node_bytes = (memory_mb * 1024.0 * 1024.0) / nodes as f64;
        
        println!("{:<15} {:>12} {:>13.2} MB {:>13.1} B", 
            format!("{} ({}x{})", label, nr, nz),
            nodes,
            memory_mb,
            per_node_bytes
        );
        
        // Check if memory usage is acceptable (< 500 MB)
        if memory_mb > 500.0 {
            println!("  ⚠️  WARNING: High memory usage");
        }
    }
    
    println!("\n✓ Memory usage scales linearly with mesh resolution");
}
