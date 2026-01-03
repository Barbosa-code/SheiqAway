function ensureAdmin() {
  const user = JSON.parse(localStorage.getItem("loggedUser") || "null");
  if (!user || user.role !== "admin") {
    window.location.href = "login.html";
  }
}

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("id");
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value);
}

function shortName(value) {
  const name = String(value || "").trim();
  if (!name) return "-";
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] || "-";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last}` : first;
}

async function loadUser() {
  const id = getQueryId();
  if (!id) {
    window.location.href = "admin-users.html";
    return;
  }

  const res = await fetch(`/SheiqAway/backend/admin/user.php?id=${id}`, {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    alert(data.error || "Falha ao carregar utilizador.");
    window.location.href = "admin-users.html";
    return;
  }

  const user = data.user || {};
  const reservas = Array.isArray(data.reservas) ? data.reservas : [];

  const nameEl = document.getElementById("userName");
  const emailEl = document.getElementById("userEmail");
  if (nameEl) nameEl.textContent = user.nome || "Utilizador";
  if (emailEl) emailEl.textContent = user.email || "";

  const meta = document.getElementById("userMeta");
  if (meta) {
    meta.innerHTML = `
      <div class="meta-card">
        <span>Telefone</span>
        <strong>${user.telefone || "-"}</strong>
      </div>
      <div class="meta-card">
        <span>Data registo</span>
        <strong>${formatDate(user.created_at)}</strong>
      </div>
      <div class="meta-card">
        <span>Pontos</span>
        <strong>${user.pontos ?? 0}</strong>
      </div>
      <div class="meta-card">
        <span>Total reservas</span>
        <strong>${reservas.length}</strong>
      </div>
    `;
  }

  const list = document.getElementById("userReservations");
  if (!list) return;
  list.innerHTML = "";
  if (!reservas.length) {
    list.innerHTML = "<p>Sem reservas.</p>";
    return;
  }

  reservas.forEach((r) => {
    const passageiros = Array.isArray(r.passageiros) ? r.passageiros : [];
    const card = document.createElement("div");
    card.className = "reservation-card";
    card.innerHTML = `
      <div class="reservation-header">
        <h4>${r.origem || "-"} -> ${r.destino || "-"}</h4>
        <span class="reservation-state">${r.estado || "confirmada"}</span>
      </div>
      <p>Data: ${formatDate(r.data_partida)}</p>
      <p>Companhia: ${r.companhia || "-"}</p>
      <p>Preco: EUR ${Number(r.preco_total || 0).toFixed(2)}</p>
      <p>Passageiros: ${passageiros.length}</p>
      ${
        passageiros.length
          ? `<ul class="reservation-passengers">
              ${passageiros
                .map((p) => `<li>${shortName(p.nome)}</li>`)
                .join("")}
            </ul>`
          : ""
      }
    `;
    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAdmin();
  const backBtn = document.getElementById("backBtn");
  backBtn?.addEventListener("click", () => {
    window.location.href = "admin-users.html";
  });
  loadUser();
});
