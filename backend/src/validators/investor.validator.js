import { z } from 'zod';

const optionalDate = z.preprocess((val) => (val === '' || val === undefined ? undefined : val), z.coerce.date().optional());

export const createInvestorSchema = z.object({
  name: z.string().trim().min(1, 'Investor name is required.'),
  phone: z.string().trim().min(6, 'Enter a valid phone number.'),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
  investmentAmount: z.number().min(0, 'Investment amount cannot be negative.').default(0),
  investmentDate: optionalDate,
  ownershipPercentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional().default(''),
});

export const updateInvestorSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(6).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  address: z.string().optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const investorTransactionSchema = z.object({
  type: z.enum(['INVESTMENT', 'ADDITIONAL_INVESTMENT', 'WITHDRAWAL']),
  amount: z.number().positive('Investment amount cannot be negative.'),
  date: optionalDate,
  notes: z.string().optional().default(''),
});

export default { createInvestorSchema, updateInvestorSchema, investorTransactionSchema };
