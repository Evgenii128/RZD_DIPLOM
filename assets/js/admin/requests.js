async function loadRequests() {
  try {
    const tableBody = document.getElementById("requestsTable");
    if (!tableBody) return;
    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const statusFilter =
      document.getElementById("requestStatusFilter")?.value || "";
    const url = statusFilter
      ? `${API_BASE_URL}/requests?status=${statusFilter}`
      : `${API_BASE_URL}/requests`;

    const response = await fetch(url);
    const requests = await response.json();
    tableBody.innerHTML = "";

    if (requests.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><p>Заявки не найдены</p></td></tr>';
      return;
    }

    requests.forEach((req) => {
      const row = document.createElement("tr");
      let statusClass = "pending",
        statusText = "Новая";
      switch (req.status) {
        case "new":
          statusClass = "pending";
          statusText = "Новая";
          break;
        case "in_progress":
          statusClass = "active";
          statusText = "В работе";
          break;
        case "completed":
          statusClass = "paid";
          statusText = "Завершена";
          break;
        case "cancelled":
          statusClass = "cancelled";
          statusText = "Отклонена";
          break;
      }

      let servicesCount = 0;
      try {
        if (req.selected_services) {
          const services =
            typeof req.selected_services === "string"
              ? JSON.parse(req.selected_services)
              : req.selected_services;
          if (Array.isArray(services)) servicesCount = services.length;
        }
      } catch (e) {}

      const totalAmount = parseFloat(req.total_amount) || 0;
      const notes = (req.admin_notes || "").replace(/'/g, "\\'");

      row.innerHTML = `
        <td><strong>${req.request_number || "Б/Н"}</strong></td>
        <td>${req.full_name || "Не указано"}<br><small>${req.company_name ? req.company_name.substring(0, 30) : ""}</small></td>
        <td>${req.phone || "-"}<br><small>${req.email || "-"}</small></td>
        <td><span class="badge">${servicesCount} ${getServicesWord(servicesCount)}</span><br><small>${formatCurrency(totalAmount)}</small></td>
        <td>${formatDate(req.created_at)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action view" onclick="viewRequestDetails(${req.id})"><i class="fas fa-eye"></i></button>
            <button class="btn-action edit" onclick="openStatusModal(${req.id}, '${req.status}', '${notes}')"><i class="fas fa-edit"></i></button>
            ${req.status === "new" ? `<button class="btn-action delete" onclick="deleteRequest(${req.id})"><i class="fas fa-trash"></i></button>` : ""}
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка:", error);
    showNotification("Ошибка загрузки заявок", "error");
  }
}

function openStatusModal(id, status, notes) {
  document.getElementById("currentRequestId").value = id;
  document.getElementById("requestStatusSelect").value = status;
  document.getElementById("requestAdminNotes").value = notes || "";
  showModal("requestStatusModal");
}

async function updateRequestStatus() {
  const id = document.getElementById("currentRequestId").value;
  const status = document.getElementById("requestStatusSelect").value;
  const notes = document.getElementById("requestAdminNotes").value;

  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: notes }),
    });
    const result = await response.json();
    if (response.ok) {
      showNotification("Статус обновлен", "success");
      closeModal("requestStatusModal");
      loadRequests();
      loadDashboardData();
    } else throw new Error(result.error);
  } catch (error) {
    showNotification("Ошибка обновления", "error");
  }
}

async function deleteRequest(id) {
  if (!confirm("Удалить заявку?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (response.ok && result.success) {
      showNotification("Заявка удалена", "success");
      loadRequests();
      loadDashboardData();
    } else throw new Error(result.error);
  } catch (error) {
    showNotification("Ошибка удаления: " + error.message, "error");
  }
}

async function viewRequestDetails(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`);
    const request = await response.json();

    let servicesHtml = "",
      totalAmount = 0;
    try {
      const selectedServices = request.selected_services
        ? typeof request.selected_services === "string"
          ? JSON.parse(request.selected_services)
          : request.selected_services
        : [];

      servicesHtml =
        selectedServices
          .map((s) => {
            const price = parseFloat(s.price) || 0;
            const quantity = parseInt(s.quantity) || 1;
            const subtotal = parseFloat(s.subtotal) || price * quantity;
            totalAmount += subtotal;
            return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed var(--border-color);">
          <span><strong>${s.service_name || "Услуга"}</strong><br><small>${quantity} × ${formatCurrency(price)}</small></span>
          <span><strong>${formatCurrency(subtotal)}</strong></span>
        </div>`;
          })
          .join("") || "<p>Нет данных</p>";
    } catch (e) {
      servicesHtml = "<p>Ошибка загрузки</p>";
    }

    if (totalAmount === 0) totalAmount = parseFloat(request.total_amount) || 0;

    const statusMap = {
      new: { text: "Новая", class: "pending" },
      in_progress: { text: "В работе", class: "active" },
      completed: { text: "Завершена", class: "paid" },
      cancelled: { text: "Отклонена", class: "cancelled" },
    };
    const s = statusMap[request.status] || {
      text: request.status,
      class: "pending",
    };

    const modalHtml = `
      <div class="modal-overlay active" id="viewRequestModal" style="display:flex;">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-file-signature"></i> Заявка ${request.request_number || "Б/Н"}</h3>
            <button class="btn-close" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
              <div>
                <p><strong>ФИО:</strong> ${request.full_name || "-"}</p>
                <p><strong>Компания:</strong> ${request.company_name || "-"}</p>
                <p><strong>Телефон:</strong> ${request.phone || "-"}</p>
                <p><strong>Email:</strong> ${request.email || "-"}</p>
              </div>
              <div>
                <p><strong>Дата:</strong> ${formatDateTime(request.created_at)}</p>
                <p><strong>Желаемая дата:</strong> ${request.preferred_date ? formatDate(request.preferred_date) : "-"}</p>
                <p><strong>Статус:</strong> <span class="status-badge ${s.class}">${s.text}</span></p>
              </div>
            </div>
            <h4>Услуги:</h4>
            <div style="background:var(--bg-secondary);padding:15px;border-radius:var(--border-radius);margin-bottom:20px;">
              ${servicesHtml}
              <div style="display:flex;justify-content:space-between;padding:15px 0 5px;margin-top:10px;border-top:2px solid var(--border-color);font-weight:bold;font-size:1.2rem;">
                <span>ИТОГО:</span><span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('viewRequestModal').remove()">Закрыть</button>
            <button class="btn btn-primary" onclick="document.getElementById('viewRequestModal').remove();openStatusModal(${request.id},'${request.status}','${(request.admin_notes || "").replace(/'/g, "\\'")}');">Изменить статус</button>
          </div>
        </div>
      </div>`;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    showNotification("Ошибка загрузки", "error");
  }
}

async function createContractFromRequest() {
  const requestId = document.getElementById("currentRequestId").value;
  if (!requestId) {
    showNotification("ID не найден", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/requests/${requestId}`);
    const request = await response.json();

    let clientId = null;
    if (request.email) {
      const clientsRes = await fetch(
        `${API_BASE_URL}/clients?search=${encodeURIComponent(request.email)}`,
      );
      const clients = await clientsRes.json();
      if (clients?.length > 0) clientId = clients[0].id;
    }

    if (!clientId) {
      const newClient = {
        company_name: request.company_name || `Клиент от ${request.full_name}`,
        contact_person: request.full_name,
        phone: request.phone,
        email: request.email,
      };
      const clientRes = await fetch(`${API_BASE_URL}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      const clientResult = await clientRes.json();
      if (!clientResult.success) throw new Error("Ошибка создания клиента");
      clientId = clientResult.data.id;
    }

    const date = new Date();
    const contractNumber = `ДОГ-${date.getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    let totalAmount = 0;
    try {
      const services = request.selected_services
        ? typeof request.selected_services === "string"
          ? JSON.parse(request.selected_services)
          : request.selected_services
        : [];
      services.forEach((s) => {
        if (s.subtotal) totalAmount += parseFloat(s.subtotal);
        else if (s.price && s.quantity)
          totalAmount += parseFloat(s.price) * parseInt(s.quantity);
      });
    } catch (e) {}
    if (!totalAmount) totalAmount = parseFloat(request.total_amount) || 0;

    const contractData = {
      contract_number: contractNumber,
      client_id: clientId,
      contract_date: date.toISOString().split("T")[0],
      start_date: date.toISOString().split("T")[0],
      total_amount: totalAmount,
      status: "active",
    };

    const contractRes = await fetch(`${API_BASE_URL}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractData),
    });
    const contractResult = await contractRes.json();

    if (contractResult.success) {
      showNotification(`Договор ${contractNumber} создан`, "success");
      closeModal("requestStatusModal");
      loadContracts();
      loadDashboardData();
    } else throw new Error(contractResult.error);
  } catch (error) {
    showNotification("Ошибка: " + error.message, "error");
  }
}
