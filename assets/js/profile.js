document.addEventListener("DOMContentLoaded", async function () {
  await loadUserInfo();
  await loadMyRequests();
});

async function loadUserInfo() {
  try {
    const res = await fetch("/api/client/current-user");
    const data = await res.json();
    if (data.success && data.user) {
      document.getElementById("userNameDisplay").textContent =
        "👤 " + (data.user.name || data.user.username);
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadMyRequests() {
  const container = document.getElementById("myRequestsList");

  try {
    const res = await fetch("/api/profile/my-requests");

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    const requests = await res.json();

    let total = requests.length,
      n = 0,
      p = 0,
      c = 0;
    requests.forEach((r) => {
      if (r.status === "new") n++;
      else if (r.status === "in_progress") p++;
      else if (r.status === "completed") c++;
    });

    document.getElementById("totalRequests").textContent = total;
    document.getElementById("newRequests").textContent = n;
    document.getElementById("progressRequests").textContent = p;
    document.getElementById("completedRequests").textContent = c;

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-requests">
          <div class="empty-icon">📭</div>
          <p>У вас пока нет заявок</p>
          <a href="/request">Создать первую заявку</a>
        </div>`;
      return;
    }

    const statusMap = {
      new: { name: "Новая", class: "status-new" },
      in_progress: { name: "В работе", class: "status-in_progress" },
      completed: { name: "Завершена", class: "status-completed" },
      cancelled: { name: "Отклонена", class: "status-cancelled" },
    };

    container.innerHTML = requests
      .map((req) => {
        const s = statusMap[req.status] || {
          name: req.status,
          class: "status-new",
        };
        const date = req.created_at
          ? new Date(req.created_at).toLocaleDateString("ru-RU")
          : "—";
        const amount = parseFloat(req.total_amount) || 0;

        let commentHtml = "";
        if (req.admin_notes && req.admin_notes.trim()) {
          commentHtml = `
          <div class="request-comment">
            <i class="fas fa-comment-dots"></i>
            <span class="comment-text">${escapeHtml(req.admin_notes)}</span>
          </div>`;
        }

        return `
        <div class="request-item ${s.class}">
          <div class="request-body">
            <h4>${escapeHtml(req.request_number || "Без номера")}</h4>
            <div class="request-date">📅 ${date}</div>
            <div class="request-services">${escapeHtml(req.service_description || "Услуги не указаны")}</div>
            ${commentHtml}
          </div>
          <div class="request-meta">
            <span class="request-status-badge ${s.class}">${s.name}</span>
            <span class="request-price">${amount.toLocaleString("ru-RU")} ₽</span>
          </div>
        </div>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    container.innerHTML = `
      <div style="text-align:center;padding:30px;color:#c0392b;">
        <p>Ошибка загрузки</p>
        <button onclick="loadMyRequests()" style="color:#2196F3;cursor:pointer;border:none;background:none;text-decoration:underline;">Повторить</button>
      </div>`;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function logout() {
  await fetch("/api/client/logout", { method: "POST" });
  window.location.href = "/";
}
