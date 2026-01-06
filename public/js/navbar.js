// navbar.js
async function loadNavbar() {
  const container = document.getElementById("navbar-container");
  if (!container) return;

  const response = await fetch("navbar.html");
  const html = await response.text();
  container.innerHTML = html;

  const userInfo = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const logoLink = container.querySelector(".logo");
  const adminLinks = container.querySelectorAll(".nav-admin");
  const defaultLinks = container.querySelectorAll(".nav-default");

  let loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

  function updateUserUI() {
    if (loggedUser) {
      const name = loggedUser.nome || loggedUser.username || loggedUser.email;
      userInfo.textContent = ` ${name}`;
      userInfo.style.display = "inline-block";
      logoutBtn.style.display = "inline-block";
      loginBtn.style.display = "none";
      if (loggedUser.role === "admin") {
        if (logoLink) logoLink.href = "admin-dashboard.html";
        defaultLinks.forEach((link) => (link.style.display = "none"));
        adminLinks.forEach((link) => (link.style.display = "inline-block"));
      } else {
        if (logoLink) logoLink.href = "index.html";
        defaultLinks.forEach((link) => (link.style.display = "inline-block"));
        adminLinks.forEach((link) => (link.style.display = "none"));
      }
    } else {
      if (logoLink) logoLink.href = "index.html";
      userInfo.style.display = "none";
      logoutBtn.style.display = "none";
      loginBtn.style.display = "inline-block";
      defaultLinks.forEach((link) => (link.style.display = "inline-block"));
      adminLinks.forEach((link) => (link.style.display = "none"));
    }
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/SheiqAway/backend/auth/logout.php", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
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

loadNavbar();


