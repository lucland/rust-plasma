//! Benchmarks for numerical solvers
//! 
//! This benchmark suite measures the performance of different numerical methods
//! and solver implementations to guide optimization efforts and performance
//! regression detection.

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use plasma_simulation::simulation::SimulationEngine;

/// Benchmark basic simulation engine creation
fn bench_simulation_engine_creation(c: &mut Criterion) {
    c.bench_function("simulation_engine_creation", |b| {
        b.iter(|| {
            let config = plasma_simulation::simulation::SimulationConfig::default();
            let engine = SimulationEngine::new(black_box(config));
            black_box(engine)
        })
    });
}

/// Benchmark simulation run (placeholder)
fn bench_simulation_run(c: &mut Criterion) {
    c.bench_function("simulation_run_placeholder", |b| {
        b.iter(|| {
            let config = plasma_simulation::simulation::SimulationConfig::default();
            let mut engine = SimulationEngine::new(config).unwrap();
            let result = engine.run();
            black_box(result)
        })
    });
}

criterion_group!(benches, bench_simulation_engine_creation, bench_simulation_run);
criterion_main!(benches);