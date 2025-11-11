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
  const tickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
  return tickets;
}

// -------------------------
// FUNÇÃO PARA EXIBIR OS BILHETES NO CARRINHO
// -------------------------
function displayCartTickets() {
  const tickets = getTicketsFromLocalStorage();

  // Limpa o container do carrinho e o resumo
  cartContainer.innerHTML = "";
  cartSummary.innerHTML = "";

  // Verifica se há bilhetes no carrinho
  if (tickets.length === 0) {
    cartContainer.innerHTML = "<p>O carrinho está vazio.</p>";
    checkoutBtn.style.display = "none"; // Esconde o botão de finalizar compra
    totalPriceElement.textContent = "Total: €0.00";
    return;
  }

  // Mostra o botão de finalizar compra
  checkoutBtn.style.display = "block";

  // Calcula o preço total
  const totalPrice = tickets.reduce((total, ticket) => total + ticket.price, 0);
  totalPriceElement.textContent = `Total: €${totalPrice.toFixed(2)}`;

  // Cria os cartões para cada bilhete
  tickets.forEach((ticket, index) => {
    const ticketCard = document.createElement("div");
    ticketCard.className = "ticket-card";

    ticketCard.innerHTML = `
      <h3>${ticket.from} → ${ticket.to}</h3>
      <p>Data: ${ticket.date} | Hora: ${ticket.depart} - ${ticket.arrive}</p>
      <p>Duração: ${ticket.durationMin} min | Stops: ${ticket.stops}</p>
      <p>Preço: €${ticket.price.toFixed(2)}</p>
      <p>Tipo: ${ticket.mode ? ticket.mode : "N/A"}</p>
      <p>Empresa: ${ticket.provider}</p>
      <button class="deleteBtn" data-index="${index}">
        <i class="fas fa-trash"></i> Remover
      </button>
    `;

    cartContainer.appendChild(ticketCard);

    // Adiciona o bilhete ao resumo da barra lateral
    const summaryItem = document.createElement("li");
    summaryItem.innerHTML = `
      <span>${ticket.from} → ${ticket.to}</span>
      <span>€${ticket.price.toFixed(2)}</span>
    `;
    cartSummary.appendChild(summaryItem);
  });

  // Adiciona eventos aos botões de remover
  const deleteButtons = document.querySelectorAll(".deleteBtn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      removeTicketFromCart(index);
    });
  });
}

// -------------------------
// FUNÇÃO PARA REMOVER UM BILHETE DO CARRINHO
// -------------------------
function removeTicketFromCart(index) {
  const tickets = getTicketsFromLocalStorage();

  // Remove o bilhete do array
  tickets.splice(index, 1);

  // Atualiza o localStorage
  localStorage.setItem("cartTickets", JSON.stringify(tickets));

  // Atualiza a exibição do carrinho
  displayCartTickets();
}

// -------------------------
// FUNÇÃO PARA FINALIZAR A COMPRA
// -------------------------
checkoutBtn.addEventListener("click", () => {
  const tickets = getTicketsFromLocalStorage();

  if (tickets.length === 0) {
    alert("O carrinho está vazio. Adicione bilhetes antes de finalizar a compra.");
    return;
  }

  // Limpa o carrinho
  localStorage.removeItem("cartTickets");

  // Atualiza a exibição do carrinho
  displayCartTickets();

  // Exibe uma mensagem de sucesso
  alert("Compra finalizada com sucesso! Obrigado por escolher a SheiqAway.");
});

// -------------------------
// INICIALIZAÇÃO
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  displayCartTickets();
});