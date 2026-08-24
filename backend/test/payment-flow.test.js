const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebhookSignatureValidator } = require('mercadopago');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'papelaria-payment-'));
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(testDir, 'database.sqlite');
process.env.MERCADO_PAGO_ENVIRONMENT = 'test';

const app = require('../app');
const { getDb } = require('../src/database/connection');
const Order = require('../src/models/Order');
const AuthService = require('../src/services/AuthService');
const {
  atualizarPedidoComPagamento,
  normalizePaymentStatus,
  toCents
} = require('../services/mercadoPagoService');

after(async () => {
  const db = await getDb();
  await db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});

test('normaliza valores monetarios e status do Mercado Pago', () => {
  assert.equal(toCents(29.9), 2990);
  assert.equal(toCents('29.90'), 2990);
  assert.equal(normalizePaymentStatus('in_process'), 'pending');
  assert.equal(normalizePaymentStatus('charged_back'), 'refunded');
});

test('assinatura sem data.id na URL omite o ID do corpo no HMAC', () => {
  const secret = 'segredo-de-teste';
  const requestId = 'request-123';
  const timestamp = '1742505638683';
  const manifest = `request-id:${requestId};ts:${timestamp};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  assert.doesNotThrow(() => WebhookSignatureValidator.validate({
    xSignature: `ts=${timestamp},v1=${hash}`,
    xRequestId: requestId,
    dataId: undefined,
    secret
  }));
});

test('cadastro publico nunca permite criar administrador', async () => {
  await app.initializeApp();
  const user = await AuthService.register({
    name: 'Cliente Seguro',
    email: 'novo-cliente@teste.local',
    password: 'senha-segura',
    role: 'admin'
  });
  assert.equal(user.role, 'client');
});

test('sessao usa cookie HttpOnly e recarrega permissoes no servidor', async () => {
  await app.initializeApp();
  const credentials = {
    name: 'Cliente Cookie',
    email: 'cliente-cookie@teste.local',
    password: 'senha-cookie-segura'
  };
  const createdUser = await AuthService.register(credentials);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });
    assert.equal(loginResponse.status, 200);

    const loginBody = await loginResponse.json();
    assert.equal(loginBody.token, undefined);
    assert.equal(loginBody.user.id, createdUser.id);

    const setCookie = loginResponse.headers.get('set-cookie');
    assert.match(setCookie, /^papelaria_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\/api/i);
    const cookie = setCookie.split(';')[0];

    const db = await getDb();
    await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [createdUser.id]);

    const meResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookie }
    });
    assert.equal(meResponse.status, 200);
    const meBody = await meResponse.json();
    assert.equal(meBody.user.role, 'admin');
    assert.equal(meBody.user.password, undefined);

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie }
    });
    assert.equal(logoutResponse.status, 204);
    assert.match(logoutResponse.headers.get('set-cookie'), /papelaria_session=;/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('pagamento aprovado atualiza o pedido e baixa estoque apenas uma vez', async () => {
  await app.initializeApp();
  const db = await getDb();
  const user = await db.run(
    `INSERT INTO users (name, email, password, role) VALUES ('Cliente', 'cliente@teste.local', 'hash', 'client')`
  );
  const product = await db.run(
    `INSERT INTO products (name, description, price, cost_price, stock, images)
     VALUES ('Caderno', 'Caderno teste', 12.50, 7, 5, '[]')`
  );
  await db.run(
    `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 2)`,
    [user.lastID, product.lastID]
  );

  const { order } = await Order.createPendingFromCart(user.lastID);
  await Order.setPreference(order.id, 'PREF-TESTE');

  const payment = {
    id: 987654,
    status: 'approved',
    external_reference: String(order.id),
    preference_id: 'PREF-TESTE',
    metadata: { checkout_nonce: order.checkout_nonce },
    currency_id: 'BRL',
    transaction_amount: 25,
    // Alguns fluxos de teste do Checkout Pro retornam live_mode=true mesmo
    // quando a notificacao aparece no painel de testes. As demais validacoes
    // vinculam o pagamento ao pedido sem depender desse sinal operacional.
    live_mode: true
  };

  const approved = await atualizarPedidoComPagamento({ payment });
  assert.equal(approved.status, 'pago');
  assert.equal(approved.payment_status, 'approved');
  assert.equal(approved.stock_deducted, 1);

  const afterFirstWebhook = await db.get('SELECT stock FROM products WHERE id = ?', [product.lastID]);
  assert.equal(afterFirstWebhook.stock, 3);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM cart WHERE user_id = ?', [user.lastID])).count, 0);

  await atualizarPedidoComPagamento({ payment });
  const afterDuplicateWebhook = await db.get('SELECT stock FROM products WHERE id = ?', [product.lastID]);
  assert.equal(afterDuplicateWebhook.stock, 3);
});
