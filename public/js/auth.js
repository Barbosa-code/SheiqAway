// ================================
// 🔹 Autenticação + Pontos (LocalStorage)
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // Helpers globais para outros ficheiros
  window.getLoggedUser = function () {
    try { return JSON.parse(localStorage.getItem("loggedUser")) || null; }
    catch { return null; }
  };

  window.setLoggedUser = function (user) {
    localStorage.setItem("loggedUser", JSON.stringify(user));
  };

  // Atualiza o objeto do utilizador na lista e no loggedUser
  window.syncLoggedUser = function (updater) {
    const lu = window.getLoggedUser();
    if (!lu) return null;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const idx = users.findIndex(u => u.email === lu.email);

    // garantir estrutura de pontos
    if (idx >= 0 && typeof users[idx].points !== "number") {
      users[idx].points = 0;
    }

    const updated = updater(idx >= 0 ? users[idx] : lu) || (idx >= 0 ? users[idx] : lu);

    if (idx >= 0) users[idx] = updated;
    localStorage.setItem("users", JSON.stringify(users));
    window.setLoggedUser(updated);
    return updated;
  };

  // Pontos — APIs globais
  window.getUserPoints = function (email) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const u = users.find(x => x.email === email);
    return typeof u?.points === "number" ? u.points : 0;
  };

  window.updateUserPoints = function (email, delta) {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const i = users.findIndex(u => u.email === email);
    if (i < 0) return null;
    if (typeof users[i].points !== "number") users[i].points = 0;
    users[i].points = Math.max(0, users[i].points + Number(delta || 0));
    localStorage.setItem("users", JSON.stringify(users));

    const lu = window.getLoggedUser();
    if (lu?.email === email) {
      lu.points = users[i].points;
      window.setLoggedUser(lu);
    }
    return users[i].points;
  };

  // Resgata pontos convertendo em €
  // ex.: 100 pts => 5€ (ajusta a taxa se quiseres)
  window.redeemPoints = function (email, pointsToUse, rate = { pts: 100, eur: 5 }) {
    const current = window.getUserPoints(email);
    const use = Math.min(current, Math.max(0, Math.floor(pointsToUse)));
    if (use <= 0) return { used: 0, discount: 0, remaining: current };
    const discount = (use / rate.pts) * rate.eur;
    const remaining = window.updateUserPoints(email, -use);
    return { used: use, discount, remaining };
  };

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

      // inicia com pontos = 0
      users.push({ name, email, password, points: 0 });
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

      // compatibilidade: garantir points numérico
      if (typeof user.points !== "number") user.points = 0;

      localStorage.setItem("loggedUser", JSON.stringify(user));
      // também persistir a correção no array (se necessário)
      const idx = users.findIndex(u => u.email === user.email);
      if (idx >= 0) {
        users[idx] = user;
        localStorage.setItem("users", JSON.stringify(users));
      }

      message.textContent = "Login efetuado com sucesso!";
      message.style.color = "green";

      setTimeout(() => (window.location.href = "index.html"), 1200);
    });
  }
});
