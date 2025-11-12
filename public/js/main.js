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
// FUNÇÃO PARA ATUALIZAR CONTADOR DO CARRINHO
// -------------------------
function updateCartCount() {
  const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
  const cartCount = document.getElementById("cartCount");
  if (cartCount) cartCount.textContent = cartTickets.length;
}

// -------------------------
// BUSCAR VIAGENS E PROVIDERS
// -------------------------
async function fetchTripsAndProviders() {
  try {
    const tripsResponse = await fetch("data/trips.json");
    const tripsData = await tripsResponse.json();

    const providersResponse = await fetch("data/providers.json");
    const providersData = await providersResponse.json();

    // Adiciona providerName e providerLogo a cada viagem
    trips = tripsData.map((trip) => {
      const provider = providersData.find((p) => p.id === trip.provider);
      return {
        ...trip,
        providerName: provider ? provider.name : "Não especificado",
        providerLogo: provider ? provider.logo : null,
      };
    });

    displayTrips(trips);
    setupPagination(trips);
  } catch (error) {
    console.error("Erro ao carregar viagens ou providers:", error);
    if (tripsContainer)
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
    <p>Tipo: ${trip.mode || "N/A"}</p>
    <p>Empresa: ${trip.providerName}</p>
    ${
      trip.providerLogo
        ? `<img src="${trip.providerLogo}" alt="${trip.providerName}" class="provider-logo">`
        : ""
    }
    <button class="buyBtn">Adicionar ao Carrinho</button>
  `;

  // Adicionar ao carrinho
  card.querySelector(".buyBtn").addEventListener("click", () => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    if (!loggedUser) {
      loginModal.style.display = "block";
      return;
    }

    const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];

    const ticket = {
      id: Date.now() + Math.random(),
      username: loggedUser.username,
      from: trip.from,
      to: trip.to,
      date: trip.date,
      depart: trip.depart,
      arrive: trip.arrive,
      durationMin: trip.durationMin,
      stops: trip.stops,
      price: trip.price.base || trip.price || 0,
      mode: trip.mode || "",
      provider: trip.providerName || "Não especificado",
    };

    cartTickets.push(ticket);
    localStorage.setItem("cartTickets", JSON.stringify(cartTickets));
    updateCartCount();
    alert("Bilhete adicionado ao carrinho com sucesso!");
  });

  return card;
}

// -------------------------
// EXIBIR VIAGENS
// -------------------------
function displayTrips(tripsList) {
  if (!tripsContainer) return;

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

// -------------------------
// FILTROS E ORDENAÇÃO
// -------------------------
function applyFilters() {
  let filtered = trips;
  const fromValue = fromInput.value.trim().toLowerCase();
  const toValue = toInput.value.trim().toLowerCase();
  const dateValue = dateInput.value;

  if (fromValue) filtered = filtered.filter((t) => t.from.toLowerCase().includes(fromValue));
  if (toValue) filtered = filtered.filter((t) => t.to.toLowerCase().includes(toValue));
  if (dateValue) filtered = filtered.filter((t) => t.date === dateValue);

  const sortValue = sortSelect.value;
  if (sortValue === "price") filtered.sort((a, b) => a.price.base - b.price.base);
  else if (sortValue === "duration") filtered.sort((a, b) => a.durationMin - b.durationMin);

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
[fromInput, toInput, dateInput].forEach((input) => input.addEventListener("input", () => { if (!input.value) applyFilters(); }));
sortSelect.addEventListener("change", applyFilters);

// Modal login
if (closeModal) closeModal.addEventListener("click", () => (loginModal.style.display = "none"));
if (window) window.addEventListener("click", (e) => { if (e.target === loginModal) loginModal.style.display = "none"; });
if (goLoginBtn) goLoginBtn.addEventListener("click", () => (window.location.href = "login.html"));

// -------------------------
// INICIALIZAÇÃO
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchTripsAndProviders();
  updateCartCount();
});
