const Order = require('../models/Order');
const AppError = require('../utils/AppError');

class OrderService {
  static async listUserOrders(userId) {
    return Order.findByUser(userId);
  }

  static async listAllOrders() {
    return Order.findAll();
  }

  static async updateStatus(orderId, status) {
    const valid = ['em_andamento', 'enviado', 'entregue'];
    if (!valid.includes(status)) throw new AppError('Status invalido', 400);

    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Pedido nao encontrado', 404);
    if (order.payment_status !== 'approved') {
      throw new AppError('O pedido so pode ser processado depois da aprovacao do pagamento', 400);
    }

    return Order.updateStatus(orderId, status);
  }

  static async hideDeliveredFromHistory(orderId, userId) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Pedido nao encontrado', 404);
    if (order.user_id !== userId) throw new AppError('Acesso negado a este pedido', 403);
    if (order.status !== 'entregue') {
      throw new AppError('Somente pedidos entregues podem ser removidos do historico', 400);
    }
    await Order.hideByUser(orderId, userId);
    return { success: true };
  }
}

module.exports = OrderService;
