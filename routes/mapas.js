const router = require('express').Router();
const { autenticar } = require('../middleware/auth');

// Proxy para Google Maps — protege la API key del frontend
router.get('/ruta', async (req, res) => {
  try {
    const { origen_lat, origen_lng, destino_lat, destino_lng } = req.query;

    if (!origen_lat || !origen_lng || !destino_lat || !destino_lng) {
      return res.status(400).json({ error: true, mensaje: 'Se requieren las coordenadas de origen y destino' });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen_lat},${origen_lng}&destination=${destino_lat},${destino_lng}&mode=driving&language=es&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(400).json({ error: true, mensaje: 'No se pudo calcular la ruta', detalle: data.status });
    }

    const ruta = data.routes[0];
    res.json({
      distancia: ruta.legs[0].distance.text,
      duracion:  ruta.legs[0].duration.text,
      duracionSegundos: ruta.legs[0].duration.value,
      polyline:  ruta.overview_polyline.points,
      pasos:     ruta.legs[0].steps.map(s => ({
        instruccion: s.html_instructions.replace(/<[^>]*>/g, ''),
        distancia:   s.distance.text,
        duracion:    s.duration.text
      }))
    });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// Geocodificación
router.get('/geocodificar', async (req, res) => {
  try {
    const { direccion } = req.query;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion)}&language=es&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results.length) {
      return res.status(404).json({ error: true, mensaje: 'Dirección no encontrada' });
    }

    const { lat, lng } = data.results[0].geometry.location;
    res.json({ lat, lng, direccionFormateada: data.results[0].formatted_address });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

module.exports = router;
