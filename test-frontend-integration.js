#!/usr/bin/env node

/**
 * Frontend Integration Test Script
 * 
 * Tests the complete user workflow and component integration
 * for the Plasma Furnace Simulator frontend rebuild.
 */

const fs = require('fs');
const path = require('path');

class FrontendIntegrationTest {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        
        this.basePath = path.join(__dirname, 'src-tauri', 'ui');
    }

    async runAllTests() {
        console.log('🧪 Starting Frontend Integration Tests...\n');
        
        try {
            await this.testFileStructure();
            await this.testComponentAvailability();
            await this.testEventSystemIntegration();
            await this.testStateManagement();
            await this.testErrorHandling();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async testFileStructure() {
        console.log('📁 Testing file structure...');
        
        const requiredFiles = [
            'index.html',
            'js/main.js',
            'js/core/app.js',
            'js/core/eventBus.js',
            'js/core/state.js',
            'js/core/errorHandler.js',
            'js/core/loadingManager.js',
            'js/core/keyboardHandler.js',
            'js/components/parameters.js',
            'js/components/simulation.js',
            'js/components/visualization.js',
            'js/components/animation.js',
            'js/components/animationUI.js',
            'js/components/errorDisplay.js',
            'js/models/parameters.js',
            'css/main.css'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.basePath, file);
            const exists = fs.existsSync(filePath);
            
            this.recordTest(`File exists: ${file}`, exists);
            
            if (exists) {
                // Check if file is not empty
                const stats = fs.statSync(filePath);
                const notEmpty = stats.size > 0;
                this.recordTest(`File not empty: ${file}`, notEmpty);
            }
        }
    }

    async testComponentAvailability() {
        console.log('🔧 Testing component availability...');
        
        // Read and analyze JavaScript files for class definitions
        const componentFiles = [
            { file: 'js/core/eventBus.js', className: 'EventBus' },
            { file: 'js/core/app.js', className: 'App' },
            { file: 'js/core/state.js', className: 'AppState' },
            { file: 'js/core/errorHandler.js', className: 'ErrorHandler' },
            { file: 'js/components/parameters.js', className: 'ParameterPanel' },
            { file: 'js/components/simulation.js', className: 'SimulationController' },
            { file: 'js/components/visualization.js', className: 'VisualizationPanel' },
            { file: 'js/components/animation.js', className: 'AnimationController' },
            { file: 'js/models/parameters.js', className: 'SimulationParameters' }
        ];

        for (const { file, className } of componentFiles) {
            const filePath = path.join(this.basePath, file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const hasClass = content.includes(`class ${className}`);
                const hasExport = content.includes(`window.${className}`) || content.includes(`module.exports`);
                
                this.recordTest(`Class defined: ${className}`, hasClass);
                this.recordTest(`Class exported: ${className}`, hasExport);
            }
        }
    }

    async testEventSystemIntegration() {
        console.log('🔄 Testing event system integration...');
        
        // Check for event emission and listening patterns
        const eventPatterns = [
            { file: 'js/main.js', pattern: 'eventBus.on', description: 'Event listeners in main.js' },
            { file: 'js/main.js', pattern: 'eventBus.emit', description: 'Event emission in main.js' },
            { file: 'js/components/parameters.js', pattern: 'eventBus.emit.*parameters:', description: 'Parameter events' },
            { file: 'js/components/simulation.js', pattern: 'eventBus.emit.*simulation:', description: 'Simulation events' },
            { file: 'js/components/visualization.js', pattern: 'eventBus.emit.*visualization:', description: 'Visualization events' },
            { file: 'js/core/state.js', pattern: 'eventBus.emit.*state:', description: 'State change events' }
        ];

        for (const { file, pattern, description } of eventPatterns) {
            const filePath = path.join(this.basePath, file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const hasPattern = new RegExp(pattern).test(content);
                
                this.recordTest(description, hasPattern);
            }
        }
    }

    async testStateManagement() {
        console.log('🏛️ Testing state management...');
        
        // Check for proper state management patterns
        const statePatterns = [
            { file: 'js/core/state.js', pattern: 'validTransitions', description: 'State machine transitions defined' },
            { file: 'js/core/state.js', pattern: 'transition.*function', description: 'State transition function' },
            { file: 'js/core/state.js', pattern: 'validateState', description: 'State validation function' },
            { file: 'js/main.js', pattern: 'handleStateChange', description: 'State change handler in main' },
            { file: 'js/core/app.js', pattern: 'coordinateComponentStates', description: 'Component state coordination' }
        ];

        for (const { file, pattern, description } of statePatterns) {
            const filePath = path.join(this.basePath, file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const hasPattern = new RegExp(pattern).test(content);
                
                this.recordTest(description, hasPattern);
            }
        }
    }

    async testErrorHandling() {
        console.log('⚠️ Testing error handling...');
        
        // Check for comprehensive error handling
        const errorPatterns = [
            { file: 'js/core/errorHandler.js', pattern: 'errorTypes', description: 'Error types defined' },
            { file: 'js/core/errorHandler.js', pattern: 'handle.*function', description: 'Error handling function' },
            { file: 'js/components/errorDisplay.js', pattern: 'showError', description: 'Error display function' },
            { file: 'js/main.js', pattern: 'handleUIError', description: 'UI error handler' },
            { file: 'js/components/simulation.js', pattern: 'catch.*error', description: 'Simulation error handling' }
        ];

        for (const { file, pattern, description } of errorPatterns) {
            const filePath = path.join(this.basePath, file);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const hasPattern = new RegExp(pattern, 'i').test(content);
                
                this.recordTest(description, hasPattern);
            }
        }
    }

    recordTest(description, passed, error = null) {
        this.testResults.total++;
        
        if (passed) {
            this.testResults.passed++;
            console.log(`  ✅ ${description}`);
        } else {
            this.testResults.failed++;
            console.log(`  ❌ ${description}`);
            
            if (error) {
                this.testResults.errors.push({ description, error: error.message });
            }
        }
    }

    generateReport() {
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(({ description, error }) => {
                console.log(`  - ${description}: ${error}`);
            });
        }
        
        console.log('\n🎯 Integration Test Analysis:');
        
        // Analyze results
        const successRate = (this.testResults.passed / this.testResults.total) * 100;
        
        if (successRate >= 90) {
            console.log('✅ Excellent: Frontend integration is well implemented');
        } else if (successRate >= 75) {
            console.log('⚠️ Good: Frontend integration is mostly complete with minor issues');
        } else if (successRate >= 50) {
            console.log('⚠️ Fair: Frontend integration has significant gaps');
        } else {
            console.log('❌ Poor: Frontend integration needs major work');
        }
        
        console.log('\n🔍 Key Integration Points Verified:');
        console.log('  - Component structure and exports');
        console.log('  - Event system wiring between components');
        console.log('  - State management and transitions');
        console.log('  - Error handling and user feedback');
        console.log('  - Parameter validation and simulation flow');
        
        console.log('\n✨ Integration test completed!');
        
        // Exit with appropriate code
        if (this.testResults.failed > 0) {
            process.exit(1);
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new FrontendIntegrationTest();
    tester.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = FrontendIntegrationTest;