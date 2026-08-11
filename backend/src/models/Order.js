const { getDb, withTransaction } = require('../database/connection');
const { randomUUID } = require('crypto');

class Order {
  static async createPendingFromCart(userId) {
    const result = await withTransaction(async (db) => {
      const items = await db.all(
        `SELECT c.product_id, c.quantity, p.name, p.description, p.price, p.cost_price, p.stock, p.is_active
         FROM cart c
         INNER JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ?`,
        [userId]
      );

      if (!items.length) {
        const error = new Error('Carrinho vazio');
        error.status = 400;
        throw error;
      }

      for (const item of items) {
        if (!item.is_active) {
          const error = new Error(`Produto ${item.name} nao esta mais disponivel`);
          error.status = 400;
          throw error;
        }
        if (item.quantity > item.stock) {
          const error = new Error(`Estoque insuficiente para ${item.name}`);
          error.status = 400;
          throw error;
        }
      }

      const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const checkoutNonce = randomUUID();
      const insertResult = await db.run(
        `INSERT INTO orders (user_id, total, status, payment_status, checkout_nonce)
         VALUES (?, ?, 'pendente', 'pending', ?)`,
        [userId, total, checkoutNonce]
      );

      for (const item of items) {
        await db.run(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, cost_price)
           VALUES (?, ?, ?, ?, ?)`,
          [insertResult.lastID, item.product_id, item.quantity, item.price, Number(item.cost_price || 0)]
        );
      }

      return { orderId: insertResult.lastID, items };
    });
    return { order: await this.findById(result.orderId), items: result.items };
  }

  static async findByUser(userId) {
    const db = await getDb();
    const orders = await db.all(
      'SELECT * FROM orders WHERE user_id = ? AND hidden_by_user = 0 ORDER BY created_at DESC',
      [userId]
    );

    for (const order of orders) {
      order.items = await this.findItems(order.id);
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

  static async findByPreferenceId(preferenceId) {
    const db = await getDb();
    return db.get('SELECT * FROM orders WHERE preference_id = ?', [preferenceId]);
  }

  static async findByPaymentId(paymentId) {
    const db = await getDb();
    return db.get('SELECT * FROM orders WHERE payment_id = ?', [paymentId]);
  }

  static async findItems(orderId) {
    const db = await getDb();
    return db.all(
      `SELECT oi.*, p.name, p.image, p.stock
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
  }

  static async setPreference(orderId, preferenceId) {
    const db = await getDb();
    await db.run(
      `UPDATE orders SET preference_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [preferenceId, orderId]
    );
    return this.findById(orderId);
  }

  static async markPreferenceFailure(orderId, message) {
    const db = await getDb();
    await db.run(
      `UPDATE orders
       SET payment_status = 'cancelled', fulfillment_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND payment_status = 'pending'`,
      [String(message || 'Falha ao criar preferencia de pagamento').slice(0, 500), orderId]
    );
  }

  static async applyPayment(orderId, payment) {
    await withTransaction(async (db) => {
      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order) {
        const error = new Error('Pedido correspondente nao encontrado');
        error.status = 404;
        throw error;
      }

      const paymentId = String(payment.id);
      const paymentStatus = payment.status;
      const alreadyApproved = order.payment_status === 'approved';

      if (alreadyApproved && paymentStatus !== 'refunded') {
        return;
      }

      if (paymentStatus === 'refunded' && order.payment_id && order.payment_id !== paymentId) {
        return;
      }

      let stockDeducted = order.stock_deducted;
      let fulfillmentError = order.fulfillment_error;

      if (paymentStatus === 'approved' && !stockDeducted) {
        const items = await db.all(
          `SELECT oi.product_id, oi.quantity, p.name, p.stock
           FROM order_items oi
           INNER JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = ?`,
          [orderId]
        );
        const unavailable = items.find((item) => item.quantity > item.stock);

        if (unavailable) {
          fulfillmentError = `Pagamento aprovado, mas estoque insuficiente para ${unavailable.name}`;
        } else {
          for (const item of items) {
            await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
          }
          await db.run('DELETE FROM cart WHERE user_id = ?', [order.user_id]);
          stockDeducted = 1;
          fulfillmentError = null;
        }
      }

      const operationalStatus = paymentStatus === 'approved' ? 'pago' : order.status;
      const paidAt = paymentStatus === 'approved' ? (order.paid_at || new Date().toISOString()) : order.paid_at;

      await db.run(
        `UPDATE orders
         SET status = ?, payment_status = ?, payment_id = ?, payment_amount = ?, payment_currency = ?,
             payment_live_mode = ?, stock_deducted = ?, fulfillment_error = ?, paid_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          operationalStatus,
          paymentStatus,
          paymentId,
          payment.amount,
          payment.currency,
          payment.liveMode ? 1 : 0,
          stockDeducted,
          fulfillmentError,
          paidAt,
          orderId
        ]
      );

    });
    return this.findById(orderId);
  }

  static async updateStatus(orderId, status) {
    const db = await getDb();
    await db.run(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, orderId]
    );
    return this.findById(orderId);
  }

  static async hideByUser(orderId, userId) {
    const db = await getDb();
    await db.run('UPDATE orders SET hidden_by_user = 1 WHERE id = ? AND user_id = ?', [orderId, userId]);
  }
}

module.exports = Order;
