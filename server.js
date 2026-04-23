const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', methods: ['GET', 'POST'] }
});

app.use("/images", express.static(path.join(__dirname, "models/images")));
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/clientes',  require('./routes/clientes'));
app.use('/api/repartidores', require('./routes/repartidores'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos',   require('./routes/pedidos'));
app.use('/api/pagos',     require('./routes/pagos'));
app.use('/api/mapas',     require('./routes/mapas'));

// ─── Socket.IO — Seguimiento en tiempo real ───────────────────────────────────
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('unirse_pedido', (pedidoId) => {
    socket.join(`pedido_${pedidoId}`);
    console.log(`Socket ${socket.id} unido a pedido_${pedidoId}`);
  });

  socket.on('actualizar_ubicacion', ({ pedidoId, lat, lng }) => {
    io.to(`pedido_${pedidoId}`).emit('ubicacion_actualizada', { lat, lng });
  });

  socket.on('cambiar_estado_pedido', ({ pedidoId, estado }) => {
    io.to(`pedido_${pedidoId}`).emit('estado_pedido_actualizado', { estado });
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exponer io para usarlo en rutas
app.set('io', io);

// ─── Ruta catch-all → SPA ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: true,
    mensaje: err.message || 'Error interno del servidor'
  });
});

// ─── Conexión DB + Inicio ─────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Error al conectar MongoDB:', err.message);
    process.exit(1);
  });

  console.log('MONGODB_URI:', process.env.MONGODB_URI);