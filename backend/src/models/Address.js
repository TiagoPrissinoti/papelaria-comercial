const { getDb, withTransaction } = require('../database/connection');

class Address {
  static async findByUser(userId) {
    const db = await getDb();
    return db.all(
      `SELECT * FROM addresses WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC, id DESC`,
      [userId]
    );
  }

  static async findOwned(addressId, userId, dbInstance) {
    const db = dbInstance || await getDb();
    return db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
  }

  static async create(userId, data) {
    return withTransaction(async (db) => {
      const count = await db.get('SELECT COUNT(*) AS total FROM addresses WHERE user_id = ?', [userId]);
      const makeDefault = data.is_default || count.total === 0;
      if (makeDefault) await db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
      const result = await db.run(
        `INSERT INTO addresses (
          user_id, label, recipient_name, phone, postal_code, street, number,
          complement, neighborhood, city, state, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, data.label, data.recipient_name, data.phone, data.postal_code, data.street,
          data.number, data.complement, data.neighborhood, data.city, data.state, makeDefault ? 1 : 0]
      );
      return this.findOwned(result.lastID, userId, db);
    });
  }

  static async update(addressId, userId, data) {
    return withTransaction(async (db) => {
      const current = await this.findOwned(addressId, userId, db);
      if (!current) return null;
      if (data.is_default) await db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
      await db.run(
        `UPDATE addresses SET label = ?, recipient_name = ?, phone = ?, postal_code = ?,
          street = ?, number = ?, complement = ?, neighborhood = ?, city = ?, state = ?,
          is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
        [data.label, data.recipient_name, data.phone, data.postal_code, data.street, data.number,
          data.complement, data.neighborhood, data.city, data.state,
          data.is_default || current.is_default ? 1 : 0, addressId, userId]
      );
      return this.findOwned(addressId, userId, db);
    });
  }
}

module.exports = Address;
