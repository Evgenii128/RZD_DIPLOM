let servicesForPriceList = [];

async function loadPriceLists() {
  try {
    const container = document.getElementById("priceListsContainer");
    if (!container) return;
    container.innerHTML =
      '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';

    const response = await fetch(`${API_BASE_URL}/price-lists`);
    const priceLists = await response.json();
    container.innerHTML = "";

    if (priceLists.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Прайс-листы не найдены</p><button class="btn btn-primary mt-2" onclick="showModal(\'priceListModal\')">Создать первый</button></div>';
      return;
    }

    priceLists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "price-list-card";
      card.innerHTML = `
        <div class="price-list-header">
          <h4>${list.price_list_name}</h4>
          <span class="status-badge ${list.is_active ? "active" : "inactive"}">${list.is_active ? "Активен" : "Неактивен"}</span>
        </div>
        <div class="price-list-dates">
          <div><i class="fas fa-calendar-alt"></i> с ${formatDate(list.valid_from)}</div>
          ${list.valid_to ? `<div><i class="fas fa-calendar-times"></i> до ${formatDate(list.valid_to)}</div>` : ""}
        </div>
        <div class="price-list-description">${list.description || "Нет описания"}</div>
        <div class="price-list-actions">
          <button class="btn-action edit" onclick="editPriceList(${list.id})"><i class="fas fa-edit"></i></button>
          <button class="btn-action delete" onclick="deletePriceList(${list.id})"><i class="fas fa-trash"></i></button>
          <button class="btn-action view" onclick="viewPriceList(${list.id})"><i class="fas fa-eye"></i></button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    showNotification("Ошибка загрузки прайс-листов", "error");
  }
}

async function savePriceList(event) {
  event.preventDefault();

  try {
    const priceListId = document.getElementById("priceListId").value;
    const priceListData = {
      price_list_name: document.getElementById("priceListName").value,
      description: document.getElementById("priceListDescription").value,
      valid_from: document.getElementById("priceListValidFrom").value,
      valid_to: document.getElementById("priceListValidTo").value || null,
      is_active: document.getElementById("priceListActive").checked,
    };

    const url = priceListId
      ? `${API_BASE_URL}/price-lists/${priceListId}`
      : `${API_BASE_URL}/price-lists`;
    const method = priceListId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(priceListData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      const newId = result.data.id;
      const items = [];
      document
        .querySelectorAll("#priceListItems .price-list-item")
        .forEach((item) => {
          const serviceSelect = item.querySelector(".item-service");
          const priceInput = item.querySelector(".item-price");
          if (serviceSelect?.value && priceInput?.value) {
            items.push({
              service_id: parseInt(serviceSelect.value),
              price: parseFloat(priceInput.value),
            });
          }
        });

      if (items.length > 0) {
        await fetch(
          `${API_BASE_URL}/price-lists/${newId || priceListId}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          },
        );
      }

      closeModal("priceListModal");
      loadPriceLists();
      showNotification(
        priceListId ? "Прайс-лист обновлен" : "Прайс-лист создан",
        "success",
      );
      document.getElementById("priceListForm").reset();
      document.getElementById("priceListId").value = "";
      document.getElementById("priceListItems").innerHTML = "";
      document.getElementById("modalPriceListTitle").innerHTML =
        '<i class="fas fa-file-invoice-dollar"></i> Создать прайс-лист';
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка сохранения: " + error.message, "error");
  }
}

