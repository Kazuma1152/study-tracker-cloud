const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const configWarning = document.getElementById("configWarning");
const authMessage = document.getElementById("authMessage");
const appMessage = document.getElementById("appMessage");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutButton = document.getElementById("logoutButton");
const accountName = document.getElementById("accountName");
const accountEmail = document.getElementById("accountEmail");

const form = document.getElementById("studyForm");
const studyDateInput = document.getElementById("studyDate");
const subjectInput = document.getElementById("subject");
const hoursInput = document.getElementById("hours");
const notesInput = document.getElementById("notes");
const subjectSuggestions = document.getElementById("subjectSuggestions");
const historyTable = document.getElementById("historyTable");
const subjectSummary = document.getElementById("subjectSummary");
const chartCard = document.getElementById("chartCard");
const weeklyGrid = document.getElementById("weeklyGrid");
const todayHours = document.getElementById("todayHours");
const todaySessions = document.getElementById("todaySessions");
const weekHours = document.getElementById("weekHours");
const weekSessions = document.getElementById("weekSessions");
const filterDate = document.getElementById("filterDate");
const filterSubject = document.getElementById("filterSubject");
const clearFilters = document.getElementById("clearFilters");
const exportCsvButton = document.getElementById("exportCsv");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");

const supabaseUrl = window.STUDY_TRACKER_SUPABASE_URL || "";
const supabaseAnonKey = window.STUDY_TRACKER_SUPABASE_ANON_KEY || "";
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseClient = isConfigured ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

let entries = [];
let currentUser = null;
let editingEntryId = null;

function getLocalDateInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return map[character];
  });
}

function setMessage(target, message = "", tone = "") {
  target.textContent = message;
  target.className = "status-text";
  if (tone) {
    target.classList.add(tone);
  }
}

function showLogin() {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  setMessage(authMessage, "");
}

function showRegister() {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  setMessage(authMessage, "");
}

function resetFormState() {
  editingEntryId = null;
  form.reset();
  studyDateInput.value = getLocalDateInputValue();
  formTitle.textContent = "Add Study Entry";
  formSubtitle.textContent = "Log what you studied today or backfill previous dates.";
  submitButton.textContent = "Save Entry";
  cancelEditButton.classList.add("hidden");
}

function setAuthenticatedView(user) {
  currentUser = user;
  accountName.textContent = user.user_metadata?.name || user.email || "Student";
  accountEmail.textContent = user.email || "";
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  setMessage(authMessage, "");
}

function setLoggedOutView() {
  currentUser = null;
  entries = [];
  editingEntryId = null;
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  showLogin();
}

function formatHours(value) {
  const numeric = Number(value) || 0;
  return `${numeric.toFixed(numeric % 1 === 0 ? 0 : 2)} hrs`;
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function getWeekStart(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDate(first, second) {
  return first.toISOString().split("T")[0] === second.toISOString().split("T")[0];
}

function renderSubjectSuggestions() {
  const subjects = [...new Set(entries.map((entry) => entry.subject))].sort();
  subjectSuggestions.innerHTML = subjects
    .map((subject) => `<option value="${escapeHtml(subject)}"></option>`)
    .join("");
}

function renderWeeklyGrid(weeklyEntries, weekStart) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  weeklyGrid.innerHTML = days.map((date) => {
    const key = getLocalDateInputValue(date);
    const dayEntries = weeklyEntries.filter((entry) => entry.date === key);
    const total = dayEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);

    return `
      <article class="day-card">
        <span>${date.toLocaleDateString(undefined, { weekday: "short" })}</span>
        <p>${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
        <strong>${formatHours(total)}</strong>
        <small>${dayEntries.length} session${dayEntries.length === 1 ? "" : "s"}</small>
      </article>
    `;
  }).join("");
}

