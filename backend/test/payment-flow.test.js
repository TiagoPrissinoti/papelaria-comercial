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
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST_TOKEN';

const app = require('../app');
const { getDb } = require('../src/database/connection');
const Order = require('../src/models/Order');
const Address = require('../src/models/Address');
const AuthService = require('../src/services/AuthService');
const {
  atualizarPedidoComPagamento,
  normalizePaymentStatus,
  toCents
} = require('../services/mercadoPagoService');

async function createTestAddress(userId) {
  return Address.create(userId, {
    label: 'Casa', recipient_name: 'Cliente Teste', phone: '11999999999',
    postal_code: '01001000', street: 'Praca da Se', number: '1', complement: '',
    neighborhood: 'Se', city: 'Sao Paulo', state: 'SP', is_default: true
  });
}

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

test('rotas rejeitam campos fora da allowlist contra mass assignment', async () => {
  await app.initializeApp();
  const db = await getDb();
  const adminCredentials = {
    name: 'Admin Allowlist',
    email: 'admin-allowlist@teste.local',
    password: 'senha-admin-allowlist'
  };
  const admin = await AuthService.register(adminCredentials);
  await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [admin.id]);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const forbiddenEmail = 'mass-assignment@teste.local';
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tentativa Admin',
        email: forbiddenEmail,
        password: 'senha-segura',
        role: 'admin'
      })
    });
    assert.equal(registerResponse.status, 400);
    assert.match((await registerResponse.json()).message, /Campos nao permitidos: role/);
    assert.equal(await db.get('SELECT id FROM users WHERE email = ?', [forbiddenEmail]), undefined);

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminCredentials.email, password: adminCredentials.password })
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get('set-cookie').split(';')[0];

    const productResponse = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Produto Mass Assignment',
        description: 'Nao deve ser criado',
        price: 10,
        costPrice: 5,
        stock: 1,
        categoryId: null,
        is_active: 0
      })
    });
    assert.equal(productResponse.status, 400);
    assert.match((await productResponse.json()).message, /Campos nao permitidos: is_active/);
    assert.equal(
      await db.get("SELECT id FROM products WHERE name = 'Produto Mass Assignment'"),
      undefined
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('somente administrador pode editar produto', async () => {
  await app.initializeApp();
  const db = await getDb();
  const adminCredentials = {
    name: 'Admin Editor',
    email: 'admin-editor@teste.local',
    password: 'senha-admin-editor'
  };
  const clientCredentials = {
    name: 'Cliente Sem Edicao',
    email: 'cliente-sem-edicao@teste.local',
    password: 'senha-cliente-editor'
  };
  const admin = await AuthService.register(adminCredentials);
  await AuthService.register(clientCredentials);
  await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [admin.id]);
  const product = await db.run(
    `INSERT INTO products (name, description, price, cost_price, stock, images)
     VALUES ('Produto Original', 'Descricao original', 10, 5, 2, '[]')`
  );
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    async function login(credentials) {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      assert.equal(response.status, 200);
      return response.headers.get('set-cookie').split(';')[0];
    }

    const clientCookie = await login(clientCredentials);
    const forbiddenResponse = await fetch(`${baseUrl}/products/${product.lastID}`, {
      method: 'PUT',
      headers: { Cookie: clientCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alteracao Indevida' })
    });
    assert.equal(forbiddenResponse.status, 403);
    assert.equal((await db.get('SELECT name FROM products WHERE id = ?', [product.lastID])).name, 'Produto Original');

    const adminCookie = await login(adminCredentials);
    const updatedResponse = await fetch(`${baseUrl}/products/${product.lastID}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Produto Editado', price: 12.5, stock: 4 })
    });
    assert.equal(updatedResponse.status, 200);
    const updated = await updatedResponse.json();
    assert.equal(updated.name, 'Produto Editado');
    assert.equal(updated.price, 12.5);
    assert.equal(updated.stock, 4);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
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

  const address = await createTestAddress(user.lastID);
  const { order } = await Order.createPendingFromCart(user.lastID, address.id);
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

test('reserva atomica impede vender a mesma ultima unidade para dois checkouts', async () => {
  await app.initializeApp();
  const db = await getDb();
  const first = await AuthService.register({
    name: 'Cliente Reserva Um',
    email: 'reserva-um@teste.local',
    password: 'senha-reserva-um'
  });
  const second = await AuthService.register({
    name: 'Cliente Reserva Dois',
    email: 'reserva-dois@teste.local',
    password: 'senha-reserva-dois'
  });
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Ultima unidade', 15, 5, 1, '[]')`
  );
  await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [first.id, product.lastID]);
  await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [second.id, product.lastID]);

  const firstAddress = await createTestAddress(first.id);
  const secondAddress = await createTestAddress(second.id);
  const firstCheckout = await Order.createPendingFromCart(first.id, firstAddress.id);
  await assert.rejects(() => Order.createPendingFromCart(second.id, secondAddress.id), /Estoque insuficiente/);

  assert.equal(firstCheckout.order.inventory_reserved, 1);
  assert.equal(firstCheckout.order.stock_deducted, 0);
  assert.equal((await db.get('SELECT stock FROM products WHERE id = ?', [product.lastID])).stock, 0);
});

