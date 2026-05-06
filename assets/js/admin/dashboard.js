let revenueChart = null;
let requestsStatusChart = null;
let dailyActivityChart = null;
let servicesDistributionChart = null;
let currentDateRange = "week";

async function loadDashboardData() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/stats?range=${currentDateRange}`,
    );
    const data = await response.json();

    updateKPIValues(data);
    updateTrends(data);
    updateRevenueChart(data);
    updateRequestsStatusChart(data);
    updateDailyActivityChart(data);
    updateServicesDistributionChart(data);
    updateRequestsSummary(data);
    loadRecentRequests();
    loadUpcomingDeadlines();
  } catch (error) {
    console.error("Ошибка дашборда:", error);
    showNotification("Ошибка загрузки данных дашборда", "error");
  }
}

function updateKPIValues(data) {
  animateValue(
    "statTotalRevenue",
    0,
    data.totalRevenue || 0,
    1000,
    formatCurrency,
  );
  animateValue("statActiveContracts", 0, data.activeContracts || 0, 1000);
  animateValue("statPendingInvoices", 0, data.pendingInvoices || 0, 1000);
  animateValue("statClients", 0, data.clients || 0, 1000);
}

function updateTrends(data) {
  updateTrendElement(
    "revenueTrend",
    data.revenueTrend || { percentage: 12.5, direction: "up" },
  );
  updateTrendElement(
    "contractsTrend",
    data.contractsTrend || { percentage: 0, direction: "neutral" },
  );
  updateTrendElement(
    "invoicesTrend",
    data.invoicesTrend || { percentage: -5, direction: "down" },
  );
  updateTrendElement(
    "clientsTrend",
    data.clientsTrend || { percentage: 2, direction: "up" },
  );
}

function updateTrendElement(elementId, trendData) {
  const element = document.getElementById(elementId);
  if (!element || !trendData) return;

  const isPositive = trendData.direction === "up" || trendData.percentage > 0;
  const isNegative = trendData.direction === "down" || trendData.percentage < 0;
  element.className = `kpi-trend ${isPositive ? "positive" : isNegative ? "negative" : "neutral"}`;

  let icon = "fa-minus";
  if (isPositive) icon = "fa-arrow-up";
  if (isNegative) icon = "fa-arrow-down";

  let text = "без изменений";
  if (trendData.percentage !== 0)
    text = (trendData.percentage > 0 ? "+" : "") + trendData.percentage + "%";
  if (trendData.label) text = trendData.label;

  element.innerHTML = `<i class="fas ${icon}"></i><span>${text}</span>`;
}

function updateRequestsSummary(data) {
  const elements = {
    statNewRequests: data.newRequests || 0,
    statInProgressRequests: data.inProgressRequests || 0,
    statCompletedRequests: data.completedRequests || 0,
    statTotalRequests: data.totalRequests || 0,
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function updateRevenueChart(data) {
  const ctx = document.getElementById("revenueChart");
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();

  const revenueData = data.revenueData || generateDefaultRevenueData();

  revenueChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: revenueData.map((d) => d.label),
      datasets: [
        {
          label: "Выручка",
          data: revenueData.map((d) => d.value),
          borderColor: "#27ae60",
          backgroundColor: "rgba(39, 174, 96, 0.08)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#27ae60",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(44, 62, 80, 0.95)",
          padding: 14,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => " " + formatCurrency(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(0, 0, 0, 0.06)", drawBorder: false },
          ticks: { callback: (v) => formatCurrency(v), font: { size: 11 } },
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

function updateRequestsStatusChart(data) {
  const ctx = document.getElementById("requestsStatusChart");
  if (!ctx) return;
  if (requestsStatusChart) requestsStatusChart.destroy();

  const statusData = data.requestsStatusData || {
    new: data.newRequests || 0,
    in_progress: data.inProgressRequests || 0,
    completed: data.completedRequests || 0,
    cancelled: 0,
  };

  requestsStatusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Новые", "В работе", "Завершены", "Отклонены"],
      datasets: [
        {
          data: [
            statusData.new,
            statusData.in_progress,
            statusData.completed,
            statusData.cancelled,
          ],
          backgroundColor: ["#f39c12", "#3498db", "#27ae60", "#e74c3c"],
          borderWidth: 3,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true, font: { size: 12 } },
        },
      },
    },
  });
}

function updateDailyActivityChart(data) {
  const ctx = document.getElementById("dailyActivityChart");
  if (!ctx) return;
  if (dailyActivityChart) dailyActivityChart.destroy();

  const activityData = generateDefaultActivityData();

  dailyActivityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: activityData.map((d) => d.day),
      datasets: [
        {
          label: "Заявки",
          data: activityData.map((d) => d.count),
          backgroundColor: "rgba(52, 152, 219, 0.85)",
          borderRadius: 10,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(0, 0, 0, 0.06)" },
          ticks: { stepSize: 1, font: { size: 11 } },
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

function updateServicesDistributionChart(data) {
  const ctx = document.getElementById("servicesDistributionChart");
  if (!ctx) return;
  if (servicesDistributionChart) servicesDistributionChart.destroy();

  const servicesData = generateDefaultServicesData();
  const colors = [
    "#3498db",
    "#2ecc71",
    "#e74c3c",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
  ];

  servicesDistributionChart = new Chart(ctx, {
    type: "polarArea",
    data: {
      labels: servicesData.map((d) => d.name),
      datasets: [
        {
          data: servicesData.map((d) => d.count),
          backgroundColor: colors
            .slice(0, servicesData.length)
            .map((c) => c + "CC"),
          borderColor: colors.slice(0, servicesData.length),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 15, usePointStyle: true, font: { size: 11 } },
        },
      },
      scales: {
        r: {
          grid: { color: "rgba(0, 0, 0, 0.08)" },
          ticks: { display: false },
        },
      },
    },
  });
}

function generateDefaultRevenueData() {
  return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => ({
    label: day,
    value: Math.floor(Math.random() * 50000) + 10000,
  }));
}

function generateDefaultActivityData() {
  return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => ({
    day,
    count: Math.floor(Math.random() * 10) + 1,
  }));
}

function generateDefaultServicesData() {
  return [
    { name: "ТО локомотивов", count: Math.floor(Math.random() * 20) + 5 },
    { name: "Ремонт вагонов", count: Math.floor(Math.random() * 15) + 3 },
    { name: "Диагностика", count: Math.floor(Math.random() * 10) + 2 },
    { name: "Консультации", count: Math.floor(Math.random() * 8) + 1 },
    { name: "Модернизация", count: Math.floor(Math.random() * 6) + 1 },
  ];
}

async function loadRecentRequests() {
  try {
    const response = await fetch(`${API_BASE_URL}/requests?limit=5`);
    const requests = await response.json();
    const container = document.getElementById("recentRequests");
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML =
        '<div class="empty-state-enhanced"><i class="fas fa-inbox"></i><p>Нет заявок</p></div>';
      return;
    }

    container.innerHTML = requests
      .slice(0, 5)
      .map((req) => {
        const date = new Date(req.created_at);
        const statusMap = {
          new: { text: "Новая", class: "new", icon: "fa-star" },
          in_progress: {
            text: "В работе",
            class: "progress",
            icon: "fa-spinner",
          },
          completed: {
            text: "Завершена",
            class: "completed",
            icon: "fa-check-circle",
          },
          cancelled: {
            text: "Отклонена",
            class: "cancelled",
            icon: "fa-times-circle",
          },
        };
        const s = statusMap[req.status] || {
          text: req.status,
          class: "new",
          icon: "fa-star",
        };

        return `
        <div class="recent-item-enhanced" onclick="viewRequestDetails(${req.id})">
          <div class="recent-item-left">
            <div class="recent-avatar"><i class="fas fa-user"></i></div>
            <div class="recent-info">
              <h4>${req.full_name || "Клиент"}</h4>
              <p><span class="recent-number">${req.request_number || "Б/Н"}</span><span class="recent-dot">•</span><span>${getTimeAgo(date)}</span></p>
            </div>
          </div>
          <span class="recent-status-enhanced ${s.class}"><i class="fas ${s.icon}"></i>${s.text}</span>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка:", error);
    const container = document.getElementById("recentRequests");
    if (container)
      container.innerHTML =
        '<div class="empty-state-enhanced"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
  }
}

