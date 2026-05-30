const state = {
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  view: "dashboard",
};

const qs = (selector) => document.querySelector(selector);
const content = qs("#content");
const message = qs("#message");

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Error inesperado");
  }

  return data;
}

function setMessage(text, isError = false) {
  message.className = text ? (isError ? "error notice" : "notice") : "";
  message.textContent = text || "";
}

function setView(view) {
  state.view = view;
  document.querySelectorAll("nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
}

function updateShell() {
  const logged = Boolean(state.user);
  qs("#loginView").classList.toggle("hidden", logged);
  qs("#appView").classList.toggle("hidden", !logged);
  qs("#nav").classList.toggle("hidden", !logged);
  qs("#sessionBox").classList.toggle("hidden", !logged);

  if (logged) {
    qs("#sessionBox").innerHTML = `<strong>${state.user.nombre}</strong><span>${state.user.role_name}</span>`;
  }
}

async function render() {
  updateShell();
  setMessage("");

  if (!state.user) return;

  const titles = {
    dashboard: ["Dashboard", "Resumen general"],
    inventario: ["Inventario", "Productos y stock"],
    reservas: ["Reservas", "Gestion de reservas"],
    entregas: ["Entregas", "Reservas aprobadas"],
    reposiciones: ["Reposiciones", "Ordenes de reposicion"],
  };
  qs("#title").textContent = titles[state.view][0];
  qs("#subtitle").textContent = titles[state.view][1];

  try {
    if (state.view === "dashboard") await renderDashboard();
    if (state.view === "inventario") await renderInventario();
    if (state.view === "reservas") await renderReservas();
    if (state.view === "entregas") await renderEntregas();
    if (state.view === "reposiciones") await renderReposiciones();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function renderDashboard() {
  const kpis = await api("/inventario/kpis");
  const reservas = await api("/reservas?status=O&limit=5");
  content.innerHTML = `
    <div class="grid">
      ${card("Stock total", kpis.stock)}
      ${card("Disponible", kpis.disponible)}
      ${card("Comprometido", kpis.comprometido)}
      ${card("Reservas abiertas", kpis.abiertas)}
    </div>
    <h2>Reservas pendientes</h2>
    ${tablaReservas(reservas, false)}
  `;
}

async function renderInventario() {
  const productos = await api("/inventario");
  content.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Producto</th><th>Marca</th><th>Genero</th><th>Stock</th>
          <th>Pedido</th><th>Comprometido</th><th>Disponible</th><th>Precio</th>
        </tr>
      </thead>
      <tbody>
        ${productos.map((p) => `
          <tr>
            <td>${p.nombre_producto}</td>
            <td>${p.marca || ""}</td>
            <td>${p.genero || ""}</td>
            <td>${p.stock}</td>
            <td>${p.pedido}</td>
            <td>${p.comprometido}</td>
            <td><strong>${p.disponible}</strong></td>
            <td>S/ ${Number(p.precio || 0).toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function renderReservas() {
  const status = qs("#reservaStatus")?.value || "O";
  const [reservas, productos] = await Promise.all([
    api(`/reservas?status=${status}`),
    api("/inventario"),
  ]);

  content.innerHTML = `
    <div class="toolbar">
      <div>
        <label>Estado</label>
        <select id="reservaStatus">
          ${option("O", "Abiertas", status)}
          ${option("A", "Aprobadas", status)}
          ${option("C", "Cerradas", status)}
          ${option("D", "Canceladas", status)}
        </select>
      </div>
      <form id="reservaForm" class="toolbar">
        <div>
          <label>Producto</label>
          <select name="product_id" required>
            ${productos.map((p) => `<option value="${p.product_id}">${p.nombre_producto} (${p.disponible} disp.)</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Cantidad</label>
          <input name="quantity" type="number" min="1" value="1" required />
        </div>
        <button type="submit" class="primary">Crear reserva</button>
      </form>
    </div>
    ${tablaReservas(reservas, state.user.admin)}
  `;

  qs("#reservaStatus").addEventListener("change", () => renderReservas());
  qs("#reservaForm").addEventListener("submit", crearReserva);
  document.querySelectorAll("[data-approve-reserva]").forEach((button) => {
    button.addEventListener("click", () => accionReserva(button.dataset.approveReserva, "aprobar"));
  });
  document.querySelectorAll("[data-cancel-reserva]").forEach((button) => {
    button.addEventListener("click", () => accionReserva(button.dataset.cancelReserva, "cancelar"));
  });
}

async function renderEntregas() {
  const reservas = await api("/reservas?status=A");
  content.innerHTML = tablaReservas(reservas, false, true);
  document.querySelectorAll("[data-deliver-reserva]").forEach((button) => {
    button.addEventListener("click", () => entregarReserva(button.dataset.deliverReserva));
  });
}

async function renderReposiciones() {
  const status = qs("#repoStatus")?.value || "O";
  const [reposiciones, productos] = await Promise.all([
    api(`/reposiciones?status=${status}`),
    api("/inventario"),
  ]);

  content.innerHTML = `
    <div class="toolbar">
      <div>
        <label>Estado</label>
        <select id="repoStatus">
          ${option("O", "Abiertas", status)}
          ${option("A", "Aprobadas", status)}
          ${option("C", "Cerradas", status)}
          ${option("D", "Canceladas", status)}
        </select>
      </div>
      <form id="repoForm" class="toolbar">
        <div>
          <label>Producto</label>
          <select name="product_id" required>
            ${productos.map((p) => `<option value="${p.product_id}">${p.nombre_producto}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Cantidad</label>
          <input name="quantity" type="number" min="1" value="1" required />
        </div>
        <div>
          <label>Costo</label>
          <input name="price" type="number" min="0" step="0.01" value="0" required />
        </div>
        <button type="submit" class="primary">Crear orden</button>
      </form>
    </div>
    ${tablaReposiciones(reposiciones)}
  `;

  qs("#repoStatus").addEventListener("change", () => renderReposiciones());
  qs("#repoForm").addEventListener("submit", crearReposicion);
  document.querySelectorAll("[data-approve-repo]").forEach((button) => {
    button.addEventListener("click", () => accionRepo(button.dataset.approveRepo, "aprobar"));
  });
  document.querySelectorAll("[data-entry-repo]").forEach((button) => {
    button.addEventListener("click", () => generarEntrada(button.dataset.entryRepo));
  });
  document.querySelectorAll("[data-cancel-repo]").forEach((button) => {
    button.addEventListener("click", () => accionRepo(button.dataset.cancelRepo, "cancelar"));
  });
}

function tablaReservas(reservas, acciones, entregar = false) {
  if (!reservas.length) return `<div class="card">No hay registros.</div>`;
  return `
    <table>
      <thead><tr><th>#</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${reservas.map((r) => `
          <tr>
            <td>#${r.id}</td><td>${r.cliente}</td><td>${r.producto}</td><td>${r.cantidad}</td>
            <td>${fecha(r.fecha_creacion)}</td><td><span class="badge">${r.status}</span></td>
            <td class="row-actions">
              ${acciones && r.status === "O" ? `<button class="primary" data-approve-reserva="${r.id}">Aprobar</button>` : ""}
              ${acciones && ["O", "A"].includes(r.status) ? `<button class="primary danger" data-cancel-reserva="${r.id}">Cancelar</button>` : ""}
              ${entregar ? `<button class="primary" data-deliver-reserva="${r.id}">Entregar</button>` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function tablaReposiciones(items) {
  if (!items.length) return `<div class="card">No hay registros.</div>`;
  return `
    <table>
      <thead><tr><th>#</th><th>Solicitante</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${items.map((r) => `
          <tr>
            <td>#${r.id}</td><td>${r.solicitante}</td><td>${r.producto}</td><td>${r.cantidad}</td>
            <td>S/ ${Number(r.total || 0).toFixed(2)}</td><td><span class="badge">${r.status}</span></td>
            <td class="row-actions">
              ${state.user.admin && r.status === "O" ? `<button class="primary" data-approve-repo="${r.id}">Aprobar</button>` : ""}
              ${state.user.admin && r.status === "A" ? `<button class="primary" data-entry-repo="${r.id}">Entrada</button>` : ""}
              ${state.user.admin && ["O", "A"].includes(r.status) ? `<button class="primary danger" data-cancel-repo="${r.id}">Cancelar</button>` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function crearReserva(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  await api("/reservas", { method: "POST", body: JSON.stringify(data) });
  setMessage("Reserva creada correctamente.");
  await renderReservas();
}

async function accionReserva(id, accion) {
  await api(`/reservas/${id}/${accion}`, { method: "PUT" });
  setMessage("Reserva actualizada.");
  await renderReservas();
}

async function entregarReserva(id) {
  await api(`/entregas/${id}/despachar`, { method: "POST", body: JSON.stringify({}) });
  setMessage("Entrega registrada.");
  await renderEntregas();
}

async function crearReposicion(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  await api("/reposiciones", { method: "POST", body: JSON.stringify(data) });
  setMessage("Orden de reposicion creada.");
  await renderReposiciones();
}

async function accionRepo(id, accion) {
  await api(`/reposiciones/${id}/${accion}`, { method: "PUT" });
  setMessage("Orden actualizada.");
  await renderReposiciones();
}

async function generarEntrada(id) {
  await api(`/reposiciones/${id}/entrada`, { method: "POST", body: JSON.stringify({}) });
  setMessage("Entrada generada.");
  await renderReposiciones();
}

function card(label, value) {
  return `<div class="card"><span>${label}</span><strong>${value ?? 0}</strong></div>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function fecha(value) {
  return value ? new Date(value).toLocaleDateString("es-PE") : "";
}

qs("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  qs("#loginError").textContent = "";
  const data = Object.fromEntries(new FormData(event.currentTarget));

  try {
    const result = await api("/auth/login", { method: "POST", body: JSON.stringify(data) });
    state.user = result.user;
    state.token = result.token;
    localStorage.setItem("user", JSON.stringify(state.user));
    localStorage.setItem("token", state.token);
    setView("dashboard");
  } catch (error) {
    qs("#loginError").textContent = error.message;
  }
});

qs("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  state.user = null;
  state.token = null;
  updateShell();
});

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

render();
