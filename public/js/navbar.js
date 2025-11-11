// navbar.js
async function loadNavbar() {
  const container = document.getElementById("navbar-container");
  if (!container) return;

  const response = await fetch("navbar.html");
  const html = await response.text();
  container.innerHTML = html;

  // Agora inicialize a sessão
  const userInfo = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");

  let loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

  function updateUserUI() {
    if (loggedUser) {
      userInfo.textContent = `Bem-vindo, ${loggedUser.username}`;
      userInfo.style.display = "inline-block";
      logoutBtn.style.display = "inline-block";
      loginBtn.style.display = "none";
    } else {
      userInfo.style.display = "none";
      logoutBtn.style.display = "none";
      loginBtn.style.display = "inline-block";
    }
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    loggedUser = null;
    updateUserUI();
    window.location.href = "index.html";
  });

  loginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });

  updateUserUI();
}

// Chama a função
loadNavbar();
