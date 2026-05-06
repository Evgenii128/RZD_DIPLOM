async function loadUsers() {
  try {
    const tableBody = document.getElementById("usersTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="8" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const search = document.getElementById("userSearch")?.value || "";
    let url = `${API_BASE_URL}/users`;
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const users = await response.json();
    tableBody.innerHTML = "";

    if (users.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="empty-state"><i class="fas fa-users"></i><p>Пользователи не найдены</p></td></tr>';
      return;
    }

    users.forEach((user) => {
      const row = document.createElement("tr");
      const roleBadge =
        user.role === "admin"
          ? '<span class="status-badge active">Админ</span>'
          : '<span class="status-badge pending">Клиент</span>';

      const activeBadge = user.is_active
        ? '<span class="status-badge paid">Активен</span>'
        : '<span class="status-badge cancelled">Заблокирован</span>';

      const lastLogin = user.last_login
        ? new Date(user.last_login).toLocaleString("ru-RU")
        : "Никогда";

      row.innerHTML = `
        <td><strong>${user.username}</strong></td>
        <td>${user.email}</td>
        <td>${user.first_name || ""} ${user.last_name || ""}</td>
        <td>${user.phone || "-"}</td>
        <td>${roleBadge}</td>
        <td>${activeBadge}</td>
        <td><small>${lastLogin}</small></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" onclick="editUser(${user.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    showNotification("Ошибка загрузки пользователей", "error");
  }
}

async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const userData = {
    username: document.getElementById("userUsername").value,
    email: document.getElementById("userEmail").value,
    role: document.getElementById("userRole").value,
    first_name: document.getElementById("userFirstName").value,
    last_name: document.getElementById("userLastName").value,
    phone: document.getElementById("userPhone").value,
    is_active: document.getElementById("userActive").checked,
  };

  const password = document.getElementById("userPassword").value;
  if (password) userData.password = password;

  try {
    const url = userId
      ? `${API_BASE_URL}/users/${userId}`
      : `${API_BASE_URL}/users`;
    const method = userId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("userModal");
      loadUsers();
      showNotification(
        userId ? "Пользователь обновлён" : "Пользователь создан",
        "success",
      );
      document.getElementById("userForm").reset();
      document.getElementById("userId").value = "";
    } else throw new Error(result.error || "Ошибка");
  } catch (error) {
    showNotification("Ошибка сохранения: " + error.message, "error");
  }
}

async function editUser(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    const user = result.user;
    document.getElementById("userId").value = user.id;
    document.getElementById("userUsername").value = user.username;
    document.getElementById("userEmail").value = user.email;
    document.getElementById("userRole").value = user.role;
    document.getElementById("userFirstName").value = user.first_name || "";
    document.getElementById("userLastName").value = user.last_name || "";
    document.getElementById("userPhone").value = user.phone || "";
    document.getElementById("userActive").checked = user.is_active;
    document.getElementById("userPassword").value = "";

    showModal("userModal");
  } catch (error) {
    showNotification("Ошибка загрузки пользователя", "error");
  }
}

async function deleteUser(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Пользователь удалён", "success");
        loadUsers();
      } else throw new Error(result.error);
    } catch (error) {
      showNotification("Ошибка удаления: " + error.message, "error");
    }
  }, "Удалить этого пользователя?");
}

function searchUsers() {
  clearTimeout(window._userSearchTimeout);
  window._userSearchTimeout = setTimeout(loadUsers, 500);
}
