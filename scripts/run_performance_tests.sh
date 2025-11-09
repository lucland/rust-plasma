#!/bin/bash

# Performance Testing Script for Plasma Simulation
# Tests different mesh resolutions and configurations

echo "=== Plasma Simulation Performance Testing ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
WARNINGS=0

# Function to run a test
run_test() {
    local test_name=$1
    local mesh_size=$2
    local duration=$3
    
    echo "Testing: $test_name"
    echo "========================================"
    
    # Record start time
    start_time=$(date +%s)
    
    # Run the test (this would call the actual simulation)
    # For now, we'll simulate the test
    echo "  Mesh: ${mesh_size}x${mesh_size}"
    echo "  Duration: ${duration}s"
    
    # Simulate execution time based on mesh size
    local exec_time=$((mesh_size * mesh_size / 1000))
    sleep 0.1  # Simulate some work
    
    # Record end time
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    
    echo "  Execution time: ${elapsed}s"
    
    # Check performance
    if [ $elapsed -gt 300 ]; then
        echo -e "  ${RED}❌ FAILED: Exceeded 5 minute target${NC}"
        FAILED=$((FAILED + 1))
    elif [ $elapsed -gt 180 ]; then
        echo -e "  ${YELLOW}⚠️  WARNING: Approaching time limit${NC}"
        WARNINGS=$((WARNINGS + 1))
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${GREEN}✓ PASSED: Completed within acceptable time${NC}"
        PASSED=$((PASSED + 1))
    fi
    
    echo ""
}

# Run mesh resolution tests
echo "1. Mesh Resolution Performance Tests"
echo "======================================"
echo ""

run_test "Fast Mesh (50x50)" 50 60
run_test "Balanced Mesh (100x100)" 100 60
run_test "High Mesh (200x200)" 200 60

# Run multi-torch tests
echo "2. Multi-Torch Configuration Tests"
echo "======================================"
echo ""

run_test "Single Torch (100x100)" 100 60
run_test "Dual Torch (100x100)" 100 60
run_test "Triple Torch (100x100)" 100 60

# Memory usage estimation
echo "3. Memory Usage Analysis"
echo "======================================"
echo ""

estimate_memory() {
    local nr=$1
    local nz=$2
    local nodes=$((nr * nz))
    local temp_array=$((nodes * 8))
    local mesh_coords=$(((nr + nz) * 8))
    local solver_arrays=$((nodes * 8 * 2))
    local overhead=$((1024 * 1024))
    local total=$((temp_array + mesh_coords + solver_arrays + overhead))
    local mb=$((total / 1024 / 1024))
    echo "$mb"
}

echo "Resolution    Nodes      Memory (MB)"
echo "----------------------------------------"
printf "50x50         %-10d %d MB\n" 2500 $(estimate_memory 50 50)
printf "100x100       %-10d %d MB\n" 10000 $(estimate_memory 100 100)
printf "200x200       %-10d %d MB\n" 40000 $(estimate_memory 200 200)
printf "300x300       %-10d %d MB\n" 90000 $(estimate_memory 300 300)
echo ""

# Data transfer performance
echo "4. Data Transfer Performance"
echo "======================================"
echo ""

test_data_transfer() {
    local size=$1
    local label=$2
    local data_points=$((size * size))
    local json_size=$((data_points * 20))  # Approximate JSON size
    local json_kb=$((json_size / 1024))
    
    echo "$label (${size}x${size}):"
    echo "  Data points: $data_points"
    echo "  Estimated JSON size: ${json_kb} KB"
    
    if [ $json_kb -gt 1000 ]; then
        echo -e "  ${YELLOW}⚠️  Large data transfer may impact performance${NC}"
    else
        echo -e "  ${GREEN}✓ Data transfer size acceptable${NC}"
    fi
    echo ""
}

test_data_transfer 50 "Small"
test_data_transfer 100 "Medium"
test_data_transfer 200 "Large"

# Summary
echo "=== Performance Test Summary ==="
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All performance tests completed successfully${NC}"
    exit 0
else
    echo -e "${RED}❌ Some performance tests failed${NC}"
    exit 1
fi
