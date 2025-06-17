# Frontend Integration Guide for Real-time Features

## Quick Start

### 1. Install Socket.io Client

```bash
npm install socket.io-client
```

### 2. Create Socket Service

```typescript
// services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { authService } from './auth.service';

class SocketService {
  private socket: Socket | null = null;
  
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }
    
    const token = authService.getAccessToken();
    
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    
    this.setupEventHandlers();
    
    return this.socket;
  }
  
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.updatePresence('online');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  private updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.socket?.emit('presence:update', {
      status,
      lastActivity: new Date(),
      device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
    });
  }
  
  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }
  
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
```

### 3. React Hook for Socket.io

```typescript
// hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const socketInstance = socketService.connect();
    setSocket(socketInstance);
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    
    // Set initial state
    setIsConnected(socketInstance.connected);
    
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, []);
  
  return { socket, isConnected };
};
```

## Feature Integration

### 1. Real-time TODO Updates

```typescript
// hooks/useRealtimeTodos.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useTodoStore } from '../stores/todo.store';

export const useRealtimeTodos = () => {
  const { socket } = useSocket();
  const { addTodo, updateTodo, removeTodo, reorderTodos } = useTodoStore();
  
  useEffect(() => {
    if (!socket) return;
    
    // Subscribe to todo updates
    socket.emit('todo:subscribe');
    
    // Listen for todo events
    socket.on('todo:created', (todo) => {
      addTodo(todo);
    });
    
    socket.on('todo:updated', (todo) => {
      updateTodo(todo.id, todo);
    });
    
    socket.on('todo:deleted', (todoId) => {
      removeTodo(todoId);
    });
    
    socket.on('todo:reordered', ({ todoId, newPosition, categoryId }) => {
      reorderTodos(todoId, newPosition, categoryId);
    });
    
    return () => {
      socket.emit('todo:unsubscribe');
      socket.off('todo:created');
      socket.off('todo:updated');
      socket.off('todo:deleted');
      socket.off('todo:reordered');
    };
  }, [socket, addTodo, updateTodo, removeTodo, reorderTodos]);
};
```

### 2. Creating/Updating TODOs via Socket

```typescript
// components/TodoForm.tsx
import { useSocket } from '../hooks/useSocket';

const TodoForm = () => {
  const { socket } = useSocket();
  
  const handleSubmit = (data: TodoFormData) => {
    socket?.emit('todo:create', {
      title: data.title,
      content: data.description,
      priority: data.priority,
      categoryId: data.categoryId,
      tagIds: data.tags,
      dueDate: data.dueDate?.toISOString(),
      reminder: data.reminder?.toISOString(),
    }, (response) => {
      if (response.success) {
        toast.success('Todo created successfully');
      } else {
        toast.error(response.error?.message || 'Failed to create todo');
      }
    });
  };
  
  const handleUpdate = (todoId: string, data: Partial<TodoFormData>) => {
    socket?.emit('todo:update', {
      id: todoId,
      ...data,
      completed: data.status === 'completed',
    }, (response) => {
      if (!response.success) {
        toast.error(response.error?.message || 'Failed to update todo');
      }
    });
  };
  
  // ... form implementation
};
```

### 3. Presence & Typing Indicators

```typescript
// hooks/usePresence.ts
import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

interface OnlineUser {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity?: Date;
}

interface TypingUser {
  userId: string;
  todoId: string;
}

export const usePresence = () => {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('presence:online', (userId, status) => {
      setOnlineUsers((prev) => new Map(prev).set(userId, { userId, ...status }));
    });
    
    socket.on('presence:offline', (userId) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });
    
    socket.on('presence:typing', ({ userId, todoId, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return [...prev.filter(u => !(u.userId === userId && u.todoId === todoId)), { userId, todoId }];
        } else {
          return prev.filter(u => !(u.userId === userId && u.todoId === todoId));
        }
      });
    });
    
    return () => {
      socket.off('presence:online');
      socket.off('presence:offline');
      socket.off('presence:typing');
    };
  }, [socket]);
  
  const startTyping = (todoId: string) => {
    socket?.emit('presence:typing:start', todoId);
  };
  
  const stopTyping = (todoId: string) => {
    socket?.emit('presence:typing:stop', todoId);
  };
  
  return { onlineUsers, typingUsers, startTyping, stopTyping };
};
```

