// -------------------------
// INICIALIZAÇÃO
// -------------------------



document.addEventListener("DOMContentLoaded", () => {
  const ticketsContainer = document.getElementById("ticketsContainer");
  const userInfo = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtnNav = document.getElementById("loginBtn");

  // --------- Login/UI ----------
  const safeParse = (s) => { try { return JSON.parse(s || "null"); } catch { return null; } };
  let loggedUser = safeParse(localStorage.getItem("loggedUser")) || null;
  const userKey = (u) => u?.email || u?.username;

  function updateUserUI() {
    if (loggedUser) {
      if (userInfo) {
        const name = loggedUser.name || loggedUser.username || loggedUser.email;
        userInfo.textContent = `Bem-vindo, ${name}`;
        userInfo.style.display = "inline-block";
      }
      logoutBtn && (logoutBtn.style.display = "inline-block");
      loginBtnNav && (loginBtnNav.style.display = "none");
    } else {
      userInfo && (userInfo.style.display = "none");
      logoutBtn && (logoutBtn.style.display = "none");
      loginBtnNav && (loginBtnNav.style.display = "inline-block");
    }
  }
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    loggedUser = null;
    updateUserUI();
    window.location.href = "index.html";
  });
  loginBtnNav?.addEventListener("click", () => (window.location.href = "login.html"));

  // --------- Migração legado -> reservations ----------
  function migrateLegacyToReservations() {
    const legacyTickets = safeParse(localStorage.getItem("tickets")) || [];
    const legacyUserTrips = safeParse(localStorage.getItem("userTrips")) || [];
    let reservations = safeParse(localStorage.getItem("reservations")) || [];
    let changed = false;

    function pushAsReservation(t) {
      const id = t.id ?? (Date.now() + Math.random());
      const price = Number(typeof t.price === "number" ? t.price : (t.price?.base ?? 0));
      const uname = t.username || (loggedUser ? userKey(loggedUser) : null);
      if (!uname) return;

      // se eram pacotes antigos (improvável neste fluxo), preserva meta mínima
      const isPackage = !!t.isPackage || (!!t.packageId && Array.isArray(t.trips));

      const orderId = "RSV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      reservations.push({
        reservationId: orderId + "-" + id,
        orderId,
        username: uname,
        isPackage,
        packageId: t.packageId,
        packageName: t.packageName,
        description: t.description,
        trips: Array.isArray(t.trips) ? t.trips : undefined,

        from: t.from,
        to: t.to,
        date: t.date,
        depart: t.depart,
        arrive: t.arrive,
        mode: t.mode || "",
        price,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        history: [],
      });
      changed = true;
    }

    legacyTickets.forEach(pushAsReservation);
    legacyUserTrips.forEach(pushAsReservation);

    if (changed) {
      localStorage.setItem("reservations", JSON.stringify(reservations));
      localStorage.removeItem("tickets");
      localStorage.removeItem("userTrips");
    }
  }

  // --------- Reservas (CRUD) ----------
  const readAll = () => safeParse(localStorage.getItem("reservations")) || [];
  const writeAll = (arr) => localStorage.setItem("reservations", JSON.stringify(arr || []));
  const getUserReservations = () => {
    if (!loggedUser) return [];
    const key = userKey(loggedUser);
    return readAll().filter(r => r.username === key || r.username === loggedUser.username);
  };

  // --------- Validações de data ----------
  function isValidISODate(str) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str + "T00:00:00Z");
    if (isNaN(d.getTime())) return false;
    const [Y, M, D] = str.split("-").map(Number);
    return d.getUTCFullYear() === Y && (d.getUTCMonth() + 1) === M && d.getUTCDate() === D;
  }
  function isPastDate(str) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(str + "T00:00:00");
    return d.getTime() < today.getTime();
  }

  // --------- Cache de trips (para detalhar pacotes) ----------
  let __tripsCache = null;
  async function loadTripsCache() {
    if (__tripsCache) return __tripsCache;
    try {
      const res = await fetch("data/trips.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`trips.json: HTTP ${res.status}`);
      __tripsCache = await res.json();
    } catch (e) {
      console.warn("[reservations] Não foi possível carregar trips.json:", e);
      __tripsCache = [];
    }
    return __tripsCache;
  }
  const priceOfTrip = (t) => (typeof t.price === "number" ? t.price : (t.price?.base ?? 0));

  // --------- Render ----------
  
  async function displayReservations() {
    
    if (!ticketsContainer) return;

    const list = getUserReservations();
    ticketsContainer.innerHTML = "";

    if (!list.length) {
      ticketsContainer.innerHTML = "<p>Não tens reservas ainda.</p>";
      return;
    }

    // carrega trips para mostrar detalhes em pacotes
    const trips = await loadTripsCache();
    const tripById = new Map(trips.map(t => [t.id, t]));

    list.forEach(r => {
  const card = document.createElement("div");
  const isPackage = !!r.isPackage || (!!r.packageId && Array.isArray(r.trips));
  const price = Number(r.price ?? 0);
  const canceled = r.status === "canceled";

  card.className = `ticket-card ${isPackage ? "package" : ""}`.trim();


  if (isPackage) {
    // ----- CARD DE PACOTE -----
    const trips = tripById ? (Array.isArray(r.trips) ? r.trips.map(id => tripById.get(id)).filter(Boolean) : []) : [];
    card.innerHTML = `
      <div class="card-header">
        <span class="badge">Pacote</span>
        <h3>${r.packageName || r.packageId || "Pacote"}</h3>
      </div>

      ${r.description ? `<p class="muted">${r.description}</p>` : ""}

      <details class="pkg-details">
        <summary>Ver viagens incluídas (${r.trips?.length || trips.length || 0})</summary>
        <ul class="pkg-list">
          ${
            trips.length
              ? trips.map(t => `<li>${t.from} → ${t.to} • ${t.date}</li>`).join("")
              : (Array.isArray(r.trips) ? r.trips.map(id => `<li>${id}</li>`).join("") : "<li>(Sem detalhes)</li>")
          }
        </ul>
      </details>

      <p class="price-line"><strong>Preço do pacote:</strong> €${price.toFixed(2)}</p>
      <p class="status-line">Estado: <strong>${r.status}</strong></p>

      <div class="actions">
        <button class="btn-change" data-id="${r.reservationId}" disabled title="Pacotes não permitem alterar a data">Alterar data</button>
        <button class="btn-cancel" data-id="${r.reservationId}" ${canceled ? "disabled title='Já está cancelada'" : ""}>Cancelar</button>
        <button class="btn-delete" data-id="${r.reservationId}" title="Apagar definitivamente">Apagar</button>
      </div>
    `;
  } else {
    // ----- CARD NORMAL -----
    card.innerHTML = `
      <h3>${r.from ?? "-"} → ${r.to ?? "-"}</h3>
      <p>Data: <span class="ticket-date">${r.date ?? "-"}</span></p>
      <p>Hora: ${r.depart || ""}${r.arrive ? " - " + r.arrive : ""}</p>
      <p>Modo: ${r.mode || "N/A"} | Estado: <strong>${r.status}</strong></p>
      <p>Preço: €${price.toFixed(2)}</p>
      <div class="actions">
        <button class="btn-change" data-id="${r.reservationId}" ${canceled ? "disabled title='Reserva cancelada — não pode alterar a data'" : ""}>Alterar data</button>
        <button class="btn-cancel" data-id="${r.reservationId}" ${canceled ? "disabled title='Já está cancelada'" : ""}>Cancelar</button>
        <button class="btn-delete" data-id="${r.reservationId}" title="Apagar definitivamente">Apagar</button>
      </div>
    `;
  }

  ticketsContainer.appendChild(card);
});


    // Apagar definitivamente (serve para ambos os tipos)
    ticketsContainer.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        if (!confirm("Tens a certeza que queres apagar esta reserva? Esta ação é irreversível.")) return;
        const all = readAll();
        const next = all.filter(x => x.reservationId !== id);
        writeAll(next);
        displayReservations();
      });
    });

    // Cancelar (serve para ambos os tipos)
    ticketsContainer.querySelectorAll(".btn-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const all = readAll();
        const i = all.findIndex(x => x.reservationId === id);
        if (i >= 0) {
          if (all[i].status === "canceled") return; // já cancelada
          all[i].status = "canceled";
          (all[i].history ||= []).push({ at: new Date().toISOString(), action: "cancel" });
          writeAll(all);
          displayReservations();
        }
      });
    });

    // Alterar data (apenas reservas normais)
    ticketsContainer.querySelectorAll(".btn-change:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const all = readAll();
        const i = all.findIndex(x => x.reservationId === id);
        if (i < 0) return;

        if (all[i].status === "canceled") {
          alert("Não é possível alterar a data de uma reserva cancelada.");
          return;
        }

        const newDate = prompt("Nova data (YYYY-MM-DD)?");
        if (!newDate) return;

        // Validações
        if (!isValidISODate(newDate)) {
          alert("Data inválida. Usa o formato YYYY-MM-DD (ex.: 2025-11-20).");
          return;
        }
        if (isPastDate(newDate)) {
          alert("A nova data não pode ser no passado.");
          return;
        }
        if (newDate === all[i].date) {
          alert("A nova data é igual à atual.");
          return;
        }

        const before = { date: all[i].date, depart: all[i].depart, arrive: all[i].arrive };
        all[i].date = newDate;
        all[i].status = "changed";
        (all[i].history ||= []).push({
          at: new Date().toISOString(),
          action: "change",
          from: before,
          to: { date: newDate }
        });
        writeAll(all);
        displayReservations();
      });
    });
  }

  // --------- Start ----------
  updateUserUI();
  migrateLegacyToReservations();
  displayReservations();

  window.addEventListener("storage", (e) => {
    if (["reservations", "loggedUser"].includes(e.key)) displayReservations();
  });
});
