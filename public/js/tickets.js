// -------------------------
// ELEMENTOS DO DOM
// -------------------------
const ticketsContainer = document.getElementById("ticketsContainer");
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtnNav = document.getElementById("loginBtn");

// -------------------------
// VERIFICA LOGIN
// -------------------------
let loggedUser = JSON.parse(localStorage.getItem("loggedUser")) || null;

// Atualiza UI da navbar
function updateUserUI() {
  if (loggedUser) {
    if (userInfo) {
      userInfo.textContent = `Bem-vindo, ${loggedUser.username}`;
      userInfo.style.display = "inline-block";
    }
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (loginBtnNav) loginBtnNav.style.display = "none";
  } else {
    if (userInfo) userInfo.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (loginBtnNav) loginBtnNav.style.display = "inline-block";
  }
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    loggedUser = null;
    updateUserUI();
    window.location.href = "index.html";
  });
}

// Login
if (loginBtnNav) {
  loginBtnNav.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// -------------------------
// BILHETES
// -------------------------

// Recupera bilhetes do usuário
function getUserTickets() {
  const allTickets = JSON.parse(localStorage.getItem("tickets")) || [];
  if (!loggedUser) return [];
  return allTickets.filter((ticket) => ticket.username === loggedUser.username);
}

// Salva todos os bilhetes
function saveTickets(allTickets) {
  localStorage.setItem("tickets", JSON.stringify(allTickets));
}

// Renderiza bilhetes na página
function displayTickets() {
  if (!ticketsContainer) return;

  const tickets = getUserTickets();
  ticketsContainer.innerHTML = "";

  if (tickets.length === 0) {
    ticketsContainer.innerHTML =
      "<p>Você ainda não comprou nenhum bilhete.</p>";
    return;
  }

  tickets.forEach((ticket) => {
    const card = document.createElement("div");
    card.className = "ticket-card";

    card.innerHTML = `
      <h3>${ticket.from} → ${ticket.to}</h3>
      <p>Data: <span class="ticket-date">${ticket.date}</span></p>
      <p>Hora: ${ticket.depart} - ${ticket.arrive}</p>
      <p>Duração: ${ticket.durationMin} min | Stops: ${ticket.stops}</p>
      <p>Preço: €${ticket.price.toFixed(2)}</p>
      <button class="deleteBtn">Apagar Bilhete</button>
    `;

    // Apagar bilhete
    const deleteBtn = card.querySelector(".deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        let allTickets = JSON.parse(localStorage.getItem("tickets")) || [];
        allTickets = allTickets.filter(
          (t) => !(t.username === ticket.username && t.id === ticket.id)
        );
        saveTickets(allTickets);
        displayTickets(); // Atualiza lista após apagar
      });
    }

    ticketsContainer.appendChild(card);
  });
}
function getTicketsFromLocalStorage() {
  const tickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
  return tickets;
}

// -------------------------
// INICIALIZAÇÃO
// -------------------------
updateUserUI();
displayTickets();
