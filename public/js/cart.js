// -------------------------
// INICIALIZAÇÃO
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // ELEMENTOS DO DOM
  // -------------------------
  const cartContainer = document.getElementById("cartContainer");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const totalPriceElement = document.getElementById("totalPrice");
  const cartSummary = document.getElementById("cartSummary");

  // -------------------------
  // FUNÇÃO PARA BUSCAR OS BILHETES DO CARRINHO NO LOCALSTORAGE
  // -------------------------
  function getTicketsFromLocalStorage() {
    return JSON.parse(localStorage.getItem("cartTickets")) || [];
  }

  // -------------------------
  // FUNÇÃO PARA EXIBIR OS BILHETES NO CARRINHO
  // -------------------------
  function displayCartTickets() {
    if (!cartContainer || !cartSummary) return;

    const tickets = getTicketsFromLocalStorage();

    cartContainer.innerHTML = "";
    cartSummary.innerHTML = "";

    if (tickets.length === 0) {
      cartContainer.innerHTML = "<p>O carrinho está vazio.</p>";
      if (checkoutBtn) checkoutBtn.style.display = "none";
      if (totalPriceElement) totalPriceElement.textContent = "Total: €0.00";
      return;
    }

    if (checkoutBtn) checkoutBtn.style.display = "block";

    const totalPrice = tickets.reduce((total, t) => total + t.price, 0);
    if (totalPriceElement)
      totalPriceElement.textContent = `Total: €${totalPrice.toFixed(2)}`;

    tickets.forEach((ticket, index) => {
      const ticketCard = document.createElement("div");
      ticketCard.className = "ticket-card";

      ticketCard.innerHTML = `
        <h3>${ticket.from} → ${ticket.to}</h3>
        <p>Data: ${ticket.date} | Hora: ${ticket.depart} - ${ticket.arrive}</p>
        <p>Duração: ${ticket.durationMin} min | Stops: ${ticket.stops}</p>
        <p>Preço: €${ticket.price.toFixed(2)}</p>
        <p>Tipo: ${ticket.mode || "N/A"}</p>
        <p>Empresa: ${
          ticket.provider || ticket.providerName || "Não especificado"
        }</p>
        <button class="deleteBtn" data-index="${index}">
          <i class="fas fa-trash"></i> Remover
        </button>
      `;

      cartContainer.appendChild(ticketCard);

      // Adiciona ao resumo lateral
      if (cartSummary) {
        const summaryItem = document.createElement("li");
        summaryItem.innerHTML = `
          <span>${ticket.from} → ${ticket.to}</span>
          <span>€${ticket.price.toFixed(2)}</span>
        `;
        cartSummary.appendChild(summaryItem);
      }
    });

    // Botões de remover
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = e.target.closest("button")?.dataset.index;
        if (index !== undefined) removeTicketFromCart(Number(index));
      });
    });
  }

  // -------------------------
  // FUNÇÃO PARA REMOVER UM BILHETE
  // -------------------------
  function removeTicketFromCart(index) {
    const tickets = getTicketsFromLocalStorage();
    tickets.splice(index, 1);
    localStorage.setItem("cartTickets", JSON.stringify(tickets));
    displayCartTickets();
  }

  // -------------------------
  // FINALIZAR COMPRA
  // -------------------------
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const tickets = getTicketsFromLocalStorage();
      if (tickets.length === 0) {
        alert(
          "O carrinho está vazio. Adicione bilhetes antes de finalizar a compra."
        );
        return;
      }

      const purchasedTickets =
        JSON.parse(localStorage.getItem("userTrips")) || [];

      const ticketsWithId = tickets.map((t) => ({
        ...t,
        id: Date.now() + Math.random(),
        provider: t.provider || t.providerName || "Não especificado", // garante provider
      }));

      const updatedPurchasedTickets = [...purchasedTickets, ...ticketsWithId];
      localStorage.setItem(
        "userTrips",
        JSON.stringify(updatedPurchasedTickets)
      );

      localStorage.removeItem("cartTickets");
      displayCartTickets();

      alert("Compra finalizada com sucesso!");
    });
  }

  function updateCartCount() {
    const tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    const cartCount = document.getElementById("cartCount");
    cartCount.textContent = tickets.length;
  }
  document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
  });
  // -------------------------
  // INICIALIZAÇÃO
  // -------------------------
  displayCartTickets();
});
