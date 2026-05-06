document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showError("Введите логин и пароль");
    return;
  }

  try {
    const res = await fetch("/api/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      window.location.href = "/profile";
    } else {
      showError(data.error || "Неверный логин или пароль");
    }
  } catch (error) {
    showError("Ошибка соединения с сервером");
  }
});

function showError(msg) {
  const el = document.getElementById("authError");
  el.querySelector("span").textContent = msg;
  el.style.display = "flex";
}
