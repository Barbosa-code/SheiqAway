// ================================
// 🔹 Simulação de autenticação local
// ================================

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // 🔸 REGISTO
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value.trim();
      const message = document.getElementById("registerMessage");

      let users = JSON.parse(localStorage.getItem("users")) || [];

      if (users.some((u) => u.email === email)) {
        message.textContent = "Já existe uma conta com este email!";
        message.style.color = "red";
        return;
      }

      users.push({ name, email, password });
      localStorage.setItem("users", JSON.stringify(users));

      message.textContent = "Conta criada com sucesso! Redirecionando...";
      message.style.color = "green";

      setTimeout(() => (window.location.href = "login.html"), 1500);
    });
  }

  // 🔸 LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      const message = document.getElementById("loginMessage");

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find((u) => u.email === email && u.password === password);

      if (!user) {
        message.textContent = "Credenciais incorretas!";
        message.style.color = "red";
        return;
      }

      localStorage.setItem("loggedUser", JSON.stringify(user));
      message.textContent = "Login efetuado com sucesso!";
      message.style.color = "green";

      setTimeout(() => (window.location.href = "index.html"), 1200);
    });
  }
});
