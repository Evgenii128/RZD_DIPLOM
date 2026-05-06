document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;

    if (password !== password2) {
      showError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      showError("Пароль должен быть не менее 6 символов");
      return;
    }

    const formData = {
      username: document.getElementById("username").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: password,
      first_name: document.getElementById("first_name").value.trim(),
      last_name: document.getElementById("last_name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      company_name: document.getElementById("company").value.trim(),
    };

    try {
      const res = await fetch("/api/client/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("authError").style.display = "none";
        const success = document.getElementById("authSuccess");
        success.querySelector("span").textContent =
          "Регистрация успешна! Сейчас вы будете перенаправлены на страницу входа...";
        success.style.display = "flex";
        setTimeout(() => {
          window.location.href = "/login";
        }, 2500);
      } else {
        showError(data.error || "Ошибка регистрации");
      }
    } catch (error) {
      showError("Ошибка соединения с сервером");
    }
  });

function showError(msg) {
  const el = document.getElementById("authError");
  el.querySelector("span").textContent = msg;
  el.style.display = "flex";
  document.getElementById("authSuccess").style.display = "none";
}
