// cart.js (versão robusta para dados antigos)

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
// ==============================
// Helpers gerais
// ==============================
function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem("loggedUser")) || null;
  } catch {
    return null;
  }
}
function getUserKey(u) {
  return u?.email || u?.username;
}
function getAllCartTickets() {
  return JSON.parse(localStorage.getItem("cartTickets")) || [];
}
function setAllCartTickets(arr) {
  localStorage.setItem("cartTickets", JSON.stringify(arr || []));
}
function getPriceNum(t) {
  return Number(typeof t.price === "number" ? t.price : t.price?.base ?? 0);
}

// Pontos — usa as do auth.js se existirem; senão fallbacks simples
function getUserPoints(id) {
  if (typeof window.getUserPoints === "function")
    return window.getUserPoints(id);
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const u = users.find((x) => x.email === id || x.username === id);
  return typeof u?.points === "number" ? u.points : 0;
}
function updateUserPoints(id, delta) {
  if (typeof window.updateUserPoints === "function")
    return window.updateUserPoints(id, delta);
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const i = users.findIndex((u) => u.email === id || u.username === id);
  if (i < 0) return null;
  if (typeof users[i].points !== "number") users[i].points = 0;
  users[i].points = Math.max(0, users[i].points + Number(delta || 0));
  localStorage.setItem("users", JSON.stringify(users));

  const lu = getLoggedUser();
  if (lu && (lu.email === id || lu.username === id)) {
    lu.points = users[i].points;
    localStorage.setItem("loggedUser", JSON.stringify(lu));
  }
  return users[i].points;
}
function redeemPoints(id, pointsToUse, rate = { pts: 100, eur: 5 }) {
  if (typeof window.redeemPoints === "function")
    return window.redeemPoints(id, pointsToUse, rate);
  const current = getUserPoints(id);
  const use = Math.min(current, Math.max(0, Math.floor(pointsToUse)));
  const discount = (use / rate.pts) * rate.eur;
  updateUserPoints(id, -use);
  return { used: use, discount };
}

// ==============================
// Normalização de dados antigos
// ==============================
function ensureIdsAndMigrateUsernames() {
  const user = getLoggedUser();
  const key = getUserKey(user); // pode ser undefined se não logado
  const all = getAllCartTickets();
  let changed = false;

  for (const t of all) {
    // dar ID se faltar
    if (t.id == null) {
      t.id = Date.now() + Math.random();
      changed = true;
    }

    // se não houver username no item e existe utilizador logado, associar ao atual (compat)
    if ((t.username == null || t.username === "") && key) {
      t.username = key;
      changed = true;
    }
  }

  if (changed) setAllCartTickets(all);
  return all;
}

// ==============================
// Carrinho por utilizador (compatível com dados antigos)
// ==============================
function getUserCartTickets() {
  // Normaliza primeiro
  const all = ensureIdsAndMigrateUsernames();

  const user = getLoggedUser();
  const key = getUserKey(user);

  if (!user) {
    // sem login: mostrar TUDO (comportamento antigo)
    return all;
  }

  // Com login: mostrar do utilizador + itens antigos sem username (compat)
  return all.filter(
    (t) =>
      t.username === key ||
      t.username === user?.username || // legacy
      t.username == null // itens antigos sem username
  );
}

function setUserCartTickets(items) {
  const user = getLoggedUser();
  const key = getUserKey(user);
  const all = getAllCartTickets();

  if (!user) {
    // sem login: substitui tudo
    setAllCartTickets(items);
    return;
  }

  // mantém os de outros users; substitui os do user/sem username por estes
  const others = all.filter(
    (t) =>
      !(
        t.username == null ||
        t.username === key ||
        t.username === user.username
      )
  );
  setAllCartTickets([
    ...others,
    ...items.map((it) => ({ ...it, username: it.username ?? key })),
  ]);
}

function calcSubtotal(items) {
  return items.reduce((s, t) => s + getPriceNum(t), 0);
}

