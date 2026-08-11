let MercadoPagoConfig = null;

try {
  ({ MercadoPagoConfig } = require('mercadopago'));
} catch {
  MercadoPagoConfig = null;
}

const accessToken = String(process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
const webhookSecret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
const environment = String(process.env.MERCADO_PAGO_ENVIRONMENT || 'test').trim().toLowerCase();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3333';

let client;

function getMercadoPagoClient() {
  if (!accessToken) {
    const error = new Error('MERCADO_PAGO_ACCESS_TOKEN nao configurado no ambiente do backend.');
    error.statusCode = 500;
    throw error;
  }
  if (!MercadoPagoConfig) {
    const error = new Error('A SDK mercadopago nao esta instalada. Execute npm install no backend e depois reinicie o servidor.');
    error.statusCode = 500;
    throw error;
  }

  if (!client) {
    client = new MercadoPagoConfig({ accessToken });
  }

  return client;
}

function getFrontendUrl() {
  return frontendUrl.replace(/\/$/, '');
}

function getBackendUrl() {
  return backendUrl.replace(/\/$/, '');
}

function validateMercadoPagoConfig() {
  if (!['test', 'production'].includes(environment)) {
    throw new Error('MERCADO_PAGO_ENVIRONMENT deve ser test ou production.');
  }

  if (process.env.NODE_ENV !== 'production') return;

  if (!accessToken) throw new Error('Defina MERCADO_PAGO_ACCESS_TOKEN em producao.');
  if (!webhookSecret) throw new Error('Defina MERCADO_PAGO_WEBHOOK_SECRET em producao.');
  if (!/^https:\/\//i.test(getFrontendUrl())) throw new Error('FRONTEND_URL deve usar HTTPS em producao.');
  if (!/^https:\/\//i.test(getBackendUrl())) throw new Error('BACKEND_URL deve usar HTTPS em producao.');
}

module.exports = {
  accessToken,
  webhookSecret,
  environment,
  getMercadoPagoClient,
  getFrontendUrl,
  getBackendUrl,
  validateMercadoPagoConfig
};
