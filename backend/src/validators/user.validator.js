import { z } from 'zod';
import { ROLES } from '../models/User.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().min(6, 'Enter a valid phone number.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN]).default(ROLES.ADMIN),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(6).optional(),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export default { createUserSchema, updateUserSchema };
