// ─── Estado global ────────────────────────────────────────────────────────────
const App = {
  token: localStorage.getItem('token'),
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  carrito: JSON.parse(localStorage.getItem('carrito') || '[]'),
  socket: null,
  API: '/api'
};

let stripe;
let card;
let clientSecret;

// ─── Socket.IO ────────────────────────────────────────────────────────────────
function inicializarSocket() {
  App.socket = io();
  App.socket.on('nuevo_pedido', (d) => {
    if (App.usuario?.rol === 'admin') mostrarToast('🔔 Nuevo pedido recibido!', 'primary');
  });
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(metodo, ruta, cuerpo = null) {
  const opts = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' }
  };
  if (App.token) opts.headers['Authorization'] = `Bearer ${App.token}`;
  if (cuerpo) opts.body = JSON.stringify(cuerpo);

  try {
    const res = await fetch(App.API + ruta, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || 'Error en la solicitud');
    return data;
  } catch (err) {
    mostrarToast(err.message, 'danger');
    throw err;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function mostrarToast(msg, tipo = 'success') {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  t.className = `toast align-items-center text-white border-0 bg-${tipo}`;
  m.textContent = msg;
  new bootstrap.Toast(t, { delay: 3500 }).show();
}

// ─── Carrito ──────────────────────────────────────────────────────────────────
function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(App.carrito));
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const total = App.carrito.reduce((s, i) => s + i.cantidad, 0);
  const badge = document.getElementById('contadorCarrito');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'block' : 'none';
}

function agregarAlCarrito(id, nombre, precio, emoji = '🍽️') {
  const idx = App.carrito.findIndex(i => i.productoId === id);
  if (idx >= 0) App.carrito[idx].cantidad++;
  else App.carrito.push({ productoId: id, nombre, precio, cantidad: 1, emoji });
  guardarCarrito();
  mostrarToast(`${nombre} agregado al carrito ✓`);
}

function cambiarCantidad(idx, delta) {
  App.carrito[idx].cantidad += delta;
  if (App.carrito[idx].cantidad <= 0) App.carrito.splice(idx, 1);
  guardarCarrito();
  renderCarrito();
}

function abrirCarrito() {
  renderCarrito();
  new bootstrap.Modal(document.getElementById('modalCarrito')).show();
}

