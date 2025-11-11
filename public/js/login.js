const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

// Inicializa usuários de teste, caso não existam
if (!localStorage.getItem("users")) {
  const demoUsers = [
    { username: "User1", email: "user1@example.com", password: "123456" },
    { username: "User2", email: "user2@example.com", password: "senha123" },
  ];
  localStorage.setItem("users", JSON.stringify(demoUsers));
}

loginBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginError.textContent = "Preencha todos os campos.";
    return;
  }

  const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

  loginBtn.disabled = true;
  loginError.textContent = "";

  setTimeout(() => {
    // Busca usuário pelo email e senha
    const loggedUser = storedUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (loggedUser) {
      // Salva username, email e password no localStorage
      localStorage.setItem("loggedUser", JSON.stringify(loggedUser));
      window.location.href = "index.html";
    } else {
      loginError.textContent = "Email ou password inválidos.";
      loginBtn.disabled = false;
    }
  }, 500);
});
