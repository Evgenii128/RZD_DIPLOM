async function loadClients() {
  try {
    const tableBody = document.getElementById("clientsTable");
    if (!tableBody) return;
    tableBody.innerHTML =
      '<tr><td colspan="6" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const search = document.getElementById("clientSearch")?.value || "";
    let url = `${API_BASE_URL}/clients`;
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const clients = await response.json();
    tableBody.innerHTML = "";

    if (clients.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="empty-state"><i class="fas fa-users"></i><p>Клиенты не найдены</p></td></tr>';
      return;
    }

    clients.forEach((client) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${client.company_name || "Без названия"}</strong></td>
        <td>${client.contact_person || "-"}</td>
        <td>${client.tax_number || "-"}</td>
        <td>${client.phone || "-"}</td>
        <td>${client.email || "-"}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="editClient(${client.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" onclick="deleteClient(${client.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    showNotification("Ошибка загрузки клиентов", "error");
  }
}

async function saveClient(event) {
  event.preventDefault();
  const clientId = document.getElementById("clientId").value;
  const clientData = {
    company_name: document.getElementById("clientCompany").value,
    contact_person: document.getElementById("clientContact").value,
    tax_number: document.getElementById("clientINN").value,
    phone: document.getElementById("clientPhone").value,
    email: document.getElementById("clientEmail").value,
    legal_address: document.getElementById("clientAddress").value,
    bank_details: document.getElementById("clientBank").value,
  };

  try {
    const url = clientId
      ? `${API_BASE_URL}/clients/${clientId}`
      : `${API_BASE_URL}/clients`;
    const method = clientId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("clientModal");
      loadClients();
      loadDashboardData();
      showNotification(
        clientId ? "Клиент обновлен" : "Клиент добавлен",
        "success",
      );
      document.getElementById("clientForm").reset();
      document.getElementById("clientId").value = "";
      document.getElementById("modalClientTitle").innerHTML =
        '<i class="fas fa-user-plus"></i> Добавить нового клиента';
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка сохранения: " + error.message, "error");
  }
}

async function editClient(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const client = result.data;
    document.getElementById("clientId").value = client.id;
    document.getElementById("clientCompany").value = client.company_name || "";
    document.getElementById("clientContact").value =
      client.contact_person || "";
    document.getElementById("clientINN").value = client.tax_number || "";
    document.getElementById("clientPhone").value = client.phone || "";
    document.getElementById("clientEmail").value = client.email || "";
    document.getElementById("clientAddress").value = client.legal_address || "";
    document.getElementById("clientBank").value = client.bank_details || "";
    document.getElementById("modalClientTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать клиента';
    showModal("clientModal");
  } catch (error) {
    showNotification("Ошибка загрузки клиента", "error");
  }
}

async function deleteClient(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Клиент удален", "success");
        loadClients();
        loadDashboardData();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить этого клиента?");
}

function searchClients() {
  clearTimeout(window._clientSearchTimeout);
  window._clientSearchTimeout = setTimeout(loadClients, 500);
}

async function loadClientsForContractSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/clients`);
    const clients = await response.json();
    const select = document.getElementById("contractClient");
    select.innerHTML = '<option value="">Выберите клиента</option>';
    clients.forEach((client) => {
      select.innerHTML += `<option value="${client.id}">${client.company_name} (${client.contact_person || "Нет контакта"})</option>`;
    });
  } catch (error) {
    console.error("Ошибка загрузки клиентов:", error);
  }
}

async function loadContractsForInvoiceSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts?status=active`);
    const contracts = await response.json();
    const select = document.getElementById("invoiceContract");
    select.innerHTML = '<option value="">Выберите договор</option>';
    contracts.forEach((contract) => {
      select.innerHTML += `<option value="${contract.id}">${contract.contract_number} - ${contract.company_name || "Без названия"}</option>`;
    });
  } catch (error) {
    console.error("Ошибка загрузки договоров:", error);
  }
}
