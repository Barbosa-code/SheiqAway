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

let trips = [];
let currentPage = 1;
const tripsPerPage = 8;

// Buscar viagens do JSON
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

// Criar card de cada viagem
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

  // Modal ao clicar em comprar
  card.querySelector(".buyBtn").addEventListener("click", () => {
    loginModal.style.display = "block";
  });

  return card;
}

// Exibir viagens na página atual
function displayTrips(tripsList) {
  tripsContainer.innerHTML = "";

  const start = (currentPage - 1) * tripsPerPage;
  const end = start + tripsPerPage;
  const paginatedTrips = tripsList.slice(start, end);

  paginatedTrips.forEach(trip => {
    tripsContainer.appendChild(createTripCard(trip));
  });
}

// Filtros
function applyFilters() {
  let filtered = trips;

  const fromValue = fromInput.value.trim().toLowerCase();
  const toValue = toInput.value.trim().toLowerCase();
  const dateValue = dateInput.value;

  if (fromValue) {
    filtered = filtered.filter(trip => trip.from.toLowerCase().includes(fromValue));
  }
  if (toValue) {
    filtered = filtered.filter(trip => trip.to.toLowerCase().includes(toValue));
  }
  if (dateValue) {
    filtered = filtered.filter(trip => trip.date === dateValue);
  }

  // Ordenação
  const sortValue = sortSelect.value;
  if (sortValue === "price") {
    filtered.sort((a, b) => a.price.base - b.price.base);
  } else if (sortValue === "duration") {
    filtered.sort((a, b) => a.durationMin - b.durationMin);
  }

  currentPage = 1;
  displayTrips(filtered);
  setupPagination(filtered);
}

// Paginação
function setupPagination(tripsList) {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) {
    const paginationDiv = document.createElement("div");
    paginationDiv.id = "pagination";
    paginationDiv.className = "pagination";
    tripsContainer.after(paginationDiv);
  }
  const totalPages = Math.ceil(tripsList.length / tripsPerPage);
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = i;
      displayTrips(tripsList);
      setupPagination(tripsList);
    });
    container.appendChild(btn);
  }
}

// Eventos
searchBtn.addEventListener("click", applyFilters);

// Atualiza ao apagar filtros
[fromInput, toInput, dateInput].forEach(input => {
  input.addEventListener("input", () => {
    if (!input.value) applyFilters();
  });
});

sortSelect.addEventListener("change", applyFilters);

// Modal
closeModal.addEventListener("click", () => {
  loginModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
});

goLoginBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

// Inicialização
fetchTrips();
