const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

// Lista de utilizadores de demonstração
const users = [
  { email: "user1@example.com", password: "123456" },
  { email: "user2@example.com", password: "senha123" },
];

loginBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    // Login bem-sucedido → redireciona para a página principal
    window.location.href = "index.html";
  } else {
    loginError.textContent = "Email ou password inválidos.";
  }
});
