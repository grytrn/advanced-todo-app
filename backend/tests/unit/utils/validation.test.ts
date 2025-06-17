import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Example validation schemas that would be in your utils
const emailSchema = z.string().email();
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

const todoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'completed']),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

describe('Validation Utils', () => {
  describe('Email validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        '123@example.org',
      ];

      for (const email of validEmails) {
        expect(() => emailSchema.parse(email)).not.toThrow();
      }
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
      ];

      for (const email of invalidEmails) {
        expect(() => emailSchema.parse(email)).toThrow();
      }
    });
  });

  describe('Password validation', () => {
    it('should accept strong passwords', () => {
      const validPasswords = [
        'StrongP@ss1',
        'MyP@ssw0rd!',
        'Test123!ABC',
        'Secure$Pass9',
      ];

      for (const password of validPasswords) {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      }
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '12345678',          // No uppercase, lowercase, or special char
        'password',          // No uppercase, number, or special char
        'Password',          // No number or special char
        'Password1',         // No special char
        'Pass!',             // Too short
        'lowercase@123',     // No uppercase
        'UPPERCASE@123',     // No lowercase
        'NoNumbers!ABC',     // No number
      ];

      for (const password of weakPasswords) {
        expect(() => passwordSchema.parse(password)).toThrow();
      }
    });

    it('should provide specific error messages', () => {
      try {
        passwordSchema.parse('short');
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.errors[0].message).toContain('at least 8 characters');
        }
      }
    });
  });

  describe('Todo validation', () => {
    it('should accept valid todo data', () => {
      const validTodos = [
        {
          title: 'Buy groceries',
          priority: 'high',
          status: 'pending',
        },
        {
          title: 'Complete project',
          description: 'Finish the TODO app',
          priority: 'medium',
          status: 'in_progress',
          dueDate: new Date('2025-12-31'),
          tags: ['work', 'important'],
        },
      ];

      for (const todo of validTodos) {
        expect(() => todoSchema.parse(todo)).not.toThrow();
      }
    });

    it('should reject invalid todo data', () => {
      const invalidTodos = [
        {
          // Missing required fields
          description: 'No title',
          priority: 'high',
          status: 'pending',
        },
        {
          title: 'Invalid priority',
          priority: 'super-high', // Invalid enum value
          status: 'pending',
        },
        {
          title: 'Invalid status',
          priority: 'high',
          status: 'done', // Invalid enum value
        },
        {
          title: 'Too many tags',
          priority: 'high',
          status: 'pending',
          tags: Array(11).fill('tag'), // More than 10 tags
        },
        {
          title: '', // Empty title
          priority: 'high',
          status: 'pending',
        },
        {
          title: 'x'.repeat(201), // Title too long
          priority: 'high',
          status: 'pending',
        },
      ];

      for (const todo of invalidTodos) {
        expect(() => todoSchema.parse(todo)).toThrow();
      }
    });

    it('should handle optional fields correctly', () => {
      const minimalTodo = {
        title: 'Minimal todo',
        priority: 'low',
        status: 'pending',
      };

      const parsed = todoSchema.parse(minimalTodo);
      expect(parsed.description).toBeUndefined();
      expect(parsed.dueDate).toBeUndefined();
      expect(parsed.tags).toBeUndefined();
    });

    it('should coerce and validate dates', () => {
      const todoWithDate = {
        title: 'Todo with date',
        priority: 'high',
        status: 'pending',
        dueDate: new Date('2025-12-31'),
      };

      const parsed = todoSchema.parse(todoWithDate);
      expect(parsed.dueDate).toBeInstanceOf(Date);
      expect(parsed.dueDate?.getFullYear()).toBe(2025);
    });
  });
});

// Helper function to validate pagination params
export function validatePaginationParams(params: any) {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['createdAt', 'updatedAt', 'title', 'priority', 'dueDate']).optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  });

  return schema.parse(params);
}

describe('Pagination validation', () => {
  it('should validate pagination parameters', () => {
    const result = validatePaginationParams({
      page: '2',
      limit: '50',
      sort: 'createdAt',
      order: 'asc',
    });

    expect(result).toEqual({
      page: 2,
      limit: 50,
      sort: 'createdAt',
      order: 'asc',
    });
  });

  it('should use defaults for missing params', () => {
    const result = validatePaginationParams({});

    expect(result).toEqual({
      page: 1,
      limit: 20,
      order: 'desc',
    });
  });

  it('should coerce string numbers', () => {
    const result = validatePaginationParams({
      page: '5',
      limit: '30',
    });

    expect(result.page).toBe(5);
    expect(result.limit).toBe(30);
  });

  it('should reject invalid values', () => {
    expect(() => validatePaginationParams({ page: 0 })).toThrow();
    expect(() => validatePaginationParams({ limit: 101 })).toThrow();
    expect(() => validatePaginationParams({ sort: 'invalid' })).toThrow();
    expect(() => validatePaginationParams({ order: 'random' })).toThrow();
  });
});