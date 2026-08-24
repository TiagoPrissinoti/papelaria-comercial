const { Router } = require('express');
const { authMiddleware, isAdmin } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { getDb, withTransaction } = require('../database/connection');
const allowBodyFields = require('../middlewares/allowBodyFields');

const router = Router();

router.use(authMiddleware, isAdmin);

router.get('/users', asyncHandler(async (req, res) => {
  const { q = '', role = '' } = req.query;
  const users = await User.findAll({ q: String(q || ''), role: String(role || '') });
  res.json(users);
}));

router.put('/users/:id', allowBodyFields('name', 'email', 'role'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw new AppError('Usuario invalido', 400);

  if (id === req.user.id && req.body.role === 'client') {
    throw new AppError('Voce nao pode remover seu proprio acesso admin', 400);
  }

  const updated = await User.update(id, {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role
  });
  if (!updated) throw new AppError('Usuario nao encontrado', 404);
  res.json(updated);
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw new AppError('Usuario invalido', 400);
  if (id === req.user.id) throw new AppError('Voce nao pode excluir seu proprio usuario', 400);
  await User.remove(id);
  res.status(204).send();
}));

router.get('/reports/summary', asyncHandler(async (req, res) => {
  const [users, products, orders] = await Promise.all([
    User.findAll(),
    Product.findAll({ includeInactive: true }),
    Order.findAll()
  ]);
  const db = await getDb();
  const financial = await db.get(
    `SELECT
      COALESCE(SUM(quantity * unit_price), 0) AS gross_revenue,
      COALESCE(SUM(quantity * cost_price), 0) AS total_cost,
      COALESCE(SUM(quantity * (unit_price - cost_price)), 0) AS total_profit
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE o.payment_status = 'approved'`
  );

  const totalRevenue = Number(financial?.gross_revenue || 0);
  const totalCost = Number(financial?.total_cost || 0);
  const totalProfit = Number(financial?.total_profit || 0);
  const recentOrders = orders.slice(0, 8);
  const salesByStatus = orders.reduce((acc, order) => {
    const key = order.status || 'pendente';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totals: {
      users: users.length,
      products: products.length,
      orders: orders.length,
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit
    },
    recentOrders,
    salesByStatus
  });
}));

router.get('/reports/export.csv', asyncHandler(async (req, res) => {
  const kind = String(req.query.kind || 'sales');
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;

  if (kind === 'users') {
    const users = await User.findAll();
    const lines = ['id,nome,email,perfil,criado_em'];
    for (const user of users) {
      lines.push(`${user.id},"${user.name}","${user.email}",${user.role},"${user.created_at}"`);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
    return res.send(lines.join('\n'));
  }

  const orders = await Order.findAll();
  const db = await getDb();
  const rows = await db.all(
    `SELECT o.id, COALESCE(SUM(oi.quantity * (oi.unit_price - oi.cost_price)), 0) AS profit
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.payment_status = 'approved'
     GROUP BY o.id`
  );
  const profitByOrderId = new Map(rows.map((row) => [row.id, Number(row.profit || 0)]));
  const filtered = orders.filter((order) => {
    if (order.payment_status !== 'approved') return false;
    const createdAt = new Date(order.created_at);
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  });

  const lines = ['id,codigo_pedido,cliente,email,total,lucro,status,criado_em'];
  for (const order of filtered) {
    lines.push(
      `${order.id},"GFL-${order.id}","${order.user_name}","${order.user_email}",${Number(order.total).toFixed(2)},${Number(profitByOrderId.get(order.id) || 0).toFixed(2)},${order.status},"${order.created_at}"`
    );
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="vendas.csv"');
  return res.send(lines.join('\n'));
}));

router.delete('/reset-store-data', asyncHandler(async (_req, res) => {
  await withTransaction(async (db) => {
    await db.exec(`
    DELETE FROM review_reports;
    DELETE FROM review_likes;
    DELETE FROM review_images;
    DELETE FROM reviews;
    DELETE FROM cart;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM pedidos;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM sqlite_sequence WHERE name IN (
      'review_reports', 'review_likes', 'review_images', 'reviews',
      'cart', 'order_items', 'orders', 'pedidos', 'products', 'categories'
    );
    `);
  });
  res.status(204).send();
}));

module.exports = router;
