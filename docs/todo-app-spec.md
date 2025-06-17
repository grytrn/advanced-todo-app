# TODO App Technical Specification

## Overview

A modern, feature-rich TODO application built with React and Fastify, offering real-time synchronization, rich text editing, and comprehensive task management capabilities.

## Core Features

### 1. User Authentication
- **Registration**: Email/password with validation
- **Login**: JWT-based authentication
- **Logout**: Token invalidation
- **Password Reset**: Email-based flow (future)
- **Session Management**: Access (15min) + Refresh (7d) tokens

### 2. TODO Management

#### Create TODO
- Rich text editor (Tiptap) with formatting options
- Category selection
- Tag assignment (comma-separated input)
- Due date picker
- Reminder date/time picker
- Priority selection (Low/Medium/High)

#### View TODOs
- **List View**: Traditional list with checkboxes
- **Board View**: Kanban-style columns (future)
- **Calendar View**: Monthly calendar (future)
- Pagination (20 items per page)
- Real-time updates via WebSocket

#### Update TODO
- Inline editing for title
- Full editor for content
- Drag & drop to reorder
- Quick complete/uncomplete toggle
- Batch operations (select multiple)

#### Delete TODO
- Soft delete with undo (30 seconds)
- Permanent delete option
- Bulk delete functionality

### 3. Organization

#### Categories
- Create custom categories with colors
- Icon selection (Lucide icons)
- Default categories: Personal, Work, Shopping, Health
- Category-based filtering

#### Tags
- Free-form tag creation
- Auto-complete from existing tags
- Tag-based filtering
- Tag cloud visualization

#### Search & Filter
- Full-text search across title and content
- Filter by:
  - Status (Active/Completed/All)
  - Category
  - Tags
  - Due date range
  - Priority
- Save filter presets

### 4. Rich Text Editing
- **Formatting**: Bold, Italic, Underline, Strikethrough
- **Headings**: H1, H2, H3
- **Lists**: Bullet, Numbered, Task lists
- **Code**: Inline code and code blocks
- **Links**: URL with preview
- **Markdown**: Import/Export support

### 5. Reminders & Notifications
- Email reminders (via SendGrid)
- Browser push notifications (future)
- In-app notification center
- Configurable reminder times

### 6. Themes & Customization
- Light/Dark/System themes
- Custom accent colors
- Font size preferences
- Compact/Comfortable/Spacious density

### 7. Export & Import
- **Export**:
  - PDF with formatting
  - CSV for spreadsheets
  - JSON for backup
  - Markdown files
- **Import**:
  - CSV bulk import
  - JSON restore
  - Markdown files

### 8. Real-time Sync
- WebSocket connection
- Automatic reconnection
- Offline queue
- Conflict resolution (last-write-wins)
- Sync indicator

