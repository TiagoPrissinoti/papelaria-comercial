const { getDb } = require('../database/connection');

function parseImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeProduct(product) {
  if (!product) return null;
  return {
    ...product,
    images: parseImages(product.images)
  };
}

class Product {
  static async create(data) {
    const db = await getDb();
    const { name, description, price, stock, categoryId, image, images = [] } = data;
    const result = await db.run(
      `INSERT INTO products (name, description, price, stock, category_id, image, images)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock, categoryId || null, image || null, JSON.stringify(images)]
    );
    return this.findById(result.lastID);
  }

  static async findAll(options = {}) {
    const db = await getDb();
    const includeInactive = Boolean(options.includeInactive);
    const rows = await db.all(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${includeInactive ? '' : 'WHERE p.is_active = 1'}
       ORDER BY p.created_at DESC`
    );
    return rows.map(normalizeProduct);
  }

  static async findById(id, options = {}) {
    const db = await getDb();
    const includeInactive = Boolean(options.includeInactive);
    const row = await db.get(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?
       ${includeInactive ? '' : 'AND p.is_active = 1'}`,
      [id]
    );
    return normalizeProduct(row);
  }

  static async update(id, data) {
    const db = await getDb();
    const current = await this.findById(id, { includeInactive: true });
    if (!current) return null;

    const updated = {
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      price: data.price ?? current.price,
      stock: data.stock ?? current.stock,
      category_id: data.categoryId ?? current.category_id,
      image: data.image ?? current.image,
      images: data.images ?? current.images
    };

    await db.run(
      `UPDATE products
       SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image = ?, images = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.description,
        updated.price,
        updated.stock,
        updated.category_id,
        updated.image,
        JSON.stringify(updated.images),
        id
      ]
    );

    return this.findById(id);
  }

  static async delete(id) {
    const db = await getDb();
    await db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
  }

  static async decreaseStock(productId, quantity) {
    const db = await getDb();
    await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
  }
}

module.exports = Product;
