const { getDb, withTransaction } = require('../database/connection');
const { randomUUID } = require('crypto');

const RESERVATION_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

class Order {
  static async releaseReservation(db, order, reason) {
    if (!order?.inventory_reserved) return;
    const items = await db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await db.run(
      `UPDATE orders
       SET inventory_reserved = 0, reservation_expires_at = NULL, payment_status = 'cancelled',
           status = 'cancelado', fulfillment_error = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, order.id]
    );
  }

  static async releaseExpiredReservations(db) {
    const expired = await db.all(
      `SELECT * FROM orders
       WHERE inventory_reserved = 1 AND payment_status = 'pending'
         AND reservation_expires_at IS NOT NULL AND reservation_expires_at <= ?`,
      [new Date().toISOString()]
    );
    for (const order of expired) {
      await this.releaseReservation(db, order, 'Reserva de estoque expirada antes do pagamento');
    }
  }

  static async createPendingFromCart(userId, addressId) {
    const result = await withTransaction(async (db) => {
      await this.releaseExpiredReservations(db);
      if (!Number.isInteger(addressId) || addressId < 1) {
        const error = new Error('Selecione um endereco de entrega');
        error.status = 400;
        throw error;
      }
      const address = await db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
      if (!address) {
        const error = new Error('Endereco de entrega nao encontrado');
        error.status = 400;
        throw error;
      }
      const shippingAddress = {
        label: address.label,
        recipient_name: address.recipient_name,
        phone: address.phone,
        postal_code: address.postal_code,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state
      };
      const items = await db.all(
        `SELECT c.product_id, c.selected_color, c.quantity,
                p.name, p.description, p.price, p.cost_price, p.stock, p.is_active, p.colors
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
        let availableColors = [];
        try {
          availableColors = JSON.parse(item.colors || '[]');
        } catch {
          availableColors = [];
        }
        const colorIsValid = availableColors.some((color) => color === item.selected_color);
        if ((availableColors.length && !colorIsValid) || (!availableColors.length && item.selected_color)) {
          const error = new Error(`A cor selecionada para ${item.name} nao esta mais disponivel`);
          error.status = 400;
          throw error;
        }
      }

      const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const checkoutNonce = randomUUID();
      const reservationExpiresAt = new Date(Date.now() + RESERVATION_DURATION_MS).toISOString();

      for (const item of items) {
        const reserved = await db.run(
          `UPDATE products
           SET stock = stock - ?
           WHERE id = ? AND is_active = 1 AND stock >= ?`,
          [item.quantity, item.product_id, item.quantity]
        );
        if (reserved.changes !== 1) {
          const error = new Error(`Estoque insuficiente para ${item.name}`);
          error.status = 400;
          throw error;
        }
      }

      const insertResult = await db.run(
        `INSERT INTO orders (
           user_id, total, status, payment_status, checkout_nonce,
           inventory_reserved, reservation_expires_at, shipping_address_json
         )
         VALUES (?, ?, 'pendente', 'pending', ?, 1, ?, ?)`,
        [userId, total, checkoutNonce, reservationExpiresAt, JSON.stringify(shippingAddress)]
      );

      for (const item of items) {
        await db.run(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, cost_price, selected_color)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [insertResult.lastID, item.product_id, item.quantity, item.price, Number(item.cost_price || 0), item.selected_color || '']
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
    const orders = await db.all(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       INNER JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );
    for (const order of orders) {
      order.items = await this.findItems(order.id);
    }
    return orders;
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
    await withTransaction(async (db) => {
      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order || order.payment_status !== 'pending') return;
      await this.releaseReservation(
        db,
        order,
        String(message || 'Falha ao criar preferencia de pagamento').slice(0, 500)
      );
    });
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
      let inventoryReserved = order.inventory_reserved;
      let fulfillmentError = order.fulfillment_error;

      if (paymentStatus === 'approved' && !stockDeducted) {
        const items = await db.all(
          `SELECT oi.product_id, oi.quantity, p.name, p.stock
           FROM order_items oi
           INNER JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = ?`,
          [orderId]
        );
        if (inventoryReserved) {
          inventoryReserved = 0;
          stockDeducted = 1;
          fulfillmentError = null;
          await db.run('DELETE FROM cart WHERE user_id = ?', [order.user_id]);
        } else {
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
      }

      if (['rejected', 'cancelled', 'refunded'].includes(paymentStatus) && inventoryReserved) {
        const reservedItems = await db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of reservedItems) {
          await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        inventoryReserved = 0;
      }

      if (paymentStatus === 'refunded' && stockDeducted) {
        const fulfilledItems = await db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
        for (const item of fulfilledItems) {
          await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        stockDeducted = 0;
      }

      const operationalStatus = paymentStatus === 'approved'
        ? 'pago'
        : paymentStatus === 'refunded'
          ? 'reembolsado'
          : ['rejected', 'cancelled'].includes(paymentStatus)
            ? 'cancelado'
            : order.status;
      const paidAt = paymentStatus === 'approved' ? (order.paid_at || new Date().toISOString()) : order.paid_at;
      if (paymentStatus === 'refunded') {
        fulfillmentError = fulfillmentError || 'Pagamento reembolsado e estoque devolvido automaticamente';
      }
      const reservationExpiresAt = inventoryReserved ? order.reservation_expires_at : null;

      await db.run(
        `UPDATE orders
         SET status = ?, payment_status = ?, payment_id = ?, payment_amount = ?, payment_currency = ?,
             payment_live_mode = ?, inventory_reserved = ?, reservation_expires_at = ?,
             stock_deducted = ?, fulfillment_error = ?, paid_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          operationalStatus,
          paymentStatus,
          paymentId,
          payment.amount,
          payment.currency,
          payment.liveMode ? 1 : 0,
          inventoryReserved,
          reservationExpiresAt,
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
module.exports.RESERVATION_DURATION_MS = RESERVATION_DURATION_MS;
