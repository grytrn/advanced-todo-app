# ADR-001: TODO App Architecture

Date: 2025-06-17
Status: Accepted
Author: @arch-todo

## Context

We need to build a modern, fancy TODO application with the following features:
- User authentication (signup/login/logout)
- CRUD operations for TODOs with rich text support
- Categories and tags for organization
- Due dates and reminders
- Drag-and-drop reordering
- Dark/light theme toggle
- Real-time sync across devices
- Search and filter functionality
- Export to PDF/CSV

The application needs to be deployed on free cloud providers to minimize costs while maintaining good performance and reliability.

## Decision

### Overall Architecture

We will use a **3-tier architecture**:
1. **Frontend**: React SPA hosted on Vercel
2. **Backend**: Fastify API hosted on Render.com
3. **Database**: PostgreSQL (provided by Render.com)
4. **Cache/Queue**: Redis via Upstash (serverless)

### Technology Choices

#### Frontend Stack
- **React 18** with Vite for fast development
- **TypeScript** for type safety
- **Tailwind CSS** for styling with CSS variables for theming
- **Radix UI** for accessible components
- **Zustand** for state management
- **React Hook Form + Zod** for form handling
- **Socket.io-client** for real-time updates
- **Tiptap** for rich text editing
- **@dnd-kit** for drag-and-drop functionality

#### Backend Stack
- **Fastify** for high-performance API
- **Prisma** as ORM for type-safe database access
- **PostgreSQL** for data persistence
- **Redis** (Upstash) for caching and session storage
- **BullMQ** for background jobs (reminders)
- **Socket.io** for WebSocket connections
- **JWT** for authentication

#### Shared/Common
- **TypeScript** across the stack
- **Zod** for validation schemas
- **date-fns** for date manipulation

### Database Schema

```prisma
model User {
  id               String           @id @default(cuid())
  email            String           @unique
  password         String
  name             String
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  todos            Todo[]
  categories       Category[]
  preferences      UserPreferences?
  refreshTokens    RefreshToken[]
}

model UserPreferences {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme               String   @default("system") // light, dark, system
  emailReminders      Boolean  @default(true)
  pushNotifications   Boolean  @default(false)
  defaultTodoView     String   @default("list") // list, board, calendar
}

model RefreshToken {
  id          String   @id @default(cuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model Category {
  id        String   @id @default(cuid())
  name      String
  color     String
  icon      String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  todos     Todo[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, name])
}

model Todo {
  id          String    @id @default(cuid())
  title       String
  content     String?   @db.Text // Rich text HTML
  completed   Boolean   @default(false)
  priority    String    @default("medium") // low, medium, high
  position    Int       // For ordering
  dueDate     DateTime?
  reminder    DateTime?
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tags        Tag[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  
  @@index([userId, completed])
  @@index([userId, categoryId])
  @@index([userId, position])
}

model Tag {
  id    String @id @default(cuid())
  name  String
  todos Todo[]
  
  @@unique([name])
}
```

### Security Considerations

1. **Authentication**: JWT with separate access (15min) and refresh (7d) tokens
2. **Authorization**: Row-level security - users can only access their own data
3. **Input Validation**: Zod schemas on both frontend and backend
4. **XSS Prevention**: HTML sanitization for rich text content
5. **Rate Limiting**: 100 requests per 15 minutes per IP
6. **HTTPS**: Enforced on all production endpoints

### Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│     Vercel      │────▶│   Render.com    │
│   (Frontend)    │     │   (Backend)     │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼────┐ ┌────▼────┐ ┌────▼────┐
              │          │ │         │ │         │
              │ Postgres │ │ Upstash │ │Cloudinary│
              │   (DB)   │ │ (Redis) │ │ (Files) │
              │          │ │         │ │         │
              └──────────┘ └─────────┘ └─────────┘
```

### API Design Principles

1. **RESTful**: Standard HTTP methods and status codes
2. **Consistent Response Format**: All responses follow ApiResponse<T> structure
3. **Pagination**: Cursor-based for large datasets
4. **Filtering**: Query parameters for search and filters
5. **Versioning**: URL-based versioning (/api/v1)

### Real-time Sync Strategy

1. **WebSocket Connection**: Authenticated via query parameter
2. **Room-based**: Each user has their own room
3. **Event Types**: todo:created, todo:updated, todo:deleted, todo:reordered
4. **Optimistic Updates**: Frontend updates immediately, syncs with server
5. **Conflict Resolution**: Last-write-wins with server timestamp

## Consequences

### Positive
- **Cost Effective**: Entire stack can run on free tiers
- **Scalable**: Can upgrade individual services as needed
- **Type Safe**: TypeScript + Prisma + Zod ensure type safety
- **Developer Experience**: Hot reload, type checking, great tooling
- **Performance**: Fastify + PostgreSQL + Redis provide good performance
- **Accessible**: Radix UI ensures WCAG compliance

### Negative
- **Vendor Lock-in**: Tied to specific cloud providers
- **Cold Starts**: Render.com free tier has cold starts
- **Limited Resources**: Free tiers have resource constraints
- **Complexity**: Multiple services to manage and monitor

### Mitigation Strategies
1. **Abstract cloud providers** behind interfaces for easier migration
2. **Implement health checks** to keep services warm
3. **Monitor usage** to stay within free tier limits
4. **Use Docker** for local development to match production

## References
- [Render.com Free Tier](https://render.com/pricing)
- [Vercel Pricing](https://vercel.com/pricing)
- [Upstash Redis](https://upstash.com/pricing)
- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Getting-Started/)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)