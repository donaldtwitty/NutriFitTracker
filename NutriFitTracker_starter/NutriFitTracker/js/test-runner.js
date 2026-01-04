const consoleOutput = document.getElementById('console-output');
const originalLog = console.log;
const originalError = console.error;

function captureConsole() {
    consoleOutput.textContent = '';
    
    console.log = function(...args) {
        originalLog.apply(console, args);
        consoleOutput.textContent += args.join(' ') + '\n';
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        consoleOutput.textContent += args.join(' ') + '\n';
    };
}

function runTests() {
    captureConsole();
    runNutriFitTests();
}

// Auto-run on load and wire up button
window.addEventListener('load', () => {
    const runButton = document.getElementById('run-tests-btn');
    if (runButton) {
        runButton.addEventListener('click', runTests);
    }
    runTests();
});