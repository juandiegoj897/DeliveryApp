// ─── routes/clientes.js ───────────────────────────────────────────────────────
const router = require('express').Router();
const { Usuario } = require('../models');
const { autenticar, autorizar } = require('../middleware/auth');

// Listar clientes (admin)
router.get('/', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, buscar } = req.query;
    const filtro = { rol: 'cliente' };
    if (buscar) filtro.$or = [{ nombre: new RegExp(buscar, 'i') }, { email: new RegExp(buscar, 'i') }];

    const [clientes, total] = await Promise.all([
      Usuario.find(filtro).limit(limit * 1).skip((page - 1) * limit).sort('-createdAt'),
      Usuario.countDocuments(filtro)
    ]);
    res.json({ clientes, total, paginas: Math.ceil(total / limit), paginaActual: +page });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Obtener cliente por ID
router.get('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const cliente = await Usuario.findOne({ _id: req.params.id, rol: 'cliente' });
    if (!cliente) return res.status(404).json({ error: true, mensaje: 'Cliente no encontrado' });
    res.json({ cliente });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

// Crear cliente (admin)
router.post('/', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const cliente = await Usuario.create({ ...req.body, rol: 'cliente' });
    res.status(201).json({ mensaje: 'Cliente creado', cliente });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

// Actualizar cliente
router.put('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const { password, rol, ...datos } = req.body;
    const cliente = await Usuario.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true });
    if (!cliente) return res.status(404).json({ error: true, mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente actualizado', cliente });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

// Desactivar cliente
router.delete('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ mensaje: 'Cliente desactivado correctamente' });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

module.exports = router;