function renderCarrito() {
  const cont = document.getElementById('contenidoCarrito');
  const footer = document.getElementById('footerCarrito');
  if (!App.carrito.length) {
    cont.innerHTML = `<p class="text-center text-muted py-4"><i class="bi bi-cart-x display-4 d-block mb-2"></i>Tu carrito está vacío</p>`;
    footer.style.setProperty('display', 'none', 'important');
    return;
  }
  footer.style.removeProperty('display');
  const subtotal = App.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  cont.innerHTML = App.carrito.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="flex-grow-1">
        <div class="fw-600">${item.nombre}</div>
        <div class="text-muted small">$${item.precio.toLocaleString('es-CO')}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="cambiarCantidad(${idx},-1)"><i class="bi bi-dash"></i></button>
        <span class="fw-600 mx-1">${item.cantidad}</span>
        <button class="qty-btn" onclick="cambiarCantidad(${idx},1)"><i class="bi bi-plus"></i></button>
      </div>
      <div class="fw-700 ms-2">$${(item.precio * item.cantidad).toLocaleString('es-CO')}</div>
    </div>
  `).join('');
  document.getElementById('subtotalCarrito').textContent = `$${subtotal.toLocaleString('es-CO')}`;
  document.getElementById('totalCarrito').textContent = `$${(subtotal + 5000).toLocaleString('es-CO')}`;
}

// ─── Auth UI ──────────────────────────────────────────────────────────────────
function actualizarNavAuth() {
  const u = App.usuario;
  document.getElementById('authButtons').style.display = u ? 'none' : 'block';
  document.getElementById('userMenu').classList.toggle('d-none', !u);
  if (u) {
    document.getElementById('userName').textContent = u.nombre?.split(' ')[0] || 'Usuario';
    document.getElementById('navPedidos').classList.toggle('d-none', u.rol !== 'cliente');
    document.getElementById('navAdmin').classList.toggle('d-none', u.rol !== 'admin');
    document.getElementById('navRepartidor').classList.toggle('d-none', u.rol !== 'repartidor');
  }
}

function cerrarSesion() {
  App.token = null; App.usuario = null; App.carrito = [];
  localStorage.removeItem('token'); localStorage.removeItem('usuario'); localStorage.removeItem('carrito');
  actualizarNavAuth();
  actualizarContadorCarrito();
  navegarA('home');
  mostrarToast('Sesión cerrada');
}

function requiereAuth() {
  if (!App.token) { navegarA('login'); return false; }
  return true;
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
function navegarA(pagina) {
  const cont = document.getElementById('appContent');
  cont.innerHTML = `<div class="loading-spinner"><div class="spinner-custom"></div><p class="text-muted">Cargando...</p></div>`;
  window.scrollTo(0, 0);

  setTimeout(() => {
    switch (pagina) {
      case 'home':         renderHome(); break;
      case 'menu':         renderMenu(); break;
      case 'login':        renderLogin(); break;
      case 'registro':     renderRegistro(); break;
      case 'mis-pedidos':  if (requiereAuth()) renderMisPedidos(); break;
      case 'admin':        if (requiereAuth()) renderAdmin(); break;
      case 'repartidor':   if (requiereAuth()) renderRepartidor(); break;
      case 'checkout':     if (requiereAuth()) renderCheckout(); break;
      case 'perfil':       if (requiereAuth()) renderPerfil(); break;
      default:             renderHome();
    }
  }, 100);
}

// ─── PÁGINA: HOME ─────────────────────────────────────────────────────────────
function renderHome() {
  document.getElementById('appContent').innerHTML = `
    <section class="hero-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-6">
            <div class="mb-3">
              <span class="badge bg-warning text-dark fw-600 px-3 py-2 rounded-pill">
                <i class="bi bi-lightning-charge-fill me-1"></i>Entrega en 30 min
              </span>
            </div>
            <h1 class="hero-title mb-4">La mejor comida,<br><span>en tu puerta</span></h1>
            <p class="text-white-50 fs-5 mb-4">Ordena tus platos favoritos y recíbelos donde estés. Seguimiento en tiempo real.</p>
            <div class="d-flex gap-3 flex-wrap">
              <button class="btn btn-warning btn-lg text-dark fw-700 px-4" onclick="navegarA('menu')">
                <i class="bi bi-grid me-2"></i>Ver Menú
              </button>
              ${!App.usuario ? `<button class="btn btn-outline-light btn-lg px-4" onclick="navegarA('registro')">Crear cuenta</button>` : ''}
            </div>
          </div>
          <div class="col-lg-6 d-none d-lg-flex justify-content-center">
            <img 
              src="/images/Cat.png" 
              alt="Delivery Cat"
              class="hero-img"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="container">
        <div class="row g-4 text-center mb-5">
          ${[
            ['🛒','1. Elige tu comida','Explora nuestro menú y agrega al carrito'],
            ['💳','2. Paga seguro','Tarjeta, efectivo o transferencia'],
            ['🛵','3. Rastreo en vivo','Sigue tu pedido en tiempo real']
          ].map(([i,t,d]) => `
            <div class="col-md-4">
              <div class="card border-0 shadow-sm rounded-xl p-4">
                <div style="font-size:3rem" class="mb-3">${i}</div>
                <h5 class="fw-700">${t}</h5>
                <p class="text-muted mb-0">${d}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="text-center mb-4">
          <h2 class="section-title">Platos populares</h2>
          <p class="text-muted">Los favoritos de nuestros clientes</p>
        </div>
        <div id="productosHome" class="row g-4">
          <div class="col-12 text-center py-4"><div class="spinner-custom mx-auto"></div></div>
        </div>
        <div class="text-center mt-4">
          <button class="btn btn-outline-secondary px-5 rounded-pill" onclick="navegarA('menu')">Ver todo el menú →</button>
        </div>
      </div>
    </section>
  `;
  cargarProductosHome();
}

async function cargarProductosHome() {
  try {
    const { productos } = await api('GET', '/productos?disponible=true');
    const cont = document.getElementById('productosHome');
    if (!productos.length) { cont.innerHTML = '<p class="text-muted text-center">Sin productos disponibles</p>'; return; }
    cont.innerHTML = productos.slice(0,6).map(p => renderProductoCard(p)).join('');
  } catch { }
}

// ─── PÁGINA: MENÚ ─────────────────────────────────────────────────────────────
function renderMenu() {
  document.getElementById('appContent').innerHTML = `
    <div class="container page-section">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 class="section-title mb-1">Nuestro Menú</h2>
          <p class="text-muted mb-0">Elige lo que más te apetece</p>
        </div>
        <div class="input-group" style="max-width:280px">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" id="buscadorMenu" placeholder="Buscar..." oninput="filtrarMenu()"/>
        </div>
      </div>

      <div class="d-flex gap-2 flex-wrap mb-4" id="filtrosCategorias">
        ${['todos','entrada','plato_principal','bebida','postre','combo'].map(c => `
          <button class="categoria-btn ${c==='todos'?'active':''}" onclick="seleccionarCategoria('${c}',this)">${categoriaNombre(c)}</button>
        `).join('')}
      </div>

      <div id="gridProductos" class="row g-4">
        <div class="col-12 loading-spinner"><div class="spinner-custom"></div></div>
      </div>
    </div>
  `;
  cargarProductos();
}

function categoriaNombre(c) {
  const m = { todos:'Todos', entrada:'Entradas', plato_principal:'Platos Principales', bebida:'Bebidas', postre:'Postres', combo:'Combos' };
  return m[c] || c;
}

let todosProductos = [];
async function cargarProductos() {
  try {
    const { productos } = await api('GET', '/productos?disponible=true');
    todosProductos = productos;
    renderProductos(productos);
  } catch { }
}

function renderProductos(lista) {
  const grid = document.getElementById('gridProductos');
  if (!lista.length) { grid.innerHTML = '<p class="text-muted text-center col-12 py-4">No se encontraron productos</p>'; return; }
  grid.innerHTML = lista.map(p => `<div class="col-sm-6 col-lg-4">${renderProductoCard(p)}</div>`).join('');
}

const EMOJIS = { entrada:'🥗', plato_principal:'🍽️', bebida:'🥤', postre:'🍰', combo:'🎁' };
function renderProductoCard(p) {
return `
    <div class="product-card card h-100">
      <div class="product-img-placeholder">
        <span>${EMOJIS[p.categoria] || '🍽️'}</span>
      </div>

      <div class="card-body d-flex flex-column">

        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge-categoria">${categoriaNombre(p.categoria)}</span>
          ${p.tiempoPrep ? `<small class="text-muted">${p.tiempoPrep} min</small>` : ''}
        </div>

        <h6 class="fw-700 mb-1">${p.nombre}</h6>

        <small class="text-muted mb-1">
          📍 ${p.restaurante?.nombre || 'Restaurante'}
        </small>

        <p class="text-muted small mb-3 flex-grow-1">${p.descripcion || ''}</p>

        <div class="d-flex justify-content-between align-items-center">
          <span class="precio">$${p.precio.toLocaleString('es-CO')}</span>

          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-secondary"
              onclick="verMapa(${p.restaurante?.lat}, ${p.restaurante?.lng})">
              📍
            </button>

            <button class="btn-agregar btn btn-sm"
              onclick="agregarAlCarrito('${p._id}','${p.nombre}',${p.precio},'${EMOJIS[p.categoria]||'🍽️'}')">
              +
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

function verMapa(lat, lng) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank');
}

let categoriaActual = 'todos';
function seleccionarCategoria(cat, btn) {
  categoriaActual = cat;
  document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtrarMenu();
}

function filtrarMenu() {
  const buscar = document.getElementById('buscadorMenu')?.value.toLowerCase() || '';
  const filtrado = todosProductos.filter(p => {
    const coincideCategoria = categoriaActual === 'todos' || p.categoria === categoriaActual;
    const coincideBusqueda = !buscar || p.nombre.toLowerCase().includes(buscar) || p.descripcion?.toLowerCase().includes(buscar);
    return coincideCategoria && coincideBusqueda;
  });
  renderProductos(filtrado);
}

// ─── PÁGINA: LOGIN ────────────────────────────────────────────────────────────
function renderLogin() {
  document.getElementById('appContent').innerHTML = `
    <div class="container">
      <div class="auth-card card">
        <div class="card-header text-center">
          <div style="font-size:3rem" class="mb-2">🔐</div>
          <h4 class="fw-700 mb-1">Bienvenido de vuelta</h4>
          <p class="text-white-50 mb-0">Ingresa a tu cuenta</p>
        </div>
        <div class="card-body p-4">
          <div id="loginError" class="alert alert-danger d-none"></div>
          <div class="mb-3">
            <label class="form-label fw-600">Correo electrónico</label>
            <input type="email" class="form-control" id="loginEmail" placeholder="tu@email.com"/>
          </div>
          <div class="mb-4">
            <label class="form-label fw-600">Contraseña</label>
            <div class="input-group">
              <input type="password" class="form-control" id="loginPass" placeholder="••••••••"/>
              <button class="btn btn-outline-secondary" type="button" onclick="togglePass('loginPass')">
                <i class="bi bi-eye"></i>
              </button>
            </div>
          </div>
          <button class="btn btn-primary-custom w-100 mb-3" onclick="hacerLogin()">
            <i class="bi bi-box-arrow-in-right me-2"></i>Ingresar
          </button>
          <p class="text-center text-muted mb-0">
            ¿No tienes cuenta? <a href="#" class="text-decoration-none fw-600" onclick="navegarA('registro')">Regístrate</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function hacerLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;
  const errDiv = document.getElementById('loginError');

  try {
    errDiv.classList.add('d-none');
    const data = await api('POST', '/auth/login', { email, password });
    App.token = data.token;
    App.usuario = data.usuario;
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    actualizarNavAuth();
    mostrarToast(`¡Bienvenido, ${data.usuario.nombre.split(' ')[0]}!`);

    // Redirigir según rol
    if (data.usuario.rol === 'admin') navegarA('admin');
    else if (data.usuario.rol === 'repartidor') navegarA('repartidor');
    else navegarA('menu');
  } catch (err) {
    errDiv.classList.remove('d-none');
    errDiv.textContent = err.message;
  }
}

// ─── PÁGINA: REGISTRO ─────────────────────────────────────────────────────────
function renderRegistro() {
  document.getElementById('appContent').innerHTML = `
    <div class="container">
      <div class="auth-card card">
        <div class="card-header text-center">
          <div style="font-size:3rem" class="mb-2">👤</div>
          <h4 class="fw-700 mb-1">Crear cuenta</h4>
          <p class="text-white-50 mb-0">¡Únete a DeliverYa!</p>
        </div>
        <div class="card-body p-4">
          <div id="regError" class="alert alert-danger d-none"></div>
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fw-600">Nombre completo</label>
              <input type="text" class="form-control" id="regNombre" placeholder="Tu nombre"/>
            </div>
            <div class="col-12">
              <label class="form-label fw-600">Correo electrónico</label>
              <input type="email" class="form-control" id="regEmail" placeholder="tu@email.com"/>
            </div>
            <div class="col-sm-6">
              <label class="form-label fw-600">Teléfono</label>
              <input type="tel" class="form-control" id="regTel" placeholder="3001234567"/>
            </div>
            <div class="col-sm-6">
              <label class="form-label fw-600">Tipo de cuenta</label>
              <select class="form-select" id="regRol" onchange="toggleCamposRepartidor()">
                <option value="cliente">Cliente</option>
                <option value="repartidor">Repartidor</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label fw-600">Dirección</label>
              <input type="text" class="form-control" id="regDir" placeholder="Tu dirección"/>
            </div>
            <div id="camposRepartidor" class="col-12 d-none">
              <div class="row g-2">
                <div class="col-sm-6">
                  <label class="form-label fw-600">Vehículo</label>
                  <input type="text" class="form-control" id="regVehiculo" placeholder="Moto, Bicicleta..."/>
                </div>
                <div class="col-sm-6">
                  <label class="form-label fw-600">Placa</label>
                  <input type="text" class="form-control" id="regPlaca" placeholder="ABC-123"/>
                </div>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label fw-600">Contraseña</label>
              <input type="password" class="form-control" id="regPass" placeholder="Mínimo 6 caracteres"/>
            </div>
          </div>
          <button class="btn btn-primary-custom w-100 mt-4" onclick="hacerRegistro()">
            <i class="bi bi-person-plus me-2"></i>Crear cuenta
          </button>
          <p class="text-center text-muted mt-3 mb-0">
            ¿Ya tienes cuenta? <a href="#" class="text-decoration-none fw-600" onclick="navegarA('login')">Ingresar</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function toggleCamposRepartidor() {
  const rol = document.getElementById('regRol').value;
  document.getElementById('camposRepartidor').classList.toggle('d-none', rol !== 'repartidor');
}

async function hacerRegistro() {
  const errDiv = document.getElementById('regError');
  try {
    errDiv.classList.add('d-none');
    const datos = {
      nombre: document.getElementById('regNombre').value,
      email:  document.getElementById('regEmail').value,
      password: document.getElementById('regPass').value,
      telefono: document.getElementById('regTel').value,
      direccion: document.getElementById('regDir').value,
      rol: document.getElementById('regRol').value,
      vehiculo: document.getElementById('regVehiculo')?.value,
      placa: document.getElementById('regPlaca')?.value
    };
    const data = await api('POST', '/auth/registro', datos);
    App.token = data.token; App.usuario = data.usuario;
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    actualizarNavAuth();
    mostrarToast('¡Cuenta creada exitosamente!');
    navegarA(data.usuario.rol === 'repartidor' ? 'repartidor' : 'menu');
  } catch (err) {
    errDiv.classList.remove('d-none');
    errDiv.textContent = err.message;
  }
}

// ─── PÁGINA: MIS PEDIDOS ──────────────────────────────────────────────────────
async function renderMisPedidos() {
  document.getElementById('appContent').innerHTML = `
    <div class="container page-section">
      <h2 class="section-title mb-4"><i class="bi bi-bag-check me-2"></i>Mis Pedidos</h2>
      <div id="listaPedidos">
        <div class="loading-spinner"><div class="spinner-custom"></div></div>
      </div>
    </div>
  `;
  try {
    const { pedidos } = await api('GET', '/pedidos');
    const cont = document.getElementById('listaPedidos');
    if (!pedidos.length) {
      cont.innerHTML = `<div class="text-center py-5"><div style="font-size:4rem">📦</div><h5 class="mt-3">Sin pedidos aún</h5><button class="btn btn-warning mt-2" onclick="navegarA('menu')">Hacer mi primer pedido</button></div>`;
      return;
    }
    cont.innerHTML = pedidos.map(p => `
      <div class="pedido-card">
        <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
          <div>
            <div class="pedido-numero">${p.numeroPedido}</div>
            <div class="text-muted small">${new Date(p.createdAt).toLocaleString('es-CO')}</div>
          </div>
          <span class="badge badge-${p.estado} px-3 py-2">${estadoTexto(p.estado)}</span>
        </div>
        <div class="row g-2 mb-3">
          ${p.items.map(i => `<div class="col-auto"><span class="badge bg-light text-dark border">${i.cantidad}x ${i.nombre}</span></div>`).join('')}
        </div>
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong class="fs-5">$${p.total.toLocaleString('es-CO')}</strong>
          <div class="d-flex gap-2">
            ${['en_camino','confirmado','preparando'].includes(p.estado) ? `
              <button class="btn btn-sm btn-outline-primary" onclick="verSeguimiento('${p._id}')">
                <i class="bi bi-geo-alt me-1"></i>Seguir
              </button>
            ` : ''}
            ${p.estado === 'pendiente' ? `
              <button class="btn btn-sm btn-outline-danger" onclick="cancelarPedido('${p._id}')">Cancelar</button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch { }
}

function estadoTexto(e) {
  const m = { pendiente:'⏳ Pendiente', confirmado:'✅ Confirmado', preparando:'👨‍🍳 Preparando', en_camino:'🛵 En camino', entregado:'🎉 Entregado', cancelado:'❌ Cancelado' };
  return m[e] || e;
}

async function cancelarPedido(id) {
  if (!confirm('¿Estás seguro de cancelar este pedido?')) return;
  try {
    await api('PATCH', `/pedidos/${id}/cancelar`, { motivo: 'Cancelado por el cliente' });
    mostrarToast('Pedido cancelado');
    renderMisPedidos();
  } catch { }
}

async function verSeguimiento(pedidoId) {
  const modal = new bootstrap.Modal(document.getElementById('modalSeguimiento'));
  const cont = document.getElementById('contenidoSeguimiento');
  cont.innerHTML = `<div class="loading-spinner"><div class="spinner-custom"></div></div>`;
  modal.show();

  try {
    const { pedido } = await api('GET', `/pedidos/${pedidoId}`);
    cont.innerHTML = `
      <div class="row">
        <div class="col-md-5">
          <h6 class="fw-700 mb-3">Estado del pedido</h6>
          <div class="timeline">
            ${pedido.historialEstados.map((h,i) => `
              <div class="timeline-item">
                <div class="fw-600">${estadoTexto(h.estado)}</div>
                <div class="text-muted small">${new Date(h.fecha).toLocaleTimeString('es-CO')}</div>
                ${h.nota ? `<div class="text-muted small">${h.nota}</div>` : ''}
              </div>
            `).join('')}
          </div>
          ${pedido.repartidor ? `
            <div class="card border-0 bg-light rounded-xl p-3 mt-3">
              <div class="fw-700 mb-1"><i class="bi bi-bicycle me-2"></i>Tu repartidor</div>
              <div>${pedido.repartidor.nombre}</div>
              <div class="text-muted">${pedido.repartidor.telefono || ''}</div>
            </div>
          ` : ''}
        </div>
        <div class="col-md-7">
          <div id="mapaSeguimiento" class="d-flex align-items-center justify-content-center bg-light rounded-xl" style="height:300px">
            <div class="text-center text-muted">
              <i class="bi bi-map display-4 d-block mb-2"></i>
              <small>Mapa disponible cuando el repartidor esté en camino</small>
            </div>
          </div>
        </div>
      </div>
    `;
    // Suscribirse a actualizaciones
    App.socket?.emit('unirse_pedido', pedidoId);
    App.socket?.on('estado_pedido_actualizado', ({ estado }) => {
      mostrarToast(`Estado actualizado: ${estadoTexto(estado)}`);
    });
  } catch { }
}

// ─── PÁGINA: CHECKOUT ─────────────────────────────────────────────────────────
async function procederPago() {
  if (!App.token) { navegarA('login'); return; }
  bootstrap.Modal.getInstance(document.getElementById('modalCarrito'))?.hide();
  navegarA('checkout');
}
function usarUbicacionGPS() {
  if (!navigator.geolocation) {
    return mostrarToast("Tu navegador no soporta GPS", "danger");
  }

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    document.getElementById('dirReferencias').value =
      `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    mostrarToast("Ubicación detectada ✔", "success");
  });
}

function renderCheckout() {
  const subtotal = App.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('appContent').innerHTML = `
    <div class="container page-section">
      <div class="row g-4">
        <div class="col-lg-7">
          <h4 class="fw-700 mb-4"><i class="bi bi-credit-card me-2"></i>Finalizar pedido</h4>

          <div class="card border-0 shadow-sm rounded-xl p-4 mb-4">
            <h6 class="fw-700 mb-3">
              <i class="bi bi-geo-alt me-2"></i>Ubicación de entrega
            </h6>

            <!-- Restaurante -->
            <div class="mb-3 p-3 bg-light rounded">
              <small class="text-muted">Restaurante</small>
              <div class="fw-600" id="restauranteNombre">Cargando...</div>
              <div class="text-muted small" id="restauranteDireccion"></div>
            </div>

            <!-- Dirección usuario -->
            <div class="row g-3">
              <div class="col-12">
                <input type="text" class="form-control" id="dirCalle"
                  placeholder="Calle / Carrera y número" required/>
              </div>

              <div class="col-sm-6">
                <input type="text" class="form-control" id="dirCiudad"
                  placeholder="Ciudad" value="Pereira"/>
              </div>

              <div class="col-sm-6">
                <input type="text" class="form-control" id="dirReferencias"
                  placeholder="Apto, torre, referencias..."/>
              </div>
            </div>

            <!-- Ubicación GPS -->
            <button class="btn btn-outline-primary btn-sm mt-3 w-100"
              onclick="usarUbicacionGPS()">
              <i class="bi bi-crosshair me-2"></i>Usar mi ubicación actual
            </button>
          </div>
          <div class="card border-0 shadow-sm rounded-xl p-4 mb-4">
            <h6 class="fw-700 mb-3"><i class="bi bi-wallet me-2"></i>Método de pago</h6>
            <div class="d-flex gap-3 flex-wrap" id="opcionesPago">
              ${['tarjeta','efectivo','transferencia'].map((m,i) => `
                <div class="form-check card border p-3 flex-grow-1 cursor-pointer" style="cursor:pointer" onclick="seleccionarPago('${m}')">
                  <input class="form-check-input" type="radio" name="metodoPago" id="pago_${m}" value="${m}" ${i===0?'checked':''}>
                  <label class="form-check-label fw-600 ms-2" for="pago_${m}">
                    ${m==='tarjeta'?'💳 Tarjeta':m==='efectivo'?'💵 Efectivo':'🏦 Transferencia'}
                  </label>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card border-0 shadow-sm rounded-xl p-4" id="seccionTarjeta">
            <h6 class="fw-700 mb-3"><i class="bi bi-credit-card-2-front me-2"></i>Datos de tarjeta</h6>
            <div id="stripeElement" class="form-control p-3" style="min-height:44px">
              <p class="text-muted small mb-0">⚠️ Configura STRIPE_PUBLISHABLE_KEY en .env para activar pagos con tarjeta</p>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card border-0 shadow-sm rounded-xl p-4 sticky-top" style="top:80px">
            <h6 class="fw-700 mb-3">Resumen del pedido</h6>
            ${App.carrito.map(i => `
              <div class="d-flex justify-content-between mb-2">
                <span>${i.cantidad}x ${i.nombre}</span>
                <span class="fw-600">$${(i.precio*i.cantidad).toLocaleString('es-CO')}</span>
              </div>
            `).join('')}
            <hr/>
            <div class="d-flex justify-content-between mb-1">
              <span class="text-muted">Subtotal</span><span>$${subtotal.toLocaleString('es-CO')}</span>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <span class="text-muted">Envío</span><span>$5.000</span>
            </div>
            <div class="d-flex justify-content-between fs-5 mb-4">
              <strong>Total</strong><strong class="text-primary-custom">$${(subtotal+5000).toLocaleString('es-CO')}</strong>
            </div>
            <button class="btn btn-warning w-100 btn-lg text-dark fw-700" onclick="pagarConStripe()">
              <i class="bi bi-check-circle me-2"></i>Confirmar Pedido
            </button>
            <button class="btn btn-link text-muted w-100 mt-2" onclick="navegarA('menu')">← Seguir comprando</button>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(async () => {
  try {
    const pedidoId = App.carrito?.pedidoId || 'ultimo'; 

    const { clientSecret, publishableKey } = await api('POST', '/pagos/stripe/intent', {
      pedidoId
    });

    clientSecret = clientSecret;

    stripe = Stripe(publishableKey);
    const elements = stripe.elements();

    card = elements.create('card');
    card.mount('#stripeElement');

  } catch (err) {
    mostrarToast('Error cargando Stripe', 'danger');
    console.error(err);
  }
}, 300);
}

function seleccionarPago(metodo) {
  document.getElementById('seccionTarjeta').style.display = metodo === 'tarjeta' ? 'block' : 'none';
}

async function confirmarPedido() {
  const calle = document.getElementById('dirCalle').value.trim();
  const ciudad = document.getElementById('dirCiudad').value.trim();
  if (!calle || !ciudad) { mostrarToast('Completa la dirección de entrega', 'warning'); return; }

  const metodoPago = document.querySelector('[name="metodoPago"]:checked')?.value || 'efectivo';

  try {
    const { pedido } = await api('POST', '/pedidos', {
      items: App.carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      direccionEntrega: { calle, ciudad, referencias: document.getElementById('dirReferencias').value },
      metodoPago,
      notas: ''
    });

    App.carrito = [];
    guardarCarrito();
    mostrarToast('🎉 Pedido creado exitosamente!');

    document.getElementById('appContent').innerHTML = `
      <div class="container page-section text-center">
        <div style="font-size:6rem">🎉</div>
        <h2 class="fw-700 mt-3">¡Pedido confirmado!</h2>
        <p class="text-muted fs-5">Número: <strong>${pedido.numeroPedido}</strong></p>
        <p class="text-muted">Nuestro equipo comenzará a preparar tu pedido en breve.</p>
        <div class="d-flex gap-3 justify-content-center mt-4">
          <button class="btn btn-warning px-4" onclick="renderMisPedidos()">Ver mis pedidos</button>
          <button class="btn btn-outline-secondary px-4" onclick="navegarA('menu')">Seguir comprando</button>
        </div>
      </div>
    `;
  } catch { }
}

// ─── PÁGINA: ADMIN ────────────────────────────────────────────────────────────
function renderAdmin() {
  if (App.usuario?.rol !== 'admin') { mostrarToast('Acceso denegado', 'danger'); navegarA('home'); return; }
  document.getElementById('appContent').innerHTML = `
    <div class="row g-0">
      <div class="col-lg-2 admin-sidebar p-3">
        <div class="text-white fw-700 px-3 py-2 mb-3" style="font-family:'Syne',sans-serif;font-size:1.1rem">Panel Admin</div>
        <ul class="nav flex-column">
          ${[
            ['dashboard','bi-speedometer2','Dashboard'],
            ['pedidos-admin','bi-bag-check','Pedidos'],
            ['productos-admin','bi-grid','Productos'],
            ['clientes-admin','bi-people','Clientes'],
            ['repartidores-admin','bi-bicycle','Repartidores']
          ].map(([id,ico,lbl]) => `
            <li class="nav-item">
              <a class="nav-link" href="#" onclick="renderSeccionAdmin('${id}')">
                <i class="bi ${ico} me-2"></i>${lbl}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="col-lg-10 p-4" id="adminContenido">
        <!-- dashboard cargará aquí -->
      </div>
    </div>
  `;
  renderSeccionAdmin('dashboard');
}

async function renderSeccionAdmin(seccion) {
  const cont = document.getElementById('adminContenido');
  cont.innerHTML = `<div class="loading-spinner"><div class="spinner-custom"></div></div>`;

  // Marcar activo
  document.querySelectorAll('.admin-sidebar .nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[onclick="renderSeccionAdmin('${seccion}')"]`)?.classList.add('active');

  if (seccion === 'dashboard') {
    try {
      const [{ pedidos }, { clientes }, { repartidores }, { productos }] = await Promise.all([
        api('GET', '/pedidos?limit=5'),
        api('GET', '/clientes?limit=1'),
        api('GET', '/repartidores'),
        api('GET', '/productos')
      ]);
      const ventas = pedidos.filter(p => p.pago?.estado === 'pagado').reduce((s, p) => s + p.total, 0);

      cont.innerHTML = `
        <h4 class="fw-700 mb-4">Dashboard</h4>
        <div class="row g-3 mb-4">
          <div class="col-sm-6 col-xl-3">
            <div class="stat-card bg-ventas">
              <div class="text-white-50 small mb-1">Ventas hoy</div>
              <div class="stat-number">$${ventas.toLocaleString('es-CO')}</div>
              <i class="bi bi-currency-dollar stat-icon"></i>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="stat-card bg-pedidos">
              <div class="text-white-50 small mb-1">Pedidos</div>
              <div class="stat-number">${pedidos.length}</div>
              <i class="bi bi-bag stat-icon"></i>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="stat-card bg-clientes">
              <div class="text-white-50 small mb-1">Clientes</div>
              <div class="stat-number">${clientes.total || 0}</div>
              <i class="bi bi-people stat-icon"></i>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="stat-card bg-repartidores">
              <div class="text-white-50 small mb-1">Repartidores</div>
              <div class="stat-number">${repartidores.length || 0}</div>
              <i class="bi bi-bicycle stat-icon"></i>
            </div>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-lg-8">
            <div class="card border-0 shadow-sm rounded-xl p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-700 mb-0">Pedidos recientes</h6>
                <button class="btn btn-sm btn-outline-secondary" onclick="renderSeccionAdmin('pedidos-admin')">Ver todos</button>
              </div>
              <div class="table-responsive">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr><th>Número</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    ${pedidos.map(p => `
                      <tr>
                        <td class="fw-600">${p.numeroPedido}</td>
                        <td>${p.cliente?.nombre || 'N/A'}</td>
                        <td>$${p.total.toLocaleString('es-CO')}</td>
                        <td><span class="badge badge-${p.estado}">${estadoTexto(p.estado)}</span></td>
                        <td><button class="btn btn-sm btn-outline-primary" onclick="gestionarPedido('${p._id}')">Gestionar</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card border-0 shadow-sm rounded-xl p-4">
              <h6 class="fw-700 mb-3">Productos disponibles</h6>
              <div class="d-flex align-items-center justify-content-center" style="height:180px">
                <canvas id="chartProductos"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;
      // Donut chart
      const categorias = {};
      productos.forEach(p => { categorias[p.categoria] = (categorias[p.categoria] || 0) + 1; });
      new Chart(document.getElementById('chartProductos'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(categorias).map(categoriaNombre),
          datasets: [{ data: Object.values(categorias), backgroundColor: ['#E65C00','#FFC300','#0F3460','#198754','#6A1B9A','#0288D1'] }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
      });
    } catch { }

  } else if (seccion === 'pedidos-admin') {
    try {
      const { pedidos } = await api('GET', '/pedidos?limit=50');
      cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-700">Gestión de Pedidos</h4>
        </div>
        <div class="card border-0 shadow-sm rounded-xl">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr><th>Número</th><th>Cliente</th><th>Items</th><th>Total</th><th>Estado</th><th>Pago</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                ${pedidos.map(p => `
                  <tr>
                    <td class="fw-600 small">${p.numeroPedido}</td>
                    <td>${p.cliente?.nombre || 'N/A'}</td>
                    <td><small>${p.items?.length || 0} producto(s)</small></td>
                    <td>$${p.total.toLocaleString('es-CO')}</td>
                    <td>
                      <select class="form-select form-select-sm" style="min-width:140px" onchange="cambiarEstadoPedido('${p._id}',this.value)">
                        ${['pendiente','confirmado','preparando','en_camino','entregado','cancelado'].map(e =>
                          `<option value="${e}" ${p.estado===e?'selected':''}>${estadoTexto(e)}</option>`
                        ).join('')}
                      </select>
                    </td>
                    <td><span class="badge ${p.pago?.estado==='pagado'?'bg-success':'bg-warning text-dark'}">${p.pago?.estado||'pendiente'}</span></td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary" onclick="asignarRepartidorModal('${p._id}')">
                        <i class="bi bi-bicycle"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch { }

  } else if (seccion === 'productos-admin') {
    try {
      const { productos } = await api('GET', '/productos');
      cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-700">Gestión de Productos</h4>
          <button class="btn btn-warning text-dark fw-600" onclick="formProducto()">
            <i class="bi bi-plus-circle me-1"></i>Nuevo Producto
          </button>
        </div>
        <div id="formProductoContenido"></div>
        <div class="row g-3">
          ${productos.map(p => `
            <div class="col-sm-6 col-xl-4">
              <div class="card border-0 shadow-sm rounded-xl p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="fw-700">${p.nombre}</div>
                    <small class="text-muted">${categoriaNombre(p.categoria)}</small>
                  </div>
                  <span class="badge ${p.disponible?'bg-success':'bg-secondary'}">${p.disponible?'Activo':'Inactivo'}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-700 text-primary-custom">$${p.precio.toLocaleString('es-CO')}</span>
                  <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-secondary" onclick="formProducto(${JSON.stringify(p).replace(/"/g,'&quot;')})">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto('${p._id}')">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch { }

  } else if (seccion === 'clientes-admin') {
    try {
      const { clientes, total } = await api('GET', '/clientes');
      cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-700">Clientes <span class="badge bg-secondary">${total}</span></h4>
        </div>
        <div class="card border-0 shadow-sm rounded-xl">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light"><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Registro</th></tr></thead>
              <tbody>
                ${clientes.map(c => `
                  <tr>
                    <td class="fw-600">${c.nombre}</td>
                    <td>${c.email}</td>
                    <td>${c.telefono || 'N/A'}</td>
                    <td><span class="badge ${c.activo?'bg-success':'bg-danger'}">${c.activo?'Activo':'Inactivo'}</span></td>
                    <td><small class="text-muted">${new Date(c.createdAt).toLocaleDateString('es-CO')}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch { }

  } else if (seccion === 'repartidores-admin') {
    try {
      const { repartidores } = await api('GET', '/repartidores');
      cont.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-700">Repartidores</h4>
          <button class="btn btn-warning text-dark fw-600" onclick="navegarA('registro')">
            <i class="bi bi-plus-circle me-1"></i>Nuevo
          </button>
        </div>
        <div class="row g-3">
          ${repartidores.map(r => `
            <div class="col-sm-6 col-lg-4">
              <div class="card border-0 shadow-sm rounded-xl p-4">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <div style="width:48px;height:48px;border-radius:50%;background:var(--dark);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem">
                    ${r.nombre.charAt(0)}
                  </div>
                  <div>
                    <div class="fw-700">${r.nombre}</div>
                    <div class="text-muted small">${r.vehiculo || 'Sin vehículo'} ${r.placa?'• '+r.placa:''}</div>
                  </div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="badge ${r.disponible?'bg-success':'bg-secondary'} px-3 py-2">
                    ${r.disponible?'🟢 Disponible':'⚫ No disponible'}
                  </span>
                  <small class="text-muted">${r.telefono||''}</small>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch { }
  }
}

async function cambiarEstadoPedido(id, estado) {
  try {
    await api('PATCH', `/pedidos/${id}/estado`, { estado });
    mostrarToast(`Estado actualizado: ${estadoTexto(estado)}`);
  } catch { }
}

function formProducto(producto = null) {
  const cont = document.getElementById('formProductoContenido');
  const esEdicion = !!producto;
  cont.innerHTML = `
    <div class="card border-warning shadow-sm rounded-xl p-4 mb-4">
      <h6 class="fw-700 mb-3">${esEdicion ? 'Editar' : 'Nuevo'} Producto</h6>
      <div class="row g-3">
        <div class="col-sm-6">
          <input class="form-control" id="pNombre" placeholder="Nombre" value="${producto?.nombre||''}"/>
        </div>
        <div class="col-sm-3">
          <input class="form-control" id="pPrecio" type="number" placeholder="Precio" value="${producto?.precio||''}"/>
        </div>
        <div class="col-sm-3">
          <select class="form-select" id="pCategoria">
            ${['entrada','plato_principal','bebida','postre','combo'].map(c =>
              `<option value="${c}" ${producto?.categoria===c?'selected':''}>${categoriaNombre(c)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="col-12">
          <textarea class="form-control" id="pDesc" rows="2" placeholder="Descripción">${producto?.descripcion||''}</textarea>
        </div>
        <div class="col-sm-4">
          <input class="form-control" id="pTiempo" type="number" placeholder="Tiempo prep (min)" value="${producto?.tiempoPrep||15}"/>
        </div>
        <div class="col-sm-4 d-flex align-items-end">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="pDisponible" ${!producto||producto.disponible?'checked':''}>
            <label class="form-check-label" for="pDisponible">Disponible</label>
          </div>
        </div>
        <div class="col-sm-4 d-flex gap-2">
          <button class="btn btn-warning flex-grow-1" onclick="guardarProducto(${esEdicion?`'${producto._id}'`:'null'})">
            <i class="bi bi-check2 me-1"></i>${esEdicion?'Guardar':'Crear'}
          </button>
          <button class="btn btn-outline-secondary" onclick="document.getElementById('formProductoContenido').innerHTML=''">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  cont.scrollIntoView({ behavior: 'smooth' });
}

async function guardarProducto(id) {
  const datos = {
    nombre: document.getElementById('pNombre').value,
    precio: +document.getElementById('pPrecio').value,
    categoria: document.getElementById('pCategoria').value,
    descripcion: document.getElementById('pDesc').value,
    tiempoPrep: +document.getElementById('pTiempo').value,
    disponible: document.getElementById('pDisponible').checked
  };
  try {
    if (id) await api('PUT', `/productos/${id}`, datos);
    else await api('POST', '/productos', datos);
    mostrarToast(id ? 'Producto actualizado' : 'Producto creado');
    renderSeccionAdmin('productos-admin');
  } catch { }
}

async function eliminarProducto(id) {
  if (!confirm('¿Desactivar este producto?')) return;
  try { await api('DELETE', `/productos/${id}`); mostrarToast('Producto desactivado'); renderSeccionAdmin('productos-admin'); } catch { }
}

// ─── PÁGINA: REPARTIDOR ───────────────────────────────────────────────────────
async function renderRepartidor() {
  if (App.usuario?.rol !== 'repartidor') { mostrarToast('Acceso denegado', 'danger'); navegarA('home'); return; }
  document.getElementById('appContent').innerHTML = `
    <div class="container page-section">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h4 class="fw-700 mb-0"><i class="bi bi-bicycle me-2"></i>Panel Repartidor</h4>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="switchDisponible" style="width:50px;height:26px"
            ${App.usuario.disponible?'checked':''} onchange="toggleDisponibilidad(this.checked)">
          <label class="form-check-label fw-600 ms-2" for="switchDisponible">
            ${App.usuario.disponible?'🟢 Disponible':'⚫ No disponible'}
          </label>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm rounded-xl p-4">
            <h6 class="fw-700 mb-3">Mis entregas activas</h6>
            <div id="entregasActivas">
              <div class="loading-spinner"><div class="spinner-custom"></div></div>
            </div>
          </div>
        </div>
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm rounded-xl p-4">
            <h6 class="fw-700 mb-3">Mi ruta actual</h6>
            <div id="mapaRepartidor" style="height:350px;background:#F0F0F0;border-radius:12px;display:flex;align-items:center;justify-content:center">
              <div class="text-center text-muted">
                <i class="bi bi-map display-4 d-block mb-2"></i>
                <p class="mb-0">Mapa cargará con Google Maps API</p>
                <small>Configura GOOGLE_MAPS_API_KEY en .env</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-xl p-4 mt-4">
        <h6 class="fw-700 mb-3">Historial de entregas</h6>
        <div id="historialEntregas">
          <div class="loading-spinner"><div class="spinner-custom"></div></div>
        </div>
      </div>
    </div>
  `;
  cargarEntregasRepartidor();
}

async function cargarEntregasRepartidor() {
  try {
    const { pedidos } = await api('GET', '/pedidos');
    const activos = pedidos.filter(p => ['en_camino', 'confirmado'].includes(p.estado));
    const historial = pedidos.filter(p => ['entregado', 'cancelado'].includes(p.estado));

    const actCont = document.getElementById('entregasActivas');
    actCont.innerHTML = activos.length ? activos.map(p => `
      <div class="entrega-card">
        <div class="fw-700 mb-1">${p.numeroPedido}</div>
        <div class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>${p.direccionEntrega?.calle}, ${p.direccionEntrega?.ciudad}</div>
        <div class="d-flex justify-content-between">
          <span class="badge badge-${p.estado}">${estadoTexto(p.estado)}</span>
          <button class="btn btn-sm btn-success" onclick="marcarEntregado('${p._id}')">
            <i class="bi bi-check-circle me-1"></i>Entregado
          </button>
        </div>
      </div>
    `).join('') : '<p class="text-muted text-center py-3">Sin entregas activas</p>';

    const histCont = document.getElementById('historialEntregas');
    histCont.innerHTML = historial.length ? `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light"><tr><th>Número</th><th>Dirección</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${historial.map(p => `
              <tr>
                <td class="fw-600">${p.numeroPedido}</td>
                <td>${p.direccionEntrega?.calle || 'N/A'}</td>
                <td><span class="badge badge-${p.estado}">${estadoTexto(p.estado)}</span></td>
                <td><small>${new Date(p.createdAt).toLocaleDateString('es-CO')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="text-muted text-center py-3">Sin historial</p>';
  } catch { }
}

async function toggleDisponibilidad(disponible) {
  try {
    await api('PATCH', `/repartidores/${App.usuario._id}/disponibilidad`, { disponible });
    App.usuario.disponible = disponible;
    localStorage.setItem('usuario', JSON.stringify(App.usuario));
    document.querySelector('[for="switchDisponible"]').textContent = disponible ? '🟢 Disponible' : '⚫ No disponible';
    mostrarToast(`Estado: ${disponible ? 'Disponible' : 'No disponible'}`);
  } catch { }
}

async function marcarEntregado(id) {
  try {
    await api('PATCH', `/pedidos/${id}/estado`, { estado: 'entregado', nota: 'Entregado por repartidor' });
    mostrarToast('🎉 Entrega completada!');
    cargarEntregasRepartidor();
  } catch { }
}

// ─── PÁGINA: PERFIL ───────────────────────────────────────────────────────────
function renderPerfil() {
  const u = App.usuario;
  document.getElementById('appContent').innerHTML = `
    <div class="container page-section">
      <div class="row justify-content-center">
        <div class="col-lg-6">
          <div class="card border-0 shadow-sm rounded-xl overflow-hidden">
            <div style="background:linear-gradient(135deg,var(--dark),var(--dark3));padding:32px;text-align:center">
              <div style="width:80px;height:80px;border-radius:50%;background:var(--accent);color:var(--dark);font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
                ${u.nombre.charAt(0)}
              </div>
              <div class="text-white fw-700 fs-5">${u.nombre}</div>
              <div class="text-white-50">${u.email}</div>
              <span class="badge bg-warning text-dark mt-2 px-3">${u.rol}</span>
            </div>
            <div class="card-body p-4">
              <h6 class="fw-700 mb-3">Editar perfil</h6>
              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label fw-600">Nombre</label>
                  <input class="form-control" id="pfNombre" value="${u.nombre}"/>
                </div>
                <div class="col-sm-6">
                  <label class="form-label fw-600">Teléfono</label>
                  <input class="form-control" id="pfTel" value="${u.telefono||''}"/>
                </div>
                <div class="col-12">
                  <label class="form-label fw-600">Dirección</label>
                  <input class="form-control" id="pfDir" value="${u.direccion||''}"/>
                </div>
              </div>
              <button class="btn btn-warning w-100 mt-4 fw-600" onclick="guardarPerfil()">
                <i class="bi bi-check-circle me-2"></i>Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function guardarPerfil() {
  try {
    const { usuario } = await api('PUT', '/auth/perfil', {
      nombre: document.getElementById('pfNombre').value,
      telefono: document.getElementById('pfTel').value,
      direccion: document.getElementById('pfDir').value
    });
    App.usuario = usuario;
    localStorage.setItem('usuario', JSON.stringify(usuario));
    actualizarNavAuth();
    mostrarToast('Perfil actualizado');
  } catch { }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  actualizarNavAuth();
  actualizarContadorCarrito();
  inicializarSocket();
  navegarA('home');
});
