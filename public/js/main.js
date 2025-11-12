// -------------------------
// ELEMENTOS DO DOM
// -------------------------
const tripsContainer = document.getElementById("tripsContainer");
const searchBtn      = document.getElementById("searchBtn");
const sortSelect     = document.getElementById("sort");
const fromInput      = document.getElementById("from");
const toInput        = document.getElementById("to");
const dateInput      = document.getElementById("date");
const modeSelect     = document.getElementById("mode") || document.getElementById("modeSelect");
const maxPriceEl     = document.getElementById("maxPrice") || document.getElementById("priceMax");

// Modal de login (se existir nesta página)
const loginModal = document.getElementById("loginModal");
const closeModal = document.querySelector(".close");
const goLoginBtn = document.getElementById("goLogin");

// -------------------------
// ESTADO
// -------------------------
let trips = [];
let currentPage = 1;
const tripsPerPage = 6;
let showingPackages = false;

// -------------------------
// HELPERS
// -------------------------
const getPrice = (t) =>
  (typeof t.price === "number" ? t.price : (t.price?.base ?? 0));

function updateCartCount() {
  const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
  const cartCount = document.getElementById("cartCount");
  if (cartCount) cartCount.textContent = cartTickets.length;
}

// -------------------------
// FETCH VIAGENS + PROVIDERS
// -------------------------
async function fetchTripsAndProviders() {
  try {
    const tripsRes = await fetch("data/trips.json", { cache: "no-store" });
    if (!tripsRes.ok) throw new Error(`trips.json: HTTP ${tripsRes.status}`);
    const tripsData = await tripsRes.json();

    const providersRes = await fetch("data/providers.json", { cache: "no-store" });
    if (!providersRes.ok) throw new Error(`providers.json: HTTP ${providersRes.status}`);
    const providersData = await providersRes.json();

    // mapear por providerId (não 'provider')
    trips = tripsData.map((trip) => {
      const provider = providersData.find((p) => p.id === trip.providerId);
      return {
        ...trip,
        providerName: provider ? provider.name : "Não especificado",
        providerLogo: provider ? provider.logo : null,
      };
    });

    currentPage = 1;
    displayTrips(trips);
    setupPagination(trips);
  } catch (error) {
    console.error("Erro ao carregar viagens/providers:", error);
    if (tripsContainer)
      tripsContainer.innerHTML = `<p>Não foi possível carregar as viagens.<br><small>${String(error.message || error)}</small></p>`;
  }
}

