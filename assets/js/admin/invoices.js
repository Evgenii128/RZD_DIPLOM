async function loadInvoices() {
  try {
    const tableBody = document.getElementById("invoicesTable");
    if (!tableBody) return;
    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const statusFilter =
      document.getElementById("invoiceStatusFilter")?.value || "";
    let url = `${API_BASE_URL}/invoices`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const response = await fetch(url);
    const invoices = await response.json();
    tableBody.innerHTML = "";

    if (invoices.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state"><i class="fas fa-receipt"></i><p>Счета не найдены</p></td></tr>';
      return;
    }

    invoices.forEach((invoice) => {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const isOverdue = dueDate < today && invoice.status === "pending";

      let statusText = "",
        statusClass = "";
      if (invoice.status === "pending") {
        statusText = isOverdue ? "Просрочен" : "Ожидает оплаты";
        statusClass = isOverdue ? "cancelled" : "pending";
      } else if (invoice.status === "paid") {
        statusText = "Оплачен";
        statusClass = "paid";
      } else {
        statusText = "Отменен";
        statusClass = "cancelled";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${invoice.invoice_number}</strong></td>
        <td>${invoice.company_name || "-"}<br><small>${invoice.contract_number || "-"}</small></td>
        <td>${formatDate(invoice.invoice_date)}</td>
        <td class="${isOverdue ? "text-danger" : ""}">${formatDate(invoice.due_date)}</td>
        <td><strong>${formatCurrency(invoice.total_amount)}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action view" onclick="viewInvoice(${invoice.id})"><i class="fas fa-eye"></i></button>
            ${
              invoice.status === "pending"
                ? `
              <button class="btn-action success" onclick="markInvoicePaid(${invoice.id})"><i class="fas fa-check"></i></button>
              <button class="btn-action edit" onclick="editInvoice(${invoice.id})"><i class="fas fa-edit"></i></button>
            `
                : ""
            }
            <button class="btn-action delete" onclick="deleteInvoice(${invoice.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    showNotification("Ошибка загрузки счетов", "error");
  }
}

async function saveInvoice(event) {
  event.preventDefault();
  const invoiceData = {
    invoice_number: document.getElementById("invoiceNumber").value,
    contract_id: parseInt(document.getElementById("invoiceContract").value),
    invoice_date: document.getElementById("invoiceDate").value,
    due_date: document.getElementById("invoiceDueDate").value,
    amount: parseFloat(document.getElementById("invoiceAmount").value),
    tax_amount: 0,
    total_amount: parseFloat(document.getElementById("invoiceAmount").value),
    status: document.getElementById("invoiceStatus").value,
    notes: document.getElementById("invoiceNotes").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("invoiceModal");
      loadInvoices();
      loadDashboardData();
      showNotification("Счет создан", "success");
      document.getElementById("invoiceForm").reset();
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка создания счета: " + error.message, "error");
  }
}

async function editInvoice(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const invoice = result.data;
    await loadContractsForInvoiceSelect();

    document.getElementById("invoiceNumber").value = invoice.invoice_number;
    document.getElementById("invoiceContract").value = invoice.contract_id;
    document.getElementById("invoiceDate").value = invoice.invoice_date;
    document.getElementById("invoiceDueDate").value = invoice.due_date;
    document.getElementById("invoiceAmount").value = invoice.amount;
    document.getElementById("invoiceStatus").value = invoice.status;
    document.getElementById("invoiceNotes").value = invoice.notes || "";

    showModal("invoiceModal");
  } catch (error) {
    showNotification("Ошибка загрузки счета", "error");
  }
}

async function deleteInvoice(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Счет удален", "success");
        loadInvoices();
        loadDashboardData();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить этот счет?");
}

async function viewInvoice(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const invoice = result.data;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const isOverdue = dueDate < today && invoice.status === "pending";

    let statusText = "",
      statusClass = "";
    if (invoice.status === "pending") {
      statusText = isOverdue ? "Просрочен" : "Ожидает оплаты";
      statusClass = isOverdue ? "cancelled" : "pending";
    } else if (invoice.status === "paid") {
      statusText = "Оплачен";
      statusClass = "paid";
    } else {
      statusText = "Отменен";
      statusClass = "cancelled";
    }

    const modalHtml = `
      <div class="modal-overlay active" id="viewInvoiceModal" style="display:flex;">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-receipt"></i> Счет ${invoice.invoice_number}</h3>
            <button class="btn-close" onclick="document.getElementById('viewInvoiceModal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
              <div>
                <p><strong>Клиент:</strong> ${invoice.company_name || "-"}</p>
                <p><strong>Договор:</strong> ${invoice.contract_number || "-"}</p>
                <p><strong>Статус:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
              </div>
              <div>
                <p><strong>Дата:</strong> ${formatDate(invoice.invoice_date)}</p>
                <p><strong>Оплатить до:</strong> ${formatDate(invoice.due_date)}</p>
                ${invoice.payment_date ? `<p><strong>Оплачен:</strong> ${formatDate(invoice.payment_date)}</p>` : ""}
              </div>
            </div>
            <div style="padding:20px;background:linear-gradient(135deg,#2c3e50,#3498db);color:white;border-radius:var(--border-radius);text-align:right;">
              <span style="font-size:1.2rem;">Сумма:</span>
              <span style="font-size:2rem;font-weight:bold;margin-left:15px;">${formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('viewInvoiceModal').remove()">Закрыть</button>
            ${invoice.status === "pending" ? `<button class="btn btn-success" onclick="document.getElementById('viewInvoiceModal').remove();markInvoicePaid(${invoice.id});">Отметить оплаченным</button>` : ""}
          </div>
        </div>
      </div>`;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    showNotification("Ошибка загрузки счета", "error");
  }
}

async function markInvoicePaid(id) {
  if (!confirm("Отметить счет как оплаченный?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_date: new Date().toISOString().split("T")[0],
      }),
    });
    const result = await response.json();

    if (result.success) {
      showNotification("Счет оплачен", "success");
      loadInvoices();
      loadDashboardData();
    } else throw new Error(result.error);
  } catch (error) {
    showNotification("Ошибка: " + error.message, "error");
  }
}
