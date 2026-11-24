const tokenKey = "todo_token";

const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const appMessage = document.getElementById("appMessage");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

let filter = "all";

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

function showMessage(el, text) {
  el.textContent = text || "";
}

function setAuthed(isAuthed) {
  authPanel.classList.toggle("hidden", isAuthed);
  appPanel.classList.toggle("hidden", !isAuthed);
  logoutBtn.classList.toggle("hidden", !isAuthed);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
      : detail || "Request failed";
    throw new Error(message);
  }
  return data;
}

async function login(email, password) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  const data = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  setToken(data.access_token);
}

async function register(email, password) {
  await api("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await login(email, password);
}

async function loadTasks() {
  const query =
    filter === "all" ? "" : filter === "done" ? "?done=true" : "?done=false";
  const tasks = await api(`/tasks${query}`);
  taskList.innerHTML = "";
  emptyState.classList.toggle("hidden", tasks.length > 0);

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = `task${task.done ? " done" : ""}`;
    li.innerHTML = `
      <input type="checkbox" ${task.done ? "checked" : ""} aria-label="Toggle done" />
      <span class="title"></span>
      <button class="icon-btn" type="button" aria-label="Delete task">Delete</button>
    `;
    li.querySelector(".title").textContent = task.title;

    li.querySelector('input[type="checkbox"]').addEventListener("change", async (e) => {
      try {
        await api(`/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: e.target.checked }),
        });
        await loadTasks();
      } catch (err) {
        showMessage(appMessage, err.message);
      }
    });

    li.querySelector(".icon-btn").addEventListener("click", async () => {
      try {
        await api(`/tasks/${task.id}`, { method: "DELETE" });
        await loadTasks();
      } catch (err) {
        showMessage(appMessage, err.message);
      }
    });

    taskList.appendChild(li);
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const mode = tab.dataset.tab;
    document.getElementById("loginForm").classList.toggle("hidden", mode !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", mode !== "register");
    showMessage(authMessage, "");
  });
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(authMessage, "");
  try {
    await login(
      document.getElementById("loginEmail").value.trim(),
      document.getElementById("loginPassword").value
    );
    setAuthed(true);
    await loadTasks();
  } catch (err) {
    showMessage(authMessage, err.message);
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(authMessage, "");
  try {
    await register(
      document.getElementById("registerEmail").value.trim(),
      document.getElementById("registerPassword").value
    );
    setAuthed(true);
    showMessage(appMessage, "Account created. You’re in.");
    await loadTasks();
  } catch (err) {
    showMessage(authMessage, err.message);
  }
});

document.getElementById("taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("taskTitle");
  const title = input.value.trim();
  if (!title) return;
  showMessage(appMessage, "");
  try {
    await api("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    input.value = "";
    await loadTasks();
  } catch (err) {
    showMessage(appMessage, err.message);
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", async () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filter = chip.dataset.filter;
    try {
      await loadTasks();
    } catch (err) {
      showMessage(appMessage, err.message);
    }
  });
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  setAuthed(false);
  showMessage(authMessage, "Logged out.");
});

(async function boot() {
  if (!getToken()) {
    setAuthed(false);
    return;
  }
  try {
    setAuthed(true);
    await loadTasks();
  } catch {
    clearToken();
    setAuthed(false);
  }
})();
