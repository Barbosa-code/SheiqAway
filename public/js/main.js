// -------------------------
// ELEMENTOS DO DOM
// -------------------------
const tripsContainer = document.getElementById("tripsContainer");
const searchBtn = document.getElementById("searchBtn");
const sortSelect = document.getElementById("sort");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const dateInput = document.getElementById("date");

// Modal de login
const loginModal = document.getElementById("loginModal");
const closeModal = document.querySelector(".close");
const goLoginBtn = document.getElementById("goLogin");

// -------------------------
// VARIÁVEIS DE ESTADO
// -------------------------
let trips = [];
let currentPage = 1;
const tripsPerPage = 6;

// -------------------------
// BUSCAR VIAGENS
// -------------------------
async function fetchTripsAndProviders() {
  try {
    // Busca as viagens
    const tripsResponse = await fetch("data/trips.json");
    const tripsData = await tripsResponse.json();

    // Busca os providers
    const providersResponse = await fetch("data/providers.json");
    const providersData = await providersResponse.json();

    // Adiciona os detalhes do provider às viagens
    trips = tripsData.map((trip) => {
      const provider = providersData.find((p) => p.id === trip.provider); // Associa pelo ID

      // Adiciona logs para depuração
      console.log("Trip Provider ID:", trip.provider);
      console.log("Matched Provider:", provider);

      return {
        ...trip,
        providerName: provider ? provider.name : "Não especificado", // Nome do provider
        providerLogo: provider ? provider.logo : null, // Logo do provider
      };
    });

    // Exibe as viagens e configura a paginação
    displayTrips(trips);
    setupPagination(trips);
  } catch (error) {
    console.error("Erro ao carregar viagens ou providers:", error);
    tripsContainer.innerHTML = "<p>Não foi possível carregar as viagens.</p>";
  }
}

// -------------------------
// CRIAR CARD DE VIAGEM
// -------------------------
function createTripCard(trip) {
  const card = document.createElement("div");
  card.className = "trip-card";

  card.innerHTML = `    
    <h3>${trip.from} → ${trip.to}</h3>    
    <p>Data: ${trip.date} | Hora: ${trip.depart} - ${trip.arrive}</p>    
    <p>Duração: ${trip.durationMin} min | Stops: ${trip.stops}</p>    
    <p>Preço: €${trip.price.base.toFixed(2)}</p>    
    <p>Tipo: ${trip.mode ? trip.mode : "N/A"}</p>    
    <p>Empresa: ${trip.providerName}</p>    
    ${
      trip.providerLogo
        ? `<img src="${trip.providerLogo}" alt="${trip.providerName}" class="provider-logo">`
        : ""
    }    
    <button class="buyBtn">Adicionar ao Carrinho</button>    
  `;

  // Comprar → salva bilhete no localStorage e redireciona para o carrinho
  card.querySelector(".buyBtn").addEventListener("click", () => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

    if (!loggedUser) {
      loginModal.style.display = "block";
      return;
    }

    // Obter os bilhetes do carrinho do localStorage
    const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];

    // Criar o bilhete a ser adicionado ao carrinho
    const ticket = {
      id: Date.now(),
      username: loggedUser.username,
      from: trip.from,
      to: trip.to,
      date: trip.date,
      depart: trip.depart,
      arrive: trip.arrive,
      durationMin: trip.durationMin,
      stops: trip.stops,
      price: trip.price.base,
      mode: trip.mode || "",
      provider: trip.providerName || "Não especificado", // Adiciona o nome do provider ao bilhete
    };

    // Adicionar o bilhete ao carrinho
    cartTickets.push(ticket);
    localStorage.setItem("cartTickets", JSON.stringify(cartTickets));
    alert("Bilhete adicionado ao carrinho com sucesso!");

    
  });

  return card;
}

function updateCartCount() {
  const tickets = JSON.parse(localStorage.getItem("tickets")) || [];
  const cartCount = document.getElementById("cartCount");
  cartCount.textContent = tickets.length;
}

// Atualiza o contador ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
});

// -------------------------
// EXIBIR VIAGENS
// -------------------------
function displayTrips(tripsList) {
  tripsContainer.innerHTML = "";

  const start = (currentPage - 1) * tripsPerPage;
  const end = start + tripsPerPage;
  const paginatedTrips = tripsList.slice(start, end);

  if (paginatedTrips.length === 0) {
    tripsContainer.innerHTML = "<p>Nenhuma viagem encontrada.</p>";
    return;
  }

  paginatedTrips.forEach((trip) => {
    tripsContainer.appendChild(createTripCard(trip));
  });
}

function displayProviders(providers) {
  // Limpa o conteúdo anterior
  providersContainer.innerHTML = "";

  // Verifica se há providers disponíveis
  if (providers.length === 0) {
    providersContainer.innerHTML = "<p>Nenhum fornecedor encontrado.</p>";
    return;
  }

  // Cria os elementos HTML para cada provider
  providers.forEach((provider) => {
    const providerCard = document.createElement("div");
    providerCard.className = "provider-card";

    providerCard.innerHTML = `
      <h3>${provider.name}</h3>
      <p>${provider.description}</p>
      <p><strong>Website:</strong> <a href="${provider.website}" target="_blank">${provider.website}</a></p>`;

    providersContainer.appendChild(providerCard);
  });
}

// -------------------------
// FILTROS E ORDENAÇÃO
// -------------------------
function applyFilters() {
  let filtered = trips;

  const fromValue = fromInput.value.trim().toLowerCase();
  const toValue = toInput.value.trim().toLowerCase();
  const dateValue = dateInput.value;

  if (fromValue)
    filtered = filtered.filter((t) => t.from.toLowerCase().includes(fromValue));
  if (toValue)
    filtered = filtered.filter((t) => t.to.toLowerCase().includes(toValue));
  if (dateValue) filtered = filtered.filter((t) => t.date === dateValue);

  const sortValue = sortSelect.value;
  if (sortValue === "price")
    filtered.sort((a, b) => a.price.base - b.price.base);
  else if (sortValue === "duration")
    filtered.sort((a, b) => a.durationMin - b.durationMin);

  currentPage = 1;
  displayTrips(filtered);
  setupPagination(filtered);
}

// -------------------------
// PAGINAÇÃO
// -------------------------
function setupPagination(tripsList) {
  let paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) {
    const div = document.createElement("div");
    div.id = "pagination";
    div.className = "pagination";
    tripsContainer.after(div);
    paginationContainer = div;
  }

  const totalPages = Math.ceil(tripsList.length / tripsPerPage);
  paginationContainer.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = i;
      displayTrips(tripsList);
      setupPagination(tripsList);
    });
    paginationContainer.appendChild(btn);
  }
}

// -------------------------
// EVENTOS
// -------------------------
searchBtn.addEventListener("click", applyFilters);
[fromInput, toInput, dateInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (!input.value) applyFilters();
  });
});
sortSelect.addEventListener("change", applyFilters);

// Modal de login
closeModal.addEventListener("click", () => (loginModal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
});
goLoginBtn.addEventListener(
  "click",
  () => (window.location.href = "login.html")
);

// -------------------------
// INICIALIZAÇÃO
// -------------------------
fetchTripsAndProviders();
