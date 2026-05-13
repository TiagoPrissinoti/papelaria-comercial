const asyncHandler = require('../utils/asyncHandler');
const ReviewService = require('../services/ReviewService');

exports.create = asyncHandler(async (req, res) => {
  const payload = await ReviewService.create({
    userId: req.user.id,
    productId: Number(req.params.productId),
    rating: req.body.rating,
    comment: req.body.comment,
    files: req.files
  });
  res.status(201).json(payload);
});

exports.listByProduct = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const payload = await ReviewService.listByProduct(Number(req.params.productId), {
    rating: req.query.rating ? Number(req.query.rating) : undefined,
    sort: String(req.query.sort || 'recent'),
    page: req.query.page ? Number(req.query.page) : 1,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
    userId
  });
  res.json(payload);
});

exports.update = asyncHandler(async (req, res) => {
  const payload = await ReviewService.update(Number(req.params.id), req.user.id, {
    rating: req.body.rating,
    comment: req.body.comment,
    files: req.files
  });
  res.json(payload);
});

exports.remove = asyncHandler(async (req, res) => {
  await ReviewService.remove(Number(req.params.id), req.user.id, req.user.role === 'admin');
  res.status(204).send();
});

exports.toggleLike = asyncHandler(async (req, res) => {
  res.json(await ReviewService.toggleLike(Number(req.params.id), req.user.id));
});

exports.report = asyncHandler(async (req, res) => {
  res.json(await ReviewService.report(Number(req.params.id), req.user.id, req.body.reason));
});

exports.reply = asyncHandler(async (req, res) => {
  res.json(await ReviewService.reply(Number(req.params.id), req.user, req.body.reply));
});