// ==============================
// Reservas
// ==============================
function createReservationsFromCart(username, cartItems) {
  const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
  const orderId = "RSV-" + Date.now();

  cartItems.forEach((t) => {
    // 🔹 Pacote: grava como UM item de pacote
    if (t.isPackage) {
      reservations.push({
        reservationId: orderId + "-" + (t.id ?? Date.now() + Math.random()),
        orderId,
        username,
        isPackage: true,
        packageId: t.packageId,
        packageName: t.packageName,
        description: t.description,
        trips: Array.isArray(t.trips) ? t.trips.slice() : [], // IDs das trips do pacote
        price: Number(t.price ?? 0), // preço TOTAL do pacote
        status: "confirmed",
        createdAt: new Date().toISOString(),
        history: [],
      });
      return;
    }

    // 🔹 Viagem normal (como já tinhas)
    reservations.push({
      reservationId: orderId + "-" + (t.id ?? Date.now() + Math.random()),
      orderId,
      username,
      from: t.from,
      to: t.to,
      date: t.date,
      depart: t.depart,
      arrive: t.arrive,
      mode: t.mode,
      price: Number(typeof t.price === "number" ? t.price : t.price?.base ?? 0),
      status: "confirmed",
      createdAt: new Date().toISOString(),
      history: [],
    });
  });

  localStorage.setItem("reservations", JSON.stringify(reservations));
  return orderId;
}

// ==============================
// Estado de pontos (aplicados na UI)
// ==============================
let appliedPoints = 0; // pontos que o user quer usar agora (sem gastar até checkout)
let lastDiscount = 0; // € calculado só para mostrar

