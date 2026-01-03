const pageSize = 10;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;

function filterUsers(query) {
  const q = query.trim().toLowerCase();
  if (!q) return allUsers.slice();
  return allUsers.filter((u) => {
    const name = String(u.nome || "").toLowerCase();
    const email = String(u.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });
}

function renderPagination(totalItems) {
  const container = document.getElementById("usersPagination");
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  container.innerHTML = "";
  const prev = document.createElement("button");
  prev.textContent = "Anterior";
  prev.disabled = currentPage <= 1;
  prev.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    renderUsers();
  });

  const next = document.createElement("button");
  next.textContent = "Seguinte";
  next.disabled = currentPage >= totalPages;
  next.addEventListener("click", () => {
    currentPage = Math.min(totalPages, currentPage + 1);
    renderUsers();
  });

  const indicator = document.createElement("span");
  indicator.textContent = `Pagina ${currentPage} de ${totalPages}`;

  container.appendChild(prev);
  container.appendChild(indicator);
  container.appendChild(next);
}

function renderUsers() {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const page = filteredUsers.slice(start, start + pageSize);
  if (!page.length) {
    list.innerHTML = "<p>Sem utilizadores.</p>";
    renderPagination(0);
    return;
  }

  page.forEach((u) => {
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
      await loadUsers();
    });
    list.appendChild(card);
  });

  renderPagination(filteredUsers.length);
}

async function loadUsers() {
  const data = await apiFetch("/SheiqAway/backend/admin/users.php");
  allUsers = Array.isArray(data.data) ? data.data : [];
  const search = document.getElementById("userSearch");
  filteredUsers = filterUsers(search?.value || "");
  currentPage = 1;
  renderUsers();
}

function wireUserForm() {
  const form = document.getElementById("userForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
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
    form.reset();
    loadUsers();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureAdmin();
  wireUserForm();
  const search = document.getElementById("userSearch");
  search?.addEventListener("input", () => {
    filteredUsers = filterUsers(search.value || "");
    currentPage = 1;
    renderUsers();
  });
  loadUsers();
});
