// Basic NutriFit Tracker prototype logic
// Stores meals and workouts in memory and updates a simple dashboard.

const state = {
    meals: [],
    workouts: []
};

function addMeal(name, calories, category) {
    const meal = {
        id: Date.now().toString(),
        name,
        calories: Number(calories) || 0,
        category
    };
    state.meals.push(meal);
    return meal;
}

function addWorkout(type, duration, calories) {
    const workout = {
        id: Date.now().toString(),
        type,
        duration: Number(duration) || 0,
        calories: Number(calories) || 0
    };
    state.workouts.push(workout);
    return workout;
}

function calculateTotals() {
    const totalMealCalories = state.meals.reduce((sum, m) => sum + m.calories, 0);
    const totalWorkoutCalories = state.workouts.reduce((sum, w) => sum + w.calories, 0);
    return {
        totalMealCalories,
        totalWorkoutCalories,
        netCalories: totalMealCalories - totalWorkoutCalories
    };
}

function renderLists() {
    const mealList = document.getElementById("meal-list");
    const workoutList = document.getElementById("workout-list");

    mealList.innerHTML = "";
    workoutList.innerHTML = "";

    state.meals.forEach(meal => {
        const li = document.createElement("li");
        li.textContent = `${meal.name} (${meal.category}) - ${meal.calories} cal`;
        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.addEventListener("click", () => {
            deleteItem("meal", meal.id);
        });
        li.appendChild(btn);
        mealList.appendChild(li);
    });

    state.workouts.forEach(workout => {
        const li = document.createElement("li");
        li.textContent = `${workout.type} - ${workout.duration} min - ${workout.calories} cal`;
        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.addEventListener("click", () => {
            deleteItem("workout", workout.id);
        });
        li.appendChild(btn);
        workoutList.appendChild(li);
    });
}

function deleteItem(type, id) {
    if (type === "meal") {
        state.meals = state.meals.filter(m => m.id !== id);
    } else {
        state.workouts = state.workouts.filter(w => w.id !== id);
    }
    updateDashboard();
}

function updateDashboard() {
    renderLists();
    const totals = calculateTotals();
    document.getElementById("total-meal-calories").textContent = totals.totalMealCalories;
    document.getElementById("total-workout-calories").textContent = totals.totalWorkoutCalories;
    document.getElementById("net-calories").textContent = totals.netCalories;
}

function wireUpForms() {
    const mealForm = document.getElementById("meal-form");
    const workoutForm = document.getElementById("workout-form");

    mealForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document.getElementById("meal-name").value.trim();
        const calories = document.getElementById("meal-calories").value;
        const category = document.getElementById("meal-category").value;

        if (!name) {
            alert("Please enter a meal name.");
            return;
        }
        addMeal(name, calories, category);
        mealForm.reset();
        updateDashboard();
    });

    workoutForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const type = document.getElementById("workout-type").value.trim();
        const duration = document.getElementById("workout-duration").value;
        const calories = document.getElementById("workout-calories").value;

        if (!type) {
            alert("Please enter a workout type.");
            return;
        }
        addWorkout(type, duration, calories);
        workoutForm.reset();
        updateDashboard();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    wireUpForms();
    updateDashboard();
});

// Export functions for tests (if running in a module system)
if (typeof window !== "undefined") {
    window.__NutriFit = { state, addMeal, addWorkout, calculateTotals };
}
