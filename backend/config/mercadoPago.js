let MercadoPagoConfig = null;

try {
  ({ MercadoPagoConfig } = require('mercadopago'));
} catch {
  MercadoPagoConfig = null;
}

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
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

module.exports = {
  accessToken,
  webhookSecret,
  getMercadoPagoClient,
  getFrontendUrl,
  getBackendUrl
};
