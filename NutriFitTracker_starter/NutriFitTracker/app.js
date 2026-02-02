// NutriFit Tracker
// - Meals + workouts stored in localStorage
// - Dashboard totals
// - Recent workout list (last 5)
// - Calendar month view (click past/today to view + add + edit for that date)
// - Future days are locked (cannot add in advance)

const STORAGE_KEYS = {
  meals: "nutrifit_meals_v1",
  workouts: "nutrifit_workouts_v1",
};

const state = {
  meals: [],
  workouts: [],
  editingMealId: null,
  editingWorkoutId: null,

  // Optional UI filter (set by clicking a calendar day)
  filterDayISO: null,              // "YYYY-MM-DD" or null

  // calendar / modal
  calendarMonth: startOfMonth(new Date()),
  selectedDayISO: null,            // "YYYY-MM-DD"
  dayEditingMealId: null,
  dayEditingWorkoutId: null,
};

// ---------- form validity helpers ----------
// Keeps submit buttons disabled until form fields are valid.
const _formValidityRefreshers = Object.create(null);

function attachDisableWhenInvalid(formId, submitBtnId) {
  const form = $(formId);
  const submit = $(submitBtnId);
  if (!form || !submit) return;

  const refresh = () => {
    // checkValidity() respects required/min/step/etc.
    submit.disabled = !form.checkValidity();
  };

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  // Keep Enter key submits safe in older browsers that might not block invalid submits.
  form.addEventListener("submit", refresh);

  refresh();
  _formValidityRefreshers[formId] = refresh;
}

function refreshFormValidity(formId) {
  const fn = _formValidityRefreshers[formId];
  if (typeof fn === "function") fn();
}

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

  state.meals = (Array.isArray(meals) ? meals : []).map(normalizeMeal);
  state.workouts = (Array.isArray(workouts) ? workouts : []).map(normalizeWorkout);
}

function saveMealsToStorage() {
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(state.meals));
}

function saveWorkoutsToStorage() {
  localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(state.workouts));
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
  state.meals = state.meals.filter(m => m.id !== id);
  saveMealsToStorage();
  renderAll();
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
  state.workouts = state.workouts.filter(w => w.id !== id);
  saveWorkoutsToStorage();
  renderAll();
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

  const filteredMeals = state.filterDayISO
    ? state.meals.filter(m => sameISODate(m.createdAt, state.filterDayISO))
    : state.meals;

  const mealsSorted = [...filteredMeals].sort((a, b) => b.createdAt - a.createdAt);
  empty.classList.toggle("hidden", mealsSorted.length > 0);
  if (mealsSorted.length === 0) {
    empty.textContent = state.filterDayISO
      ? "No meals for this date."
      : "No meals yet — add one above.";
  }

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

    const edit = makeButton("Edit", "btn-small btn-edit", () => beginEditMeal(meal.id));
    const del = makeButton("Delete", "btn-small btn-delete", () => deleteMeal(meal.id));
    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(main);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