// ==============================
// Render principal do carrinho
// ==============================
function renderCart() {
  const cartContainer = document.getElementById("cartContainer");
  const cartSummary = document.getElementById("cartSummary");
  const totalPriceEl = document.getElementById("totalPrice"); // "Total: €x"
  const userPointsEl = document.getElementById("userPoints");
  const discountValueEl = document.getElementById("discountValue");
  const totalToPayEl = document.getElementById("totalToPay");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const user = getLoggedUser();
  const key = getUserKey(user);
  const items = getUserCartTickets();
  const subtotal = calcSubtotal(items);
  const availablePts = user ? getUserPoints(key) : 0;

  // Lista principal
  if (cartContainer) {
    cartContainer.innerHTML = "";
    if (items.length === 0) {
      cartContainer.innerHTML = "<p>O carrinho está vazio.</p>";
    } else {
      items.forEach((t) => {
        const card = document.createElement("div");
        card.className = "ticket-card";

        // Se for um pacote
        if (t.isPackage) {
          card.innerHTML = `
      <h3>🧳 Pacote: ${t.packageName}</h3>
      <p>${t.description}</p>
      <p>Inclui ${t.trips.length} viagens</p>
      <p><strong>Preço total:</strong> €${t.price.toFixed(2)}</p>
      <button class="deleteBtn" data-id="${t.id}">
        <i class="fas fa-trash"></i> Remover Pacote
      </button>
    `;
        } else {
          // Bilhete individual (mantém como estava)
          const price = getPriceNum(t);
          card.innerHTML = `
      <h3>${t.from} → ${t.to}</h3>
      <p>Data: ${t.date} | ${t.depart || ""}${
            t.arrive ? " – " + t.arrive : ""
          }</p>
      <p>Duração: ${t.durationMin} min | Stops: ${t.stops}</p>
      <p>Preço: €${price.toFixed(2)}</p>
      <p>Tipo: ${t.mode || "N/A"}</p>
      <p>Empresa: ${t.provider || t.providerName || "Não especificado"}</p>
      <button class="deleteBtn" data-id="${t.id}">
        <i class="fas fa-trash"></i> Remover
      </button>
    `;
        }

        card.querySelector(".deleteBtn").addEventListener("click", (e) => {
          const id = e.currentTarget.dataset.id;
          removeTicketById(id);
        });
        cartContainer.appendChild(card);
      });
    }
  }

  // Resumo lateral
  if (cartSummary) {
    cartSummary.innerHTML = "";
    items.forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${t.from} → ${t.to}</span><span>€${getPriceNum(
        t
      ).toFixed(2)}</span>`;
      cartSummary.appendChild(li);
    });
  }

  // Totais / Pontos
  const rate = { pts: 100, eur: 5 }; // 100 pts = 5€
  const usable = Math.min(appliedPoints, availablePts); // não deixa usar mais que tens
  const discount = (usable / rate.pts) * rate.eur;
  lastDiscount = discount;

  if (totalPriceEl) totalPriceEl.textContent = `Total: €${subtotal.toFixed(2)}`;
  if (userPointsEl) userPointsEl.textContent = availablePts;
  if (discountValueEl) discountValueEl.textContent = discount.toFixed(2);
  if (totalToPayEl)
    totalToPayEl.textContent = Math.max(0, subtotal - discount).toFixed(2);

  if (checkoutBtn) checkoutBtn.style.display = items.length ? "block" : "none";

  // Badge da navbar (se existir)
  const badge = document.getElementById("cartBadge");
  if (badge) {
    badge.hidden = items.length === 0;
    if (!badge.hidden) badge.textContent = items.length;
  }
}

function removeTicketById(id) {
  const all = getAllCartTickets();
  const next = all.filter((t) => String(t.id) !== String(id));
  setAllCartTickets(next);
  enforceBundlePricingForUser();
  renderCart();
}

// ==============================
// Eventos de Pontos + Checkout
// ==============================
function wireLoyaltyAndCheckout() {
  const applyBtn = document.getElementById("applyPoints");
  const pointsInp = document.getElementById("usePoints");
  const checkoutBtn = document.getElementById("checkoutBtn");

  // aplicar pontos (não gasta ainda)
  applyBtn?.addEventListener("click", () => {
    const user = getLoggedUser();
    if (!user) return alert("Inicia sessão.");
    const key = getUserKey(user);
    const available = getUserPoints(key);
    const req = Math.max(0, Math.floor(Number(pointsInp?.value || 0)));

    if (req > available) {
      alert(`Tens apenas ${available} pontos.`);
      appliedPoints = available;
      if (pointsInp) pointsInp.value = available;
    } else {
      appliedPoints = req;
    }
    enforceBundlePricingForUser();
    renderCart();
  });

  // finalizar compra
  checkoutBtn?.addEventListener("click", () => {
    const user = getLoggedUser();
    if (!user) return alert("Inicia sessão.");
    const key = getUserKey(user);

    const all = getAllCartTickets();
    const items = getUserCartTickets(); // já traz do user + legacy
    if (items.length === 0) return alert("Carrinho vazio.");

    const subtotal = calcSubtotal(items);

    // gasta pontos agora
    const { used, discount } = redeemPoints(key, appliedPoints, {
      pts: 100,
      eur: 5,
    });
    const toPay = Math.max(0, subtotal - discount);

    // credita pontos pelo valor pago (1 pt por €)
    const earned = Math.floor(toPay);
    updateUserPoints(key, earned);

    // criar reservas
    const orderId = createReservationsFromCart(key, items);

    // limpar itens (remove todos os que foram mostrados ao user)
    const shownIds = new Set(items.map((t) => String(t.id)));
    const others = all.filter((t) => !shownIds.has(String(t.id)));
    setAllCartTickets(others);

    appliedPoints = 0;
    enforceBundlePricingForUser();
    renderCart();

    showPopup(`Reserva ${orderId} criada.\nPontos usados: ${used}  \nDesconto: €${discount.toFixed(2)}\nPago: €${toPay.toFixed(2)}\nPontos ganhos: ${earned}`);
  });
}

// Reaplica/retira descontos de pacotes conforme conjunto completo esteja presente
function enforceBundlePricingForUser() {
  const user = getLoggedUser();
  if (!user) return;

  const key = user.email || user.username;
  const all = JSON.parse(localStorage.getItem("cartTickets")) || [];

  const mine = all.filter((i) => i.username === key);
  const others = all.filter((i) => i.username !== key);

  // agrupar por packageId
  const groups = new Map();
  for (const item of mine) {
    if (!item.packageId || !Array.isArray(item.packageTripIds) || !item.tripId)
      continue;
    if (!groups.has(item.packageId)) {
      groups.set(item.packageId, {
        items: [],
        expected: new Set(item.packageTripIds),
      });
    }
    groups.get(item.packageId).items.push(item);
  }

  let changed = false;

  for (const [pkgId, group] of groups.entries()) {
    const presentTripIds = new Set(group.items.map((i) => i.tripId));
    // válido se TODAS as expected estão presentes
    const valid = [...group.expected].every((id) => presentTripIds.has(id));

    for (const item of group.items) {
      const original = Number(item.originalPrice ?? item.price ?? 0);
      if (!valid) {
        // pacote incompleto -> remove desconto
        if (
          typeof item.originalPrice === "number" &&
          item.price !== item.originalPrice
        ) {
          item.price = Number(item.originalPrice);
          changed = true;
        }
        // remove marcações de pacote (opcional mas recomendado)
        delete item.packageId;
        delete item.packageTripIds;
        delete item.packageName;
      } else {
        // pacote completo -> certifica preço com desconto (deixa como está)
        // (se quiseres recomputar, precisas gravar também 'bundleShare' no add)
      }
    }
  }

  if (changed) {
    localStorage.setItem("cartTickets", JSON.stringify([...others, ...mine]));
  }
}

// ==============================
// Boot
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  enforceBundlePricingForUser();
  renderCart();
  wireLoyaltyAndCheckout();
});
window.addEventListener("storage", (e) => {
  if (["cartTickets", "loggedUser", "users"].includes(e.key))
    enforceBundlePricingForUser();
  renderCart();
});
