const { getDb } = require('../database/connection');

class Pedido {
  static async create({ clienteId, valorTotal, status = 'pending', paymentId = null, preferenceId = null }) {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO pedidos (cliente_id, valor_total, status, payment_id, preference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [clienteId, valorTotal, status, paymentId, preferenceId]
    );
    return this.findById(result.lastID);
  }

  static async findById(id) {
    const db = await getDb();
    return db.get('SELECT * FROM pedidos WHERE id = ?', [id]);
  }

  static async findByPreferenceId(preferenceId) {
    const db = await getDb();
    return db.get('SELECT * FROM pedidos WHERE preference_id = ?', [preferenceId]);
  }

  static async findByPaymentId(paymentId) {
    const db = await getDb();
    return db.get('SELECT * FROM pedidos WHERE payment_id = ?', [paymentId]);
  }

  static async updateById(id, data) {
    const db = await getDb();
    const current = await this.findById(id);
    if (!current) return null;

    const updated = {
      clienteId: data.clienteId ?? current.cliente_id,
      valorTotal: data.valorTotal ?? current.valor_total,
      status: data.status ?? current.status,
      paymentId: data.paymentId ?? current.payment_id,
      preferenceId: data.preferenceId ?? current.preference_id
    };

    await db.run(
      `UPDATE pedidos
       SET cliente_id = ?, valor_total = ?, status = ?, payment_id = ?, preference_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [updated.clienteId, updated.valorTotal, updated.status, updated.paymentId, updated.preferenceId, id]
    );

    return this.findById(id);
  }

  static async updateStatusByPreferenceId(preferenceId, data) {
    const pedido = await this.findByPreferenceId(preferenceId);
    if (!pedido) return null;
    return this.updateById(pedido.id, data);
  }

  static async updateStatusByPaymentId(paymentId, data) {
    const pedido = await this.findByPaymentId(paymentId);
    if (!pedido) return null;
    return this.updateById(pedido.id, data);
  }
}

module.exports = Pedido;
