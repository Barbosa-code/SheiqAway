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
const passengerModal = document.getElementById("passengerModal");
const passengerList = document.getElementById("passengerList");
const addPassengerBtn = document.getElementById("addPassengerBtn");
const passengerCancelBtn = document.getElementById("passengerCancelBtn");
const passengerConfirmBtn = document.getElementById("passengerConfirmBtn");
const passengerTripInfo = document.getElementById("passengerTripInfo");

function showPopup(message) {
  popupMessage.textContent = message;
  popupModal.classList.add("active");
}

popupCloseBtn.addEventListener("click", () => {
  popupModal.classList.remove("active");
});
popupModal.querySelector(".popup-overlay").addEventListener("click", () => {
  popupModal.classList.remove("active");
});

function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem("loggedUser")) || null;
  } catch {
    return null;
  }
}

function getCartItems() {
  return JSON.parse(localStorage.getItem("cartTickets")) || [];
}

function setCartItems(items) {
  localStorage.setItem("cartTickets", JSON.stringify(items || []));
}

function getPriceNum(t) {
  return Number(typeof t.price === "number" ? t.price : t.price?.base ?? 0);
}

function getItemQty(t) {
  const qty = Number(t?.passengersCount ?? t?.qty ?? 1);
  return Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
}

function getItemTotal(t) {
  const base = getPriceNum(t);
  return base * getItemQty(t);
}

function normalizeSeats(value) {
  const seats = Number(value);
  if (!Number.isFinite(seats) || seats <= 0) return null;
  return Math.floor(seats);
}

