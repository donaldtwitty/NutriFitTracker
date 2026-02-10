// NutriFit Tracker
// - Meals + workouts stored in localStorage
// - Dashboard totals
// - Recent workout list (last 5)
// - Calendar month view (click past/today to view + add + edit for that date)
// - Future days are locked (cannot add in advance)

const STORAGE_KEYS = {
  meals: "nutrifit_meals_v1",
  workouts: "nutrifit_workouts_v1",
  goals: "nutrifit_goals_v1",
  water: "nutrifit_water_v1",
  presets: "nutrifit_presets_v1",
  workoutPresets: "nutrifit_workout_presets_v1",
  theme: "nutrifit_theme_v1",
};

const state = {
  meals: [],
  workouts: [],
  editingMealId: null,
  editingWorkoutId: null,

  // calendar / modal
  calendarMonth: startOfMonth(new Date()),
  selectedDayISO: null,            // "YYYY-MM-DD"
  dayEditingMealId: null,
  dayEditingWorkoutId: null,
  
  // filter
  filterDateISO: null,
  
  // goals
  goals: { meals: 21, workouts: 7, dailyCalories: 2000, targetWeight: 0, currentWeight: 0 },
  
  // water: { "YYYY-MM-DD": count }
  water: {},
  
  // presets
  mealPresets: [],
  editingPresetId: null,
  
  // workout presets
  workoutPresets: [],
  editingWorkoutPresetId: null,
};

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// ---------- date helpers ----------
function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODateLocal(d) {
  // returns YYYY-MM-DD using local date parts
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODateLocal(iso) {
  // iso: YYYY-MM-DD -> Date at local midnight
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function todayISO() {
  return toISODateLocal(new Date());
}

function isFutureISO(isoDay) {
  // Lexicographic compare works for YYYY-MM-DD
  return isoDay > todayISO();
}

function sameISODate(ts, isoDay) {
  return toISODateLocal(new Date(ts)) === isoDay;
}

// ---------- storage ----------
function loadStateFromStorage() {
  const meals = safeJsonParse(localStorage.getItem(STORAGE_KEYS.meals), []);
  const workouts = safeJsonParse(localStorage.getItem(STORAGE_KEYS.workouts), []);
  const goals = safeJsonParse(localStorage.getItem(STORAGE_KEYS.goals), { meals: 21, workouts: 7, dailyCalories: 2000, targetWeight: 0, currentWeight: 0 });
  const water = safeJsonParse(localStorage.getItem(STORAGE_KEYS.water), {});
  const presets = safeJsonParse(localStorage.getItem(STORAGE_KEYS.presets), []);
  const workoutPresets = safeJsonParse(localStorage.getItem(STORAGE_KEYS.workoutPresets), []);

  state.meals = (Array.isArray(meals) ? meals : []).map(normalizeMeal);
  state.workouts = (Array.isArray(workouts) ? workouts : []).map(normalizeWorkout);
  state.goals = { meals: 21, workouts: 7, dailyCalories: 2000, targetWeight: 0, currentWeight: 0, ...goals };
  state.water = water;
  state.mealPresets = Array.isArray(presets) ? presets : [];
  state.workoutPresets = Array.isArray(workoutPresets) ? workoutPresets : [];
}

function saveMealsToStorage() {
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(state.meals));
}

function saveWorkoutsToStorage() {
  localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(state.workouts));
}

function saveGoalsToStorage() {
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(state.goals));
}

function saveWaterToStorage() {
  localStorage.setItem(STORAGE_KEYS.water, JSON.stringify(state.water));
}

function savePresetsToStorage() {
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(state.mealPresets));
}

function saveWorkoutPresetsToStorage() {
  localStorage.setItem(STORAGE_KEYS.workoutPresets, JSON.stringify(state.workoutPresets));
}

function clearAllStorage() {
  localStorage.removeItem(STORAGE_KEYS.meals);
  localStorage.removeItem(STORAGE_KEYS.workouts);
}

// ---------- normalization ----------
function normalizeMeal(m) {
  const createdAt = m?.createdAt ? Number(m.createdAt) : Date.now();
  return {
    id: m?.id ?? newId(),
    name: String(m?.name ?? "").trim(),
    calories: Math.max(0, clampNumber(m?.calories)),
    category: String(m?.category ?? "").trim(),
    createdAt,
  };
}

function normalizeWorkout(w) {
  const createdAt = w?.createdAt ? Number(w.createdAt) : Date.now();
  return {
    id: w?.id ?? newId(),
    type: String(w?.type ?? "").trim(),
    duration: Math.max(0, clampNumber(w?.duration)),
    caloriesBurned: Math.max(0, clampNumber(w?.caloriesBurned)),
    createdAt,
  };
}

// ---------- CRUD ----------
function addMeal(name, calories, category, createdAt = Date.now()) {
  const meal = normalizeMeal({ id: newId(), name, calories, category, createdAt });
  state.meals.push(meal);
  saveMealsToStorage();
  renderAll();
  return meal;
}

function updateMeal(id, updates) {
  const idx = state.meals.findIndex(m => m.id === id);
  if (idx === -1) return null;
  state.meals[idx] = normalizeMeal({ ...state.meals[idx], ...updates });
  saveMealsToStorage();
  renderAll();
  return state.meals[idx];
}

function deleteMeal(id) {
  const meal = state.meals.find(m => m.id === id);
    if (!meal) return;

    confirmationModal.show(
      `Are you sure you want to delete the meal "${meal.name || 'Unnamed meal'}" ?`,
      () => {
        state.meals = state.meals.filter(m => m.id !== id);
        saveMealsToStorage();
        renderAll();
      }
    );
}

function addWorkout(type, duration, caloriesBurned, createdAt = Date.now()) {
  const workout = normalizeWorkout({ id: newId(), type, duration, caloriesBurned, createdAt });
  state.workouts.push(workout);
  saveWorkoutsToStorage();
  renderAll();
  return workout;
}

function updateWorkout(id, updates) {
  const idx = state.workouts.findIndex(w => w.id === id);
  if (idx === -1) return null;
  state.workouts[idx] = normalizeWorkout({ ...state.workouts[idx], ...updates });
  saveWorkoutsToStorage();
  renderAll();
  return state.workouts[idx];
}

function deleteWorkout(id) {
  const workout = state.workouts.find(w => w.id === id);
    if (!workout) return;

    confirmationModal.show(
  `Are you sure you want to delete the workout "${workout.type || 'Workout'}" ?`,
      () => {
        state.workouts = state.workouts.filter(w => w.id !== id);
        saveWorkoutsToStorage();
        renderAll();
      }
    );
}

// ---------- totals ----------
function calculateTotals() {
  const totalMeals = state.meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const totalWorkouts = state.workouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);
  return {
    totalMealCalories: Math.round(totalMeals),
    totalWorkoutCalories: Math.round(totalWorkouts),
    netCalories: Math.round(totalMeals - totalWorkouts),
  };
}

