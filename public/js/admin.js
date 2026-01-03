async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Erro na API.");
  }
  return data;
}

function ensureAdmin() {
  const user = JSON.parse(localStorage.getItem("loggedUser") || "null");
  if (!user || user.role !== "admin") {
    window.location.href = "login.html";
  }
}

async function loadUsers() {
  const data = await apiFetch("/SheiqAway/backend/admin/users.php");
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";
  data.data.forEach((u) => {
    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <h4>${u.nome}</h4>
      <p>${u.email}</p>
      <p>Pontos: ${u.pontos ?? 0}</p>
      <div class="user-actions">
        <button class="btn-primary" data-action="details" data-id="${u.id}">Ver detalhes</button>
        <button class="btn-danger" data-action="delete" data-id="${u.id}">Apagar</button>
      </div>
    `;
    card.querySelector('[data-action="details"]').addEventListener("click", () => {
      window.location.href = `admin-user.html?id=${u.id}`;
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Apagar utilizador?")) return;
      await apiFetch("/SheiqAway/backend/admin/users.php", {
        method: "DELETE",
        body: JSON.stringify({ id: u.id }),
      });
      loadUsers();
    });
    list.appendChild(card);
  });

  const statUsers = document.getElementById("statUsers");
  if (statUsers) statUsers.textContent = String(data.data.length);
}

async function loadPromos() {
  const data = await apiFetch("/SheiqAway/backend/admin/promocoes.php");
  const tbody = document.querySelector("#promosTable tbody");
  tbody.innerHTML = "";
  data.data.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.codigo}</td>
      <td>${Number(p.percentual_desconto || 0).toFixed(2)}%</td>
      <td>${p.data_inicio} - ${p.data_fim}</td>
      <td>${p.ativa ? "Sim" : "Nao"}</td>
      <td><button data-id="${p.id}">Apagar</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      if (!confirm("Apagar promocao?")) return;
      await apiFetch("/SheiqAway/backend/admin/promocoes.php", {
        method: "DELETE",
        body: JSON.stringify({ id: p.id }),
      });
      loadPromos();
    });
    tbody.appendChild(tr);
  });
}

async function loadPacotes() {
  const data = await apiFetch("/SheiqAway/backend/admin/pacotes.php");
  const tbody = document.querySelector("#pacotesTable tbody");
  tbody.innerHTML = "";
  data.data.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nome}</td>
      <td>${p.origem}</td>
      <td>${p.destino}</td>
      <td>€${Number(p.preco_base || 0).toFixed(2)}</td>
      <td><button data-id="${p.id}">Apagar</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      if (!confirm("Apagar pacote?")) return;
      await apiFetch("/SheiqAway/backend/admin/pacotes.php", {
        method: "DELETE",
        body: JSON.stringify({ id: p.id }),
      });
      loadPacotes();
    });
    tbody.appendChild(tr);
  });
}

async function loadStats() {
  const data = await apiFetch("/SheiqAway/backend/api/estatisticas.php");
  const container = document.getElementById("statsContainer");
  if (!container) return;
  const topClientes = data.top_clientes || [];
  const topDestinos = data.top_destinos || [];
  const porCompanhia = data.reservas_por_companhia || [];

  const totalReservas = porCompanhia.reduce(
    (sum, c) => sum + Number(c.total || 0),
    0
  );
  const maxClientes = Math.max(1, ...topClientes.map((c) => c.total_reservas));
  const maxDestinos = Math.max(1, ...topDestinos.map((d) => d.total));
  const maxCompanhia = Math.max(1, ...porCompanhia.map((c) => c.total));

  container.innerHTML = `
    <div class="stat-card">
      <h4>Clientes com mais reservas</h4>
      <div class="stat-list">
        ${topClientes
          .map(
            (c) => `
          <div class="stat-item">
            <span>${c.nome}</span>
            <span>${c.total_reservas}</span>
          </div>
          <div class="stat-bar"><span style="width:${(c.total_reservas / maxClientes) * 100}%"></span></div>
        `
          )
          .join("")}
      </div>
    </div>
    <div class="stat-card">
      <h4>Destinos mais comprados</h4>
      <div class="stat-list">
        ${topDestinos
          .map(
            (d) => `
          <div class="stat-item">
            <span>${d.destino}</span>
            <span>${d.total}</span>
          </div>
          <div class="stat-bar"><span style="width:${(d.total / maxDestinos) * 100}%"></span></div>
        `
          )
          .join("")}
      </div>
    </div>
    <div class="stat-card">
      <h4>Reservas por companhia</h4>
      <div class="stat-list">
        ${porCompanhia
          .map(
            (c) => `
          <div class="stat-item">
            <span>${c.companhia || "N/A"}</span>
            <span>${c.total}</span>
          </div>
          <div class="stat-bar"><span style="width:${(c.total / maxCompanhia) * 100}%"></span></div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  const statTotal = document.getElementById("statTotal");
  if (statTotal) statTotal.textContent = String(totalReservas);
  const statToday = document.getElementById("statToday");
  if (statToday) statToday.textContent = "-";
}

function wireForms() {
  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nome: document.getElementById("userNome").value.trim(),
      email: document.getElementById("userEmail").value.trim(),
      password: document.getElementById("userPassword").value,
      tipo: document.getElementById("userTipo").value,
    };
    await apiFetch("/SheiqAway/backend/admin/users.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    e.target.reset();
    loadUsers();
  });

  document.getElementById("promoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      codigo: document.getElementById("promoCodigo").value.trim(),
      descricao: document.getElementById("promoDescricao").value.trim(),
      percentual_desconto: Number(document.getElementById("promoPercent").value),
      data_inicio: document.getElementById("promoInicio").value,
      data_fim: document.getElementById("promoFim").value,
      ativa: 1,
    };
    await apiFetch("/SheiqAway/backend/admin/promocoes.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    e.target.reset();
    loadPromos();
  });

  document.getElementById("pacoteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nome: document.getElementById("pacoteNome").value.trim(),
      descricao: document.getElementById("pacoteDescricao").value.trim(),
      origem: document.getElementById("pacoteOrigem").value.trim(),
      destino: document.getElementById("pacoteDestino").value.trim(),
      data_partida: document.getElementById("pacoteDataPartida").value,
      data_regresso: document.getElementById("pacoteDataRegresso").value,
      preco_base: Number(document.getElementById("pacotePreco").value),
      promocao_id: Number(document.getElementById("pacotePromocao").value) || null,
    };
    await apiFetch("/SheiqAway/backend/admin/pacotes.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    e.target.reset();
    loadPacotes();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAdmin();
  wireForms();
  loadUsers();
  loadPromos();
  loadPacotes();
  loadStats();
});



