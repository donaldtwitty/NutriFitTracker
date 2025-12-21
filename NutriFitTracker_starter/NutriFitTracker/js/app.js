// Basic NutriFit Tracker prototype logic
// Stores meals and workouts in memory and updates a simple dashboard.

const state = {
    meals: [],
    workouts: [],
    editingMealId: null,
    editingWorkoutId: null
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

function updateMeal(id, name, calories, category){
    const meal= state.meals.find(m => m.id === id);
    if (meal) {
        meal.name = name;
        meal.calories = Number(calories) || 0;
        meal.category = category;
        return meal;
    }
    return null;
}

function deleteMeal(id) {
    state.meals = state.meals.filter(m => m.id !== id);
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

function updateWorkout(id, type, duration, calories){
    const workout= state.workouts.find(w => w.id === id);
    if (workout) {
        workout.type = type;
        workout.duration = Number(duration) || 0;
        workout.calories = Number(calories) || 0;
        return workout;
    }
    return null;
}

function deleteWorkout(id) {
    state.workouts = state.workouts.filter(w => w.id !== id);
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

function editMeal(id) {
    const meal = state.meals.find(m => m.id === id);
    if (!meal) return;

    state.editingMealId = id;

    document.getElementById("meal-name").value = meal.name;
    document.getElementById("meal-calories").value = meal.calories;
    document.getElementById("meal-category").value = meal.category;

    const submitButton = document.querySelector("#meal-form button[type='submit']");
    submitButton.textContent = "Update Meal";

    document.getElementById("meal-name").focus();
}

function cancelEdit(){
    state.editingMealId = null;
    document.getElementById("meal-form").reset();
    const submitButton = document.querySelector("#meal-form button[type='submit']");
    submitButton.textContent = "Add Meal";
}

function editWorkout(id){
    const workout = state.workouts.find(w => w.id === id);
    if (!workout) return;

    state.editingWorkoutId = id;

    document.getElementById("workout-type").value = workout.type;
    document.getElementById("workout-duration").value = workout.duration;
    document.getElementById("workout-calories").value = workout.calories;

    const submitButton = document.querySelector("#workout-form button[type='submit']");
    submitButton.textContent = "Update Workout";

    document.getElementById("workout-type").focus();
}

function cancelWorkoutEdit(){
    state.editingWorkoutId = null;
    document.getElementById("workout-form").reset();
    const submitButton = document.querySelector("#workout-form button[type='submit']");
    submitButton.textContent = "Add Workout";
}

function renderLists() {
    const mealList = document.getElementById("meal-list");
    const workoutList = document.getElementById("workout-list");

    mealList.innerHTML = "";
    workoutList.innerHTML = "";

    state.meals.forEach(meal => {
        const li = document.createElement("li");
        li.textContent = `${meal.name} (${meal.category}) - ${meal.calories} cal`;

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
            editMeal(meal.id);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
            deleteMeal(meal.id);
            updateDashboard();
        });

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        mealList.appendChild(li);
    });

    state.workouts.forEach(workout => {
        const li = document.createElement("li");
        li.textContent = `${workout.type} - ${workout.duration} min - ${workout.calories} cal`;

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () =>{
            editWorkout(workout.id);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
            deleteWorkout(workout.id);
            updateDashboard();
        });

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
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

        if (state.editingMealId){
            updateMeal(state.editingMealId, name, calories, category);
            cancelEdit();
        }
        else {
            addMeal(name, calories, category);
            mealForm.reset();
        }

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

        if (state.editingWorkoutId){
            updateWorkout(state.editingWorkoutId, type, duration, calories);
            cancelWorkoutEdit();
        }
        else{
            addWorkout(type, duration, calories);
            workoutForm.reset();
        }

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
