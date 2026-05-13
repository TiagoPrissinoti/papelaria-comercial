const { getDb } = require('../database/connection');

class Order {
  static async create({ userId, total }) {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
      [userId, total, 'pendente']
    );
    return result.lastID;
  }

  static async addItem({ orderId, productId, quantity, unitPrice, costPrice }) {
    const db = await getDb();
    await db.run(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, cost_price)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, productId, quantity, unitPrice, costPrice]
    );
  }

  static async findByUser(userId) {
    const db = await getDb();
    const orders = await db.all(
      'SELECT * FROM orders WHERE user_id = ? AND hidden_by_user = 0 ORDER BY created_at DESC',
      [userId]
    );

    for (const order of orders) {
      order.items = await db.all(
        `SELECT oi.*, p.name, p.image
         FROM order_items oi
         INNER JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
    }

    return orders;
  }

  static async findAll() {
    const db = await getDb();
    return db.all(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       INNER JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );
  }

  static async findById(orderId) {
    const db = await getDb();
    return db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  }

  static async updateStatus(orderId, status) {
    const db = await getDb();
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    return this.findById(orderId);
  }

  static async hideByUser(orderId, userId) {
    const db = await getDb();
    await db.run('UPDATE orders SET hidden_by_user = 1 WHERE id = ? AND user_id = ?', [orderId, userId]);
  }
}

module.exports = Order;
