const asyncHandler = require('../utils/asyncHandler');
const OrderService = require('../services/OrderService');

exports.createFromCart = asyncHandler(async (req, res) => {
  const order = await OrderService.createFromCart(req.user.id);
  res.status(201).json(order);
});

exports.myOrders = asyncHandler(async (req, res) => {
  res.json(await OrderService.listUserOrders(req.user.id));
});

exports.adminList = asyncHandler(async (req, res) => {
  res.json(await OrderService.listAllOrders());
});

exports.updateStatus = asyncHandler(async (req, res) => {
  res.json(await OrderService.updateStatus(Number(req.params.id), req.body.status));
});

exports.payOrder = asyncHandler(async (req, res) => {
  res.json(await OrderService.processPayment(Number(req.params.id)));
});