function renderSubjectSummary(weeklyEntries) {
  if (!weeklyEntries.length) {
    subjectSummary.className = "subject-summary empty-state";
    subjectSummary.textContent = "No subjects logged for this week yet.";
    return;
  }

  const totals = weeklyEntries.reduce((accumulator, entry) => {
    accumulator[entry.subject] = (accumulator[entry.subject] || 0) + Number(entry.hours);
    return accumulator;
  }, {});

  const items = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const maxHours = items[0][1];

  subjectSummary.className = "subject-summary";
  subjectSummary.innerHTML = items.map(([subject, total]) => {
    const width = Math.max((total / maxHours) * 100, 8);
    return `
      <article class="subject-card">
        <header>
          <span>${escapeHtml(subject)}</span>
          <span>${formatHours(total)}</span>
        </header>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%"></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderTrendChart() {
  if (!entries.length) {
    chartCard.className = "chart-card empty-state";
    chartCard.textContent = "Add a few entries to see your study trend.";
    return;
  }

  const totalsByDate = entries.reduce((accumulator, entry) => {
    accumulator[entry.date] = (accumulator[entry.date] || 0) + Number(entry.hours);
    return accumulator;
  }, {});

  const points = Object.entries(totalsByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7);

  const width = 640;
  const height = 240;
  const padding = 28;
  const maxValue = Math.max(...points.map(([, total]) => total), 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map(([date, total], index) => {
    const x = padding + stepX * index;
    const y = height - padding - (total / maxValue) * (height - padding * 2);
    return { date, total, x, y };
  });

  const linePath = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;
  const gridLines = [0, 0.5, 1].map((ratio) => height - padding - ratio * (height - padding * 2));

  chartCard.className = "chart-card";
  chartCard.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Study trend chart">
      ${gridLines.map((y) => `<line class="chart-grid" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"></line>`).join("")}
      <path class="chart-area" d="${areaPath}"></path>
      <path class="chart-line" d="${linePath}"></path>
      ${coords.map((point) => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="6"></circle>`).join("")}
      ${coords.map((point) => `
        <text class="chart-label" x="${point.x}" y="${height - 8}" text-anchor="middle">
          ${escapeHtml(new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }))}
        </text>
      `).join("")}
      ${coords.map((point) => `
        <text class="chart-axis" x="${point.x}" y="${Math.max(point.y - 12, 18)}" text-anchor="middle">
          ${escapeHtml(Number(point.total).toFixed(point.total % 1 === 0 ? 0 : 2))}h
        </text>
      `).join("")}
    </svg>
  `;
}

function getFilteredEntries() {
  const dateValue = filterDate.value;
  const subjectValue = filterSubject.value.trim().toLowerCase();

  return [...entries].filter((entry) => {
    const matchesDate = !dateValue || entry.date === dateValue;
    const matchesSubject = !subjectValue || entry.subject.toLowerCase().includes(subjectValue);
    return matchesDate && matchesSubject;
  });
}

function renderHistory() {
  const filtered = getFilteredEntries().sort((a, b) => {
    if (a.date === b.date) {
      return a.subject.localeCompare(b.subject);
    }
    return b.date.localeCompare(a.date);
  });

  if (!filtered.length) {
    historyTable.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">No matching study entries found.</td>
      </tr>
    `;
    return;
  }

  historyTable.innerHTML = filtered.map((entry) => {
    const notes = entry.notes ? escapeHtml(entry.notes) : "-";
    return `
      <tr>
        <td>${formatDate(entry.date)}</td>
        <td>${escapeHtml(entry.subject)}</td>
        <td>${formatHours(Number(entry.hours))}</td>
        <td>${notes}</td>
        <td>
          <div class="action-group">
            <button class="edit-btn" data-id="${entry.id}" type="button">Edit</button>
            <button class="delete-btn" data-id="${entry.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = getWeekStart(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayEntries = entries.filter((entry) => {
    const current = new Date(`${entry.date}T00:00:00`);
    return isSameDate(current, today);
  });

  const weeklyEntries = entries.filter((entry) => {
    const current = new Date(`${entry.date}T00:00:00`);
    return current >= weekStart && current < weekEnd;
  });

  const todayTotal = todayEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const weeklyTotal = weeklyEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);

  todayHours.textContent = formatHours(todayTotal);
  todaySessions.textContent = `${todayEntries.length} sessions logged`;
  weekHours.textContent = formatHours(weeklyTotal);
  weekSessions.textContent = `${weeklyEntries.length} sessions logged`;

  renderWeeklyGrid(weeklyEntries, weekStart);
  renderSubjectSummary(weeklyEntries);
  renderTrendChart();
}

function renderApp() {
  renderSubjectSuggestions();
  renderOverview();
  renderHistory();
}

async function loadEntries() {
  const { data, error } = await supabaseClient
    .from("study_entries")
    .select("id, date, subject, hours, notes, created_at, updated_at")
    .order("date", { ascending: false });

  if (error) {
    throw error;
  }

  entries = data || [];
  renderApp();
}

async function createEntry(payload) {
  const { error } = await supabaseClient
    .from("study_entries")
    .insert({
      user_id: currentUser.id,
      date: payload.date,
      subject: payload.subject,
      hours: payload.hours,
      notes: payload.notes
    });

  if (error) {
    throw error;
  }
}

