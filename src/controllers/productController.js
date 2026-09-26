import Product from '../models/Product.js';
import { ok, created, fail } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSecondary, serializeProduct } from '../utils/units.js';
import { AppError } from '../middleware/errorHandler.js';
import { body } from 'express-validator';

export const productValidators = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('conversionRate').optional().isFloat({ gt: 0 }),
];

function normalizeIncomingStock(body) {
  const rate = Number(body.conversionRate) || 1;
  if (body.stockInSecondaryUnit != null) return Number(body.stockInSecondaryUnit);
  // Frontend sends currentStock in primary units
  if (body.currentStock != null) return toSecondary(body.currentStock, 'primary', rate);
  return 0;
}

/**
 * GET /api/products
 * Query: category, search, scrapOnly
 */
export const listProducts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = new RegExp(`^${req.query.category}$`, 'i');
  if (req.query.scrapOnly === 'true' || req.query.isScrapItem === 'true') {
    filter.isScrapItem = true;
  }
  if (req.query.search || req.query.q) {
    const q = req.query.search || req.query.q;
    filter.$or = [{ name: new RegExp(q, 'i') }, { category: new RegExp(q, 'i') }];
  }

  const products = await Product.find(filter).sort({ name: 1 });
  return ok(res, products.map(serializeProduct));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 'Product not found', 404);
  return ok(res, serializeProduct(product));
});

export const createProduct = asyncHandler(async (req, res) => {
  const rate = Number(req.body.conversionRate) || 1;
  const isScrap =
    req.body.isScrapItem === true ||
    String(req.body.category || '').toLowerCase().includes('scrap') ||
    req.body.type === 'scrap';

  const product = await Product.create({
    name: req.body.name,
    category: req.body.category,
    primaryUnit: req.body.primaryUnit || 'Kg',
    secondaryUnit: req.body.secondaryUnit || 'Pieces',
    conversionRate: rate,
    costPrice: Number(req.body.costPrice) || 0,
    salePrice: Number(req.body.salePrice) || 0,
    stockInSecondaryUnit: normalizeIncomingStock({ ...req.body, conversionRate: rate }),
    isScrapItem: isScrap,
    lowStockThreshold: Number(req.body.lowStockThreshold) || 10,
  });

  return created(res, serializeProduct(product), 'Product created');
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 'Product not found', 404);

  const fields = [
    'name',
    'category',
    'primaryUnit',
    'secondaryUnit',
    'conversionRate',
    'costPrice',
    'salePrice',
    'isScrapItem',
    'lowStockThreshold',
  ];
  fields.forEach((f) => {
    if (req.body[f] != null) product[f] = req.body[f];
  });

  if (req.body.stockInSecondaryUnit != null || req.body.currentStock != null) {
    product.stockInSecondaryUnit = normalizeIncomingStock({
      ...req.body,
      conversionRate: product.conversionRate,
    });
  }

  await product.save();
  return ok(res, serializeProduct(product), 'Product updated');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return fail(res, 'Product not found', 404);
  return ok(res, null, 'Product deleted');
});

/**
 * POST /api/products/:id/adjust-stock
 * Body: { quantity, unitUsed: primary|secondary, type: add|remove, reason }
 */
export const adjustStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 'Product not found', 404);

  const qtySecondary = toSecondary(
    req.body.quantity,
    req.body.unitUsed || 'primary',
    product.conversionRate
  );
  const type = req.body.type || 'add';

  if (type === 'remove' || type === 'subtract') {
    if (product.stockInSecondaryUnit < qtySecondary) {
      throw new AppError('Insufficient stock for adjustment', 400);
    }
    product.stockInSecondaryUnit -= qtySecondary;
  } else {
    product.stockInSecondaryUnit += qtySecondary;
  }

  await product.save();
  return ok(res, serializeProduct(product), 'Stock adjusted');
});

/**
 * GET /api/products/low-stock
 */
export const lowStock = asyncHandler(async (_req, res) => {
  const products = await Product.find();
  const low = products
    .map(serializeProduct)
    .filter((p) => (p.currentStock || 0) <= (p.lowStockThreshold || 10));
  return ok(res, low);
});
