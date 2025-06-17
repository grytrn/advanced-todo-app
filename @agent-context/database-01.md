# Database Agent Context - @database-01

## Current Focus
Designing and implementing database schema for a modern TODO application with advanced features.

## Project Overview
- **Application**: Modern TODO app with auth, categories, tags, sharing, and real-time features
- **Database**: PostgreSQL 16 (as per @tech-stack)
- **ORM**: Prisma 5.x (as per @tech-stack)
- **Key Features to Support**:
  - User authentication and profiles
  - TODOs with rich metadata
  - Categories and tags (many-to-many)
  - Collaboration/sharing features
  - Activity tracking/audit log
  - User preferences (themes, notifications)

## Technical Decisions
- **UUID vs Serial IDs**: Using UUIDs for better distributed system support
- **Soft Deletes**: Implementing soft deletes for audit trail
- **Timestamps**: All tables include createdAt and updatedAt
- **Indexes**: Will add for search, filtering, and foreign keys

## Schema Design Considerations
1. **Normalization**: Properly normalized to 3NF where appropriate
2. **Performance**: Strategic denormalization for read-heavy operations
3. **Scalability**: Designed to handle millions of todos and thousands of users
4. **Security**: Proper constraints and data validation at DB level

## Questions for Other Agents
- @architect: Any specific requirements for real-time features (WebSocket support)?
- @backend: Preferences for handling user sessions (Redis vs DB)?
- @frontend: Any specific filtering/sorting requirements for UI?

## Work Log
- [2025-01-17] Started database design for TODO application
- [2025-01-17] Created agent context file
- [2025-01-17] Reviewing tech stack decisions

## Next Steps
1. Complete comprehensive schema design
2. Implement in Prisma schema
3. Create migrations and seed data
4. Document all design decisions