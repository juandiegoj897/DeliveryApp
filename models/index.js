const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ══════════════════════════════════════════
// MODELO: USUARIO (Clientes, Repartidores, Admin)
// ══════════════════════════════════════════
const usuarioSchema = new mongoose.Schema({
  nombre:    { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },
  telefono:  { type: String },
  direccion: { type: String },
  rol:       { type: String, enum: ['cliente', 'repartidor', 'admin'], default: 'cliente' },
  activo:    { type: Boolean, default: true },
  fotoPerfil:{ type: String, default: '' },
  // Solo para repartidores
  vehiculo:  { type: String },
  placa:     { type: String },
  disponible:{ type: Boolean, default: false },
  ubicacionActual: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });

usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

usuarioSchema.methods.compararPassword = function(candidato) {
  return bcrypt.compare(candidato, this.password);
};

usuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ══════════════════════════════════════════
// MODELO: PRODUCTO
// ══════════════════════════════════════════
const productoSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, trim: true },
  descripcion: { type: String },
  precio:      { type: Number, required: true, min: 0 },
  categoria:   { type: String, required: true, enum: ['entrada', 'plato_principal', 'bebida', 'postre', 'combo'] },
  imagen:      { type: String, default: '' },
  disponible:  { type: Boolean, default: true },
  stock:       { type: Number, default: 100 },
  tiempoPrep:  { type: Number, default: 15 } // minutos
}, { timestamps: true });

// ══════════════════════════════════════════
// MODELO: PEDIDO
// ══════════════════════════════════════════
const itemPedidoSchema = new mongoose.Schema({
  producto:   { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre:     { type: String, required: true },
  precio:     { type: Number, required: true },
  cantidad:   { type: Number, required: true, min: 1 },
  subtotal:   { type: Number, required: true }
});

const pedidoSchema = new mongoose.Schema({
  numeroPedido: { type: String, unique: true },
  cliente:    { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  repartidor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  items:      [itemPedidoSchema],
  subtotal:   { type: Number, required: true },
  descuento:  { type: Number, default: 0 },
  costoEnvio: { type: Number, default: 5000 },
  total:      { type: Number, required: true },
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  direccionEntrega: {
    calle:      { type: String, required: true },
    ciudad:     { type: String, required: true },
    referencias:{ type: String },
    lat:        { type: Number },
    lng:        { type: Number }
  },
  pago: {
    metodo:     { type: String, enum: ['tarjeta', 'efectivo', 'transferencia'], required: true },
    estado:     { type: String, enum: ['pendiente', 'pagado', 'fallido', 'reembolsado'], default: 'pendiente' },
    stripeId:   { type: String },
    monto:      { type: Number }
  },
  notas:      { type: String },
  historialEstados: [{
    estado:     { type: String },
    fecha:      { type: Date, default: Date.now },
    nota:       { type: String }
  }],
  tiempoEstimado: { type: Number } // minutos
}, { timestamps: true });

pedidoSchema.pre('save', function(next) {
  if (!this.numeroPedido) {
    this.numeroPedido = 'PED-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  next();
});

// ══════════════════════════════════════════
// Exportar modelos
// ══════════════════════════════════════════
const Usuario  = mongoose.model('Usuario',  usuarioSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Pedido   = mongoose.model('Pedido',   pedidoSchema);

module.exports = { Usuario, Producto, Pedido };
