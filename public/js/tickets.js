// -------------------------
// MODAIS
// -------------------------
function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const msgEl = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    if (!modal || !msgEl || !yesBtn || !noBtn) {
      resolve(false);
      return;
    }

    msgEl.textContent = message;
    modal.classList.add("active");

    const cleanUp = () => {
      modal.classList.remove("active");
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", onNo);
    };

    const onYes = () => {
      cleanUp();
      resolve(true);
    };
    const onNo = () => {
      cleanUp();
      resolve(false);
    };

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
  });
}

function showAlert(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("alert-modal");
    const msgEl = document.getElementById("alert-message");
    const okBtn = document.getElementById("alert-ok");

    if (!modal || !msgEl || !okBtn) {
      resolve();
      return;
    }

    msgEl.textContent = message;
    modal.classList.add("active");

    const cleanUp = () => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", onOk);
    };

    const onOk = () => {
      cleanUp();
      resolve();
    };

    okBtn.addEventListener("click", onOk);
  });
}

const detailsModal = document.getElementById("details-modal");
const detailsBody = document.getElementById("details-body");
const detailsClose = document.getElementById("details-close");

function formatIso(value) {
  if (!value) return "-";
  const str = String(value);
  const match = str.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/
  );
  if (match) return `${match[1]} ${match[2]}`;
  return str;
}

function row(label, value) {
  return `
    <div class="details-row">
      <div class="details-label">${label}</div>
      <div class="details-value">${value || "-"}</div>
    </div>
  `;
}

function showDetails(payload) {
  if (!detailsModal || !detailsBody) return;
  const local = payload.raw_local || {};
  const passageiros = Array.isArray(local.passageiros) ? local.passageiros : [];
  const passageirosLabel = passageiros.length
    ? `${passageiros.length} passageiro(s)`
    : "-";
  const passageirosHtml = passageiros.length
    ? `
      <div class="details-row details-row-full">
        <div class="details-label">Passageiros</div>
        <div class="details-value">
          <ul class="details-list">
            ${passageiros
              .map((p) => {
                const nome = String(p.nome || "").trim();
                if (!nome) return `<li>-</li>`;
                const parts = nome.split(/\s+/).filter(Boolean);
                const first = parts[0] || "-";
                const last = parts.length > 1 ? parts[parts.length - 1] : "";
                const display = last ? `${first} ${last}` : first;
                return `<li>${display}</li>`;
              })
              .join("")}
          </ul>
        </div>
      </div>
    `
    : "";

  const html = [
    row("Origem", local.origem || payload.origem),
    row("Destino", local.destino || payload.destino),
    row("Data partida", formatIso(local.data_partida || payload.data_partida)),
    row("Companhia", local.companhia || payload.companhia),
    row(
      "Preco",
      `EUR ${Number(local.preco_total || payload.preco_total || 0).toFixed(2)}`
    ),
    row("Estado", local.estado || payload.estado || "confirmada"),
    row("Criado em", formatIso(local.created_at || payload.created_at)),
    row("Passageiros", passageirosLabel),
    passageirosHtml,
  ]
    .filter(Boolean)
    .join("");

  detailsBody.innerHTML = html;
  detailsModal.classList.add("active");
}

function hideDetails() {
  detailsModal?.classList.remove("active");
}

detailsClose?.addEventListener("click", hideDetails);
detailsModal?.addEventListener("click", (e) => {
  if (e.target === detailsModal) hideDetails();
});

function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem("loggedUser")) || null;
  } catch {
    return null;
  }
}

async function fetchLocalReservations() {
  const res = await fetch("/SheiqAway/backend/api/reservas.php", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) {
    window.location.href = "login.html";
    return [];
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !Array.isArray(data.data)) {
    return [];
  }
  return data.data;
}

