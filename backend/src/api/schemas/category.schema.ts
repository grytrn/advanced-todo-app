import { z } from 'zod';

// Color validation (hex format)
const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format. Use hex format like #FF0000')
  .optional()
  .default('#6366f1'); // Default indigo

// Icon validation
const iconSchema = z
  .string()
  .max(50, 'Icon name must not exceed 50 characters')
  .optional();

// Create category schema
export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(50, 'Name must not exceed 50 characters')
      .trim(),
    color: colorSchema,
    icon: iconSchema,
  }),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;

// Update category schema
export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(50, 'Name must not exceed 50 characters')
      .trim()
      .optional(),
    color: colorSchema.optional(),
    icon: iconSchema.nullable().optional(),
  }),
});

export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;

// Get category schema
export const getCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

export type GetCategorySchema = z.infer<typeof getCategorySchema>;

// Delete category schema
export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

export type DeleteCategorySchema = z.infer<typeof deleteCategorySchema>;