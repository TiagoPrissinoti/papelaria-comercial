const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const routes = require('./src/routes');
const errorHandler = require('./src/middlewares/errorHandler');
const { getDb } = require('./src/database/connection');
const { uploadDir, validateRuntimeConfig } = require('./src/config/env');
const { getFrontendUrl, validateMercadoPagoConfig } = require('./config/mercadoPago');

const app = express();
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');

app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production' || origin === getFrontendUrl()) {
      return callback(null, true);
    }
    const error = new Error('Origem nao permitida');
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use('/api', routes);

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

async function initializeApp() {
  validateRuntimeConfig();
  validateMercadoPagoConfig();
  fs.mkdirSync(uploadDir, { recursive: true });
  const db = await getDb();
  const schema = fs.readFileSync(path.resolve(__dirname, 'src/database/schema.sql'), 'utf8');
  await db.exec(schema);

  if (process.env.NODE_ENV === 'production') {
    const defaultAdminHash = '$2a$10$GR2lv3BXoXB0tGUzxoTGRuG7doCNxZFolA5Vc0VTpFN6I1XkNIr/e';
    const admin = await db.get('SELECT id, password FROM users WHERE id = 1');
    if (admin?.password === defaultAdminHash) {
      const adminPassword = String(process.env.ADMIN_PASSWORD || '');
      if (adminPassword.length < 12) {
        throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres antes de iniciar em producao.');
      }
      const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@papelaria.com').trim().toLowerCase();
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.run('UPDATE users SET email = ?, password = ? WHERE id = 1', [adminEmail, passwordHash]);
    }
  }

  const columns = await db.all("PRAGMA table_info(products)");
  const hasImages = columns.some((column) => column.name === 'images');
  const hasIsActive = columns.some((column) => column.name === 'is_active');
  const hasCostPrice = columns.some((column) => column.name === 'cost_price');
  if (!hasImages) {
    await db.exec("ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
  }
  if (!hasIsActive) {
    await db.exec("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
  }
  if (!hasCostPrice) {
    await db.exec('ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0');
  }

  const orderItemColumns = await db.all("PRAGMA table_info(order_items)");
  const hasOrderItemCostPrice = orderItemColumns.some((column) => column.name === 'cost_price');
  if (!hasOrderItemCostPrice) {
    await db.exec('ALTER TABLE order_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0');
  }

  const orderTable = await db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'");
  const orderSql = String(orderTable?.sql || '');
  const hasEmAndamentoStatus = orderSql.includes("'em_andamento'");
  if (!hasEmAndamentoStatus) {
    await db.exec('PRAGMA foreign_keys = OFF');
    await db.exec(`
      BEGIN TRANSACTION;
      ALTER TABLE orders RENAME TO orders_old;
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total REAL NOT NULL CHECK(total >= 0),
        status TEXT NOT NULL CHECK(status IN ('pendente', 'pago', 'em_andamento', 'enviado', 'entregue')) DEFAULT 'pendente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT INTO orders (id, user_id, total, status, created_at)
      SELECT id, user_id, total, status, created_at FROM orders_old;
      DROP TABLE orders_old;
      COMMIT;
    `);
    await db.exec('PRAGMA foreign_keys = ON');
  }
  const postRebuildOrderColumns = await db.all("PRAGMA table_info(orders)");
  if (!postRebuildOrderColumns.some((column) => column.name === 'hidden_by_user')) {
    await db.exec('ALTER TABLE orders ADD COLUMN hidden_by_user INTEGER NOT NULL DEFAULT 0 CHECK(hidden_by_user IN (0, 1))');
  }

  const refreshedOrderColumns = await db.all("PRAGMA table_info(orders)");
  const orderColumnNames = new Set(refreshedOrderColumns.map((column) => column.name));
  const orderMigrations = [
    ['payment_status', "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'"],
    ['payment_id', 'ALTER TABLE orders ADD COLUMN payment_id TEXT'],
    ['preference_id', 'ALTER TABLE orders ADD COLUMN preference_id TEXT'],
    ['checkout_nonce', 'ALTER TABLE orders ADD COLUMN checkout_nonce TEXT'],
    ['payment_amount', 'ALTER TABLE orders ADD COLUMN payment_amount REAL'],
    ['payment_currency', 'ALTER TABLE orders ADD COLUMN payment_currency TEXT'],
    ['payment_live_mode', 'ALTER TABLE orders ADD COLUMN payment_live_mode INTEGER'],
    ['stock_deducted', 'ALTER TABLE orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0'],
    ['fulfillment_error', 'ALTER TABLE orders ADD COLUMN fulfillment_error TEXT'],
    ['paid_at', 'ALTER TABLE orders ADD COLUMN paid_at DATETIME'],
    ['updated_at', 'ALTER TABLE orders ADD COLUMN updated_at DATETIME']
  ];
  for (const [column, sql] of orderMigrations) {
    if (!orderColumnNames.has(column)) await db.exec(sql);
  }
  await db.exec('UPDATE orders SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)');
  await db.exec(`
    UPDATE orders
    SET payment_status = 'approved', stock_deducted = 1, paid_at = COALESCE(paid_at, created_at)
    WHERE status <> 'pendente' AND payment_status = 'pending' AND preference_id IS NULL
  `);
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_preference_id ON orders(preference_id) WHERE preference_id IS NOT NULL');
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id) WHERE payment_id IS NOT NULL');
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_nonce ON orders(checkout_nonce) WHERE checkout_nonce IS NOT NULL');

  const orderItemsTable = await db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'order_items'");
  const orderItemsSql = String(orderItemsTable?.sql || '');
  const hasBrokenOrderFk = orderItemsSql.includes('REFERENCES "orders_old"') || orderItemsSql.includes("REFERENCES 'orders_old'");
  if (hasBrokenOrderFk) {
    await db.exec('PRAGMA foreign_keys = OFF');
    await db.exec(`
      BEGIN TRANSACTION;
      ALTER TABLE order_items RENAME TO order_items_old;
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        unit_price REAL NOT NULL CHECK(unit_price >= 0),
        cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );
      INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, cost_price)
      SELECT id, order_id, product_id, quantity, unit_price, cost_price FROM order_items_old;
      DROP TABLE order_items_old;
      COMMIT;
    `);
    await db.exec('PRAGMA foreign_keys = ON');
  }
}

module.exports = app;
module.exports.initializeApp = initializeApp;