### 4. Real-time Notifications

```typescript
// hooks/useNotifications.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'react-hot-toast';

export const useNotifications = () => {
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('notification', (notification) => {
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          tag: notification.id,
        });
      }
      
      // Show in-app toast
      switch (notification.type) {
        case 'todo_reminder':
          toast(notification.message, {
            icon: '⏰',
            duration: 5000,
          });
          break;
          
        case 'todo_shared':
          toast.success(notification.message);
          break;
          
        case 'export_complete':
          toast.success(notification.message, {
            action: {
              label: 'Download',
              onClick: () => {
                window.open(notification.data.downloadUrl);
              },
            },
          });
          break;
      }
    });
    
    return () => {
      socket.off('notification');
    };
  }, [socket]);
};
```

### 5. Activity Feed

```typescript
// components/ActivityFeed.tsx
import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  timestamp: Date;
}

const ActivityFeed = () => {
  const { socket } = useSocket();
  const [activities, setActivities] = useState<Activity[]>([]);
  
  useEffect(() => {
    if (!socket) return;
    
    // Subscribe to activity feed
    socket.emit('activity:subscribe');
    
    // Listen for activities
    socket.on('activity:feed', (activity) => {
      setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50
    });
    
    return () => {
      socket.emit('activity:unsubscribe');
      socket.off('activity:feed');
    };
  }, [socket]);
  
  return (
    <div className="activity-feed">
      <h3>Recent Activity</h3>
      {activities.map((activity) => (
        <div key={activity.id} className="activity-item">
          <span className="activity-action">{activity.action}</span>
          <span className="activity-entity">{activity.entityTitle}</span>
          <time>{new Date(activity.timestamp).toRelativeTime()}</time>
        </div>
      ))}
    </div>
  );
};
```

## Best Practices

### 1. Connection Management

```typescript
// App.tsx
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { socketService } from './services/socket.service';

function App() {
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
    
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);
  
  // ... rest of app
}
```

### 2. Optimistic Updates

```typescript
// For better UX, update UI optimistically
const handleTodoUpdate = async (todoId: string, updates: Partial<Todo>) => {
  // Update UI immediately
  updateTodoOptimistic(todoId, updates);
  
  // Send to server
  socket?.emit('todo:update', { id: todoId, ...updates }, (response) => {
    if (!response.success) {
      // Revert on failure
      revertTodoUpdate(todoId);
      toast.error('Failed to update');
    }
  });
};
```

### 3. Debounced Typing Indicators

```typescript
import { useDebouncedCallback } from 'use-debounce';

const TodoEditor = ({ todoId }: { todoId: string }) => {
  const { startTyping, stopTyping } = usePresence();
  
  const debouncedStopTyping = useDebouncedCallback(() => {
    stopTyping(todoId);
  }, 1000);
  
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    startTyping(todoId);
    debouncedStopTyping();
  };
  
  // ...
};
```

### 4. Reconnection Handling

```typescript
// components/ConnectionStatus.tsx
import { useSocket } from '../hooks/useSocket';

const ConnectionStatus = () => {
  const { isConnected } = useSocket();
  
  if (isConnected) return null;
  
  return (
    <div className="connection-status">
      <span className="status-icon">🔴</span>
      <span>Reconnecting...</span>
    </div>
  );
};
```

## Testing

```typescript
// __tests__/socket.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useSocket } from '../hooks/useSocket';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

describe('useSocket', () => {
  it('should connect to socket server', () => {
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      connected: true,
    };
    
    (io as jest.Mock).mockReturnValue(mockSocket);
    
    const { result } = renderHook(() => useSocket());
    
    expect(result.current.socket).toBe(mockSocket);
    expect(result.current.isConnected).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection fails**: Check auth token and CORS settings
2. **Events not received**: Ensure you're subscribed to the correct events
3. **Duplicate events**: Check for multiple socket connections
4. **Memory leaks**: Always clean up event listeners in useEffect cleanup

### Debug Mode

```typescript
// Enable Socket.io debug mode
localStorage.debug = 'socket.io-client:*';
```