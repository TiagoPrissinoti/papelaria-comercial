const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

class OrderService {
  static async createFromCart(userId) {
    const cartItems = await Cart.getByUser(userId);
    if (!cartItems.length) throw new AppError('Carrinho vazio', 400);

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        throw new AppError(`Estoque insuficiente para ${item.name}`, 400);
      }
    }

    const total = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const orderId = await Order.create({ userId, total });

    for (const item of cartItems) {
      await Order.addItem({
        orderId,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.price,
        costPrice: Number(item.cost_price || 0)
      });
      await Product.decreaseStock(item.product_id, item.quantity);
    }

    await Cart.clear(userId);

    return Order.findById(orderId);
  }

  static async listUserOrders(userId) {
    return Order.findByUser(userId);
  }

  static async listAllOrders() {
    return Order.findAll();
  }

  static async processPayment(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Pedido nao encontrado', 404);
    if (order.status !== 'pendente') {
      throw new AppError('Apenas pedidos pendentes podem ser pagos', 400);
    }

    return Order.updateStatus(orderId, 'pago');
  }

  static async updateStatus(orderId, status) {
    const valid = ['pendente', 'pago', 'em_andamento', 'enviado', 'entregue'];
    if (!valid.includes(status)) throw new AppError('Status invalido', 400);

    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Pedido nao encontrado', 404);

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
