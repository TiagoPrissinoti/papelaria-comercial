let Preference = null;

try {
  ({ Preference } = require('mercadopago'));
} catch {
  Preference = null;
}
const Pedido = require('../src/models/Pedido');
const Product = require('../src/models/Product');
const { accessToken, getMercadoPagoClient, getFrontendUrl, getBackendUrl } = require('../config/mercadoPago');

const allowedStatuses = new Set(['approved', 'pending', 'rejected', 'cancelled', 'refunded']);

function formatError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function normalizeProducts(produtos) {
  if (!Array.isArray(produtos) || !produtos.length) {
    throw formatError('Envie ao menos um produto.', 400);
  }

  return produtos.map((produto, index) => {
    const id = Number.parseInt(produto?.id, 10);
    const titulo = String(produto?.titulo || '').trim();
    const quantidade = normalizeQuantity(produto?.quantidade);
    const preco = Number(produto?.preco);

    if (!Number.isFinite(id) || id <= 0) {
      throw formatError(`Produto inválido na posição ${index + 1}.`, 400);
    }
    if (!titulo) {
      throw formatError(`Título inválido para o produto ${id}.`, 400);
    }
    if (!quantidade) {
      throw formatError(`Quantidade inválida para o produto ${id}.`, 400);
    }
    if (!Number.isFinite(preco) || preco < 0) {
      throw formatError(`Preço inválido para o produto ${id}.`, 400);
    }

    return { id, titulo, quantidade, preco };
  });
}

function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  const normalized = String(status).toLowerCase();
  if (allowedStatuses.has(normalized)) return normalized;
  if (normalized === 'in_process' || normalized === 'authorized') return 'pending';
  if (normalized === 'charged_back') return 'refunded';
  return 'rejected';
}

function buildReturnUrls(pedidoId, requestOrigin) {
  const frontendBase = process.env.NODE_ENV !== 'production' && requestOrigin
    ? requestOrigin.replace(/\/$/, '')
    : getFrontendUrl();
  if (!/^https:\/\//i.test(frontendBase)) {
    throw formatError(
      'Mercado Pago exige FRONTEND_URL com HTTPS publico para back_urls. Configure um dominio seguro (ou tunel HTTPS como ngrok) no backend/.env e tente novamente.',
      400
    );
  }
  const query = `pedido_id=${pedidoId}`;
  return {
    success: `${frontendBase}/checkout?payment_status=approved&${query}`,
    pending: `${frontendBase}/checkout?payment_status=pending&${query}`,
    failure: `${frontendBase}/checkout?payment_status=rejected&${query}`
  };
}

async function buildPreferenceItems(produtos) {
  const sanitized = [];

  for (const produto of produtos) {
    const product = await Product.findById(produto.id, { includeInactive: true });
    if (!product || !product.is_active) {
      throw formatError(`Produto ${produto.id} não encontrado.`, 404);
    }
    if (produto.quantidade > Number(product.stock || 0)) {
      throw formatError(`Estoque insuficiente para ${product.name}.`, 400);
    }

    sanitized.push({
      id: String(product.id),
      title: product.name,
      description: product.description || produto.titulo,
      quantity: produto.quantidade,
      currency_id: 'BRL',
      unit_price: Number(product.price)
    });
  }

  return sanitized;
}

async function criarPreferencia({ clienteId, produtos, requestOrigin }) {
  if (!Preference) {
    throw formatError('A SDK mercadopago nao esta instalada no backend.', 500);
  }

  const normalizedProducts = normalizeProducts(produtos);
  const items = await buildPreferenceItems(normalizedProducts);
  const total = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const backendBase = getBackendUrl();

  const pedido = await Pedido.create({
    clienteId,
    valorTotal: total,
    status: 'pending'
  });

  const preferenceClient = new Preference(getMercadoPagoClient());
  const preferencePayload = {
    items,
    external_reference: String(pedido.id),
    auto_return: 'approved',
    back_urls: buildReturnUrls(pedido.id, requestOrigin),
    notification_url: `${backendBase}/api/webhook`,
    metadata: {
      pedido_id: pedido.id,
      cliente_id: clienteId
    }
  };

  const response = await preferenceClient.create({ body: preferencePayload });
  const preference = response?.response ?? response?.body ?? response;
  const preferenceId = preference?.id || preference?.body?.id;

  if (!preferenceId) {
    throw formatError('Nao foi possivel criar a preferencia de pagamento.', 502);
  }

  const pedidoAtualizado = await Pedido.updateById(pedido.id, {
    preferenceId,
    status: pedido.status
  });

  return {
    pedido: pedidoAtualizado || pedido,
    preference: {
      id: preferenceId,
      init_point: preference.init_point || preference?.body?.init_point,
      sandbox_init_point: preference.sandbox_init_point || preference?.body?.sandbox_init_point
    }
  };
}

async function consultarPagamento(paymentId) {
  if (!paymentId) {
    throw formatError('ID do pagamento ausente.', 400);
  }
  if (!accessToken) {
    throw formatError('MERCADO_PAGO_ACCESS_TOKEN nao configurado.', 500);
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw formatError('Falha ao consultar o pagamento no Mercado Pago.', 502);
  }

  return response.json();
}

async function atualizarPedidoComPagamento({ payment }) {
  const paymentStatus = normalizePaymentStatus(payment?.status);
  const paymentId = payment?.id ? String(payment.id) : null;
  const preferenceId = payment?.preference_id ? String(payment.preference_id) : null;
  const externalReference = payment?.external_reference ? String(payment.external_reference) : null;

  let pedido = null;
  if (externalReference && /^\d+$/.test(externalReference)) {
    pedido = await Pedido.findById(Number(externalReference));
  }
  if (!pedido && preferenceId) {
    pedido = await Pedido.findByPreferenceId(preferenceId);
  }
  if (!pedido && paymentId) {
    pedido = await Pedido.findByPaymentId(paymentId);
  }

  if (!pedido) {
    throw formatError('Pedido correspondente nao encontrado.', 404);
  }

  return Pedido.updateById(pedido.id, {
    paymentId: paymentId || pedido.payment_id,
    preferenceId: preferenceId || pedido.preference_id,
    status: paymentStatus
  });
}

module.exports = {
  criarPreferencia,
  consultarPagamento,
  atualizarPedidoComPagamento,
  normalizePaymentStatus
};
