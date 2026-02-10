#!/usr/bin/env node

// Node.js test runner for NutriFit Tracker
// Run with: node run-tests.js

const fs = require('fs');
const path = require('path');

// Mock DOM environment for Node.js
global.window = {
    __NutriFit: null,
    addEventListener: () => {},
    location: { pathname: '' }
};

global.document = {
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({ addEventListener: () => {} }),
    addEventListener: () => {}
};

// Load the app code
try {
    const appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
    eval(appCode);
    
    const testCode = fs.readFileSync(path.join(__dirname, 'js', 'tests.js'), 'utf8');
    eval(testCode);
    
    // Run tests
    runNutriFitTests();
    
} catch (error) {
    console.error('❌ Error running tests:', error.message);
    process.exit(1);
}