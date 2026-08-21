import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier.');

export const createSaleSchema = z.object({
  code: z.string().trim().min(1, 'A scanned barcode or QR code value is required.').optional(),
  product: objectId.optional(),
  quantity: z
    .number({ invalid_type_error: 'Enter a valid quantity.' })
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than 0.'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'OTHER']).default('CASH'),
  notes: z.string().optional().default(''),
  idempotencyKey: z.string().optional(),
}).refine((data) => data.code || data.product, {
  message: 'Either a scanned code or a product id is required.',
});

export const createReturnSchema = z.object({
  sale: objectId,
  quantity: z.number().int().positive('Quantity must be greater than 0.'),
  reason: z.string().optional().default(''),
});

export default { createSaleSchema, createReturnSchema };
