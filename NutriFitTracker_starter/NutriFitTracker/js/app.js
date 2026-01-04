// Basic NutriFit Tracker prototype logic
// Stores meals and workouts in memory, persists to localStorage, and updates a simple dashboard.

const STORAGE_KEYS = {
    meals: "nutrifit_meals_v1",
    workouts: "nutrifit_workouts_v1"
};

const state = {
    meals: [],
    workouts: [],
    editingMealId: null,
    editingWorkoutId: null
};


function safeJsonParse(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function loadStateFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;

    const storedMeals = safeJsonParse(localStorage.getItem(STORAGE_KEYS.meals), []);
    const storedWorkouts = safeJsonParse(localStorage.getItem(STORAGE_KEYS.workouts), []);

    // Basic shape validation so bad data doesn't break the app
    state.meals = Array.isArray(storedMeals) ? storedMeals : [];
    state.workouts = Array.isArray(storedWorkouts) ? storedWorkouts : [];
}

function saveMealsToStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(state.meals));
}

function saveWorkoutsToStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(state.workouts));
}

//optional to reset all storage 
function clearAllStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.removeItem(STORAGE_KEYS.meals);
    localStorage.removeItem(STORAGE_KEYS.workouts);
}

//Meals
function newId() {
    // Date.now alone can collide if two entries happen in the same ms.
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function addMeal(name, calories, category) {
    const meal = {
        id: newId(),
        name,
        calories: Math.max(0, Number(calories) || 0),
        category
    };
    state.meals.push(meal);
    saveMealsToStorage();
    return meal;
}

function updateMeal(id, name, calories, category) {
    const meal = state.meals.find(m => m.id === id);
    if (meal) {
        meal.name = name;
        meal.calories = Math.max(0, Number(calories) || 0);
        meal.category = category;
        saveMealsToStorage();
        return meal;
    }
    return null;
}

function deleteMeal(id) {
    state.meals = state.meals.filter(m => m.id !== id);
    saveMealsToStorage();
}

//Workouts
function addWorkout(type, duration, calories) {
    const workout = {
        id: newId(),
        type,
        duration: Math.max(0, Number(duration) || 0),
        calories: Math.max(0, Number(calories) || 0)
    };
    state.workouts.push(workout);
    saveWorkoutsToStorage();
    return workout;
}

function updateWorkout(id, type, duration, calories) {
    const workout = state.workouts.find(w => w.id === id);
    if (workout) {
        workout.type = type;
        workout.duration = Math.max(0, Number(duration) || 0);
        workout.calories = Math.max(0, Number(calories) || 0);
        saveWorkoutsToStorage();
        return workout;
    }
    return null;
}

function deleteWorkout(id) {
    state.workouts = state.workouts.filter(w => w.id !== id);
    saveWorkoutsToStorage();
}

//Dashboard
function calculateTotals() {
    const totalMealCalories = state.meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
    const totalWorkoutCalories = state.workouts.reduce((sum, w) => sum + (Number(w.calories) || 0), 0);
    return {
        totalMealCalories,
        totalWorkoutCalories,
        netCalories: totalMealCalories - totalWorkoutCalories
    };
}

function editMeal(id) {
    const meal = state.meals.find(m => m.id === id);
    if (!meal) return;

    state.editingMealId = id;

    document.getElementById("meal-name").value = meal.name;
    document.getElementById("meal-calories").value = meal.calories;
    document.getElementById("meal-category").value = meal.category;

    const submitButton = document.querySelector("#meal-form button[type='submit']");
    submitButton.textContent = "Update Meal";

    // Show cancel button if it exists
    const cancelBtn = document.getElementById("meal-cancel");
    if (cancelBtn) cancelBtn.hidden = false;

    document.getElementById("meal-name").focus();
}

function cancelEdit() {
    state.editingMealId = null;
    document.getElementById("meal-form").reset();

    const submitButton = document.querySelector("#meal-form button[type='submit']");
    submitButton.textContent = "Add Meal";

    const cancelBtn = document.getElementById("meal-cancel");
    if (cancelBtn) cancelBtn.hidden = true;
}

function editWorkout(id) {
    const workout = state.workouts.find(w => w.id === id);
    if (!workout) return;

    state.editingWorkoutId = id;

    document.getElementById("workout-type").value = workout.type;
    document.getElementById("workout-duration").value = workout.duration;
    document.getElementById("workout-calories").value = workout.calories;

    const submitButton = document.querySelector("#workout-form button[type='submit']");
    submitButton.textContent = "Update Workout";

    const cancelBtn = document.getElementById("workout-cancel");
    if (cancelBtn) cancelBtn.hidden = false;

    document.getElementById("workout-type").focus();
}

function cancelWorkoutEdit() {
    state.editingWorkoutId = null;
    document.getElementById("workout-form").reset();

    const submitButton = document.querySelector("#workout-form button[type='submit']");
    submitButton.textContent = "Add Workout";

    const cancelBtn = document.getElementById("workout-cancel");
    if (cancelBtn) cancelBtn.hidden = true;
}

function renderLists() {
    const mealList = document.getElementById("meal-list");
    const workoutList = document.getElementById("workout-list");

    mealList.innerHTML = "";
    workoutList.innerHTML = "";

    state.meals.forEach(meal => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.textContent = `${meal.name} (${meal.category}) - ${meal.calories} cal`;
        li.appendChild(text);

        const btnWrap = document.createElement("span");

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.classList.add("btn-edit");
        editBtn.addEventListener("click", () => editMeal(meal.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("btn-delete");
        deleteBtn.addEventListener("click", () => {
            deleteMeal(meal.id);
            updateDashboard();
        });

        btnWrap.appendChild(editBtn);
        btnWrap.appendChild(deleteBtn);
        li.appendChild(btnWrap);

        mealList.appendChild(li);
    });

    state.workouts.forEach(workout => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.textContent = `${workout.type} - ${workout.duration} min - ${workout.calories} cal`;
        li.appendChild(text);

        const btnWrap = document.createElement("span");

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.classList.add("btn-edit");
        editBtn.addEventListener("click", () => editWorkout(workout.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("btn-delete");
        deleteBtn.addEventListener("click", () => {
            deleteWorkout(workout.id);
            updateDashboard();
        });

        btnWrap.appendChild(editBtn);
        btnWrap.appendChild(deleteBtn);
        li.appendChild(btnWrap);

        workoutList.appendChild(li);
    });
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
        if (!category) {
            alert("Please choose a meal category.");
            return;
        }

        if (state.editingMealId) {
            updateMeal(state.editingMealId, name, calories, category);
            cancelEdit();
        } else {
            addMeal(name, calories, category);
            mealForm.reset();
        }

        updateDashboard();
    });

    const mealCancel = document.getElementById("meal-cancel");
    if (mealCancel) {
        mealCancel.addEventListener("click", (event) => {
            event.preventDefault();
            cancelEdit();
        });
        mealCancel.hidden = true;
    }

    workoutForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const type = document.getElementById("workout-type").value.trim();
        const duration = document.getElementById("workout-duration").value;
        const calories = document.getElementById("workout-calories").value;

        if (!type) {
            alert("Please enter a workout type.");
            return;
        }

        if (state.editingWorkoutId) {
            updateWorkout(state.editingWorkoutId, type, duration, calories);
            cancelWorkoutEdit();
        } else {
            addWorkout(type, duration, calories);
            workoutForm.reset();
        }

        updateDashboard();
    });

    const workoutCancel = document.getElementById("workout-cancel");
    if (workoutCancel) {
        workoutCancel.addEventListener("click", (event) => {
            event.preventDefault();
            cancelWorkoutEdit();
        });
        workoutCancel.hidden = true;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();
    wireUpForms();
    updateDashboard();
});

// Export functions for tests
if (typeof window !== "undefined") {
    window.__NutriFit = {
        state,
        addMeal,
        updateMeal,
        deleteMeal,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        calculateTotals,
        // expose storage helpers so tests can reset cleanly if needed
        __storage: { STORAGE_KEYS, loadStateFromStorage, saveMealsToStorage, saveWorkoutsToStorage, clearAllStorage }
    };
}
