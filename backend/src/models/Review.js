const { getDb } = require('../database/connection');

function groupImages(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        user_name: row.user_name,
        rating: row.rating,
        comment: row.comment,
        store_reply: row.store_reply,
        likes_count: row.likes_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
        images: []
      });
    }
    if (row.image_path) map.get(row.id).images.push(row.image_path);
  }
  return Array.from(map.values());
}

class Review {
  static async create({ userId, productId, rating, comment }) {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [userId, productId, rating, comment]
    );
    return result.lastID;
  }

  static async addImages(reviewId, paths) {
    const db = await getDb();
    for (const path of paths) {
      await db.run('INSERT INTO review_images (review_id, image_path) VALUES (?, ?)', [reviewId, path]);
    }
  }

  static async hasPurchasedProduct(userId, productId) {
    const db = await getDb();
    const row = await db.get(
      `SELECT 1
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('pago', 'em_andamento', 'enviado', 'entregue')
       LIMIT 1`,
      [userId, productId]
    );
    return Boolean(row);
  }

  static async findByProduct(productId, { rating, sort = 'recent', page = 1, pageSize = 10 } = {}) {
    const db = await getDb();
    const where = ['r.product_id = ?'];
    const params = [productId];
    if (rating) {
      where.push('r.rating = ?');
      params.push(rating);
    }
    const orderBy = sort === 'highest'
      ? 'r.rating DESC, r.created_at DESC'
      : sort === 'lowest'
        ? 'r.rating ASC, r.created_at DESC'
        : 'r.created_at DESC';
    const limit = Math.max(1, Math.min(30, Number(pageSize) || 10));
    const offset = Math.max(0, (Math.max(1, Number(page) || 1) - 1) * limit);
    const rows = await db.all(
      `SELECT r.*, u.name AS user_name, ri.image_path
       FROM reviews r
       INNER JOIN users u ON u.id = r.user_id
       LEFT JOIN review_images ri ON ri.review_id = r.id
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalRow = await db.get(`SELECT COUNT(*) AS total FROM reviews r WHERE ${where.join(' AND ')}`, params);
    return { items: groupImages(rows), total: Number(totalRow?.total || 0), page: Math.max(1, Number(page) || 1), pageSize: limit };
  }

  static async statsByProduct(productId) {
    const db = await getDb();
    const summary = await db.get(
      `SELECT COUNT(*) AS total, COALESCE(AVG(rating), 0) AS average
       FROM reviews
       WHERE product_id = ?`,
      [productId]
    );
    const distRows = await db.all(
      `SELECT rating, COUNT(*) AS qty
       FROM reviews
       WHERE product_id = ?
       GROUP BY rating`,
      [productId]
    );
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows) distribution[row.rating] = Number(row.qty || 0);
    const photoRows = await db.all(
      `SELECT ri.image_path
       FROM review_images ri
       INNER JOIN reviews r ON r.id = ri.review_id
       WHERE r.product_id = ?
       ORDER BY ri.created_at DESC
       LIMIT 24`,
      [productId]
    );
    return {
      total: Number(summary?.total || 0),
      average: Number(summary?.average || 0),
      distribution,
      photoGallery: photoRows.map((row) => row.image_path)
    };
  }

  static async findById(id) {
    const db = await getDb();
    return db.get('SELECT * FROM reviews WHERE id = ?', [id]);
  }

  static async updateReview(id, { rating, comment }) {
    const db = await getDb();
    await db.run(
      `UPDATE reviews
       SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [rating, comment, id]
    );
  }

  static async clearImages(reviewId) {
    const db = await getDb();
    await db.run('DELETE FROM review_images WHERE review_id = ?', [reviewId]);
  }

  static async remove(id) {
    const db = await getDb();
    await db.run('DELETE FROM reviews WHERE id = ?', [id]);
  }

  static async toggleLike(reviewId, userId) {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?', [reviewId, userId]);
    if (existing) {
      await db.run('DELETE FROM review_likes WHERE id = ?', [existing.id]);
      await db.run('UPDATE reviews SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [reviewId]);
      return { liked: false };
    }
    await db.run('INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)', [reviewId, userId]);
    await db.run('UPDATE reviews SET likes_count = likes_count + 1 WHERE id = ?', [reviewId]);
    return { liked: true };
  }

  static async report(reviewId, userId, reason) {
    const db = await getDb();
    await db.run(
      'INSERT OR IGNORE INTO review_reports (review_id, user_id, reason) VALUES (?, ?, ?)',
      [reviewId, userId, reason || null]
    );
  }

  static async reply(reviewId, text) {
    const db = await getDb();
    await db.run('UPDATE reviews SET store_reply = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [text, reviewId]);
  }
}

module.exports = Review;
