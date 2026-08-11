const asyncHandler = require('../utils/asyncHandler');
const OrderService = require('../services/OrderService');

exports.myOrders = asyncHandler(async (req, res) => {
  res.json(await OrderService.listUserOrders(req.user.id));
});

exports.adminList = asyncHandler(async (req, res) => {
  res.json(await OrderService.listAllOrders());
});

exports.updateStatus = asyncHandler(async (req, res) => {
  res.json(await OrderService.updateStatus(Number(req.params.id), req.body.status));
});

exports.hideFromHistory = asyncHandler(async (req, res) => {
  await OrderService.hideDeliveredFromHistory(Number(req.params.id), req.user.id);
  res.status(204).send();
});