function renderWorkouts() {
  const list = $("workout-list");
  const empty = $("workout-empty");
  if (!list || !empty) return;

  const filteredWorkouts = state.filterDayISO
    ? state.workouts.filter(w => sameISODate(w.createdAt, state.filterDayISO))
    : state.workouts;

  const workoutsSorted = [...filteredWorkouts].sort((a, b) => b.createdAt - a.createdAt);
  const recent = workoutsSorted.slice(0, 5);

  empty.classList.toggle("hidden", recent.length > 0);
  if (recent.length === 0) {
    empty.textContent = state.filterDayISO
      ? "No workouts for this date."
      : "No workouts yet — add one above.";
  }

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

    const edit = makeButton("Edit", "btn-small btn-edit", () => beginEditWorkout(w.id));
    const del = makeButton("Delete", "btn-small btn-delete", () => deleteWorkout(w.id));
    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(main);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

// ---------- editing (top forms) ----------
function beginEditMeal(id) {
  const meal = state.meals.find(m => m.id === id);
  if (!meal) return;

  state.editingMealId = id;
  $("meal-name").value = meal.name;
  $("meal-calories").value = meal.calories;
  $("meal-category").value = meal.category || "";

<<<<<<< Updated upstream
  $("meal-submit").textContent = "Update Meal";
  $("meal-cancel").classList.remove("hidden");
=======
  $("edit-meal-modal").classList.remove("hidden");
  refreshFormValidity("edit-meal-form");
  $("edit-meal-name")?.focus();
>>>>>>> Stashed changes
}

function cancelEditMeal() {
  state.editingMealId = null;
  $("meal-form").reset();
  $("meal-submit").textContent = "Add Meal";
  $("meal-cancel").classList.add("hidden");
}

function beginEditWorkout(id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;

  state.editingWorkoutId = id;
  $("workout-type").value = w.type;
  $("workout-duration").value = w.duration;
  $("workout-calories").value = w.caloriesBurned;

<<<<<<< Updated upstream
  $("workout-submit").textContent = "Update Workout";
  $("workout-cancel").classList.remove("hidden");
=======
  $("edit-workout-modal").classList.remove("hidden");
  refreshFormValidity("edit-workout-form");
  $("edit-workout-type")?.focus();
>>>>>>> Stashed changes
}

function cancelEditWorkout() {
  state.editingWorkoutId = null;
  $("workout-form").reset();
  $("workout-submit").textContent = "Add Workout";
  $("workout-cancel").classList.add("hidden");
}

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

    const mealEntries = state.meals.filter(m => sameISODate(m.createdAt, iso));
    const workoutEntries = state.workouts.filter(w => sameISODate(w.createdAt, iso));

    const mealCalories = mealEntries.reduce((s, m) => s + (Number(m.calories) || 0), 0);
    const workoutCalories = workoutEntries.reduce((s, w) => s + (Number(w.caloriesBurned) || 0), 0);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell";
    cell.dataset.iso = iso;

    if (iso === today) cell.classList.add("cal-today");
    if (state.filterDayISO === iso) cell.classList.add("cal-selected");

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
      b.appendChild(document.createTextNode(`${Math.round(mealCalories)} cal`));
      badges.appendChild(b);
    }
    if (workoutCalories > 0) {
      const b = document.createElement("span");
      b.className = "badge";
      const dot = document.createElement("span");
      dot.className = "dot dot-workout";
      b.appendChild(dot);
      b.appendChild(document.createTextNode(`${Math.round(workoutCalories)} burned`));
      badges.appendChild(b);
    }

    cell.appendChild(dateEl);
    cell.appendChild(badges);

    // Clicking the cell filters the main lists; clicking the date number opens the day modal.
    cell.addEventListener("click", () => {
      if (iso > today) return;
      state.filterDayISO = (state.filterDayISO === iso) ? null : iso;
      renderMeals();
      renderWorkouts();
      renderCalendar();
    });

    dateEl.addEventListener("click", (e) => {
      e.stopPropagation();
      openDayModal(iso);
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
    alert("Future days are locked. Add meals and workouts once you've actually done them.");
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
      if (!confirm("Delete this meal?")) return;
      deleteMeal(m.id);
      updateDaySummary();
      renderDayLists();
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
      if (!confirm("Delete this workout?")) return;
      deleteWorkout(w.id);
      updateDaySummary();
      renderDayLists();
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
  refreshFormValidity("day-meal-form");
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
  refreshFormValidity("day-workout-form");
}

function resetDayMealForm() {
  state.dayEditingMealId = null;
  $("day-meal-form")?.reset();
  const submit = $("day-meal-submit");
  if (submit) submit.textContent = "Save Meal";
  refreshFormValidity("day-meal-form");
}

function resetDayWorkoutForm() {
  state.dayEditingWorkoutId = null;
  $("day-workout-form")?.reset();
  const submit = $("day-workout-submit");
  if (submit) submit.textContent = "Save Workout";
  refreshFormValidity("day-workout-form");
}

// ---------- main render ----------
function renderAll() {
  renderDashboard();
  renderMeals();
  renderWorkouts();
  renderCalendar();

  // if modal is open, keep it updated
  if (state.selectedDayISO) {
    updateDaySummary();
    renderDayLists();
  }
}

// ---------- events ----------
function wireEvents() {
  // Disable submit buttons until each form is valid.
  attachDisableWhenInvalid("meal-form", "meal-submit");
  attachDisableWhenInvalid("workout-form", "workout-submit");
  attachDisableWhenInvalid("edit-meal-form", "edit-meal-submit");
  attachDisableWhenInvalid("edit-workout-form", "edit-workout-submit");
  attachDisableWhenInvalid("day-meal-form", "day-meal-submit");
  attachDisableWhenInvalid("day-workout-form", "day-workout-submit");

  // Meal form (top)
  const mealForm = $("meal-form");
  if (mealForm) {
    mealForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = $("meal-name").value.trim();
      const calories = $("meal-calories").value;
      const category = $("meal-category").value;

      if (!name || category === "") return;

<<<<<<< Updated upstream
      if (state.editingMealId) {
        updateMeal(state.editingMealId, { name, calories, category });
        cancelEditMeal();
        return;
      }

      addMeal(name, calories, category);
      mealForm.reset();
    });
  }

  $("meal-cancel")?.addEventListener("click", cancelEditMeal);
