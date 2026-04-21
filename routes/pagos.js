// ─── routes/pagos.js ──────────────────────────────────────────────────────────
const router = require('express').Router();
const { Pedido } = require('../models');
const { autenticar } = require('../middleware/auth');

// Iniciar pago con Stripe
router.post('/stripe/intent', autenticar, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { pedidoId } = req.body;

    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) return res.status(404).json({ error: true, mensaje: 'Pedido no encontrado' });
    if (pedido.pago.estado === 'pagado') {
      return res.status(400).json({ error: true, mensaje: 'Este pedido ya fue pagado' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pedido.total * 100), // centavos
      currency: 'cop',
      metadata: { pedidoId: pedido._id.toString(), cliente: req.usuario._id.toString() }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// Webhook de Stripe (confirmar pago)
router.post('/stripe/webhook', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: true, mensaje: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const { pedidoId } = event.data.object.metadata;
      await Pedido.findByIdAndUpdate(pedidoId, {
        'pago.estado': 'pagado',
        'pago.stripeId': event.data.object.id,
        estado: 'confirmado',
        $push: { historialEstados: { estado: 'confirmado', nota: 'Pago recibido' } }
      });
    }

    res.json({ recibido: true });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

// Confirmar pago en efectivo
router.post('/efectivo/confirmar', autenticar, async (req, res) => {
  try {
    const { pedidoId } = req.body;
    const pedido = await Pedido.findByIdAndUpdate(pedidoId, {
      'pago.estado': 'pagado',
      estado: 'confirmado',
      $push: { historialEstados: { estado: 'confirmado', nota: 'Pago en efectivo confirmado' } }
    }, { new: true });

    res.json({ mensaje: 'Pago confirmado', pedido });
  } catch (err) {
    res.status(500).json({ error: true, mensaje: err.message });
  }
});

module.exports = router;