async function updateEntry(entryId, payload) {
  const { error } = await supabaseClient
    .from("study_entries")
    .update({
      date: payload.date,
      subject: payload.subject,
      hours: payload.hours,
      notes: payload.notes
    })
    .eq("id", entryId);

  if (error) {
    throw error;
  }
}

async function deleteEntry(entryId) {
  const { error } = await supabaseClient
    .from("study_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw error;
  }
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(authMessage, "Signing you in...");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(authMessage, error.message, "error");
    return;
  }

  loginForm.reset();
  setAuthenticatedView(data.user);
  setMessage(appMessage, `Welcome back, ${data.user.user_metadata?.name || data.user.email}.`, "success");
  resetFormState();

  try {
    await loadEntries();
  } catch (loadError) {
    setMessage(appMessage, loadError.message, "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(authMessage, "Creating your account...");

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) {
    setMessage(authMessage, error.message, "error");
    return;
  }

  registerForm.reset();

  if (!data.session) {
    setMessage(
      authMessage,
      "Account created. Check your email for the confirmation link, then sign in.",
      "success"
    );
    showLogin();
    return;
  }

  setAuthenticatedView(data.user);
  setMessage(appMessage, "Your account is ready.", "success");
  resetFormState();

  try {
    await loadEntries();
  } catch (loadError) {
    setMessage(appMessage, loadError.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    setMessage(appMessage, error.message, "error");
    return;
  }

  setLoggedOutView();
  setMessage(authMessage, "You have been logged out.", "success");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(appMessage, editingEntryId ? "Updating entry..." : "Saving entry...");

  const payload = {
    date: studyDateInput.value,
    subject: subjectInput.value.trim(),
    hours: Number(hoursInput.value),
    notes: notesInput.value.trim()
  };

  try {
    if (editingEntryId) {
      await updateEntry(editingEntryId, payload);
      setMessage(appMessage, "Entry updated.", "success");
    } else {
      await createEntry(payload);
      setMessage(appMessage, "Entry saved.", "success");
    }

    resetFormState();
    await loadEntries();
  } catch (error) {
    setMessage(appMessage, error.message, "error");
  }
});

historyTable.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches(".edit-btn")) {
    const entry = entries.find((item) => item.id === target.dataset.id);
    if (!entry) {
      return;
    }

    editingEntryId = entry.id;
    studyDateInput.value = entry.date;
    subjectInput.value = entry.subject;
    hoursInput.value = entry.hours;
    notesInput.value = entry.notes;
    formTitle.textContent = "Edit Study Entry";
    formSubtitle.textContent = "Update the session details, then save your changes.";
    submitButton.textContent = "Update Entry";
    cancelEditButton.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (!target.matches(".delete-btn")) {
    return;
  }

  try {
    await deleteEntry(target.dataset.id);
    if (editingEntryId === target.dataset.id) {
      resetFormState();
    }
    setMessage(appMessage, "Entry deleted.", "success");
    await loadEntries();
  } catch (error) {
    setMessage(appMessage, error.message, "error");
  }
});

[filterDate, filterSubject].forEach((element) => {
  element.addEventListener("input", renderHistory);
});

clearFilters.addEventListener("click", () => {
  filterDate.value = "";
  filterSubject.value = "";
  renderHistory();
});

cancelEditButton.addEventListener("click", () => {
  resetFormState();
});

exportCsvButton.addEventListener("click", () => {
  if (!entries.length) {
    setMessage(appMessage, "Add entries before exporting CSV.", "error");
    return;
  }

  const rows = [
    ["Date", "Subject", "Hours", "Notes"],
    ...[...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => [entry.date, entry.subject, entry.hours, entry.notes])
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");

  downloadFile(`study-tracker-${getLocalDateInputValue()}.csv`, csv, "text/csv;charset=utf-8;");
  setMessage(appMessage, "CSV exported.", "success");
});

async function bootstrap() {
  studyDateInput.value = getLocalDateInputValue();

  if (!isConfigured) {
    configWarning.classList.remove("hidden");
    authView.classList.add("hidden");
    appView.classList.add("hidden");
    return;
  }

  authView.classList.remove("hidden");

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    setLoggedOutView();
    return;
  }

  setAuthenticatedView(session.user);
  resetFormState();

  try {
    await loadEntries();
  } catch (error) {
    setMessage(appMessage, error.message, "error");
  }

  supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
    if (!nextSession?.user) {
      setLoggedOutView();
      return;
    }

    currentUser = nextSession.user;
    setAuthenticatedView(nextSession.user);

    try {
      await loadEntries();
    } catch (error) {
      setMessage(appMessage, error.message, "error");
    }
  });
}

bootstrap();
