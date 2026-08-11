let Preference = null;

try {
  ({ Preference } = require('mercadopago'));
} catch {
  Preference = null;
}

const Order = require('../src/models/Order');
const {
  accessToken,
  environment,
  getMercadoPagoClient,
  getFrontendUrl,
  getBackendUrl
} = require('../config/mercadoPago');

const allowedStatuses = new Set(['approved', 'pending', 'rejected', 'cancelled', 'refunded']);

function formatError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round((number + Number.EPSILON) * 100);
}

function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  const normalized = String(status).toLowerCase();
  if (allowedStatuses.has(normalized)) return normalized;
  if (normalized === 'in_process' || normalized === 'authorized') return 'pending';
  if (normalized === 'charged_back') return 'refunded';
  return 'rejected';
}

function requireHttpsUrl(value, variableName) {
  const normalized = String(value || '').replace(/\/$/, '');
  if (!/^https:\/\//i.test(normalized)) {
    throw formatError(`${variableName} deve conter uma URL HTTPS publica.`, 500);
  }
  return normalized;
}

function buildReturnUrls(orderId, requestOrigin) {
  const frontendBase = process.env.NODE_ENV !== 'production' && requestOrigin
    ? requireHttpsUrl(requestOrigin, 'Origin do frontend')
    : requireHttpsUrl(getFrontendUrl(), 'FRONTEND_URL');
  const query = `pedido_id=${orderId}`;
  return {
    success: `${frontendBase}/checkout?payment_status=approved&${query}`,
    pending: `${frontendBase}/checkout?payment_status=pending&${query}`,
    failure: `${frontendBase}/checkout?payment_status=rejected&${query}`
  };
}

function buildPreferenceItems(items) {
  return items.map((item) => ({
    id: String(item.product_id),
    title: item.name,
    description: item.description || item.name,
    quantity: item.quantity,
    currency_id: 'BRL',
    unit_price: Number(item.price)
  }));
}

async function criarPreferencia({ clienteId, payerEmail, requestOrigin }) {
  if (!Preference) throw formatError('A SDK mercadopago nao esta instalada no backend.', 500);

  const { order, items: cartItems } = await Order.createPendingFromCart(clienteId);
  const backendBase = requireHttpsUrl(getBackendUrl(), 'BACKEND_URL');
  const preferenceClient = new Preference(getMercadoPagoClient());
  const preferencePayload = {
    items: buildPreferenceItems(cartItems),
    external_reference: String(order.id),
    auto_return: 'approved',
    back_urls: buildReturnUrls(order.id, requestOrigin),
    notification_url: `${backendBase}/api/webhook`,
    metadata: {
      order_id: order.id,
      user_id: clienteId,
      checkout_nonce: order.checkout_nonce
    }
  };

  if (payerEmail) preferencePayload.payer = { email: payerEmail };

  try {
    const response = await preferenceClient.create({
      body: preferencePayload,
      requestOptions: { idempotencyKey: `papelaria-order-${order.id}` }
    });
    const preference = response?.response ?? response?.body ?? response;
    const preferenceId = preference?.id || preference?.body?.id;

    if (!preferenceId || !preference?.init_point) {
      throw formatError('Nao foi possivel criar a preferencia de pagamento.', 502);
    }

    const updatedOrder = await Order.setPreference(order.id, preferenceId);
    return {
      order: updatedOrder,
      preference: {
        id: preferenceId,
        init_point: preference.init_point
      }
    };
  } catch (error) {
    await Order.markPreferenceFailure(order.id, error.message);
    throw error;
  }
}

async function consultarPagamento(paymentId) {
  if (!paymentId) throw formatError('ID do pagamento ausente.', 400);
  if (!accessToken) throw formatError('MERCADO_PAGO_ACCESS_TOKEN nao configurado.', 500);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw formatError(`Falha ao consultar o pagamento no Mercado Pago (${response.status}).`, 502);
  }

  return response.json();
}

async function atualizarPedidoComPagamento({ payment }) {
  const paymentId = payment?.id ? String(payment.id) : '';
  const externalReference = payment?.external_reference ? String(payment.external_reference) : '';
  const preferenceId = payment?.preference_id ? String(payment.preference_id) : '';
  const checkoutNonce = String(payment?.metadata?.checkout_nonce || '');
  const currency = String(payment?.currency_id || '').toUpperCase();
  const amount = Number(payment?.transaction_amount);
  const liveMode = payment?.live_mode;
  const paymentStatus = normalizePaymentStatus(payment?.status);

  if (!paymentId || !/^\d+$/.test(externalReference)) {
    throw formatError('Pagamento sem identificacao valida do pedido.', 422);
  }

  const order = await Order.findById(Number(externalReference));
  if (!order) throw formatError('Pedido correspondente nao encontrado.', 404);
  if (!order.checkout_nonce || checkoutNonce !== order.checkout_nonce) {
    throw formatError('Identificador seguro do checkout nao corresponde ao pedido.', 422);
  }
  if (preferenceId && order.preference_id !== preferenceId) {
    throw formatError('A preferencia do pagamento nao corresponde ao pedido.', 422);
  }

  const paymentOwner = await Order.findByPaymentId(paymentId);
  if (paymentOwner && paymentOwner.id !== order.id) {
    throw formatError('Pagamento ja associado a outro pedido.', 409);
  }

  if (currency !== 'BRL') throw formatError('Moeda do pagamento invalida.', 422);
  if (toCents(amount) !== toCents(order.total)) {
    throw formatError('Valor do pagamento nao corresponde ao total do pedido.', 422);
  }
  if (typeof liveMode !== 'boolean') throw formatError('Ambiente do pagamento nao informado.', 422);

  const expectedLiveMode = environment === 'production';
  if (liveMode !== expectedLiveMode) {
    console.warn('Pagamento com live_mode diferente do ambiente operacional:', {
      paymentId,
      configuredEnvironment: environment,
      paymentLiveMode: liveMode
    });
  }

  return Order.applyPayment(order.id, {
    id: paymentId,
    status: paymentStatus,
    amount,
    currency,
    liveMode
  });
}

module.exports = {
  criarPreferencia,
  consultarPagamento,
  atualizarPedidoComPagamento,
  normalizePaymentStatus,
  toCents
};
