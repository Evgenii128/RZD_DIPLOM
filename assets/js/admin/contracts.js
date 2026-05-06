async function loadContracts() {
  try {
    const tableBody = document.getElementById("contractsTable");
    if (!tableBody) return;
    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const statusFilter =
      document.getElementById("contractStatusFilter")?.value || "";
    let url = `${API_BASE_URL}/contracts`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const response = await fetch(url);
    const contracts = await response.json();
    tableBody.innerHTML = "";

    if (contracts.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state"><i class="fas fa-file-contract"></i><p>Договоры не найдены</p></td></tr>';
      return;
    }

    contracts.forEach((contract) => {
      const row = document.createElement("tr");
      const endDate = contract.end_date
        ? formatDate(contract.end_date)
        : "Бессрочный";
      let statusText =
        contract.status === "active"
          ? "Активен"
          : contract.status === "suspended"
            ? "Приостановлен"
            : "Завершен";
      let statusClass =
        contract.status === "active"
          ? "active"
          : contract.status === "suspended"
            ? "pending"
            : "cancelled";

      row.innerHTML = `
        <td><strong>${contract.contract_number}</strong></td>
        <td>${contract.company_name || "Без названия"}</td>
        <td>${formatDate(contract.contract_date)}</td>
        <td>${endDate}</td>
        <td><strong>${formatCurrency(contract.total_amount || 0)}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action view" onclick="viewContract(${contract.id})"><i class="fas fa-eye"></i></button>
            <button class="btn-action edit" onclick="editContract(${contract.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" onclick="deleteContract(${contract.id})"><i class="fas fa-trash"></i></button>
            <button class="btn-action success" onclick="createInvoiceFromContract(${contract.id})"><i class="fas fa-receipt"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    showNotification("Ошибка загрузки договоров", "error");
  }
}

async function saveContract(event) {
  event.preventDefault();
  const contractId = document.getElementById("contractId").value;
  const contractData = {
    contract_number: document.getElementById("contractNumber").value,
    client_id: parseInt(document.getElementById("contractClient").value),
    price_list_id: document.getElementById("contractPriceList").value
      ? parseInt(document.getElementById("contractPriceList").value)
      : null,
    contract_date: document.getElementById("contractDate").value,
    start_date: document.getElementById("contractStartDate").value,
    end_date: document.getElementById("contractEndDate").value || null,
    total_amount:
      parseFloat(document.getElementById("contractAmount").value) || 0,
    status: document.getElementById("contractStatus").value,
  };

  try {
    const url = contractId
      ? `${API_BASE_URL}/contracts/${contractId}`
      : `${API_BASE_URL}/contracts`;
    const method = contractId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("contractModal");
      loadContracts();
      loadDashboardData();
      showNotification(
        contractId ? "Договор обновлен" : "Договор создан",
        "success",
      );
      document.getElementById("contractForm").reset();
      document.getElementById("contractId").value = "";
      document.getElementById("modalContractTitle").innerHTML =
        '<i class="fas fa-file-contract"></i> Добавить договор';
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка сохранения: " + error.message, "error");
  }
}

async function editContract(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const contract = result.data;
    document.getElementById("contractId").value = contract.id;
    document.getElementById("contractNumber").value = contract.contract_number;
    document.getElementById("contractDate").value = contract.contract_date;
    document.getElementById("contractStartDate").value = contract.start_date;
    document.getElementById("contractEndDate").value = contract.end_date || "";
    document.getElementById("contractAmount").value =
      contract.total_amount || 0;
    document.getElementById("contractStatus").value = contract.status;

    await loadClientsForContractSelect();
    await loadPriceListsForContractSelect();

    setTimeout(() => {
      document.getElementById("contractClient").value = contract.client_id;
      if (contract.price_list_id)
        document.getElementById("contractPriceList").value =
          contract.price_list_id;
    }, 100);

    document.getElementById("modalContractTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать договор';
    showModal("contractModal");
  } catch (error) {
    showNotification("Ошибка загрузки договора", "error");
  }
}

async function deleteContract(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Договор удален", "success");
        loadContracts();
        loadDashboardData();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить этот договор?");
}

async function viewContract(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const contract = result.data;
    const modalHtml = `
      <div class="modal-overlay active" id="viewContractModal" style="display:flex;">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-file-contract"></i> Договор ${contract.contract_number}</h3>
            <button class="btn-close" onclick="document.getElementById('viewContractModal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
              <div><p><strong>Клиент:</strong> ${contract.company_name || "-"}</p><p><strong>Контакт:</strong> ${contract.contact_person || "-"}</p></div>
              <div><p><strong>Дата:</strong> ${formatDate(contract.contract_date)}</p><p><strong>Начало:</strong> ${formatDate(contract.start_date)}</p><p><strong>Конец:</strong> ${contract.end_date ? formatDate(contract.end_date) : "Бессрочный"}</p></div>
            </div>
            <div style="padding:15px;background:var(--bg-secondary);border-radius:var(--border-radius);margin-bottom:20px;text-align:right;">
              <span style="font-size:1.5rem;font-weight:bold;color:#27ae60;">${formatCurrency(contract.total_amount || 0)}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('viewContractModal').remove()">Закрыть</button>
            <button class="btn btn-primary" onclick="document.getElementById('viewContractModal').remove();editContract(${contract.id});">Редактировать</button>
          </div>
        </div>
      </div>`;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    showNotification("Ошибка загрузки договора", "error");
  }
}

async function createInvoiceFromContract(contractId) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}`);
    const contract = await response.json();
    if (!contract.success) throw new Error("Договор не найден");

    await loadContractsForInvoiceSelect();
    document.getElementById("invoiceContract").value = contractId;
    document.getElementById("invoiceAmount").value =
      contract.data.total_amount || 0;

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    document.getElementById("invoiceDate").value = today;
    document.getElementById("invoiceDueDate").value = dueDate
      .toISOString()
      .split("T")[0];
    document.getElementById("invoiceNumber").value =
      `СЧ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

    showModal("invoiceModal");
  } catch (error) {
    showNotification("Ошибка создания счета", "error");
  }
}
