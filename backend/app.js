const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const routes = require('./src/routes');
const errorHandler = require('./src/middlewares/errorHandler');
const { getDb } = require('./src/database/connection');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/api', routes);
app.use(errorHandler);

(async () => {
  const db = await getDb();
  const schema = fs.readFileSync(path.resolve(__dirname, 'src/database/schema.sql'), 'utf8');
  await db.exec(schema);

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
})();

module.exports = app;
