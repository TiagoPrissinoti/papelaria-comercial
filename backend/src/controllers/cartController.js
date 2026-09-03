const asyncHandler = require('../utils/asyncHandler');
const CartService = require('../services/CartService');

exports.getCart = asyncHandler(async (req, res) => {
  res.json(await CartService.getUserCart(req.user.id));
});

exports.upsertItem = asyncHandler(async (req, res) => {
  const { productId, quantity, selectedColor } = req.body;
  res.json(await CartService.addOrUpdateItem(req.user.id, Number(productId), Number(quantity), selectedColor));
});

exports.removeItem = asyncHandler(async (req, res) => {
  res.json(await CartService.removeItem(req.user.id, Number(req.params.itemId)));
});
