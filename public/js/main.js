// -------------------------
// ELEMENTOS DO DOM
// -------------------------
const tripsContainer = document.getElementById("tripsContainer");
const searchBtn = document.getElementById("searchBtn");
const sortSelect = document.getElementById("sort");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const dateInput = document.getElementById("date");
const modeSelect =
  document.getElementById("mode") || document.getElementById("modeSelect");
const maxPriceEl =
  document.getElementById("maxPrice") || document.getElementById("priceMax");

// Modal de login (se existir nesta página)
const loginModal = document.getElementById("loginModal");
const closeModal = document.querySelector(".close");
const goLoginBtn = document.getElementById("goLogin");

// -------------------------
// ESTADO
// -------------------------
let trips = [];
let currentPage = 1;
const tripsPerPage = 8;
let showingPackages = false;

let popupModal = document.getElementById("popup-modal");
if (!popupModal) {
  popupModal = document.createElement("div");
  popupModal.id = "popup-modal";
  popupModal.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-box">
      <p id="popup-message">Bilhete adicionado ao carrinho com sucesso!</p>
      <button id="popup-close">Fechar</button>
    </div>
  `;
  document.body.appendChild(popupModal);
}
const popupMessage = document.getElementById("popup-message");
const popupCloseBtn = document.getElementById("popup-close");

function showPopup(message) {
  popupMessage.textContent = message;
  popupModal.classList.add("active");

  // Fechar automaticamente após 3 segundos
  
}

// Fechar manualmente
popupCloseBtn.addEventListener("click", () => {
  popupModal.classList.remove("active");
});
popupModal.querySelector(".popup-overlay").addEventListener("click", () => {
  popupModal.classList.remove("active");
});

// -------------------------
// HELPERS
// -------------------------
const getPrice = (t) =>
  typeof t.price === "number" ? t.price : t.price?.base ?? 0;

function extractDate(value) {
  if (!value) return "";
  const str = String(value);
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function extractTime(value) {
  if (!value) return "";
  const str = String(value);
  const match = str.match(/\b\d{2}:\d{2}/);
  return match ? match[0] : "";
}

function formatDatePart(value) {
  if (!value) return "";
  const str = String(value);
  if (/\d{4}-\d{2}-\d{2}T/.test(str)) {
    const dt = new Date(str);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return extractDate(str);
}

function formatTimePart(value) {
  if (!value) return "";
  const str = String(value);
  if (/\d{4}-\d{2}-\d{2}T/.test(str)) {
    const dt = new Date(str);
    if (!Number.isNaN(dt.getTime())) {
      const h = String(dt.getHours()).padStart(2, "0");
      const m = String(dt.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return extractTime(str);
}

function isTodayOrFuture(dateStr) {
  if (!dateStr) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}


function formatTripType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  const normalized = raw.toLowerCase();
  if (normalized === "ida") return "IDA";
  if (
    normalized === "ida_volta" ||
    normalized === "ida-volta" ||
    normalized === "ida volta" ||
    normalized === "ida/volta"
  ) {
    return "IDA E VOLTA";
  }
  return raw;
}

function updateCartCount() {
  const cartTickets = JSON.parse(localStorage.getItem("cartTickets")) || [];
  const cartCount = document.getElementById("cartCount");
  if (cartCount) cartCount.textContent = cartTickets.length;
}

function updateHeroDeal(list) {
  const titleEl = document.getElementById("heroDealTitle");
  const priceEl = document.getElementById("heroDealPrice");
  if (!titleEl || !priceEl || !Array.isArray(list) || list.length === 0) return;

  const cheapest = list.reduce((best, item) => {
    const price = getPrice(item);
    if (!Number.isFinite(price)) return best;
    if (!best) return item;
    return getPrice(best) <= price ? best : item;
  }, null);

  if (!cheapest) return;

  const badgeEl = document.getElementById("heroDealBadge");
  if (badgeEl) badgeEl.textContent = "Mais barata";

  const from = cheapest.from || "Origem";
  const to = cheapest.to || "Destino";
  titleEl.textContent = `${from} -> ${to}`;

  const typeLabel = formatTripType(cheapest.tripType || cheapest.mode || "");
  const suffix = typeLabel !== "N/A" ? ` - ${typeLabel}` : "";
  priceEl.textContent = `Desde EUR ${getPrice(cheapest).toFixed(2)}${suffix}`;
}

function formatLoadInfo(trip) {
  const available = Number(trip.availableSeats);
  const total = Number(trip.totalSeats);
  if (Number.isFinite(available) && available >= 0) {
    if (Number.isFinite(total) && total > 0) {
      const used = Math.max(0, total - available);
      const percent = Math.round((used / total) * 100);
      return `Lotacao: ${percent}% (livres: ${available})`;
    }
    return `Lugares livres: ${available}`;
  }
  return "";
}

function wireHeroPackagesButton() {
  const heroBtn = document.getElementById("heroPackagesBtn");
  const toggleBtn = document.getElementById("toggleViewBtn");
  const explore = document.getElementById("explore");
  if (!heroBtn || !toggleBtn) return;

  heroBtn.addEventListener("click", (event) => {
    event.preventDefault();
    toggleBtn.click();
    explore?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// -------------------------
// FETCH VIAGENS (API)
// -------------------------
function normalizeTrip(raw) {
  const from = raw.origem || raw.from || raw.origin || "";
  const to = raw.destino || raw.to || raw.destination || "";
  const departRaw =
    raw.data_partida ||
    raw.dataPartida ||
    raw.depart ||
    raw.hora_partida ||
    raw.horaPartida ||
    "";
  const arriveRaw =
    raw.data_chegada ||
    raw.dataChegada ||
    raw.arrive ||
    raw.hora_chegada ||
    raw.horaChegada ||
    "";
  const date = raw.data || raw.date || formatDatePart(departRaw) || "";
  const depart =
    formatTimePart(departRaw) ||
    raw.hora_partida ||
    raw.horaPartida ||
    raw.depart ||
    "";
  const arrive =
    formatTimePart(arriveRaw) ||
    raw.hora_chegada ||
    raw.horaChegada ||
    raw.arrive ||
    "";
  const durationMin =
    raw.duracao_min ?? raw.duracao ?? raw.durationMin ?? raw.duration ?? "";
  const hasEscala = raw.escala === true || raw.escala === 1;
  const stops =
    typeof raw.escalas === "number"
      ? raw.escalas
      : Array.isArray(raw.escalas)
      ? raw.escalas.length
      : raw.stops ?? (hasEscala ? 1 : 0);
  let price = raw.preco_final ?? raw.preco ?? raw.price ?? raw.preco_total ?? 0;
  if (raw.preco !== undefined || raw.moeda || raw.preco_final !== undefined) {
    const baseValue =
      raw.preco_final ??
      raw.preco ??
      (typeof price === "number" ? price : price?.base) ??
      0;
    price = {
      base: Number(baseValue) || 0,
      original: raw.preco_original ?? null,
      currency: raw.moeda || raw.currency || "EUR",
    };
  }
  const providerName =
    raw.companhia ||
    raw.company ||
    raw.companyName ||
    raw.providerName ||
    raw.sigla ||
    "Nao especificado";
  const mode = raw.modo || raw.mode || (raw.tipo ? "plane" : "");
  const tripType = raw.tipo || raw.tripType || "";
  const escalaInfo = raw.escala_info || raw.escalaInfo || null;
  const availableSeats =
    raw.lugares_disponiveis ??
    raw.lugaresDisponiveis ??
    raw.available_seats ??
    raw.availableSeats ??
    null;
  const totalSeats =
    raw.lugares_totais ??
    raw.lugares_totais ??
    raw.capacidade ??
    raw.capacidade_total ??
    raw.total_seats ??
    raw.totalSeats ??
    null;

  return {
    id: raw.id ?? raw.viagemId ?? raw.codigo ?? raw.tripId ?? 0,
    from,
    to,
    date,
    depart,
    arrive,
    durationMin,
    stops,
    price,
    mode,
    tripType,
    providerName,
    availableSeats,
    totalSeats,
    dataPartida: raw.data_partida || raw.dataPartida || "",
    dataChegada: raw.data_chegada || raw.dataChegada || "",
    stopInfo: escalaInfo
      ? {
          city: escalaInfo.cidade || escalaInfo.city || "",
          durationMin: escalaInfo.duracao_min ?? escalaInfo.durationMin ?? "",
        }
      : null,
  };
}

async function fetchTripsRaw() {
  const res = await fetch("/SheiqAway/backend/api/viagens.php", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API: HTTP ${res.status}`);
  const payload = await res.json();
  if (!payload.ok || !Array.isArray(payload.data)) {
    throw new Error("Resposta inesperada da API.");
  }
  return payload.data.map(normalizeTrip);
}