// ---------- DOM helpers ----------
function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function makeButton(label, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

// ---------- swipe to delete ----------
function enableSwipeToDelete(element, onDelete) {
  let startX = 0;
  let currentX = 0;
  let isSwiping = false;
  
  element.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    currentX = startX;
    isSwiping = true;
    element.classList.add("swiping");
  }, { passive: true });
  
  element.addEventListener("touchmove", (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    if (diff < -50) {
      element.classList.add("swipe-delete");
    } else {
      element.classList.remove("swipe-delete");
    }
    
    if (diff < 0) {
      element.style.transform = `translateX(${Math.max(diff, -100)}px)`;
    }
  }, { passive: true });
  
  element.addEventListener("touchend", () => {
    if (!isSwiping) return;
    isSwiping = false;
    element.classList.remove("swiping");
    
    const diff = currentX - startX;
    if (diff < -80) {
      element.style.transform = "translateX(-100px)";
      setTimeout(() => {
        onDelete();
      }, 200);
    } else {
      element.style.transform = "";
      element.classList.remove("swipe-delete");
    }
  });
}

// ---------- theme ----------
function loadTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    $("theme-icon").textContent = '☀️';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem(STORAGE_KEYS.theme, isLight ? 'light' : 'dark');
  $("theme-icon").textContent = isLight ? '☀️' : '🌙';
}
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
}

function isInCurrentWeek(ts) {
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return ts >= weekStart.getTime() && ts < weekEnd.getTime();
}

function calculateWeeklyStats() {
  const weekMeals = state.meals.filter(m => isInCurrentWeek(m.createdAt));
  const weekWorkouts = state.workouts.filter(w => isInCurrentWeek(w.createdAt));
  
  const mealCals = weekMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const workoutCals = weekWorkouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);
  
  return {
    mealCount: weekMeals.length,
    workoutCount: weekWorkouts.length,
    netCalories: Math.round(mealCals - workoutCals),
  };
}

function renderWeeklyGoals() {
  const stats = calculateWeeklyStats();
  
  setText("weekly-meals", stats.mealCount);
  setText("weekly-workouts", stats.workoutCount);
  setText("weekly-net", stats.netCalories);
  setText("goal-meals-target", state.goals.meals);
  setText("goal-workouts-target", state.goals.workouts);
  
  const mealBar = $("weekly-meals-bar");
  const workoutBar = $("weekly-workouts-bar");
  
  if (mealBar) mealBar.style.width = `${Math.min(100, (stats.mealCount / state.goals.meals) * 100)}%`;
  if (workoutBar) workoutBar.style.width = `${Math.min(100, (stats.workoutCount / state.goals.workouts) * 100)}%`;
  
  renderWaterTracker();
}

// ---------- water tracker ----------
function getWaterCount() {
  const today = todayISO();
  return state.water[today] || 0;
}

function setWaterCount(count) {
  const today = todayISO();
  state.water[today] = Math.max(0, count);
  saveWaterToStorage();
  renderWaterTracker();
  renderCalendar();
}

function renderWaterTracker() {
  const count = getWaterCount();
  setText("water-count", count);
  
  const container = $("water-glasses");
  if (!container) return;
  
  clearEl(container);
  for (let i = 0; i < 8; i++) {
    const glass = document.createElement("div");
    glass.className = i < count ? "water-glass filled" : "water-glass";
    glass.textContent = "💧";
    container.appendChild(glass);
  }
}

// ---------- meal presets ----------
function addMealPreset(name, calories, category) {
  const preset = { id: newId(), name, calories, category };
  state.mealPresets.push(preset);
  savePresetsToStorage();
  renderMealPresetOptions();
}

function updateMealPreset(id, updates) {
  const idx = state.mealPresets.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.mealPresets[idx] = { ...state.mealPresets[idx], ...updates };
  savePresetsToStorage();
  renderMealPresetOptions();
}

function deleteMealPreset(id) {
  state.mealPresets = state.mealPresets.filter(p => p.id !== id);
  savePresetsToStorage();
  renderMealPresetOptions();
}

function renderMealPresetOptions() {
  const selects = [$("meal-preset"), $("edit-meal-preset"), $("day-meal-preset")];
  selects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    clearEl(select);
    
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Select preset or type custom --";
    select.appendChild(defaultOpt);
    
    state.mealPresets.forEach(preset => {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = `${preset.name} (${preset.calories} cal)`;
      opt.dataset.name = preset.name;
      opt.dataset.calories = preset.calories;
      opt.dataset.category = preset.category;
      select.appendChild(opt);
    });
    
    select.value = currentValue;
  });
}

function applyMealPreset(presetId, nameInput, caloriesInput, categoryInput) {
  const preset = state.mealPresets.find(p => p.id === presetId);
  if (!preset) return;
  nameInput.value = preset.name;
  caloriesInput.value = preset.calories;
  categoryInput.value = preset.category;
}

// ---------- workout presets ----------
function addWorkoutPreset(type, duration, calories) {
  const preset = { id: newId(), type, duration, calories };
  state.workoutPresets.push(preset);
  saveWorkoutPresetsToStorage();
  renderWorkoutPresetOptions();
}

function updateWorkoutPreset(id, updates) {
  const idx = state.workoutPresets.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.workoutPresets[idx] = { ...state.workoutPresets[idx], ...updates };
  saveWorkoutPresetsToStorage();
  renderWorkoutPresetOptions();
}

function deleteWorkoutPreset(id) {
  state.workoutPresets = state.workoutPresets.filter(p => p.id !== id);
  saveWorkoutPresetsToStorage();
  renderWorkoutPresetOptions();
}

function renderWorkoutPresetOptions() {
  const selects = [$("workout-preset"), $("edit-workout-preset"), $("day-workout-preset")];
  selects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    clearEl(select);
    
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Select preset or type custom --";
    select.appendChild(defaultOpt);
    
    state.workoutPresets.forEach(preset => {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = `${preset.type} (${preset.duration}min, ${preset.calories}cal)`;
      opt.dataset.type = preset.type;
      opt.dataset.duration = preset.duration;
      opt.dataset.calories = preset.calories;
      select.appendChild(opt);
    });
    
    select.value = currentValue;
  });
}

function applyWorkoutPreset(presetId, typeInput, durationInput, caloriesInput) {
  const preset = state.workoutPresets.find(p => p.id === presetId);
  if (!preset) return;
  typeInput.value = preset.type;
  durationInput.value = preset.duration;
  caloriesInput.value = preset.calories;
}

// ---------- charts ----------
let trendChart = null;
let categoryChart = null;

function renderCharts() {
  renderTrendChart();
  renderCategoryChart();
}