## Technical Implementation

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── todos/
│   │   │   ├── TodoList.tsx
│   │   │   ├── TodoItem.tsx
│   │   │   ├── TodoEditor.tsx
│   │   │   ├── TodoFilters.tsx
│   │   │   └── TodoSearch.tsx
│   │   ├── categories/
│   │   │   ├── CategoryList.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── CategoryPicker.tsx
│   │   ├── common/
│   │   │   ├── Layout.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── editor/
│   │       ├── RichTextEditor.tsx
│   │       └── EditorToolbar.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTodos.ts
│   │   ├── useCategories.ts
│   │   ├── useWebSocket.ts
│   │   └── useTheme.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── todo.service.ts
│   │   └── websocket.service.ts
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── todo.store.ts
│   │   └── ui.store.ts
│   ├── utils/
│   │   ├── date.utils.ts
│   │   ├── export.utils.ts
│   │   └── validation.utils.ts
│   └── types/
│       └── index.ts
```

### Backend Architecture

```
backend/
├── src/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.schemas.ts
│   │   ├── todos/
│   │   │   ├── todo.routes.ts
│   │   │   ├── todo.controller.ts
│   │   │   └── todo.schemas.ts
│   │   ├── categories/
│   │   │   ├── category.routes.ts
│   │   │   ├── category.controller.ts
│   │   │   └── category.schemas.ts
│   │   └── users/
│   │       ├── user.routes.ts
│   │       ├── user.controller.ts
│   │       └── user.schemas.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── todo.service.ts
│   │   ├── email.service.ts
│   │   ├── export.service.ts
│   │   └── websocket.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/
│   │   ├── jwt.utils.ts
│   │   ├── password.utils.ts
│   │   └── sanitize.utils.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── app.config.ts
│   └── jobs/
│       ├── reminder.job.ts
│       └── cleanup.job.ts
```

### API Endpoints Summary

#### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

#### TODOs
- `GET /api/v1/todos` - List with pagination
- `POST /api/v1/todos` - Create new
- `GET /api/v1/todos/:id` - Get single
- `PATCH /api/v1/todos/:id` - Update
- `DELETE /api/v1/todos/:id` - Delete
- `POST /api/v1/todos/:id/complete` - Mark complete
- `POST /api/v1/todos/:id/uncomplete` - Mark incomplete
- `POST /api/v1/todos/reorder` - Bulk reorder
- `GET /api/v1/todos/export/pdf` - Export PDF
- `GET /api/v1/todos/export/csv` - Export CSV

#### Categories
- `GET /api/v1/categories` - List all
- `POST /api/v1/categories` - Create new
- `PATCH /api/v1/categories/:id` - Update
- `DELETE /api/v1/categories/:id` - Delete

#### Users
- `GET /api/v1/users/preferences` - Get preferences
- `PATCH /api/v1/users/preferences` - Update preferences

### Database Schema

See `docs/adr/001-todo-app-architecture.md` for complete Prisma schema.

Key tables:
- `User` - User accounts
- `Todo` - TODO items with rich text content
- `Category` - User-defined categories
- `Tag` - Shared tags across todos
- `UserPreferences` - Theme and notification settings
- `RefreshToken` - JWT refresh tokens

### Security Measures

1. **Authentication**
   - Bcrypt password hashing (12 rounds)
   - JWT RS256 signing
   - Secure httpOnly cookies for refresh tokens

2. **Authorization**
   - Row-level security (users see only their data)
   - Middleware-based route protection

3. **Validation**
   - Zod schemas for all inputs
   - HTML sanitization for rich text
   - SQL injection prevention via Prisma

4. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Stricter limits on auth endpoints

5. **CORS**
   - Whitelist production domains
   - Credentials support for cookies

### Performance Optimizations

1. **Frontend**
   - Code splitting by route
   - Lazy loading for heavy components
   - Virtual scrolling for long lists
   - Optimistic UI updates
   - Image lazy loading

2. **Backend**
   - Redis caching for frequent queries
   - Database indexing on common filters
   - Connection pooling
   - Gzip compression
   - ETags for static resources

3. **Database**
   - Indexes on userId, categoryId, position
   - Composite indexes for common queries
   - Periodic cleanup of old tokens

### Deployment Configuration

#### Frontend (Vercel)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

#### Backend (Render.com)
```yaml
services:
  - type: web
    name: todo-api
    env: node
    buildCommand: "npm install && npm run build"
    startCommand: "npm start"
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: todo-db
          property: connectionString
      - key: REDIS_URL
        sync: false
```

#### Environment Variables

**Frontend (.env)**
```
VITE_API_URL=https://todo-api.onrender.com
VITE_WS_URL=wss://todo-api.onrender.com
```

**Backend (.env)**
```
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SENDGRID_API_KEY=...
CLOUDINARY_URL=...
```

### Monitoring & Analytics

1. **Error Tracking**: Sentry
2. **Performance**: Web Vitals
3. **Analytics**: Plausible
4. **Uptime**: Render.com built-in
5. **Logs**: Render.com dashboard

### Future Enhancements

1. **Mobile App**: React Native
2. **Collaboration**: Share todos with others
3. **Recurring Tasks**: Daily/Weekly/Monthly
4. **AI Features**: Smart categorization
5. **Voice Input**: Speech-to-text
6. **Integrations**: Calendar sync, Slack
7. **Habits Tracking**: Streak counters
8. **Time Tracking**: Pomodoro timer

## Development Timeline

### Phase 1: Foundation (Week 1)
- [ ] Setup project structure
- [ ] Authentication system
- [ ] Basic CRUD operations
- [ ] Database schema

### Phase 2: Core Features (Week 2)
- [ ] Rich text editor
- [ ] Categories & Tags
- [ ] Search functionality
- [ ] Real-time sync

### Phase 3: Enhanced UX (Week 3)
- [ ] Drag & drop
- [ ] Themes
- [ ] Export/Import
- [ ] Reminders

### Phase 4: Polish & Deploy (Week 4)
- [ ] Testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

## Success Metrics

1. **Performance**
   - Page load < 2s
   - API response < 200ms
   - 90+ Lighthouse score

2. **Reliability**
   - 99.9% uptime
   - Zero data loss
   - Automatic backups

3. **User Experience**
   - Intuitive interface
   - Keyboard shortcuts
   - Mobile responsive
   - Offline capability