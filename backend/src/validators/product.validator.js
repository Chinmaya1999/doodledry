import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier.');

export const createProductSchema = z.object({
  ageGroup: objectId,
  design: objectId,
  productType: objectId,
  color: objectId,
  sku: z.string().trim().optional(),
  openingStock: z.number({ invalid_type_error: 'Opening stock must be a number.' }).int().min(0).default(0),
  costPrice: z.number({ invalid_type_error: 'Cost price must be a number.' }).min(0, 'Prices cannot be negative.'),
  sellingPrice: z.number({ invalid_type_error: 'Selling price must be a number.' }).min(0, 'Prices cannot be negative.'),
  reorderLevel: z.number().int().min(0).default(10),
});

export const updateProductSchema = z.object({
  costPrice: z.number().min(0, 'Prices cannot be negative.').optional(),
  sellingPrice: z.number().min(0, 'Prices cannot be negative.').optional(),
  reorderLevel: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const stockInSchema = z.object({
  product: objectId,
  quantity: z.number({ invalid_type_error: 'Quantity must be a number.' }).int().positive('Quantity must be greater than 0.'),
  notes: z.string().optional().default(''),
});

export const stockAdjustSchema = z.object({
  product: objectId,
  type: z.enum(['STOCK_ADJUSTMENT', 'DAMAGE', 'LOSS']),
  direction: z.enum(['INCREASE', 'DECREASE']).default('DECREASE'),
  quantity: z.number().int().positive('Quantity must be greater than 0.'),
  reason: z.enum(['Damaged', 'Lost', 'Defective', 'Other']),
  notes: z.string().optional().default(''),
});

export default { createProductSchema, updateProductSchema, stockInSchema, stockAdjustSchema };
