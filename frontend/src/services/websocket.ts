import { Socket } from 'socket.io-client'
import { useTodoStore, type Todo } from '../store/todoStore'

export function setupWebSocketHandlers(socket: Socket) {
  const store = useTodoStore.getState()

  // Todo events
  socket.on('todo:created', (data: { todo: Todo }) => {
    store.handleTodoCreated(data.todo)
  })

  socket.on('todo:updated', (data: { todo: Todo }) => {
    store.handleTodoUpdated(data.todo)
  })

  socket.on('todo:deleted', (data: { todoId: string }) => {
    store.handleTodoDeleted(data.todoId)
  })

  // Category events (if needed)
  socket.on('category:created', () => {
    // Re-fetch categories
    store.fetchCategories()
  })

  socket.on('category:updated', () => {
    // Re-fetch categories
    store.fetchCategories()
  })

  socket.on('category:deleted', () => {
    // Re-fetch categories
    store.fetchCategories()
  })

  return () => {
    // Cleanup
    socket.off('todo:created')
    socket.off('todo:updated')
    socket.off('todo:deleted')
    socket.off('category:created')
    socket.off('category:updated')
    socket.off('category:deleted')
  }
}