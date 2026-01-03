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