async function loadUpcomingDeadlines() {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts?status=active`);
    const contracts = await response.json();
    const container = document.getElementById("upcomingDeadlines");
    if (!container) return;

    if (!contracts || contracts.length === 0) {
      container.innerHTML =
        '<div class="empty-state-enhanced"><i class="fas fa-calendar-check"></i><p>Нет ближайших дедлайнов</p></div>';
      return;
    }

    const today = new Date();
    const upcoming = contracts
      .filter((c) => c.end_date && new Date(c.end_date) > today)
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 4);

    if (upcoming.length === 0) {
      container.innerHTML =
        '<div class="empty-state-enhanced"><i class="fas fa-calendar-check"></i><p>Нет ближайших дедлайнов</p></div>';
      return;
    }

    container.innerHTML = upcoming
      .map((contract) => {
        const daysLeft = Math.ceil(
          (new Date(contract.end_date) - today) / (1000 * 60 * 60 * 24),
        );
        const wClass =
          daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warning" : "";
        const progress = Math.max(
          0,
          Math.min(100, ((365 - daysLeft) / 365) * 100),
        );

        return `
        <div class="deadline-item ${wClass}" onclick="viewContract(${contract.id})">
          <div class="deadline-header">
            <span class="deadline-number">${contract.contract_number}</span>
            <span class="deadline-days ${wClass}"><i class="fas fa-clock"></i>${daysLeft} дн.</span>
          </div>
          <div class="deadline-company">${contract.company_name || "Клиент"}</div>
          <div class="deadline-progress"><div class="progress-bar"><div class="progress-fill ${wClass}" style="width: ${progress}%"></div></div></div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка:", error);
    const container = document.getElementById("upcomingDeadlines");
    if (container)
      container.innerHTML =
        '<div class="empty-state-enhanced"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
  }
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
