import { z } from 'zod';

export const ageGroupSchema = z.object({
  name: z.string().trim().min(1, 'Age group name cannot be empty.'),
  code: z.string().trim().min(1, 'Code is required.').max(10),
  description: z.string().trim().optional().default(''),
  sortOrder: z.number().optional().default(0),
});

export const ageGroupUpdateSchema = ageGroupSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const designSchema = z.object({
  name: z.string().trim().min(1, 'Design name cannot be empty.'),
  code: z.string().trim().min(1, 'Code is required.').max(10),
  description: z.string().trim().optional().default(''),
  isSolid: z.boolean().optional().default(false),
});

export const designUpdateSchema = designSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const productTypeSchema = z.object({
  name: z.string().trim().min(1, 'Product type name cannot be empty.'),
  code: z.string().trim().min(1, 'Code is required.').max(10),
  description: z.string().trim().optional().default(''),
});

export const productTypeUpdateSchema = productTypeSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const hexColor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color, e.g. #DC2626.').optional().or(z.literal(''));

export const colorSchema = z.object({
  name: z.string().trim().min(1, 'Color name cannot be empty.'),
  code: z.string().trim().min(1, 'Code is required.').max(10),
  hexCode: hexColor.default(''),
  description: z.string().trim().optional().default(''),
});

export const colorUpdateSchema = colorSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export default {
  ageGroupSchema,
  ageGroupUpdateSchema,
  designSchema,
  designUpdateSchema,
  productTypeSchema,
  productTypeUpdateSchema,
  colorSchema,
  colorUpdateSchema,
};
