const registerBtn = document.getElementById("registerBtn");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerError = document.getElementById("registerError");

registerBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !email || !password) {
    registerError.textContent = "Preencha todos os campos.";
    return;
  }

  registerBtn.disabled = true;
  registerError.textContent = "";

  try {
    const res = await fetch("/SheiqAway/backend/auth/register.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome: username, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      registerError.textContent = data.error || "Erro ao registar.";
      registerBtn.disabled = false;
      return;
    }

    window.location.href = "login.html";
  } catch (err) {
    registerError.textContent = "Erro ao comunicar com o servidor.";
    registerBtn.disabled = false;
  }
});


