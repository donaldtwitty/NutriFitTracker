// Simple test script for NutriFit Tracker
// This is not a full unit test framework, but it demonstrates
// basic test statements for the course rubric.

function assertEqual(actual, expected, message) {
    const passed = actual === expected;
    console.log((passed ? "✅ PASS: " : "❌ FAIL: ") + message);
    if (!passed) {
        console.log("   Expected:", expected, "but got:", actual);
    }
    return passed;
}

function runNutriFitTests() {
    console.log("Running NutriFit Tracker tests...");

    // Reset state
    window.__NutriFit.state.meals = [];
    window.__NutriFit.state.workouts = [];

    // Test 1: adding a meal increases meal count
    const beforeMeals = window.__NutriFit.state.meals.length;
    window.__NutriFit.addMeal("Test Meal", 500, "lunch");
    const afterMeals = window.__NutriFit.state.meals.length;
    assertEqual(afterMeals, beforeMeals + 1, "Adding a meal should increase meal count by 1");

    // Test 2: totals calculation
    window.__NutriFit.state.workouts = [];
    window.__NutriFit.addWorkout("Run", 30, 300);
    const totals = window.__NutriFit.calculateTotals();
    assertEqual(totals.totalMealCalories, 500, "Total meal calories should equal sum of meal calories");
    assertEqual(totals.totalWorkoutCalories, 300, "Total workout calories should equal sum of workout calories");
    assertEqual(totals.netCalories, 200, "Net calories should be meal minus workout calories");

    console.log("NutriFit tests completed.");
}

// Auto-run tests when tests.html is opened
if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
        if (window.location.pathname.endsWith("tests.html")) {
            runNutriFitTests();
        }
    });
}
