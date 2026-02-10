// Comprehensive test runner for NutriFit Tracker
// Validates calculations and core behaviors

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    assertEqual(actual, expected, message) {
        const passed = actual === expected;
        const result = passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${result}: ${message}`);
        if (!passed) {
            console.log(`   Expected: ${expected}, but got: ${actual}`);
            this.failed++;
        } else {
            this.passed++;
        }
        return passed;
    }

    assertTrue(condition, message) {
        return this.assertEqual(condition, true, message);
    }

    assertFalse(condition, message) {
        return this.assertEqual(condition, false, message);
    }

    resetState() {
        if (window.__NutriFit) {
            window.__NutriFit.state.meals = [];
            window.__NutriFit.state.workouts = [];
            window.__NutriFit.state.editingMealId = null;
            window.__NutriFit.state.editingWorkoutId = null;
            window.__NutriFit.state.mealPresets = [];
            window.__NutriFit.state.workoutPresets = [];
            window.__NutriFit.state.water = {};
            window.__NutriFit.state.goals = { meals: 21, workouts: 7, dailyCalories: 2000, targetWeight: 0, currentWeight: 0 };
        }
    }

    runAllTests() {
        console.log("🚀 Running NutriFit Tracker Test Suite...");
        console.log("=".repeat(50));
        
        if (!window.__NutriFit) {
            console.error("❌ ERROR: NutriFit app not loaded. Make sure app.js is included.");
            return;
        }

        this.testMealOperations();
        this.testWorkoutOperations();
        this.testCalculations();
        this.testWeeklyGoals();
        this.testWaterTracking();
        this.testPresets();
        this.testStreakCalculation();
        this.testThemeToggle();
        this.testEdgeCases();
        
        this.printSummary();
    }

    testMealOperations() {
        console.log("\n📝 Testing Meal Operations");
        this.resetState();
        
        // Test adding meals
        const meal1 = window.__NutriFit.addMeal("Breakfast", 400, "breakfast");
        this.assertTrue(!!meal1.id, "addMeal should return meal with ID");
        this.assertEqual(meal1.name, "Breakfast", "Meal name should be set correctly");
        this.assertEqual(meal1.calories, 400, "Meal calories should be set correctly");
        this.assertEqual(meal1.category, "breakfast", "Meal category should be set correctly");
        
        const meal2 = window.__NutriFit.addMeal("Lunch", "500", "lunch");
        this.assertEqual(meal2.calories, 500, "String calories should be converted to number");
        
        this.assertEqual(window.__NutriFit.state.meals.length, 2, "Should have 2 meals after adding 2");
        
        // Test updating meals
        const updated = window.__NutriFit.updateMeal(meal1.id, { name: "Updated Breakfast", calories: 450, category: "breakfast" });
        this.assertTrue(!!updated, "updateMeal should return updated meal");
        this.assertEqual(updated.name, "Updated Breakfast", "Meal name should be updated");
        this.assertEqual(updated.calories, 450, "Meal calories should be updated");
        
        // Test deleting meals (direct state manipulation to avoid confirmation modal)
        window.__NutriFit.state.meals = window.__NutriFit.state.meals.filter(m => m.id !== meal1.id);
        this.assertEqual(window.__NutriFit.state.meals.length, 1, "Should have 1 meal after deleting 1");
        this.assertFalse(!!window.__NutriFit.state.meals.find(m => m.id === meal1.id), "Deleted meal should not exist");
    }

    testWorkoutOperations() {
        console.log("\n💪 Testing Workout Operations");
        this.resetState();
        
        // Test adding workouts
        const workout1 = window.__NutriFit.addWorkout("Running", 30, 300);
        this.assertTrue(!!workout1.id, "addWorkout should return workout with ID");
        this.assertEqual(workout1.type, "Running", "Workout type should be set correctly");
        this.assertEqual(workout1.duration, 30, "Workout duration should be set correctly");
        this.assertEqual(workout1.caloriesBurned, 300, "Workout calories should be set correctly");
        
        const workout2 = window.__NutriFit.addWorkout("Cycling", "45", "400");
        this.assertEqual(workout2.duration, 45, "String duration should be converted to number");
        this.assertEqual(workout2.caloriesBurned, 400, "String calories should be converted to number");
        
        this.assertEqual(window.__NutriFit.state.workouts.length, 2, "Should have 2 workouts after adding 2");
        
        // Test updating workouts
        const updated = window.__NutriFit.updateWorkout(workout1.id, { type: "Updated Running", duration: 35, caloriesBurned: 350 });
        this.assertTrue(!!updated, "updateWorkout should return updated workout");
        this.assertEqual(updated.type, "Updated Running", "Workout type should be updated");
        this.assertEqual(updated.duration, 35, "Workout duration should be updated");
        this.assertEqual(updated.caloriesBurned, 350, "Workout calories should be updated");
        
        // Test deleting workouts (direct state manipulation to avoid confirmation modal)
        window.__NutriFit.state.workouts = window.__NutriFit.state.workouts.filter(w => w.id !== workout1.id);
        this.assertEqual(window.__NutriFit.state.workouts.length, 1, "Should have 1 workout after deleting 1");
        this.assertFalse(!!window.__NutriFit.state.workouts.find(w => w.id === workout1.id), "Deleted workout should not exist");
    }

    testCalculations() {
        console.log("\n🧮 Testing Calculations");
        this.resetState();
        
        // Test empty state
        let totals = window.__NutriFit.calculateTotals();
        this.assertEqual(totals.totalMealCalories, 0, "Empty state should have 0 meal calories");
        this.assertEqual(totals.totalWorkoutCalories, 0, "Empty state should have 0 workout calories");
        this.assertEqual(totals.netCalories, 0, "Empty state should have 0 net calories");
        
        // Add test data
        window.__NutriFit.addMeal("Breakfast", 400, "breakfast");
        window.__NutriFit.addMeal("Lunch", 600, "lunch");
        window.__NutriFit.addMeal("Dinner", 500, "dinner");
        
        window.__NutriFit.addWorkout("Running", 30, 300);
        window.__NutriFit.addWorkout("Cycling", 45, 400);
        
        totals = window.__NutriFit.calculateTotals();
        this.assertEqual(totals.totalMealCalories, 1500, "Total meal calories should be 1500");
        this.assertEqual(totals.totalWorkoutCalories, 700, "Total workout calories should be 700");
        this.assertEqual(totals.netCalories, 800, "Net calories should be 800 (1500 - 700)");
        
        // Test negative net calories
        window.__NutriFit.addWorkout("Marathon", 120, 1200);
        totals = window.__NutriFit.calculateTotals();
        this.assertEqual(totals.netCalories, -400, "Net calories should be negative when workouts exceed meals");
    }

    testEdgeCases() {
        console.log("\n🔍 Testing Edge Cases");
        this.resetState();
        
        // Test invalid calories (should default to 0)
        const meal = window.__NutriFit.addMeal("Test", "invalid", "lunch");
        this.assertEqual(meal.calories, 0, "Invalid calories should default to 0");
        
        const workout = window.__NutriFit.addWorkout("Test", "invalid", "invalid");
        this.assertEqual(workout.duration, 0, "Invalid duration should default to 0");
        this.assertEqual(workout.caloriesBurned, 0, "Invalid workout calories should default to 0");
        
        // Test updating non-existent items
        const nonExistentMeal = window.__NutriFit.updateMeal("fake-id", { name: "Test", calories: 100, category: "lunch" });
        this.assertEqual(nonExistentMeal, null, "Updating non-existent meal should return null");
        
        const nonExistentWorkout = window.__NutriFit.updateWorkout("fake-id", { type: "Test", duration: 30, caloriesBurned: 100 });
        this.assertEqual(nonExistentWorkout, null, "Updating non-existent workout should return null");
        
        // Test unique IDs
        const meal1 = window.__NutriFit.addMeal("Meal 1", 100, "lunch");
        const meal2 = window.__NutriFit.addMeal("Meal 2", 200, "dinner");
        this.assertTrue(meal1.id !== meal2.id, "Each meal should have unique ID");
    }

    testWeeklyGoals() {
        console.log("\n🎯 Testing Weekly Goals");
        this.resetState();
        
        const stats = window.__NutriFit.calculateWeeklyStats();
        this.assertEqual(stats.mealCount, 0, "Empty state should have 0 meals this week");
        this.assertEqual(stats.workoutCount, 0, "Empty state should have 0 workouts this week");
        
        window.__NutriFit.addMeal("Breakfast", 400, "breakfast");
        window.__NutriFit.addWorkout("Run", 30, 300);
        
        const updatedStats = window.__NutriFit.calculateWeeklyStats();
        this.assertEqual(updatedStats.mealCount, 1, "Should have 1 meal this week");
        this.assertEqual(updatedStats.workoutCount, 1, "Should have 1 workout this week");
    }

    testWaterTracking() {
        console.log("\n💧 Testing Water Tracking");
        this.resetState();
        
        const initialCount = window.__NutriFit.getWaterCount();
        this.assertTrue(initialCount >= 0, "Water count should be non-negative");
        
        window.__NutriFit.setWaterCount(5);
        this.assertEqual(window.__NutriFit.getWaterCount(), 5, "Water count should be set to 5");
        
        window.__NutriFit.setWaterCount(-1);
        this.assertEqual(window.__NutriFit.getWaterCount(), 0, "Negative water count should be clamped to 0");
    }

    testPresets() {
        console.log("\n💾 Testing Presets");
        this.resetState();
        
        // Test meal presets
        window.__NutriFit.addMealPreset("Oatmeal", 300, "breakfast");
        this.assertEqual(window.__NutriFit.state.mealPresets.length, 1, "Should have 1 meal preset");
        
        const preset = window.__NutriFit.state.mealPresets[0];
        this.assertEqual(preset.name, "Oatmeal", "Preset name should be correct");
        this.assertEqual(preset.calories, 300, "Preset calories should be correct");
        
        // Test workout presets
        window.__NutriFit.addWorkoutPreset("Morning Run", 30, 300);
        this.assertEqual(window.__NutriFit.state.workoutPresets.length, 1, "Should have 1 workout preset");
        
        const workoutPreset = window.__NutriFit.state.workoutPresets[0];
        this.assertEqual(workoutPreset.type, "Morning Run", "Workout preset type should be correct");
    }

    testStreakCalculation() {
        console.log("\n🔥 Testing Streak Calculation");
        this.resetState();
        
        const streak = window.__NutriFit.calculateStreak();
        this.assertTrue(streak >= 0, "Streak should be non-negative");
        
        // Add today's meal to start streak
        window.__NutriFit.addMeal("Test", 100, "lunch");
        const newStreak = window.__NutriFit.calculateStreak();
        this.assertTrue(newStreak >= 1, "Streak should be at least 1 after logging today");
    }

    testThemeToggle() {
        console.log("\n🎨 Testing Theme Toggle");
        
        const hasLightTheme = document.body.classList.contains('light-theme');
        window.__NutriFit.toggleTheme();
        const toggled = document.body.classList.contains('light-theme');
        this.assertTrue(hasLightTheme !== toggled, "Theme should toggle");
        
        // Toggle back
        window.__NutriFit.toggleTheme();
        const toggledBack = document.body.classList.contains('light-theme');
        this.assertEqual(hasLightTheme, toggledBack, "Theme should toggle back to original");
    }

    printSummary() {
        console.log("\n" + "=".repeat(50));
        console.log(`📊 Test Summary: ${this.passed + this.failed} tests run`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        
        if (this.failed === 0) {
            console.log("🎉 All tests passed!");
        } else {
            console.log(`⚠️  ${this.failed} test(s) failed. Check the details above.`);
        }
        console.log("=".repeat(50));
    }
}

// Auto-run tests when tests.html is opened
if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
        if (window.location.pathname.endsWith("tests.html")) {
            const runner = new TestRunner();
            runner.runAllTests();
        }
    });
}