function renderTrendChart() {
  const canvas = $("trend-chart");
  if (!canvas) return;
  
  const last7Days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(toISODateLocal(d));
  }
  
  const mealData = last7Days.map(iso => {
    return state.meals
      .filter(m => sameISODate(m.createdAt, iso))
      .reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  });
  
  const workoutData = last7Days.map(iso => {
    return state.workouts
      .filter(w => sameISODate(w.createdAt, iso))
      .reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);
  });
  
  const labels = last7Days.map(iso => {
    const d = parseISODateLocal(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  
  if (trendChart) trendChart.destroy();
  
  trendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories Consumed',
          data: mealData,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Calories Burned',
          data: workoutData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#f1f5f9' } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#cbd5e1' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#cbd5e1' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = $("category-chart");
  if (!canvas) return;
  
  const categories = {};
  state.meals.forEach(m => {
    const cat = m.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + (Number(m.calories) || 0);
  });
  
  const labels = Object.keys(categories);
  const data = Object.values(categories);
  
  if (categoryChart) categoryChart.destroy();
  
  if (labels.length === 0) {
    categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['No data'],
        datasets: [{ data: [1], backgroundColor: ['rgba(148, 163, 184, 0.3)'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#f1f5f9' } }
        }
      }
    });
    return;
  }
  
  categoryChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#818cf8',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#f1f5f9' } }
      }
    }
  });
}

// ---------- smart features ----------
function copyYesterdayMeals() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = toISODateLocal(yesterday);
  
  const yesterdayMeals = state.meals.filter(m => sameISODate(m.createdAt, yesterdayISO));
  
  if (yesterdayMeals.length === 0) {
    showSuccessModal("No meals found from yesterday to copy.");
    return;
  }
  
  const today = Date.now();
  yesterdayMeals.forEach(meal => {
    addMeal(meal.name, meal.calories, meal.category, meal.protein, meal.carbs, meal.fat, today);
  });
  
  showSuccessModal(`Copied ${yesterdayMeals.length} meal(s) from yesterday!`);
}

function copyYesterdayWorkouts() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = toISODateLocal(yesterday);
  
  const yesterdayWorkouts = state.workouts.filter(w => sameISODate(w.createdAt, yesterdayISO));
  
  if (yesterdayWorkouts.length === 0) {
    showSuccessModal("No workouts found from yesterday to copy.");
    return;
  }
  
  const today = Date.now();
  yesterdayWorkouts.forEach(workout => {
    addWorkout(workout.type, workout.duration, workout.caloriesBurned, today);
  });
  
  showSuccessModal(`Copied ${yesterdayWorkouts.length} workout(s) from yesterday!`);
}

