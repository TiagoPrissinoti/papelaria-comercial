const Product = require('../models/Product');
const AppError = require('../utils/AppError');

function extractImagePaths(files) {
  const main = files?.image?.[0] ? `/uploads/${files.image[0].filename}` : null;
  const gallery = (files?.images || []).map((file) => `/uploads/${file.filename}`);
  return { main, gallery };
}

function normalizeColors(value) {
  if (value === undefined) return undefined;
  let colors = value;
  if (typeof value === 'string') {
    try {
      colors = JSON.parse(value);
    } catch {
      throw new AppError('Lista de cores invalida', 400);
    }
  }
  if (!Array.isArray(colors)) throw new AppError('Lista de cores invalida', 400);
  const normalized = colors.map((color) => String(color).trim()).filter(Boolean);
  if (normalized.length > 20 || normalized.some((color) => color.length > 40)) {
    throw new AppError('Informe no maximo 20 cores, com ate 40 caracteres cada', 400);
  }
  return normalized.filter((color, index) => (
    normalized.findIndex((item) => item.toLocaleLowerCase('pt-BR') === color.toLocaleLowerCase('pt-BR')) === index
  ));
}

class ProductService {
  static async list() {
    return Product.findAll();
  }

  static async getById(id) {
    const product = await Product.findById(id);
    if (!product) throw new AppError('Produto nao encontrado', 404);
    return product;
  }

  static async create(payload, files) {
    const { main, gallery } = extractImagePaths(files);
    return Product.create({
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId ? Number(payload.categoryId) : null,
      price: Number(payload.price),
      costPrice: payload.costPrice !== undefined ? Number(payload.costPrice) : 0,
      stock: Number(payload.stock),
      image: main,
      images: gallery,
      colors: normalizeColors(payload.colors) || []
    });
  }

  static async update(id, payload, files) {
    const current = await Product.findById(id, { includeInactive: true });
    if (!current) throw new AppError('Produto nao encontrado', 404);

    const { main, gallery } = extractImagePaths(files);

    const product = await Product.update(id, {
      name: payload.name,
      description: payload.description,
      categoryId: payload.categoryId ? Number(payload.categoryId) : undefined,
      price: payload.price !== undefined ? Number(payload.price) : undefined,
      costPrice: payload.costPrice !== undefined ? Number(payload.costPrice) : undefined,
      stock: payload.stock !== undefined ? Number(payload.stock) : undefined,
      image: main || current.image,
      images: gallery.length ? gallery : current.images,
      colors: normalizeColors(payload.colors)
    });

    return product;
  }

  static async delete(id) {
    const existing = await Product.findById(id, { includeInactive: true });
    if (!existing) throw new AppError('Produto nao encontrado', 404);
    await Product.delete(id);
  }
}

module.exports = ProductService;
