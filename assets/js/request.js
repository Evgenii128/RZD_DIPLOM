let services = [];
let selectedServices = new Map();

document.addEventListener("DOMContentLoaded", async function () {
  await loadServices();
  const date = new Date();
  date.setDate(date.getDate() + 3);
  const preferredDateInput = document.getElementById("preferred_date");
  if (preferredDateInput) {
    preferredDateInput.value = date.toISOString().split("T")[0];
  }
});

async function loadServices() {
  try {
    const response = await fetch("/api/services?active=true");
    if (!response.ok)
      throw new Error(`HTTP ошибка! статус: ${response.status}`);
    services = await response.json();

    const servicesList = document.getElementById("servicesList");
    if (services.length === 0) {
      servicesList.innerHTML =
        '<div class="empty-state"><i class="fas fa-concierge-bell"></i><p>Услуги временно недоступны</p></div>';
      return;
    }

    let html = "";
    services.forEach((service) => {
      html += `
        <div class="service-item" id="service-${service.id}">
          <input type="checkbox" class="service-checkbox" 
                 id="check-${service.id}" 
                 value="${service.id}"
                 data-price="${service.base_price}"
                 data-name="${service.service_name}"
                 onchange="toggleService(${service.id})">
          <div class="service-info">
            <div class="service-name">${escapeHtml(service.service_name)}</div>
            <div class="service-description">${escapeHtml(service.description || "Нет описания")} (${service.unit || "шт"})</div>
          </div>
          <div class="service-price">${formatCurrency(service.base_price)}</div>
          <div class="service-quantity" style="display: none;" id="quantity-${service.id}">
            <input type="number" min="1" step="1" value="1" 
                   onchange="updateServiceQuantity(${service.id}, this.value)"
                   onclick="event.stopPropagation()">
          </div>
        </div>
      `;
    });
    servicesList.innerHTML = html;
  } catch (error) {
    console.error("Ошибка загрузки услуг:", error);
    document.getElementById("servicesList").innerHTML = `
      <div class="empty-state" style="color: #e74c3c;">
        <i class="fas fa-exclamation-circle"></i>
        <p>Ошибка загрузки услуг: ${error.message}</p>
        <button onclick="loadServices()" style="margin-top: 15px;">
          <i class="fas fa-sync-alt"></i> Повторить
        </button>
      </div>
    `;
  }
}

function toggleService(serviceId) {
  const checkbox = document.getElementById(`check-${serviceId}`);
  const quantityDiv = document.getElementById(`quantity-${serviceId}`);

  if (checkbox.checked) {
    quantityDiv.style.display = "block";
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      const basePrice = parseFloat(service.base_price) || 0;
      selectedServices.set(serviceId, {
        service_id: serviceId,
        service_name: service.service_name,
        quantity: 1,
        price: basePrice,
        subtotal: basePrice,
      });
    }
  } else {
    quantityDiv.style.display = "none";
    selectedServices.delete(serviceId);
  }
  updateTotalPrice();
}

function updateServiceQuantity(serviceId, quantity) {
  let numQuantity = parseInt(quantity, 10);
  if (isNaN(numQuantity) || numQuantity < 1) numQuantity = 1;

  const service = services.find((s) => s.id === serviceId);
  if (service && selectedServices.has(serviceId)) {
    const item = selectedServices.get(serviceId);
    const price = parseFloat(item.price) || 0;
    item.quantity = numQuantity;
    item.subtotal = price * numQuantity;
    selectedServices.set(serviceId, item);

    const input = document.querySelector(`#quantity-${serviceId} input`);
    if (input) input.value = numQuantity;
  }
  updateTotalPrice();
}

function updateTotalPrice() {
  const totalPriceContainer = document.getElementById("totalPriceContainer");
  const totalPriceValue = document.getElementById("totalPriceValue");
  const selectedServicesData = document.getElementById("selectedServicesData");
  const totalAmount = document.getElementById("totalAmount");

  let total = 0;
  const selectedArray = [];

  for (let item of selectedServices.values()) {
    const subtotal = parseFloat(item.subtotal) || 0;
    total += subtotal;
    selectedArray.push({
      service_id: item.service_id,
      service_name: item.service_name,
      quantity: item.quantity,
      price: parseFloat(item.price) || 0,
      subtotal: subtotal,
    });
  }

  total = parseFloat(total) || 0;

  if (selectedArray.length > 0) {
    totalPriceContainer.style.display = "flex";
    totalPriceValue.textContent = formatCurrency(total);
    selectedServicesData.value = JSON.stringify(selectedArray);
    totalAmount.value = total.toFixed(2);
  } else {
    totalPriceContainer.style.display = "none";
    selectedServicesData.value = "";
    totalAmount.value = "0";
  }
}

document
  .getElementById("publicRequestForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    document.getElementById("errorContainer").style.display = "none";

    if (selectedServices.size === 0) {
      showError("Пожалуйста, выберите хотя бы одну услугу");
      return;
    }

    const submitBtn = document.getElementById("submitBtn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    submitBtn.disabled = true;

    const selectedServicesArray = Array.from(selectedServices.values()).map(
      (item) => ({
        service_id: item.service_id,
        service_name: item.service_name,
        quantity: item.quantity,
        price: parseFloat(item.price) || 0,
        subtotal: parseFloat(item.subtotal) || 0,
      }),
    );

    const totalAmount =
      parseFloat(document.getElementById("totalAmount").value) || 0;

    const formData = {
      full_name: document.getElementById("full_name").value,
      company_name: document.getElementById("company_name").value || null,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      preferred_date: document.getElementById("preferred_date").value || null,
      selected_services: selectedServicesArray,
      total_amount: totalAmount,
    };

    try {
      const response = await fetch("/api/public/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        document.getElementById("formContentWrapper").style.display = "none";
        document.getElementById("successBlock").style.display = "block";

        document.getElementById("successReqNumber").innerHTML =
          result.request_number;
        document.getElementById("successCustomerName").innerHTML = escapeHtml(
          formData.full_name,
        );
        document.getElementById("successTotalAmount").innerHTML =
          formatCurrency(totalAmount);

        const today = new Date();
        document.getElementById("currentDate").innerHTML =
          today.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

        const summaryList = document.getElementById("summaryServicesList");
        summaryList.innerHTML = "";
        selectedServicesArray.forEach((item) => {
          const row = document.createElement("div");
          row.className = "service-row-modern";
          row.innerHTML = `
          <div class="service-name-modern">
            <i class="fas fa-cog"></i>
            ${escapeHtml(item.service_name)} × ${item.quantity}
          </div>
          <div class="service-price-modern">${formatCurrency(item.subtotal)}</div>
        `;
          summaryList.appendChild(row);
        });
      } else {
        throw new Error(result.error || "Неизвестная ошибка");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      showError("Ошибка: " + error.message);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

function showError(message) {
  document.getElementById("errorText").textContent = message;
  document.getElementById("errorContainer").style.display = "flex";
  setTimeout(() => {
    document.getElementById("errorContainer").style.display = "none";
  }, 5000);
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function (m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}
