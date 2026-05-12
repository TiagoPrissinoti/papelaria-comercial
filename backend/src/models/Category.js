const { getDb } = require('../database/connection');

class Category {
  static async create({ name }) {
    const db = await getDb();
    const result = await db.run('INSERT INTO categories (name) VALUES (?)', [name]);
    return { id: result.lastID, name };
  }

  static async findAll() {
    const db = await getDb();
    return db.all('SELECT * FROM categories ORDER BY name');
  }

  static async findById(id) {
    const db = await getDb();
    return db.get('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static async update(id, { name }) {
    const db = await getDb();
    await db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('DELETE FROM categories WHERE id = ?', [id]);
  }
}

module.exports = Category;
