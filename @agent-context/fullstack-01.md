# @fullstack-01 - Full-Stack Developer Context

## Current Focus
- Building product catalog end-to-end
- Working on: `feature/fullstack-products` branch
- Coordinating between frontend and backend for products feature

## Work in Progress

### Product Catalog Implementation

#### Backend Progress
- [x] Product schema design
- [x] Prisma models
- [x] Basic CRUD endpoints
- [ ] Search functionality
- [ ] Category filtering
- [ ] Image upload handling
- [ ] Inventory tracking

#### Frontend Progress
- [x] Product list component
- [x] Product card design
- [ ] Product detail page
- [ ] Admin product form
- [ ] Image gallery component
- [ ] Search/filter UI

### Database Schema
```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Int      // in cents
  images      Image[]
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  String
  inventory   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([categoryId])
  @@index([price])
  @@index([createdAt])
}

model Image {
  id        String   @id @default(uuid())
  url       String
  alt       String?
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  order     Int      @default(0)
}
```

### API Implementation
```typescript
// backend/src/api/products/products.controller.ts
export class ProductsController {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { page = 1, limit = 20, category, minPrice, maxPrice } = req.query;
    
    const where = {
      active: true,
      ...(category && { categoryId: category }),
      ...(minPrice && { price: { gte: minPrice * 100 } }),
      ...(maxPrice && { price: { lte: maxPrice * 100 } })
    };
    
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { images: true, category: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);
    
    return {
      success: true,
      data: {
        items,
        page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    };
  }
}
```

### Frontend Components
```typescript
// frontend/src/components/Products/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard: FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const formattedPrice = (product.price / 100).toFixed(2);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-w-1 aspect-h-1">
        <img 
          src={product.images[0]?.url || '/placeholder.png'} 
          alt={product.images[0]?.alt || product.name}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-gray-600 mt-1">${formattedPrice}</p>
        {onAddToCart && (
          <button
            onClick={() => onAddToCart(product)}
            className="mt-4 w-full bg-primary-500 text-white py-2 rounded hover:bg-primary-600"
            disabled={product.inventory === 0}
          >
            {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
};
```

## Shared Types
```typescript
// shared/types/product.ts
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // in cents
  images: ProductImage[];
  category: Category;
  categoryId: string;
  inventory: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  order: number;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  inventory: number;
  images?: Array<{
    url: string;
    alt?: string;
    order?: number;
  }>;
}
```

## Integration Challenges

### Image Upload Strategy
**Current Plan**:
1. Frontend uploads to S3 directly (presigned URLs)
2. Backend validates and stores references
3. CDN for serving images

**Questions**:
- Image processing pipeline?
- Thumbnail generation?
- Storage limits per product?

### Search Implementation
**Options Being Evaluated**:
1. PostgreSQL full-text search (simple, good enough for MVP)
2. Elasticsearch (powerful but complex)
3. Algolia (easy but expensive)

**Decision Pending**: Starting with PostgreSQL FTS

## Performance Considerations

### Database Queries
```sql
-- Need compound index for common query
CREATE INDEX idx_products_category_price_active 
ON products(category_id, active, price) 
WHERE active = true;

-- For search
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
```

### Frontend Optimization
- Virtual scrolling for large product lists
- Image lazy loading with Intersection Observer
- Debounced search input
- Optimistic UI updates for cart

## Testing Strategy

### API Tests
```typescript
describe('Products API', () => {
  it('should return paginated products', async () => {
    // Seed test products
    await seedProducts(30);
    
    const response = await request(app)
      .get('/api/v1/products?page=2&limit=10')
      .expect(200);
    
    expect(response.body.data.items).toHaveLength(10);
    expect(response.body.data.page).toBe(2);
    expect(response.body.data.totalPages).toBe(3);
  });
});
```

### Component Tests
```typescript
describe('ProductList', () => {
  it('should show loading skeleton while fetching', () => {
    render(<ProductList />);
    expect(screen.getAllByTestId('product-skeleton')).toHaveLength(8);
  });
});
```

## Coordination Notes

**Dependencies on @backend-01**:
- Need auth middleware for admin endpoints
- Rate limiting configuration

**Dependencies on @frontend-01**:
- Reusable form components
- Loading/error states pattern

**For @test-01**:
- Need product factory for tests
- E2E flow: browse → view → add to cart

**For @devops-01**:
- S3 bucket configuration
- CDN setup for images

## Next Features
1. Product variants (size, color)
2. Bulk import/export
3. Related products
4. Product reviews
5. Wishlist functionality

## Blockers & Questions
1. **Image Storage**: Waiting for S3 credentials from @devops-01
2. **Search UI**: Need UX decision on filters placement
3. **Inventory**: Real-time updates needed? (WebSocket?)

## Useful Patterns Discovered
- Using Prisma's `include` carefully to avoid N+1
- Zod schemas shared between frontend/backend
- Optimistic updates improve perceived performance
- Virtual scrolling essential for large catalogs
