const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Usuario } = require('../models');
const { autenticar } = require('../middleware/auth');

const generarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/registro
router.post('/registro', [
  body('nombre').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('rol').optional().isIn(['cliente', 'repartidor'])
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ error: true, errores: errores.array() });

  try {
    const { nombre, email, password, telefono, direccion, rol = 'cliente', vehiculo, placa } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ error: true, mensaje: 'El email ya está registrado' });

    const usuario = await Usuario.create({ nombre, email, password, telefono, direccion, rol, vehiculo, placa });
    const token = generarToken(usuario._id);

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente', token, usuario });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ error: true, errores: errores.array() });

  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email }).select('+password');

    if (!usuario || !(await usuario.compararPassword(password))) {
      return res.status(401).json({ error: true, mensaje: 'Credenciales incorrectas' });
    }
    if (!usuario.activo) {
      return res.status(401).json({ error: true, mensaje: 'Cuenta desactivada' });
    }

    const token = generarToken(usuario._id);
    res.json({ mensaje: 'Login exitoso', token, usuario });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// GET /api/auth/perfil
router.get('/perfil', autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

// PUT /api/auth/perfil
router.put('/perfil', autenticar, async (req, res) => {
  try {
    const campos = ['nombre', 'telefono', 'direccion', 'vehiculo', 'placa'];
    const update = {};
    campos.forEach(c => { if (req.body[c] !== undefined) update[c] = req.body[c]; });

    const usuario = await Usuario.findByIdAndUpdate(req.usuario._id, update, { new: true, runValidators: true });
    res.json({ mensaje: 'Perfil actualizado', usuario });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

module.exports = router;
