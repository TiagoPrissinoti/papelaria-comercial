const asyncHandler = require('../src/utils/asyncHandler');
const {
  criarPreferencia,
  consultarPagamento,
  atualizarPedidoComPagamento,
  normalizePaymentStatus
} = require('../services/mercadoPagoService');
const { webhookSecret, environment } = require('../config/mercadoPago');
const Order = require('../src/models/Order');

let webhookTools;
try {
  webhookTools = require('mercadopago');
} catch {
  webhookTools = null;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

exports.criar = asyncHandler(async (req, res) => {
  const { preference, order } = await criarPreferencia({
    clienteId: req.user.id,
    payerEmail: req.user.email,
    addressId: Number(req.body.address_id),
    requestOrigin: req.headers.origin
  });

  res.status(201).json({
    id: preference.id,
    init_point: preference.init_point,
    pedido_id: order.id
  });
});

exports.webhook = asyncHandler(async (req, res) => {
  const notificationType = String(req.body?.type || req.query.type || req.query.topic || 'payment').toLowerCase();
  if (notificationType !== 'payment') return res.status(200).json({ ignored: true });

  const queryDataId = req.query['data.id'];
  const notificationDataId = String(queryDataId || req.body?.data?.id || '').trim();
  if (!notificationDataId) throw badRequest('ID do pagamento ausente na notificacao.');

  if (!webhookSecret || !webhookTools?.WebhookSignatureValidator) {
    return res.status(503).json({ message: 'Validacao do webhook indisponivel.' });
  }

  try {
    webhookTools.WebhookSignatureValidator.validate({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      // A assinatura usa apenas data.id da query string. O ID do body serve
      // para consultar o pagamento, mas nao deve ser incluido no HMAC quando
      // o Mercado Pago nao o enviou tambem na URL.
      dataId: queryDataId,
      secret: webhookSecret
    });
  } catch (error) {
    console.warn('Assinatura do webhook do Mercado Pago invalida:', {
      reason: error?.reason || error?.name || 'assinatura_invalida',
      requestId: req.headers['x-request-id'],
      hasSignature: Boolean(req.headers['x-signature']),
      hasQueryDataId: Boolean(queryDataId),
      environment
    });

    // O Mercado Pago pode gerar assinaturas inconsistentes em notificacoes do
    // ambiente de teste. Nesse ambiente apenas, a notificacao ainda e conferida
    // na API com o access token e passa por todas as validacoes do pedido.
    if (environment === 'production') return res.status(401).end();
  }

  const payment = await consultarPagamento(notificationDataId);
  const order = await atualizarPedidoComPagamento({ payment });

  res.status(200).json({
    success: true,
    status: normalizePaymentStatus(payment.status),
    pedido_id: order.id
  });
});

exports.consultar = asyncHandler(async (req, res) => {
  const order = await Order.findById(Number(req.params.id));
  if (!order) return res.status(404).json({ message: 'Pedido nao encontrado' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado a este pedido' });
  }

  res.json({
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    total: order.total,
    payment_id: order.payment_id,
    preference_id: order.preference_id,
    fulfillment_error: order.fulfillment_error
  });
});

exports.reconciliar = asyncHandler(async (req, res) => {
  const order = await Order.findById(Number(req.params.id));
  if (!order) return res.status(404).json({ message: 'Pedido nao encontrado' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado a este pedido' });
  }

  const paymentId = String(req.body?.payment_id || '').trim();
  if (!/^\d+$/.test(paymentId)) throw badRequest('ID do pagamento invalido.');

  const payment = await consultarPagamento(paymentId);
  if (String(payment?.external_reference || '') !== String(order.id)) {
    throw badRequest('Pagamento nao pertence ao pedido informado.');
  }
  const updatedOrder = await atualizarPedidoComPagamento({ payment });

  res.json({
    id: updatedOrder.id,
    status: updatedOrder.status,
    payment_status: updatedOrder.payment_status,
    fulfillment_error: updatedOrder.fulfillment_error
  });
});
