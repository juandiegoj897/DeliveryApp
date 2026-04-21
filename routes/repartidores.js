// ─── routes/repartidores.js ───────────────────────────────────────────────────
const router = require('express').Router();
const { Usuario } = require('../models');
const { autenticar, autorizar } = require('../middleware/auth');

router.get('/', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const repartidores = await Usuario.find({ rol: 'repartidor' }).sort('-createdAt');
    res.json({ repartidores });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.get('/disponibles', autenticar, async (req, res) => {
  try {
    const repartidores = await Usuario.find({ rol: 'repartidor', disponible: true, activo: true });
    res.json({ repartidores });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.post('/', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const repartidor = await Usuario.create({ ...req.body, rol: 'repartidor' });
    res.status(201).json({ mensaje: 'Repartidor creado', repartidor });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

router.put('/:id', autenticar, autorizar('admin', 'repartidor'), async (req, res) => {
  try {
    const { password, rol, ...datos } = req.body;
    const repartidor = await Usuario.findByIdAndUpdate(req.params.id, datos, { new: true });
    if (!repartidor) return res.status(404).json({ error: true, mensaje: 'Repartidor no encontrado' });
    res.json({ mensaje: 'Repartidor actualizado', repartidor });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

router.patch('/:id/disponibilidad', autenticar, autorizar('repartidor', 'admin'), async (req, res) => {
  try {
    const { disponible } = req.body;
    const repartidor = await Usuario.findByIdAndUpdate(req.params.id, { disponible }, { new: true });
    res.json({ mensaje: 'Disponibilidad actualizada', repartidor });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.patch('/:id/ubicacion', autenticar, autorizar('repartidor'), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Usuario.findByIdAndUpdate(req.params.id, { ubicacionActual: { lat, lng } });
    res.json({ mensaje: 'Ubicación actualizada' });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.delete('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    await Usuario.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ mensaje: 'Repartidor desactivado' });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

module.exports = router;
