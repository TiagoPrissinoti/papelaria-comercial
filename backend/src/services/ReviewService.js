const Review = require('../models/Review');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

function normalizeImages(files) {
  return (files?.images || []).map((file) => `/uploads/${file.filename}`);
}

class ReviewService {
  static async create({ userId, productId, rating, comment, files }) {
    const product = await Product.findById(productId, { includeInactive: true });
    if (!product) throw new AppError('Produto nao encontrado', 404);
    if (!comment || !comment.trim()) throw new AppError('Comentario obrigatorio', 400);
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new AppError('Nota invalida', 400);

    const purchased = await Review.hasPurchasedProduct(userId, productId);
    if (!purchased) throw new AppError('Somente clientes que compraram o produto podem avaliar', 403);

    const existing = await this.findUserReview(userId, productId);
    if (existing) throw new AppError('Voce ja avaliou este produto. Edite sua avaliacao existente.', 409);

    const reviewId = await Review.create({ userId, productId, rating: score, comment: comment.trim() });
    const images = normalizeImages(files);
    if (images.length) await Review.addImages(reviewId, images);
    return this.listByProduct(productId, { page: 1, pageSize: 10, userId });
  }

  static async findUserReview(userId, productId) {
    const result = await Review.findByProduct(productId, { page: 1, pageSize: 100 });
    return result.items.find((item) => item.user_id === userId) || null;
  }

  static async listByProduct(productId, { rating, sort = 'recent', page = 1, pageSize = 10, userId = null } = {}) {
    const product = await Product.findById(productId, { includeInactive: true });
    if (!product) throw new AppError('Produto nao encontrado', 404);
    const list = await Review.findByProduct(productId, { rating, sort, page, pageSize });
    const stats = await Review.statsByProduct(productId);
    const purchased = userId ? await Review.hasPurchasedProduct(userId, productId) : false;
    const ownReview = userId ? list.items.find((item) => item.user_id === userId) || await this.findUserReview(userId, productId) : null;
    return {
      stats,
      items: list.items,
      pagination: {
        page: list.page,
        pageSize: list.pageSize,
        total: list.total,
        hasMore: list.page * list.pageSize < list.total
      },
      canReview: Boolean(userId && purchased && !ownReview),
      ownReview
    };
  }

  static async update(reviewId, userId, { rating, comment, files }) {
    const review = await Review.findById(reviewId);
    if (!review) throw new AppError('Avaliacao nao encontrada', 404);
    if (review.user_id !== userId) throw new AppError('Voce nao pode editar esta avaliacao', 403);
    if (!comment || !comment.trim()) throw new AppError('Comentario obrigatorio', 400);
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new AppError('Nota invalida', 400);

    await Review.updateReview(reviewId, { rating: score, comment: comment.trim() });
    if (files?.images?.length) {
      await Review.clearImages(reviewId);
      await Review.addImages(reviewId, normalizeImages(files));
    }
    return this.listByProduct(review.product_id, { page: 1, pageSize: 10, userId });
  }

  static async remove(reviewId, userId, isAdmin = false) {
    const review = await Review.findById(reviewId);
    if (!review) throw new AppError('Avaliacao nao encontrada', 404);
    if (!isAdmin && review.user_id !== userId) throw new AppError('Voce nao pode excluir esta avaliacao', 403);
    await Review.remove(reviewId);
    return { success: true };
  }

  static async toggleLike(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) throw new AppError('Avaliacao nao encontrada', 404);
    return Review.toggleLike(reviewId, userId);
  }

  static async report(reviewId, userId, reason) {
    const review = await Review.findById(reviewId);
    if (!review) throw new AppError('Avaliacao nao encontrada', 404);
    await Review.report(reviewId, userId, reason);
    return { success: true };
  }

  static async reply(reviewId, adminUser, text) {
    if (adminUser?.role !== 'admin') throw new AppError('Acesso negado', 403);
    const review = await Review.findById(reviewId);
    if (!review) throw new AppError('Avaliacao nao encontrada', 404);
    await Review.reply(reviewId, text || '');
    return { success: true };
  }
}

module.exports = ReviewService;
