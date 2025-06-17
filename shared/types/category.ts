// Shared type definitions for Categories

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  todosCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  color?: string;
  icon?: string | null;
}

export interface CategoryListResponse {
  success: true;
  data: {
    categories: Category[];
  };
}

export interface CategoryResponse {
  success: true;
  data: {
    category: Category;
  };
}

export interface CategoryError {
  success: false;
  error: {
    code: 'CATEGORY_NOT_FOUND' | 'CATEGORY_EXISTS' | 'CATEGORY_IN_USE';
    message: string;
  };
}