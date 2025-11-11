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
const tripsPerPage = 8;

// -------------------------
// BUSCAR VIAGENS
// -------------------------
async function fetchTrips() {
  try {
    const response = await fetch("data/trips.json");
    trips = await response.json();
    displayTrips(trips);
    setupPagination(trips);
  } catch (error) {
    console.error("Erro ao carregar viagens:", error);
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
    <button class="buyBtn">Comprar</button>
  `;

  // Comprar → salva bilhete no localStorage
  card.querySelector(".buyBtn").addEventListener("click", () => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

    if (!loggedUser) {
      loginModal.style.display = "block";
      return;
    }

    const allTickets = JSON.parse(localStorage.getItem("tickets")) || [];
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
      mode: trip.mode || ""
    };

    allTickets.push(ticket);
    localStorage.setItem("tickets", JSON.stringify(allTickets));
    alert("Bilhete comprado com sucesso!");
  });

  return card;
}

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

  paginatedTrips.forEach(trip => {
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

  if (fromValue) filtered = filtered.filter(t => t.from.toLowerCase().includes(fromValue));
  if (toValue) filtered = filtered.filter(t => t.to.toLowerCase().includes(toValue));
  if (dateValue) filtered = filtered.filter(t => t.date === dateValue);

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
[fromInput, toInput, dateInput].forEach(input => {
  input.addEventListener("input", () => {
    if (!input.value) applyFilters();
  });
});
sortSelect.addEventListener("change", applyFilters);

// Modal de login
closeModal.addEventListener("click", () => loginModal.style.display = "none");
window.addEventListener("click", e => {
  if (e.target === loginModal) loginModal.style.display = "none";
});
goLoginBtn.addEventListener("click", () => window.location.href = "login.html");

// -------------------------
// INICIALIZAÇÃO
// -------------------------
fetchTrips();