test('pedido exige endereco do proprio cliente e preserva os dados da entrega', async () => {
  await app.initializeApp();
  const db = await getDb();
  const owner = await AuthService.register({
    name: 'Cliente Endereco', email: 'cliente-endereco@teste.local', password: 'senha-endereco'
  });
  const other = await AuthService.register({
    name: 'Outro Cliente', email: 'outro-endereco@teste.local', password: 'senha-outro-endereco'
  });
  const address = await createTestAddress(owner.id);
  const foreignAddress = await createTestAddress(other.id);
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Produto com entrega', 18, 7, 2, '[]')`
  );
  await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [owner.id, product.lastID]);

  await assert.rejects(
    () => Order.createPendingFromCart(owner.id, foreignAddress.id),
    /Endereco de entrega nao encontrado/
  );

  const { order } = await Order.createPendingFromCart(owner.id, address.id);
  const snapshot = JSON.parse(order.shipping_address_json);
  assert.equal(snapshot.street, 'Praca da Se');
  assert.equal(snapshot.id, undefined);

  await db.run("UPDATE addresses SET street = 'Rua alterada' WHERE id = ?", [address.id]);
  const persistedOrder = await Order.findById(order.id);
  assert.equal(JSON.parse(persistedOrder.shipping_address_json).street, 'Praca da Se');
});

test('reembolso muda o status operacional e devolve o estoque uma unica vez', async () => {
  await app.initializeApp();
  const db = await getDb();
  const user = await AuthService.register({
    name: 'Cliente Reembolso',
    email: 'reembolso@teste.local',
    password: 'senha-reembolso'
  });
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Produto reembolsavel', 22, 9, 2, '[]')`
  );
  await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [user.id, product.lastID]);
  const address = await createTestAddress(user.id);
  const { order } = await Order.createPendingFromCart(user.id, address.id);
  await Order.setPreference(order.id, 'PREF-REFUND');
  const payment = {
    id: 555001,
    external_reference: String(order.id),
    preference_id: 'PREF-REFUND',
    metadata: { checkout_nonce: order.checkout_nonce },
    currency_id: 'BRL',
    transaction_amount: 22,
    live_mode: false
  };

  await atualizarPedidoComPagamento({ payment: { ...payment, status: 'approved' } });
  const refunded = await atualizarPedidoComPagamento({ payment: { ...payment, status: 'refunded' } });
  await atualizarPedidoComPagamento({ payment: { ...payment, status: 'refunded' } });

  assert.equal(refunded.status, 'reembolsado');
  assert.equal(refunded.payment_status, 'refunded');
  assert.equal(refunded.stock_deducted, 0);
  assert.equal(refunded.inventory_reserved, 0);
  assert.equal((await db.get('SELECT stock FROM products WHERE id = ?', [product.lastID])).stock, 2);
});

