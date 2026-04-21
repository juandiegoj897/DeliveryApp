const router = require('express').Router();
const { Pedido, Producto } = require('../models');
const { autenticar, autorizar } = require('../middleware/auth');

// Crear pedido
router.post('/', autenticar, async (req, res) => {
  try {
    const { items, direccionEntrega, metodoPago, notas } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: true, mensaje: 'El pedido debe tener al menos un producto' });
    }

    // Validar productos y calcular totales
    let subtotal = 0;
    const itemsDetallados = [];

    for (const item of items) {
      const producto = await Producto.findById(item.productoId);
      if (!producto || !producto.disponible) {
        return res.status(400).json({ error: true, mensaje: `Producto no disponible: ${item.productoId}` });
      }
      const itemSubtotal = producto.precio * item.cantidad;
      subtotal += itemSubtotal;
      itemsDetallados.push({
        producto: producto._id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: item.cantidad,
        subtotal: itemSubtotal
      });
    }

    const costoEnvio = 5000;
    const total = subtotal + costoEnvio;

    const pedido = await Pedido.create({
      cliente: req.usuario._id,
      items: itemsDetallados,
      subtotal,
      costoEnvio,
      total,
      direccionEntrega,
      pago: { metodo: metodoPago, monto: total },
      notas,
      historialEstados: [{ estado: 'pendiente', nota: 'Pedido creado' }]
    });

    await pedido.populate('cliente', 'nombre email telefono');

    // Notificar via Socket.IO
    req.app.get('io').emit('nuevo_pedido', { pedido });

    res.status(201).json({ mensaje: 'Pedido creado exitosamente', pedido });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// Listar pedidos (admin ve todos, cliente ve los suyos, repartidor ve los asignados)
router.get('/', autenticar, async (req, res) => {
  try {
    const { estado, page = 1, limit = 20 } = req.query;
    const filtro = {};

    if (req.usuario.rol === 'cliente')    filtro.cliente = req.usuario._id;
    if (req.usuario.rol === 'repartidor') filtro.repartidor = req.usuario._id;
    if (estado) filtro.estado = estado;

    const [pedidos, total] = await Promise.all([
      Pedido.find(filtro)
        .populate('cliente', 'nombre email telefono')
        .populate('repartidor', 'nombre telefono')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Pedido.countDocuments(filtro)
    ]);

    res.json({ pedidos, total, paginas: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Obtener pedido por ID
router.get('/:id', autenticar, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('cliente', 'nombre email telefono direccion')
      .populate('repartidor', 'nombre telefono vehiculo placa ubicacionActual');

    if (!pedido) return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });

    // Validar acceso
    if (req.usuario.rol === 'cliente' && pedido.cliente._id.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: true, mensaje: 'No tienes acceso a este pedido' });
    }

    res.json({ pedido });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Actualizar estado del pedido
router.patch('/:id/estado', autenticar, autorizar('admin', 'repartidor'), async (req, res) => {
  try {
    const { estado, nota } = req.body;
    const estados = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'];

    if (!estados.includes(estado)) {
      return res.status(400).json({ error: true, mensaje: 'Estado inválido' });
    }

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      {
        estado,
        $push: { historialEstados: { estado, nota: nota || '' } }
      },
      { new: true }
    ).populate('cliente', 'nombre email').populate('repartidor', 'nombre');

    if (!pedido) return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });

    // Notificar al cliente via Socket.IO
    req.app.get('io').to(`pedido_${pedido._id}`).emit('estado_pedido_actualizado', { estado, pedido });

    res.json({ mensaje: 'Estado actualizado', pedido });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Asignar repartidor
router.patch('/:id/asignar-repartidor', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const { repartidorId } = req.body;
    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      { repartidor: repartidorId, estado: 'en_camino',
        $push: { historialEstados: { estado: 'en_camino', nota: 'Repartidor asignado' } }
      },
      { new: true }
    ).populate('repartidor', 'nombre telefono');

    req.app.get('io').to(`pedido_${pedido._id}`).emit('repartidor_asignado', { repartidor: pedido.repartidor });

    res.json({ mensaje: 'Repartidor asignado', pedido });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Cancelar pedido (cliente o admin)
router.patch('/:id/cancelar', autenticar, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });

    if (!['pendiente', 'confirmado'].includes(pedido.estado)) {
      return res.status(400).json({ error: true, mensaje: 'Este pedido ya no puede cancelarse' });
    }

    pedido.estado = 'cancelado';
    pedido.historialEstados.push({ estado: 'cancelado', nota: req.body.motivo || 'Cancelado por usuario' });
    await pedido.save();

    res.json({ mensaje: 'Pedido cancelado', pedido });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

module.exports = router;
