document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/admin/check-auth");
    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = "/?login=required";
      return;
    }

    console.log("⚙️ Панель управления запущена");
    initTheme();
    initNavigation();
    checkDatabaseConnection();
    updateServerTime();
    setInterval(updateServerTime, 1000);
    loadInitialData();
    initModals();

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (currentDeleteAction) currentDeleteAction();
        closeModal("deleteModal");
      });
    }

    const dateRangeBtns = document.querySelectorAll(".date-range-btn");
    dateRangeBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        dateRangeBtns.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        currentDateRange = this.dataset.range;
        loadDashboardData();
      });
    });

    const today = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach((input) => {
      if (!input.value) input.value = today;
    });
  } catch (error) {
    window.location.href = "/?login=required";
  }
});

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

async function logout() {
  if (confirm("Выйти?")) {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  }
}

async function checkDatabaseConnection() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    const data = await res.json();
    const indicator = document.getElementById("dbStatusIndicator");
    const text = document.getElementById("dbStatusText");
    if (data.status === "OK") {
      indicator.className = "";
      text.textContent = "";
    }
  } catch {
    document.getElementById("dbStatusIndicator").className =
      "status-indicator error";
    document.getElementById("dbStatusText").textContent = "Ошибка БД";
  }
}

function updateServerTime() {
  const el = document.querySelector("#serverTime span");
  if (el) el.textContent = new Date().toLocaleTimeString("ru-RU");
}

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const sectionId = this.dataset.section;
      document
        .querySelectorAll(".nav-item")
        .forEach((n) => n.classList.remove("active"));
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(sectionId).classList.add("active");
      loadSectionData(sectionId);
    });
  });
}

function loadInitialData() {
  loadDashboardData();
  loadRequests();
  loadServices();
  loadClients();
  loadPriceLists();
  loadContracts();
  loadInvoices();
  loadUsers();
}

function loadSectionData(id) {
  const loaders = {
    dashboard: loadDashboardData,
    requests: loadRequests,
    services: loadServices,
    clients: loadClients,
    "price-lists": loadPriceLists,
    contracts: loadContracts,
    invoices: loadInvoices,
    users: loadUsers,
  };
  if (loaders[id]) loaders[id]();
}

function navigateToRequests(status) {
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document
    .querySelectorAll(".content-section")
    .forEach((s) => s.classList.remove("active"));

  const nav = document.querySelector('[data-section="requests"]');
  if (nav) nav.classList.add("active");

  const section = document.getElementById("requests");
  if (section) section.classList.add("active");

  const filter = document.getElementById("requestStatusFilter");
  if (filter) {
    filter.value = status;
    loadRequests();
  }
}