async function fetchApiReservations(email) {
  const qs = email ? `?api=true&email=${encodeURIComponent(email)}` : "?api=true";
  const res = await fetch(`/SheiqAway/backend/api/reservas.php${qs}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  if (!data.ok) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data?.reservas)) return data.data.reservas;
  if (Array.isArray(data.reservas)) return data.reservas;
  return [];
}

function normalizeLocalReservation(r) {
  return {
    local_id: r.id ?? null,
    api_id: r.api_reserva_id ?? r.api_id ?? null,
    origem: r.origem,
    destino: r.destino,
    data_partida: r.data_partida,
    data_chegada: r.data_chegada ?? null,
    tipo: r.tipo ?? null,
    duracao_min: r.duracao_min ?? null,
    escala: r.escala ?? null,
    escala_info: r.escala_info ?? null,
    lugares_disponiveis: r.lugares_disponiveis ?? null,
    companhia: r.companhia,
    preco_total: r.preco_total ?? r.preco ?? 0,
    estado: r.estado || "confirmada",
    raw_local: r,
  };
}

function normalizeApiReservation(r) {
  const viagem = r.viagem || r.viagem_atualizada || {};
  return {
    local_id: null,
    api_id: r.id ?? r.reservaId ?? null,
    origem: r.origem || viagem.origem || "",
    destino: r.destino || viagem.destino || "",
    data_partida: r.data_partida || r.data || viagem.data_partida || "",
    data_chegada: r.data_chegada || viagem.data_chegada || "",
    companhia: r.companhia || viagem.companhia || "",
    preco_total: r.preco_total ?? r.preco ?? viagem.preco ?? 0,
    tipo: r.tipo || viagem.tipo || "",
    duracao_min: r.duracao_min ?? viagem.duracao_min ?? null,
    escala: r.escala ?? viagem.escala ?? null,
    escala_info: r.escala_info || viagem.escala_info || null,
    lugares_disponiveis:
      r.lugares_disponiveis ?? viagem.lugares_disponiveis ?? null,
    estado: "confirmada",
    raw_api: r,
  };
}

function mergeReservations(localList, apiList) {
  const localNorm = localList.map(normalizeLocalReservation);
  const apiNorm = apiList.map(normalizeApiReservation);

  const localByApi = new Map(
    localNorm
      .filter((r) => r.api_id)
      .map((r) => [String(r.api_id), r])
  );

  const merged = apiNorm.map((api) => {
    const local = api.api_id ? localByApi.get(String(api.api_id)) : null;
    if (!local) return api;
    return {
      ...api,
      ...local,
      estado: local.estado || api.estado,
      raw_api: api.raw_api,
    };
  });

  const apiIds = new Set(apiNorm.map((r) => String(r.api_id || "")));
  localNorm.forEach((local) => {
    if (!local.api_id || !apiIds.has(String(local.api_id))) {
      merged.push(local);
    }
  });

  return merged;
}

async function fetchPoints() {
  const res = await fetch("/SheiqAway/backend/api/pontos.php", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return 0;
  const data = await res.json().catch(() => ({}));
  return Number(data.pontos || 0);
}

async function cancelReservation(localId, apiId) {
  const res = await fetch("/SheiqAway/backend/api/cancelar_reserva.php", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ local_id: localId, id: apiId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Erro ao cancelar reserva.");
  }
}

function formatDate(str) {
  return str || "-";
}

function renderReservations(list) {
  const ticketsContainer = document.getElementById("ticketsContainer");
  if (!ticketsContainer) return;

  ticketsContainer.innerHTML = "";
  if (!list.length) {
    ticketsContainer.innerHTML = "<p>Nao tens reservas ainda.</p>";
    return;
  }

  list.forEach((r) => {
    const card = document.createElement("div");
    card.className = "ticket-card";
    const estado = r.estado || "confirmada";

    const canCancel = Boolean(r.local_id) && estado !== "cancelada";

    card.innerHTML = `
      <div class="ticket-header">
        <h3>${r.origem || "-"} -> ${r.destino || "-"}</h3>
        <p class="ticket-date">${formatDate(r.data_partida)}</p>
      </div>
      <p>Companhia: ${r.companhia || "-"}</p>
      <p>Preco: EUR ${Number(r.preco_total || 0).toFixed(2)}</p>
      <p>Estado: <strong>${estado}</strong></p>
      <div class="actions${canCancel ? "" : " single"}">
        <button class="btn-details">Detalhes</button>
        ${
          canCancel
            ? `<button class="btn-cancel" data-local-id="${r.local_id}" data-api-id="${r.api_id ?? ""}">Cancelar</button>`
            : ""
        }
      </div>
    `;

    card.querySelector(".btn-details")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const payload = {
        origem: r.origem,
        destino: r.destino,
        data_partida: r.data_partida,
        data_chegada: r.data_chegada,
        companhia: r.companhia,
        preco_total: r.preco_total,
        tipo: r.tipo,
        duracao_min: r.duracao_min,
        escala: r.escala,
        escala_info: r.escala_info,
        lugares_disponiveis: r.lugares_disponiveis,
        estado: r.estado,
        api_id: r.api_id,
        local_id: r.local_id,
        raw_api: r.raw_api ?? null,
        raw_local: r.raw_local ?? null,
      };
      showDetails(payload);
    });

    card.querySelector(".btn-cancel")?.addEventListener("click", async () => {
      const confirmed = await showConfirm("Tens a certeza que queres cancelar esta reserva?");
      if (!confirmed) return;
      try {
        await cancelReservation(r.local_id, r.api_id);
        await showAlert("Reserva cancelada.");
        loadAndRender();
      } catch (err) {
        await showAlert(err.message || "Erro ao cancelar.");
      }
    });

    ticketsContainer.appendChild(card);
  });
}

async function loadAndRender() {
  const user = getLoggedUser();
  const [localList, apiList] = await Promise.all([
    fetchLocalReservations(),
    fetchApiReservations(user?.email || ""),
  ]);
  const merged = mergeReservations(localList, apiList);
  renderReservations(merged);
}

document.addEventListener("DOMContentLoaded", () => {
  const user = getLoggedUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  loadAndRender();
  const pointsEl = document.getElementById("pointsInfo");
  if (pointsEl) {
    fetchPoints().then((pts) => {
      pointsEl.textContent = `Pontos de fidelizacao: ${pts}`;
    });
  }
});




