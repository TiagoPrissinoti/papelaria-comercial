const { getDb } = require('../database/connection');

class Cart {
  static async getByUser(userId) {
    const db = await getDb();
    return db.all(
      `SELECT c.id AS cart_item_id, c.product_id, c.selected_color, c.quantity,
              p.name, p.price, p.cost_price, p.stock, p.image
       FROM cart c
       INNER JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?`,
      [userId]
    );
  }

  static async upsert({ userId, productId, selectedColor, quantity }) {
    const db = await getDb();
    await db.run(
      `INSERT INTO cart (user_id, product_id, selected_color, quantity)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, product_id, selected_color)
       DO UPDATE SET quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP`,
      [userId, productId, selectedColor, quantity]
    );
  }

  static async remove(userId, cartItemId) {
    const db = await getDb();
    await db.run('DELETE FROM cart WHERE user_id = ? AND id = ?', [userId, cartItemId]);
  }

  static async clear(userId) {
    const db = await getDb();
    await db.run('DELETE FROM cart WHERE user_id = ?', [userId]);
  }
}

module.exports = Cart;
