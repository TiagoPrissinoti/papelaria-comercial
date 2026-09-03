const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

class CartService {
  static async getUserCart(userId) {
    const items = await Cart.getByUser(userId);
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return { items, total };
  }

  static async addOrUpdateItem(userId, productId, quantity, selectedColor = '') {
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Produto nao encontrado', 404);
    if (quantity <= 0) throw new AppError('Quantidade deve ser maior que zero', 400);
    if (quantity > product.stock) throw new AppError('Estoque insuficiente', 400);

    const requestedColor = String(selectedColor || '').trim();
    const productColors = Array.isArray(product.colors) ? product.colors : [];
    const canonicalColor = productColors.find(
      (color) => color.toLocaleLowerCase('pt-BR') === requestedColor.toLocaleLowerCase('pt-BR')
    );
    if (productColors.length && !canonicalColor) {
      throw new AppError('Selecione uma cor valida para este produto', 400);
    }
    if (!productColors.length && requestedColor) {
      throw new AppError('Este produto nao possui opcoes de cor', 400);
    }

    await Cart.upsert({ userId, productId, selectedColor: canonicalColor || '', quantity });
    return this.getUserCart(userId);
  }

  static async removeItem(userId, cartItemId) {
    await Cart.remove(userId, cartItemId);
    return this.getUserCart(userId);
  }
}

module.exports = CartService;
