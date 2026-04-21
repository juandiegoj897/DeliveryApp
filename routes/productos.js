const router = require('express').Router();
const { Producto } = require('../models');
const { autenticar, autorizar } = require('../middleware/auth');

// Listar productos (público)
router.get('/', async (req, res) => {
  try {
    const { categoria, disponible, buscar } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (disponible !== undefined) filtro.disponible = disponible === 'true';
    if (buscar) filtro.nombre = new RegExp(buscar, 'i');

    const productos = await Producto.find(filtro).sort('categoria nombre');
    res.json({ productos });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: true, mensaje: 'Producto no encontrado' });
    res.json({ producto });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

router.post('/', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const producto = await Producto.create(req.body);
    res.status(201).json({ mensaje: 'Producto creado', producto });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

router.put('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!producto) return res.status(404).json({ error: true, mensaje: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto actualizado', producto });
  } catch (err) { res.status(400).json({ error: true, mensaje: err.message }); }
});

router.delete('/:id', autenticar, autorizar('admin'), async (req, res) => {
  try {
    await Producto.findByIdAndUpdate(req.params.id, { disponible: false });
    res.json({ mensaje: 'Producto desactivado' });
  } catch (err) { res.status(500).json({ error: true, mensaje: err.message }); }
});

module.exports = router;