test('pagamento tardio sem estoque recebe reembolso integral automatico', async () => {
  await app.initializeApp();
  const db = await getDb();
  const user = await AuthService.register({
    name: 'Cliente Reembolso Automatico',
    email: 'reembolso-auto@teste.local',
    password: 'senha-reembolso-auto'
  });
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Produto esgotado', 30, 12, 0, '[]')`
  );
  const order = await db.run(
    `INSERT INTO orders (user_id, total, status, payment_status, checkout_nonce, preference_id)
     VALUES (?, 30, 'pendente', 'pending', 'nonce-auto-refund', 'PREF-AUTO-REFUND')`,
    [user.id]
  );
  await db.run(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price, cost_price)
     VALUES (?, ?, 1, 30, 12)`,
    [order.lastID, product.lastID]
  );

  const originalFetch = global.fetch;
  let refundRequest;
  global.fetch = async (url, options) => {
    refundRequest = { url: String(url), options };
    return { ok: true, status: 201, json: async () => ({ status: 'approved' }) };
  };
  try {
    const updated = await atualizarPedidoComPagamento({
      payment: {
        id: 555002,
        status: 'approved',
        external_reference: String(order.lastID),
        preference_id: 'PREF-AUTO-REFUND',
        metadata: { checkout_nonce: 'nonce-auto-refund' },
        currency_id: 'BRL',
        transaction_amount: 30,
        live_mode: false
      }
    });
    assert.equal(updated.status, 'reembolsado');
    assert.equal(updated.payment_status, 'refunded');
    assert.match(refundRequest.url, /\/v1\/payments\/555002\/refunds$/);
    assert.equal(refundRequest.options.method, 'POST');
    assert.equal(refundRequest.options.headers['X-Idempotency-Key'], 'papelaria-refund-555002');
  } finally {
    global.fetch = originalFetch;
  }
});

test('reconciliacao valida o pedido antes de aplicar pagamento de outro usuario', async () => {
  await app.initializeApp();
  const db = await getDb();
  const attackerCredentials = {
    name: 'Cliente Reconciliacao',
    email: 'reconciliacao@teste.local',
    password: 'senha-reconciliacao'
  };
  const victimCredentials = {
    name: 'Cliente Alvo',
    email: 'alvo-reconciliacao@teste.local',
    password: 'senha-alvo-reconciliacao'
  };
  const attacker = await AuthService.register(attackerCredentials);
  const victim = await AuthService.register(victimCredentials);
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Produto conciliado', 40, 15, 2, '[]')`
  );
  for (const userId of [attacker.id, victim.id]) {
    await db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [userId, product.lastID]);
  }
  const attackerAddress = await createTestAddress(attacker.id);
  const victimAddress = await createTestAddress(victim.id);
  const attackerOrder = (await Order.createPendingFromCart(attacker.id, attackerAddress.id)).order;
  const victimOrder = (await Order.createPendingFromCart(victim.id, victimAddress.id)).order;
  await Order.setPreference(attackerOrder.id, 'PREF-ATTACKER');
  await Order.setPreference(victimOrder.id, 'PREF-VICTIM');

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const originalFetch = global.fetch;
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const loginResponse = await originalFetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: attackerCredentials.email, password: attackerCredentials.password })
    });
    const cookie = loginResponse.headers.get('set-cookie').split(';')[0];
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 555003,
        status: 'approved',
        external_reference: String(victimOrder.id),
        preference_id: 'PREF-VICTIM',
        metadata: { checkout_nonce: victimOrder.checkout_nonce },
        currency_id: 'BRL',
        transaction_amount: 40,
        live_mode: false
      })
    });

    const response = await originalFetch(`${baseUrl}/pagamento/pedidos/${attackerOrder.id}/reconciliar`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: '555003' })
    });
    assert.equal(response.status, 400);
    const unchangedVictimOrder = await Order.findById(victimOrder.id);
    assert.equal(unchangedVictimOrder.payment_status, 'pending');
    assert.equal(unchangedVictimOrder.stock_deducted, 0);
    assert.equal(unchangedVictimOrder.inventory_reserved, 1);
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('relatorio administrativo trata nomes de usuarios apenas como texto', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'frontend', 'src', 'pages', 'AdminPage.jsx'),
    'utf8'
  );
  assert.match(source, /cell\.textContent = String\(value \?\? ''\)/);
  assert.doesNotMatch(source, /document\.write\([^;]*user_name/s);
});

test('reset administrativo remove avaliacoes e dependencias antes de reutilizar IDs', async () => {
  await app.initializeApp();
  const db = await getDb();
  const adminCredentials = {
    name: 'Admin Reset Seguro',
    email: 'admin-reset@teste.local',
    password: 'senha-admin-reset'
  };
  const admin = await AuthService.register(adminCredentials);
  await db.run("UPDATE users SET role = 'admin' WHERE id = ?", [admin.id]);
  const product = await db.run(
    `INSERT INTO products (name, price, cost_price, stock, images)
     VALUES ('Produto antigo', 10, 4, 1, '[]')`
  );
  const review = await db.run(
    `INSERT INTO reviews (user_id, product_id, rating, comment)
     VALUES (?, ?, 5, 'Avaliacao antiga')`,
    [admin.id, product.lastID]
  );
  await db.run('INSERT INTO review_images (review_id, image_path) VALUES (?, ?)', [review.lastID, '/uploads/antiga.png']);
  await db.run('INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)', [review.lastID, admin.id]);
  await db.run('INSERT INTO review_reports (review_id, user_id, reason) VALUES (?, ?, ?)', [review.lastID, admin.id, 'teste']);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminCredentials.email, password: adminCredentials.password })
    });
    const cookie = loginResponse.headers.get('set-cookie').split(';')[0];
    const response = await fetch(`${baseUrl}/admin/reset-store-data`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(response.status, 204);

    for (const table of ['review_reports', 'review_likes', 'review_images', 'reviews', 'cart', 'order_items', 'orders', 'pedidos', 'products', 'categories']) {
      const row = await db.get(`SELECT COUNT(*) AS total FROM ${table}`);
      assert.equal(row.total, 0, `A tabela ${table} deveria estar vazia`);
    }

    const reused = await db.run(
      `INSERT INTO products (name, price, cost_price, stock, images)
       VALUES ('Produto novo', 12, 5, 2, '[]')`
    );
    assert.equal(reused.lastID, 1);
    assert.equal((await db.get('SELECT COUNT(*) AS total FROM reviews WHERE product_id = 1')).total, 0);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
