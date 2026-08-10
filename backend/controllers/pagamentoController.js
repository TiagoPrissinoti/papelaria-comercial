const asyncHandler = require('../src/utils/asyncHandler');
const {
  criarPreferencia,
  consultarPagamento,
  atualizarPedidoComPagamento,
  normalizePaymentStatus
} = require('../services/mercadoPagoService');
const { webhookSecret } = require('../config/mercadoPago');
const Pedido = require('../src/models/Pedido');

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

function successMessage(status) {
  if (status === 'approved') return 'Pagamento aprovado';
  if (status === 'pending') return 'Pagamento em análise';
  if (status === 'rejected' || status === 'cancelled' || status === 'refunded') return 'Pagamento recusado';
  return 'Status do pagamento atualizado';
}

exports.criar = asyncHandler(async (req, res) => {
  const produtos = req.body?.produtos;
  if (!Array.isArray(produtos) || !produtos.length) {
    throw badRequest('A lista de produtos e obrigatoria.');
  }

  const { preference, pedido } = await criarPreferencia({
    clienteId: req.user.id,
    produtos,
    requestOrigin: req.headers.origin
  });

  res.status(201).json({
    id: preference.id,
    init_point: preference.init_point,
    sandbox_init_point: preference.sandbox_init_point,
    pedido_id: pedido.id
  });
});

exports.webhook = asyncHandler(async (req, res) => {
  const notificationDataId = String(
    req.body?.data?.id ||
    req.query['data.id'] ||
    req.query.id ||
    req.body?.id ||
    ''
  ).trim();

  if (webhookSecret && webhookTools?.WebhookSignatureValidator && webhookTools?.InvalidWebhookSignatureError) {
    try {
      webhookTools.WebhookSignatureValidator.validate({
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId: notificationDataId,
        secret: webhookSecret
      });
    } catch (error) {
      if (error instanceof webhookTools.InvalidWebhookSignatureError) {
        return res.status(401).end();
      }
      throw error;
    }
  }

  const paymentId = notificationDataId;
  if (!paymentId) {
    throw badRequest('ID do pagamento ausente na notificacao.');
  }

  const payment = await consultarPagamento(paymentId);
  const pedido = await atualizarPedidoComPagamento({ payment });

  res.status(200).json({
    success: true,
    message: successMessage(normalizePaymentStatus(payment.status)),
    pedido: {
      id: pedido.id,
      status: pedido.status,
      payment_id: pedido.payment_id,
      preference_id: pedido.preference_id
    }
  });
});

exports.consultar = asyncHandler(async (req, res) => {
  const pedido = await Pedido.findById(Number(req.params.id));
  if (!pedido) {
    return res.status(404).json({ message: 'Pedido nao encontrado' });
  }

  res.json({
    id: pedido.id,
    status: pedido.status,
    valor_total: pedido.valor_total,
    payment_id: pedido.payment_id,
    preference_id: pedido.preference_id
  });
});
