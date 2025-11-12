// -------------------------
// INICIALIZAÇÃO
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
function createTicketFromTrip(trip, username) {
  return {
    id: Date.now() + Math.random(),
    username: username,
    from: trip.from,
    to: trip.to,
    date: trip.date,
    depart: trip.depart,
    arrive: trip.arrive,
    durationMin: trip.durationMin,
    stops: trip.stops,
    price: trip.price.base || trip.price || 0,
    mode: trip.mode || "",
    provider: trip.providerName || trip.provider || "Não especificado",
  };
}


  // -------------------------
  // BILHETES
  // -------------------------
  function getUserTickets() {
    if (!loggedUser) return [];

    // Bilhetes antigos
    const oldTickets = JSON.parse(localStorage.getItem("tickets")) || [];

    // Bilhetes comprados no carrinho
    const purchasedTickets =
      JSON.parse(localStorage.getItem("userTrips")) || [];

    // Filtra pelo usuário logado e garante que o provider exista
    const userOldTickets = oldTickets
      .filter((ticket) => ticket.username === loggedUser.username)
      .map((t) => ({
        ...t,
        provider: t.provider || t.providerName || "Não especificado",
      }));

    const userPurchasedTickets = purchasedTickets
      .filter((ticket) => ticket.username === loggedUser.username)
      .map((t) => ({
        ...t,
        provider: t.provider || t.providerName || "Não especificado",
      }));

    return [...userOldTickets, ...userPurchasedTickets];
  }

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
        <p>Tipo: ${ticket.mode || "N/A"}</p>
        <p>Empresa: ${ticket.provider}</p>
        <button class="deleteBtn">Apagar Bilhete</button>
      `;

      // Apagar bilhete
      const deleteBtn = card.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          let allTickets = JSON.parse(localStorage.getItem("tickets")) || [];
          let userTrips = JSON.parse(localStorage.getItem("userTrips")) || [];

          allTickets = allTickets.filter(
            (t) => !(t.username === ticket.username && t.id === ticket.id)
          );
          userTrips = userTrips.filter(
            (t) => !(t.username === ticket.username && t.id === ticket.id)
          );

          localStorage.setItem("tickets", JSON.stringify(allTickets));
          localStorage.setItem("userTrips", JSON.stringify(userTrips));

          displayTickets(); // Atualiza lista
        });
      }

      ticketsContainer.appendChild(card);
    });
  }

  // -------------------------
  // INICIALIZAÇÃO
  // -------------------------
  updateUserUI();
  displayTickets();
});
