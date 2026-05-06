let allServices = [];

async function loadServices() {
  try {
    const tableBody = document.getElementById("servicesTable");
    if (!tableBody) return;
    tableBody.innerHTML =
      '<tr><td colspan="6" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const search = document.getElementById("serviceSearch")?.value || "";
    const activeOnly = document.getElementById("showActiveOnly")?.checked;

    let url = `${API_BASE_URL}/services`;
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (activeOnly) params.append("active", "true");
    if (params.toString()) url += "?" + params.toString();

    const response = await fetch(url);
    allServices = await response.json();
    tableBody.innerHTML = "";

    if (allServices.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>Услуги не найдены</p></td></tr>';
      return;
    }

    allServices.forEach((service) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${service.service_code}</strong></td>
        <td>${service.service_name}${service.description ? `<br><small>${service.description.substring(0, 50)}${service.description.length > 50 ? "..." : ""}</small>` : ""}</td>
        <td>${service.unit}</td>
        <td><strong>${formatCurrency(service.base_price)}</strong></td>
        <td><span class="status-badge ${service.is_active ? "active" : "inactive"}">${service.is_active ? "Активна" : "Неактивна"}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="editService(${service.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" onclick="deleteService(${service.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    const countEl = document.getElementById("servicesCount");
    if (countEl) countEl.textContent = `${allServices.length} услуг`;
  } catch (error) {
    console.error("Ошибка:", error);
    showNotification("Ошибка загрузки услуг", "error");
  }
}

async function saveService(event) {
  event.preventDefault();
  const serviceId = document.getElementById("serviceId").value;
  const serviceData = {
    service_code: document.getElementById("serviceCode").value,
    service_name: document.getElementById("serviceName").value,
    description: document.getElementById("serviceDescription").value,
    unit: document.getElementById("serviceUnit").value,
    base_price: parseFloat(document.getElementById("servicePrice").value),
    is_active: document.getElementById("serviceActive").checked,
  };

  try {
    const url = serviceId
      ? `${API_BASE_URL}/services/${serviceId}`
      : `${API_BASE_URL}/services`;
    const method = serviceId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("serviceModal");
      loadServices();
      loadDashboardData();
      showNotification(
        serviceId ? "Услуга обновлена" : "Услуга добавлена",
        "success",
      );
      document.getElementById("serviceForm").reset();
      document.getElementById("serviceId").value = "";
      document.getElementById("modalServiceTitle").innerHTML =
        '<i class="fas fa-concierge-bell"></i> Добавить новую услугу';
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка сохранения: " + error.message, "error");
  }
}

async function editService(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/services/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const service = result.data;
    document.getElementById("serviceId").value = service.id;
    document.getElementById("serviceCode").value = service.service_code;
    document.getElementById("serviceName").value = service.service_name;
    document.getElementById("serviceDescription").value =
      service.description || "";
    document.getElementById("serviceUnit").value = service.unit;
    document.getElementById("servicePrice").value = service.base_price;
    document.getElementById("serviceActive").checked = service.is_active;
    document.getElementById("modalServiceTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать услугу';
    showModal("serviceModal");
  } catch (error) {
    showNotification("Ошибка загрузки услуги", "error");
  }
}

async function deleteService(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Услуга удалена", "success");
        loadServices();
        loadDashboardData();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить эту услугу?");
}

function searchServices() {
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(loadServices, 500);
}

function filterServices() {
  loadServices();
}
