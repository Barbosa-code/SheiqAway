async function loadPacotes() {
  const data = await apiFetch("/SheiqAway/backend/admin/pacotes.php");
  const tbody = document.querySelector("#pacotesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.data.forEach((p) => {
    const tr = document.createElement("tr");
    const viagensList = p.viagens
      ? String(p.viagens)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .join(", ")
      : "";
    const ativaLabel = Number(p.ativa) === 1 ? "Sim" : "Nao";
    const toggleLabel = Number(p.ativa) === 1 ? "Desativar" : "Ativar";
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nome}</td>
      <td>${viagensList}</td>
      <td>EUR ${Number(p.preco_total || 0).toFixed(2)}</td>
      <td>${ativaLabel}</td>
      <td>
        <button class="toggle-btn" data-id="${p.id}">${toggleLabel}</button>
        <button class="delete-btn" data-id="${p.id}">Apagar</button>
      </td>
    `;
    tr.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("Apagar pacote?")) return;
      await apiFetch("/SheiqAway/backend/admin/pacotes.php", {
        method: "DELETE",
        body: JSON.stringify({ id: p.id }),
      });
      loadPacotes();
    });
    tr.querySelector(".toggle-btn").addEventListener("click", async () => {
      await apiFetch("/SheiqAway/backend/admin/pacotes.php", {
        method: "PUT",
        body: JSON.stringify({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          preco_total: Number(p.preco_total),
          ativa: Number(p.ativa) === 1 ? 0 : 1,
        }),
      });
      loadPacotes();
    });
    tbody.appendChild(tr);
  });
}

function renderPacoteViagens(list) {
  const tbody = document.querySelector("#pacoteViagensTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach((t) => {
    const preco = Number(t.preco_final ?? t.preco ?? 0);
    const dataPartida = String(t.data_partida || "").slice(0, 10);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.origem || ""}</td>
      <td>${t.destino || ""}</td>
      <td>${dataPartida}</td>
      <td>EUR ${preco.toFixed(2)}</td>
      <td><button class="select-btn" data-id="${t.id}">Adicionar</button></td>
    `;
    tr.querySelector(".select-btn").addEventListener("click", () => {
      const input = document.getElementById("pacoteViagens");
      if (!input) return;
      const raw = input.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const next = new Set(raw);
      next.add(String(t.id));
      input.value = Array.from(next).join(", ");
      input.focus();
    });
    tbody.appendChild(tr);
  });
}

const VIAGENS_PAGE_SIZE = 10;
let viagensCache = [];
let viagensPage = 1;

function updatePacotePagination() {
  const totalPages = Math.max(1, Math.ceil(viagensCache.length / VIAGENS_PAGE_SIZE));
  viagensPage = Math.min(viagensPage, totalPages);
  const start = (viagensPage - 1) * VIAGENS_PAGE_SIZE;
  const pageItems = viagensCache.slice(start, start + VIAGENS_PAGE_SIZE);
  renderPacoteViagens(pageItems);

  const prevBtn = document.getElementById("pacoteViagensPrev");
  const nextBtn = document.getElementById("pacoteViagensNext");
  const info = document.getElementById("pacoteViagensPageInfo");
  if (prevBtn) prevBtn.disabled = viagensPage <= 1;
  if (nextBtn) nextBtn.disabled = viagensPage >= totalPages;
  if (info) info.textContent = `Pagina ${viagensPage} de ${totalPages}`;
}

async function loadPacoteViagens(filters) {
  const params = new URLSearchParams();
  if (filters?.origem) params.set("origem", filters.origem);
  if (filters?.destino) params.set("destino", filters.destino);
  if (filters?.data) params.set("data", filters.data);
  const url = params.toString()
    ? `/SheiqAway/backend/api/viagens.php?${params}`
    : "/SheiqAway/backend/api/viagens.php";
  const data = await apiFetch(url);
  let list = Array.isArray(data.data) ? data.data : [];
  const query = (filters?.query || "").trim().toLowerCase();
  if (query) {
    list = list.filter((t) => {
      const fields = [t.origem, t.destino, t.companhia];
      return fields.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }
  viagensCache = list;
  viagensPage = 1;
  updatePacotePagination();
}

function wirePacoteSearch() {
  const form = document.getElementById("pacoteSearchForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    loadPacoteViagens({
      origem: document.getElementById("pacoteOrigem").value.trim(),
      destino: document.getElementById("pacoteDestino").value.trim(),
      data: document.getElementById("pacoteData").value,
      query: document.getElementById("pacoteQuery").value.trim(),
    });
  });
}

function wirePacoteForm() {
  const form = document.getElementById("pacoteForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nome: document.getElementById("pacoteNome").value.trim(),
      descricao: document.getElementById("pacoteDescricao").value.trim(),
      preco_total: Number(document.getElementById("pacotePreco").value),
      viagens: document.getElementById("pacoteViagens").value.trim(),
      ativa: Number(document.getElementById("pacoteAtiva").value) === 1 ? 1 : 0,
    };
    await apiFetch("/SheiqAway/backend/admin/pacotes.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    form.reset();
    loadPacotes();
  });
}

function wirePacotePagination() {
  const prevBtn = document.getElementById("pacoteViagensPrev");
  const nextBtn = document.getElementById("pacoteViagensNext");
  prevBtn?.addEventListener("click", () => {
    if (viagensPage > 1) {
      viagensPage -= 1;
      updatePacotePagination();
    }
  });
  nextBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(viagensCache.length / VIAGENS_PAGE_SIZE));
    if (viagensPage < totalPages) {
      viagensPage += 1;
      updatePacotePagination();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAdmin();
  wirePacoteForm();
  wirePacoteSearch();
  wirePacotePagination();
  loadPacoteViagens({});
  loadPacotes();
});
