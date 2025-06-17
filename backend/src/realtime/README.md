# Real-time Features Documentation

## Overview

The real-time module provides WebSocket functionality using Socket.io for live updates, collaboration, and notifications in the TODO application.

## Architecture

### Components

1. **Socket Server** (`socket-server.ts`)
   - Main Socket.io server initialization
   - Middleware registration
   - Handler setup
   - Redis adapter integration for scaling

2. **Authentication Middleware** (`middlewares/auth.middleware.ts`)
   - JWT token verification for WebSocket connections
   - User session validation
   - Automatic user room assignment

3. **Event Handlers**
   - **Todo Handlers**: CRUD operations, reordering
   - **Presence Handlers**: Online status, typing indicators
   - **Notification Handlers**: Reminders, sharing notifications
   - **Activity Handlers**: Activity feed updates

4. **Redis Integration**
   - Pub/sub for multi-server scaling
   - Presence data persistence
   - Activity feed storage
   - Notification deduplication

## Features

### 1. Live TODO Updates

Real-time synchronization of TODO operations across all user devices:

```typescript
// Client events
socket.emit('todo:create', {
  title: 'New Task',
  content: 'Task description',
  priority: 'high',
  categoryId: 'category_123',
  tagIds: ['tag1', 'tag2'],
  dueDate: '2025-01-20T10:00:00Z',
  reminder: '2025-01-20T09:30:00Z'
}, (response) => {
  if (response.success) {
    console.log('Todo created:', response.data);
  }
});

socket.emit('todo:update', {
  id: 'todo_123',
  title: 'Updated Task',
  completed: true
}, (response) => {
  // Handle response
});

socket.emit('todo:delete', 'todo_123', (response) => {
  // Handle response
});

socket.emit('todo:reorder', {
  todoId: 'todo_123',
  newPosition: 5,
  categoryId: 'category_456'
}, (response) => {
  // Handle response
});

// Server events
socket.on('todo:created', (todo) => {
  // Update UI with new todo
});

socket.on('todo:updated', (todo) => {
  // Update existing todo
});

socket.on('todo:deleted', (todoId) => {
  // Remove todo from UI
});

socket.on('todo:reordered', (data) => {
  // Reorder todos in UI
});
```

### 2. Presence System

Track user online status and typing indicators:

```typescript
// Update presence status
socket.emit('presence:update', {
  status: 'online', // 'online' | 'away' | 'busy' | 'offline'
  lastActivity: new Date(),
  device: 'desktop'
});

// Typing indicators
socket.emit('presence:typing:start', 'todo_123');
socket.emit('presence:typing:stop', 'todo_123');

// Listen for presence updates
socket.on('presence:online', (userId, status) => {
  // Update user online status
});

socket.on('presence:offline', (userId) => {
  // Mark user as offline
});

socket.on('presence:typing', (indicator) => {
  // Show/hide typing indicator
  // indicator: { userId, todoId, isTyping }
});
```

### 3. Real-time Notifications

Receive instant notifications for various events:

```typescript
socket.on('notification', (notification) => {
  // notification types:
  // - 'todo_reminder': Reminder for a todo
  // - 'todo_shared': Someone shared a todo with you
  // - 'todo_assigned': Todo assigned to you
  // - 'export_complete': Export job completed
  
  console.log(notification.title, notification.message);
});
```

### 4. Activity Feed

Live activity stream for all user actions:

```typescript
// Subscribe to activity feed
socket.emit('activity:subscribe');

// Listen for activities
socket.on('activity:feed', (activity) => {
  // activity: {
  //   id: string,
  //   userId: string,
  //   action: 'created' | 'updated' | 'completed' | 'deleted' | 'shared',
  //   entityType: 'todo' | 'category' | 'tag',
  //   entityId: string,
  //   entityTitle: string,
  //   metadata?: any,
  //   timestamp: Date
  // }
});

// Unsubscribe when not needed
socket.emit('activity:unsubscribe');
```

### 5. Category & Tag Management

Real-time updates for categories and tags:

```typescript
// Category events
socket.emit('category:create', {
  name: 'Work',
  color: '#2563eb',
  icon: 'briefcase'
}, callback);

socket.emit('category:update', {
  id: 'category_123',
  name: 'Work Projects',
  color: '#3b82f6'
}, callback);

socket.emit('category:delete', 'category_123', callback);

// Tag events
socket.emit('tag:create', 'urgent', callback);
socket.emit('tag:delete', 'tag_123', callback);

// Listen for updates
socket.on('category:created', (category) => { });
socket.on('category:updated', (category) => { });
socket.on('category:deleted', (categoryId) => { });
socket.on('tag:created', (tag) => { });
socket.on('tag:deleted', (tagId) => { });
```

## Client Connection

### Authentication

Connect with JWT token:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
  auth: {
    token: 'your-jwt-access-token'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

### Error Handling

All callbacks follow a standard response format:

```typescript
interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Scaling with Redis

The system supports horizontal scaling using Redis pub/sub:

1. **Automatic Room Synchronization**: User rooms are synchronized across servers
2. **Event Broadcasting**: Events are broadcast to all server instances
3. **Presence Sync**: User presence is shared across all servers
4. **Activity Distribution**: Activity feed updates are distributed

### Redis Configuration

Set the `REDIS_URL` environment variable to enable Redis adapter:

```env
REDIS_URL=redis://localhost:6379
```

## Performance Optimizations

1. **Message Compression**: Socket.io automatically compresses messages
2. **Binary Support**: Large data can be sent as binary
3. **Heartbeat Tuning**: Configured for optimal connection stability
4. **Room-based Broadcasting**: Efficient message routing
5. **Redis Pub/Sub**: Scales across multiple servers

## Security

1. **JWT Authentication**: All connections require valid access tokens
2. **User Isolation**: Users only receive their own data
3. **Input Validation**: All inputs are validated before processing
4. **Rate Limiting**: Prevents spam and abuse
5. **CORS Configuration**: Restricts allowed origins

## Testing WebSocket Events

Use the Socket.io client library or tools like Postman for testing:

```javascript
// Example test script
const io = require('socket.io-client');

const socket = io('http://localhost:8000', {
  auth: { token: 'test-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected');
  
  // Test todo creation
  socket.emit('todo:create', {
    title: 'Test Todo',
    priority: 'medium'
  }, (response) => {
    console.log('Create response:', response);
  });
});

socket.on('todo:created', (todo) => {
  console.log('Todo created event:', todo);
});
```

## Monitoring

Monitor WebSocket connections and events:

1. **Connection Count**: Track active connections
2. **Event Metrics**: Monitor event frequencies
3. **Error Rates**: Track authentication and processing errors
4. **Latency**: Measure round-trip times
5. **Redis Health**: Monitor pub/sub performance

## Future Enhancements

1. **Collaborative Editing**: Real-time collaborative todo editing
2. **Voice/Video Calls**: WebRTC integration for team collaboration
3. **File Sharing**: Real-time file upload progress
4. **Advanced Presence**: Calendar integration, focus time
5. **AI Suggestions**: Real-time AI-powered todo suggestions