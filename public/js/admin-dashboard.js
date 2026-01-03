function piePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArc,
    0,
    end.x,
    end.y,
    "L",
    cx,
    cy,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildPieChart(data, colors) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return { svg: "<p>Sem dados.</p>", legend: "" };

  const size = 180;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  let currentAngle = 0;

  const paths = data
    .map((item, index) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;
      const color = colors[index % colors.length];
      return `<path d="${piePath(cx, cy, r, startAngle, endAngle)}" fill="${color}"></path>`;
    })
    .join("");

  const svg = `
    <svg viewBox="0 0 ${size} ${size}" class="pie-svg" role="img" aria-label="Pie chart">
      ${paths}
    </svg>
  `;

  const legend = data
    .map((item, index) => {
      const color = colors[index % colors.length];
      return `
        <div class="pie-legend-item">
          <span class="pie-dot" style="background:${color}"></span>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `;
    })
    .join("");

  return { svg, legend };
}

async function loadDashboard() {
  ensureAdmin();
  const stats = await apiFetch("/SheiqAway/backend/api/estatisticas.php");

  const topClientes = stats.top_clientes || [];
  const topDestinos = stats.top_destinos || [];
  const porCompanhia = stats.reservas_por_companhia || [];
  const totalReservas = Number(stats.total_reservas || 0);
  const totalCanceladas = Number(stats.total_canceladas || 0);
  const cancelRate = totalReservas
    ? Math.round((totalCanceladas / totalReservas) * 100)
    : 0;
  const receitaPorCompanhia = stats.companhias_por_receita || [];
  const receitaPorDestino = stats.destinos_por_receita || [];
  const maxReceitaCompanhia = Math.max(
    1,
    ...receitaPorCompanhia.map((c) => Number(c.receita || 0))
  );
  const maxReceitaDestino = Math.max(
    1,
    ...receitaPorDestino.map((d) => Number(d.receita || 0))
  );

  const colors = ["#0ea5e9", "#6366f1", "#10b981", "#f97316", "#e11d48"];
  const pieData = porCompanhia.map((item) => ({
    label: item.companhia || "N/A",
    value: Number(item.total || 0),
  }));
  const pie = buildPieChart(pieData, colors);

  const maxClientes = Math.max(1, ...topClientes.map((c) => c.total_reservas));
  const maxDestinos = Math.max(1, ...topDestinos.map((d) => d.total));

  const kpiGrid = document.getElementById("kpiGrid");
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <span>Reservas mes</span>
        <strong>${Number(stats.reservas_mes || 0)}</strong>
      </div>
      <div class="kpi-card">
        <span>Receita mes</span>
        <strong>EUR ${Number(stats.receita_mes || 0).toFixed(2)}</strong>
      </div>
      <div class="kpi-card">
        <span>Receita hoje</span>
        <strong>EUR ${Number(stats.receita_hoje || 0).toFixed(2)}</strong>
      </div>
      <div class="kpi-card">
        <span>Receita total</span>
        <strong>EUR ${Number(stats.receita_total || 0).toFixed(2)}</strong>
      </div>
      <div class="kpi-card">
        <span>Canceladas</span>
        <strong>${totalCanceladas}</strong>
      </div>
      <div class="kpi-card">
        <span>Taxa cancelamento</span>
        <strong>${cancelRate}%</strong>
      </div>
      <div class="kpi-card">
        <span>Ticket medio</span>
        <strong>EUR ${Number(stats.ticket_medio || 0).toFixed(2)}</strong>
      </div>
      <div class="kpi-card">
        <span>Reservas ultimos 7 dias</span>
        <div class="mini-chart">
          ${buildMiniChart(stats.reservas_ultimos_dias || [])}
        </div>
      </div>
    `;
  }

  const container = document.getElementById("statsContainer");
  if (container) {
    container.innerHTML = `
      <div class="stats-section">
        <div class="stats-section-header">
          <h4>Resumo</h4>
          <span>Performance geral</span>
        </div>
        <div class="stats-row stats-row-3">
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
            <div class="pie-wrap">
              ${pie.svg}
              <div class="pie-legend">${pie.legend}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-header">
          <h4>Tendencias</h4>
          <span>Ultimos 12 meses</span>
        </div>
        <div class="stats-row stats-row-2">
          <div class="stat-card">
            <h4>Reservas por mes</h4>
            <div class="mini-chart">
              ${buildMiniChart(stats.reservas_por_mes || [], (r) =>
                String(r.mes || "").slice(5)
              )}
            </div>
          </div>
          <div class="stat-card">
            <h4>Novos clientes por mes</h4>
            <div class="mini-chart">
              ${buildMiniChart(stats.novos_users_por_mes || [], (r) =>
                String(r.mes || "").slice(5)
              )}
            </div>
          </div>
        </div>
      </div>
      <div class="stats-section">
        <div class="stats-section-header">
          <h4>Receita</h4>
          <span>Top 5 por valor</span>
        </div>
        <div class="stats-row stats-row-2">
          <div class="stat-card">
            <h4>Companhias por receita</h4>
            <div class="stat-list">
              ${receitaPorCompanhia
                .map(
                  (c) => `
                <div class="stat-item">
                  <span>${c.companhia || "N/A"}</span>
                  <span>EUR ${Number(c.receita || 0).toFixed(2)}</span>
                </div>
                <div class="stat-bar"><span style="width:${(Number(c.receita || 0) / maxReceitaCompanhia) * 100}%"></span></div>
              `
                )
                .join("")}
            </div>
          </div>
          <div class="stat-card">
            <h4>Destinos por receita</h4>
            <div class="stat-list">
              ${receitaPorDestino
                .map(
                  (d) => `
                <div class="stat-item">
                  <span>${d.destino || "N/A"}</span>
                  <span>EUR ${Number(d.receita || 0).toFixed(2)}</span>
                </div>
                <div class="stat-bar"><span style="width:${(Number(d.receita || 0) / maxReceitaDestino) * 100}%"></span></div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const statTotal = document.getElementById("statTotal");
  if (statTotal) statTotal.textContent = String(totalReservas);
  const statUsers = document.getElementById("statUsers");
  if (statUsers) statUsers.textContent = String(stats.total_users || 0);
  const statToday = document.getElementById("statToday");
  if (statToday) statToday.textContent = String(stats.reservas_hoje || 0);
}

document.addEventListener("DOMContentLoaded", loadDashboard);

function buildMiniChart(rows, labelFn) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "<span>Sem dados.</span>";
  }
  const max = Math.max(1, ...rows.map((r) => Number(r.total || 0)));
  return rows
    .map((r) => {
      const value = Number(r.total || 0);
      const label = labelFn ? labelFn(r) : String(r.dia || "").slice(5);
      const width = (value / max) * 100;
      return `
        <div class="mini-bar">
          <span>${label || "-"}</span>
          <div class="mini-track"><i style="width:${width}%"></i></div>
          <span>${value}</span>
        </div>
      `;
    })
    .join("");
}
