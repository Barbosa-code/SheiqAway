async function loadPromos() {
  const data = await apiFetch("/SheiqAway/backend/admin/promocoes.php");
  const tbody = document.querySelector("#promosTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.data.forEach((p) => {
    const tr = document.createElement("tr");
    const ativaLabel = Number(p.ativa) === 1 ? "Sim" : "Nao";
    const toggleLabel = Number(p.ativa) === 1 ? "Desativar" : "Ativar";
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.viagem_id}</td>
      <td>${Number(p.percentual_desconto || 0).toFixed(2)}%</td>
      <td>${ativaLabel}</td>
      <td>
        <button class="toggle-btn" data-id="${p.id}">${toggleLabel}</button>
        <button class="delete-btn" data-id="${p.id}">Apagar</button>
      </td>
    `;
    tr.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("Apagar promocao?")) return;
      await apiFetch("/SheiqAway/backend/admin/promocoes.php", {
        method: "DELETE",
        body: JSON.stringify({ id: p.id }),
      });
      loadPromos();
    });
    tr.querySelector(".toggle-btn").addEventListener("click", async () => {
      try {
        await apiFetch("/SheiqAway/backend/admin/promocoes.php", {
          method: "PUT",
          body: JSON.stringify({
            id: p.id,
            viagem_id: Number(p.viagem_id),
            percentual_desconto: Number(p.percentual_desconto),
            ativa: Number(p.ativa) === 1 ? 0 : 1,
          }),
        });
        loadPromos();
      } catch (err) {
        showErrorModal(err);
      }
    });
    tbody.appendChild(tr);
  });
}

function showErrorModal(err) {
  const modal = document.getElementById("adminErrorModal");
  const text = document.getElementById("adminErrorText");
  if (!modal || !text) return;
  const message = err instanceof Error ? err.message : String(err || "Erro.");
  text.textContent = message;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function hideErrorModal() {
  const modal = document.getElementById("adminErrorModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function wireErrorModal() {
  const modal = document.getElementById("adminErrorModal");
  const closeBtn = document.getElementById("adminErrorClose");
  closeBtn?.addEventListener("click", hideErrorModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) hideErrorModal();
  });
}

function renderViagens(list) {
  const tbody = document.querySelector("#viagensTable tbody");
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
      <td><button class="select-btn" data-id="${t.id}">Usar ID</button></td>
    `;
    tr.querySelector(".select-btn").addEventListener("click", () => {
      const input = document.getElementById("promoViagemId");
      if (input) {
        input.value = String(t.id);
        input.focus();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    tbody.appendChild(tr);
  });
}

const VIAGENS_PAGE_SIZE = 10;
let viagensCache = [];
let viagensPage = 1;

function updateViagensPagination() {
  const totalPages = Math.max(1, Math.ceil(viagensCache.length / VIAGENS_PAGE_SIZE));
  viagensPage = Math.min(viagensPage, totalPages);
  const start = (viagensPage - 1) * VIAGENS_PAGE_SIZE;
  const pageItems = viagensCache.slice(start, start + VIAGENS_PAGE_SIZE);
  renderViagens(pageItems);

  const prevBtn = document.getElementById("viagensPrev");
  const nextBtn = document.getElementById("viagensNext");
  const info = document.getElementById("viagensPageInfo");
  if (prevBtn) prevBtn.disabled = viagensPage <= 1;
  if (nextBtn) nextBtn.disabled = viagensPage >= totalPages;
  if (info) info.textContent = `Pagina ${viagensPage} de ${totalPages}`;
}

async function loadViagens(filters) {
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
  updateViagensPagination();
}

function wireViagemSearch() {
  const form = document.getElementById("viagemSearchForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    loadViagens({
      origem: document.getElementById("viagemOrigem").value.trim(),
      destino: document.getElementById("viagemDestino").value.trim(),
      data: document.getElementById("viagemData").value,
      query: document.getElementById("viagemQuery").value.trim(),
    });
  });
}

function wirePromoForm() {
  const form = document.getElementById("promoForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      viagem_id: Number(document.getElementById("promoViagemId").value),
      percentual_desconto: Number(document.getElementById("promoPercent").value),
      ativa: Number(document.getElementById("promoAtiva").value) === 1 ? 1 : 0,
    };
    try {
      await apiFetch("/SheiqAway/backend/admin/promocoes.php", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      loadPromos();
    } catch (err) {
      showErrorModal(err);
    }
  });
}

function wireViagensPagination() {
  const prevBtn = document.getElementById("viagensPrev");
  const nextBtn = document.getElementById("viagensNext");
  prevBtn?.addEventListener("click", () => {
    if (viagensPage > 1) {
      viagensPage -= 1;
      updateViagensPagination();
    }
  });
  nextBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(viagensCache.length / VIAGENS_PAGE_SIZE));
    if (viagensPage < totalPages) {
      viagensPage += 1;
      updateViagensPagination();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAdmin();
  wirePromoForm();
  wireViagemSearch();
  wireViagensPagination();
  wireErrorModal();
  loadViagens({});
  loadPromos();
});
