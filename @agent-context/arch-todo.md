# Architecture Agent Context - TODO App

## Current Focus
Completed the architecture design for the fancy TODO app with all requested features.

## Key Decisions Made

### Technology Stack
1. **Frontend**: React + Vite + TypeScript + Tailwind CSS
2. **Backend**: Fastify + Prisma + PostgreSQL
3. **Real-time**: Socket.io for cross-device sync
4. **Rich Text**: Tiptap editor
5. **Deployment**: Vercel (frontend) + Render.com (backend) + Upstash (Redis)

### Architecture Patterns
- 3-tier architecture (Frontend, Backend, Database)
- JWT authentication with access/refresh tokens
- RESTful API with consistent response format
- WebSocket for real-time updates
- Redis for caching and session storage

### Database Design
- Simple but extensible schema
- User preferences stored separately
- Tags as many-to-many relationship
- Position field for drag-and-drop ordering
- Soft delete capability via completedAt

## Important Notes for Other Agents

### For Backend Agent (@backend)
- Start with auth implementation using JWT
- Use Zod for validation schemas
- Implement rate limiting early
- Remember to sanitize HTML content from rich text editor
- Redis connection needed for sessions and caching

### For Frontend Agent (@frontend)
- Tiptap for rich text editing
- @dnd-kit for drag and drop
- Socket.io-client for real-time sync
- Implement optimistic updates for better UX
- Use Zustand for state management

### For DevOps Agent (@devops)
- Check docs/deployment-architecture.md for detailed deployment guide
- Set up GitHub Actions for CI/CD
- Configure health check endpoints to prevent cold starts
- Monitor free tier usage limits

### For Testing Agent (@test)
- Focus on auth flow testing first
- Test real-time sync scenarios
- Test drag-and-drop reordering
- Verify rich text sanitization

## Files Created
1. `/docs/adr/001-todo-app-architecture.md` - Architecture decision record
2. `/docs/todo-app-spec.md` - Complete technical specification
3. `/docs/deployment-architecture.md` - Deployment guide for free cloud providers
4. Updated `/backend/prisma/schema.prisma` - Database schema
5. Updated `@tech-stack` - Added TODO app specific technologies
6. Updated `@api-contracts` - Added all TODO app endpoints

## Next Steps for Project
1. Backend team implements auth API
2. Frontend team sets up project structure
3. DevOps sets up CI/CD pipeline
4. Full-stack team can start on TODO CRUD once auth is ready

## Questions/Concerns
- Free tier limits might be restrictive for real-time features
- Consider implementing request batching to stay within Upstash limits
- May need to implement a queue system for email reminders

## Useful Code Snippets

### Prisma Schema for TODO
```prisma
model Todo {
  id          String    @id @default(cuid())
  title       String
  content     String?   @db.Text
  completed   Boolean   @default(false)
  priority    String    @default("medium")
  position    Int
  dueDate     DateTime?
  reminder    DateTime?
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  tags        Tag[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
}
```

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    page?: number;
    total?: number;
    timestamp: string;
  };
}
```

## Handoff Notes
Architecture design is complete. Backend team can start implementing the auth system immediately. All necessary documentation and specifications are in place.