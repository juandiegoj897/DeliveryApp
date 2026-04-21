# 🍔 DeliverYa — Sistema de Pedidos a Domicilio

**Versión:** 03 | **Fecha:** 28/07/2022 (actualizado)

---

## 📋 Descripción
Sistema completo de pedidos a domicilio para restaurantes con:
- 🛒 Carrito de compras interactivo
- 💳 Pagos seguros con Stripe
- 🗺️ Seguimiento en tiempo real con Socket.IO + Google Maps
- 👤 Autenticación con roles (Cliente, Repartidor, Admin)
- 📊 Panel de administración completo

---

## 🏗️ Arquitectura

```
delivery-app/
├── server.js              # Servidor Express + Socket.IO
├── .env.example           # Variables de entorno (copiar a .env)
├── models/
│   └── index.js           # Modelos MongoDB (Usuario, Producto, Pedido)
├── middleware/
│   └── auth.js            # JWT + autorización por roles
├── routes/
│   ├── auth.js            # Login, registro, perfil
│   ├── clientes.js        # CRUD clientes
│   ├── repartidores.js    # CRUD repartidores
│   ├── productos.js       # CRUD productos
│   ├── pedidos.js         # Gestión de pedidos
│   ├── pagos.js           # Stripe webhooks
│   └── mapas.js           # Proxy Google Maps API
└── public/
    ├── index.html         # SPA principal
    ├── css/app.css        # Estilos Bootstrap + custom
    └── js/app.js          # Frontend SPA (vanilla JS)
```

---

## ⚙️ Instalación

### 1. Prerequisitos
- Node.js ≥ 18
- MongoDB (local o Atlas)
- Cuenta Stripe (para pagos)
- Google Maps API Key

### 2. Instalar dependencias
```bash
cd delivery-app
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 4. Iniciar servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

La app estará disponible en: `http://localhost:3000`

---

## 🔑 Roles y funcionalidades

### Cliente
- Ver menú y filtrar por categoría
- Agregar al carrito y modificar cantidades
- Checkout con dirección de entrega
- Pagar con tarjeta (Stripe), efectivo o transferencia
- Ver historial de pedidos
- Seguimiento en tiempo real del pedido
- Cancelar pedidos pendientes

### Repartidor
- Panel de disponibilidad (on/off)
- Ver entregas asignadas
- Marcar pedidos como entregados
- Historial de entregas
- Actualización de ubicación en tiempo real

### Administrador
- Dashboard con métricas (ventas, pedidos, clientes)
- CRUD completo de productos
- Gestión de pedidos (cambiar estados, asignar repartidor)
- Listado de clientes y repartidores
- Vista de pagos

---

## 🔌 APIs externas

### Stripe (Pagos)
1. Crear cuenta en [stripe.com](https://stripe.com)
2. Copiar `STRIPE_SECRET_KEY` y `STRIPE_PUBLISHABLE_KEY` al `.env`
3. Configurar webhook en el dashboard de Stripe apuntando a `/api/pagos/stripe/webhook`

### Google Maps (Rutas)
1. Habilitar APIs: Directions API, Geocoding API, Maps JavaScript API
2. Copiar `GOOGLE_MAPS_API_KEY` al `.env`

---

## 📡 Endpoints API

| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/auth/registro` | Crear cuenta | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/productos` | Listar productos | Público |
| POST | `/api/pedidos` | Crear pedido | Cliente |
| GET | `/api/pedidos` | Mis pedidos | Autenticado |
| PATCH | `/api/pedidos/:id/estado` | Cambiar estado | Admin/Repartidor |
| GET | `/api/clientes` | Listar clientes | Admin |
| GET | `/api/repartidores/disponibles` | Repartidores disponibles | Autenticado |
| POST | `/api/pagos/stripe/intent` | Iniciar pago | Cliente |
| GET | `/api/mapas/ruta` | Calcular ruta | Autenticado |

---

## 🧪 Usuarios de prueba

Crear con POST `/api/auth/registro`:

```json
// Admin
{ "nombre": "Admin", "email": "admin@deliverya.com", "password": "admin123", "rol": "admin" }

// Repartidor
{ "nombre": "Carlos Moto", "email": "repartidor@deliverya.com", "password": "rep123", "rol": "repartidor", "vehiculo": "Moto", "placa": "ABC-123" }

// Cliente
{ "nombre": "María García", "email": "cliente@deliverya.com", "password": "cli123" }
```

---

## 🛡️ Seguridad implementada
- ✅ Contraseñas hasheadas con bcrypt (salt rounds: 12)
- ✅ JWT para autenticación stateless
- ✅ Autorización basada en roles
- ✅ Helmet.js para headers HTTP seguros
- ✅ Validación de inputs con express-validator
- ✅ API key de Google Maps protegida (solo acceso servidor)
- ✅ Pagos procesados por Stripe (PCI compliant)

---

## 📱 Características frontend
- ✅ SPA (Single Page Application) con vanilla JS
- ✅ Bootstrap 5 — responsive para móviles
- ✅ Socket.IO para actualizaciones en tiempo real
- ✅ Carrito persistente en localStorage
- ✅ Tipografía: Syne + DM Sans (Google Fonts)
