import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username must not exceed 20 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' }),
  password: z
    .string()
    .min(4, { message: 'Password must be at least 4 characters long' }),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username must not exceed 20 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' }),
  password: z
    .string()
    .min(4, { message: 'Password must be at least 4 characters long' }),
  confirmPassword: z
    .string()
    .min(4, { message: 'Confirm password must be at least 4 characters long' }),
  role: z.enum(['Admin', 'Owner'], {
    errorMap: () => ({ message: 'Please select a valid role (Admin or Owner)' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
