const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

class CartService {
  static async getUserCart(userId) {
    const items = await Cart.getByUser(userId);
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return { items, total };
  }

  static async addOrUpdateItem(userId, productId, quantity) {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Produto nao encontrado', 404);
    if (quantity <= 0) throw new AppError('Quantidade deve ser maior que zero', 400);
    if (quantity > product.stock) throw new AppError('Estoque insuficiente', 400);

    await Cart.upsert({ userId, productId, quantity });
    return this.getUserCart(userId);
  }

  static async removeItem(userId, productId) {
    await Cart.remove(userId, productId);
    return this.getUserCart(userId);
  }
}

module.exports = CartService;