function calculateStreak() {
  const dates = new Set();
  state.meals.forEach(m => dates.add(toISODateLocal(new Date(m.createdAt))));
  state.workouts.forEach(w => dates.add(toISODateLocal(new Date(w.createdAt))));
  
  const sortedDates = Array.from(dates).sort().reverse();
  const today = todayISO();
  
  if (sortedDates.length === 0 || sortedDates[0] !== today) return 0;
  
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = parseISODateLocal(sortedDates[i]);
    const previous = parseISODateLocal(sortedDates[i - 1]);
    const diffDays = Math.round((previous - current) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function renderStreak() {
  const streak = calculateStreak();
  setText("streak-count", `${streak} day${streak === 1 ? '' : 's'}`);
}

// ---------- achievements ----------
const BADGES = [
  { id: 'first-meal', icon: '🍽️', name: 'First Meal', desc: 'Log your first meal', check: () => state.meals.length >= 1 },
  { id: 'first-workout', icon: '💪', name: 'First Workout', desc: 'Complete your first workout', check: () => state.workouts.length >= 1 },
  { id: 'streak-3', icon: '🔥', name: '3-Day Streak', desc: 'Log for 3 consecutive days', check: () => calculateStreak() >= 3 },
  { id: 'streak-7', icon: '⭐', name: 'Week Warrior', desc: 'Log for 7 consecutive days', check: () => calculateStreak() >= 7 },
  { id: 'streak-30', icon: '🏆', name: 'Month Master', desc: 'Log for 30 consecutive days', check: () => calculateStreak() >= 30 },
  { id: 'meals-50', icon: '🍔', name: 'Meal Tracker', desc: 'Log 50 meals', check: () => state.meals.length >= 50 },
  { id: 'workouts-25', icon: '🏋️', name: 'Fitness Fan', desc: 'Complete 25 workouts', check: () => state.workouts.length >= 25 },
  { id: 'water-goal', icon: '💧', name: 'Hydration Hero', desc: 'Reach 8 glasses in a day', check: () => Object.values(state.water).some(count => count >= 8) },
];

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Take care of your body. It's the only place you have to live.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "The groundwork for all happiness is good health.",
  "A healthy outside starts from the inside.",
  "You don't have to be extreme, just consistent.",
  "Progress, not perfection.",
  "Small steps every day lead to big results.",
  "Your health is an investment, not an expense.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

function renderMotivation() {
  setText("daily-quote", `"${getDailyQuote()}"`);
  
  const grid = $("badges-grid");
  if (!grid) return;
  
  clearEl(grid);
  
  BADGES.forEach(badge => {
    const earned = badge.check();
    const card = document.createElement("div");
    card.className = `badge-card${earned ? ' earned' : ''}`;
    card.title = earned ? 'Earned!' : 'Not yet earned';
    
    const icon = document.createElement("div");
    icon.className = "badge-icon";
    icon.textContent = badge.icon;
    
    const name = document.createElement("div");
    name.className = "badge-name";
    name.textContent = badge.name;
    
    const desc = document.createElement("div");
    desc.className = "badge-desc";
    desc.textContent = badge.desc;
    
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(desc);
    grid.appendChild(card);
  });
}

function shareProgress() {
  const streak = calculateStreak();
  const totals = calculateTotals();
  const stats = calculateWeeklyStats();
  const earnedBadges = BADGES.filter(b => b.check()).length;
  
  const shareText = `NutriFit Tracker Progress\n\nStreak: ${streak} days\nAchievements: ${earnedBadges}/${BADGES.length} unlocked\nMeals logged: ${state.meals.length}\nWorkouts completed: ${state.workouts.length}\nThis week: ${stats.mealCount} meals, ${stats.workoutCount} workouts\n\nKeep crushing your goals!`;
  
  if (navigator.share) {
    navigator.share({
      title: 'My NutriFit Progress',
      text: shareText
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      showSuccessModal("Progress copied to clipboard! Share it with your friends.");
    }).catch(() => {
      showSuccessModal(shareText);
    });
  }
}

// ---------- render: dashboard / lists ----------
function renderDashboard() {
  const t = calculateTotals();
  setText("total-meal-calories", t.totalMealCalories);
  setText("total-workout-calories", t.totalWorkoutCalories);
  setText("net-calories", t.netCalories);
}

function renderMeals() {
  const list = $("meal-list");
  const empty = $("meal-empty");
  if (!list || !empty) return;

  let mealsSorted = [...state.meals].sort((a, b) => b.createdAt - a.createdAt);
  
  if (state.filterDateISO) {
    mealsSorted = mealsSorted.filter(m => sameISODate(m.createdAt, state.filterDateISO));
  }
  
  empty.classList.toggle("hidden", mealsSorted.length > 0);
  empty.textContent = state.filterDateISO ? "No meals for this date." : "No meals yet — add one above.";

  clearEl(list);

  for (const meal of mealsSorted) {
    const li = document.createElement("li");
    li.className = "list-item";

    const main = document.createElement("div");
    main.className = "item-main";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${meal.name || "(Unnamed meal)"} • ${meal.calories} cal`;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    const cat = meal.category ? meal.category : "uncategorized";
    meta.textContent = `${cat} • ${formatDateTime(meal.createdAt)}`;

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = makeButton("Edit", "btn-small btn-edit", () => openEditMeal(meal.id));
    const del = makeButton("Delete", "btn-small btn-delete", () => deleteMeal(meal.id));
    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(main);
    li.appendChild(actions);
    
    enableSwipeToDelete(li, () => deleteMeal(meal.id));
    
    list.appendChild(li);
  }
}

function renderWorkouts() {
  const list = $("workout-list");
  const empty = $("workout-empty");
  if (!list || !empty) return;

  let workoutsSorted = [...state.workouts].sort((a, b) => b.createdAt - a.createdAt);
  
  if (state.filterDateISO) {
    workoutsSorted = workoutsSorted.filter(w => sameISODate(w.createdAt, state.filterDateISO));
  }
  
  const recent = workoutsSorted.slice(0, 5);

  empty.classList.toggle("hidden", recent.length > 0);
  empty.textContent = state.filterDateISO ? "No workouts for this date." : "No workouts yet — add one above.";

  clearEl(list);

  for (const w of recent) {
    const li = document.createElement("li");
    li.className = "list-item";

    const main = document.createElement("div");
    main.className = "item-main";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${w.type || "(Workout)"} • ${w.duration} min • ${w.caloriesBurned} cal`;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = formatDateTime(w.createdAt);

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = makeButton("Edit", "btn-small btn-edit", () => openEditWorkout(w.id));
    const del = makeButton("Delete", "btn-small btn-delete", () => deleteWorkout(w.id));
    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(main);
    li.appendChild(actions);
    
    enableSwipeToDelete(li, () => deleteWorkout(w.id));
    
    list.appendChild(li);
  }
}

// ---------- editing (top forms) ----------
function openEditMeal(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal) return;

  state.editingMealId = id;
  $("edit-meal-name").value = meal.name;
  $("edit-meal-calories").value = meal.calories;
  $("edit-meal-category").value = meal.category || "";

  $("edit-meal-modal").classList.remove("hidden");
  $("edit-meal-name")?.focus();
  validateForm($("edit-meal-form"), $("edit-meal-submit"));
}

function closeEditMeal() {
  const modal = $("edit-meal-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  state.editingMealId = null;
  $("edit-meal-form")?.reset();

}

function openEditWorkout(id) {
  const workout = state.workouts.find(w => w.id === id);
  if (!workout) return;

  state.editingWorkoutId = id;
  $("edit-workout-type").value = workout.type;
  $("edit-workout-duration").value = workout.duration;
  $("edit-workout-calories").value = workout.caloriesBurned;

  $("edit-workout-modal").classList.remove("hidden");
  $("edit-workout-type")?.focus();
  validateForm($("edit-workout-form"), $("edit-workout-submit"));
}

function closeEditWorkout(){
    const modal = $("edit-workout-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    state.editingWorkoutId = null;
    $("edit-workout-form")?.reset();
}

// ---------- goals modal ----------
function openGoalsModal() {
  $("goal-meals").value = state.goals.meals;
  $("goal-workouts").value = state.goals.workouts;
  $("goals-modal").classList.remove("hidden");
  $("goal-meals")?.focus();
  validateForm($("goals-form"), $("goals-submit"));
}

function closeGoalsModal() {
  $("goals-modal").classList.add("hidden");
  $("goals-form")?.reset();
}

// ---------- presets modal ----------
function openPresetsModal() {
  renderPresetsList();
  $("presets-modal").classList.remove("hidden");
}

function closePresetsModal() {
  $("presets-modal").classList.add("hidden");
}

function openEditPresetModal(id) {
  const preset = state.mealPresets.find(p => p.id === id);
  if (!preset) return;
  
  state.editingPresetId = id;
  $("edit-preset-name").value = preset.name;
  $("edit-preset-calories").value = preset.calories;
  $("edit-preset-category").value = preset.category;
  
  $("edit-preset-modal").classList.remove("hidden");
  $("edit-preset-name")?.focus();
  validateForm($("edit-preset-form"), $("edit-preset-submit"));
}

function closeEditPresetModal() {
  $("edit-preset-modal").classList.add("hidden");
  state.editingPresetId = null;
  $("edit-preset-form")?.reset();
}

function openWorkoutPresetsModal() {
  renderWorkoutPresetsList();
  $("workout-presets-modal").classList.remove("hidden");
}

function closeWorkoutPresetsModal() {
  $("workout-presets-modal").classList.add("hidden");
}

function openEditWorkoutPresetModal(id) {
  const preset = state.workoutPresets.find(p => p.id === id);
  if (!preset) return;
  
  state.editingWorkoutPresetId = id;
  $("edit-workout-preset-type").value = preset.type;
  $("edit-workout-preset-duration").value = preset.duration;
  $("edit-workout-preset-calories").value = preset.calories;
  
  $("edit-workout-preset-modal").classList.remove("hidden");
  $("edit-workout-preset-type")?.focus();
  validateForm($("edit-workout-preset-form"), $("edit-workout-preset-submit"));
}

function closeEditWorkoutPresetModal() {
  $("edit-workout-preset-modal").classList.add("hidden");
  state.editingWorkoutPresetId = null;
  $("edit-workout-preset-form")?.reset();
}

function showSuccessModal(message) {
  $("success-message").textContent = message;
  $("success-modal").classList.remove("hidden");
}

function closeSuccessModal() {
  $("success-modal").classList.add("hidden");
}

function renderPresetsList() {
  const list = $("presets-list");
  const empty = $("presets-empty");
  if (!list || !empty) return;
  
  empty.classList.toggle("hidden", state.mealPresets.length > 0);
  clearEl(list);
  
  state.mealPresets.forEach(preset => {
    const li = document.createElement("li");
    li.className = "list-item";
    
    const main = document.createElement("div");
    main.className = "item-main";
    
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${preset.name} • ${preset.calories} cal`;
    
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = preset.category;
    
    main.appendChild(title);
    main.appendChild(meta);
    
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.appendChild(makeButton("Edit", "btn-small btn-edit", () => openEditPresetModal(preset.id)));
    actions.appendChild(makeButton("Delete", "btn-small btn-delete", () => {
      deleteMealPreset(preset.id);
      renderPresetsList();
    }));
    
    li.appendChild(main);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function renderWorkoutPresetsList() {
  const list = $("workout-presets-list");
  const empty = $("workout-presets-empty");
  if (!list || !empty) return;
  
  empty.classList.toggle("hidden", state.workoutPresets.length > 0);
  clearEl(list);
  
  state.workoutPresets.forEach(preset => {
    const li = document.createElement("li");
    li.className = "list-item";
    
    const main = document.createElement("div");
    main.className = "item-main";
    
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${preset.type} • ${preset.duration} min • ${preset.calories} cal`;
    
    main.appendChild(title);
    
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.appendChild(makeButton("Edit", "btn-small btn-edit", () => openEditWorkoutPresetModal(preset.id)));
    actions.appendChild(makeButton("Delete", "btn-small btn-delete", () => {
      deleteWorkoutPreset(preset.id);
      renderWorkoutPresetsList();
    }));
    
    li.appendChild(main);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

//----Confirmation Modal -------
const confirmationModal = {
    callback: null,

    show(message, onConfirm, onCancel = null){
        const modal = $("confirmation-modal");
        const messageEl = $("confirmation-message");

        if (!modal || !messageEl) return;

        messageEl.textContent = message;
        modal.classList.remove("hidden");

        this.callback = { onConfirm, onCancel};
    },

    confirm(){
        const modal = $("confirmation-modal");
        if (modal) modal.classList.add("hidden");

        if (this.callback && this.callback.onConfirm){
            this.callback.onConfirm();
        }
        this.callback = null;
    },

    cancel(){
        const modal = $("confirmation-modal");
        if (modal) modal.classList.add("hidden");

        if (this.callback && this.callback.onCancel){
            this.callback.onCancel();
        }
        this.callback = null;
    }
};

// ---------- calendar ----------
function renderCalendar() {
  const grid = $("calendar-grid");
  const monthLabel = $("cal-month");
  if (!grid || !monthLabel) return;

  clearEl(grid);

  const month = state.calendarMonth;
  monthLabel.textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Weekday header (Sun..Sat)
  const weekday = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 7 + i); // week starting Sunday
    weekday.push(d.toLocaleDateString(undefined, { weekday: "short" }));
  }
  for (const w of weekday) {
    const head = document.createElement("div");
    head.className = "cal-head";
    head.textContent = w;
    grid.appendChild(head);
  }

  const firstDay = startOfMonth(month);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  // leading blanks
  for (let i = 0; i < startWeekday; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell is-out";
    cell.tabIndex = -1;
    grid.appendChild(cell);
  }

  const today = todayISO();

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(month.getFullYear(), month.getMonth(), day, 12, 0, 0, 0);
    const iso = toISODateLocal(cellDate);

    const dayMeals = state.meals.filter(m => sameISODate(m.createdAt, iso));
    const dayWorkouts = state.workouts.filter(w => sameISODate(w.createdAt, iso));
    
    const mealCalories = dayMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
    const workoutCalories = dayWorkouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0);
    const waterCount = state.water[iso] || 0;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell";
    cell.dataset.iso = iso;

    if (iso === today) cell.classList.add("cal-today");
    if (state.filterDateISO === iso) cell.classList.add("cal-filtered");

    if (iso > today) {
      cell.classList.add("cal-future");
      cell.setAttribute("aria-disabled", "true");
      cell.title = "Future days are locked";
    }

    const dateEl = document.createElement("div");
    dateEl.className = "cal-date";
    dateEl.textContent = String(day);

    const badges = document.createElement("div");
    badges.className = "cal-badges";

    if (mealCalories > 0) {
      const b = document.createElement("span");
      b.className = "badge";
      const dot = document.createElement("span");
      dot.className = "dot dot-meal";
      b.appendChild(dot);
      b.appendChild(document.createTextNode(`${Math.round(mealCalories)} cal consumed`));
      badges.appendChild(b);
    }
    if (workoutCalories > 0) {
      const b = document.createElement("span");
      b.className = "badge";
      const dot = document.createElement("span");
      dot.className = "dot dot-workout";
      b.appendChild(dot);
      b.appendChild(document.createTextNode(`${Math.round(workoutCalories)} cal burned`));
      badges.appendChild(b);
    }
    if (waterCount > 0) {
      const b = document.createElement("span");
      b.className = "badge badge-water";
      b.textContent = `💧 ${waterCount} glasses`;
      badges.appendChild(b);
    }

    cell.appendChild(dateEl);
    cell.appendChild(badges);

    cell.addEventListener("click", (e) => {
      if (e.shiftKey) {
        // Shift+click to filter
        if (state.filterDateISO === iso) {
          state.filterDateISO = null;
        } else {
          state.filterDateISO = iso;
        }
        renderMeals();
        renderWorkouts();
        renderCalendar();
      } else {
        // Normal click to open modal
        openDayModal(iso);
      }
    });
    grid.appendChild(cell);
  }
}

function shiftMonth(delta) {
  const d = state.calendarMonth;
  state.calendarMonth = startOfMonth(new Date(d.getFullYear(), d.getMonth() + delta, 1));
  renderCalendar();
}

// ---------- modal: day view + edit ----------
function openDayModal(isoDay) {
  if (isFutureISO(isoDay)) {
    confirmationModal.show("Future days are locked. Add meals and workouts once you've actually done them." , null);
    return;
  }

  state.selectedDayISO = isoDay;
  state.dayEditingMealId = null;
  state.dayEditingWorkoutId = null;

  const modal = $("day-modal");
  const dateSpan = $("day-modal-date");
  const mealWrap = $("day-meal-form-wrap");
  const workoutWrap = $("day-workout-form-wrap");

  if (!modal || !dateSpan || !mealWrap || !workoutWrap) return;

  mealWrap.classList.add("hidden");
  workoutWrap.classList.add("hidden");
  resetDayMealForm();
  resetDayWorkoutForm();

  const d = parseISODateLocal(isoDay);
  dateSpan.textContent = d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  updateDaySummary();
  renderDayLists();

  modal.classList.remove("hidden");
}

function closeDayModal() {
  const modal = $("day-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  state.selectedDayISO = null;
  state.dayEditingMealId = null;
  state.dayEditingWorkoutId = null;

  resetDayMealForm();
  resetDayWorkoutForm();
  $("day-meal-form-wrap")?.classList.add("hidden");
  $("day-workout-form-wrap")?.classList.add("hidden");
}

function updateDaySummary() {
  const iso = state.selectedDayISO;
  const el = $("day-summary");
  if (!iso || !el) return;

  const meals = state.meals.filter(m => sameISODate(m.createdAt, iso)).sort((a, b) => b.createdAt - a.createdAt);
  const workouts = state.workouts.filter(w => sameISODate(w.createdAt, iso)).sort((a, b) => b.createdAt - a.createdAt);

  if (meals.length === 0 && workouts.length === 0) {
    el.textContent = "No entries yet.";
    return;
  }

  const parts = [];
  if (meals.length) {
    const cals = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
    parts.push(`${meals.length} meal${meals.length === 1 ? "" : "s"} • ${Math.round(cals)} cal`);
  }
  if (workouts.length) {
    const cals = workouts.reduce((s, w) => s + (Number(w.caloriesBurned) || 0), 0);
    parts.push(`${workouts.length} workout${workouts.length === 1 ? "" : "s"} • ${Math.round(cals)} cal burned`);
  }

  el.textContent = parts.join("  |  ");
}

function createdAtForSelectedDay() {
  // Set time to noon local to reduce timezone DST edge cases.
  const iso = state.selectedDayISO;
  if (!iso) return Date.now();
  const d = parseISODateLocal(iso);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

function renderDayLists() {
  const iso = state.selectedDayISO;
  const mealList = $("day-meals-list");
  const workoutList = $("day-workouts-list");
  const mealEmpty = $("day-meals-empty");
  const workoutEmpty = $("day-workouts-empty");
  if (!iso || !mealList || !workoutList || !mealEmpty || !workoutEmpty) return;

  const meals = state.meals.filter(m => sameISODate(m.createdAt, iso)).sort((a, b) => b.createdAt - a.createdAt);
  const workouts = state.workouts.filter(w => sameISODate(w.createdAt, iso)).sort((a, b) => b.createdAt - a.createdAt);

  mealEmpty.classList.toggle("hidden", meals.length > 0);
  workoutEmpty.classList.toggle("hidden", workouts.length > 0);

  clearEl(mealList);
  clearEl(workoutList);

  for (const m of meals) {
    const li = document.createElement("li");
    li.className = "list-item";

    const main = document.createElement("div");
    main.className = "item-main";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${m.name || "(Unnamed meal)"} • ${m.calories} cal`;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    const cat = m.category ? m.category : "uncategorized";
    meta.textContent = `${cat} • ${formatDateTime(m.createdAt)}`;

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.appendChild(makeButton("Edit", "btn-small btn-edit", () => beginDayEditMeal(m.id)));
    actions.appendChild(makeButton("Delete", "btn-small btn-delete", () => {
      confirmationModal.show(
              `Delete "${m.name || 'Unnamed meal'}"?`,
              () => {
                state.meals = state.meals.filter(meal => meal.id !== m.id);
                saveMealsToStorage();
                renderAll();
                updateDaySummary();
                renderDayLists();
              }
            );
    }));

    li.appendChild(main);
    li.appendChild(actions);
    mealList.appendChild(li);
  }

  for (const w of workouts) {
    const li = document.createElement("li");
    li.className = "list-item";

    const main = document.createElement("div");
    main.className = "item-main";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${w.type || "(Workout)"} • ${w.duration} min • ${w.caloriesBurned} cal`;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = formatDateTime(w.createdAt);

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.appendChild(makeButton("Edit", "btn-small btn-edit", () => beginDayEditWorkout(w.id)));
    actions.appendChild(makeButton("Delete", "btn-small btn-delete", () => {
      confirmationModal.show(
              `Delete "${w.type || 'Workout'}"?`,
              () => {
                state.workouts = state.workouts.filter(workout => workout.id !== w.id);
                saveWorkoutsToStorage();
                renderAll();
                updateDaySummary();
                renderDayLists();
              }
            );
    }));

    li.appendChild(main);
    li.appendChild(actions);
    workoutList.appendChild(li);
  }
}

function beginDayEditMeal(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal || !state.selectedDayISO) return;

  state.dayEditingMealId = id;
  state.dayEditingWorkoutId = null;

  $("day-workout-form-wrap")?.classList.add("hidden");
  $("day-meal-form-wrap")?.classList.remove("hidden");

  $("day-meal-name").value = meal.name;
  $("day-meal-calories").value = meal.calories;
  $("day-meal-category").value = meal.category || "";

  const submit = $("day-meal-submit");
  if (submit) submit.textContent = "Update Meal";
  validateForm($("day-meal-form"), $("day-meal-submit"));
}

function beginDayEditWorkout(id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w || !state.selectedDayISO) return;

  state.dayEditingWorkoutId = id;
  state.dayEditingMealId = null;

  $("day-meal-form-wrap")?.classList.add("hidden");
  $("day-workout-form-wrap")?.classList.remove("hidden");

  $("day-workout-type").value = w.type;
  $("day-workout-duration").value = w.duration;
  $("day-workout-calories").value = w.caloriesBurned;

  const submit = $("day-workout-submit");
  if (submit) submit.textContent = "Update Workout";
  validateForm($("day-workout-form"), $("day-workout-submit"));
}

function resetDayMealForm() {
  state.dayEditingMealId = null;
  $("day-meal-form")?.reset();
  const submit = $("day-meal-submit");
  if (submit) submit.textContent = "Save Meal";
}

function resetDayWorkoutForm() {
  state.dayEditingWorkoutId = null;
  $("day-workout-form")?.reset();
  const submit = $("day-workout-submit");
  if (submit) submit.textContent = "Save Workout";
}

// ---------- main render ----------
function renderAll() {
  renderDashboard();
  renderMeals();
  renderWorkouts();
  renderWeeklyGoals();
  renderCalendar();
  renderCharts();
  renderStreak();
  renderMotivation();

  // if modal is open, keep it updated
  if (state.selectedDayISO) {
    updateDaySummary();
    renderDayLists();
  }
}

// ---- Confirmation Modal Events ----
function wireConfirmationModal(){
    $("confirm-yes")?.addEventListener("click", () => {
        confirmationModal.confirm();
    });

    $("confirm-no")?.addEventListener("click", () => {
        if (confirmationModal.callback && !confirmationModal.callback.onConfirm) {
            confirmationModal.confirm();
        } else {
            confirmationModal.cancel();
        }
    });

    $("confirmation-modal")?.addEventListener("click", (e) => {
        if (e.target.id === "confirmation-modal" || e.target.classList.contains("modal-backdrop")) {
            if (confirmationModal.callback && !confirmationModal.callback.onConfirm) {
                confirmationModal.confirm();
            } else {
                confirmationModal.cancel();
            }
        }
    });
}

// ---------- form validation ----------
function validateForm(form, submitBtn) {
  submitBtn.disabled = !form.checkValidity();
}

// ---------- events ----------
function wireEvents() {
  // Meal form (top)
  const mealForm = $("meal-form");
  const mealSubmit = $("meal-submit");
  if (mealForm){
    $("meal-preset")?.addEventListener("change", (e) => {
      if (e.target.value) {
        applyMealPreset(e.target.value, $("meal-name"), $("meal-calories"), $("meal-category"));
        validateForm(mealForm, mealSubmit);
      }
    });
    
    mealForm.addEventListener("input", () => validateForm(mealForm, mealSubmit));
    mealForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = $("meal-name").value.trim();
        const calories = $("meal-calories").value;
        const category = $("meal-category").value;

        if (!name || category === "") return;

        addMeal(name, calories, category);
        mealForm.reset();
        validateForm(mealForm, mealSubmit);
    });
    validateForm(mealForm, mealSubmit);
  }
  
  $("save-preset")?.addEventListener("click", () => {
    const name = $("meal-name").value.trim();
    const calories = $("meal-calories").value;
    const category = $("meal-category").value;
    if (!name || !calories || !category) {
      showSuccessModal("Please fill in all meal fields before saving as preset.");
      return;
    }
    addMealPreset(name, calories, category);
    showSuccessModal("Preset saved successfully!");
  });
  
  $("manage-presets")?.addEventListener("click", openPresetsModal);
  
  $("copy-yesterday")?.addEventListener("click", copyYesterdayMeals);
  $("copy-yesterday-workouts")?.addEventListener("click", copyYesterdayWorkouts);

  // Edit Meal Modal
  const editMealForm = $("edit-meal-form");
  const editMealSubmit = $("edit-meal-submit");
  if (editMealForm) {
    editMealForm.addEventListener("input", () => validateForm(editMealForm, editMealSubmit));
    editMealForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!state.editingMealId) return;

      const name = $("edit-meal-name").value.trim();
      const calories = $("edit-meal-calories").value;
      const category = $("edit-meal-category").value;

      if (!name || !category) return;

      updateMeal(state.editingMealId, { name, calories, category });
      closeEditMeal();
    });
  }

  $("edit-meal-cancel")?.addEventListener("click", closeEditMeal);
  $("edit-meal-close")?.addEventListener("click", closeEditMeal);
  $("edit-meal-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditMeal();
  });

  // Workout form (top)
  const workoutForm = $("workout-form");
  const workoutSubmit = $("workout-submit");
  if (workoutForm) {
    $("workout-preset")?.addEventListener("change", (e) => {
      if (e.target.value) {
        applyWorkoutPreset(e.target.value, $("workout-type"), $("workout-duration"), $("workout-calories"));
        validateForm(workoutForm, workoutSubmit);
      }
    });
    
    workoutForm.addEventListener("input", () => validateForm(workoutForm, workoutSubmit));
    workoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const type = $("workout-type").value.trim();
      const duration = $("workout-duration").value;
      const caloriesBurned = $("workout-calories").value;

      if (!type) return;

      addWorkout(type, duration, caloriesBurned);
      workoutForm.reset();
      validateForm(workoutForm, workoutSubmit);
    });
    validateForm(workoutForm, workoutSubmit);
  }
  
  $("save-workout-preset")?.addEventListener("click", () => {
    const type = $("workout-type").value.trim();
    const duration = $("workout-duration").value;
    const calories = $("workout-calories").value;
    if (!type || !duration || !calories) {
      showSuccessModal("Please fill in all workout fields before saving as preset.");
      return;
    }
    addWorkoutPreset(type, duration, calories);
    showSuccessModal("Workout preset saved successfully!");
  });
  
  $("manage-workout-presets")?.addEventListener("click", openWorkoutPresetsModal);

  // Edit Workout Modal events
  const editWorkoutForm = $("edit-workout-form");
  const editWorkoutSubmit = $("edit-workout-submit");
  if (editWorkoutForm) {
    editWorkoutForm.addEventListener("input", () => validateForm(editWorkoutForm, editWorkoutSubmit));
    editWorkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!state.editingWorkoutId) return;

      const type = $("edit-workout-type").value.trim();
      const duration = $("edit-workout-duration").value;
      const calories = $("edit-workout-calories").value;

      if (!type) return;

      updateWorkout(state.editingWorkoutId, { type, duration, caloriesBurned: calories });
      closeEditWorkout();
    });
  }

  $("edit-workout-cancel")?.addEventListener("click", closeEditWorkout);
  $("edit-workout-close")?.addEventListener("click", closeEditWorkout);
  $("edit-workout-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditWorkout();
  });

  // Clear all
  $("clear-all")?.addEventListener("click", () => {
    confirmationModal.show(
          "Clear all meals and workouts? This cannot be undone.",
          () => {
            state.meals = [];
            state.workouts = [];
            clearAllStorage();
            renderAll();
          }
        );
  });

  // Goals modal
  $("set-goals")?.addEventListener("click", openGoalsModal);
  $("goals-close")?.addEventListener("click", closeGoalsModal);
  $("goals-cancel")?.addEventListener("click", closeGoalsModal);
  $("goals-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeGoalsModal();
  });
  
  const goalsForm = $("goals-form");
  const goalsSubmit = $("goals-submit");
  if (goalsForm) {
    goalsForm.addEventListener("input", () => validateForm(goalsForm, goalsSubmit));
    goalsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.goals.meals = Number($("goal-meals").value) || 21;
      state.goals.workouts = Number($("goal-workouts").value) || 7;
      saveGoalsToStorage();
      renderWeeklyGoals();
      renderDashboard();
      closeGoalsModal();
    });
    validateForm(goalsForm, goalsSubmit);
  }

  // Water tracker
  $("water-plus")?.addEventListener("click", () => setWaterCount(getWaterCount() + 1));
  $("water-minus")?.addEventListener("click", () => setWaterCount(getWaterCount() - 1));
  
  // Share progress
  $("share-progress")?.addEventListener("click", shareProgress);
  
  // Theme toggle
  $("theme-toggle")?.addEventListener("click", toggleTheme);
  
  // Presets modal
  $("presets-close")?.addEventListener("click", closePresetsModal);
  $("presets-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closePresetsModal();
  });
  
  // Edit preset modal
  $("edit-preset-close")?.addEventListener("click", closeEditPresetModal);
  $("edit-preset-cancel")?.addEventListener("click", closeEditPresetModal);
  $("edit-preset-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditPresetModal();
  });
  
  const editPresetForm = $("edit-preset-form");
  const editPresetSubmit = $("edit-preset-submit");
  if (editPresetForm) {
    editPresetForm.addEventListener("input", () => validateForm(editPresetForm, editPresetSubmit));
    editPresetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!state.editingPresetId) return;
      
      const name = $("edit-preset-name").value.trim();
      const calories = $("edit-preset-calories").value;
      const category = $("edit-preset-category").value;
      
      if (!name || !category) return;
      
      updateMealPreset(state.editingPresetId, { name, calories, category });
      closeEditPresetModal();
      renderPresetsList();
      showSuccessModal("Preset updated successfully!");
    });
  }
  
  // Success modal
  $("success-ok")?.addEventListener("click", closeSuccessModal);
  $("success-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeSuccessModal();
  });
  
  // Workout presets modal
  $("workout-presets-close")?.addEventListener("click", closeWorkoutPresetsModal);
  $("workout-presets-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeWorkoutPresetsModal();
  });
  
  // Edit workout preset modal
  $("edit-workout-preset-close")?.addEventListener("click", closeEditWorkoutPresetModal);
  $("edit-workout-preset-cancel")?.addEventListener("click", closeEditWorkoutPresetModal);
  $("edit-workout-preset-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditWorkoutPresetModal();
  });
  
  const editWorkoutPresetForm = $("edit-workout-preset-form");
  const editWorkoutPresetSubmit = $("edit-workout-preset-submit");
  if (editWorkoutPresetForm) {
    editWorkoutPresetForm.addEventListener("input", () => validateForm(editWorkoutPresetForm, editWorkoutPresetSubmit));
    editWorkoutPresetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!state.editingWorkoutPresetId) return;
      
      const type = $("edit-workout-preset-type").value.trim();
      const duration = $("edit-workout-preset-duration").value;
      const calories = $("edit-workout-preset-calories").value;
      
      if (!type) return;
      
      updateWorkoutPreset(state.editingWorkoutPresetId, { type, duration, calories });
      closeEditWorkoutPresetModal();
      renderWorkoutPresetsList();
      showSuccessModal("Workout preset updated successfully!");
    });
  }

  // Calendar nav
  $("cal-prev")?.addEventListener("click", () => shiftMonth(-1));
  $("cal-next")?.addEventListener("click", () => shiftMonth(1));

  // Modal close
  $("day-modal-close")?.addEventListener("click", closeDayModal);
  $("day-modal")?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "true") closeDayModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const confirmModal = $("confirmation-modal");
        const successModal = $("success-modal");
        if (confirmModal && !confirmModal.classList.contains("hidden")) {
            confirmationModal.cancel();
        } else if (successModal && !successModal.classList.contains("hidden")) {
            closeSuccessModal();
        } else if (!$("goals-modal").classList.contains("hidden")) {
            closeGoalsModal();
        } else if (!$("edit-workout-preset-modal").classList.contains("hidden")) {
            closeEditWorkoutPresetModal();
        } else if (!$("workout-presets-modal").classList.contains("hidden")) {
            closeWorkoutPresetsModal();
        } else if (!$("edit-preset-modal").classList.contains("hidden")) {
            closeEditPresetModal();
        } else if (!$("presets-modal").classList.contains("hidden")) {
            closePresetsModal();
        } else {
            closeDayModal();
        }
    }
  });

  // Modal open forms
  $("open-day-meal")?.addEventListener("click", () => {
    if (state.selectedDayISO && isFutureISO(state.selectedDayISO)) {
      confirmationModal.show("Future days are locked. Add meals and workouts once you've actually done them.", null);
      return;
    }
    $("day-meal-form-wrap")?.classList.remove("hidden");
    $("day-workout-form-wrap")?.classList.add("hidden");
    resetDayMealForm();
    $("day-meal-name")?.focus();
    validateForm($("day-meal-form"), $("day-meal-submit"));
  });

  $("open-day-workout")?.addEventListener("click", () => {
    if (state.selectedDayISO && isFutureISO(state.selectedDayISO)) {
      confirmationModal.show("Future days are locked. Add meals and workouts once you've actually done them.", null);
      return;
    }
    $("day-workout-form-wrap")?.classList.remove("hidden");
    $("day-meal-form-wrap")?.classList.add("hidden");
    resetDayWorkoutForm();
    $("day-workout-type")?.focus();
    validateForm($("day-workout-form"), $("day-workout-submit"));
  });

  // Modal cancel edit
  $("day-meal-cancel")?.addEventListener("click", () => {
    resetDayMealForm();
    $("day-meal-form-wrap")?.classList.add("hidden");
  });
  $("day-workout-cancel")?.addEventListener("click", () => {
    resetDayWorkoutForm();
    $("day-workout-form-wrap")?.classList.add("hidden");
  });

  // Modal submit forms
  const dayMealForm = $("day-meal-form");
  const dayMealSubmit = $("day-meal-submit");
  if (dayMealForm) {
    dayMealForm.addEventListener("input", () => validateForm(dayMealForm, dayMealSubmit));
  }
  dayMealForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDayISO) return;
    if (isFutureISO(state.selectedDayISO)) {
      confirmationModal.show("Future days are locked. Add meals and workouts once you've actually done them.", null);
      return;
    }

    const name = $("day-meal-name").value.trim();
    const calories = $("day-meal-calories").value;
    const category = $("day-meal-category").value;
    if (!name || !category) return;

    const createdAt = createdAtForSelectedDay();

    if (state.dayEditingMealId) {
      updateMeal(state.dayEditingMealId, { name, calories, category, createdAt });
      resetDayMealForm();
      $("day-meal-form-wrap")?.classList.add("hidden");
      updateDaySummary();
      renderDayLists();
      return;
    }

    addMeal(name, calories, category, createdAt);
    resetDayMealForm();
    $("day-meal-form-wrap")?.classList.add("hidden");
    updateDaySummary();
    renderDayLists();
  });

  const dayWorkoutForm = $("day-workout-form");
  const dayWorkoutSubmit = $("day-workout-submit");
  if (dayWorkoutForm) {
    dayWorkoutForm.addEventListener("input", () => validateForm(dayWorkoutForm, dayWorkoutSubmit));
  }
  dayWorkoutForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDayISO) return;
    if (isFutureISO(state.selectedDayISO)) {
      confirmationModal.show("Future days are locked. Add meals and workouts once you've actually done them.", null);
      return;
    }

    const type = $("day-workout-type").value.trim();
    const duration = $("day-workout-duration").value;
    const calories = $("day-workout-calories").value;
    if (!type) return;

    const createdAt = createdAtForSelectedDay();

    if (state.dayEditingWorkoutId) {
      updateWorkout(state.dayEditingWorkoutId, { type, duration, caloriesBurned: calories, createdAt });
      resetDayWorkoutForm();
      $("day-workout-form-wrap")?.classList.add("hidden");
      updateDaySummary();
      renderDayLists();
      return;
    }

    addWorkout(type, duration, calories, createdAt);
    resetDayWorkoutForm();
    $("day-workout-form-wrap")?.classList.add("hidden");
    updateDaySummary();
    renderDayLists();
  });
}

// ---------- init ----------
function init() {
  loadTheme();
  loadStateFromStorage();
  wireEvents();
  wireConfirmationModal();
  renderMealPresetOptions();
  renderWorkoutPresetOptions();
  renderAll();
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", init);
  // expose for tests/debugging
  window.__NutriFit = {
    state,
    addMeal,
    updateMeal,
    deleteMeal,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    calculateTotals,
    __storage: { STORAGE_KEYS, loadStateFromStorage, saveMealsToStorage, saveWorkoutsToStorage, clearAllStorage },
  };
}