=======
        addMeal(name, calories, category);
        mealForm.reset();
        refreshFormValidity("meal-form");
    });
  }

  // Edit Meal Modal
  $("edit-meal-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.editingMealId) return;

    const name = $("edit-meal-name").value.trim();
    const calories = $("edit-meal-calories").value;
    const category = $("edit-meal-category").value;

    if (!name || !category) return;

    updateMeal(state.editingMealId, { name, calories, category });
    closeEditMeal();
    refreshFormValidity("edit-meal-form");
  });

  $("edit-meal-cancel")?.addEventListener("click", closeEditMeal);
  $("edit-meal-close")?.addEventListener("click", closeEditMeal);
  $("edit-meal-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditMeal();
  });
>>>>>>> Stashed changes

  // Workout form (top)
  const workoutForm = $("workout-form");
  if (workoutForm) {
    workoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const type = $("workout-type").value.trim();
      const duration = $("workout-duration").value;
      const caloriesBurned = $("workout-calories").value;

      if (!type) return;

      if (state.editingWorkoutId) {
        updateWorkout(state.editingWorkoutId, { type, duration, caloriesBurned });
        cancelEditWorkout();
        return;
      }

      addWorkout(type, duration, caloriesBurned);
      workoutForm.reset();
      refreshFormValidity("workout-form");
    });
  }

<<<<<<< Updated upstream
  $("workout-cancel")?.addEventListener("click", cancelEditWorkout);
=======
  // Edit Workout Modal events
  $("edit-workout-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.editingWorkoutId) return;

    const type = $("edit-workout-type").value.trim();
    const duration = $("edit-workout-duration").value;
    const calories = $("edit-workout-calories").value;

    if (!type) return;

    updateWorkout(state.editingWorkoutId, { type, duration, caloriesBurned: calories });
    closeEditWorkout();
    refreshFormValidity("edit-workout-form");
  });

  $("edit-workout-cancel")?.addEventListener("click", closeEditWorkout);
  $("edit-workout-close")?.addEventListener("click", closeEditWorkout);
  $("edit-workout-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeEditWorkout();
  });
>>>>>>> Stashed changes

  // Clear all
  $("clear-all")?.addEventListener("click", () => {
    if (!confirm("Clear all meals and workouts?")) return;
    state.meals = [];
    state.workouts = [];
    clearAllStorage();
    renderAll();
  });

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
    if (e.key === "Escape") closeDayModal();
  });

  // Modal open forms
  $("open-day-meal")?.addEventListener("click", () => {
    if (state.selectedDayISO && isFutureISO(state.selectedDayISO)) {
      alert("Future days are locked. Add meals and workouts once you've actually done them.");
      return;
    }
    $("day-meal-form-wrap")?.classList.remove("hidden");
    $("day-workout-form-wrap")?.classList.add("hidden");
    resetDayMealForm();
    refreshFormValidity("day-meal-form");
    $("day-meal-name")?.focus();
  });

  $("open-day-workout")?.addEventListener("click", () => {
    if (state.selectedDayISO && isFutureISO(state.selectedDayISO)) {
      alert("Future days are locked. Add meals and workouts once you've actually done them.");
      return;
    }
    $("day-workout-form-wrap")?.classList.remove("hidden");
    $("day-meal-form-wrap")?.classList.add("hidden");
    resetDayWorkoutForm();
    refreshFormValidity("day-workout-form");
    $("day-workout-type")?.focus();
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
  $("day-meal-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDayISO) return;
    if (isFutureISO(state.selectedDayISO)) {
      alert("Future days are locked. Add meals and workouts once you've actually done them.");
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

  $("day-workout-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDayISO) return;
    if (isFutureISO(state.selectedDayISO)) {
      alert("Future days are locked. Add meals and workouts once you've actually done them.");
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
  loadStateFromStorage();
  wireEvents();
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
