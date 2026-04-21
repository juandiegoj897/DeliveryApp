const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Verificar token JWT
const autenticar = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, mensaje: 'Token no proporcionado' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: true, mensaje: 'Usuario no válido o inactivo' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return res.status(401).json({ error: true, mensaje: 'Token inválido o expirado' });
  }
};

// Autorizar por rol
const autorizar = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ error: true, mensaje: 'No tienes permiso para realizar esta acción' });
  }
  next();
};

module.exports = { autenticar, autorizar };