function getMaxPassengers(item) {
  const direct = normalizeSeats(
    item?.availableSeats ?? item?.lugares_disponiveis ?? item?.seats ?? null
  );
  if (direct) return direct;
  if (item?.isPackage && Array.isArray(item.tripsDetails)) {
    const mins = item.tripsDetails
      .map((t) =>
        normalizeSeats(t?.availableSeats ?? t?.lugares_disponiveis ?? t?.seats)
      )
      .filter((v) => v);
    if (mins.length) return Math.min(...mins);
  }
  return null;
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

let availablePoints = 0;
let appliedPoints = 0;

async function fetchUserPoints() {
  try {
    const res = await fetch("/SheiqAway/backend/api/pontos.php", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.pontos || 0);
  } catch {
    return 0;
  }
}

function renderCart() {
  const cartContainer = document.getElementById("cartContainer");
  const cartSummary = document.getElementById("cartSummary");
  const totalPriceEl = document.getElementById("totalPrice");
  const userPointsEl = document.getElementById("userPoints");
  const discountValueEl = document.getElementById("discountValue");
  const totalToPayEl = document.getElementById("totalToPay");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const items = getCartItems();
  let needsSave = false;
  items.forEach((t) => {
    if (!t.passengersCount || t.passengersCount < 1) {
      t.passengersCount = 1;
      needsSave = true;
    }
    const maxSeats = getMaxPassengers(t);
    if (maxSeats && t.passengersCount > maxSeats) {
      t.passengersCount = maxSeats;
      needsSave = true;
    }
  });
  if (needsSave) setCartItems(items);
  const subtotal = items.reduce((s, t) => s + getItemTotal(t), 0);

  if (cartContainer) {
    cartContainer.innerHTML = "";
    if (items.length === 0) {
      cartContainer.innerHTML = "<p>O carrinho esta vazio.</p>";
    } else {
      items.forEach((t) => {
        const card = document.createElement("div");
        card.className = "ticket-card";
        if (t.isPackage) {
          const tripsList = Array.isArray(t.tripsDetails)
            ? t.tripsDetails
                .map(
                  (trip) =>
                    `<li>${trip.origem || "-"} -> ${trip.destino || "-"} | ${
                      (trip.data_partida || "").slice(0, 10)
                    }</li>`
                )
                .join("")
            : "";
          card.innerHTML = `
            <h3>Pacote: ${t.packageName || "Pacote"}</h3>
            <p>${t.description || ""}</p>
            ${
              tripsList
                ? `<details class="package-details"><summary>Ver viagens do pacote</summary><ul>${tripsList}</ul></details>`
                : ""
            }
            <p><strong>Preco por passageiro:</strong> EUR ${getPriceNum(t).toFixed(2)}</p>
            <label class="passenger-qty-label">Passageiros:</label>
            <input class="passenger-qty-input" type="number" min="1" step="1" value="${getItemQty(t)}" />
            <p class="price">Total pacote: EUR ${getItemTotal(t).toFixed(2)}</p>
            <button class="deleteBtn" data-id="${t.id}">Remover</button>
          `;
        } else {
          const price = getPriceNum(t);
          card.innerHTML = `
            <h3>${t.from} -> ${t.to}</h3>
            <p>Data: ${t.date} | ${t.depart || ""}${t.arrive ? " - " + t.arrive : ""}</p>
            <p>Duracao: ${t.durationMin} min | Stops: ${t.stops}</p>
            <p>Preco por passageiro: EUR ${price.toFixed(2)}</p>
            <p>Tipo: ${formatTripType(t.mode)}</p>
            <p>Empresa: ${t.provider || t.providerName || "Nao especificado"}</p>
            <label class="passenger-qty-label">Passageiros:</label>
            <input class="passenger-qty-input" type="number" min="1" step="1" value="${getItemQty(t)}" />
            <p class="price">Total viagem: EUR ${(price * getItemQty(t)).toFixed(2)}</p>
            <button class="deleteBtn" data-id="${t.id}">Remover</button>
          `;
        }
        card.querySelector(".deleteBtn").addEventListener("click", (e) => {
          const id = e.currentTarget.dataset.id;
          const next = getCartItems().filter((x) => String(x.id) !== String(id));
          setCartItems(next);
          renderCart();
        });
        const qtyInput = card.querySelector(".passenger-qty-input");
        if (qtyInput) {
          qtyInput.addEventListener("change", (e) => {
            const nextQty = Math.max(1, Math.floor(Number(e.target.value || 1)));
            const maxSeats = getMaxPassengers(t);
            const finalQty = maxSeats ? Math.min(nextQty, maxSeats) : nextQty;
            if (maxSeats && nextQty > maxSeats) {
              alert(`Maximo de passageiros disponivel: ${maxSeats}.`);
            }
            e.target.value = String(finalQty);
            const next = getCartItems().map((x) =>
              String(x.id) === String(t.id)
                ? { ...x, passengersCount: finalQty }
                : x
            );
            setCartItems(next);
            renderCart();
          });
        }
        cartContainer.appendChild(card);
      });
    }
  }

  if (cartSummary) {
    cartSummary.innerHTML = "";
    items.forEach((t) => {
      const li = document.createElement("li");
      const qty = getItemQty(t);
      const label = t.from || t.packageName || "Item";
      li.innerHTML = `<span>${label} x${qty}</span><span>EUR ${getItemTotal(
        t
      ).toFixed(2)}</span>`;
      cartSummary.appendChild(li);
    });
  }

  const rate = { pts: 100, eur: 5 };
  const usable = Math.min(appliedPoints, availablePoints);
  const discount = (usable / rate.pts) * rate.eur;

  if (totalPriceEl) totalPriceEl.textContent = `Total: EUR ${subtotal.toFixed(2)}`;
  if (userPointsEl) userPointsEl.textContent = String(availablePoints);
  if (discountValueEl) discountValueEl.textContent = discount.toFixed(2);
  if (totalToPayEl)
    totalToPayEl.textContent = `EUR ${Math.max(0, subtotal - discount).toFixed(2)}`;

  if (checkoutBtn) checkoutBtn.style.display = items.length ? "block" : "none";
}

function validDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isPastOrToday(dateStr) {
  if (!validDate(dateStr)) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2;
}

function createPassengerRow(data = {}, canRemove = true) {
  const row = document.createElement("div");
  row.className = "passenger-row";
  row.dataset.fixed = canRemove ? "0" : "1";
  const nome = String(data.nome || "");
  const dataNasc = String(data.data_nascimento || "");
  const email = String(data.email || "");

  row.innerHTML = `
    <div class="field">
      <label>Nome completo</label>
      <input type="text" data-field="nome" value="${nome}" />
    </div>
    <div class="field date-field">
      <label>Data de nascimento</label>
      <input type="date" data-field="data_nascimento" value="${dataNasc}" />
    </div>
    <div class="field full email-field">
      <label>Email</label>
      <div class="email-row">
        <input type="email" data-field="email" value="${email}" />
        <button type="button" class="remove-passenger" ${
          canRemove ? "" : "disabled"
        }>Remover</button>
      </div>
    </div>
  `;

  row.querySelector(".remove-passenger").addEventListener("click", () => {
    if (!canRemove) return;
    row.remove();
    updateRemoveButtons();
  });

  return row;
}

function updateRemoveButtons() {
  if (!passengerList) return;
  const buttons = passengerList.querySelectorAll(".remove-passenger");
  const disable = buttons.length <= 1;
  buttons.forEach((btn) => {
    const fixed = btn.closest(".passenger-row")?.dataset.fixed === "1";
    btn.disabled = disable || fixed;
  });
}

function resetPassengerModal(defaultEmail, count, tripLabel) {
  if (!passengerList) return;
  passengerList.innerHTML = "";
  const qty = Math.max(1, Math.floor(Number(count || 1)));
  for (let i = 0; i < qty; i++) {
    passengerList.appendChild(
      createPassengerRow({ email: defaultEmail || "" }, i > 0)
    );
  }
  updateRemoveButtons();
  if (passengerTripInfo) {
    passengerTripInfo.textContent = tripLabel || "";
  }
}

function readPassengers() {
  if (!passengerList) {
    return { ok: false, error: "Modal de passageiros indisponivel." };
  }
  const rows = passengerList.querySelectorAll(".passenger-row");
  if (!rows.length) {
    return { ok: false, error: "Adiciona pelo menos um passageiro." };
  }

  const passengers = [];
  for (const row of rows) {
    const nome = row.querySelector('[data-field="nome"]')?.value.trim() || "";
    const dataNasc =
      row.querySelector('[data-field="data_nascimento"]')?.value.trim() || "";
    const email = row.querySelector('[data-field="email"]')?.value.trim() || "";

    if (!nome || !isValidName(nome)) {
      return {
        ok: false,
        error: "Nome invalido. Usa nome e apelido.",
      };
    }

    if (!dataNasc || !isPastOrToday(dataNasc)) {
      return {
        ok: false,
        error: "Data de nascimento invalida.",
      };
    }

    if (!email || !isValidEmail(email)) {
      return {
        ok: false,
        error: "Email invalido.",
      };
    }

    passengers.push({
      nome,
      data_nascimento: dataNasc,
      email,
    });
  }

  return { ok: true, data: passengers };
}

function collectPassengers(loggedUser, count, tripLabel) {
  return new Promise((resolve) => {
    if (
      !passengerModal ||
      !passengerList ||
      !passengerCancelBtn ||
      !passengerConfirmBtn
    ) {
      resolve(null);
      return;
    }

    const qty = Math.max(1, Math.floor(Number(count || 1)));
    resetPassengerModal(loggedUser?.email || "", qty, tripLabel);
    passengerModal.style.display = "block";

    const onCancel = () => {
      cleanup();
      resolve(null);
    };
    const onConfirm = () => {
      const result = readPassengers();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      cleanup();
      resolve(result.data);
    };
    const onOverlay = (e) => {
      if (e.target === passengerModal) {
        onCancel();
      }
    };
    const cleanup = () => {
      passengerModal.style.display = "none";
      passengerCancelBtn.removeEventListener("click", onCancel);
      passengerConfirmBtn.removeEventListener("click", onConfirm);
      passengerModal.removeEventListener("click", onOverlay);
    };

    passengerCancelBtn.addEventListener("click", onCancel);
    passengerConfirmBtn.addEventListener("click", onConfirm);
    passengerModal.addEventListener("click", onOverlay);
  });
}

async function checkout() {
  const user = getLoggedUser();
  if (!user) {
    alert("Inicia sessao.");
    return;
  }

  const items = getCartItems();
  if (!items.length) {
    alert("Carrinho vazio.");
    return;
  }

  const rate = { pts: 100, eur: 5 };
  const usable = Math.min(appliedPoints, availablePoints);
  const discount = (usable / rate.pts) * rate.eur;

  let remainingDiscount = discount;
  let remainingPoints = usable;

  const createReserva = async (payload) => {
    const res = await fetch("/SheiqAway/backend/api/reservas.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Erro ao criar a reserva.");
    }
    return data;
  };

  for (const item of items) {
    let qty = getItemQty(item);
    let itemPrice = getItemTotal(item);
    const maxSeats = getMaxPassengers(item);
    if (maxSeats && qty > maxSeats) {
      alert(`Maximo de passageiros disponivel: ${maxSeats}.`);
      qty = maxSeats;
      itemPrice = getPriceNum(item) * qty;
    }
    const tripLabel = item.isPackage
      ? `Pacote ${item.packageName || "Pacote"} | Passageiros: ${qty}`
      : `${item.from || "-"} -> ${item.to || "-"} | Passageiros: ${qty}`;
    const passengers = await collectPassengers(user, qty, tripLabel);
    if (!passengers || passengers.length < 1) {
      alert("Dados do passageiro invalidos.");
      return;
    }
    if (passengers.length !== qty) {
      qty = passengers.length;
      itemPrice = getPriceNum(item) * qty;
    }
    const applyDiscount =
      remainingDiscount > 0 ? Math.min(itemPrice, remainingDiscount) : 0;
    const totalPago = Math.max(0, itemPrice - applyDiscount);
    const pontosUsados =
      remainingPoints > 0
        ? Math.min(
            remainingPoints,
            Math.ceil((applyDiscount / rate.eur) * rate.pts)
          )
        : 0;

    if (item.isPackage) {
      const tripsDetails = Array.isArray(item.tripsDetails)
        ? item.tripsDetails
        : [];
      if (!tripsDetails.length) {
        alert("Pacote sem detalhes. Remove e adiciona novamente.");
        return;
      }
      const count = tripsDetails.length;
      const perTripTotal = itemPrice / count;
      const perTripDiscount = applyDiscount / count;
      let remainingItemPoints = pontosUsados;

      for (let i = 0; i < tripsDetails.length; i += 1) {
        const t = tripsDetails[i];
        const isLast = i === tripsDetails.length - 1;
        const tripTotal = isLast
          ? itemPrice - perTripTotal * (count - 1)
          : perTripTotal;
        const tripDiscount = isLast
          ? applyDiscount - perTripDiscount * (count - 1)
          : perTripDiscount;
        const tripPoints = isLast
          ? remainingItemPoints
          : Math.floor(pontosUsados / count);
        remainingItemPoints = Math.max(0, remainingItemPoints - tripPoints);

        const payload = {
          viagemId: t.id,
          origem: t.origem || "",
          destino: t.destino || "",
          data_partida: t.data_partida || "",
          preco_total: tripTotal,
          companhia: t.companhia || "",
          passageiros: passengers,
          pontos_usados: tripPoints,
          total_pago: Math.max(0, tripTotal - tripDiscount),
        };

        try {
          await createReserva(payload);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Erro ao criar a reserva.");
          return;
        }
      }
    } else {
      if (!item.apiViagemId) {
        alert("Viagem invalida no carrinho.");
        return;
      }
      const payload = {
        viagemId: item.apiViagemId,
        origem: item.origem || item.from,
        destino: item.destino || item.to,
        data_partida: item.data_partida || item.date,
        preco_total: itemPrice,
        companhia: item.companhia || item.provider,
        passageiros: passengers,
        pontos_usados: pontosUsados,
        total_pago: totalPago,
      };

      try {
        await createReserva(payload);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao criar a reserva.");
        return;
      }
    }

    remainingDiscount = Math.max(0, remainingDiscount - applyDiscount);
    remainingPoints = Math.max(0, remainingPoints - pontosUsados);
  }

  setCartItems([]);
  appliedPoints = 0;
  availablePoints = await fetchUserPoints();
  renderCart();
  showPopup("Reserva criada com sucesso.");
}

function wireEvents() {
  const applyBtn = document.getElementById("applyPoints");
  const pointsInp = document.getElementById("usePoints");
  const checkoutBtn = document.getElementById("checkoutBtn");

  applyBtn?.addEventListener("click", () => {
    const req = Math.max(0, Math.floor(Number(pointsInp?.value || 0)));
    appliedPoints = Math.min(req, availablePoints);
    if (pointsInp) pointsInp.value = String(appliedPoints);
    renderCart();
  });

  checkoutBtn?.addEventListener("click", () => {
    checkout();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  availablePoints = await fetchUserPoints();
  renderCart();
  wireEvents();
});



















