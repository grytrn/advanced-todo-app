import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Register schema
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must not exceed 50 characters')
      .trim(),
  }),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;

// Logout schema
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type LogoutSchema = z.infer<typeof logoutSchema>;