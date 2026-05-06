function initModals() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) closeModal(this.id);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const openModal = document.querySelector(".modal-overlay.active");
      if (openModal) closeModal(openModal.id);
    }
  });

  const serviceActiveCheckbox = document.getElementById("serviceActive");
  if (serviceActiveCheckbox) {
    serviceActiveCheckbox.addEventListener("change", function () {
      const statusText = document.getElementById("serviceStatusText");
      if (statusText) {
        if (this.checked) {
          statusText.textContent = "Активна";
          statusText.className = "switch-status active";
        } else {
          statusText.textContent = "Неактивна";
          statusText.className = "switch-status inactive";
        }
      }
    });
  }

  const priceListActiveCheckbox = document.getElementById("priceListActive");
  if (priceListActiveCheckbox) {
    priceListActiveCheckbox.addEventListener("change", function () {
      const statusText = document.getElementById("priceListStatusText");
      if (statusText) {
        if (this.checked) {
          statusText.textContent = "Активен";
          statusText.className = "switch-status active";
        } else {
          statusText.textContent = "Неактивен";
          statusText.className = "switch-status inactive";
        }
      }
    });
  }

  const userActiveCheckbox = document.getElementById("userActive");
  if (userActiveCheckbox) {
    userActiveCheckbox.addEventListener("change", function () {
      const statusText = document.getElementById("userStatusText");
      if (statusText) {
        if (this.checked) {
          statusText.textContent = "Активен";
          statusText.className = "switch-status active";
        } else {
          statusText.textContent = "Заблокирован";
          statusText.className = "switch-status inactive";
        }
      }
    });
  }
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  if (modalId === "contractModal") {
    loadClientsForContractSelect();
    loadPriceListsForContractSelect();
  }
  if (modalId === "invoiceModal") loadContractsForInvoiceSelect();
  if (modalId === "priceListModal") loadServicesForPriceList();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove("active");
  document.body.style.overflow = "";

  const form = modal.querySelector("form");
  if (form) {
    form.reset();
    const hiddenId = form.querySelector('input[type="hidden"]');
    if (hiddenId) hiddenId.value = "";
  }

  if (modalId === "serviceModal") {
    document.getElementById("priceListItems").innerHTML = "";
    const statusText = document.getElementById("serviceStatusText");
    if (statusText) {
      statusText.textContent = "Активна";
      statusText.className = "switch-status active";
    }
  }

  if (modalId === "priceListModal") {
    document.getElementById("priceListItems").innerHTML = "";
    const statusText = document.getElementById("priceListStatusText");
    if (statusText) {
      statusText.textContent = "Активен";
      statusText.className = "switch-status active";
    }
  }

  if (modalId === "userModal") {
    const statusText = document.getElementById("userStatusText");
    if (statusText) {
      statusText.textContent = "Активен";
      statusText.className = "switch-status active";
    }
  }
}

function askDelete(action, message = "Вы уверены?") {
  currentDeleteAction = action;
  document.getElementById("deleteModalText").textContent = message;
  showModal("deleteModal");
}
