const registerBtn = document.getElementById("registerBtn");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerError = document.getElementById("registerError");

registerBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !email || !password) {
    registerError.textContent = "Preencha todos os campos.";
    return;
  }

  const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

  // Verifica se já existe o email
  if (storedUsers.some(u => u.email === email)) {
    registerError.textContent = "Este email já está registado.";
    return;
  }

  // Cria novo usuário
  const newUser = { username, email, password };
  storedUsers.push(newUser);

  // Salva no localStorage
  localStorage.setItem("users", JSON.stringify(storedUsers));

  // Opcional: já loga o usuário imediatamente após registrar
  // localStorage.setItem("loggedUser", JSON.stringify(newUser));

  // Redireciona para login
  window.location.href = "login.html";
});