async function editPriceList(id) {
  try {
    const [listRes, itemsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/price-lists/${id}`),
      fetch(`${API_BASE_URL}/price-lists/${id}/items`),
    ]);

    const listResult = await listRes.json();
    const items = await itemsRes.json();

    if (!listResult.success) throw new Error(listResult.message);

    const priceList = listResult.data;
    document.getElementById("priceListId").value = priceList.id;
    document.getElementById("priceListName").value =
      priceList.price_list_name || "";
    document.getElementById("priceListDescription").value =
      priceList.description || "";
    document.getElementById("priceListValidFrom").value = priceList.valid_from;
    document.getElementById("priceListValidTo").value =
      priceList.valid_to || "";
    document.getElementById("priceListActive").checked = priceList.is_active;
    document.getElementById("priceListItems").innerHTML = "";

    await loadServicesForPriceList();
    items.forEach((item) =>
      addPriceListItemWithData(item.service_id, item.price),
    );

    document.getElementById("modalPriceListTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать прайс-лист';
    showModal("priceListModal");
  } catch (error) {
    showNotification("Ошибка загрузки прайс-листа", "error");
  }
}

async function deletePriceList(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/price-lists/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Прайс-лист удален", "success");
        loadPriceLists();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить этот прайс-лист?");
}

async function viewPriceList(id) {
  try {
    const [listRes, itemsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/price-lists/${id}`),
      fetch(`${API_BASE_URL}/price-lists/${id}/items`),
    ]);

    const listResult = await listRes.json();
    const items = await itemsRes.json();
    if (!listResult.success) throw new Error(listResult.message);

    const priceList = listResult.data;
    const itemsHtml =
      items.length > 0
        ? items
            .map(
              (item) =>
                `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border-color);"><span>${item.service_name}</span><span><strong>${formatCurrency(item.price)}</strong></span></div>`,
            )
            .join("")
        : '<p class="empty-state">Нет позиций</p>';

    const modalHtml = `
      <div class="modal-overlay active" id="viewPriceListModal" style="display:flex;">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3><i class="fas fa-file-invoice-dollar"></i> ${priceList.price_list_name}</h3>
            <button class="btn-close" onclick="document.getElementById('viewPriceListModal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:20px;">
              <p><strong>Описание:</strong> ${priceList.description || "Нет описания"}</p>
              <p><strong>Действует с:</strong> ${formatDate(priceList.valid_from)}</p>
              ${priceList.valid_to ? `<p><strong>Действует до:</strong> ${formatDate(priceList.valid_to)}</p>` : ""}
            </div>
            <h4>Позиции:</h4>
            <div style="background:var(--bg-secondary);padding:15px;border-radius:var(--border-radius);">${itemsHtml}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('viewPriceListModal').remove()">Закрыть</button>
            <button class="btn btn-primary" onclick="document.getElementById('viewPriceListModal').remove();editPriceList(${priceList.id});">Редактировать</button>
          </div>
        </div>
      </div>`;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    showNotification("Ошибка загрузки прайс-листа", "error");
  }
}

async function loadServicesForPriceList() {
  try {
    const response = await fetch(`${API_BASE_URL}/services?active=true`);
    servicesForPriceList = await response.json();
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

function addPriceListItem() {
  addPriceListItemWithData(null, null);
}

function addPriceListItemWithData(serviceId, price) {
  const container = document.getElementById("priceListItems");
  const newItem = document.createElement("div");
  newItem.className = "price-list-item";
  newItem.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
      <div style="flex:2;"><select class="item-service" style="width:100%;padding:8px;"><option value="">Выберите услугу</option></select></div>
      <div style="flex:1;"><input type="number" class="item-price" step="0.01" min="0" placeholder="Цена" value="${price || ""}" style="width:100%;padding:8px;"></div>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button>
    </div>`;
  container.appendChild(newItem);

  const select = newItem.querySelector(".item-service");
  loadServicesForSelect(select, serviceId);
}

async function loadServicesForSelect(selectElement, selectedServiceId = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/services?active=true`);
    const services = await response.json();
    let options = '<option value="">Выберите услугу</option>';
    services.forEach((s) => {
      options += `<option value="${s.id}" data-price="${s.base_price}" ${selectedServiceId == s.id ? "selected" : ""}>${s.service_code} - ${s.service_name}</option>`;
    });
    selectElement.innerHTML = options;
    selectElement.addEventListener("change", function () {
      const selected = this.options[this.selectedIndex];
      const priceInput =
        this.closest("div").parentElement.querySelector(".item-price");
      if (selected?.dataset.price && !priceInput.value) {
        priceInput.value = selected.dataset.price;
      }
    });
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

async function loadPriceListsForContractSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/price-lists`);
    const priceLists = await response.json();
    const select = document.getElementById("contractPriceList");
    select.innerHTML = '<option value="">Без прайс-листа</option>';
    priceLists.forEach((list) => {
      if (list.is_active) {
        select.innerHTML += `<option value="${list.id}">${list.price_list_name} (с ${formatDate(list.valid_from)})</option>`;
      }
    });
  } catch (error) {
    console.error("Ошибка:", error);
  }
}
