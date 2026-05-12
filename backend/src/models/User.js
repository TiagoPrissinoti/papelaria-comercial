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

  static async findAll({ q = '', role = '' } = {}) {
    const db = await getDb();
    const filters = [];
    const params = [];

    if (q) {
      filters.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (role && ['admin', 'client'].includes(role)) {
      filters.push('role = ?');
      params.push(role);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    return db.all(
      `SELECT id, name, email, role, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );
  }

  static async update(id, data) {
    const db = await getDb();
    const current = await this.findById(id);
    if (!current) return null;

    const next = {
      name: data.name ?? current.name,
      email: data.email ?? current.email,
      role: data.role ?? current.role
    };

    await db.run('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [
      next.name,
      next.email,
      next.role,
      id
    ]);

    return this.findById(id);
  }

  static async remove(id) {
    const db = await getDb();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }
}

module.exports = User;