async function fetchTripsAndProviders() {
  try {
    const list = await fetchTripsRaw();
    trips = list.filter((trip) => {
      const dateValue = trip.date || formatDatePart(trip.dataPartida);
      return isTodayOrFuture(dateValue);
    });

    currentPage = 1;
    updateHeroDeal(trips);
    displayTrips(trips);
    setupPagination(trips);
  } catch (error) {
    console.error("Erro ao carregar viagens:", error);
    if (tripsContainer)
      tripsContainer.innerHTML = `<p>Nao foi possivel carregar as viagens.<br><small>${String(
        error.message || error
      )}</small></p>`;
  }
}

// -------------------------
// CRIAR CARD DE VIAGEM
// -------------------------
function createTripCard(trip) {
  const card = document.createElement("div");
  card.className = "trip-card";

  const basePrice = getPrice(trip);
  const originalPrice =
    typeof trip.price === "object" ? trip.price.original : null;
  const tipoLabel = formatTripType(trip.tripType || trip.mode || "");
  const loadInfo = formatLoadInfo(trip);
  const escalaLabel = trip.stopInfo
    ? `Escala: ${trip.stopInfo.city || "N/A"}${
        trip.stopInfo.durationMin ? ` (${trip.stopInfo.durationMin} min)` : ""
      }`
    : "";

  card.innerHTML = `
    <h3>${trip.from} -> ${trip.to}</h3>
    <p>Data: ${trip.date} | Hora: ${trip.depart ?? ""} - ${
    trip.arrive ?? ""
  }</p>
    <p>Duracao: ${trip.durationMin} min | Stops: ${trip.stops}</p>
    <p>Preco: EUR ${basePrice.toFixed(2)}${originalPrice && Number(originalPrice) > basePrice ? ` <span class="price-original">EUR ${Number(originalPrice).toFixed(2)}</span>` : ""}</p>
    <p>Tipo: ${tipoLabel}</p>
    <p>Empresa: ${trip.providerName}</p>
    ${loadInfo ? `<p>${loadInfo}</p>` : ""}
    <p class="escala-placeholder">${escalaLabel || "&nbsp;"}</p>
    
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
    const usernameKey =
      loggedUser.email || loggedUser.username || loggedUser.name || "guest";

    const ticket = {
      id: Date.now() + Math.random(),
      username: usernameKey,
      apiViagemId: trip.id,
      from: trip.from,
      to: trip.to,
      date: trip.date,
      depart: trip.depart,
      arrive: trip.arrive,
      durationMin: trip.durationMin,
      stops: trip.stops,
      price: basePrice,
      mode: trip.tripType || trip.mode || "",
      provider: trip.providerName || "Não especificado",
      origem: trip.from,
      destino: trip.to,
      data_partida: trip.dataPartida || trip.date,
      companhia: trip.providerName || "",
      passengersCount: 1,
      availableSeats: trip.availableSeats ?? null,
    };

    cartTickets.push(ticket);
    localStorage.setItem("cartTickets", JSON.stringify(cartTickets));
    updateCartCount();
    showPopup("Bilhete adicionado ao carrinho com sucesso!");
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
  const toValue = (toInput?.value || "").trim().toLowerCase();
  const dateValue = dateInput?.value || "";
  const modeValue = (modeSelect?.value || "").toLowerCase();

  if (fromValue)
    filtered = filtered.filter((t) =>
      (t.from || "").toLowerCase().includes(fromValue)
    );
  if (toValue)
    filtered = filtered.filter((t) =>
      (t.to || "").toLowerCase().includes(toValue)
    );
  if (dateValue) filtered = filtered.filter((t) => t.date === dateValue);
  if (modeValue)
    filtered = filtered.filter(
      (t) => (t.mode || "").toLowerCase() === modeValue
    );

  // preço máximo
  const maxPriceRaw = maxPriceEl?.value ?? "";
  const maxPrice = maxPriceRaw === "" ? null : Number(maxPriceRaw);
  if (maxPrice !== null && !Number.isNaN(maxPrice)) {
    filtered = filtered.filter((t) => getPrice(t) <= maxPrice);
  }

  // ordenação
  const sortValue = sortSelect?.value;
  if (sortValue === "price") {
    filtered.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (sortValue === "duration") {
    filtered.sort(
      (a, b) => (a.durationMin ?? Infinity) - (b.durationMin ?? Infinity)
    );
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

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    displayTrips(tripsList);
    setupPagination(tripsList);
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Seguinte";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", () => {
    currentPage = Math.min(totalPages, currentPage + 1);
    displayTrips(tripsList);
    setupPagination(tripsList);
  });

  const indicator = document.createElement("span");
  indicator.className = "pagination-indicator";
  indicator.textContent = `Pagina ${totalPages ? currentPage : 0} de ${totalPages}`;

  paginationContainer.appendChild(prevBtn);
  paginationContainer.appendChild(indicator);
  paginationContainer.appendChild(nextBtn);
}

// -------------------------
// PACOTES (toggle + render como 1 item)
// -------------------------
function setFiltersDisabled(disabled) {
  [
    fromInput,
    toInput,
    dateInput,
    modeSelect,
    maxPriceEl,
    searchBtn,
    sortSelect,
  ].forEach((el) => {
    if (el) el.disabled = !!disabled;
  });
}

function ensureToggleButton() {
  const resultsHeader = document.querySelector(".results-header");
  if (!resultsHeader) return;

  // Cria o título apenas se não existir
  let title = document.getElementById("mainTitle");
  if (!title) {
    title = document.createElement("span"); // span dentro da mesma div do botão
    title.id = "mainTitle";
    title.style.marginRight = "1rem"; // espaçamento entre texto e botão
    resultsHeader.prepend(title);
  }

  // Cria o botão apenas se não existir
  let btn = document.getElementById("toggleViewBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "toggleViewBtn";
    btn.className = "toggle-btn";
    btn.textContent = "Ver Pacotes";
    resultsHeader.appendChild(btn);
  }

  btn.addEventListener("click", async () => {
    const pag = document.getElementById("pagination");
    showingPackages = !showingPackages;

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
    const allTrips = await fetchTripsRaw();

    const pkRes = await fetch("/SheiqAway/backend/api/pacotes.php", {
      cache: "no-store",
      credentials: "include",
    });
    if (!pkRes.ok) {
      throw new Error(`Falha a obter pacotes -> HTTP ${pkRes.status}`);
    }
    const pkPayload = await pkRes.json();
    if (!pkPayload.ok || !Array.isArray(pkPayload.data)) {
      throw new Error("Resposta inesperada dos pacotes.");
    }
    const packages = pkPayload.data;

    // índice só para listar detalhes das trips incluídas (opcional)
    const byId = new Map(allTrips.map((t) => [String(t.id), t]));

    tripsContainer.innerHTML = "";
    let rendered = 0;

    packages.forEach((pkg) => {
      const ids = Array.isArray(pkg.viagens) ? pkg.viagens : [];
      const included = ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean);
      const total = Number(pkg.preco_total || pkg.price) || 0;

      const card = document.createElement("div");
      card.className = "trip-card";
      card.innerHTML = `
        <h3>${pkg.nome || pkg.name || "Pacote"}</h3>
        <p>${pkg.descricao || pkg.description || ""}</p>
          <p><strong>Preco total do pacote:</strong> EUR ${total.toFixed(2)}</p>
        <details style="margin:.6rem 0;">
          <summary>Ver viagens incluidas</summary>
          <ul style="margin:.4rem 0 0 .8rem;">
            ${
              included.length
                ? included
                    .map(
                      (t) =>
                          `<li>${t.from} -> ${t.to} - ${t.date} - EUR ${getPrice(
                          t
                        ).toFixed(2)}</li>`
                    )
                    .join("")
                : ids.length
                ? ids.map((id) => `<li>${id}</li>`).join("")
                : "<li>(Sem detalhe)</li>"
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
        const tripsDetails = included.map((t) => ({
          id: t.id,
          origem: t.from,
          destino: t.to,
          data_partida: t.dataPartida || t.date || "",
          companhia: t.providerName || t.provider || "",
          preco: getPrice(t),
          availableSeats: t.availableSeats ?? null,
        }));

        cart.push({
          id: Date.now() + Math.random(),
          username: usernameKey,
          isPackage: true,
          packageId: pkg.id,
          packageName: pkg.nome || pkg.name || "Pacote",
          description: pkg.descricao || pkg.description || "",
          trips: ids,
          tripsDetails,
          price: total,
        });

        localStorage.setItem("cartTickets", JSON.stringify(cart));
        updateCartCount?.();
        showPopup(`Pacote "${pkg.nome || pkg.name || "Pacote"}" adicionado ao carrinho!`);
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
      <p style="font-size:.9rem;opacity:.9">Detalhe: ${String(
        err.message || err
      )}</p>
    `;
  }
}

// -------------------------
// EVENTOS
// -------------------------
searchBtn?.addEventListener("click", applyFilters);
[fromInput, toInput, dateInput, modeSelect, maxPriceEl].forEach((el) =>
  el?.addEventListener("input", applyFilters)
);
sortSelect?.addEventListener("change", applyFilters);

// Modal login (se existir)
closeModal?.addEventListener(
  "click",
  () => (loginModal.style.display = "none")
);
window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
});
goLoginBtn?.addEventListener(
  "click",
  () => (window.location.href = "login.html")
);

// -------------------------
// INIT
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchTripsAndProviders();
  updateCartCount();
  ensureToggleButton();
  wireHeroPackagesButton();
});






