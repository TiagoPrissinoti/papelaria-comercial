const { getDb } = require('../database/connection');

class User {
  static async create({ name, email, password, role = 'client' }) {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return { id: result.lastID, name, email, role };
  }

  static async findByEmail(email) {
    const db = await getDb();
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id) {
    const db = await getDb();
    return db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
  }
}

module.exports = User;
