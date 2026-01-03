const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginError.textContent = "Preencha todos os campos.";
    return;
  }

  loginBtn.disabled = true;
  loginError.textContent = "";

  try {
    const res = await fetch("/SheiqAway/backend/auth/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      loginError.textContent = data.error || "Email ou password invalidos.";
      loginBtn.disabled = false;
      return;
    }

    if (data.user) {
      localStorage.setItem("loggedUser", JSON.stringify(data.user));
    }

    if (data.user && data.user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (err) {
    loginError.textContent = "Erro ao comunicar com o servidor.";
    loginBtn.disabled = false;
  }
});