// -------------------------
// CRIAR CARD DE VIAGEM
// -------------------------
function createTripCard(trip) {
  const card = document.createElement("div");
  card.className = "trip-card";

  const basePrice = getPrice(trip);

  card.innerHTML = `
    <h3>${trip.from} → ${trip.to}</h3>
    <p>Data: ${trip.date} | Hora: ${trip.depart ?? ""} - ${trip.arrive ?? ""}</p>
    <p>Duração: ${trip.durationMin} min | Stops: ${trip.stops}</p>
    <p>Preço: €${basePrice.toFixed(2)}</p>
    <p>Tipo: ${trip.mode || "N/A"}</p>
    <p>Empresa: ${trip.providerName}</p>
    
    <button class="buyBtn">Adicionar ao Carrinho</button>
  `;

  card.querySelector(".buyBtn").addEventListener("click", () => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    if (!loggedUser) {
      if (loginModal) loginModal.style.display = "block";
      else alert("Inicia sessão para comprar.");
      return;
    }

    const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
    const usernameKey = loggedUser.email || loggedUser.username || loggedUser.name || "guest";

    const ticket = {
      id: Date.now() + Math.random(),
      username: usernameKey,
      from: trip.from,
      to: trip.to,
      date: trip.date,
      depart: trip.depart,
      arrive: trip.arrive,
      durationMin: trip.durationMin,
      stops: trip.stops,
      price: basePrice,
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
// LISTAR VIAGENS
// -------------------------
function displayTrips(tripsList) {
  if (!tripsContainer) return;

  tripsContainer.innerHTML = "";
  const start = (currentPage - 1) * tripsPerPage;
  const end = start + tripsPerPage;
  const paginated = tripsList.slice(start, end);

  if (paginated.length === 0) {
    tripsContainer.innerHTML = "<p>Nenhuma viagem encontrada.</p>";
    return;
  }

  paginated.forEach((trip) => {
    tripsContainer.appendChild(createTripCard(trip));
  });
}

// -------------------------
// FILTROS E ORDENAÇÃO
// -------------------------
function applyFilters() {
  if (showingPackages) return; // filtros desativados em modo Pacotes

  let filtered = trips.slice();

  const fromValue = (fromInput?.value || "").trim().toLowerCase();
  const toValue   = (toInput?.value || "").trim().toLowerCase();
  const dateValue = (dateInput?.value || "");
  const modeValue = (modeSelect?.value || "").toLowerCase();

  if (fromValue) filtered = filtered.filter(t => (t.from || "").toLowerCase().includes(fromValue));
  if (toValue)   filtered = filtered.filter(t => (t.to   || "").toLowerCase().includes(toValue));
  if (dateValue) filtered = filtered.filter(t => t.date === dateValue);
  if (modeValue) filtered = filtered.filter(t => (t.mode || "").toLowerCase() === modeValue);

  // preço máximo
  const maxPriceRaw = maxPriceEl?.value ?? "";
  const maxPrice = maxPriceRaw === "" ? null : Number(maxPriceRaw);
  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    filtered = filtered.filter(t => getPrice(t) <= maxPrice);
  }

  // ordenação
  const sortValue = sortSelect?.value;
  if (sortValue === "price") {
    filtered.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (sortValue === "duration") {
    filtered.sort((a, b) => (a.durationMin ?? Infinity) - (b.durationMin ?? Infinity));
  }

  currentPage = 1;
  displayTrips(filtered);
  setupPagination(filtered);
}

// -------------------------
// PAGINAÇÃO
// -------------------------
function setupPagination(tripsList) {
  if (!tripsContainer) return;

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
// PACOTES (toggle + render como 1 item)
// -------------------------
function setFiltersDisabled(disabled) {
  [fromInput, toInput, dateInput, modeSelect, maxPriceEl, searchBtn, sortSelect]
    .forEach(el => { if (el) el.disabled = !!disabled; });
}

function ensureToggleButton() {
  let title = document.getElementById("mainTitle");
  let btn = document.getElementById("toggleViewBtn");

  if (!title) {
    title = document.createElement("h2");
    title.id = "mainTitle";
    title.textContent = "Viagens Disponíveis";
    tripsContainer?.parentElement?.insertBefore(title, tripsContainer);
  }

  if (!btn) {
    const wrap = document.createElement("div");
    wrap.className = "top-bar";
    title?.parentElement?.insertBefore(wrap, title);
    wrap.appendChild(title);

    btn = document.createElement("button");
    btn.id = "toggleViewBtn";
    btn.className = "toggle-btn";
    btn.textContent = "Ver Pacotes";
    wrap.appendChild(btn);
  }

  btn.addEventListener("click", async () => {
    showingPackages = !showingPackages;
    const pag = document.getElementById("pagination");

    if (showingPackages) {
      title.textContent = "Pacotes Promocionais";
      btn.textContent = "Ver Viagens";
      setFiltersDisabled(true);
      await showPackages();
      if (pag) pag.innerHTML = ""; // sem paginação em pacotes
    } else {
      title.textContent = "Viagens Disponíveis";
      btn.textContent = "Ver Pacotes";
      setFiltersDisabled(false);
      currentPage = 1;
      displayTrips(trips);
      setupPagination(trips);
    }
  });
}

async function showPackages() {
  try {
    if (!Array.isArray(trips) || trips.length === 0) {
      await fetchTripsAndProviders();
    }

    const tryPaths = ["data/packages.json", "./data/packages.json", "/data/packages.json"];
    let pkRes = null, errs = [];
    for (const p of tryPaths) {
      try {
        const r = await fetch(p, { cache: "no-store" });
        if (r.ok) { pkRes = r; break; }
        errs.push(`${p}: HTTP ${r.status}`);
      } catch (e) { errs.push(`${p}: ${e.message}`); }
    }
    if (!pkRes) throw new Error(`Falha a obter packages.json → ${errs.join(" | ")}`);

    const packages = await pkRes.json();
    if (!Array.isArray(packages)) throw new Error("packages.json deve ser um array.");

    // índice só para listar detalhes das trips incluídas (opcional)
    const byId = new Map(trips.map(t => [t.id, t]));

    tripsContainer.innerHTML = "";
    let rendered = 0;

    packages.forEach(pkg => {
      const ids = Array.isArray(pkg.trips) ? pkg.trips : [];
      const included = ids.map(id => byId.get(id)).filter(Boolean);
      const total = Number(pkg.price) || 0;

      const card = document.createElement("div");
      card.className = "trip-card";
      card.innerHTML = `
        <h3>${pkg.name || "Pacote"}</h3>
        <p>${pkg.description || ""}</p>
        <p><strong>Preço total do pacote:</strong> €${total.toFixed(2)}</p>
        <details style="margin:.6rem 0;">
          <summary>Ver viagens incluídas</summary>
          <ul style="margin:.4rem 0 0 .8rem;">
            ${included.length
              ? included.map(t => `<li>${t.from} → ${t.to} • ${t.date} • €${getPrice(t).toFixed(2)}</li>`).join("")
              : (ids.length ? ids.map(id => `<li>${id}</li>`).join("") : "<li>(Sem detalhe)</li>")
            }
          </ul>
        </details>
        <button class="buyPackageBtn">Adicionar ao Carrinho</button>
      `;

      card.querySelector(".buyPackageBtn").addEventListener("click", () => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (!loggedUser) {
          if (loginModal) loginModal.style.display = "block";
          else alert("Inicia sessão para comprar pacotes.");
          return;
        }

        const usernameKey = loggedUser.email || loggedUser.username || "guest";
        const cart = JSON.parse(localStorage.getItem("cartTickets")) || [];

        // adiciona o pacote como UM único item
        cart.push({
          id: Date.now() + Math.random(),
          username: usernameKey,
          isPackage: true,
          packageId: pkg.id,
          packageName: pkg.name || "Pacote",
          description: pkg.description || "",
          trips: ids,     // referência às viagens incluídas (sem dividir)
          price: total    // preço TOTAL do pacote
        });

        localStorage.setItem("cartTickets", JSON.stringify(cart));
        updateCartCount?.();
        alert(`Pacote "${pkg.name || "Pacote"}" adicionado ao carrinho!`);
      });

      tripsContainer.appendChild(card);
      rendered++;
    });

    if (!rendered) {
      tripsContainer.innerHTML = `
        <p>Não existem pacotes disponíveis.</p>
        <p style="font-size:.9rem;opacity:.9">Confirma data/packages.json e abre a consola (F12) para detalhes.</p>`;
    }
  } catch (err) {
    console.error("Erro ao carregar pacotes:", err);
    tripsContainer.innerHTML = `
      <p>Erro ao carregar pacotes.</p>
      <p style="font-size:.9rem;opacity:.9">Detalhe: ${String(err.message || err)}</p>
    `;
  }
}

// -------------------------
// EVENTOS
// -------------------------
searchBtn?.addEventListener("click", applyFilters);
[fromInput, toInput, dateInput, modeSelect, maxPriceEl].forEach((el) => el?.addEventListener("input", applyFilters));
sortSelect?.addEventListener("change", applyFilters);

// Modal login (se existir)
closeModal?.addEventListener("click", () => (loginModal.style.display = "none"));
window.addEventListener("click", (e) => { if (e.target === loginModal) loginModal.style.display = "none"; });
goLoginBtn?.addEventListener("click", () => (window.location.href = "login.html"));

// -------------------------
// INIT
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchTripsAndProviders();
  updateCartCount();
  ensureToggleButton();
});
