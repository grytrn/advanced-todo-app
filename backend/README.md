# TODO App Backend

A high-performance REST API for a feature-rich TODO application built with Fastify, TypeScript, and Prisma.

## Features

- 🔐 **JWT Authentication** with refresh tokens
- ✅ **Full TODO CRUD** with priorities, statuses, and due dates
- 📁 **Categories** for organizing todos with custom colors/icons
- 🏷️ **Tags** for flexible labeling
- 🔍 **Advanced Search & Filtering**
- 📊 **Export to PDF/CSV** (coming soon)
- 🔄 **Real-time Updates** via WebSocket (coming soon)
- 🛡️ **Security** with rate limiting, CORS, and input validation
- 📝 **Activity Tracking** for audit trails

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16 with Prisma ORM
- **Authentication**: JWT (RS256)
- **Validation**: Zod
- **Testing**: Vitest
- **Logging**: Pino

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 16 or higher
- Redis (for session storage and rate limiting)

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run prisma:generate
npm run migrate
```

5. (Optional) Seed the database:
```bash
npm run seed
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/todo_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret

# Server
PORT=8000
NODE_ENV=development
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The API will be available at `http://localhost:8000`

## API Documentation

### Base URL
- Development: `http://localhost:8000/api/v1`

### Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

### Core Endpoints

#### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate refresh token
- `GET /auth/me` - Get current user info

#### TODOs
- `GET /todos` - List todos with filtering & pagination
- `POST /todos` - Create new todo
- `GET /todos/:id` - Get single todo
- `PATCH /todos/:id` - Update todo
- `DELETE /todos/:id` - Delete todo (soft delete)
- `POST /todos/:id/complete` - Mark as complete
- `POST /todos/:id/uncomplete` - Mark as incomplete
- `POST /todos/reorder` - Reorder todos (drag & drop)

#### Categories
- `GET /categories` - List user's categories
- `POST /categories` - Create category
- `GET /categories/:id` - Get single category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

#### Tags
- `GET /tags` - Get user's tags
- `GET /tags/popular` - Get popular tags

### Request/Response Format

All responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Query Parameters

List endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by
- `sortOrder` - asc/desc (default: desc)
- `search` - Search in title/description
- `status` - Filter by status
- `categoryId` - Filter by category
- `tag` - Filter by tag
- `priority` - Filter by priority
- `hasDueDate` - Filter todos with/without due dates
- `isOverdue` - Filter overdue todos

## Testing

Run tests:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Code Quality

```bash
# Lint code
npm run lint

# Type checking
npm run typecheck

# Format code
npm run lint:fix
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/      # API route definitions
│   │   └── schemas/     # Zod validation schemas
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware
│   ├── utils/          # Utilities (logger, errors)
│   ├── config/         # Configuration
│   ├── app.ts          # Fastify app setup
│   └── index.ts        # Entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── tests/              # Test files
├── .env.example        # Environment template
├── tsconfig.json       # TypeScript config
└── package.json        # Dependencies
```

## Database Schema

Key models:
- **User** - User accounts with authentication
- **Todo** - Core todo items with all features
- **Category** - User-defined categories
- **Tag** - Flexible tags (many-to-many)
- **Session** - Refresh token storage
- **Activity** - Audit trail

## Performance

- Database queries optimized with proper indexes
- Efficient pagination with cursor support
- Request/response compression
- Connection pooling for database
- Redis caching for sessions

## Security

- Password hashing with bcrypt (10 rounds)
- JWT tokens with short expiry (15min access, 7d refresh)
- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- SQL injection prevention via Prisma
- XSS protection headers
- CORS configured for frontend origin

## Deployment

### Docker

```bash
docker build -t todo-backend .
docker run -p 8000:8000 --env-file .env todo-backend
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS
- [ ] Enable request logging
- [ ] Configure monitoring (Sentry)
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review security headers

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify credentials

2. **Redis connection failed**
   - Check REDIS_URL
   - Ensure Redis is running

3. **JWT errors**
   - Regenerate secrets
   - Check token expiry

4. **Migration errors**
   - Run `npx prisma generate`
   - Check migration files

## Contributing

1. Create feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

## License

MIT